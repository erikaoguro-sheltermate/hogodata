'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import type { ReportStatus } from '@/lib/types';
import { confirmReportAction, deleteReportAction, reopenReportAction } from '../actions';

const textareaCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

export function ReportActions({ id, status, role, label }: { id: string; status: ReportStatus; role: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [reopening, setReopening] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  if (role !== 'ADMIN') return null;

  async function confirm() {
    if (!window.confirm(`「${label}」を確定します。確定後は団体側で修正できなくなります。よろしいですか？`)) return;
    setBusy(true);
    setError(null);
    const res = await confirmReportAction(id);
    setBusy(false);
    if (!res.ok) { setError(res.message ?? '確定できませんでした。'); return; }
    router.refresh();
  }
  async function reopen(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await reopenReportAction(id, reason);
    setBusy(false);
    if (!res.ok) { setError(res.message ?? '差し戻せませんでした。'); return; }
    setReopening(false);
    setReason('');
    router.refresh();
  }
  async function remove() {
    if (!window.confirm(`「${label}」を削除します。一覧や集計から消え、元に戻せません。よろしいですか？`)) return;
    setBusy(true);
    setError(null);
    const res = await deleteReportAction(id);
    setBusy(false);
    if (!res.ok) { setError(res.message ?? '削除できませんでした。'); return; }
    router.push('/reports');
    router.refresh();
  }

  return (
    <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
      <div className="flex flex-wrap gap-2">
        {status === 'SUBMITTED' && (
          <Button size="sm" onClick={confirm} disabled={busy}>確定する</Button>
        )}
        {status !== 'DRAFT' && !reopening && (
          <Button size="sm" variant="secondary" onClick={() => setReopening(true)} disabled={busy}>差し戻す</Button>
        )}
        <Button size="sm" variant="danger" onClick={remove} disabled={busy}>削除</Button>
      </div>
      {error && !reopening && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {reopening && (
        <form onSubmit={reopen} className="w-80 max-w-full space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <label className="block text-sm font-medium text-amber-900">
            団体に伝える理由
            <textarea
              value={reason} onChange={(e) => setReason(e.target.value)} rows={3} required autoFocus maxLength={500}
              placeholder="例：記録終了時の頭数が前月と合っていません。ご確認のうえ再提出をお願いします。"
              className={`${textareaCls} mt-1`}
            />
          </label>
          <p className="text-xs text-amber-800">団体のホームのいちばん上に表示されます。</p>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setReopening(false)}>キャンセル</Button>
            <Button type="submit" size="sm" disabled={busy}>差し戻す</Button>
          </div>
        </form>
      )}
    </div>
  );
}
