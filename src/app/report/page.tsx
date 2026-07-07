import { listReports, type ReportFilter } from '@/lib/data/repo';
import { summarize, summarizeByPeriod, currentManagedCount, type PeriodType } from '@/lib/data/analytics';
import { SPECIES_LABEL, REGION_BLOCKS } from '@/lib/masters';
import { formatNumber } from '@/lib/format';
import type { Species } from '@/lib/types';
import { PrintBar } from './PrintButton';

const PERIOD_LABEL: Record<PeriodType, string> = { month: '月次', quarter: '四半期', year: '年次' };

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const period = (['month', 'quarter', 'year'].includes(sp.period ?? '') ? sp.period : 'quarter') as PeriodType;
  const filter: ReportFilter = {
    year: sp.year ? Number(sp.year) : undefined,
    species: (sp.species as Species) || undefined,
    regionBlock: sp.block || undefined,
  };
  const reports = await listReports(filter);
  const summary = summarize(reports);
  const periods = summarizeByPeriod(reports, period);
  const managed = currentManagedCount(reports);

  const today = new Date().toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric' });
  const filterLabel = [
    filter.year ? `${filter.year}年` : '全期間',
    filter.species ? SPECIES_LABEL[filter.species] : '犬・猫',
    filter.regionBlock && REGION_BLOCKS.includes(filter.regionBlock) ? filter.regionBlock : '全国',
  ].join(' ／ ');

  const th = 'border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600';
  const td = 'border border-slate-300 px-3 py-1.5 text-sm';
  const tdR = `${td} text-right tabular-nums`;

  return (
    <div className="mx-auto max-w-4xl bg-white px-8 py-8 text-slate-800 print:px-0 print:py-0">
      <style>{`@media print { .no-print { display: none !important; } @page { margin: 14mm; } body { background: #fff; } }`}</style>

      <PrintBar />

      {/* ヘッダー */}
      <div className="mb-6 border-b-2 border-emerald-600 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐾</span>
              <span className="text-lg font-bold">JASA Data Hub</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold">どうぶつ保護データ 活動統計レポート</h1>
          </div>
          <div className="text-right text-sm text-slate-500">
            <div>作成日：{today}</div>
            <div>集計単位：{PERIOD_LABEL[period]}</div>
          </div>
        </div>
        <div className="mt-2 text-sm text-slate-500">対象：{filterLabel}</div>
      </div>

      {/* 現在の管理頭数 */}
      <section className="mb-6">
        <h2 className="mb-2 text-base font-bold text-slate-700">現在の管理頭数（各団体の最新レポート時点）</h2>
        <div className="flex flex-wrap items-end gap-x-8 gap-y-2 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-3">
          <div><span className="text-3xl font-bold tabular-nums text-emerald-700">{formatNumber(managed.total)}</span> 頭</div>
          <div className="text-sm text-slate-600">犬 <b>{formatNumber(managed.dog)}</b> ／ 猫 <b>{formatNumber(managed.cat)}</b> ／ うち一時預かり <b>{formatNumber(managed.foster)}</b> ／ 対象 <b>{managed.orgCount}</b> 団体</div>
        </div>
      </section>

      {/* サマリー */}
      <section className="mb-6">
        <h2 className="mb-2 text-base font-bold text-slate-700">サマリー</h2>
        <div className="grid grid-cols-4 gap-3 text-center">
          {[
            ['データ提出団体数', `${summary.organizationCount}`, '団体'],
            ['新規収容（合計）', formatNumber(summary.intakeTotal), '頭'],
            ['転帰（合計）', formatNumber(summary.outcomeTotal), '頭'],
            ['生存転帰率', summary.liveReleaseRate === null ? '—' : `${summary.liveReleaseRate}`, summary.liveReleaseRate === null ? '' : '%'],
          ].map(([label, val, unit]) => (
            <div key={label} className="rounded-lg border border-slate-200 py-3">
              <div className="text-xs text-slate-500">{label}</div>
              <div className="mt-1 text-xl font-bold tabular-nums text-slate-800">{val}<span className="ml-0.5 text-xs font-medium text-slate-400">{unit}</span></div>
            </div>
          ))}
        </div>
      </section>

      {/* 期間別サマリー */}
      <section className="mb-6">
        <h2 className="mb-2 text-base font-bold text-slate-700">{PERIOD_LABEL[period]}サマリー</h2>
        <table className="w-full border-collapse">
          <thead><tr>
            <th className={`${th} text-left`}>期間</th><th className={th}>提出団体数</th><th className={th}>犬/猫</th>
            <th className={th}>新規収容</th><th className={th}>転帰</th><th className={th}>生存転帰率</th>
          </tr></thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p.key}>
                <td className={td}>{p.label}</td>
                <td className={tdR}>{p.orgCount}</td>
                <td className={tdR}>{p.dogReports}/{p.catReports}</td>
                <td className={tdR}>{formatNumber(p.intakeTotal)}</td>
                <td className={tdR}>{formatNumber(p.outcomeTotal)}</td>
                <td className={tdR}>{p.liveReleaseRate === null ? '—' : `${p.liveReleaseRate}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 収容ルート別・転帰別（年齢内訳） */}
      <div className="grid grid-cols-2 gap-4">
        <BreakdownTable title="収容ルート別（年齢内訳）" rows={summary.intakeByCategoryAge} th={th} td={td} tdR={tdR} />
        <BreakdownTable title="転帰別（年齢内訳）" rows={summary.outcomeByCategoryAge} th={th} td={td} tdR={tdR} />
      </div>

      <p className="mt-8 border-t border-slate-200 pt-3 text-xs text-slate-400">
        ※ 本レポートは「比較・評価」を目的とせず、現場の振り返りと政策・支援の意思決定に役立てることを目的としています。団体間のランキング等は掲載していません。
      </p>
    </div>
  );
}

function BreakdownTable({ title, rows, th, td, tdR }: {
  title: string;
  rows: { code: string; name: string; u5m: number; m5_10y: number; o10y: number; total: number }[];
  th: string; td: string; tdR: string;
}) {
  return (
    <section>
      <h2 className="mb-2 text-base font-bold text-slate-700">{title}</h2>
      <table className="w-full border-collapse">
        <thead><tr>
          <th className={`${th} text-left`}>区分</th><th className={th}>〜5ヶ月</th><th className={th}>5ヶ月〜10歳</th><th className={th}>10歳〜</th><th className={th}>計</th>
        </tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td className={`${td} text-center text-slate-400`} colSpan={5}>データなし</td></tr>}
          {rows.map((r) => (
            <tr key={r.code}>
              <td className={td}>{r.name}</td>
              <td className={tdR}>{formatNumber(r.u5m)}</td>
              <td className={tdR}>{formatNumber(r.m5_10y)}</td>
              <td className={tdR}>{formatNumber(r.o10y)}</td>
              <td className={`${tdR} font-semibold`}>{formatNumber(r.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
