'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { Role } from '@/lib/types';
import { ROLE_LABEL } from '@/lib/masters';
import { logout } from '@/app/login/actions';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  roles: Role[];
  /** このパスで始まる画面でも選択中にする */
  match?: string[];
  badge?: 'unread' | 'review';
}

const NAV: NavItem[] = [
  { href: '/', label: 'ダッシュボード', icon: '🏠', roles: ['ADMIN'] },
  { href: '/', label: 'ホーム', icon: '🏠', roles: ['ORG_USER'] },
  { href: '/submissions', label: '提出状況', icon: '📋', roles: ['ADMIN'], badge: 'review', match: ['/org-report/all'] },
  { href: '/reports', label: '月次レポート', icon: '📝', roles: ['ADMIN'] },
  { href: '/reports', label: 'レポート', icon: '📝', roles: ['ORG_USER'], match: ['/org-report'] },
  { href: '/analytics', label: '全国の集計', icon: '📊', roles: ['ADMIN', 'ORG_USER', 'VIEWER'], match: ['/report'] },
  { href: '/announcements', label: 'お知らせ', icon: '📣', roles: ['ADMIN', 'ORG_USER', 'VIEWER'], badge: 'unread' },
  { href: '/organizations', label: '団体マスタ', icon: '🏢', roles: ['ADMIN'], match: ['/org-report'] },
  { href: '/masters', label: 'マスタ管理', icon: '⚙️', roles: ['ADMIN'] },
  { href: '/settings/users', label: '設定', icon: '👥', roles: ['ADMIN'], match: ['/settings'] },
  { href: '/help', label: 'ヘルプ', icon: '❓', roles: ['ADMIN', 'ORG_USER', 'VIEWER'] },
  { href: '/account', label: 'アカウント', icon: '🔑', roles: ['ADMIN', 'ORG_USER', 'VIEWER'] },
];

// デモ切替ボタン用の短い呼び名。表示名の横には masters の正式名を使う
const ROLE_SHORT: Record<Role, string> = { ADMIN: '事務局', ORG_USER: '団体', VIEWER: '閲覧者' };

function isActive(item: NavItem, pathname: string): boolean {
  if (item.href === '/') return pathname === '/';
  const starts = (p: string) => pathname === p || pathname.startsWith(`${p}/`);
  return starts(item.href) || (item.match ?? []).some(starts);
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-lg">🐾</div>
      <div className="text-[15px] font-bold leading-snug text-slate-800">
        どうぶつ保護<br />データプロジェクト
      </div>
    </div>
  );
}

export function Sidebar({ role, displayName, mode, unreadCount, reviewCount = 0 }: {
  role: Role; displayName: string; mode: 'supabase' | 'gate' | 'demo'; unreadCount: number; reviewCount?: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const items = NAV.filter((i) => i.roles.includes(role));
  // 事務局の団体別レポートは「団体マスタ」側を選択中にする
  const activeItems = items.filter((i) => isActive(i, pathname));
  const active = activeItems.find((i) => i.href !== '/organizations') ?? activeItems[0];

  function switchRole(next: Role) {
    document.cookie = `jasa_role=${next}; path=/; max-age=31536000`;
    window.location.assign('/');
  }

  const nav = (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="メニュー">
      {items.map((item) => {
        const on = item === active;
        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={on ? 'page' : undefined}
            onClick={() => setOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
              on ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            <span className="text-base">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {item.badge === 'review' && reviewCount > 0 && (
              <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[11px] font-bold text-white" aria-label={`確認待ち ${reviewCount} 件`}>
                {reviewCount}
              </span>
            )}
            {item.badge === 'unread' && unreadCount > 0 && (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white" aria-label={`未読 ${unreadCount} 件`}>
                {unreadCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-slate-200 p-3">
      {mode === 'demo' && (
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
                {ROLE_SHORT[r]}
              </button>
            ))}
          </div>
        </>
      )}
      <div className="mt-2 px-2 text-xs text-slate-500">
        {displayName}
        {mode !== 'demo' && <span className="ml-1 text-slate-400">（{ROLE_LABEL[role]}）</span>}
      </div>
      {mode !== 'demo' && (
        <form action={logout} className="mt-2">
          <button type="submit" className="w-full rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100">
            ログアウト
          </button>
        </form>
      )}
    </div>
  );

  return (
    <>
      {/* スマホ：上部バー＋開閉メニュー */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden print:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          className="relative rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          {open ? '閉じる' : '☰ メニュー'}
          {!open && (unreadCount > 0 || reviewCount > 0) && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />}
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden print:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/30" />
          <aside
            id="mobile-menu"
            className="absolute bottom-0 right-0 top-14 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {nav}
            {footer}
          </aside>
        </div>
      )}

      {/* PC：左サイドバー */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex print:hidden">
        <div className="px-5 py-5"><Brand /></div>
        {nav}
        {footer}
      </aside>
    </>
  );
}
