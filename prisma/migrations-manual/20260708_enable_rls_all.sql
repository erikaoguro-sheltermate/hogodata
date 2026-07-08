-- 全テーブルで RLS を有効化（公開REST APIからの無許可アクセスを遮断）
-- アプリは Prisma（テーブル所有者=postgresロール）で接続し RLS をバイパスするため影響なし。
-- ポリシーを付けないテーブルは anon/authenticated から全拒否（deny-all）になる。
-- 有効化済みテーブルへの再実行は no-op。

ALTER TABLE "Profile"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Organization"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MonthlyReport"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IntakeEntry"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OutcomeEntry"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TnrEntry"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IntakeCategory"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OutcomeCategory"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgeGroup"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Prefecture"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReportNote"       ENABLE ROW LEVEL SECURITY;
