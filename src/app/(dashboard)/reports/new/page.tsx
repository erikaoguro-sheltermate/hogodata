import Link from 'next/link';
import { listOrganizations } from '@/lib/data/repo';
import { getSession } from '@/lib/auth/session';
import { ReportForm } from '../ReportForm';

export default async function NewReportPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const sp = await searchParams;
  const [session, orgs] = await Promise.all([getSession(), listOrganizations()]);

  return (
    <div>
      <div className="mb-6">
        <Link href="/reports" className="text-sm text-slate-400 hover:text-slate-600">← 月次レポート一覧</Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-800">月次レポート入力</h1>
        <p className="mt-1 text-sm text-slate-500">団体・種別・対象月を選び、収容・転帰・管理頭数を入力します。収支整合は右側で常時チェックされます。</p>
      </div>
      <ReportForm
        orgs={orgs}
        role={session.role}
        sessionOrgId={session.organizationId}
        initial={null}
        defaultOrgId={sp.org}
      />
    </div>
  );
}
