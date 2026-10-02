'use server';

import { requireSession, authMode } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { validateNewPassword } from '@/lib/auth/policy';

export async function changePasswordAction(current: string, next: string): Promise<{ ok: boolean; message: string }> {
  const session = await requireSession();
  if (authMode() !== 'supabase' || !session.email) {
    return { ok: false, message: 'デモ環境ではパスワードを変更できません。' };
  }
  const invalid = validateNewPassword(next);
  if (invalid) return { ok: false, message: invalid };
  if (current === next) return { ok: false, message: '今と違うパスワードにしてください。' };

  const supabase = await createSupabaseServerClient();
  // 本人確認として現在のパスワードを検証する
  const { error: signInError } = await supabase.auth.signInWithPassword({ email: session.email, password: current });
  if (signInError) return { ok: false, message: '現在のパスワードが正しくありません。' };

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { ok: false, message: `変更できませんでした（${error.message}）。` };
  return { ok: true, message: 'パスワードを変更しました。次回から新しいパスワードでログインしてください。' };
}
