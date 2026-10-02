// 確認待ち：提出済み・未確定のレポート。収支差分のあるものは要確認として目立たせる。
import { checkBalance } from '@/lib/validation/balance';
import { wasResubmitted } from '@/lib/submissions';
import { SPECIES_LABEL } from '@/lib/masters';
import { ymLabel, formatDate } from '@/lib/format';
import type { MonthlyReport, Organization } from '@/lib/types';
import { ReviewQueueClient, type ReviewRow } from './ReviewQueueClient';

export function ReviewQueue({ reports, orgs }: { reports: MonthlyReport[]; orgs: Organization[] }) {
  const rows: ReviewRow[] = reports
    .filter((r) => r.status === 'SUBMITTED')
    .map((r) => {
      const bal = checkBalance(r);
      const pm = r.month === 1 ? { year: r.year - 1, month: 12 } : { year: r.year, month: r.month - 1 };
      const prev = reports.find((x) => x.organizationId === r.organizationId && x.species === r.species && x.year === pm.year && x.month === pm.month && x.status !== 'DRAFT');
      const prevMismatch = !!prev && (prev.endingCount !== r.beginningCount || prev.endingFosterCount !== r.beginningFosterCount);
      return {
        prevMismatch,
        id: r.id,
        orgName: orgs.find((o) => o.id === r.organizationId)?.name ?? '—',
        period: ymLabel(r.year, r.month),
        sortKey: `${r.year}-${String(r.month).padStart(2, '0')}`,
        species: SPECIES_LABEL[r.species],
        submittedAt: formatDate(r.resubmittedAt ?? r.submittedAt),
        balanced: bal.balanced,
        delta: bal.delta,
        resubmitted: wasResubmitted(r),
        hasNote: !!r.note,
      };
    })
    .sort((a, b) => Number(a.balanced && !a.prevMismatch) - Number(b.balanced && !b.prevMismatch) || a.sortKey.localeCompare(b.sortKey) || a.orgName.localeCompare(b.orgName, 'ja'));
  return <ReviewQueueClient rows={rows} />;
}
