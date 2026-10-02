'use server';

import { revalidatePath } from 'next/cache';
import { saveReport, setReportStatus, deleteReport, getReport, findReport, getOrganization, recordAudit, patchReportMeta } from '@/lib/data/repo';
import { validateReport, type ValidationIssue } from '@/lib/validation';
import { getSession, isAdmin } from '@/lib/auth/session';
import { canEditReport, canWriteForOrg } from '@/lib/auth/policy';
import { SPECIES_LABEL } from '@/lib/masters';
import { ymLabel } from '@/lib/format';
import type { MonthlyReport, ReportInput, Species } from '@/lib/types';

export interface SaveResult {
  ok: boolean;
  id?: string;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

function fail(rule: string, message: string): SaveResult {
  return { ok: false, errors: [{ rule, severity: 'error', message }], warnings: [] };
}

async function label(r: Pick<MonthlyReport, 'organizationId' | 'year' | 'month' | 'species'>) {
  const org = await getOrganization(r.organizationId);
  return `${org?.name ?? r.organizationId} ${ymLabel(r.year, r.month)} ${SPECIES_LABEL[r.species]}`;
}

function revalidateReports(id?: string) {
  revalidatePath('/reports');
  if (id) revalidatePath(`/reports/${id}`);
  revalidatePath('/');
}

export async function saveReportAction(
  input: ReportInput,
  id: string | undefined,
  submit: boolean,
): Promise<SaveResult> {
  const session = await getSession();
  if (!session.hasAccess) return fail('AUTH', 'ログインし直してください。');
  // 団体ユーザーは自団体のみ（入力先）
  if (!canWriteForOrg(session, input.organizationId)) {
    return fail('AUTH', session.role === 'ORG_USER' ? '自団体のレポートのみ入力できます。' : '権限がありません。');
  }

  let existing: MonthlyReport | undefined;
  if (id) {
    existing = await getReport(id);
    if (!existing) return fail('NOT_FOUND', 'レポートが見つかりません（削除された可能性があります）。');
    // 既存レポートそのものを編集できるか（他団体・確定済み V-09）
    if (!canEditReport(session, existing)) {
      return fail('V-09', existing.status === 'CONFIRMED' ? '確定済みレポートは事務局のみ編集できます。' : '権限がありません。');
    }
  }

  // 同じ団体・種別・年月のレポートは 1 件のみ（DB の一意制約と同じ）
  const dup = await findReport(input.organizationId, input.species, input.year, input.month);
  if (dup && dup.id !== id) {
    return fail('DUPLICATE', `${ymLabel(input.year, input.month)}の${SPECIES_LABEL[input.species]}のレポートは既にあります。一覧から開いて編集してください。`);
  }

  const result = validateReport(input); // V-04 は既定で警告（保存可）
  if (!result.ok) {
    return { ok: false, errors: result.errors, warnings: result.warnings };
  }

  const saved = await saveReport(input, id, session.userId);
  const what = await label(saved);
  await recordAudit({ actorId: session.userId, action: id ? 'UPDATE' : 'CREATE', entity: 'MonthlyReport', entityId: saved.id, summary: what });

  const now = new Date().toISOString();
  const byOrg = session.role === 'ORG_USER';
  const wasSubmittedBefore = !!existing?.submittedAt;
  if (existing?.status === 'SUBMITTED' && byOrg) {
    // 提出済みを団体が直した＝再提出（事務局の確認待ちに「再提出」と出る）
    await patchReportMeta(saved.id, { resubmittedAt: now });
    await recordAudit({ actorId: session.userId, action: 'SUBMIT', entity: 'MonthlyReport', entityId: saved.id, summary: `${what}（修正して再提出）` });
  } else if (submit && saved.status === 'DRAFT') {
    await patchReportMeta(saved.id, {
      status: 'SUBMITTED',
      submittedAt: now,
      ...(wasSubmittedBefore ? { resubmittedAt: now } : {}),
    });
    await recordAudit({
      actorId: session.userId, action: 'SUBMIT', entity: 'MonthlyReport', entityId: saved.id,
      summary: wasSubmittedBefore ? `${what}（差し戻し後の再提出）` : what,
    });
  }

  revalidateReports(saved.id);
  revalidatePath('/submissions');
  return { ok: true, id: saved.id, errors: [], warnings: result.warnings };
}

export async function confirmReportAction(id: string): Promise<{ ok: boolean; message?: string }> {
  const session = await getSession();
  if (!session.hasAccess || !isAdmin(session)) return { ok: false, message: '確定は事務局のみ可能です。' };
  const r = await getReport(id);
  if (!r) return { ok: false, message: 'レポートが見つかりません。' };
  await setReportStatus(id, 'CONFIRMED');
  await recordAudit({ actorId: session.userId, action: 'CONFIRM', entity: 'MonthlyReport', entityId: id, summary: await label(r) });
  revalidateReports(id);
  return { ok: true };
}

/** 差し戻し：理由を添えて下書きに戻し、団体が直せる状態にする（事務局のみ） */
export async function reopenReportAction(id: string, reason: string): Promise<{ ok: boolean; message?: string }> {
  const session = await getSession();
  if (!session.hasAccess || !isAdmin(session)) return { ok: false, message: '差し戻しは事務局のみ可能です。' };
  const note = reason.trim();
  if (!note) return { ok: false, message: '団体に伝える理由を入力してください。' };
  if (note.length > 500) return { ok: false, message: '理由は 500 文字以内にしてください。' };
  const r = await getReport(id);
  if (!r) return { ok: false, message: 'レポートが見つかりません。' };
  await patchReportMeta(id, { status: 'DRAFT', returnNote: note, returnedAt: new Date().toISOString() });
  await recordAudit({ actorId: session.userId, action: 'REOPEN', entity: 'MonthlyReport', entityId: id, summary: `${await label(r)}：${note.slice(0, 60)}` });
  revalidateReports(id);
  revalidatePath('/submissions');
  return { ok: true };
}

export async function deleteReportAction(id: string): Promise<{ ok: boolean; message?: string }> {
  const session = await getSession();
  if (!session.hasAccess || !isAdmin(session)) return { ok: false, message: '削除は事務局のみ可能です。' };
  const r = await getReport(id);
  if (!r) return { ok: false, message: 'レポートが見つかりません。' };
  await deleteReport(id);
  await recordAudit({ actorId: session.userId, action: 'DELETE', entity: 'MonthlyReport', entityId: id, summary: await label(r) });
  revalidateReports();
  return { ok: true };
}

export interface PreviousEnding {
  year: number;
  month: number;
  endingCount: number;
  endingFosterCount: number;
}

/** 前月の「記録終了時の管理頭数」= 今月の「記録開始時」の候補 */
export async function getPreviousEndingAction(
  organizationId: string, species: Species, year: number, month: number,
): Promise<PreviousEnding | null> {
  const session = await getSession();
  if (!session.hasAccess || !canWriteForOrg(session, organizationId)) return null;
  const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const r = await findReport(organizationId, species, prev.year, prev.month);
  if (!r) return null;
  return { ...prev, endingCount: r.endingCount, endingFosterCount: r.endingFosterCount };
}

/** まとめて確定（提出済みのものだけ） */
export async function confirmReportsAction(ids: string[]): Promise<{ ok: boolean; count: number; message?: string }> {
  const session = await getSession();
  if (!session.hasAccess || !isAdmin(session)) return { ok: false, count: 0, message: '確定は事務局のみ可能です。' };
  let count = 0;
  for (const id of ids.slice(0, 500)) {
    const r = await getReport(id);
    if (!r || r.status !== 'SUBMITTED') continue;
    await setReportStatus(id, 'CONFIRMED');
    await recordAudit({ actorId: session.userId, action: 'CONFIRM', entity: 'MonthlyReport', entityId: id, summary: await label(r) });
    count++;
  }
  revalidateReports();
  revalidatePath('/submissions');
  return { ok: true, count };
}

/**
 * 「この月は動きなし」：収容・転帰ゼロ、頭数は前月の月末のまま、として提出する。
 * 前月の報告がない場合は使えない（頭数がわからないため）。
 */
export async function submitNoChangeAction(
  organizationId: string, species: Species, year: number, month: number,
): Promise<{ ok: boolean; id?: string; message?: string }> {
  const session = await getSession();
  if (!session.hasAccess || !canWriteForOrg(session, organizationId)) return { ok: false, message: '権限がありません。' };
  if (await findReport(organizationId, species, year, month)) {
    return { ok: false, message: 'この月のレポートは既にあります。開いて編集してください。' };
  }
  const prev = await getPreviousEndingAction(organizationId, species, year, month);
  if (!prev) return { ok: false, message: '前月の報告がないため使えません。通常の入力から提出してください。' };

  const pad = (n: number) => String(n).padStart(2, '0');
  const periodStart = `${year}-${pad(month)}-01`;
  const periodEnd = `${year}-${pad(month)}-${pad(new Date(year, month, 0).getDate())}`;
  const input: ReportInput = {
    organizationId, species, year, month, periodStart, periodEnd,
    beginningCount: prev.endingCount, beginningFosterCount: prev.endingFosterCount,
    endingCount: prev.endingCount, endingFosterCount: prev.endingFosterCount,
    note: 'この月は収容・転帰なし（かんたん提出）',
    intakeEntries: [], outcomeEntries: [],
    tnr: species === 'CAT' ? { periodStart, periodEnd, soloCount: 0, collaborativeCount: 0 } : null,
  };
  const res = await saveReportAction(input, undefined, true);
  return res.ok ? { ok: true, id: res.id } : { ok: false, message: res.errors.map((e) => e.message).join(' / ') };
}
