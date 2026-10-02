'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/session';
import { getProfile, upsertProfile, getOrganization, listProfiles, recordAudit } from '@/lib/data/repo';
import { createAccount, setPassword, setSuspended, accountAdminReady } from '@/lib/auth/accounts';
import { generateInitialPassword } from '@/lib/auth/policy';
import type { Role } from '@/lib/types';

export interface UserInput {
  email: string;
  displayName: string;
  role: Role;
  organizationId: string | null;
}

type Result = { ok: true; password?: string } | { ok: false; message: string };

const ROLES: Role[] = ['ADMIN', 'ORG_USER', 'VIEWER'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function checkInput(input: UserInput): Promise<string | null> {
  if (!input.displayName.trim()) return 'お名前を入力してください。';
  if (!ROLES.includes(input.role)) return '権限を選んでください。';
  if (input.role === 'ORG_USER') {
    if (!input.organizationId) return '団体ユーザーには所属団体が必要です。';
    if (!(await getOrganization(input.organizationId))) return '所属団体が見つかりません。';
  }
  return null;
}

export async function createUserAction(input: UserInput): Promise<Result> {
  const session = await requireRole('ADMIN');
  if (!accountAdminReady()) return { ok: false, message: 'サーバーに SUPABASE_SERVICE_ROLE_KEY が設定されていません。' };
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, message: 'メールアドレスの形式が正しくありません。' };
  const invalid = await checkInput(input);
  if (invalid) return { ok: false, message: invalid };
  if ((await listProfiles()).some((p) => p.email.toLowerCase() === email)) {
    return { ok: false, message: 'このメールアドレスは既に登録されています。' };
  }

  const password = generateInitialPassword();
  const created = await createAccount(email, password);
  if ('error' in created) return { ok: false, message: created.error };

  await upsertProfile({
    id: created.id,
    email,
    displayName: input.displayName.trim(),
    role: input.role,
    organizationId: input.role === 'ORG_USER' ? input.organizationId : null,
  });
  await recordAudit({ actorId: session.userId, action: 'CREATE', entity: 'User', entityId: created.id, summary: `${email}（${input.role}）を作成` });
  revalidatePath('/settings/users');
  return { ok: true, password };
}

export async function updateUserAction(id: string, input: Omit<UserInput, 'email'>): Promise<Result> {
  const session = await requireRole('ADMIN');
  const existing = await getProfile(id);
  if (!existing) return { ok: false, message: 'ユーザーが見つかりません。' };
  const invalid = await checkInput({ ...input, email: existing.email });
  if (invalid) return { ok: false, message: invalid };
  if (id === session.userId && input.role !== 'ADMIN') {
    return { ok: false, message: '自分自身の事務局権限は外せません（他の事務局ユーザーに依頼してください）。' };
  }
  await upsertProfile({
    id,
    email: existing.email,
    displayName: input.displayName.trim(),
    role: input.role,
    organizationId: input.role === 'ORG_USER' ? input.organizationId : null,
  });
  await recordAudit({ actorId: session.userId, action: 'UPDATE', entity: 'User', entityId: id, summary: `${existing.email} の権限・所属を更新（${input.role}）` });
  revalidatePath('/settings/users');
  return { ok: true };
}

export async function resetPasswordAction(id: string): Promise<Result> {
  const session = await requireRole('ADMIN');
  if (!accountAdminReady()) return { ok: false, message: 'サーバーに SUPABASE_SERVICE_ROLE_KEY が設定されていません。' };
  const existing = await getProfile(id);
  if (!existing) return { ok: false, message: 'ユーザーが見つかりません。' };
  const password = generateInitialPassword();
  const { error } = await setPassword(id, password);
  if (error) return { ok: false, message: error };
  await recordAudit({ actorId: session.userId, action: 'UPDATE', entity: 'User', entityId: id, summary: `${existing.email} のパスワードを再発行` });
  return { ok: true, password };
}

export async function setSuspendedAction(id: string, suspended: boolean): Promise<Result> {
  const session = await requireRole('ADMIN');
  if (!accountAdminReady()) return { ok: false, message: 'サーバーに SUPABASE_SERVICE_ROLE_KEY が設定されていません。' };
  if (id === session.userId) return { ok: false, message: '自分自身は停止できません。' };
  const existing = await getProfile(id);
  if (!existing) return { ok: false, message: 'ユーザーが見つかりません。' };
  const { error } = await setSuspended(id, suspended);
  if (error) return { ok: false, message: error };
  await recordAudit({ actorId: session.userId, action: 'UPDATE', entity: 'User', entityId: id, summary: `${existing.email} を${suspended ? '停止' : '再開'}` });
  revalidatePath('/settings/users');
  return { ok: true };
}
