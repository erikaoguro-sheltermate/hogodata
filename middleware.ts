import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  // Supabase が設定されていれば認証ガードを有効化。
  // 未設定（デモ環境）では素通り（Cookieロール切替で動作）。
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return updateSession(request);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // 静的アセット・画像以外のすべてのパスに適用
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
