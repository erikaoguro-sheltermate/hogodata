// 団体ユーザーのホーム：先月分の入力状況と、今年度の提出状況・自団体の数字
import Link from 'next/link';
import { getOrganization, listReports, getSettings, listAnnouncements, readAnnouncementIds } from '@/lib/data/repo';
import { deadlineFor, formatDeadline } from '@/lib/deadline';
import { expectedSpecies, isReturned, isParticipating } from '@/lib/submissions';
import { NoChangeButton } from './NoChangeButton';
import { formatDate } from '@/lib/format';
import {
  summarize, currentManagedCount, fiscalYear, fiscalMonths, inFiscalPeriod, previousYearMonth, isAfter,
} from '@/lib/data/analytics';
import { Card, CardBody, StatCard, Badge, buttonClass, SectionTitle } from '@/components/ui';
import { SPECIES_LABEL, STATUS_LABEL } from '@/lib/masters';
import { ymLabel, formatNumber } from '@/lib/format';
import type { MonthlyReport, ReportStatus, Species } from '@/lib/types';
import type { Session } from '@/lib/auth/session';

const STATUS_COLOR: Record<ReportStatus, 'slate' | 'blue' | 'green'> = { DRAFT: 'slate', SUBMITTED: 'blue', CONFIRMED: 'green' };

function newHref(species: Species, year: number, month: number) {
  return `/reports/new?species=${species}&year=${year}&month=${month}`;
}

/** 先月分の 1 種別ぶんのカード */
function DueCard({ orgId, species, report, prev, year, month }: {
  orgId: string; species: Species; report?: MonthlyReport; prev?: MonthlyReport; year: number; month: number;
}) {
  const done = report && report.status !== 'DRAFT';
  const returned = report && isReturned(report);
  return (
    <div className={done ? 'rounded-lg border border-emerald-200 bg-emerald-50 p-4'
      : returned ? 'rounded-lg border border-red-200 bg-red-50 p-4' : 'rounded-lg border border-amber-200 bg-amber-50 p-4'}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-700">{SPECIES_LABEL[species]}</div>
        {returned ? <Badge color="red">差し戻し</Badge>
          : report ? <Badge color={STATUS_COLOR[report.status]}>{STATUS_LABEL[report.status]}</Badge> : <Badge color="amber">未入力</Badge>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!report && <Link href={newHref(species, year, month)} className={buttonClass('primary', 'sm')}>入力する</Link>}
        {!report && prev && (
          <NoChangeButton orgId={orgId} species={species} year={year} month={month}
            count={prev.endingCount} foster={prev.endingFosterCount} label={`${ymLabel(year, month)}分（${SPECIES_LABEL[species]}）`} />
        )}
        {report?.status === 'DRAFT' && (
          <Link href={`/reports/${report.id}`} className={buttonClass('primary', 'sm')}>{returned ? '直して再提出' : '続きを入力して提出'}</Link>
        )}
        {done && <Link href={`/reports/${report.id}`} className="text-sm font-medium text-emerald-700 hover:underline">内容を見る</Link>}
      </div>
      {!report && prev && (
        <p className="mt-2 text-xs text-slate-500">収容も転帰もなかった月は「動きなしで提出」でOK（頭数は前月のまま {prev.endingCount} 頭）</p>
      )}
    </div>
  );
}

