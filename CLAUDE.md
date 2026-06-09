# JASA Data Hub

民間動物保護団体の **月次データ（新規収容・転帰・管理頭数・TNR）** を統一フォーマットで
蓄積・集計・可視化・還元する、JASA事務局向けの B2B データ収集 SaaS。

要件定義の全文は [docs/requirements.md](docs/requirements.md) を参照。

## プロジェクト方針
- **別プロダクト**: ShelterMate（個体単位の管理）とは役割分担。本システムは**月次の集計データ**のみ扱う。
- **パイロット年度**: 2026年4月〜2027年3月。
- **Phase 1（最優先）**: JASA事務局による**代行入力** + 集計ダッシュボード。
- 団体間の優劣・ランキングを示すシステムではない（UI・帳票で比較表現を避ける）。

## 技術スタック
- Next.js (App Router) + React + TypeScript
- Supabase（Postgres + Auth + RLS + Storage）
- Tailwind CSS + shadcn/ui
- Recharts（ダッシュボード） / react-hook-form + zod（フォーム・検証）
- exceljs + papaparse（Excel/CSV 入出力） / TanStack Table（一覧）
- Vercel（ホスティング）

## ディレクトリ構成
```
src/app/                 ← Next.js ルート（画面）
src/lib/domain/          ← ドメイン型・ビジネスルール（純粋・外部依存なし）
src/lib/supabase/        ← Supabaseクライアント（server/client）
supabase/migrations/     ← DBスキーマ・RLS・マスタ（連番タイムスタンプ命名）
docs/                    ← 要件定義・設計ドキュメント
```

## 中核のビジネスルール
- **収支整合式（§5.5 / F-04）**: `月末管理頭数 = 月初管理頭数 + 収容合計 − 転帰合計`。
  入力時に検算し不一致なら警告。実装は [src/lib/domain/balance.ts](src/lib/domain/balance.ts)。
- **データモデル**: 収容/転帰は「カテゴリー × 地域区分 × 年齢区分」のマトリクスを
  `report_lines` に**行で正規化**して保持（横長カラムにしない）。様式改訂・マスタ編集に強い。
- **マスタ化（F-13）**: カテゴリー・年齢区分・地域区分・都道府県は編集可能なマスタ。

## 権限・プライバシー（RLSで担保）
| ロール | アクセス範囲 |
|--------|------------|
| admin（事務局） | 全団体の全データ |
| org_user（団体） | **自団体のみ**。他団体の個別データは見えない |
| viewer（理事等） | 集計ダッシュボードの閲覧のみ。個別生データへの行アクセス不可 |

匿名集計のみ外部還元可。団体名が特定される形での公開・第三者提供は行わない。

## DBマイグレーション規約
- 連番タイムスタンプ命名（`YYYYMMDDHHMMSS_description.sql`）。
- 既存マイグレーションは変更せず、新規ファイルで対応。
- 物理削除はせず `deleted_at` による論理削除を基本とする。
- 主要データの変更は `audit_logs` に記録（誰が・いつ・何を）。

## コミット規約
Conventional Commits: `type(scope): description`
- type: feat / fix / refactor / perf / test / docs / chore / style
- scope 例: orgs, reports, dashboard, masters, auth, db, ui
