import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // ① 共有パスワードゲート（APP_PASSWORD 設定時に有効。運営向けの軽量ガード）
  const gatePw = process.env.APP_PASSWORD;
  if (gatePw) {
    const isPublic = path.startsWith('/login');
    const authed = request.cookies.get('jasa_gate')?.value === gatePw;
    if (!authed && !isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  // ② Supabase Auth（設定時のみ。Phase 2 の団体ユーザー向け）
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return updateSession(request);
  }

  // どちらも未設定＝デモ（認証なし）
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
