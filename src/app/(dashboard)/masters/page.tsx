import { Card, CardBody, Badge, SectionTitle } from '@/components/ui';
import { INTAKE_CATEGORIES, OUTCOME_CATEGORIES, AGE_GROUPS, REGION_OPTIONS } from '@/lib/masters';

export default function MastersPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">マスタ管理</h1>
        <p className="mt-1 text-sm text-slate-500">
          収容/転帰カテゴリー・年齢区分・地域区分。様式改訂に備え将来編集可能にします（現在は閲覧）。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <SectionTitle>収容カテゴリー</SectionTitle>
          <Card><CardBody className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-4 py-2.5 font-medium">名称</th><th className="px-4 py-2.5 font-medium">地域区分</th><th className="px-4 py-2.5 font-medium">種別</th>
              </tr></thead>
              <tbody>
                {INTAKE_CATEGORIES.map((c) => (
                  <tr key={c.code} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5 text-slate-700">{c.name}</td>
                    <td className="px-4 py-2.5">{c.requiresRegion ? <Badge color="blue">あり</Badge> : <span className="text-slate-400">—</span>}</td>
                    <td className="px-4 py-2.5">{c.species === 'CAT' ? <Badge color="amber">猫のみ</Badge> : <span className="text-slate-400">共通</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody></Card>
        </div>

        <div>
          <SectionTitle>転帰カテゴリー</SectionTitle>
          <Card><CardBody className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-4 py-2.5 font-medium">名称</th><th className="px-4 py-2.5 font-medium">生存</th><th className="px-4 py-2.5 font-medium">地域</th><th className="px-4 py-2.5 font-medium">種別</th>
              </tr></thead>
              <tbody>
                {OUTCOME_CATEGORIES.map((c) => (
                  <tr key={c.code} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5 text-slate-700">{c.name}</td>
                    <td className="px-4 py-2.5">{c.isLiveOutcome ? <Badge color="green">生存</Badge> : <Badge color="red">非生存</Badge>}</td>
                    <td className="px-4 py-2.5">{c.requiresRegion ? <Badge color="blue">あり</Badge> : <span className="text-slate-400">—</span>}</td>
                    <td className="px-4 py-2.5">{c.species === 'CAT' ? <Badge color="amber">猫のみ</Badge> : <span className="text-slate-400">共通</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody></Card>
        </div>

        <div>
          <SectionTitle>年齢区分</SectionTitle>
          <Card><CardBody>
            <ul className="space-y-2">
              {AGE_GROUPS.map((a) => <li key={a.code} className="flex justify-between text-sm"><span className="text-slate-700">{a.name}</span><span className="font-mono text-xs text-slate-400">{a.code}</span></li>)}
            </ul>
          </CardBody></Card>
        </div>

        <div>
          <SectionTitle>地域区分</SectionTitle>
          <Card><CardBody>
            <ul className="space-y-2">
              {REGION_OPTIONS.map((r) => <li key={r.code} className="flex justify-between text-sm"><span className="text-slate-700">{r.name}</span><span className="font-mono text-xs text-slate-400">{r.code}</span></li>)}
            </ul>
          </CardBody></Card>
        </div>
      </div>
    </div>
  );
}
