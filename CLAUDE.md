# JASA Data Hub

民間動物保護団体の **月次データ（新規収容・転帰・管理頭数・TNR）** を統一フォーマットで
蓄積・集計・可視化・還元する、JASA事務局向けの B2B データ収集 SaaS。

- 要件定義（何を/なぜ）: [docs/requirements.md](docs/requirements.md)
- 詳細仕様（どう作るか・**正本**）: [docs/spec.md](docs/spec.md)

## プロジェクト方針
- **別プロダクト**: ShelterMate（個体単位の管理）とは役割分担。本システムは**月次の集計データ**のみ扱う。
- **パイロット年度**: 2026年4月〜2027年3月。
- **Phase 1（最優先）**: JASA事務局による**代行入力** + 集計ダッシュボード。
- 団体間の優劣・ランキングを示すシステムではない（UI・帳票で比較表現を避ける）。

## 技術スタック
Next.js 16 (App Router) / React 19 / TypeScript / Tailwind v4 /
Recharts / react-hook-form + zod / exceljs + papaparse /
**Prisma**(本番DBスキーマ) + PostgreSQL(Supabase) / Supabase Auth + RLS / Vercel /
Vitest（バリデーション単体テスト）。

## 現在の実装状況（MVP）
事務局UIが**DBなしで起動・確認できる**よう、データ層はシード済みインメモリ実装。
本番は Prisma + Supabase に差し替える（`src/lib/data/repo.ts` のみ差し替え）。

| 機能 | 状態 |
|------|------|
| F-02 団体マスタ管理 | ✅ `/organizations` 一覧・作成・編集 |
| F-03 月次レポート入力 | ✅ `/reports/new`,`/reports/[id]` マトリクス入力 |
| F-04 収支整合バリデーション | ✅ 右パネルでリアルタイム + Vitest |
| F-05/06 一覧・ステータス | ✅ `/reports` フィルタ・下書/提出/確定 |
| F-07 集計ダッシュボード | ✅ `/analytics` Recharts |
| F-09 CSVエクスポート | ✅ `/api/exports/reports` |
| F-11 ユーザー・権限 | ✅ `/settings/users`（ロール定義・境界） |
| F-13 マスタ管理 | ✅ `/masters`（閲覧。編集はM後続） |
| F-01 認証 | ⏳ デモはCookieロール切替。本番=Supabase Auth |
| RLS | ⏳ `prisma/rls.sql` 用意済み。Supabase接続時に適用 |
| F-08 Excel取込 / F-10 還元PDF | ⏳ M4（将来） |

## ディレクトリ構成
```
prisma/schema.prisma     ← 本番DBスキーマ（正本・§3）
prisma/seed.ts, rls.sql  ← マスタ投入 / RLSポリシー
src/app/(dashboard)/     ← 画面（reports, organizations, analytics, masters, settings/users）
src/app/login/           ← ログイン（デモ）
src/app/api/             ← APIルート（exports 等）
src/lib/types.ts         ← ドメイン型（Prismaモデル対応）
src/lib/masters.ts       ← マスタ定義（seedと同一の真実источник）
src/lib/validation/      ← V-01〜V-09 + 収支整合（純粋関数・テスト対象）
src/lib/data/            ← データ層（store=インメモリ, repo=非同期API, analytics=集計）
src/lib/auth/session.ts  ← セッション（デモ=Cookie / 本番=Supabase）
src/components/           ← UIプリミティブ・Sidebar・チャート
tests/                   ← Vitest（バリデーション）
```

## 動かし方
```bash
npm run dev        # 開発サーバー（http://localhost:3000）
npm run typecheck  # 型チェック
npm run test       # Vitest（バリデーション）
npm run build      # 本番ビルド
```
画面左下の「表示ロール」で 事務局 / 団体 / 閲覧者 を切り替えてデモできる。

## 本番DB接続（M1）
1. Supabase プロジェクト作成 → `DATABASE_URL` を `.env` に設定
2. `npx prisma migrate dev` でスキーマ適用 → `npx prisma db seed`
3. `prisma/rls.sql` を Supabase で実行（RLS有効化）
4. `src/lib/data/repo.ts` をインメモリ→Prismaクライアントに差し替え
5. `src/lib/auth/session.ts` を Supabase Auth に差し替え

## 中核のビジネスルール
- **収支整合式（§5.5 / F-04）**: `記録終了 = 記録開始 + 収容合計 − 転帰合計`。
  入力時に検算し不一致なら**警告**（既定は保存可・要確認）。実装 [src/lib/validation/balance.ts](src/lib/validation/balance.ts)。
- **データモデル**: 収容/転帰は「カテゴリー × 地域区分 × 年齢区分」のマトリクス。
  region を持たない明細は センチネル `NONE`（PostgreSQLのNULLユニーク問題対策）。
- **マスタ化**: カテゴリー・年齢区分・地域区分・都道府県は編集可能なマスタ。

## 権限・プライバシー
admin=全団体 / org_user=自団体のみ / viewer=集計のみ（個別生データ不可）。
匿名集計のみ外部還元可。団体名特定の公開・第三者提供は行わない。

## コミット規約
Conventional Commits: `type(scope): description`（scope例: reports, orgs, analytics, masters, db, ui）
