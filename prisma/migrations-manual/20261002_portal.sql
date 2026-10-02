-- ポータル機能：お知らせ・既読・設定（非破壊・追加のみ）
CREATE TABLE IF NOT EXISTS "Announcement" (
  "id"          TEXT PRIMARY KEY,
  "title"       TEXT NOT NULL,
  "body"        TEXT NOT NULL,
  "pinned"      BOOLEAN NOT NULL DEFAULT false,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "Announcement_publishedAt_idx" ON "Announcement"("publishedAt");

CREATE TABLE IF NOT EXISTS "AnnouncementRead" (
  "userId"         TEXT NOT NULL,
  "announcementId" TEXT NOT NULL REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "readAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("userId", "announcementId")
);

CREATE TABLE IF NOT EXISTS "AppSetting" (
  "key"       TEXT PRIMARY KEY,
  "value"     TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- 公開REST APIからの直接アクセスを遮断（アプリは Prisma 経由のため影響なし）
ALTER TABLE "Announcement"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AnnouncementRead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AppSetting"       ENABLE ROW LEVEL SECURITY;
