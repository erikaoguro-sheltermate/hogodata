-- レポート考察メモ用テーブル（非破壊・追加のみ）
CREATE TABLE IF NOT EXISTS "ReportNote" (
  "key"       TEXT PRIMARY KEY,
  "body"      TEXT NOT NULL,
  "updatedBy" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
