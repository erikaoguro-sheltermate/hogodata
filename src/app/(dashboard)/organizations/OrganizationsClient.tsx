'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardBody, Button, Badge, Field, Input, Select } from '@/components/ui';
import { PREFECTURES, ORG_TYPES, prefectureByCode } from '@/lib/masters';
import type { Organization } from '@/lib/types';
import { saveOrganizationAction, type OrgInput } from './actions';

const EMPTY: OrgInput = {
  name: '', prefectureCode: '13', orgType: 'NPO法人',
  contactName: '', contactEmail: '', isActive: true, notes: '',
};

export function OrganizationsClient({ organizations, canEdit }: { organizations: Organization[]; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<Organization | 'new' | null>(null);
  const [form, setForm] = React.useState<OrgInput>(EMPTY);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  function openNew() { setForm(EMPTY); setEditing('new'); setMsg(null); }
  function openEdit(o: Organization) {
    setForm({ name: o.name, prefectureCode: o.prefectureCode, orgType: o.orgType, contactName: o.contactName ?? '', contactEmail: o.contactEmail ?? '', isActive: o.isActive, notes: o.notes ?? '' });
    setEditing(o); setMsg(null);
  }

  async function save() {
    setBusy(true); setMsg(null);
    const res = await saveOrganizationAction(form, editing === 'new' ? undefined : (editing as Organization).id);
    setBusy(false);
    if (res.ok) { setEditing(null); router.refresh(); }
    else setMsg(res.message ?? '保存できませんでした。');
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">団体マスタ</h1>
          <p className="mt-1 text-sm text-slate-500">{organizations.length} 団体</p>
        </div>
        {canEdit && <Button onClick={openNew}>＋ 団体を追加</Button>}
      </div>

      {editing && (
        <Card className="mb-5 border-emerald-200">
          <CardBody>
            <h3 className="mb-4 text-base font-bold text-slate-800">{editing === 'new' ? '団体を追加' : '団体を編集'}</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="団体名" required>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="〇〇動物保護の会" />
              </Field>
              <Field label="所在都道府県" required>
                <Select value={form.prefectureCode} onChange={(e) => setForm({ ...form, prefectureCode: e.target.value })}>
                  {PREFECTURES.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
                </Select>
              </Field>
              <Field label="活動形態">
                <Select value={form.orgType} onChange={(e) => setForm({ ...form, orgType: e.target.value })}>
                  {ORG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </Field>
              <Field label="担当者名">
                <Input value={form.contactName ?? ''} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
              </Field>
              <Field label="連絡先メール">
                <Input type="email" value={form.contactEmail ?? ''} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
              </Field>
              <Field label="状態">
                <Select value={form.isActive ? '1' : '0'} onChange={(e) => setForm({ ...form, isActive: e.target.value === '1' })}>
                  <option value="1">有効</option>
                  <option value="0">無効</option>
                </Select>
              </Field>
            </div>
            {msg && <p className="mt-3 text-sm text-red-600">{msg}</p>}
            <div className="mt-4 flex gap-2">
              <Button onClick={save} disabled={busy}>{busy ? '保存中…' : '保存'}</Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>キャンセル</Button>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">団体名</th>
                <th className="px-4 py-3 font-medium">都道府県</th>
                <th className="px-4 py-3 font-medium">活動形態</th>
                <th className="px-4 py-3 font-medium">担当者</th>
                <th className="px-4 py-3 font-medium">状態</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((o) => (
                <tr key={o.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/organizations/${o.id}`} className="text-slate-700 hover:text-emerald-700 hover:underline">{o.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{prefectureByCode(o.prefectureCode)?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{o.orgType}</td>
                  <td className="px-4 py-3 text-slate-500">{o.contactName || '—'}</td>
                  <td className="px-4 py-3">{o.isActive ? <Badge color="green">有効</Badge> : <Badge color="slate">無効</Badge>}</td>
                  <td className="px-4 py-3 text-right">
                    {canEdit && <button onClick={() => openEdit(o)} className="text-sm font-medium text-emerald-700 hover:underline">編集</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
