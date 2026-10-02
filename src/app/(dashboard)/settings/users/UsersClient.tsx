'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, Badge, Button, Field, Input, Select } from '@/components/ui';
import { ROLE_LABEL } from '@/lib/masters';
import { formatDate } from '@/lib/format';
import type { Organization, Role, UserProfile } from '@/lib/types';
import type { AccountStatus } from '@/lib/auth/accounts';
import { createUserAction, updateUserAction, resetPasswordAction, setSuspendedAction } from './actions';

const ROLE_COLOR: Record<Role, 'green' | 'blue' | 'slate'> = { ADMIN: 'green', ORG_USER: 'blue', VIEWER: 'slate' };

interface Props {
  users: UserProfile[];
  orgs: Organization[];
  status: Record<string, AccountStatus>;
  selfId: string;
  ready: boolean;
}

/** 初期パスワードは一度だけ表示する（保存しない） */
function PasswordNotice({ email, password, onClose }: { email: string; password: string; onClose: () => void }) {
  const [copied, setCopied] = React.useState(false);
  const text = `どうぶつ保護データプロジェクト ログイン情報\nURL: ${window.location.origin}/login\nメールアドレス: ${email}\n初期パスワード: ${password}\n※ログイン後「アカウント」からパスワードを変更してください。`;
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }
  return (
    <Card className="mb-6 border-2 border-emerald-300">
      <CardBody className="space-y-3">
        <div className="text-sm font-semibold text-emerald-800">ログイン情報を発行しました</div>
        <p className="text-sm text-slate-600">
          この画面を閉じると初期パスワードは二度と表示されません。下の内容をコピーして、ご本人に伝えてください。
        </p>
        <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">{text}</pre>
        <div className="flex gap-2">
          <Button size="sm" onClick={copy}>{copied ? 'コピーしました' : 'まとめてコピー'}</Button>
          <Button size="sm" variant="ghost" onClick={onClose}>閉じる</Button>
        </div>
      </CardBody>
    </Card>
  );
}

