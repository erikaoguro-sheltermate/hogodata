import Link from 'next/link';
import { listAudit } from '@/lib/data/repo';
import { requireRole } from '@/lib/auth/session';
import { Card, CardBody, Badge } from '@/components/ui';
import type { AuditAction } from '@/lib/types';

const ACTION_LABEL: Record<AuditAction, string> = {
  CREATE: '作成', UPDATE: '更新', DELETE: '削除', SUBMIT: '提出', CONFIRM: '確定', REOPEN: '差し戻し',
};
const ACTION_COLOR: Record<AuditAction, 'slate' | 'green' | 'blue' | 'amber' | 'red'> = {
  CREATE: 'green', UPDATE: 'slate', DELETE: 'red', SUBMIT: 'blue', CONFIRM: 'green', REOPEN: 'amber',
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default async function AuditPage() {
  await requireRole('ADMIN');
  const entries = await listAudit(200);

  return (
    <div>
      <div className="mb-6">
        <Link href="/settings/users" className="text-sm text-slate-400 hover:text-slate-600">← ユーザー・権限</Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-800">変更履歴</h1>
        <p className="mt-1 text-sm text-slate-500">誰がいつ何をしたか（直近 200 件）</p>
      </div>
      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">日時</th>
                <th className="px-4 py-3 font-medium">操作した人</th>
                <th className="px-4 py-3 font-medium">操作</th>
                <th className="px-4 py-3 font-medium">内容</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">まだ記録がありません</td></tr>
              )}
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-slate-100 last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-500">{formatDateTime(e.createdAt)}</td>
                  <td className="px-4 py-3 text-slate-700">{e.actorName}</td>
                  <td className="px-4 py-3"><Badge color={ACTION_COLOR[e.action] ?? 'slate'}>{ACTION_LABEL[e.action] ?? e.action}</Badge></td>
                  <td className="px-4 py-3 text-slate-600">
                    {e.entity === 'MonthlyReport'
                      ? <Link href={`/reports/${e.entityId}`} className="hover:text-emerald-700 hover:underline">{e.summary ?? e.entityId}</Link>
                      : (e.summary ?? `${e.entity} ${e.entityId}`)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
