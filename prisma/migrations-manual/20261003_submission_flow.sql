-- 提出フロー：差し戻し理由・再提出・参加開始月（非破壊・列の追加のみ）
ALTER TABLE "MonthlyReport" ADD COLUMN IF NOT EXISTS "returnNote"    TEXT;
ALTER TABLE "MonthlyReport" ADD COLUMN IF NOT EXISTS "returnedAt"    TIMESTAMP(3);
ALTER TABLE "MonthlyReport" ADD COLUMN IF NOT EXISTS "resubmittedAt" TIMESTAMP(3);
ALTER TABLE "Organization"  ADD COLUMN IF NOT EXISTS "joinedYear"    INTEGER;
ALTER TABLE "Organization"  ADD COLUMN IF NOT EXISTS "joinedMonth"   INTEGER;
