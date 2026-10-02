// JASA Data Hub — ログインアカウント操作（Supabase Auth 管理API）
//
// 事務局がユーザーを作成し、初期パスワードを団体へ伝える運用（メール配信に頼らない）。
// Supabase 未設定のデモでは、Profile だけ作って認証部分は擬似的に扱う。

import { supabaseAdmin, isSupabaseAdminConfigured } from '../supabase/admin';
import { isSupabaseConfigured } from '../supabase/server';

export interface AccountStatus {
  suspended: boolean;
  lastSignInAt: string | null;
}

// 停止は Supabase の ban で表現する（ログイン不可・既存セッションも次回確認で失効）
const BAN_FOREVER = '876000h'; // 約100年

const g = globalThis as unknown as { __jasaDemoAccounts?: Record<string, AccountStatus> };
function demoAccounts() {
  return (g.__jasaDemoAccounts ??= {});
}

export function accountsManagedBySupabase(): boolean {
  return isSupabaseConfigured();
}

/** 管理操作が可能か（Supabase 利用時は service_role キーが必要） */
export function accountAdminReady(): boolean {
  return !isSupabaseConfigured() || isSupabaseAdminConfigured();
}

/** ログインアカウントを作成し、その id を返す。メールは確認済みとして作成する。 */
export async function createAccount(email: string, password: string): Promise<{ id: string } | { error: string }> {
  if (!isSupabaseConfigured()) return { id: `demo-${crypto.randomUUID().slice(0, 8)}` };
  const { data, error } = await supabaseAdmin().auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { must_change_password: true }, // 初回ログイン後に変更をうながす
  });
  if (error || !data.user) {
    const msg = error?.message ?? '';
    if (/already|registered|exists/i.test(msg)) return { error: 'このメールアドレスは既に登録されています。' };
    return { error: `アカウントを作成できませんでした（${msg || '不明なエラー'}）。` };
  }
  return { id: data.user.id };
}

export async function setPassword(userId: string, password: string): Promise<{ error?: string }> {
  if (!isSupabaseConfigured()) return {};
  const { error } = await supabaseAdmin().auth.admin.updateUserById(userId, {
    password, user_metadata: { must_change_password: true },
  });
  return error ? { error: `パスワードを変更できませんでした（${error.message}）。` } : {};
}

export async function setSuspended(userId: string, suspended: boolean): Promise<{ error?: string }> {
  if (!isSupabaseConfigured()) {
    demoAccounts()[userId] = { ...(demoAccounts()[userId] ?? { lastSignInAt: null }), suspended };
    return {};
  }
  const { error } = await supabaseAdmin().auth.admin.updateUserById(userId, { ban_duration: suspended ? BAN_FOREVER : 'none' });
  return error ? { error: `状態を変更できませんでした（${error.message}）。` } : {};
}

/** 全アカウントの状態（停止中か・最終ログイン）。取得できなければ空。 */
export async function listAccountStatus(): Promise<Record<string, AccountStatus>> {
  if (!isSupabaseConfigured()) return { ...demoAccounts() };
  if (!isSupabaseAdminConfigured()) return {};
  const out: Record<string, AccountStatus> = {};
  const now = new Date();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabaseAdmin().auth.admin.listUsers({ page, perPage: 200 });
    if (error) break;
    for (const u of data.users) {
      out[u.id] = {
        suspended: !!u.banned_until && new Date(u.banned_until) > now,
        lastSignInAt: u.last_sign_in_at ?? null,
      };
    }
    if (data.users.length < 200) break;
  }
  return out;
}
