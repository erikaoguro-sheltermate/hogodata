import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getReport, listOrganizations, getOrganization } from '@/lib/data/repo';
import { getSession } from '@/lib/auth/session';
import { SPECIES_LABEL, STATUS_LABEL } from '@/lib/masters';
import { ymLabel } from '@/lib/format';
import { Badge } from '@/components/ui';
import { ReportForm } from '../ReportForm';
import { ReportActions } from './ReportActions';

export default async function EditReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [report, session, orgs] = await Promise.all([getReport(id), getSession(), listOrganizations()]);
  if (!report) notFound();
  const org = await getOrganization(report.organizationId);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link href="/reports" className="text-sm text-slate-400 hover:text-slate-600">← 月次レポート一覧</Link>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-800">
            {org?.name} — {ymLabel(report.year, report.month)} {SPECIES_LABEL[report.species]}
            <Badge color={report.status === 'CONFIRMED' ? 'green' : report.status === 'SUBMITTED' ? 'blue' : 'slate'}>
              {STATUS_LABEL[report.status]}
            </Badge>
          </h1>
        </div>
        <ReportActions id={report.id} status={report.status} role={session.role} />
      </div>
      <ReportForm
        orgs={orgs}
        role={session.role}
        sessionOrgId={session.organizationId}
        initial={report}
      />
    </div>
  );
}
