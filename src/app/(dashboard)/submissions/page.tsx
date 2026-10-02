// 事務局：提出状況（団体 × 月）。未提出の把握・連絡・還元レポートへの入口。
import Link from 'next/link';
import { requireRole } from '@/lib/auth/session';
import { listOrganizations, listReports, getSettings, countAwaitingReview } from '@/lib/data/repo';
import { ReviewQueue } from './ReviewQueue';
import { fiscalYear, fiscalMonths, previousYearMonth, isAfter } from '@/lib/data/analytics';
import { orgMonthStatus, type SlotState } from '@/lib/submissions';
import { deadlineFor, formatDeadline } from '@/lib/deadline';
import { Card, CardBody, StatCard, Badge, buttonClass } from '@/components/ui';
import { SPECIES_LABEL, prefectureByCode } from '@/lib/masters';
import { ymLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import { RemindPanel } from './RemindPanel';
import { ReportStatusBadge } from '@/components/ReportStatusBadge';

const SLOT: Record<SlotState, { label: string; color: 'slate' | 'blue' | 'green' | 'amber' }> = {
  none: { label: '未入力', color: 'amber' },
  DRAFT: { label: '下書き', color: 'slate' },
  SUBMITTED: { label: '提出済み', color: 'blue' },
  CONFIRMED: { label: '確定', color: 'green' },
};

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string; view?: string; only?: string }>;
}) {
  await requireRole('ADMIN');
  const sp = await searchParams;
  const due = previousYearMonth();
  const year = Number(sp.y) || due.year;
  const month = Number(sp.m) >= 1 && Number(sp.m) <= 12 ? Number(sp.m) : due.month;
  const view = sp.view === 'year' ? 'year' : sp.view === 'review' ? 'review' : 'month';
  const onlyMissing = sp.only === 'missing';

  const [allOrgs, settings] = await Promise.all([listOrganizations(), getSettings()]);
  const orgs = allOrgs.filter((o) => o.isActive);
  const fy = fiscalYear(year, month);
  const reviewCount = await countAwaitingReview();
  const reports = await listReports(view === 'month' ? { year, month } : {});

  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const qs = (o: Record<string, string | number | undefined>) =>
    '/submissions?' + new URLSearchParams(Object.entries({ y: year, m: month, view, ...o }).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)])).toString();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">提出状況</h1>
          <p className="mt-1 text-sm text-slate-500">団体ごとの月次報告の提出状況。未提出の団体への連絡や、団体別の還元レポートもここから。</p>
        </div>
        <Link href={`/org-report/all?fy=${fy}`} className={buttonClass('secondary', 'sm')}>📄 還元レポートを全団体まとめて</Link>
        <div className="flex gap-1 rounded-full bg-slate-100 p-1">
          <Link href={qs({ view: 'month' })} className={cn('rounded-full px-4 py-1.5 text-sm', view === 'month' ? 'bg-white font-medium text-slate-800 shadow-sm' : 'text-slate-500')}>月ごと</Link>
          <Link href={qs({ view: 'review' })} className={cn('rounded-full px-4 py-1.5 text-sm', view === 'review' ? 'bg-white font-medium text-slate-800 shadow-sm' : 'text-slate-500')}>
            確認待ち{reviewCount > 0 && <span className="ml-1 rounded-full bg-sky-600 px-1.5 text-[11px] font-bold text-white">{reviewCount}</span>}
          </Link>
          <Link href={qs({ view: 'year' })} className={cn('rounded-full px-4 py-1.5 text-sm', view === 'year' ? 'bg-white font-medium text-slate-800 shadow-sm' : 'text-slate-500')}>年度の一覧</Link>
        </div>
      </div>

      {view === 'review' && <ReviewQueue reports={reports} orgs={allOrgs} />}
      {view === 'month'
        && <MonthView orgs={orgs} reports={reports} year={year} month={month} deadlineDay={settings.deadlineDay} onlyMissing={onlyMissing}
            nav={{ prev: qs({ y: prev.y, m: prev.m, only: sp.only }), next: qs({ y: next.y, m: next.m, only: sp.only }), toggle: qs({ only: onlyMissing ? undefined : 'missing' }) }} />}
      {view === 'year'
        && <YearView orgs={orgs} reports={reports} fy={fy} due={due}
            nav={{ prev: qs({ y: fy - 1, m: 4 }), next: qs({ y: fy + 1, m: 4 }) }} />}
    </div>
  );
}

