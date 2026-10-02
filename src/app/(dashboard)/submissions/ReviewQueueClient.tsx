'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardBody, Badge, Button } from '@/components/ui';
import { confirmReportsAction } from '../reports/actions';

export interface ReviewRow {
  id: string;
  orgName: string;
  period: string;
  sortKey: string;
  species: string;
  submittedAt: string;
  balanced: boolean;
  delta: number;
  /** 記録開始時の頭数が前月の記録終了時と違う */
  prevMismatch: boolean;
  resubmitted: boolean;
  hasNote: boolean;
}

export function ReviewQueueClient({ rows }: { rows: ReviewRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const balancedIds = rows.filter((r) => r.balanced && !r.prevMismatch).map((r) => r.id);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function confirmSelected() {
    if (!window.confirm(`選んだ ${selected.size} 件を確定します。確定後は団体側で修正できなくなります。よろしいですか？`)) return;
    setBusy(true);
    const res = await confirmReportsAction([...selected]);
    setBusy(false);
    setMsg(res.ok ? `${res.count} 件を確定しました。` : res.message ?? '確定できませんでした。');
    setSelected(new Set());
    router.refresh();
  }

  if (rows.length === 0) {
    return <Card><CardBody><p className="py-6 text-center text-sm text-slate-400">確認待ちのレポートはありません 🎉{msg && <><br />{msg}</>}</p></CardBody></Card>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          団体から提出され、まだ確定していないレポートです。<span className="text-amber-700">収支に差分があるもの・前月と頭数がつながらないもの</span>を上に並べています。中身を開いて確認するか、問題なければまとめて確定できます。
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setSelected(new Set(balancedIds))} disabled={balancedIds.length === 0}>
            問題のないものをすべて選ぶ（{balancedIds.length}）
          </Button>
          <Button size="sm" onClick={confirmSelected} disabled={busy || selected.size === 0}>
            {busy ? '確定中…' : `選んだ ${selected.size} 件を確定`}
          </Button>
        </div>
      </div>
      {msg && <p role="status" className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{msg}</p>}
      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="whitespace-nowrap border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="w-10 px-4 py-3"><span className="sr-only">選択</span></th>
                <th className="px-4 py-3 font-medium">団体</th>
                <th className="px-4 py-3 font-medium">対象月</th>
                <th className="px-4 py-3 font-medium">種別</th>
                <th className="px-4 py-3 font-medium">提出日</th>
                <th className="px-4 py-3 font-medium">確認ポイント</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={r.balanced && !r.prevMismatch ? 'border-b border-slate-100 last:border-0' : 'border-b border-amber-100 bg-amber-50/50 last:border-0'}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)}
                      aria-label={`${r.orgName} ${r.period} ${r.species} を選ぶ`} className="h-4 w-4 accent-emerald-600" />
                  </td>
                  <td className="min-w-[10rem] px-4 py-3 font-medium text-slate-700">{r.orgName}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{r.period}</td>
                  <td className="px-4 py-3 text-slate-600">{r.species}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{r.submittedAt}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {r.balanced ? <Badge color="green">収支一致</Badge> : <Badge color="amber">差分 {r.delta > 0 ? '+' : ''}{r.delta}</Badge>}
                      {r.prevMismatch && <Badge color="amber">前月とずれ</Badge>}
                      {r.resubmitted && <Badge color="blue">再提出</Badge>}
                      {r.hasNote && <Badge color="slate">備考あり</Badge>}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <Link href={`/reports/${r.id}`} className="text-sm font-medium text-emerald-700 hover:underline">中身を見る</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
