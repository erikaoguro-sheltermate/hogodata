// F-10 団体向けデータ還元レポート（年度 / 四半期）
// 団体が年次報告・支援者向け資料に使えるよう、自団体の数字を「振り返り」の視点でまとめる。
// 全国値は参考として合計のみ示し、他団体との比較・順位は出さない。
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrganization, listReports } from '@/lib/data/repo';
import {
  summarize, currentManagedCount, fiscalYear, fiscalMonths, inFiscalPeriod, previousYearMonth,
  reportIntakeTotal, reportOutcomeTotal,
} from '@/lib/data/analytics';
import { requireSession } from '@/lib/auth/session';
import { canViewOrgSummary } from '@/lib/auth/policy';
import { SPECIES_LABEL, prefectureByCode } from '@/lib/masters';
import { formatNumber, ymLabel } from '@/lib/format';
import type { Species } from '@/lib/types';
import { PrintBar } from '../../../report/PrintButton';
import { ReportTabs } from '../../reports/ReportTabs';
import { BreakdownTable } from '../../../report/BreakdownTable';
import { TrendChart } from '../../analytics/AnalyticsCharts';

const QUARTER_LABEL: Record<number, string> = { 1: 'Q1（4〜6月）', 2: 'Q2（7〜9月）', 3: 'Q3（10〜12月）', 4: 'Q4（1〜3月）' };

export default async function OrgReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ fy?: string; q?: string }>;
}) {
  const [{ orgId }, sp, session] = await Promise.all([params, searchParams, requireSession()]);
  if (!canViewOrgSummary(session, orgId)) notFound();
  const org = await getOrganization(orgId);
  if (!org) notFound();

  const due = previousYearMonth();
  const fy = Number(sp.fy) || fiscalYear(due.year, due.month);
  const q = [1, 2, 3, 4].includes(Number(sp.q)) ? Number(sp.q) : undefined;
  const months = fiscalMonths(fy, q);

  // 未提出の下書きは還元対象に含めない
  const [orgAll, nationalAll] = await Promise.all([
    listReports({ organizationId: orgId }),
    listReports(),
  ]);
  const own = orgAll.filter((r) => r.status !== 'DRAFT' && inFiscalPeriod(r, fy, q));
  const national = nationalAll.filter((r) => r.status !== 'DRAFT' && inFiscalPeriod(r, fy, q));

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
  const base = `/org-report/${orgId}?fy=${fy}`;

  const th = 'border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600';
  const td = 'border border-slate-300 px-3 py-1.5 text-sm';
  const tdR = `${td} text-right tabular-nums`;
  const tab = (active: boolean) =>
    active ? 'rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-white' : 'rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 hover:bg-slate-200';

  return (
    <>
    {session.role === 'ORG_USER' && (
      <div className="no-print">
        <h1 className="mb-4 text-2xl font-bold text-slate-800">レポート</h1>
        <ReportTabs current="summary" orgId={orgId} />
      </div>
    )}
    <div className="mx-auto max-w-4xl rounded-2xl bg-white px-8 py-8 text-slate-800 shadow-sm print:rounded-none print:px-0 print:py-0 print:shadow-none">
      <style>{`@media print { .no-print { display: none !important; } @page { margin: 14mm; } body { background: #fff; } }`}</style>

      <PrintBar
        backHref={session.role === 'ADMIN' ? `/organizations/${orgId}` : null}
        backLabel="団体詳細に戻る"
      />

      {/* 期間切替（印刷されない） */}
      <div className="no-print mb-6 flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-500">期間：</span>
        <Link href={`/org-report/${orgId}?fy=${fy - 1}${q ? `&q=${q}` : ''}`} className={tab(false)}>← {fy - 1}年度</Link>
        <Link href={base} className={tab(!q)}>{fy}年度 通年</Link>
        {[1, 2, 3, 4].map((n) => <Link key={n} href={`${base}&q=${n}`} className={tab(q === n)}>{QUARTER_LABEL[n]}</Link>)}
        <Link href={`/org-report/${orgId}?fy=${fy + 1}${q ? `&q=${q}` : ''}`} className={tab(false)}>{fy + 1}年度 →</Link>
      </div>

      {/* ヘッダー */}
      <div className="mb-6 border-b-2 border-emerald-600 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐾</span>
              <span className="text-lg font-bold">どうぶつ保護データプロジェクト</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold">{org.name} 活動データレポート</h1>
          </div>
          <div className="text-right text-sm text-slate-500">
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
                ['新たに保護した数', formatNumber(summary.intakeTotal), '頭'],
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
            <table className="w-full border-collapse">
              <thead><tr>
                <th className={`${th} text-left`}>月</th>
                {species.map((s) => (
                  <th key={s} className={th} colSpan={3}>{SPECIES_LABEL[s]}（保護 / 送り出し / 月末頭数）</th>
                ))}
              </tr></thead>
              <tbody>
                {months.map((m) => (
                  <tr key={`${m.year}-${m.month}`}>
                    <td className={td}>{ymLabel(m.year, m.month)}</td>
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
    </div>
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
