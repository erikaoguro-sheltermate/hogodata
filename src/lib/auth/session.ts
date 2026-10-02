// JASA Data Hub — セッション
// Supabase が設定されていれば実認証（Supabase Auth + Profile）を使い、
// 未設定のデモ環境では Cookie でロールを切り替える（ログイン不要で動作）。

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Role } from '../types';
import { isSupabaseConfigured, createSupabaseServerClient } from '../supabase/server';
import { getProfile } from '../data/repo';

export interface Session {
  userId: string;
  email: string | null;
  displayName: string;
  role: Role;
  organizationId: string | null;
  /** ログイン済みだが Profile 未登録・停止中など、アプリを使えない状態なら false */
  hasAccess: boolean;
  /** 事務局が発行した初期パスワードのまま（変更をうながす） */
  mustChangePassword?: boolean;
}

/** 認証方式：supabase=メール+パスワード / gate=共有パスワード / demo=ロール切替 */
export type AuthMode = 'supabase' | 'gate' | 'demo';

export function authMode(): AuthMode {
  if (isSupabaseConfigured()) return 'supabase';
  if (process.env.APP_PASSWORD) return 'gate';
  return 'demo';
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
  const raw = store.get(ROLE_COOKIE)?.value as Role | undefined;
  const role: Role = raw && raw in DEMO_USERS ? raw : 'ADMIN';
  const base = DEMO_USERS[role];
  const orgOverride = store.get(ORG_COOKIE)?.value || null;
  return {
    userId: base.userId,
    email: null,
    displayName: base.displayName,
    role,
    organizationId: role === 'ORG_USER' ? (orgOverride ?? base.organizationId) : null,
    hasAccess: true,
  };
}

const NO_ACCESS = { role: 'VIEWER' as Role, organizationId: null, hasAccess: false };

/** 共有パスワードで入った人の固定セッション（事務局）。監査ログもこの id で残す。 */
export const GATE_ADMIN_ID = 'gate-admin';

export async function getSession(): Promise<Session> {
  const mode = authMode();
  if (mode === 'demo') return getDemoSession();
  if (mode === 'gate') {
    // 共有パスワード運用中はロール切替なし・全員が事務局。cookie のロールは読まない。
    // ただし cookies() に触れてリクエスト単位の描画にする（静的化してビルド時にDBへ行かないように）
    await cookies();
    return { userId: GATE_ADMIN_ID, email: null, displayName: '事務局（共有パスワード）', role: 'ADMIN', organizationId: null, hasAccess: true };
  }

  // 本番：Supabase Auth + Profile（ロール・所属団体）
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // middleware が未ログインを /login にリダイレクトするため通常ここには来ない
    return { userId: 'anonymous', email: null, displayName: 'ゲスト', ...NO_ACCESS };
  }
  const profile = await getProfile(user.id);
  const banned = !!user.banned_until && new Date(user.banned_until) > new Date();
  if (!profile || banned) {
    return { userId: user.id, email: user.email ?? null, displayName: user.email ?? 'ユーザー', ...NO_ACCESS };
  }
  const orgUserWithoutOrg = profile.role === 'ORG_USER' && !profile.organizationId;
  return {
    userId: user.id,
    email: user.email ?? profile.email,
    displayName: profile.displayName,
    role: profile.role,
    organizationId: profile.organizationId,
    hasAccess: !orgUserWithoutOrg,
    mustChangePassword: user.user_metadata?.must_change_password === true,
  };
}

/** ログイン済みかつ利用可能なセッションを返す。使えない状態ならログイン画面へ。 */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session.hasAccess) redirect('/login?error=noaccess');
  return session;
}

/** 指定ロールのみ通す。それ以外はホームへ。 */
export async function requireRole(...roles: Role[]): Promise<Session> {
  const session = await requireSession();
  if (!roles.includes(session.role)) redirect('/');
  return session;
}

export function isAdmin(session: Session): boolean {
  return session.role === 'ADMIN';
}
export function canEditReports(session: Session): boolean {
  return session.role === 'ADMIN' || session.role === 'ORG_USER';
}

export const ROLE_COOKIE_NAME = ROLE_COOKIE;
export const ORG_COOKIE_NAME = ORG_COOKIE;
