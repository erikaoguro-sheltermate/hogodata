'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import type { Role } from '@/lib/types';

const ROLES: { role: Role; label: string; desc: string }[] = [
  { role: 'ADMIN', label: 'JASA事務局として入る', desc: '全団体の代行入力・集計・管理' },
  { role: 'ORG_USER', label: '団体ユーザーとして入る', desc: '自団体のデータ入力・閲覧' },
  { role: 'VIEWER', label: '閲覧者として入る', desc: '集計ダッシュボードの閲覧のみ' },
];

export function DemoRoleButtons() {
  const router = useRouter();
  function enter(role: Role) {
    document.cookie = `jasa_role=${role}; path=/; max-age=31536000`;
    router.push('/');
  }
  return (
    <div className="space-y-3">
      <p className="text-center text-xs text-slate-400">
        デモ環境です。本番は共有パスワードまたは Supabase Auth でログインします。
      </p>
      {ROLES.map((r) => (
        <button key={r.role} onClick={() => enter(r.role)}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50">
          <div className="text-sm font-semibold text-slate-700">{r.label}</div>
          <div className="text-xs text-slate-400">{r.desc}</div>
        </button>
      ))}
      <Button className="w-full" onClick={() => enter('ADMIN')}>事務局でそのまま開始</Button>
    </div>
  );
}
