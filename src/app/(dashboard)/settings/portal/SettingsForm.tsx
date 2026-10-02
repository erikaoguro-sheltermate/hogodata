'use client';

import * as React from 'react';
import { Button, Field, Input, Select } from '@/components/ui';
import type { PortalSettings } from '@/lib/types';
import { saveSettingsAction } from './actions';

export function SettingsForm({ initial }: { initial: PortalSettings }) {
  const [day, setDay] = React.useState(initial.deadlineDay);
  const [email, setEmail] = React.useState(initial.contactEmail);
  const [note, setNote] = React.useState(initial.contactNote);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await saveSettingsAction({ deadlineDay: day, contactEmail: email, contactNote: note });
    setBusy(false);
    setMsg({ ok: res.ok, text: res.message });
  }

  return (
    <form onSubmit={submit} className="max-w-lg space-y-5">
      <Field label="毎月の提出期限" required hint="対象月の翌月のこの日までに提出してもらいます（例：9月分 → 10月10日）">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">翌月</span>
          <Select value={day} onChange={(e) => setDay(Number(e.target.value))} className="w-24">
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}日</option>)}
          </Select>
          <span className="text-sm text-slate-600">まで</span>
        </div>
      </Field>
      <Field label="問い合わせ先メールアドレス" hint="ヘルプとログイン画面に表示されます。空欄なら表示しません">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="data@example.org" />
      </Field>
      <Field label="問い合わせ先の補足" hint="受付時間・担当者名など（200文字まで）">
        <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="平日 10:00〜17:00 / 担当：データ担当" />
      </Field>
      {msg && (
        <p role="status" className={msg.ok ? 'rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700' : 'rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600'}>
          {msg.text}
        </p>
      )}
      <Button type="submit" disabled={busy}>{busy ? '保存中…' : '保存する'}</Button>
    </form>
  );
}
