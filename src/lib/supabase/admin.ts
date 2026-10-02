// Supabase 管理クライアント（service_role）。サーバー専用。
// ユーザー作成・パスワード再発行・利用停止に使う。キーは絶対にクライアントへ渡さない。
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function isSupabaseAdminConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (!isSupabaseAdminConfigured()) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY が設定されていません（docs/db-setup.md 参照）。');
  }
  cached ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
