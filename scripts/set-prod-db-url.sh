#!/bin/bash
# 本番（Vercel）の DATABASE_URL を、手元の .env の値から作った
# 「transaction pooler（6543 番）」の接続文字列で置き換え、そのまま本番に反映する。
# 値は画面に表示しない。クリップボードも使わない。
set -euo pipefail
cd "$(dirname "$0")/.."

set -a; . ./.env; set +a
NEW="$(printf '%s' "$DATABASE_URL" | sed -E 's#:(5432|6543)/postgres.*#:6543/postgres?pgbouncer=true\&connection_limit=1#')"

case "$NEW" in
  postgresql://postgres.*@*.pooler.supabase.com:6543/postgres\?pgbouncer=true\&connection_limit=1) ;;
  *) echo "接続文字列の形が想定と違うため中止しました。"; exit 1 ;;
esac
echo "接続文字列を作成しました（${#NEW} 文字・内容は表示しません）"

echo "1/3 古い DATABASE_URL を削除…"
npx vercel env rm DATABASE_URL production --yes
echo "2/3 新しい DATABASE_URL を登録…"
printf '%s' "$NEW" | npx vercel env add DATABASE_URL production --sensitive
echo "3/3 本番に反映…"
npx vercel --prod