type Orgs = Awaited<ReturnType<typeof listOrganizations>>;
type Reports = Awaited<ReturnType<typeof listReports>>;

function MonthView({ orgs, reports, year, month, deadlineDay, onlyMissing, nav }: {
  orgs: Orgs; reports: Reports; year: number; month: number; deadlineDay: number; onlyMissing: boolean;
  nav: { prev: string; next: string; toggle: string };
}) {
  const all = orgs.map((org) => ({ org, st: orgMonthStatus(org, reports, year, month) }));
  // 参加前の団体はこの月の対象外
  const rows = all.filter((r) => r.st.state !== 'na');
  const notJoined = all.length - rows.length;
  const done = rows.filter((r) => r.st.state === 'done').length;
  const partial = rows.filter((r) => r.st.state === 'partial').length;
  const none = rows.length - done - partial;
  const dl = deadlineFor(year, month, deadlineDay);
  const shown = onlyMissing ? rows.filter((r) => r.st.state !== 'done') : rows;

  const pending = rows.filter((r) => r.st.state !== 'done');
  const emails = [...new Set(pending.map((r) => r.org.contactEmail?.trim()).filter((e): e is string => !!e))];
  const missing = pending.filter((r) => !r.org.contactEmail?.trim()).map((r) => r.org.name);
  const label = ymLabel(year, month);
  const subject = `【どうぶつ保護データプロジェクト】${label}分の報告のお願い`;
  const body = [
    'いつもご協力ありがとうございます。JASA事務局です。',
    '',
    `${label}分の月次報告について、${formatDeadline(dl.date)}までにご提出をお願いいたします。`,
    'ログイン後、ホームの「入力する」から入力・提出できます。',
    '',
    'すでにご提出済みの場合や、ご不明な点がある場合は、このメールにご返信ください。',
  ].join('\n');

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={nav.prev} className={buttonClass('ghost', 'sm')} aria-label="前の月">←</Link>
          <span className="text-lg font-bold text-slate-800">{label}分</span>
          <Link href={nav.next} className={buttonClass('ghost', 'sm')} aria-label="次の月">→</Link>
          <span className="ml-2 text-sm text-slate-500">
            期限 {formatDeadline(dl.date)}
            {dl.state === 'overdue' ? <Badge color="red">期限切れ</Badge> : dl.daysLeft <= 7 ? <span className="ml-1">（あと {dl.daysLeft} 日）</span> : null}
          </span>
        </div>
        <Link href={nav.toggle} className={buttonClass(onlyMissing ? 'primary' : 'secondary', 'sm')}>
          {onlyMissing ? '✓ 未完了のみ表示中' : '未完了のみ表示'}
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="対象団体" value={rows.length} sub={notJoined > 0 ? `ほかに参加前 ${notJoined} 団体` : undefined} />
        <StatCard label="提出完了" value={done} accent="emerald" sub="報告すべき種別がすべて提出済み" />
        <StatCard label="途中（下書き・片方のみ）" value={partial} accent="sky" />
        <StatCard label="未着手" value={none} accent="amber" />
      </div>

      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="whitespace-nowrap border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">団体</th>
                <th className="px-4 py-3 font-medium">犬</th>
                <th className="px-4 py-3 font-medium">猫</th>
                <th className="px-4 py-3 font-medium">連絡先</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  {rows.length === 0
                    ? <>対象の団体がまだありません。<Link href="/organizations" className="text-emerald-700 hover:underline">団体マスタ</Link>から登録してください。</>
                    : 'すべての団体が提出済みです 🎉'}
                </td></tr>
              )}
              {shown.map(({ org, st }) => (
                <tr key={org.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="min-w-[10rem] px-4 py-3">
                    <Link href={`/organizations/${org.id}`} className="font-medium text-slate-700 hover:text-emerald-700">{org.name}</Link>
                    <div className="text-xs text-slate-400">{prefectureByCode(org.prefectureCode)?.name ?? ''}</div>
                  </td>
                  {(['DOG', 'CAT'] as const).map((s) => {
                    const slot = st.slots[s];
                    if (!slot) return <td key={s} className="px-4 py-3 text-slate-300" title={`${SPECIES_LABEL[s]}は対象外`}>—</td>;
                    const meta = SLOT[slot.state];
                    const href = slot.report ? `/reports/${slot.report.id}` : `/reports/new?org=${org.id}&species=${s}&year=${year}&month=${month}`;
                    return (
                      <td key={s} className="px-4 py-3">
                        <Link href={href} className="hover:opacity-80">
                          {slot.report ? <ReportStatusBadge report={slot.report} /> : <Badge color={meta.color}>{meta.label}</Badge>}
                        </Link>
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {org.contactName && <div>{org.contactName}</div>}
                    {org.contactEmail ? <a href={`mailto:${org.contactEmail}`} className="hover:text-emerald-700">{org.contactEmail}</a> : <span className="text-amber-600">メール未登録</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <Link href={`/org-report/${org.id}`} className="text-sm font-medium text-emerald-700 hover:underline">還元レポート</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {pending.length > 0 && <RemindPanel emails={emails} missing={missing} subject={subject} body={body} />}
    </>
  );
}

function YearView({ orgs, reports, fy, due, nav }: {
  orgs: Orgs; reports: Reports; fy: number; due: { year: number; month: number }; nav: { prev: string; next: string };
}) {
  const months = fiscalMonths(fy);
  const cell = { done: '●', partial: '◐', none: '○', na: '·' } as const;
  const cellCls = { done: 'text-emerald-600', partial: 'text-sky-500', none: 'text-amber-500', na: 'text-slate-200' } as const;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link href={nav.prev} className={buttonClass('ghost', 'sm')} aria-label="前の年度">←</Link>
        <span className="text-lg font-bold text-slate-800">{fy}年度</span>
        <Link href={nav.next} className={buttonClass('ghost', 'sm')} aria-label="次の年度">→</Link>
        <span className="text-xs text-slate-500">
          <span className="text-emerald-600">●</span> 提出完了　<span className="text-sky-500">◐</span> 途中　<span className="text-amber-500">○</span> 未着手　<span className="text-slate-300">·</span> 参加前　マスをクリックするとその月の詳細へ
        </span>
      </div>
      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="whitespace-nowrap border-b border-slate-200 text-xs text-slate-500">
                <th className="px-4 py-3 text-left font-medium">団体</th>
                {months.map((m) => <th key={`${m.year}-${m.month}`} className="px-2 py-3 text-center font-medium">{m.month}月</th>)}
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (
                <tr key={org.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <Link href={`/organizations/${org.id}`} className="font-medium text-slate-700 hover:text-emerald-700">{org.name}</Link>
                  </td>
                  {months.map((m) => {
                    const key = `${m.year}-${m.month}`;
                    if (isAfter(m, due)) return <td key={key} className="px-2 py-2.5 text-center text-slate-200">·</td>;
                    const st = orgMonthStatus(org, reports, m.year, m.month).state;
                    return (
                      <td key={key} className="px-2 py-2.5 text-center">
                        <Link href={`/submissions?y=${m.year}&m=${m.month}`} className={cn('text-base', cellCls[st])} title={`${org.name} ${ymLabel(m.year, m.month)}`}>
                          {cell[st]}
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </>
  );
}
