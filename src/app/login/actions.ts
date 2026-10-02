'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/server';

const GATE_COOKIE = 'jasa_gate';

/** メール＋パスワードでログイン（Supabase Auth） */
export async function passwordLogin(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!isSupabaseConfigured() || !email || !password) redirect('/login?error=invalid');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // 停止中のユーザーは "User is banned" が返る
    redirect(/banned/i.test(error.message) ? '/login?error=noaccess' : '/login?error=invalid');
  }
  redirect('/');
}

/** 共有パスワードでログイン（Supabase 導入前の運営向けの軽量ゲート） */
export async function gateLogin(formData: FormData) {
  const pw = String(formData.get('password') ?? '');
  const expected = process.env.APP_PASSWORD;
  if (expected && pw === expected) {
    const c = await cookies();
    c.set(GATE_COOKIE, pw, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30日
    });
    redirect('/');
  }
  redirect('/login?error=1');
}

/** ログアウト（どの認証方式でも使える） */
export async function logout() {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  const c = await cookies();
  c.delete(GATE_COOKIE);
  redirect('/login');
}

/** 旧名（互換） */
export const gateLogout = logout;
