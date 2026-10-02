import Link from 'next/link';
import { ReportStatusBadge } from '@/components/ReportStatusBadge';
import { listOrganizations, listReports, getSettings, countAwaitingReview } from '@/lib/data/repo';
import { previousYearMonth } from '@/lib/data/analytics';
import { orgMonthStatus } from '@/lib/submissions';
import { deadlineFor, formatDeadline } from '@/lib/deadline';
import { summarize } from '@/lib/data/analytics';
import { Card, CardBody, StatCard, buttonClass, SectionTitle } from '@/components/ui';
import { SPECIES_LABEL, prefectureByCode } from '@/lib/masters';
import { ymLabel, formatNumber } from '@/lib/format';
import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth/session';
import { OrgHome } from './OrgHome';

export default async function DashboardPage() {
  const session = await requireSession();
  if (session.role === 'ORG_USER') return <OrgHome session={session} />;
  if (session.role === 'VIEWER') redirect('/analytics');

  // 対象は「先月分」（団体が今月提出する月）
  const latest = previousYearMonth();
  const [orgs, monthReports, settings, reviewCount] = await Promise.all([
    listOrganizations(), listReports({ year: latest.year, month: latest.month }), getSettings(), countAwaitingReview(),
  ]);
  const submitted = monthReports.filter((r) => r.status !== 'DRAFT');
  const summary = summarize(submitted);
  const dl = deadlineFor(latest.year, latest.month, settings.deadlineDay);

  const unsubmitted = orgs.filter((o) => o.isActive && !['done', 'na'].includes(orgMonthStatus(o, monthReports, latest.year, latest.month).state));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ダッシュボード</h1>
          <p className="mt-1 text-sm text-slate-500">
            {ymLabel(latest.year, latest.month)}分の入力状況 ・ 提出期限 {formatDeadline(dl.date)}
            {dl.state === 'overdue' ? '（過ぎています）' : `（あと ${dl.daysLeft} 日）`}
          </p>
        </div>
        <Link href="/reports/new" className={buttonClass('primary')}>＋ 月次レポートを入力</Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="登録団体数" value={formatNumber(orgs.filter((o) => o.isActive).length)} sub="アクティブな団体" />
        <Link href="/submissions?view=review" className="block rounded-2xl transition-shadow hover:shadow-md">
          <StatCard label="確認待ち（全期間）" value={formatNumber(reviewCount)} accent="sky" sub="提出済み・未確定 → 確認する" />
        </Link>
        <StatCard label="未完了の団体" value={formatNumber(unsubmitted.length)} accent="amber" sub="下書き・片方のみ・未着手" />
        <StatCard label="新規収容（提出分の合計）" value={formatNumber(summary.intakeTotal)} accent="sky" sub={`転帰 ${formatNumber(summary.outcomeTotal)} 頭`} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionTitle subtitle="この月のレポート（提出済み・下書き）">届いたレポート</SectionTitle>
          <Card>
            <CardBody className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                    <th className="px-4 py-3 font-medium">団体</th>
                    <th className="px-4 py-3 font-medium">都道府県</th>
                    <th className="px-4 py-3 font-medium">種別</th>
                    <th className="px-4 py-3 font-medium">状態</th>
                  </tr>
                </thead>
                <tbody>
                  {monthReports.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">この月のレポートはまだありません</td></tr>
                  )}
                  {monthReports.map((r) => {
                    const org = orgs.find((o) => o.id === r.organizationId);
                    return (
                      <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <Link href={`/reports/${r.id}`} className="font-medium text-slate-700 hover:text-emerald-700">{org?.name ?? '—'}</Link>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{prefectureByCode(org?.prefectureCode ?? '')?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{SPECIES_LABEL[r.species]}</td>
                        <td className="px-4 py-3">
                          <ReportStatusBadge report={r} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </div>

        <div>
          <SectionTitle subtitle="まだ提出が終わっていない団体">要フォロー</SectionTitle>
          <Card>
            <CardBody>
              {unsubmitted.length === 0 ? (
                <p className="text-sm text-slate-400">
                  {orgs.filter((o) => o.isActive).length === 0 ? '団体がまだ登録されていません。' : '未提出の団体はありません 🎉'}
                </p>
              ) : (
                <ul className="space-y-2">
                  {unsubmitted.map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2">
                      <span className="text-sm text-slate-700">{o.name}</span>
                      <Link href={`/reports/new?org=${o.id}&year=${latest.year}&month=${latest.month}`} className="text-xs font-medium text-amber-700 hover:underline">代行入力</Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <div className="mt-4 grid gap-2">
            <Link href={`/submissions?y=${latest.year}&m=${latest.month}`} className={buttonClass('primary')}>📋 提出状況を見る・連絡する</Link>
            <Link href="/analytics" className={buttonClass('secondary')}>📊 集計ダッシュボードを見る</Link>
            <Link href="/organizations" className={buttonClass('secondary')}>🏢 団体を管理する</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
