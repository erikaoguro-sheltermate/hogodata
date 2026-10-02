// 団体ユーザーのホーム：先月分の入力状況と、今年度の提出状況・自団体の数字
import Link from 'next/link';
import { getOrganization, listReports } from '@/lib/data/repo';
import {
  summarize, currentManagedCount, fiscalYear, fiscalMonths, inFiscalPeriod, previousYearMonth, isAfter,
} from '@/lib/data/analytics';
import { Card, CardBody, StatCard, Badge, buttonClass, SectionTitle } from '@/components/ui';
import { SPECIES_LABEL, STATUS_LABEL } from '@/lib/masters';
import { ymLabel, formatNumber } from '@/lib/format';
import type { MonthlyReport, ReportStatus, Species } from '@/lib/types';
import type { Session } from '@/lib/auth/session';

const STATUS_COLOR: Record<ReportStatus, 'slate' | 'blue' | 'green'> = { DRAFT: 'slate', SUBMITTED: 'blue', CONFIRMED: 'green' };
const SPECIES_ICON: Record<Species, string> = { DOG: '🐕', CAT: '🐈' };

function newHref(species: Species, year: number, month: number) {
  return `/reports/new?species=${species}&year=${year}&month=${month}`;
}

/** 先月分の 1 種別ぶんのカード */
function DueCard({ species, report, year, month }: { species: Species; report?: MonthlyReport; year: number; month: number }) {
  const done = report && report.status !== 'DRAFT';
  return (
    <div className={done ? 'rounded-xl border border-emerald-200 bg-emerald-50 p-4' : 'rounded-xl border border-amber-200 bg-amber-50 p-4'}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-700">{SPECIES_ICON[species]} {SPECIES_LABEL[species]}</div>
        {report ? <Badge color={STATUS_COLOR[report.status]}>{STATUS_LABEL[report.status]}</Badge> : <Badge color="amber">未入力</Badge>}
      </div>
      <div className="mt-3">
        {!report && <Link href={newHref(species, year, month)} className={buttonClass('primary', 'sm')}>入力する</Link>}
        {report?.status === 'DRAFT' && <Link href={`/reports/${report.id}`} className={buttonClass('primary', 'sm')}>続きを入力して提出</Link>}
        {done && <Link href={`/reports/${report.id}`} className="text-sm font-medium text-emerald-700 hover:underline">内容を見る</Link>}
      </div>
    </div>
  );
}

export async function OrgHome({ session }: { session: Session }) {
  const orgId = session.organizationId!;
  const [org, reports] = await Promise.all([getOrganization(orgId), listReports({ organizationId: orgId })]);

  const due = previousYearMonth();
  const fy = fiscalYear(due.year, due.month);
  const kinds = (org?.animalTypes ?? []).filter((k): k is Species => k === 'DOG' || k === 'CAT');
  const species: Species[] = kinds.length > 0 ? kinds : ['DOG', 'CAT'];

  const find = (s: Species, y: number, m: number) => reports.find((r) => r.species === s && r.year === y && r.month === m);
  const fyReports = reports.filter((r) => inFiscalPeriod(r, fy));
  const fySummary = summarize(fyReports);
  const managed = currentManagedCount(reports);
  const allDone = species.every((s) => { const r = find(s, due.year, due.month); return r && r.status !== 'DRAFT'; });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{org?.name ?? '所属団体'}</h1>
          <p className="mt-1 text-sm text-slate-500">{session.displayName} さん、いつもご協力ありがとうございます。</p>
        </div>
        <Link href={`/org-report/${orgId}?fy=${fy}`} className={buttonClass('secondary')}>📄 自団体のレポートを見る</Link>
      </div>

      {/* 先月分 */}
      <Card className="mb-6">
        <CardBody>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-800">{ymLabel(due.year, due.month)}分の報告</h2>
            <span className="text-sm text-slate-500">
              {allDone ? '提出ありがとうございました 🎉' : '月末時点の数字を入力して「提出」してください'}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {species.map((s) => <DueCard key={s} species={s} report={find(s, due.year, due.month)} year={due.year} month={due.month} />)}
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="現在の管理頭数" value={formatNumber(managed.total)} accent="emerald" sub={`うち一時預かり ${formatNumber(managed.foster)}`} />
        <StatCard label={`${fy}年度 新規収容`} value={formatNumber(fySummary.intakeTotal)} accent="sky" />
        <StatCard label={`${fy}年度 転帰`} value={formatNumber(fySummary.outcomeTotal)} sub={`生存 ${formatNumber(fySummary.liveOutcomeTotal)} / 非生存 ${formatNumber(fySummary.nonLiveOutcomeTotal)}`} />
        <StatCard label="生存転帰率" value={fySummary.liveReleaseRate === null ? '—' : `${fySummary.liveReleaseRate}%`} accent="emerald" sub="生存転帰 / 全転帰" />
      </div>

      {/* 今年度の提出状況 */}
      <div className="mt-8">
        <SectionTitle subtitle="過去の月も、ここから入力・修正できます（事務局が確定した月は閲覧のみ）">
          {fy}年度の提出状況
        </SectionTitle>
        <Card>
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">対象月</th>
                  {species.map((s) => <th key={s} className="px-4 py-3 font-medium">{SPECIES_ICON[s]} {SPECIES_LABEL[s]}</th>)}
                </tr>
              </thead>
              <tbody>
                {fiscalMonths(fy).map((fm) => {
                  const future = isAfter(fm, due);
                  return (
                    <tr key={`${fm.year}-${fm.month}`} className="border-b border-slate-100 last:border-0">
                      <td className={future ? 'px-4 py-2.5 text-slate-300' : 'px-4 py-2.5 font-medium text-slate-700'}>{ymLabel(fm.year, fm.month)}</td>
                      {species.map((s) => {
                        const r = find(s, fm.year, fm.month);
                        return (
                          <td key={s} className="px-4 py-2.5">
                            {r ? (
                              <Link href={`/reports/${r.id}`} className="inline-block hover:opacity-80">
                                <Badge color={STATUS_COLOR[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                              </Link>
                            ) : future ? (
                              <span className="text-slate-300">—</span>
                            ) : (
                              <Link href={newHref(s, fm.year, fm.month)} className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-100">
                                未入力 <span className="text-amber-400">＋</span>
                              </Link>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
