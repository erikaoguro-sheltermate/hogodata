// 最初の事務局（ADMIN）アカウントを作るスクリプト。2 人目以降は画面（ユーザー・権限）から作成する。
//
// 使い方:
//   set -a && . ./.env && set +a
//   npm run user:create-admin -- admin@example.org "JASA事務局 山田"
//
// 必要な環境変数: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / DATABASE_URL
// 既に同じメールのアカウントがあれば、パスワードを再発行して ADMIN に設定する。
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import { generateInitialPassword } from '../src/lib/auth/policy';

async function main() {
  const [email, displayName] = process.argv.slice(2);
  if (!email || !displayName) {
    console.error('使い方: npm run user:create-admin -- <メールアドレス> "<表示名>"');
    process.exit(1);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !process.env.DATABASE_URL) {
    console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / DATABASE_URL を設定してください。');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const prisma = new PrismaClient();
  const password = generateInitialPassword();
  const normalized = email.trim().toLowerCase();

  let userId: string;
  const created = await supabase.auth.admin.createUser({
    email: normalized, password, email_confirm: true, user_metadata: { must_change_password: true },
  });
  if (created.data.user) {
    userId = created.data.user.id;
  } else {
    // 既存ユーザーを探してパスワードを再設定
    const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = data?.users.find((u) => u.email?.toLowerCase() === normalized);
    if (!existing) throw new Error(`アカウントを作成できませんでした: ${created.error?.message}`);
    userId = existing.id;
    const { error } = await supabase.auth.admin.updateUserById(userId, { password, ban_duration: 'none', user_metadata: { must_change_password: true } });
    if (error) throw new Error(`パスワードを設定できませんでした: ${error.message}`);
  }

  await prisma.profile.upsert({
    where: { id: userId },
    update: { email: normalized, displayName, role: 'ADMIN', organizationId: null },
    create: { id: userId, email: normalized, displayName, role: 'ADMIN' },
  });
  await prisma.$disconnect();

  console.log('\n事務局アカウントを用意しました。');
  console.log(`  メールアドレス : ${normalized}`);
  console.log(`  初期パスワード : ${password}`);
  console.log('ログイン後「アカウント」からパスワードを変更してください。\n');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
