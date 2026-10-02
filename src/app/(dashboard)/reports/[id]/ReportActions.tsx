'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import type { ReportStatus } from '@/lib/types';
import { confirmReportAction, deleteReportAction, reopenReportAction } from '../actions';

export function ReportActions({ id, status, role }: { id: string; status: ReportStatus; role: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  if (role !== 'ADMIN') return null;

  async function confirm() {
    setBusy(true);
    await confirmReportAction(id);
    setBusy(false);
    router.refresh();
  }
  async function reopen() {
    if (!window.confirm('下書きに差し戻します。団体が内容を直して再提出できるようになります。よろしいですか？')) return;
    setBusy(true);
    await reopenReportAction(id);
    setBusy(false);
    router.refresh();
  }
  async function remove() {
    if (!window.confirm('このレポートを削除（論理削除）します。よろしいですか？')) return;
    setBusy(true);
    await deleteReportAction(id);
    setBusy(false);
    router.push('/reports');
    router.refresh();
  }

  return (
    <div className="flex shrink-0 gap-2">
      {status === 'SUBMITTED' && (
        <Button size="sm" onClick={confirm} disabled={busy}>確定する</Button>
      )}
      {status !== 'DRAFT' && (
        <Button size="sm" variant="secondary" onClick={reopen} disabled={busy}>差し戻す</Button>
      )}
      <Button size="sm" variant="danger" onClick={remove} disabled={busy}>削除</Button>
    </div>
  );
}
