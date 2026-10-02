import { listOrganizations, listProfiles } from '@/lib/data/repo';
import { requireRole } from '@/lib/auth/session';
import { listAccountStatus, accountAdminReady } from '@/lib/auth/accounts';
import { SettingsTabs } from '../SettingsTabs';
import { UsersClient } from './UsersClient';

export default async function UsersPage() {
  const session = await requireRole('ADMIN');
  const [users, orgs, status] = await Promise.all([listProfiles(), listOrganizations(), listAccountStatus()]);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-800">設定</h1>
      </div>
      <SettingsTabs current="/settings/users" />
      <p className="mb-4 text-sm text-slate-500">
        ログインできる人を管理します。団体ユーザーは所属団体のデータだけを入力・閲覧できます。
      </p>
      <UsersClient users={users} orgs={orgs} status={status} selfId={session.userId} ready={accountAdminReady()} />
    </div>
  );
}
