'use client';

import * as React from 'react';
import { Button, Field } from '@/components/ui';
import { MIN_PASSWORD_LENGTH } from '@/lib/auth/policy';
import { changePasswordAction } from './actions';

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

export function PasswordForm() {
  const [current, setCurrent] = React.useState('');
  const [next, setNext] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next !== confirm) {
      setMsg({ ok: false, text: '新しいパスワード（確認）が一致しません。' });
      return;
    }
    setBusy(true);
    const res = await changePasswordAction(current, next);
    setBusy(false);
    setMsg({ ok: res.ok, text: res.message });
    if (res.ok) { setCurrent(''); setNext(''); setConfirm(''); }
  }

  return (
    <form onSubmit={submit} className="max-w-sm space-y-4">
      <Field label="現在のパスワード" required>
        <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" className={inputCls} />
      </Field>
      <Field label="新しいパスワード" required hint={`${MIN_PASSWORD_LENGTH} 文字以上・英字と数字を含める`}>
        <input type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" className={inputCls} />
      </Field>
      <Field label="新しいパスワード（確認）" required>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" className={inputCls} />
      </Field>
      {msg && (
        <p role="status" className={msg.ok ? 'rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700' : 'rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600'}>
          {msg.text}
        </p>
      )}
      <Button type="submit" disabled={busy}>{busy ? '変更中…' : 'パスワードを変更する'}</Button>
    </form>
  );
}
