// 提出の受付画面：受け付けた内容の控えと、次にやること
import Link from 'next/link';
import { CheckIcon } from '@/components/icons';
import { notFound } from 'next/navigation';
import { getReport, getOrganization, listReports } from '@/lib/data/repo';
import { requireRole } from '@/lib/auth/session';
import { canViewReport } from '@/lib/auth/policy';
import { checkBalance } from '@/lib/validation/balance';
import { expectedSpecies } from '@/lib/submissions';
import { SPECIES_LABEL } from '@/lib/masters';
import { ymLabel, formatNumber } from '@/lib/format';
import { Card, CardBody, buttonClass } from '@/components/ui';

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default async function SubmittedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole('ADMIN', 'ORG_USER');
  const report = await getReport(id);
  if (!report || !canViewReport(session, report)) notFound();
  const [org, sameMonth] = await Promise.all([
    getOrganization(report.organizationId),
    listReports({ organizationId: report.organizationId, year: report.year, month: report.month }),
  ]);
  const bal = checkBalance(report);
  const isOrgUser = session.role === 'ORG_USER';
  const label = `${ymLabel(report.year, report.month)}分（${SPECIES_LABEL[report.species]}）`;

  // 同じ月で、まだ提出していない種別
  const remaining = expectedSpecies(org ?? {}).filter((s) => {
    const r = sameMonth.find((x) => x.species === s);
    return !r || r.status === 'DRAFT';
  });
  const resubmitted = !!report.resubmittedAt && report.resubmittedAt >= (report.submittedAt ?? '');

  const rows: [string, string][] = [
    ['記録開始時の管理頭数', `${formatNumber(report.beginningCount)} 頭`],
    ['新規収容', `${formatNumber(bal.intakeTotal)} 頭`],
    ['転帰', `${formatNumber(bal.outcomeTotal)} 頭`],
    ['記録終了時の管理頭数', `${formatNumber(report.endingCount)} 頭`],
  ];

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckIcon size={26} /></div>
        <h1 className="text-2xl font-bold text-slate-800">{resubmitted ? '修正を受け付けました' : '提出を受け付けました'}</h1>
        <p className="mt-1 text-sm text-slate-500">{org?.name} ・ {label}</p>
      </div>

      <Card className="mb-6">
        <CardBody>
          <dl className="divide-y divide-slate-100 text-sm">
            <div className="flex justify-between py-2"><dt className="text-slate-500">受付日時</dt><dd className="text-slate-700">{formatDateTime(report.resubmittedAt ?? report.submittedAt)}</dd></div>
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between py-2"><dt className="text-slate-500">{k}</dt><dd className="tabular-nums text-slate-700">{v}</dd></div>
            ))}
            <div className="flex justify-between py-2">
              <dt className="text-slate-500">収支</dt>
              <dd className={bal.balanced ? 'text-emerald-700' : 'text-amber-700'}>
                {bal.balanced ? '一致しています' : `差分 ${bal.delta > 0 ? '+' : ''}${bal.delta}（事務局から確認のご連絡をする場合があります）`}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-400">
            事務局が内容を確認して「確定」します。確定までは、このレポートを開いて修正できます。
          </p>
        </CardBody>
      </Card>

      {remaining.length > 0 && (
        <Card className="mb-6 border-amber-200">
          <CardBody>
            <div className="text-sm font-semibold text-slate-700">{ymLabel(report.year, report.month)}分はあと {remaining.map((s) => SPECIES_LABEL[s]).join('・')} の報告が残っています</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {remaining.map((s) => {
                const draft = sameMonth.find((x) => x.species === s);
                const href = draft
                  ? `/reports/${draft.id}`
                  : `/reports/new?species=${s}&year=${report.year}&month=${report.month}${isOrgUser ? '' : `&org=${report.organizationId}`}`;
                return <Link key={s} href={href} className={buttonClass('primary', 'sm')}>{SPECIES_LABEL[s]}を入力する</Link>;
              })}
            </div>
          </CardBody>
        </Card>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        <Link href={isOrgUser ? '/' : '/submissions'} className={buttonClass(remaining.length > 0 ? 'secondary' : 'primary')}>
          {isOrgUser ? 'ホームに戻る' : '提出状況に戻る'}
        </Link>
        <Link href={`/reports/${report.id}`} className={buttonClass('ghost')}>内容を見る</Link>
      </div>
    </div>
  );
}
