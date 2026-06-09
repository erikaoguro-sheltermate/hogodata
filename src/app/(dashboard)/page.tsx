import Link from 'next/link';
import { listOrganizations, listReports } from '@/lib/data/repo';
import { summarize } from '@/lib/data/analytics';
import { Card, CardBody, StatCard, Badge, buttonClass, SectionTitle } from '@/components/ui';
import { SPECIES_LABEL, prefectureByCode } from '@/lib/masters';
import { ymLabel, formatNumber } from '@/lib/format';

export default async function DashboardPage() {
  const [orgs, allReports] = await Promise.all([listOrganizations(), listReports()]);

  // 最新の対象期間（デモのシードは 2026-05 が最新）
  const latest = allReports.reduce<{ year: number; month: number } | null>((acc, r) => {
    if (!acc || r.year > acc.year || (r.year === acc.year && r.month > acc.month)) return { year: r.year, month: r.month };
    return acc;
  }, null) ?? { year: 2026, month: 5 };

  const monthReports = allReports.filter((r) => r.year === latest.year && r.month === latest.month);
  const submitted = monthReports.filter((r) => r.status !== 'DRAFT');
  const summary = summarize(monthReports);

  const submittedOrgIds = new Set(submitted.map((r) => r.organizationId));
  const unsubmitted = orgs.filter((o) => o.isActive && !submittedOrgIds.has(o.id));

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ダッシュボード</h1>
          <p className="mt-1 text-sm text-slate-500">{ymLabel(latest.year, latest.month)} の入力状況</p>
        </div>
        <Link href="/reports/new" className={buttonClass('primary')}>＋ 月次レポートを入力</Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="登録団体数" value={formatNumber(orgs.filter((o) => o.isActive).length)} sub="アクティブな団体" />
        <StatCard label="当月 提出済みレポート" value={formatNumber(submitted.length)} accent="emerald" sub={`下書き ${monthReports.length - submitted.length} 件`} />
        <StatCard label="未提出の団体" value={formatNumber(unsubmitted.length)} accent="amber" sub="当月レポート未提出" />
        <StatCard label="当月 新規収容（合計）" value={formatNumber(summary.intakeTotal)} accent="sky" sub={`転帰 ${formatNumber(summary.outcomeTotal)} 頭`} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionTitle subtitle="当月のレポート提出状況">提出状況</SectionTitle>
          <Card>
            <CardBody className="p-0">
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
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">当月のレポートはまだありません</td></tr>
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
                          {r.status === 'DRAFT' && <Badge color="slate">下書き</Badge>}
                          {r.status === 'SUBMITTED' && <Badge color="blue">提出済み</Badge>}
                          {r.status === 'CONFIRMED' && <Badge color="green">確定</Badge>}
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
          <SectionTitle subtitle="当月レポート未提出">要フォロー</SectionTitle>
          <Card>
            <CardBody>
              {unsubmitted.length === 0 ? (
                <p className="text-sm text-slate-400">未提出の団体はありません 🎉</p>
              ) : (
                <ul className="space-y-2">
                  {unsubmitted.map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2">
                      <span className="text-sm text-slate-700">{o.name}</span>
                      <Link href={`/reports/new?org=${o.id}`} className="text-xs font-medium text-amber-700 hover:underline">入力</Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <div className="mt-4 grid gap-2">
            <Link href="/analytics" className={buttonClass('secondary')}>📊 集計ダッシュボードを見る</Link>
            <Link href="/organizations" className={buttonClass('secondary')}>🏢 団体を管理する</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
