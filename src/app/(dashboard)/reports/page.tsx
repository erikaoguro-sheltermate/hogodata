import Link from 'next/link';
import { listOrganizations, listReports, type ReportFilter } from '@/lib/data/repo';
import { checkBalance } from '@/lib/validation/balance';
import { Card, CardBody, Badge, buttonClass } from '@/components/ui';
import { SPECIES_LABEL, STATUS_LABEL } from '@/lib/masters';
import { ymLabel, formatNumber } from '@/lib/format';
import type { Species, ReportStatus } from '@/lib/types';

const inputCls = 'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const filter: ReportFilter = {
    year: sp.year ? Number(sp.year) : undefined,
    month: sp.month ? Number(sp.month) : undefined,
    species: (sp.species as Species) || undefined,
    status: (sp.status as ReportStatus) || undefined,
    organizationId: sp.org || undefined,
  };

  const [orgs, reports] = await Promise.all([listOrganizations(), listReports(filter)]);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">月次レポート</h1>
          <p className="mt-1 text-sm text-slate-500">{reports.length} 件</p>
        </div>
        <Link href="/reports/new" className={buttonClass('primary')}>＋ 新規入力</Link>
      </div>

      {/* フィルタ */}
      <form className="mb-4 flex flex-wrap items-center gap-2" method="get">
        <select name="year" defaultValue={sp.year ?? ''} className={inputCls}>
          <option value="">年（すべて）</option>
          {[2026, 2027].map((y) => <option key={y} value={y}>{y}年</option>)}
        </select>
        <select name="month" defaultValue={sp.month ?? ''} className={inputCls}>
          <option value="">月（すべて）</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}月</option>)}
        </select>
        <select name="species" defaultValue={sp.species ?? ''} className={inputCls}>
          <option value="">種別（すべて）</option>
          <option value="DOG">犬</option>
          <option value="CAT">猫</option>
        </select>
        <select name="status" defaultValue={sp.status ?? ''} className={inputCls}>
          <option value="">状態（すべて）</option>
          <option value="DRAFT">下書き</option>
          <option value="SUBMITTED">提出済み</option>
          <option value="CONFIRMED">確定</option>
        </select>
        <select name="org" defaultValue={sp.org ?? ''} className={inputCls}>
          <option value="">団体（すべて）</option>
          {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <button type="submit" className={buttonClass('secondary', 'sm')}>絞り込み</button>
        <Link href="/reports" className={buttonClass('ghost', 'sm')}>クリア</Link>
      </form>

      <Card>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">対象年月</th>
                <th className="px-4 py-3 font-medium">団体</th>
                <th className="px-4 py-3 font-medium">種別</th>
                <th className="px-4 py-3 text-right font-medium">収容計</th>
                <th className="px-4 py-3 text-right font-medium">転帰計</th>
                <th className="px-4 py-3 font-medium">収支</th>
                <th className="px-4 py-3 font-medium">状態</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">該当するレポートがありません</td></tr>
              )}
              {reports.map((r) => {
                const org = orgs.find((o) => o.id === r.organizationId);
                const bal = checkBalance(r);
                return (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">{ymLabel(r.year, r.month)}</td>
                    <td className="px-4 py-3 text-slate-700">{org?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{SPECIES_LABEL[r.species]}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{formatNumber(bal.intakeTotal)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{formatNumber(bal.outcomeTotal)}</td>
                    <td className="px-4 py-3">
                      {bal.balanced
                        ? <Badge color="green">一致</Badge>
                        : <Badge color="amber">差分 {bal.delta > 0 ? '+' : ''}{bal.delta}</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={r.status === 'CONFIRMED' ? 'green' : r.status === 'SUBMITTED' ? 'blue' : 'slate'}>
                        {STATUS_LABEL[r.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/reports/${r.id}`} className="text-sm font-medium text-emerald-700 hover:underline">編集</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
