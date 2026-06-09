-- ============================================================================
-- JASA Data Hub — Core Schema
-- 民間動物保護団体の月次データ（収容・転帰・管理頭数・TNR）を統一フォーマットで蓄積する
--
-- 設計方針:
--   - 収容/転帰のマトリクス（カテゴリー × 地域区分 × 年齢区分）は report_lines に
--     「行」で正規化して保持する（横長カラムにしない）。様式改訂・マスタ編集に強い。
--   - カテゴリー・年齢区分・地域区分・都道府県はすべてマスタ化（F-13）し後から編集可能に。
--   - 物理削除はせず deleted_at による論理削除を基本とする（誤削除対策）。
-- ============================================================================

create extension if not exists "pgcrypto";

-- updated_at 自動更新トリガー -------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- マスタ系（F-13: 後から編集可能）
-- ============================================================================

-- 都道府県マスタ
create table prefectures (
  code        text primary key,            -- 'JP-13' などのISOサブディビジョン or 連番
  name        text not null,               -- '東京都'
  sort_order  int  not null default 0
);

-- 年齢区分マスタ（収容・転帰の共通列。3区分で確定だが将来改訂に備えマスタ化）
create table age_bands (
  code        text primary key,            -- 'u5m' / '5m_10y' / 'o10y'
  label       text not null,               -- '〜5ヶ月齢'
  sort_order  int  not null default 0
);

-- 地域区分マスタ（県内 / 県外：隣接 / 県外：遠隔）
create table regions (
  code        text primary key,            -- 'in_pref' / 'out_adjacent' / 'out_remote'
  label       text not null,
  sort_order  int  not null default 0
);

-- 種別 enum（犬 / 猫）
create type species_type as enum ('dog', 'cat');

-- カテゴリーに適用される種別（共通 / 猫のみ）
create type category_species as enum ('common', 'cat');

-- 収容（Intake）カテゴリーマスタ
create table intake_categories (
  code        text primary key,            -- 'owner_unknown' など
  label       text not null,
  definition  text,
  has_region  boolean not null default false,   -- 地域区分マトリクスを持つか
  species     category_species not null default 'common',
  sort_order  int  not null default 0,
  is_total    boolean not null default false,   -- 「合計」行（自動計算）
  deleted_at  timestamptz
);

-- 転帰（Outcome）の生存区分
create type outcome_kind as enum ('live', 'non_live');

-- 転帰カテゴリーマスタ
create table outcome_categories (
  code         text primary key,
  label        text not null,
  definition   text,
  outcome_kind outcome_kind not null,           -- 生存転帰 / 非生存転帰
  has_region   boolean not null default false,
  species      category_species not null default 'common',
  sort_order   int  not null default 0,
  is_total     boolean not null default false,
  deleted_at   timestamptz
);

-- ============================================================================
-- 団体・ユーザー
-- ============================================================================

-- 活動形態
create type activity_type as enum ('shelter', 'foster_based', 'tnr', 'mixed', 'other');

-- 団体マスタ（F-02）
create table organizations (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  prefecture_code text references prefectures(code),
  activity        activity_type not null default 'mixed',
  is_tnr_active   boolean not null default false,   -- TNR実施団体か（§5.4の入力可否）
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create trigger trg_organizations_updated before update on organizations
  for each row execute function set_updated_at();

-- ユーザーロール
create type user_role as enum ('admin', 'org_user', 'viewer');

-- プロフィール（auth.users と 1:1。ロールと所属団体を保持）
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text,
  role            user_role not null default 'viewer',
  organization_id uuid references organizations(id),   -- org_user は必須、admin/viewer は null
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- ============================================================================
-- 月次レポート（団体 × 種別 × 対象期間 = 1単位）
-- ============================================================================

create type report_status as enum ('draft', 'submitted', 'confirmed');

create table monthly_reports (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id),
  species          species_type not null,
  period_start     date not null,
  period_end       date not null,
  status           report_status not null default 'draft',
  notes            text,
  created_by       uuid references profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  -- 同一団体・種別・対象期間の重複レポートを防ぐ（論理削除分は除外）
  constraint monthly_reports_period_chk check (period_end >= period_start)
);
create unique index uq_monthly_reports_unit
  on monthly_reports (organization_id, species, period_start, period_end)
  where deleted_at is null;
create index idx_monthly_reports_org on monthly_reports (organization_id);
create trigger trg_monthly_reports_updated before update on monthly_reports
  for each row execute function set_updated_at();

-- レポート明細（収容・転帰マトリクスの実データ）-------------------------------
-- section: 収容(intake) / 生存転帰(outcome_live) / 非生存転帰(outcome_nonlive)
create type report_section as enum ('intake', 'outcome_live', 'outcome_nonlive');

create table report_lines (
  id            uuid primary key default gen_random_uuid(),
  report_id     uuid not null references monthly_reports(id) on delete cascade,
  section       report_section not null,
  category_code text not null,                       -- intake/outcome categories の code
  region_code   text references regions(code),       -- 地域区分を持たないカテゴリーは null
  age_band_code text not null references age_bands(code),
  count         int  not null default 0 check (count >= 0),
  -- 1レポート内で (section, category, region, age_band) は一意
  constraint uq_report_line unique (report_id, section, category_code, region_code, age_band_code)
);
create index idx_report_lines_report on report_lines (report_id);

-- 管理頭数（§5.3: 月初/月末 + 一時預かり内数）---------------------------------
create type pop_point as enum ('start', 'end');

create table population_counts (
  id             uuid primary key default gen_random_uuid(),
  report_id      uuid not null references monthly_reports(id) on delete cascade,
  point          pop_point not null,                 -- 記録開始時 / 記録終了時
  total_count    int not null default 0 check (total_count >= 0),
  foster_count   int not null default 0 check (foster_count >= 0),  -- うち一時預かり先（内数）
  constraint uq_population_point unique (report_id, point)
);

-- TNR頭数（§5.4: 猫のみ・実施団体のみ・独自の対象期間）------------------------
create table tnr_records (
  id                  uuid primary key references monthly_reports(id) on delete cascade,
  period_start        date,
  period_end          date,
  solo_count          int not null default 0 check (solo_count >= 0),         -- 単独実施
  collaborative_count int not null default 0 check (collaborative_count >= 0),-- 協力実施
  constraint tnr_period_chk check (period_end is null or period_start is null or period_end >= period_start)
);

-- ============================================================================
-- 監査ログ（F-12: 誰が・いつ・何を変更したか）
-- ============================================================================
create table audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references profiles(id),
  action      text not null,                          -- 'insert' / 'update' / 'delete' / 'status_change' など
  table_name  text not null,
  record_id   uuid,
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now()
);
create index idx_audit_logs_record on audit_logs (table_name, record_id);
create index idx_audit_logs_actor on audit_logs (actor_id);
