'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { Role } from '@/lib/types';
import { logout } from '@/app/login/actions';

interface NavItem { href: string; label: string; icon: string; roles: Role[] }

const NAV: NavItem[] = [
  { href: '/', label: 'ダッシュボード', icon: '🏠', roles: ['ADMIN'] },
  { href: '/', label: 'ホーム', icon: '🏠', roles: ['ORG_USER'] },
  { href: '/reports', label: '月次レポート', icon: '📝', roles: ['ADMIN', 'ORG_USER'] },
  { href: '/org-report', label: '自団体のレポート', icon: '📄', roles: ['ORG_USER'] },
  { href: '/analytics', label: '全国の集計', icon: '📊', roles: ['ADMIN', 'ORG_USER', 'VIEWER'] },
  { href: '/organizations', label: '団体マスタ', icon: '🏢', roles: ['ADMIN'] },
  { href: '/masters', label: 'マスタ管理', icon: '⚙️', roles: ['ADMIN'] },
  { href: '/settings', label: 'ユーザー', icon: '👥', roles: ['ADMIN'] },
  { href: '/account', label: 'アカウント', icon: '🔑', roles: ['ADMIN', 'ORG_USER', 'VIEWER'] },
];

const ROLE_LABEL: Record<Role, string> = { ADMIN: '事務局', ORG_USER: '団体', VIEWER: '閲覧者' };

export function Sidebar({ role, displayName, mode, organizationId }: {
  role: Role; displayName: string; mode: 'supabase' | 'gate' | 'demo'; organizationId: string | null;
}) {
  const pathname = usePathname();
  const items = NAV.filter((i) => i.roles.includes(role) && (i.href !== '/org-report' || organizationId));

  function switchRole(next: Role) {
    document.cookie = `jasa_role=${next}; path=/; max-age=31536000`;
    window.location.assign('/');
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white print:hidden">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-lg">🐾</div>
        <div className="text-[15px] font-bold leading-snug text-slate-800">
          どうぶつ保護<br />データプロジェクト
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.label}
              href={
                item.href === '/settings' ? '/settings/users'
                  : item.href === '/org-report' ? `/org-report/${organizationId}`
                  : item.href
              }
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                active ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3">
        {mode !== 'supabase' && (
          <>
            <div className="px-2 pb-2 text-[11px] text-slate-400">表示ロール（デモ切替）</div>
            <div className="flex gap-1">
              {(['ADMIN', 'ORG_USER', 'VIEWER'] as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => switchRole(r)}
                  className={cn(
                    'flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
                    r === role ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  )}
                >
                  {ROLE_LABEL[r]}
                </button>
              ))}
            </div>
          </>
        )}
        <div className="mt-2 px-2 text-xs text-slate-500">
          {displayName}
          {mode === 'supabase' && <span className="ml-1 text-slate-400">（{ROLE_LABEL[role]}）</span>}
        </div>
        {mode !== 'demo' && (
          <form action={logout} className="mt-2">
            <button type="submit" className="w-full rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100">
              ログアウト
            </button>
          </form>
        )}
      </div>
    </aside>
  );
}
