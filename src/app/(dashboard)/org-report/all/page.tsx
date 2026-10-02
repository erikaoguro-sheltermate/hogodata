// 事務局：全団体分の還元レポートをまとめて表示・印刷（1 団体 1 ページ区切り）
import Link from 'next/link';
import { listOrganizations, listReports } from '@/lib/data/repo';
import { fiscalYear, previousYearMonth, inFiscalPeriod } from '@/lib/data/analytics';
import { requireRole } from '@/lib/auth/session';
import { cn } from '@/lib/utils';
import { PrintBar } from '../../../report/PrintButton';
import { OrgReportBody, QUARTER_LABEL } from '../OrgReportBody';

const QUARTER_SHORT: Record<number, string> = { 1: '4〜6月', 2: '7〜9月', 3: '10〜12月', 4: '1〜3月' };

export default async function AllOrgReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string; q?: string; empty?: string }>;
}) {
  await requireRole('ADMIN');
  const sp = await searchParams;
  const due = previousYearMonth();
  const fy = Number(sp.fy) || fiscalYear(due.year, due.month);
  const q = [1, 2, 3, 4].includes(Number(sp.q)) ? Number(sp.q) : undefined;

  const [orgs, all] = await Promise.all([listOrganizations(), listReports()]);
  const inPeriod = all.filter((r) => r.status !== 'DRAFT' && inFiscalPeriod(r, fy, q));
  const withData = new Set(inPeriod.map((r) => r.organizationId));
  const targets = orgs.filter((o) => o.isActive && withData.has(o.id));
  const noData = orgs.filter((o) => o.isActive && !withData.has(o.id));

  const href = (y: number, quarter?: number) => `/org-report/all?fy=${y}${quarter ? `&q=${quarter}` : ''}`;
  const seg = (active: boolean) => cn(
    'flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-center text-sm transition-colors',
    active ? 'bg-white font-semibold text-emerald-800 shadow-sm ring-1 ring-emerald-200' : 'text-slate-600 hover:bg-white/70',
  );

  return (
    <div className="mx-auto max-w-4xl">
      <style>{`@media print { .no-print { display: none !important; } @page { margin: 14mm; } body { background: #fff; } }`}</style>
      <div className="no-print">
        <h1 className="text-2xl font-bold text-slate-800">還元レポート（全団体まとめて）</h1>
        <p className="mt-1 text-sm text-slate-500">
          {fy}年度{q ? ` ${QUARTER_LABEL[q]}` : ''} に提出のあった {targets.length} 団体分を、1 団体 1 ページで続けて表示します。
          「PDFで保存」で 1 つの PDF にまとめられます。
        </p>
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-medium text-slate-600">表示する期間</span>
            <div className="flex items-center gap-1">
              <Link href={href(fy - 1, q)} className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-slate-600 hover:border-emerald-300">← 前の年度</Link>
              <span className="min-w-[5.5rem] text-center text-base font-bold text-slate-800">{fy}年度</span>
              <Link href={href(fy + 1, q)} className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-slate-600 hover:border-emerald-300">次の年度 →</Link>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-200/60 p-1">
            <Link href={href(fy)} className={seg(!q)}>1年間（4月〜翌3月）</Link>
            {[1, 2, 3, 4].map((n) => <Link key={n} href={href(fy, n)} className={seg(q === n)}>{QUARTER_SHORT[n]}</Link>)}
          </div>
        </div>
        {noData.length > 0 && (
          <p className="mt-3 text-xs text-slate-500">この期間に提出のない団体（含めていません）：{noData.map((o) => o.name).join('、')}</p>
        )}
        <div className="mt-4"><PrintBar backHref="/submissions" backLabel="提出状況に戻る" /></div>
      </div>

      {targets.length === 0 && (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">この期間に提出済みの報告はまだありません。</p>
      )}
      {targets.map((org, i) => (
        <section
          key={org.id}
          className={cn('mb-8 rounded-2xl bg-white px-8 py-8 text-slate-800 shadow-sm print:mb-0 print:rounded-none print:px-0 print:py-0 print:shadow-none',
            i > 0 && 'print:break-before-page')}
        >
          <OrgReportBody org={org} orgReports={all.filter((r) => r.organizationId === org.id)} nationalReports={all} fy={fy} q={q} />
        </section>
      ))}
    </div>
  );
}
