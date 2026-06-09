'use client';

import { useRouter } from 'next/navigation';
import { Card, CardBody, Button } from '@/components/ui';
import type { Role } from '@/lib/types';

const ROLES: { role: Role; label: string; desc: string }[] = [
  { role: 'ADMIN', label: 'JASA事務局として入る', desc: '全団体の代行入力・集計・管理' },
  { role: 'ORG_USER', label: '団体ユーザーとして入る', desc: '自団体のデータ入力・閲覧' },
  { role: 'VIEWER', label: '閲覧者として入る', desc: '集計ダッシュボードの閲覧のみ' },
];

export default function LoginPage() {
  const router = useRouter();
  function enter(role: Role) {
    document.cookie = `jasa_role=${role}; path=/; max-age=31536000`;
    router.push('/');
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 to-slate-50 p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-2xl">🐾</div>
          <h1 className="text-xl font-bold text-slate-800">JASA Data Hub</h1>
          <p className="mt-1 text-sm text-slate-500">どうぶつ保護データプロジェクト</p>
        </div>
        <Card>
          <CardBody className="space-y-3">
            <p className="text-center text-xs text-slate-400">
              デモ環境です。本番は Supabase Auth（メール / マジックリンク）でログインします。
            </p>
            {ROLES.map((r) => (
              <button key={r.role} onClick={() => enter(r.role)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50">
                <div className="text-sm font-semibold text-slate-700">{r.label}</div>
                <div className="text-xs text-slate-400">{r.desc}</div>
              </button>
            ))}
            <Button className="w-full" onClick={() => enter('ADMIN')}>事務局でそのまま開始</Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
