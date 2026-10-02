'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, Badge, Button, Field, Input } from '@/components/ui';
import { formatDate } from '@/lib/format';
import type { Announcement } from '@/lib/types';
import { saveAnnouncementAction, deleteAnnouncementAction, markReadAction } from './actions';

const textareaCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

function Editor({ initial, onDone }: { initial?: Announcement; onDone: () => void }) {
  const router = useRouter();
  const [title, setTitle] = React.useState(initial?.title ?? '');
  const [body, setBody] = React.useState(initial?.body ?? '');
  const [pinned, setPinned] = React.useState(initial?.pinned ?? false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await saveAnnouncementAction({ title, body, pinned }, initial?.id);
    setBusy(false);
    if (!res.ok) { setError(res.message); return; }
    onDone();
    router.refresh();
  }

  return (
    <Card className="mb-6 border-2 border-emerald-200">
      <CardBody>
        <form onSubmit={save} className="space-y-4">
          <Field label="タイトル" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus maxLength={120} />
          </Field>
          <Field label="本文" required hint="改行はそのまま表示されます">
            <textarea value={body} onChange={(e) => setBody(e.target.value)} required rows={6} className={textareaCls} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
            重要（一覧の一番上に固定し、団体のホームで目立たせる）
          </label>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>{busy ? '保存中…' : initial ? '更新する' : '公開する'}</Button>
            <Button type="button" variant="ghost" onClick={onDone}>キャンセル</Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

export function AnnouncementsClient({ items, unreadIds, canEdit }: { items: Announcement[]; unreadIds: string[]; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<string | 'new' | null>(null);
  // 開いた時点の未読表示は残し、裏で既読にする
  const [newIds] = React.useState(() => new Set(unreadIds));
  React.useEffect(() => {
    if (unreadIds.length > 0) markReadAction(unreadIds).then(() => router.refresh());
    // 初回のみ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function remove(a: Announcement) {
    if (!window.confirm(`お知らせ「${a.title}」を削除します。よろしいですか？`)) return;
    await deleteAnnouncementAction(a.id, a.title);
    router.refresh();
  }

  return (
    <div>
      {canEdit && editing === null && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setEditing('new')}>＋ お知らせを書く</Button>
        </div>
      )}
      {editing === 'new' && <Editor onDone={() => setEditing(null)} />}

      {items.length === 0 && (
        <Card><CardBody><p className="py-6 text-center text-sm text-slate-400">お知らせはまだありません</p></CardBody></Card>
      )}

      <div className="space-y-4">
        {items.map((a) => editing === a.id ? (
          <Editor key={a.id} initial={a} onDone={() => setEditing(null)} />
        ) : (
          <Card key={a.id} className={a.pinned ? 'border-amber-200' : undefined}>
            <CardBody>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    {a.pinned && <Badge color="amber">重要</Badge>}
                    {newIds.has(a.id) && <Badge color="red">NEW</Badge>}
                    <span className="text-xs text-slate-400">{formatDate(a.publishedAt)}</span>
                  </div>
                  <h2 className="mt-1 text-base font-bold text-slate-800">{a.title}</h2>
                </div>
                {canEdit && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(a.id)}>編集</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(a)}>削除</Button>
                  </div>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{a.body}</p>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
