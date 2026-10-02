// レポートの状態バッジ。差し戻し中は「下書き」ではなく「差し戻し」と出す（全画面で共通）。
import { Badge } from '@/components/ui';
import { STATUS_LABEL } from '@/lib/masters';
import { isReturned, wasResubmitted } from '@/lib/submissions';
import type { MonthlyReport, ReportStatus } from '@/lib/types';

type Minimal = Pick<MonthlyReport, 'status' | 'returnNote' | 'returnedAt' | 'resubmittedAt'>;

export const STATUS_COLOR: Record<ReportStatus, 'slate' | 'blue' | 'green'> = { DRAFT: 'slate', SUBMITTED: 'blue', CONFIRMED: 'green' };

export function reportStatusLabel(r: Minimal): string {
  if (isReturned(r)) return '差し戻し';
  if (wasResubmitted(r)) return '再提出';
  return STATUS_LABEL[r.status];
}

export function ReportStatusBadge({ report }: { report: Minimal }) {
  if (isReturned(report)) return <Badge color="red">差し戻し</Badge>;
  if (wasResubmitted(report)) return <Badge color="blue">再提出</Badge>;
  return <Badge color={STATUS_COLOR[report.status]}>{STATUS_LABEL[report.status]}</Badge>;
}
