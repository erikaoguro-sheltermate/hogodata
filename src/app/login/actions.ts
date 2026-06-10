'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const GATE_COOKIE = 'jasa_gate';

/** 共有パスワードでログイン（運営向けの軽量ゲート） */
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

export async function gateLogout() {
  const c = await cookies();
  c.delete(GATE_COOKIE);
  redirect('/login');
}
