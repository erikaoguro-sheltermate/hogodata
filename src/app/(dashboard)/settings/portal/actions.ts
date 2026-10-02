'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/session';
import { saveSettings, recordAudit } from '@/lib/data/repo';
import type { PortalSettings } from '@/lib/types';

export async function saveSettingsAction(input: PortalSettings): Promise<{ ok: boolean; message: string }> {
  const session = await requireRole('ADMIN');
  const day = Math.trunc(Number(input.deadlineDay));
  if (!(day >= 1 && day <= 28)) return { ok: false, message: '提出期限は 1〜28 日の間で指定してください。' };
  const email = input.contactEmail.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: 'メールアドレスの形式が正しくありません。' };
  await saveSettings({ deadlineDay: day, contactEmail: email, contactNote: input.contactNote.trim().slice(0, 200) });
  await recordAudit({ actorId: session.userId, action: 'UPDATE', entity: 'Setting', entityId: 'portal', summary: `提出期限を翌月${day}日・問い合わせ先を更新` });
  revalidatePath('/', 'layout');
  return { ok: true, message: '保存しました。' };
}
