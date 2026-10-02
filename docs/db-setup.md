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

## 5. ログイン（Supabase Auth）を有効にする
1. Supabase の **Authentication → Sign In / Providers** で
   - **Email** を有効のまま、**Allow new users to sign up をオフ**（アカウントは事務局だけが作る）
   - **Confirm email をオフ**（事務局が作るアカウントは確認済みとして作成するため不要）
2. **Settings → API** から次の 3 つを `.env` と Vercel の環境変数（Production）に設定：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`（**サーバー専用**。`NEXT_PUBLIC_` を付けない・チャットや Git に貼らない）
3. 最初の事務局アカウントを作る（2 人目以降は画面から）：
   ```bash
   set -a && . ./.env && set +a
   npm run user:create-admin -- admin@example.org "JASA事務局 山田"
   ```
   初期パスワードがターミナルに一度だけ表示される。ログイン後「アカウント」で変更する。
4. Supabase の設定が入ると共有パスワード（`APP_PASSWORD`）は使われなくなる。不要になったら Vercel から削除してよい。

### ポータル機能のテーブル追加（お知らせ・設定）
Supabase の SQL Editor で [`prisma/migrations-manual/20261002_portal.sql`](../prisma/migrations-manual/20261002_portal.sql) を実行する
（追加のみ・既存データに影響なし）。未適用でも画面は動くが、お知らせは空・設定は既定値（翌月10日）になり、保存はできない。

### 提出フローの列追加
続けて [`prisma/migrations-manual/20261003_submission_flow.sql`](../prisma/migrations-manual/20261003_submission_flow.sql) を実行する
（差し戻し理由・再提出日時・参加開始月の列を追加するだけ）。**こちらは未適用だとレポートの読み書きが失敗する**ので、デプロイ前に必ず適用する。

### 団体ユーザーの追加（運用）
事務局でログイン →「ユーザー」→「＋ ユーザーを追加」→ メール・お名前・権限・所属団体を入力。
表示された「ログイン情報」をコピーして団体に伝える（初期パスワードは再表示できない）。
パスワードを忘れた団体には「パスワード再発行」、退会・担当交代は「停止」。

## 6. 起動して確認
```bash
npm run dev
```
- `DATABASE_URL` 設定済み → データが永続化（再起動で消えない）
- Supabase 設定済み → 未ログインは `/login` にリダイレクト、ロールと所属団体は Profile で判定
- Profile の無いアカウント・停止中のアカウントは「ご利用いただけません」と表示される

---

## 切り戻し（デモに戻す）
`.env` の `DATABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` をコメントアウトすれば、
インメモリ＋ロール切替のデモモードに戻る。

## 補足
- 団体ユーザーは自団体のみ・閲覧者は集計のみ、という分離は**アプリ層**（`src/lib/auth/policy.ts`）で担保する。
  Prisma はRLSを通らない接続のため、`prisma/rls.sql` は Supabase REST API 経由の直接アクセスを塞ぐ役割。
- 既存マイグレーションは変更せず、スキーマ変更は `npm run db:migrate` で新規追加する。
- 本番デプロイ（Vercel）では `npm run db:deploy`（`migrate deploy`）を使う。
