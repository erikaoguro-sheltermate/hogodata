// 団体ユーザーの「レポート」内の切り替え：毎月の報告 / 年度・四半期のまとめ
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function ReportTabs({ current, orgId }: { current: 'monthly' | 'summary'; orgId: string }) {
  const tabs = [
    { key: 'monthly', href: '/reports', label: '📝 毎月の報告', desc: '入力・提出・修正' },
    { key: 'summary', href: `/org-report/${orgId}`, label: '📄 年度・四半期のまとめ', desc: 'グラフ付き・PDF保存' },
  ] as const;
  return (
    <nav className="no-print mb-6 grid grid-cols-2 gap-2 sm:max-w-xl" aria-label="レポートの種類">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={current === t.key ? 'page' : undefined}
          className={cn(
            'rounded-xl border px-4 py-3 transition-colors',
            current === t.key ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-300',
          )}
        >
          <div className={cn('text-sm font-semibold', current === t.key ? 'text-emerald-800' : 'text-slate-700')}>{t.label}</div>
          <div className="text-xs text-slate-500">{t.desc}</div>
        </Link>
      ))}
    </nav>
  );
}
