import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { GATE_COOKIE, gateToken, safeEqual } from '@/lib/auth/gate';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const supabaseOn = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  // ① 本番：Supabase Auth（メール＋パスワード）。設定されていれば共有パスワードより優先。
  if (supabaseOn) {
    return updateSession(request);
  }

  // ② 共有パスワードゲート（APP_PASSWORD 設定時に有効。Supabase 導入前の運営向け軽量ガード）
  const gatePw = process.env.APP_PASSWORD;
  if (gatePw) {
    const isPublic = path.startsWith('/login');
    const token = request.cookies.get(GATE_COOKIE)?.value ?? '';
    const authed = token !== '' && safeEqual(token, await gateToken(gatePw));
    if (!authed && !isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  // どちらも未設定＝デモ（認証なし）
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
