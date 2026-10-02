// F-10 団体向けデータ還元レポート（年度 / 四半期）。本体は OrgReportBody。
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrganization, listReports } from '@/lib/data/repo';
import { fiscalYear, previousYearMonth } from '@/lib/data/analytics';
import { requireSession } from '@/lib/auth/session';
import { canViewOrgSummary } from '@/lib/auth/policy';
import { cn } from '@/lib/utils';
import { PrintBar } from '../../../report/PrintButton';
import { ReportTabs } from '../../reports/ReportTabs';
import { OrgReportBody } from '../OrgReportBody';

const QUARTER_SHORT: Record<number, string> = { 1: '4〜6月', 2: '7〜9月', 3: '10〜12月', 4: '1〜3月' };

export default async function OrgReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ fy?: string; q?: string }>;
}) {
  const [{ orgId }, sp, session] = await Promise.all([params, searchParams, requireSession()]);
  if (!canViewOrgSummary(session, orgId)) notFound();
  const org = await getOrganization(orgId);
  if (!org) notFound();

  const due = previousYearMonth();
  const fy = Number(sp.fy) || fiscalYear(due.year, due.month);
  const q = [1, 2, 3, 4].includes(Number(sp.q)) ? Number(sp.q) : undefined;

  const [orgAll, nationalAll] = await Promise.all([
    listReports({ organizationId: orgId }),
    listReports(),
  ]);
  const href = (y: number, quarter?: number) => `/org-report/${orgId}?fy=${y}${quarter ? `&q=${quarter}` : ''}`;
  const seg = (active: boolean) => cn(
    'whitespace-nowrap rounded-lg px-2 py-2 text-center text-sm transition-colors sm:flex-1 sm:px-3',
    active ? 'bg-white font-semibold text-emerald-800 shadow-sm ring-1 ring-emerald-200' : 'text-slate-600 hover:bg-white/70',
  );

  return (
    <>
    {session.role === 'ORG_USER' && (
      <div className="no-print">
        <h1 className="mb-4 text-2xl font-bold text-slate-800">レポート</h1>
        <ReportTabs current="summary" orgId={orgId} />
      </div>
    )}
    <div className="mx-auto max-w-4xl rounded-2xl bg-white px-4 py-6 text-slate-800 shadow-sm md:px-8 md:py-8 print:rounded-none print:px-0 print:py-0 print:shadow-none">
      <style>{`@media print { .no-print { display: none !important; } @page { margin: 14mm; } body { background: #fff; } }`}</style>

      <PrintBar
        backHref={session.role === 'ADMIN' ? `/organizations/${orgId}` : null}
        backLabel="団体詳細に戻る"
      />

      {/* 期間切替（印刷されない） */}
      <div className="no-print mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-medium text-slate-600">表示する期間</span>
          <div className="flex items-center gap-1" role="group" aria-label="年度">
            <Link href={href(fy - 1, q)} aria-label={`${fy - 1}年度へ`} className="whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1 text-slate-600 hover:border-emerald-300 hover:text-emerald-700">← 前</Link>
            <span className="min-w-[5.5rem] whitespace-nowrap text-center text-base font-bold text-slate-800">{fy}年度</span>
            <Link href={href(fy + 1, q)} aria-label={`${fy + 1}年度へ`} className="whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1 text-slate-600 hover:border-emerald-300 hover:text-emerald-700">次 →</Link>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-200/60 p-1 sm:flex" role="group" aria-label="範囲">
          <Link href={href(fy)} aria-current={!q ? 'true' : undefined} className={cn(seg(!q), 'col-span-4 sm:col-span-1')}>1年間（4月〜翌3月）</Link>
          {[1, 2, 3, 4].map((n) => (
            <Link key={n} href={href(fy, n)} aria-current={q === n ? 'true' : undefined} className={seg(q === n)}>{QUARTER_SHORT[n]}</Link>
          ))}
        </div>
      </div>

      <OrgReportBody org={org} orgReports={orgAll} nationalReports={nationalAll} fy={fy} q={q} />
    </div>
    </>
  );
}
