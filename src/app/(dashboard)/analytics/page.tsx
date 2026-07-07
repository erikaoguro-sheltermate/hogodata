import Link from 'next/link';
import { listReports, type ReportFilter } from '@/lib/data/repo';
import { summarize, summarizeByPeriod, type PeriodType } from '@/lib/data/analytics';
import { getSession, isAdmin } from '@/lib/auth/session';
import { Card, CardBody, StatCard, buttonClass, SectionTitle, Badge } from '@/components/ui';
import { REGION_BLOCKS } from '@/lib/masters';
import { formatNumber } from '@/lib/format';
import type { Species } from '@/lib/types';
import { IntakeByCategoryChart, OutcomeByCategoryChart, TrendChart } from './AnalyticsCharts';

const inputCls = 'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm';
const PERIOD_LABEL: Record<PeriodType, string> = { month: '月次', quarter: '四半期', year: '年次' };

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const session = await getSession();
  const period = (['month', 'quarter', 'year'].includes(sp.period ?? '') ? sp.period : 'quarter') as PeriodType;
  const filter: ReportFilter = {
    year: sp.year ? Number(sp.year) : undefined,
    species: (sp.species as Species) || undefined,
    regionBlock: sp.block || undefined,
  };
  const reports = await listReports(filter);
  const summary = summarize(reports);
  const periods = summarizeByPeriod(reports, period);
  // 推移グラフは常に「月次」で表示（期間切替は表・エクスポート用）
  const monthlyTrend = summarizeByPeriod(reports, 'month').map((p) => ({ key: p.key, label: p.label, intake: p.intakeTotal, outcome: p.outcomeTotal }));

  // 現在のフィルタを維持したエクスポートURL
  const exportQs = new URLSearchParams();
  if (filter.year) exportQs.set('year', String(filter.year));
  if (filter.species) exportQs.set('species', filter.species);
  if (filter.regionBlock) exportQs.set('block', filter.regionBlock);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">集計ダッシュボード</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isAdmin(session) ? '全団体の匿名集計' : '匿名集計（団体個別の値は表示されません）'}
          </p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/exports/summary?period=${period}&${exportQs.toString()}`} className={buttonClass('primary')}>⬇ 期間集計CSV</a>
          <a href={`/api/exports/reports?${exportQs.toString()}`} className={buttonClass('secondary')}>⬇ 生データCSV</a>
        </div>
      </div>

      {/* 期間切替 */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-slate-500">集計単位：</span>
        {(['month', 'quarter', 'year'] as PeriodType[]).map((p) => {
          const qs = new URLSearchParams(exportQs);
          qs.set('period', p);
          const active = p === period;
          return (
            <Link key={p} href={`/analytics?${qs.toString()}`}
              className={active ? 'rounded-full bg-slate-800 px-4 py-1.5 text-sm font-medium text-white' : 'rounded-full bg-slate-100 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-200'}>
              {PERIOD_LABEL[p]}
            </Link>
          );
        })}
      </div>

      {/* フィルタ */}
      <form className="mb-5 flex flex-wrap items-center gap-2" method="get">
        <input type="hidden" name="period" value={period} />
        <select name="year" defaultValue={sp.year ?? ''} className={inputCls}>
          <option value="">年（すべて）</option>
          {[2026, 2027].map((y) => <option key={y} value={y}>{y}年</option>)}
        </select>
        <select name="species" defaultValue={sp.species ?? ''} className={inputCls}>
          <option value="">種別（すべて）</option>
          <option value="DOG">犬</option>
          <option value="CAT">猫</option>
        </select>
        <select name="block" defaultValue={sp.block ?? ''} className={inputCls}>
          <option value="">地方ブロック（すべて）</option>
          {REGION_BLOCKS.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <button type="submit" className={buttonClass('secondary', 'sm')}>絞り込み</button>
        <Link href={`/analytics?period=${period}`} className={buttonClass('ghost', 'sm')}>クリア</Link>
      </form>

      {/* サマリー */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="データを提出した団体数" value={summary.organizationCount} accent="emerald" sub="この集計に含まれる団体" />
        <StatCard label="新規収容（合計）" value={formatNumber(summary.intakeTotal)} accent="sky" sub={`${summary.reportCount} レポート`} />
        <StatCard label="転帰（合計）" value={formatNumber(summary.outcomeTotal)} sub={`生存 ${formatNumber(summary.liveOutcomeTotal)} / 非生存 ${formatNumber(summary.nonLiveOutcomeTotal)}`} />
        <StatCard label="生存転帰率" value={summary.liveReleaseRate === null ? '—' : `${summary.liveReleaseRate}%`} accent="emerald" sub="生存転帰 / 全転帰" />
      </div>

      {/* 期間別サマリー表 */}
      <div className="mt-8">
        <SectionTitle subtitle="登録タイミングで提出団体数は期間ごとに異なります">
          {PERIOD_LABEL[period]}サマリー
        </SectionTitle>
        <Card>
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">期間</th>
                  <th className="px-4 py-3 text-right font-medium">提出団体数</th>
                  <th className="px-4 py-3 text-right font-medium">犬/猫レポート</th>
                  <th className="px-4 py-3 text-right font-medium">新規収容</th>
                  <th className="px-4 py-3 text-right font-medium">転帰</th>
                  <th className="px-4 py-3 text-right font-medium">生存転帰率</th>
                </tr>
              </thead>
              <tbody>
                {periods.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">該当データがありません</td></tr>
                )}
                {periods.map((p) => (
                  <tr key={p.key} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">{p.label}</td>
                    <td className="px-4 py-3 text-right"><Badge color="blue">{p.orgCount} 団体</Badge></td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{p.dogReports} / {p.catReports}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{formatNumber(p.intakeTotal)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{formatNumber(p.outcomeTotal)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-emerald-700">{p.liveReleaseRate === null ? '—' : `${p.liveReleaseRate}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>

      {/* 推移・構成 */}
      <div className="mt-6">
        <TrendChart data={monthlyTrend} />
      </div>
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <IntakeByCategoryChart data={summary.intakeByCategoryAge} />
        <OutcomeByCategoryChart data={summary.outcomeByCategoryAge} />
      </div>

      <p className="mt-6 text-xs text-slate-400">
        ※ 本集計は「比較・評価」を目的としません。団体間のランキング等は表示しない方針です。
      </p>
    </div>
  );
}
