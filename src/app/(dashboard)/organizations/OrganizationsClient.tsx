'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardBody, Button, Badge, Field, Input, Select } from '@/components/ui';
import {
  PREFECTURES, ORG_TYPES, prefectureByCode,
  ANIMAL_HANDLING_OPTIONS, ANIMAL_KINDS, ACTIVITY_OPTIONS,
} from '@/lib/masters';
import type { Organization, AnimalKind } from '@/lib/types';
import { saveOrganizationAction, type OrgInput } from './actions';

const EMPTY: OrgInput = {
  name: '', prefectureCode: '13', orgType: 'NPO法人',
  contactName: '', contactEmail: '', isActive: true, notes: '',
  establishedYear: null, animalHandling: '', animalTypes: [],
  memberCount: null, volunteerCount: null, avgAnimalsManaged: null,
  partnerMunicipalities: '', hasPartnerOrgs: null, activities: [],
};

// 数値入力 → number | null
function num(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Math.trunc(Number(v));
  return Number.isNaN(n) ? null : Math.max(0, n);
}

export function OrganizationsClient({ organizations, canEdit }: { organizations: Organization[]; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<Organization | 'new' | null>(null);
  const [form, setForm] = React.useState<OrgInput>(EMPTY);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [customActivity, setCustomActivity] = React.useState('');

  function openNew() { setForm(EMPTY); setEditing('new'); setMsg(null); }
  function openEdit(o: Organization) {
    setForm({
      name: o.name, prefectureCode: o.prefectureCode, orgType: o.orgType,
      contactName: o.contactName ?? '', contactEmail: o.contactEmail ?? '', isActive: o.isActive, notes: o.notes ?? '',
      establishedYear: o.establishedYear ?? null, animalHandling: o.animalHandling ?? '', animalTypes: o.animalTypes ?? [],
      memberCount: o.memberCount ?? null, volunteerCount: o.volunteerCount ?? null, avgAnimalsManaged: o.avgAnimalsManaged ?? null,
      partnerMunicipalities: o.partnerMunicipalities ?? '', hasPartnerOrgs: o.hasPartnerOrgs ?? null, activities: o.activities ?? [],
    });
    setEditing(o); setMsg(null);
  }

  function toggleAnimal(kind: AnimalKind) {
    const cur = form.animalTypes ?? [];
    setForm({ ...form, animalTypes: cur.includes(kind) ? cur.filter((k) => k !== kind) : [...cur, kind] });
  }
  function toggleActivity(a: string) {
    const cur = form.activities ?? [];
    setForm({ ...form, activities: cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a] });
  }
  function addCustomActivity() {
    const v = customActivity.trim();
    if (!v) return;
    const cur = form.activities ?? [];
    if (!cur.includes(v)) setForm({ ...form, activities: [...cur, v] });
    setCustomActivity('');
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

            {/* 団体プロフィール */}
            <div className="mt-6 border-t border-slate-100 pt-5">
              <h4 className="mb-4 text-sm font-bold text-slate-700">団体プロフィール</h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field label="活動開始年">
                  <Input type="number" min={1900} max={2027} value={form.establishedYear ?? ''} placeholder="2015"
                    onChange={(e) => setForm({ ...form, establishedYear: num(e.target.value) })} />
                </Field>
                <Field label="動物取扱業">
                  <Select value={form.animalHandling ?? ''} onChange={(e) => setForm({ ...form, animalHandling: e.target.value })}>
                    <option value="">未選択</option>
                    {ANIMAL_HANDLING_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </Select>
                </Field>
                <Field label="連携民間団体">
                  <Select value={form.hasPartnerOrgs === null || form.hasPartnerOrgs === undefined ? '' : form.hasPartnerOrgs ? '1' : '0'}
                    onChange={(e) => setForm({ ...form, hasPartnerOrgs: e.target.value === '' ? null : e.target.value === '1' })}>
                    <option value="">未選択</option>
                    <option value="1">あり</option>
                    <option value="0">なし</option>
                  </Select>
                </Field>
                <Field label="正規メンバー（人）">
                  <Input type="number" min={0} value={form.memberCount ?? ''} onChange={(e) => setForm({ ...form, memberCount: num(e.target.value) })} />
                </Field>
                <Field label="ボランティア（人）">
                  <Input type="number" min={0} value={form.volunteerCount ?? ''} onChange={(e) => setForm({ ...form, volunteerCount: num(e.target.value) })} />
                </Field>
                <Field label="平均管理頭数">
                  <Input type="number" min={0} value={form.avgAnimalsManaged ?? ''} onChange={(e) => setForm({ ...form, avgAnimalsManaged: num(e.target.value) })} />
                </Field>
              </div>

              <div className="mt-4">
                <Field label="連携している自治体" hint="複数ある場合は読点で区切る（例：鹿児島県、鹿児島市）">
                  <Input value={form.partnerMunicipalities ?? ''} onChange={(e) => setForm({ ...form, partnerMunicipalities: e.target.value })} />
                </Field>
              </div>

              <div className="mt-4">
                <span className="mb-2 block text-sm font-medium text-slate-700">保護している動物種</span>
                <div className="flex flex-wrap gap-2">
                  {ANIMAL_KINDS.map((k) => {
                    const on = (form.animalTypes ?? []).includes(k.code);
                    return (
                      <button type="button" key={k.code} onClick={() => toggleAnimal(k.code)}
                        className={on ? 'rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white' : 'rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200'}>
                        {k.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4">
                <span className="mb-2 block text-sm font-medium text-slate-700">主な活動内容（複数選択可・自由記入も可）</span>
                <div className="flex flex-wrap gap-2">
                  {ACTIVITY_OPTIONS.map((a) => {
                    const on = (form.activities ?? []).includes(a);
                    return (
                      <button type="button" key={a} onClick={() => toggleActivity(a)}
                        className={on ? 'rounded-full bg-sky-600 px-3 py-1.5 text-sm font-medium text-white' : 'rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200'}>
                        {a}
                      </button>
                    );
                  })}
                  {/* プリセット外（自由記入で追加された）活動 */}
                  {(form.activities ?? []).filter((a) => !ACTIVITY_OPTIONS.includes(a)).map((a) => (
                    <button type="button" key={a} onClick={() => toggleActivity(a)}
                      className="inline-flex items-center gap-1 rounded-full bg-sky-600 px-3 py-1.5 text-sm font-medium text-white">
                      {a} <span className="text-sky-200">×</span>
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <Input value={customActivity} placeholder="その他の活動を自由に入力"
                    onChange={(e) => setCustomActivity(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomActivity(); } }} />
                  <Button type="button" variant="secondary" size="sm" onClick={addCustomActivity}>追加</Button>
                </div>
              </div>
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
