import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrganization, listReports } from '@/lib/data/repo';
import { Card, CardBody, Badge, StatCard, buttonClass, SectionTitle } from '@/components/ui';
import { prefectureByCode, STATUS_LABEL } from '@/lib/masters';
import { formatDate } from '@/lib/format';
import type { MonthlyReport, Species, ReportStatus } from '@/lib/types';

// パイロット年度（2026年4月〜2027年3月）の対象月
const FISCAL_MONTHS: { year: number; month: number }[] = [
  ...[4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => ({ year: 2026, month: m })),
  ...[1, 2, 3].map((m) => ({ year: 2027, month: m })),
];

function StatusCell({ report, href }: { report: MonthlyReport | undefined; href: string }) {
  if (!report) {
    return (
      <Link href={href} className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-100">
        未提出 <span className="text-amber-400">＋</span>
      </Link>
    );
  }
  const color: Record<ReportStatus, 'slate' | 'blue' | 'green'> = { DRAFT: 'slate', SUBMITTED: 'blue', CONFIRMED: 'green' };
  return (
    <Link href={`/reports/${report.id}`} className="inline-block hover:opacity-80">
      <Badge color={color[report.status]}>{STATUS_LABEL[report.status]}</Badge>
    </Link>
  );
}

export default async function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = await getOrganization(id);
  if (!org) notFound();
  const reports = await listReports({ organizationId: id });

  const find = (species: Species, year: number, month: number) =>
    reports.find((r) => r.species === species && r.year === year && r.month === month);

  // 集計
  const submittedCount = reports.filter((r) => r.status !== 'DRAFT').length;
  const draftCount = reports.filter((r) => r.status === 'DRAFT').length;
  const totalSlots = FISCAL_MONTHS.length * 2; // 月 × (犬/猫)
  const filledSlots = FISCAL_MONTHS.reduce((acc, fm) =>
    acc + (find('DOG', fm.year, fm.month) ? 1 : 0) + (find('CAT', fm.year, fm.month) ? 1 : 0), 0);
  const unsubmittedSlots = totalSlots - filledSlots;
  const latestSubmitted = reports
    .filter((r) => r.submittedAt)
    .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))[0];

  return (
    <div>
      <div className="mb-6">
        <Link href="/organizations" className="text-sm text-slate-400 hover:text-slate-600">← 団体マスタ一覧</Link>
        <div className="mt-1 flex items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
              {org.name} {org.isActive ? <Badge color="green">有効</Badge> : <Badge color="slate">無効</Badge>}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {prefectureByCode(org.prefectureCode)?.name ?? '—'} ・ {org.orgType}
              {org.contactName && ` ・ 担当：${org.contactName}`}
            </p>
          </div>
          <Link href={`/reports/new?org=${org.id}`} className={buttonClass('primary')}>＋ レポートを入力</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="提出済みレポート" value={submittedCount} accent="emerald" sub="提出済み＋確定" />
        <StatCard label="下書き" value={draftCount} accent="slate" />
        <StatCard label="未提出（年度内）" value={unsubmittedSlots} accent="amber" sub={`全 ${totalSlots} 枠中`} />
        <StatCard label="直近の提出" value={latestSubmitted ? formatDate(latestSubmitted.submittedAt) : '—'} accent="sky" />
      </div>

      <div className="mt-8">
        <SectionTitle subtitle="パイロット年度（2026年4月〜2027年3月）の月次提出状況。未提出セルから入力に進めます。">
          提出状況
        </SectionTitle>
        <Card>
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-medium">対象月</th>
                  <th className="px-4 py-3 font-medium">🐕 犬</th>
                  <th className="px-4 py-3 font-medium">🐈 猫</th>
                </tr>
              </thead>
              <tbody>
                {FISCAL_MONTHS.map((fm) => {
                  const dog = find('DOG', fm.year, fm.month);
                  const cat = find('CAT', fm.year, fm.month);
                  return (
                    <tr key={`${fm.year}-${fm.month}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-700">{fm.year}年{fm.month}月</td>
                      <td className="px-4 py-2.5">
                        <StatusCell report={dog} href={`/reports/new?org=${org.id}&species=DOG&year=${fm.year}&month=${fm.month}`} />
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusCell report={cat} href={`/reports/new?org=${org.id}&species=CAT&year=${fm.year}&month=${fm.month}`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
