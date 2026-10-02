// JASA Data Hub — 認可ポリシー（純粋関数・テスト対象）
//
// Prisma はサービスロールで接続するため RLS を通らない。団体ユーザーの分離は
// アプリ層のこの関数群で担保する（rls.sql は REST API 経由の直接アクセス対策）。

import type { MonthlyReport, Role } from '../types';
import type { ReportFilter } from '../data/store';

export interface Principal {
  role: Role;
  organizationId: string | null;
}

/** 一覧取得のフィルタに権限スコープを強制する。団体ユーザーは常に自団体のみ。 */
export function scopeReportFilter(p: Principal, filter: ReportFilter = {}): ReportFilter {
  if (p.role === 'ORG_USER') {
    // 所属団体が未設定の団体ユーザーには何も見せない
    return { ...filter, organizationId: p.organizationId ?? '__none__' };
  }
  return filter;
}

/** 個別レポート（団体名・生データ）を閲覧できるか */
export function canViewReport(p: Principal, report: Pick<MonthlyReport, 'organizationId'>): boolean {
  if (p.role === 'ADMIN') return true;
  if (p.role === 'ORG_USER') return !!p.organizationId && report.organizationId === p.organizationId;
  return false; // VIEWER は集計のみ
}

/** レポートを編集・提出できるか（確定後は事務局のみ／V-09） */
export function canEditReport(p: Principal, report: Pick<MonthlyReport, 'organizationId' | 'status'>): boolean {
  if (!canViewReport(p, report)) return false;
  if (report.status === 'CONFIRMED') return p.role === 'ADMIN';
  return p.role === 'ADMIN' || p.role === 'ORG_USER';
}

/** 指定団体のデータとして新規入力できるか */
export function canWriteForOrg(p: Principal, organizationId: string): boolean {
  if (p.role === 'ADMIN') return true;
  if (p.role === 'ORG_USER') return !!p.organizationId && organizationId === p.organizationId;
  return false;
}

/** 団体別の還元レポートを閲覧できるか */
export function canViewOrgSummary(p: Principal, organizationId: string): boolean {
  return canWriteForOrg(p, organizationId);
}

// ---- 初期パスワード ----
// 紛らわしい文字（0/O, 1/l/I）を除いた英数字。事務局が団体に口頭・メールで伝える前提。
const PW_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

export function generateInitialPassword(length = 12, random: (n: number) => Uint8Array = randomBytes): string {
  const bytes = random(length);
  let out = '';
  for (let i = 0; i < length; i++) out += PW_CHARS[bytes[i] % PW_CHARS.length];
  return out;
}

function randomBytes(n: number): Uint8Array {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return a;
}

export const MIN_PASSWORD_LENGTH = 8;

export function validateNewPassword(pw: string): string | null {
  if (pw.length < MIN_PASSWORD_LENGTH) return `パスワードは ${MIN_PASSWORD_LENGTH} 文字以上にしてください。`;
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'パスワードには英字と数字を両方含めてください。';
  return null;
}