function RoleOrgFields({ role, setRole, orgId, setOrgId, orgs }: {
  role: Role; setRole: (r: Role) => void; orgId: string; setOrgId: (v: string) => void; orgs: Organization[];
}) {
  return (
    <>
      <Field label="権限" required>
        <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="ORG_USER">{ROLE_LABEL.ORG_USER}（自団体のみ）</option>
          <option value="ADMIN">{ROLE_LABEL.ADMIN}（全団体）</option>
          <option value="VIEWER">{ROLE_LABEL.VIEWER}（集計のみ）</option>
        </Select>
      </Field>
      {role === 'ORG_USER' && (
        <Field label="所属団体" required>
          <Select value={orgId} onChange={(e) => setOrgId(e.target.value)} required>
            <option value="">選択してください</option>
            {orgs.filter((o) => o.isActive).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </Select>
        </Field>
      )}
    </>
  );
}

function NewUserForm({ orgs, onCreated, onCancel }: {
  orgs: Organization[]; onCreated: (email: string, password: string) => void; onCancel: () => void;
}) {
  const [email, setEmail] = React.useState('');
  const [name, setName] = React.useState('');
  const [role, setRole] = React.useState<Role>('ORG_USER');
  const [orgId, setOrgId] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await createUserAction({ email, displayName: name, role, organizationId: orgId || null });
    setBusy(false);
    if (!res.ok) { setError(res.message); return; }
    onCreated(email.trim().toLowerCase(), res.password ?? '');
  }

  return (
    <Card className="mb-6">
      <CardBody>
        <form onSubmit={submit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="メールアドレス" required>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </Field>
          <Field label="お名前" required hint="例：山田 花子（あおぞら動物保護ネット）">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <RoleOrgFields role={role} setRole={setRole} orgId={orgId} setOrgId={setOrgId} orgs={orgs} />
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 md:col-span-2">{error}</p>}
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={busy}>{busy ? '作成中…' : '作成して初期パスワードを発行'}</Button>
            <Button type="button" variant="ghost" onClick={onCancel}>キャンセル</Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

function EditRow({ user, orgs, onDone }: { user: UserProfile; orgs: Organization[]; onDone: () => void }) {
  const router = useRouter();
  const [name, setName] = React.useState(user.displayName);
  const [role, setRole] = React.useState<Role>(user.role);
  const [orgId, setOrgId] = React.useState(user.organizationId ?? '');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await updateUserAction(user.id, { displayName: name, role, organizationId: orgId || null });
    setBusy(false);
    if (!res.ok) { setError(res.message); return; }
    onDone();
    router.refresh();
  }

  return (
    <tr className="border-b border-slate-100 bg-slate-50">
      <td colSpan={4} className="px-4 py-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="お名前" required><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <RoleOrgFields role={role} setRole={setRole} orgId={orgId} setOrgId={setOrgId} orgs={orgs} />
        </div>
        {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={save} disabled={busy}>保存</Button>
          <Button size="sm" variant="ghost" onClick={onDone}>キャンセル</Button>
        </div>
      </td>
    </tr>
  );
}

export function UsersClient({ users, orgs, status, selfId, ready }: Props) {
  const router = useRouter();
  const [adding, setAdding] = React.useState(false);
  const [editing, setEditing] = React.useState<string | null>(null);
  const [issued, setIssued] = React.useState<{ email: string; password: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState('');

  const orgName = (id: string | null) => orgs.find((o) => o.id === id)?.name ?? '—';
  const q = query.trim().toLowerCase();
  const shown = q
    ? users.filter((u) => [u.displayName, u.email, orgName(u.organizationId)].some((s) => s.toLowerCase().includes(q)))
    : users;

  async function reset(u: UserProfile) {
    if (!window.confirm(`${u.displayName} さんのパスワードを再発行します。今のパスワードは使えなくなります。よろしいですか？`)) return;
    setBusyId(u.id);
    setError(null);
    const res = await resetPasswordAction(u.id);
    setBusyId(null);
    if (!res.ok) { setError(res.message); return; }
    setIssued({ email: u.email, password: res.password ?? '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function toggleSuspend(u: UserProfile, suspended: boolean) {
    const verb = suspended ? '停止' : '再開';
    if (suspended && !window.confirm(`${u.displayName} さんの利用を停止します。ログインできなくなります。よろしいですか？`)) return;
    setBusyId(u.id);
    setError(null);
    const res = await setSuspendedAction(u.id, suspended);
    setBusyId(null);
    if (!res.ok) { setError(`${verb}できませんでした：${res.message}`); return; }
    router.refresh();
  }

  return (
    <div>
      {!ready && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          サーバーに <code>SUPABASE_SERVICE_ROLE_KEY</code> が設定されていないため、ユーザーの追加・パスワード再発行・停止はできません。
        </p>
      )}

      {issued && <PasswordNotice email={issued.email} password={issued.password} onClose={() => setIssued(null)} />}

      {adding ? (
        <NewUserForm
          orgs={orgs}
          onCancel={() => setAdding(false)}
          onCreated={(email, password) => { setAdding(false); setIssued({ email, password }); router.refresh(); }}
        />
      ) : (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Input
            type="search" placeholder="名前・メール・団体で検索" value={query}
            onChange={(e) => setQuery(e.target.value)} className="max-w-xs" aria-label="ユーザーを検索"
          />
          <Button onClick={() => { setAdding(true); setIssued(null); }} disabled={!ready}>＋ ユーザーを追加</Button>
        </div>
      )}

      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="whitespace-nowrap border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">お名前 / メール</th>
                <th className="px-4 py-3 font-medium">権限 / 所属</th>
                <th className="px-4 py-3 font-medium">状態</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">ユーザーがいません</td></tr>
              )}
              {shown.map((u) => {
                const st = status[u.id];
                const suspended = !!st?.suspended;
                const isSelf = u.id === selfId;
                if (editing === u.id) return <EditRow key={u.id} user={u} orgs={orgs} onDone={() => setEditing(null)} />;
                return (
                  <tr key={u.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-700">{u.displayName}{isSelf && <span className="ml-1 text-xs text-slate-400">（あなた）</span>}</div>
                      <div className="text-xs text-slate-400">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={ROLE_COLOR[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                      {u.role === 'ORG_USER' && <div className="mt-1 text-xs text-slate-500">{orgName(u.organizationId)}</div>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {suspended ? <Badge color="red">停止中</Badge> : <Badge color="green">利用中</Badge>}
                      <div className="mt-1 text-xs text-slate-400">最終ログイン {st?.lastSignInAt ? formatDate(st.lastSignInAt) : 'なし'}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(u.id)}>編集</Button>
                        <Button size="sm" variant="ghost" onClick={() => reset(u)} disabled={!ready || busyId === u.id}>パスワード再発行</Button>
                        {!isSelf && (
                          suspended
                            ? <Button size="sm" variant="secondary" onClick={() => toggleSuspend(u, false)} disabled={!ready || busyId === u.id}>再開</Button>
                            : <Button size="sm" variant="danger" onClick={() => toggleSuspend(u, true)} disabled={!ready || busyId === u.id}>停止</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
