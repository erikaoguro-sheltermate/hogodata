'use server';

import { revalidatePath } from 'next/cache';
import { saveReportNote } from '@/lib/data/repo';
import { getSession, isAdmin } from '@/lib/auth/session';

export async function saveNoteAction(key: string, body: string): Promise<{ ok: boolean; message?: string }> {
  const session = await getSession();
  if (!isAdmin(session)) return { ok: false, message: '考察の編集は事務局のみ可能です。' };
  await saveReportNote(key, body, session.userId);
  revalidatePath('/analytics');
  revalidatePath('/report');
  return { ok: true };
}
