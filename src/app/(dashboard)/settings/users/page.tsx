import { listOrganizations } from '@/lib/data/repo';
import { Card, CardBody, Badge, SectionTitle } from '@/components/ui';

const ROLES = [
  { role: 'ADMIN', label: '事務局管理者', desc: '全団体のデータ代行入力・編集、団体/ユーザー管理、全国集計、レポート出力' },
  { role: 'ORG_USER', label: '団体ユーザー', desc: '自団体のデータ入力・閲覧（Phase 2〜）' },
  { role: 'VIEWER', label: '閲覧者', desc: '集計ダッシュボードの閲覧のみ（編集不可）' },
];

export default async function UsersPage() {
  const orgs = await listOrganizations();
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">ユーザー・権限</h1>
        <p className="mt-1 text-sm text-slate-500">ロールと所属団体を管理します（本番は Supabase Auth でメール招待）。</p>
      </div>

      <SectionTitle>ロール定義</SectionTitle>
      <Card className="mb-6"><CardBody className="space-y-3">
        {ROLES.map((r) => (
          <div key={r.role} className="flex items-start gap-3">
            <Badge color={r.role === 'ADMIN' ? 'green' : r.role === 'ORG_USER' ? 'blue' : 'slate'}>{r.label}</Badge>
            <p className="text-sm text-slate-600">{r.desc}</p>
          </div>
        ))}
      </CardBody></Card>

      <SectionTitle subtitle="団体ユーザーは所属団体のデータのみアクセスできます（匿名性担保）">団体とアクセス境界</SectionTitle>
      <Card><CardBody className="p-0">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 text-left text-xs text-slate-500">
            <th className="px-4 py-2.5 font-medium">団体</th><th className="px-4 py-2.5 font-medium">アクセス範囲</th>
          </tr></thead>
          <tbody>
            {orgs.map((o) => (
              <tr key={o.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2.5 text-slate-700">{o.name}</td>
                <td className="px-4 py-2.5 text-slate-500">自団体のレポートのみ</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody></Card>

      <p className="mt-4 text-xs text-slate-400">※ メール招待・ロール付与の実装は Supabase Auth 連携時（M1）に有効化されます。</p>
    </div>
  );
}
