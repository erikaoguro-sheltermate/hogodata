// 収容ルート別・転帰別（年齢内訳）の印刷用テーブル。全国レポートと団体還元レポートで共用。
import { formatNumber } from '@/lib/format';

export function BreakdownTable({ title, rows, th, td, tdR }: {
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
