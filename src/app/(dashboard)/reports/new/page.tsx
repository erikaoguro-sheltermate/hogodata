import Link from 'next/link';
import { listOrganizations } from '@/lib/data/repo';
import { requireRole } from '@/lib/auth/session';
import { ReportForm } from '../ReportForm';

export default async function NewReportPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; species?: string; year?: string; month?: string }>;
}) {
  const sp = await searchParams;
  const session = await requireRole('ADMIN', 'ORG_USER');
  const allOrgs = await listOrganizations();
  const orgs = session.role === 'ORG_USER'
    ? allOrgs.filter((o) => o.id === session.organizationId)
    : allOrgs.filter((o) => o.isActive);

  return (
    <div>
      <div className="mb-6">
        <Link href="/reports" className="text-sm text-slate-400 hover:text-slate-600">
          ← {session.role === 'ORG_USER' ? '毎月の報告の一覧' : '月次レポート一覧'}
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-800">{session.role === 'ORG_USER' ? '毎月の報告を入力' : '月次レポート入力'}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {session.role === 'ORG_USER' ? '種別・対象月を選び' : '団体・種別・対象月を選び'}、収容・転帰・管理頭数を入力します。収支の整合（開始＋収容−転帰＝終了）は画面の下（PCでは右側）で常にチェックされます。
        </p>
      </div>
      <ReportForm
        orgs={orgs}
        role={session.role}
        sessionOrgId={session.organizationId}
        initial={null}
        defaultOrgId={sp.org}
        defaultSpecies={sp.species === 'DOG' || sp.species === 'CAT' ? sp.species : undefined}
        defaultYear={sp.year ? Number(sp.year) : undefined}
        defaultMonth={sp.month ? Number(sp.month) : undefined}
      />
    </div>
  );
}
