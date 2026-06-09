// 表示用フォーマッタ

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString('ja-JP');
}

export function ymLabel(year: number, month: number): string {
  return `${year}年${month}月`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

/** 生存転帰率（%）。全転帰0なら null。 */
export function liveReleaseRate(liveTotal: number, totalOutcome: number): number | null {
  if (totalOutcome <= 0) return null;
  return Math.round((liveTotal / totalOutcome) * 1000) / 10;
}
