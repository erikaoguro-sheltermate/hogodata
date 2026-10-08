# 引き継ぎメモ（2026-10-08 時点）

新しいセッション・新しいアカウントで作業を続けるとき、最初にこのファイルを読む。
技術仕様は [CLAUDE.md](../CLAUDE.md)・[spec.md](spec.md)、環境構築は [db-setup.md](db-setup.md)。

## プロジェクトの位置づけ
- JASA「どうぶつ保護データプロジェクト」の事務局・団体向けポータル。団体が月次の頭数統計を提出し、事務局が確認・確定・集計・還元する。
- ShelterMate（個体管理）とは別プロダクト・別リポジトリ。混同しない。
- 本番 URL: https://jasa-data-hub.vercel.app （事務局・団体とも同じ URL。ログイン後の権限で画面が変わる）

## 本番の構成（2026-10-05 に移行完了）
- **Vercel**: アカウント `sheltermatedev@gmail.com`（scope `sheltermatedev-8186`）、プロジェクト `jasa-data-hub`。Git 連携なし。**反映は `cd ~/jasa-data-hub && npx vercel --prod` を手動実行**（Claude からは安全装置で実行できないため、人が実行する）。実行場所は東京 `hnd1`（`vercel.json`）。
- **Supabase**: 会社の有料組織 `sheltermate`（Pro）に移動済み。プロジェクト `jasa_hogodata`（ref `agehspgwaceyspwzwrps`、東京）。毎日の自動バックアップあり。
- **DB 接続**: 本番の `DATABASE_URL` は **transaction pooler（6543 番、`?pgbouncer=true&connection_limit=1`）**。session モード（5432）だと同時接続 15 本で落ちる（2026-10-05 に発生）。`DIRECT_URL` はマイグレーション用に 5432 のまま。本番の値を入れ直すときは `scripts/set-prod-db-url.sh`（手元の `.env` から作って登録・反映まで行う。値は表示しない）。
- **ログイン**: Supabase Auth のメール＋パスワード。自己登録はオフ。アカウントは事務局が「設定 → ユーザー」で作る。最初の事務局アカウントは Supabase 画面 + SQL で作成済み。
- **環境変数（Vercel Production）**: `DATABASE_URL` `DIRECT_URL` `NEXT_PUBLIC_SUPABASE_URL` `NEXT_PUBLIC_SUPABASE_ANON_KEY` `SUPABASE_SERVICE_ROLE_KEY` `APP_PASSWORD`（共有パスワード。段階 9 完了後に削除予定）。
- 手元の `.env` は git 管理外。`DATABASE_URL` は 5432（手元はこれで問題ない）。

## 残っている作業（本番移行 段階 9）
1. 事務局で各画面（ダッシュボード・提出状況・団体マスタ・設定）が開くことを確認
2. 「テスト団体（削除予定）」を作り、団体ユーザーを 1 人作成 → シークレットウィンドウでログイン → 1 件入力して提出 → 事務局で確認待ちから確定
3. 片づけ：テストのレポートを削除、テスト団体を無効、テストユーザーを停止
4. 設定 → データの控え で Excel を 1 回ダウンロードして保存
5. Vercel の `APP_PASSWORD` を削除 → `npx vercel --prod`
6. 団体への案内開始（ログイン情報は事務局が「設定 → ユーザー」で発行）

## 運用ルール（docs/account-handling-guide.md に事務局向けの全文）
- 毎月、確定後に「設定 → データの控え」の Excel を Google ドライブに保存
- 事務局アカウントは最小限。退任者は即停止
- 鍵（service_role 等）はチャット・メールに貼らない

## 直近の判断・方針
- 団体向け用語は「毎月の報告」、事務局向けは「月次レポート」。役割名は「JASA事務局」
- 見た目は絵文字なし・深緑・角の小さい四角（AI っぽさを避ける）
- スマホ対応は団体画面のみ。事務局は PC 前提
- スプレッドシート自動同期は見送り、手動の Excel 控えで運用（軽い案）
- 公開ページ（ログイン不要の全国集計）は作らない

## 未対応・将来
- Excel 取り込み（F-08）
- 事務局向けの二段階認証
- 事務局画面のスマホ最適化
- lint の警告 7 件（未使用変数）。エラーは 0 件（2026-10-08 に CommentarySection / DemoRoleButtons / Sidebar の 3 件を修正、本番反映は次回の `npx vercel --prod` で）

## 作業の進め方（Claude への指示）
- このリポジトリ内は自由に編集してよい。ShelterMate-App の takapom のコードは触らない
- 本番 DB を変える操作（SQL、環境変数）は実行前に必ず人に確認する
- 動作確認は `.claude/launch.json` の `jasa-data-hub-demo`（DB なし・インメモリ）で行う。本番 DB は読み取り確認のみ
- コミットは Conventional Commits（`feat(scope): …`）
