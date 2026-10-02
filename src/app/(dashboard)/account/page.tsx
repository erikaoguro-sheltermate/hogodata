import { requireSession, authMode } from '@/lib/auth/session';
import { getOrganization } from '@/lib/data/repo';
import { Card, CardBody, SectionTitle } from '@/components/ui';
import { ROLE_LABEL } from '@/lib/masters';
import { PasswordForm } from './PasswordForm';

export default async function AccountPage() {
  const session = await requireSession();
  const org = session.organizationId ? await getOrganization(session.organizationId) : undefined;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">アカウント</h1>
        <p className="mt-1 text-sm text-slate-500">ログイン情報の確認とパスワードの変更</p>
      </div>

      <Card className="mb-6">
        <CardBody>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><dt className="text-xs text-slate-400">お名前</dt><dd className="mt-0.5 text-sm text-slate-700">{session.displayName}</dd></div>
            <div><dt className="text-xs text-slate-400">メールアドレス</dt><dd className="mt-0.5 text-sm text-slate-700">{session.email ?? '—'}</dd></div>
            <div><dt className="text-xs text-slate-400">権限</dt><dd className="mt-0.5 text-sm text-slate-700">{ROLE_LABEL[session.role]}</dd></div>
            {org && <div><dt className="text-xs text-slate-400">所属団体</dt><dd className="mt-0.5 text-sm text-slate-700">{org.name}</dd></div>}
          </dl>
          <p className="mt-4 text-xs text-slate-400">お名前・所属の変更は JASA事務局にご依頼ください。</p>
        </CardBody>
      </Card>

      <SectionTitle subtitle="事務局から受け取った初期パスワードは、最初のログイン後に変更してください">パスワードの変更</SectionTitle>
      <Card>
        <CardBody>
          {authMode() === 'supabase'
            ? <PasswordForm />
            : <p className="text-sm text-slate-500">デモ環境ではパスワードはありません。</p>}
        </CardBody>
      </Card>
    </div>
  );
}
