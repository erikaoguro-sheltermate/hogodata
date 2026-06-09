'use server';

import { revalidatePath } from 'next/cache';
import { saveReport, setReportStatus, deleteReport, getReport } from '@/lib/data/repo';
import { validateReport, type ValidationIssue } from '@/lib/validation';
import { getSession, canEditReports, isAdmin } from '@/lib/auth/session';
import type { ReportInput } from '@/lib/types';

export interface SaveResult {
  ok: boolean;
  id?: string;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export async function saveReportAction(
  input: ReportInput,
  id: string | undefined,
  submit: boolean,
): Promise<SaveResult> {
  const session = await getSession();
  if (!canEditReports(session)) {
    return { ok: false, errors: [{ rule: 'AUTH', severity: 'error', message: '権限がありません。' }], warnings: [] };
  }
  // 団体ユーザーは自団体のみ
  if (session.role === 'ORG_USER' && input.organizationId !== session.organizationId) {
    return { ok: false, errors: [{ rule: 'AUTH', severity: 'error', message: '自団体のレポートのみ入力できます。' }], warnings: [] };
  }
  // CONFIRMED は Admin 以外編集不可（V-09）
  if (id) {
    const existing = await getReport(id);
    if (existing?.status === 'CONFIRMED' && !isAdmin(session)) {
      return { ok: false, errors: [{ rule: 'V-09', severity: 'error', message: '確定済みレポートは事務局のみ編集できます。' }], warnings: [] };
    }
  }

  const result = validateReport(input); // V-04 は既定で警告（保存可）
  if (!result.ok) {
    return { ok: false, errors: result.errors, warnings: result.warnings };
  }

  const saved = await saveReport(input, id, session.userId);
  if (submit) await setReportStatus(saved.id, 'SUBMITTED');

  revalidatePath('/reports');
  revalidatePath('/');
  return { ok: true, id: saved.id, errors: [], warnings: result.warnings };
}

export async function confirmReportAction(id: string): Promise<{ ok: boolean; message?: string }> {
  const session = await getSession();
  if (!isAdmin(session)) return { ok: false, message: '確定は事務局のみ可能です。' };
  await setReportStatus(id, 'CONFIRMED');
  revalidatePath('/reports');
  return { ok: true };
}

export async function deleteReportAction(id: string): Promise<{ ok: boolean; message?: string }> {
  const session = await getSession();
  if (!isAdmin(session)) return { ok: false, message: '削除は事務局のみ可能です。' };
  await deleteReport(id);
  revalidatePath('/reports');
  revalidatePath('/');
  return { ok: true };
}
