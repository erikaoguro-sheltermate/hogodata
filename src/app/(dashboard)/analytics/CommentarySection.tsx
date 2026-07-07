'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, Button, SectionTitle } from '@/components/ui';
import { saveNoteAction } from './actions';

export function CommentarySection({
  noteKey, savedBody, draft, canEdit,
}: {
  noteKey: string;
  savedBody: string | null;
  draft: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = React.useState(savedBody ?? draft);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);

  // フィルタ変更で内容が変わったら追従（未編集時のみ）
  React.useEffect(() => {
    if (!editing) setBody(savedBody ?? draft);
  }, [savedBody, draft, editing]);

  async function save() {
    setSaving(true); setMsg(null);
    const res = await saveNoteAction(noteKey, body);
    setSaving(false);
    if (res.ok) { setEditing(false); setMsg('保存しました'); router.refresh(); }
    else setMsg(res.message ?? '保存できませんでした');
  }

  return (
    <div className="mt-8">
      <SectionTitle subtitle="数字から見えることのまとめ（事務局が加筆・修正できます）">考察・コメント</SectionTitle>
      <Card>
        <CardBody>
          {canEdit && editing ? (
            <>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={7}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-relaxed outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button onClick={save} disabled={saving}>{saving ? '保存中…' : '保存'}</Button>
                <Button variant="secondary" onClick={() => setBody(draft)}>自動文面を挿入</Button>
                <Button variant="ghost" onClick={() => { setEditing(false); setBody(savedBody ?? draft); }}>キャンセル</Button>
                {msg && <span className="text-sm text-emerald-600">{msg}</span>}
              </div>
            </>
          ) : (
            <>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {(savedBody ?? draft) || '—'}
              </div>
              {!savedBody && <p className="mt-2 text-xs text-amber-600">※ 自動生成の下書きです（未保存）。</p>}
              {canEdit && (
                <div className="mt-3">
                  <Button variant="secondary" size="sm" onClick={() => { setEditing(true); setBody(savedBody ?? draft); }}>
                    ✎ 加筆・修正する
                  </Button>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
