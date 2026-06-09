-- ============================================================================
-- JASA Data Hub — Row Level Security ポリシー
--
-- プライバシー方針（要件§4 / §7）:
--   - admin（事務局）   : 全団体の全データにアクセス可能
--   - org_user（団体）  : 自団体のデータのみ（他団体の個別データは一切見えない）
--   - viewer（理事等）  : 集計ダッシュボードの閲覧のみ。個別団体の生データには行アクセス不可
--                         （匿名集計は SECURITY DEFINER のRPC/ビュー経由で提供する）
-- ============================================================================

-- 現在ユーザーのロール / 所属団体を返すヘルパー（RLS再帰回避のため SECURITY DEFINER）---
create or replace function current_user_role()
returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function current_user_org()
returns uuid
language sql stable security definer set search_path = public as $$
  select organization_id from profiles where id = auth.uid();
$$;

create or replace function is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role from profiles where id = auth.uid()) = 'admin', false);
$$;

-- RLS 有効化 -----------------------------------------------------------------
alter table profiles            enable row level security;
alter table organizations       enable row level security;
alter table monthly_reports     enable row level security;
alter table report_lines        enable row level security;
alter table population_counts   enable row level security;
alter table tnr_records         enable row level security;
alter table audit_logs          enable row level security;
alter table prefectures         enable row level security;
alter table age_bands           enable row level security;
alter table regions             enable row level security;
alter table intake_categories   enable row level security;
alter table outcome_categories  enable row level security;

-- profiles -------------------------------------------------------------------
create policy profiles_self_read on profiles
  for select using (id = auth.uid() or is_admin());
create policy profiles_admin_all on profiles
  for all using (is_admin()) with check (is_admin());

-- organizations --------------------------------------------------------------
create policy orgs_admin_all on organizations
  for all using (is_admin()) with check (is_admin());
create policy orgs_org_user_read on organizations
  for select using (id = current_user_org());
create policy orgs_viewer_read on organizations
  for select using (current_user_role() = 'viewer');

-- monthly_reports ------------------------------------------------------------
create policy reports_admin_all on monthly_reports
  for all using (is_admin()) with check (is_admin());
create policy reports_org_user_rw on monthly_reports
  for all
  using (organization_id = current_user_org())
  with check (organization_id = current_user_org());

-- report_lines（親 monthly_reports 経由で団体を判定）--------------------------
create policy report_lines_admin_all on report_lines
  for all using (is_admin()) with check (is_admin());
create policy report_lines_org_user_rw on report_lines
  for all
  using (exists (
    select 1 from monthly_reports r
    where r.id = report_lines.report_id and r.organization_id = current_user_org()))
  with check (exists (
    select 1 from monthly_reports r
    where r.id = report_lines.report_id and r.organization_id = current_user_org()));

-- population_counts ----------------------------------------------------------
create policy population_admin_all on population_counts
  for all using (is_admin()) with check (is_admin());
create policy population_org_user_rw on population_counts
  for all
  using (exists (
    select 1 from monthly_reports r
    where r.id = population_counts.report_id and r.organization_id = current_user_org()))
  with check (exists (
    select 1 from monthly_reports r
    where r.id = population_counts.report_id and r.organization_id = current_user_org()));

-- tnr_records ----------------------------------------------------------------
create policy tnr_admin_all on tnr_records
  for all using (is_admin()) with check (is_admin());
create policy tnr_org_user_rw on tnr_records
  for all
  using (exists (
    select 1 from monthly_reports r
    where r.id = tnr_records.id and r.organization_id = current_user_org()))
  with check (exists (
    select 1 from monthly_reports r
    where r.id = tnr_records.id and r.organization_id = current_user_org()));

-- audit_logs（admin のみ閲覧。書き込みは service role / トリガー経由）----------
create policy audit_admin_read on audit_logs
  for select using (is_admin());

-- マスタ（認証ユーザーは閲覧可、編集は admin のみ）----------------------------
create policy masters_read_prefectures on prefectures for select using (auth.uid() is not null);
create policy masters_read_age_bands   on age_bands   for select using (auth.uid() is not null);
create policy masters_read_regions     on regions     for select using (auth.uid() is not null);
create policy masters_read_intake      on intake_categories  for select using (auth.uid() is not null);
create policy masters_read_outcome     on outcome_categories for select using (auth.uid() is not null);

create policy masters_admin_prefectures on prefectures for all using (is_admin()) with check (is_admin());
create policy masters_admin_age_bands   on age_bands   for all using (is_admin()) with check (is_admin());
create policy masters_admin_regions     on regions     for all using (is_admin()) with check (is_admin());
create policy masters_admin_intake      on intake_categories  for all using (is_admin()) with check (is_admin());
create policy masters_admin_outcome     on outcome_categories for all using (is_admin()) with check (is_admin());
