// JASA Data Hub — セッション
// Supabase が設定されていれば実認証（Supabase Auth + Profile）を使い、
// 未設定のデモ環境では Cookie でロールを切り替える（ログイン不要で動作）。

import { cookies } from 'next/headers';
import type { Role } from '../types';
import { isSupabaseConfigured, createSupabaseServerClient } from '../supabase/server';
import { isDatabaseConfigured, prisma } from '../db';

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

async function getDemoSession(): Promise<Session> {
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

export async function getSession(): Promise<Session> {
  // 本番：Supabase Auth + Profile（ロール・所属団体）
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const profile = isDatabaseConfigured()
        ? await prisma.profile.findUnique({ where: { id: user.id } })
        : null;
      return {
        userId: user.id,
        displayName: profile?.displayName ?? user.email ?? 'ユーザー',
        role: (profile?.role as Role) ?? 'VIEWER',
        organizationId: profile?.organizationId ?? null,
      };
    }
    // middleware が未ログインを /login にリダイレクトするため通常ここには来ない
    return { userId: 'anonymous', displayName: 'ゲスト', role: 'VIEWER', organizationId: null };
  }
  // デモ：Cookie ロール切替
  return getDemoSession();
}

export function isAdmin(session: Session): boolean {
  return session.role === 'ADMIN';
}
export function canEditReports(session: Session): boolean {
  return session.role === 'ADMIN' || session.role === 'ORG_USER';
}

export const ROLE_COOKIE_NAME = ROLE_COOKIE;
export const ORG_COOKIE_NAME = ORG_COOKIE;