export async function OrgHome({ session }: { session: Session }) {
  const orgId = session.organizationId!;
  const [org, reports, settings, announcements, readIds] = await Promise.all([
    getOrganization(orgId), listReports({ organizationId: orgId }), getSettings(), listAnnouncements(), readAnnouncementIds(session.userId),
  ]);
  const seen = new Set(readIds);
  const latestNews = announcements.slice(0, 3);

  const due = previousYearMonth();
  const fy = fiscalYear(due.year, due.month);
  const species: Species[] = expectedSpecies(org ?? {});
  const dl = deadlineFor(due.year, due.month, settings.deadlineDay);
  const prevOfDue = due.month === 1 ? { year: due.year - 1, month: 12 } : { year: due.year, month: due.month - 1 };
  const returnedReports = reports.filter(isReturned);

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
        <Link href={`/org-report/${orgId}?fy=${fy}`} className={buttonClass('secondary')}>年度のまとめを見る</Link>
      </div>

      {/* 差し戻し（最優先で目立たせる） */}
      {returnedReports.map((r) => (
        <div key={r.id} role="alert" className="mb-4 rounded-lg border-2 border-red-200 bg-red-50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-red-800">
                事務局から差し戻されています：{ymLabel(r.year, r.month)}分（{SPECIES_LABEL[r.species]}）
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-red-900">{r.returnNote}</p>
            </div>
            <Link href={`/reports/${r.id}`} className={buttonClass('primary', 'sm')}>直して再提出</Link>
          </div>
        </div>
      ))}

      {/* 先月分 */}
      <Card className="mb-6">
        <CardBody>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-800">{ymLabel(due.year, due.month)}分の報告</h2>
            {allDone ? (
              <span className="text-sm text-emerald-700">ご提出ありがとうございました</span>
            ) : (
              <span className={dl.state === 'overdue' ? 'rounded-md bg-red-50 px-3 py-1 text-sm font-medium text-red-700'
                : dl.state === 'soon' ? 'rounded-md bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800' : 'text-sm text-slate-500'}>
                提出期限 {formatDeadline(dl.date)}
                {dl.state === 'overdue' ? '（過ぎています）' : dl.daysLeft === 0 ? '（今日まで）' : `（あと ${dl.daysLeft} 日）`}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {species.map((s) => (
              <DueCard key={s} orgId={orgId} species={s} report={find(s, due.year, due.month)}
                prev={find(s, prevOfDue.year, prevOfDue.month)} year={due.year} month={due.month} />
            ))}
          </div>
        </CardBody>
      </Card>

      {latestNews.length > 0 && (
        <Card className="mb-6">
          <CardBody>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">お知らせ</h2>
              <Link href="/announcements" className="text-sm font-medium text-emerald-700 hover:underline">すべて見る</Link>
            </div>
            <ul className="divide-y divide-slate-100">
              {latestNews.map((a) => (
                <li key={a.id} className="py-2">
                  <Link href="/announcements" className="flex flex-wrap items-center gap-2 text-sm hover:text-emerald-700">
                    <span className="text-xs text-slate-400">{formatDate(a.publishedAt)}</span>
                    {a.pinned && <Badge color="amber">重要</Badge>}
                    {!seen.has(a.id) && <Badge color="red">NEW</Badge>}
                    <span className="font-medium text-slate-700">{a.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

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
                  <th className="whitespace-nowrap px-3 py-3 font-medium md:px-4">対象月</th>
                  {species.map((s) => <th key={s} className="whitespace-nowrap px-3 py-3 font-medium md:px-4">{SPECIES_LABEL[s]}</th>)}
                </tr>
              </thead>
              <tbody>
                {fiscalMonths(fy).map((fm) => {
                  const future = isAfter(fm, due) || !isParticipating(org ?? {}, fm.year, fm.month);
                  return (
                    <tr key={`${fm.year}-${fm.month}`} className="border-b border-slate-100 last:border-0">
                      <td className={future ? 'whitespace-nowrap px-3 py-2.5 text-slate-300 md:px-4' : 'whitespace-nowrap px-3 py-2.5 font-medium text-slate-700 md:px-4'}>{ymLabel(fm.year, fm.month)}</td>
                      {species.map((s) => {
                        const r = find(s, fm.year, fm.month);
                        return (
                          <td key={s} className="whitespace-nowrap px-3 py-2.5 md:px-4">
                            {r ? (
                              <Link href={`/reports/${r.id}`} className="inline-block hover:opacity-80">
                                {isReturned(r) ? <Badge color="red">差し戻し</Badge> : <Badge color={STATUS_COLOR[r.status]}>{STATUS_LABEL[r.status]}</Badge>}
                              </Link>
                            ) : future ? (
                              <span className="text-slate-300">—</span>
                            ) : (
                              <Link href={newHref(s, fm.year, fm.month)} className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-100">
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
