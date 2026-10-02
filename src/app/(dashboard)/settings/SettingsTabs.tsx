import Link from 'next/link';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/settings/users', label: 'ユーザー・権限' },
  { href: '/settings/portal', label: '提出期限・問い合わせ先' },
  { href: '/settings/audit', label: '変更履歴' },
];

export function SettingsTabs({ current }: { current: string }) {
  return (
    <nav className="mb-6 flex flex-wrap gap-2" aria-label="設定">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={current === t.href ? 'page' : undefined}
          className={cn(
            'rounded-md px-4 py-1.5 text-sm',
            current === t.href ? 'bg-slate-800 font-medium text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
