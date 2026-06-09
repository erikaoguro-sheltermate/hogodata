'use server';

import { revalidatePath } from 'next/cache';
import { createOrganization, updateOrganization } from '@/lib/data/repo';
import { getSession, isAdmin } from '@/lib/auth/session';
import type { Organization } from '@/lib/types';

export type OrgInput = Omit<Organization, 'id'>;

export async function saveOrganizationAction(input: OrgInput, id?: string): Promise<{ ok: boolean; message?: string }> {
  const session = await getSession();
  if (!isAdmin(session)) return { ok: false, message: '団体マスタの編集は事務局のみ可能です。' };
  if (!input.name.trim()) return { ok: false, message: '団体名を入力してください。' };
  if (!input.prefectureCode) return { ok: false, message: '所在都道府県を選択してください。' };

  if (id) await updateOrganization(id, input);
  else await createOrganization(input);

  revalidatePath('/organizations');
  revalidatePath('/');
  return { ok: true };
}
