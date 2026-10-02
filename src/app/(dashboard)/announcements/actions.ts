'use server';

import { revalidatePath } from 'next/cache';
import { getSession, requireRole } from '@/lib/auth/session';
import { saveAnnouncement, deleteAnnouncement, markAnnouncementsRead, recordAudit } from '@/lib/data/repo';

type Result = { ok: true } | { ok: false; message: string };

export async function saveAnnouncementAction(
  input: { title: string; body: string; pinned: boolean }, id?: string,
): Promise<Result> {
  const session = await requireRole('ADMIN');
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title) return { ok: false, message: 'タイトルを入力してください。' };
  if (!body) return { ok: false, message: '本文を入力してください。' };
  if (title.length > 120) return { ok: false, message: 'タイトルは 120 文字以内にしてください。' };
  const saved = await saveAnnouncement({ title, body, pinned: input.pinned }, id, session.userId);
  await markAnnouncementsRead(session.userId, [saved.id]); // 書いた本人には未読にしない
  await recordAudit({ actorId: session.userId, action: id ? 'UPDATE' : 'CREATE', entity: 'Announcement', entityId: saved.id, summary: `お知らせ「${title}」` });
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function deleteAnnouncementAction(id: string, title: string): Promise<Result> {
  const session = await requireRole('ADMIN');
  await deleteAnnouncement(id);
  await recordAudit({ actorId: session.userId, action: 'DELETE', entity: 'Announcement', entityId: id, summary: `お知らせ「${title}」` });
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** 一覧を開いたら表示中のお知らせを既読にする */
export async function markReadAction(ids: string[]): Promise<void> {
  const session = await getSession();
  if (!session.hasAccess || ids.length === 0) return;
  await markAnnouncementsRead(session.userId, ids);
  revalidatePath('/', 'layout');
}
