'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import type { Species } from '@/lib/types';
import { submitNoChangeAction } from './reports/actions';

/** 「この月は動きなし」：前月の頭数のまま、収容・転帰ゼロで提出する */
export function NoChangeButton({ orgId, species, year, month, count, foster, label }: {
  orgId: string; species: Species; year: number; month: number; count: number; foster: number; label: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit() {
    const ok = window.confirm(
      `${label}は「収容も転帰もなし」として提出します。\n\n管理頭数：${count} 頭（うち一時預かり ${foster} 頭）のまま\n\nよろしいですか？`,
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    const res = await submitNoChangeAction(orgId, species, year, month);
    setBusy(false);
    if (!res.ok) { setError(res.message ?? '提出できませんでした。'); return; }
    router.push(`/reports/${res.id}/submitted`);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={submit} disabled={busy}>
        {busy ? '送信中…' : '動きなしで提出'}
      </Button>
      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
    </>
  );
}
