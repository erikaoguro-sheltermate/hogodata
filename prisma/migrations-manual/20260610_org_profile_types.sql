-- 団体プロフィール項目の型変更（既存データを保持・変換する非破壊マイグレーション）
-- 対象: Organization.animalHandling (text -> text[]) / avgAnimalsManaged (int -> text)
--
-- 既存3団体（チームいけどう / ワンハート制作委員会 / 町田ねこの会）のデータを失わずに変換する。

-- 動物取扱業：文字列 → 配列（既存値を1要素の配列に。NULLは空配列）
ALTER TABLE "Organization"
  ALTER COLUMN "animalHandling" DROP DEFAULT,
  ALTER COLUMN "animalHandling" TYPE text[]
    USING (CASE
      WHEN "animalHandling" IS NULL OR "animalHandling" = '' THEN '{}'::text[]
      ELSE ARRAY["animalHandling"]
    END),
  ALTER COLUMN "animalHandling" SET DEFAULT '{}';

-- 平均管理頭数：数値 → 範囲文字列（新しいプルダウンの選択肢にマッピング）
ALTER TABLE "Organization"
  ALTER COLUMN "avgAnimalsManaged" TYPE text
    USING (CASE
      WHEN "avgAnimalsManaged" IS NULL THEN NULL
      WHEN "avgAnimalsManaged" <= 50 THEN '0〜50匹'
      WHEN "avgAnimalsManaged" <= 100 THEN '51〜100匹'
      WHEN "avgAnimalsManaged" <= 200 THEN '101〜200匹'
      ELSE '201匹〜'
    END);
