# JASA Data Hub（どうぶつ保護データプロジェクト）

民間動物保護団体の **月次データ（新規収容・転帰・管理頭数・TNR）** を統一フォーマットで
集計・可視化・還元する、JASA事務局向けの B2B データ収集 SaaS。

> 米国・カナダの Shelter Animals Count を参考に、日本の現場に即して項目設計。
> 比較・評価を目的とせず、現場の振り返りと政策・支援の意思決定に役立てることを目的とする。

## クイックスタート

```bash
npm install
npm run dev      # http://localhost:3000
```

DBなしでそのまま起動できます（シード済みのインメモリデータ）。
画面左下の「表示ロール」で **事務局 / 団体 / 閲覧者** を切り替えてデモできます。

## 主な画面
| パス | 内容 |
|------|------|
| `/` | ダッシュボード（当月の入力状況・未提出団体） |
| `/reports` | 月次レポート一覧（フィルタ・ステータス） |
| `/reports/new` | 月次レポート入力（マトリクス + 収支整合パネル） |
| `/organizations` | 団体マスタ管理 |
| `/analytics` | 集計ダッシュボード（収容/転帰/推移） |
| `/masters` | マスタ管理 |
| `/settings/users` | ユーザー・権限 |

## コマンド
```bash
npm run dev        # 開発サーバー
npm run build      # 本番ビルド
npm run typecheck  # 型チェック
npm run test       # バリデーション単体テスト（Vitest）
```

## ドキュメント
- [docs/requirements.md](docs/requirements.md) — 要件定義（何を/なぜ）
- [docs/spec.md](docs/spec.md) — 詳細仕様（どう作るか・正本）
- [CLAUDE.md](CLAUDE.md) — 実装状況・設計・本番DB接続手順

## 技術スタック
Next.js 16 / React 19 / TypeScript / Tailwind v4 / Recharts /
Prisma + PostgreSQL(Supabase) / Supabase Auth + RLS / Vercel / Vitest
