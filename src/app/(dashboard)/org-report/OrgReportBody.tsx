// 団体向け還元レポートの本体（1 団体分）。個別ページと「全団体まとめて」で共用する。
import { summarize, currentManagedCount, fiscalMonths, inFiscalPeriod, reportIntakeTotal, reportOutcomeTotal } from '@/lib/data/analytics';
import { SPECIES_LABEL, prefectureByCode } from '@/lib/masters';
import { formatNumber, ymLabel } from '@/lib/format';
import type { MonthlyReport, Organization, Species } from '@/lib/types';
import { BreakdownTable } from '../../report/BreakdownTable';
import { TrendChart } from '../analytics/AnalyticsCharts';

export const QUARTER_LABEL: Record<number, string> = { 1: '第1四半期（4〜6月）', 2: '第2四半期（7〜9月）', 3: '第3四半期（10〜12月）', 4: '第4四半期（1〜3月）' };

/** 未提出の下書きは還元対象に含めない */
export function OrgReportBody({ org, orgReports, nationalReports, fy, q }: {
  org: Organization; orgReports: MonthlyReport[]; nationalReports: MonthlyReport[]; fy: number; q?: number;
}) {
  const own = orgReports.filter((r) => r.status !== 'DRAFT' && inFiscalPeriod(r, fy, q));
  const national = nationalReports.filter((r) => r.status !== 'DRAFT' && inFiscalPeriod(r, fy, q));
  const months = fiscalMonths(fy, q);

  const summary = summarize(own);
  const managed = currentManagedCount(own);
  const nationalSummary = summarize(national);
  const species: Species[] = (['DOG', 'CAT'] as Species[]).filter((s) => own.some((r) => r.species === s));

  // 報告のない月を 0 と見せないよう、提出のあった月だけを線で結ぶ
  const trend = months.flatMap((m) => {
    const rs = own.filter((r) => r.year === m.year && r.month === m.month);
    if (rs.length === 0) return [];
    return [{
      key: `${m.year}-${m.month}`,
      label: `${m.month}月`,
      intake: rs.reduce((a, r) => a + reportIntakeTotal(r), 0),
      outcome: rs.reduce((a, r) => a + reportOutcomeTotal(r), 0),
    }];
  });

  const periodLabel = `${fy}年度${q ? ` ${QUARTER_LABEL[q]}` : '（4月〜翌3月）'}`;
  const today = new Date().toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric' });

  const th = 'border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600';
  const td = 'border border-slate-300 px-3 py-1.5 text-sm';
  const tdR = `${td} text-right tabular-nums`;

  return (
    <>
      {/* ヘッダー */}
      <div className="mb-6 border-b-2 border-emerald-600 pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐾</span>
              <span className="text-lg font-bold">どうぶつ保護データプロジェクト</span>
            </div>
            <h1 className="mt-1 text-xl font-bold md:text-2xl">{org.name} 活動データレポート</h1>
          </div>
          <div className="text-sm text-slate-500 sm:text-right">
            <div>作成日：{today}</div>
            <div>{prefectureByCode(org.prefectureCode)?.name ?? ''}</div>
          </div>
        </div>
        <div className="mt-2 text-sm text-slate-500">対象期間：{periodLabel} ／ 提出済みの月次報告 {own.length} 件</div>
      </div>

      {own.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          この期間に提出済みの月次報告はまだありません。
        </p>
      ) : (
        <>
          {/* 主要な数字 */}
          <section className="mb-6">
            <h2 className="mb-2 text-base font-bold text-slate-700">この期間の活動</h2>
            <div className="grid grid-cols-2 gap-3 text-center md:grid-cols-4">
              {[
                ['新規収容（新たに保護した数）', formatNumber(summary.intakeTotal), '頭'],
                ['送り出した数（転帰）', formatNumber(summary.outcomeTotal), '頭'],
                ['うち譲渡など生存転帰', formatNumber(summary.liveOutcomeTotal), '頭'],
                ['生存転帰率', summary.liveReleaseRate === null ? '—' : `${summary.liveReleaseRate}`, summary.liveReleaseRate === null ? '' : '%'],
              ].map(([label, val, unit]) => (
                <div key={label} className="rounded-lg border border-slate-200 py-3">
                  <div className="text-xs text-slate-500">{label}</div>
                  <div className="mt-1 text-xl font-bold tabular-nums text-slate-800">{val}<span className="ml-0.5 text-xs font-medium text-slate-400">{unit}</span></div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-2 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-3">
              <div className="text-sm text-slate-600">期間末の管理頭数</div>
              <div><span className="text-2xl font-bold tabular-nums text-emerald-700">{formatNumber(managed.total)}</span> 頭</div>
              <div className="text-sm text-slate-600">
                {species.map((s) => `${SPECIES_LABEL[s]} ${formatNumber(s === 'DOG' ? managed.dog : managed.cat)}`).join(' ／ ')}
                ／ うち一時預かり {formatNumber(managed.foster)}
              </div>
            </div>
            {(summary.transferIn > 0 || summary.transferOut > 0) && (
              <p className="mt-2 text-sm text-slate-600">
                他団体との連携：受け入れ {formatNumber(summary.transferIn)} 頭 ／ 引き渡し {formatNumber(summary.transferOut)} 頭
              </p>
            )}
          </section>

          {/* 推移 */}
          <section className="mb-6 break-inside-avoid">
            <TrendChart data={trend} />
          </section>

          {/* 月別 */}
          <section className="mb-6 break-inside-avoid">
            <h2 className="mb-2 text-base font-bold text-slate-700">月別の数字</h2>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] border-collapse">
              <thead><tr>
                <th className={`${th} text-left`}>月</th>
                {species.map((s) => (
                  <th key={s} className={th} colSpan={3}>{SPECIES_LABEL[s]}（新規収容 / 転帰 / 記録終了時の頭数）</th>
                ))}
              </tr></thead>
              <tbody>
                {months.map((m) => (
                  <tr key={`${m.year}-${m.month}`}>
                    <td className={`${td} whitespace-nowrap`}>{ymLabel(m.year, m.month)}</td>
                    {species.map((s) => {
                      const r = own.find((x) => x.species === s && x.year === m.year && x.month === m.month);
                      return r ? (
                        <Cells key={s} a={reportIntakeTotal(r)} b={reportOutcomeTotal(r)} c={r.endingCount} cls={tdR} />
                      ) : (
                        <td key={s} className={`${td} text-center text-slate-300`} colSpan={3}>—</td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </section>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 print:grid-cols-2">
            <BreakdownTable title="どこから来たか（収容ルート別）" rows={summary.intakeByCategoryAge} th={th} td={td} tdR={tdR} />
            <BreakdownTable title="どこへ行ったか（転帰別）" rows={summary.outcomeByCategoryAge} th={th} td={td} tdR={tdR} />
          </div>

          {/* 全国の参考値 */}
          <section className="mb-6 break-inside-avoid rounded-lg border border-slate-200 bg-slate-50 px-5 py-4">
            <h2 className="mb-1 text-base font-bold text-slate-700">参考：プロジェクト全体（同じ期間）</h2>
            <p className="text-sm text-slate-600">
              参加 {nationalSummary.organizationCount} 団体の合計で、新たに保護 {formatNumber(nationalSummary.intakeTotal)} 頭・
              送り出し {formatNumber(nationalSummary.outcomeTotal)} 頭
              （生存転帰率 {nationalSummary.liveReleaseRate === null ? '—' : `${nationalSummary.liveReleaseRate}%`}）でした。
            </p>
          </section>
        </>
      )}

      <p className="mt-8 border-t border-slate-200 pt-3 text-xs text-slate-400">
        ※ 本レポートは JASA「どうぶつ保護データプロジェクト」に提出された月次報告（提出済み・確定）から作成しています。
        団体の活動の振り返りや、年次報告・支援者への報告にご活用ください。他団体との比較・順位付けを目的としたものではありません。
      </p>
    </>
  );
}

function Cells({ a, b, c, cls }: { a: number; b: number; c: number; cls: string }) {
  return (
    <>
      <td className={cls}>{formatNumber(a)}</td>
      <td className={cls}>{formatNumber(b)}</td>
      <td className={cls}>{formatNumber(c)}</td>
    </>
  );
}
