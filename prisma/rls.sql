-- JASA Data Hub — RLS ポリシー（仕様書 §7）
-- Prisma はRLSを管理しないため、`prisma migrate` 適用後にこのSQLを Supabase で実行する。
-- テーブル名は Prisma モデル名（PascalCase）。
--
-- 認可方針:
--   ADMIN   : 全行
--   ORG_USER: 自団体（Profile.organizationId）の行のみ
--   VIEWER  : 集計ビューのみ（個別レポートの行アクセス不可）

-- 現在ユーザーのロール / 所属団体（RLS再帰回避のため security definer）
create or replace function auth_role() returns text
language sql stable security definer set search_path = public as $$
  select role::text from "Profile" where id = auth.uid()::text;
$$;

create or replace function auth_org() returns text
language sql stable security definer set search_path = public as $$
  select "organizationId" from "Profile" where id = auth.uid()::text;
$$;

alter table "MonthlyReport"  enable row level security;
alter table "IntakeEntry"    enable row level security;
alter table "OutcomeEntry"   enable row level security;
alter table "TnrEntry"       enable row level security;
alter table "Organization"   enable row level security;

-- MonthlyReport
create policy mr_admin on "MonthlyReport" for all
  using (auth_role() = 'ADMIN') with check (auth_role() = 'ADMIN');
create policy mr_org on "MonthlyReport" for all
  using (auth_role() = 'ORG_USER' and "organizationId" = auth_org())
  with check (auth_role() = 'ORG_USER' and "organizationId" = auth_org());

-- 明細（親 MonthlyReport 経由で団体判定）
create policy ie_admin on "IntakeEntry" for all
  using (auth_role() = 'ADMIN') with check (auth_role() = 'ADMIN');
create policy ie_org on "IntakeEntry" for all
  using (exists (select 1 from "MonthlyReport" r where r.id = "IntakeEntry"."reportId" and r."organizationId" = auth_org()))
  with check (exists (select 1 from "MonthlyReport" r where r.id = "IntakeEntry"."reportId" and r."organizationId" = auth_org()));

create policy oe_admin on "OutcomeEntry" for all
  using (auth_role() = 'ADMIN') with check (auth_role() = 'ADMIN');
create policy oe_org on "OutcomeEntry" for all
  using (exists (select 1 from "MonthlyReport" r where r.id = "OutcomeEntry"."reportId" and r."organizationId" = auth_org()))
  with check (exists (select 1 from "MonthlyReport" r where r.id = "OutcomeEntry"."reportId" and r."organizationId" = auth_org()));

create policy te_admin on "TnrEntry" for all
  using (auth_role() = 'ADMIN') with check (auth_role() = 'ADMIN');
create policy te_org on "TnrEntry" for all
  using (exists (select 1 from "MonthlyReport" r where r.id = "TnrEntry"."reportId" and r."organizationId" = auth_org()))
  with check (exists (select 1 from "MonthlyReport" r where r.id = "TnrEntry"."reportId" and r."organizationId" = auth_org()));

-- Organization（ADMIN全件 / ORG_USERは自団体 / VIEWERは閲覧）
create policy org_admin on "Organization" for all
  using (auth_role() = 'ADMIN') with check (auth_role() = 'ADMIN');
create policy org_read on "Organization" for select
  using (auth_role() = 'VIEWER' or (auth_role() = 'ORG_USER' and id = auth_org()));

-- 注: VIEWER/ORG_USER 向けの全国集計は、団体名を含まない匿名集計ビュー（別途定義）を参照する。
