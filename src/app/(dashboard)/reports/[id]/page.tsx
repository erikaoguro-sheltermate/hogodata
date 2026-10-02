import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getReport, listOrganizations, getOrganization } from '@/lib/data/repo';
import { requireRole } from '@/lib/auth/session';
import { canViewReport } from '@/lib/auth/policy';
import { SPECIES_LABEL } from '@/lib/masters';
import { ymLabel, formatDate } from '@/lib/format';
import { isReturned, wasResubmitted } from '@/lib/submissions';
import { ReportForm } from '../ReportForm';
import { ReportActions } from './ReportActions';
import { ReportStatusBadge } from '@/components/ReportStatusBadge';

export default async function EditReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole('ADMIN', 'ORG_USER');
  const [report, allOrgs] = await Promise.all([getReport(id), listOrganizations()]);
  // 他団体のレポートは存在自体を見せない
  if (!report || !canViewReport(session, report)) notFound();
  const orgs = session.role === 'ORG_USER' ? allOrgs.filter((o) => o.id === session.organizationId) : allOrgs;
  const org = await getOrganization(report.organizationId);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link href="/reports" className="text-sm text-slate-400 hover:text-slate-600">
            ← {session.role === 'ORG_USER' ? '毎月の報告の一覧' : '月次レポート一覧'}
          </Link>
          <h1 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-bold text-slate-800">
            {org?.name} — {ymLabel(report.year, report.month)} {SPECIES_LABEL[report.species]}
            <ReportStatusBadge report={report} />
          </h1>
        </div>
        <ReportActions id={report.id} status={report.status} role={session.role} />
      </div>
      <StatusNotice report={report} isOrgUser={session.role === 'ORG_USER'} />
      <ReportForm
        orgs={orgs}
        role={session.role}
        sessionOrgId={session.organizationId}
        initial={report}
      />
    </div>
  );
}

/** いまの状態と、次に何をすればよいか */
function StatusNotice({ report, isOrgUser }: { report: NonNullable<Awaited<ReturnType<typeof getReport>>>; isOrgUser: boolean }) {
  if (isReturned(report)) {
    return (
      <div role="alert" className="mb-6 rounded-xl border-2 border-red-200 bg-red-50 px-5 py-4">
        <div className="text-sm font-bold text-red-800">事務局から差し戻されています（{formatDate(report.returnedAt)}）</div>
        <p className="mt-1 whitespace-pre-wrap text-sm text-red-900">{report.returnNote}</p>
        <p className="mt-2 text-xs text-red-700">
          {isOrgUser ? '内容を直して「提出する」を押してください。' : '団体の再提出を待っています。'}
        </p>
      </div>
    );
  }
  if (report.status === 'SUBMITTED') {
    return (
      <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 px-5 py-3 text-sm text-sky-900">
        {isOrgUser
          ? <>提出済みです（{formatDate(report.submittedAt)}）。事務局が確定するまでは、直して「修正して再提出」できます。</>
          : wasResubmitted(report)
            ? <>団体が提出後に修正して再提出しました（{formatDate(report.resubmittedAt)}）。内容を確認して「確定する」か「差し戻す」を選んでください。</>
            : <>団体から提出されました（{formatDate(report.submittedAt)}）。内容を確認して「確定する」か「差し戻す」を選んでください。</>}
      </div>
    );
  }
  if (report.status === 'CONFIRMED') {
    return (
      <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-900">
        事務局が確定しました。{isOrgUser ? '修正が必要な場合は事務局にご連絡ください。' : '修正が必要な場合は「差し戻す」で団体に戻せます。'}
      </div>
    );
  }
  return null;
}
