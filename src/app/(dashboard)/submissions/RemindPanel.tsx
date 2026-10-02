'use client';

import * as React from 'react';
import { Button, Card, CardBody } from '@/components/ui';

/** 未提出の団体への連絡文面。送信はメールソフトで行う（システムからは送らない）。 */
export function RemindPanel({ emails, missing, subject, body }: {
  emails: string[]; missing: string[]; subject: string; body: string;
}) {
  const [copied, setCopied] = React.useState<'emails' | 'body' | 'failed' | null>(null);
  async function copy(kind: 'emails' | 'body') {
    try {
      await navigator.clipboard.writeText(kind === 'emails' ? emails.join(', ') : `件名：${subject}\n\n${body}`);
      setCopied(kind);
    } catch {
      setCopied('failed');
    }
  }
  const mailto = `mailto:?bcc=${encodeURIComponent(emails.join(','))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <Card className="mt-6">
      <CardBody className="space-y-3">
        <div className="text-sm font-semibold text-slate-700">未提出の団体への連絡</div>
        <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">件名：{subject}{'\n\n'}{body}</pre>
        <div className="flex flex-wrap gap-2">
          {emails.length > 0 && (
            <a href={mailto} className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
              メールソフトで開く（BCC {emails.length} 件）
            </a>
          )}
          <Button size="sm" variant="secondary" onClick={() => copy('body')}>{copied === 'body' ? 'コピーしました' : '文面をコピー'}</Button>
          {emails.length > 0 && (
            <Button size="sm" variant="secondary" onClick={() => copy('emails')}>{copied === 'emails' ? 'コピーしました' : '宛先をコピー'}</Button>
          )}
        </div>
        {copied === 'failed' && <p className="text-xs text-red-600">コピーできませんでした。上の文章を選択してコピーしてください。</p>}
        {missing.length > 0 && (
          <p className="text-xs text-amber-700">
            連絡先メールが未登録の団体：{missing.join('、')}（団体マスタで登録できます）
          </p>
        )}
      </CardBody>
    </Card>
  );
}
