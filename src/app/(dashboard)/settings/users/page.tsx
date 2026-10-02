import Link from 'next/link';
import { listOrganizations, listProfiles } from '@/lib/data/repo';
import { requireRole } from '@/lib/auth/session';
import { listAccountStatus, accountAdminReady } from '@/lib/auth/accounts';
import { buttonClass } from '@/components/ui';
import { UsersClient } from './UsersClient';

export default async function UsersPage() {
  const session = await requireRole('ADMIN');
  const [users, orgs, status] = await Promise.all([listProfiles(), listOrganizations(), listAccountStatus()]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ユーザー・権限</h1>
          <p className="mt-1 text-sm text-slate-500">
            ログインできる人を管理します。団体ユーザーは所属団体のデータだけを入力・閲覧できます。
          </p>
        </div>
        <Link href="/settings/audit" className={buttonClass('secondary', 'sm')}>変更履歴を見る</Link>
      </div>
      <UsersClient users={users} orgs={orgs} status={status} selfId={session.userId} ready={accountAdminReady()} />
    </div>
  );
}
