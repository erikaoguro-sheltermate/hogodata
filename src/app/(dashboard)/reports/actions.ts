'use server';

import { revalidatePath } from 'next/cache';
import { saveReport, setReportStatus, deleteReport, getReport, findReport, getOrganization, recordAudit } from '@/lib/data/repo';
import { validateReport, type ValidationIssue } from '@/lib/validation';
import { getSession, isAdmin } from '@/lib/auth/session';
import { canEditReport, canWriteForOrg } from '@/lib/auth/policy';
import { SPECIES_LABEL } from '@/lib/masters';
import { ymLabel } from '@/lib/format';
import type { MonthlyReport, ReportInput } from '@/lib/types';

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
  if (submit && saved.status === 'DRAFT') {
    await setReportStatus(saved.id, 'SUBMITTED');
    await recordAudit({ actorId: session.userId, action: 'SUBMIT', entity: 'MonthlyReport', entityId: saved.id, summary: what });
  }

  revalidateReports(saved.id);
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

/** 差し戻し：提出済み・確定を下書きに戻し、団体が直せる状態にする（事務局のみ） */
export async function reopenReportAction(id: string): Promise<{ ok: boolean; message?: string }> {
  const session = await getSession();
  if (!session.hasAccess || !isAdmin(session)) return { ok: false, message: '差し戻しは事務局のみ可能です。' };
  const r = await getReport(id);
  if (!r) return { ok: false, message: 'レポートが見つかりません。' };
  await setReportStatus(id, 'DRAFT');
  await recordAudit({ actorId: session.userId, action: 'REOPEN', entity: 'MonthlyReport', entityId: id, summary: await label(r) });
  revalidateReports(id);
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
