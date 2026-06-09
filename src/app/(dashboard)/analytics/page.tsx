import Link from 'next/link';
import { listReports, type ReportFilter } from '@/lib/data/repo';
import { summarize } from '@/lib/data/analytics';
import { getSession, isAdmin } from '@/lib/auth/session';
import { StatCard, buttonClass } from '@/components/ui';
import { REGION_BLOCKS, OUTCOME_CATEGORIES } from '@/lib/masters';
import { formatNumber } from '@/lib/format';
import type { Species } from '@/lib/types';
import { IntakeByCategoryChart, OutcomeByCategoryChart, TrendChart } from './AnalyticsCharts';

const inputCls = 'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm';
const liveCodes = OUTCOME_CATEGORIES.filter((c) => c.isLiveOutcome).map((c) => c.code);

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const session = await getSession();
  const filter: ReportFilter = {
    year: sp.year ? Number(sp.year) : undefined,
    species: (sp.species as Species) || undefined,
    regionBlock: sp.block || undefined,
  };
  const reports = await listReports(filter);
  const summary = summarize(reports);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">集計ダッシュボード</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isAdmin(session) ? '全団体の匿名集計' : '匿名集計（団体個別の値は表示されません）'}
          </p>
        </div>
        <a href="/api/exports/reports" className={buttonClass('secondary')}>⬇ CSVエクスポート</a>
      </div>

      {/* フィルタ */}
      <form className="mb-5 flex flex-wrap items-center gap-2" method="get">
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
        <Link href="/analytics" className={buttonClass('ghost', 'sm')}>クリア</Link>
      </form>

      {/* サマリー */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="新規収容（合計）" value={formatNumber(summary.intakeTotal)} accent="sky" sub={`${summary.reportCount} レポート`} />
        <StatCard label="転帰（合計）" value={formatNumber(summary.outcomeTotal)} accent="slate" sub={`生存 ${formatNumber(summary.liveOutcomeTotal)} / 非生存 ${formatNumber(summary.nonLiveOutcomeTotal)}`} />
        <StatCard label="生存転帰率" value={summary.liveReleaseRate === null ? '—' : `${summary.liveReleaseRate}%`} accent="emerald" sub="生存転帰 / 全転帰" />
        <StatCard label="団体間連携" value={`IN ${formatNumber(summary.transferIn)}`} sub={`OUT ${formatNumber(summary.transferOut)} 頭`} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <IntakeByCategoryChart data={summary.intakeByCategory} />
        <OutcomeByCategoryChart data={summary.outcomeByCategory} liveCodes={liveCodes} />
      </div>
      <div className="mt-5">
        <TrendChart data={summary.trend} />
      </div>

      <p className="mt-6 text-xs text-slate-400">
        ※ 本集計は「比較・評価」を目的としません。団体間のランキング等は表示しない方針です。
      </p>
    </div>
  );
}
