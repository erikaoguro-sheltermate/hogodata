# 本番DB接続 手順書（Supabase + Prisma + 認証）

この手順を実行すると、デモ（インメモリ）から**本番DB＋認証**に切り替わります。
コードは環境変数で自動判定するため、`.env` を設定して migrate するだけです。

> 仕組み：`DATABASE_URL` があれば Prisma（本番DB）、無ければインメモリ。
> `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` があれば Supabase Auth、無ければデモのロール切替。

---

## 1. Supabase プロジェクト作成
1. https://supabase.com で新規プロジェクトを作成（リージョンは東京/大阪を推奨）。
2. 作成時の **データベースパスワード**を控える。

## 2. 接続情報を取得して `.env` を作成
プロジェクトの **Settings → Database → Connection string** と **Settings → API** から取得し、
リポジトリ直下に `.env` を作成（`.env.example` をコピー）：

```bash
cp .env.example .env
```

`.env` に以下を設定：
- `DATABASE_URL` … Connection pooler（port **6543**, `?pgbouncer=true&connection_limit=1`）
- `DIRECT_URL` … 直結（port **5432**）※マイグレーション用
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` … API ページから

## 3. スキーマ適用 & マスタ投入
```bash
npm run db:generate   # Prisma クライアント生成
npm run db:migrate    # テーブル作成（prisma/schema.prisma → DB）
npm run db:seed       # マスタ投入（年齢区分・カテゴリー・47都道府県）
```

## 4. RLS ポリシー適用（団体データの分離）
Supabase の **SQL Editor** で [`prisma/rls.sql`](../prisma/rls.sql) の内容を実行する。

## 5. 最初の管理者ユーザーを作成
1. アプリの `/login` からメールでサインアップ（または Supabase Auth ダッシュボードで作成）。
2. その `auth.users.id` に対応する `Profile` 行を作成し、ロールを ADMIN に：
   ```sql
   insert into "Profile" (id, email, "displayName", role)
   values ('<auth.users.idをここに>', 'admin@example.org', 'JASA事務局', 'ADMIN');
   ```

## 6. 起動して確認
```bash
npm run dev
```
- `DATABASE_URL` 設定済み → データが永続化（再起動で消えない）
- Supabase 設定済み → 未ログインは `/login` にリダイレクト、ロールは Profile で判定

---

## 切り戻し（デモに戻す）
`.env` の `DATABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` をコメントアウトすれば、
インメモリ＋ロール切替のデモモードに戻る。

## 補足
- 団体ユーザーは自団体のみ・閲覧者は集計のみ、という分離は `prisma/rls.sql` がDB層で担保する。
- 既存マイグレーションは変更せず、スキーマ変更は `npm run db:migrate` で新規追加する。
- 本番デプロイ（Vercel）では `npm run db:deploy`（`migrate deploy`）を使う。
