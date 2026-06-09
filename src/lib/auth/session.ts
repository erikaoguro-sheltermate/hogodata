// JASA Data Hub — セッション（デモ用）
// 本番は Supabase Auth + Profile に置き換える（仕様書 §1・§7）。
// デモではログイン無しで動かせるよう、Cookie でロールを切り替える簡易実装。

import { cookies } from 'next/headers';
import type { Role } from '../types';

export interface Session {
  userId: string;
  displayName: string;
  role: Role;
  organizationId: string | null;
}

const ROLE_COOKIE = 'jasa_role';
const ORG_COOKIE = 'jasa_org';

const DEMO_USERS: Record<Role, { userId: string; displayName: string; organizationId: string | null }> = {
  ADMIN: { userId: 'demo-admin', displayName: 'JASA事務局（デモ）', organizationId: null },
  ORG_USER: { userId: 'demo-org', displayName: '団体ユーザー（デモ）', organizationId: 'org_1' },
  VIEWER: { userId: 'demo-viewer', displayName: '閲覧者（デモ）', organizationId: null },
};

export async function getSession(): Promise<Session> {
  const store = await cookies();
  const role = (store.get(ROLE_COOKIE)?.value as Role) || 'ADMIN';
  const base = DEMO_USERS[role] ?? DEMO_USERS.ADMIN;
  const orgOverride = store.get(ORG_COOKIE)?.value || null;
  return {
    userId: base.userId,
    displayName: base.displayName,
    role: role in DEMO_USERS ? role : 'ADMIN',
    organizationId: role === 'ORG_USER' ? (orgOverride ?? base.organizationId) : null,
  };
}

export function isAdmin(session: Session): boolean {
  return session.role === 'ADMIN';
}
export function canEditReports(session: Session): boolean {
  return session.role === 'ADMIN' || session.role === 'ORG_USER';
}

export const ROLE_COOKIE_NAME = ROLE_COOKIE;
export const ORG_COOKIE_NAME = ORG_COOKIE;
