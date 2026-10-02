import { describe, it, expect } from 'vitest';
import {
  scopeReportFilter, canViewReport, canEditReport, canWriteForOrg, canViewOrgSummary,
  generateInitialPassword, validateNewPassword,
} from '@/lib/auth/policy';
import { fiscalMonths, inFiscalPeriod, previousYearMonth } from '@/lib/data/analytics';

const admin = { role: 'ADMIN' as const, organizationId: null };
const orgA = { role: 'ORG_USER' as const, organizationId: 'org_a' };
const orgless = { role: 'ORG_USER' as const, organizationId: null };
const viewer = { role: 'VIEWER' as const, organizationId: null };

describe('scopeReportFilter', () => {
  it('団体ユーザーは指定に関わらず自団体に固定される', () => {
    expect(scopeReportFilter(orgA, { organizationId: 'org_b', year: 2026 })).toEqual({ organizationId: 'org_a', year: 2026 });
  });
  it('所属のない団体ユーザーには何も返さない', () => {
    expect(scopeReportFilter(orgless).organizationId).toBe('__none__');
  });
  it('事務局はフィルタをそのまま使う', () => {
    expect(scopeReportFilter(admin, { organizationId: 'org_b' })).toEqual({ organizationId: 'org_b' });
  });
});

describe('レポートの閲覧・編集', () => {
  const own = { organizationId: 'org_a', status: 'SUBMITTED' as const };
  const other = { organizationId: 'org_b', status: 'DRAFT' as const };
  const confirmed = { organizationId: 'org_a', status: 'CONFIRMED' as const };

  it('団体ユーザーは自団体のみ見られる', () => {
    expect(canViewReport(orgA, own)).toBe(true);
    expect(canViewReport(orgA, other)).toBe(false);
  });
  it('閲覧者は個別レポートを見られない', () => {
    expect(canViewReport(viewer, own)).toBe(false);
  });
  it('提出済みでも確定前なら団体が直せる', () => {
    expect(canEditReport(orgA, own)).toBe(true);
  });
  it('確定後は事務局のみ編集できる（V-09）', () => {
    expect(canEditReport(orgA, confirmed)).toBe(false);
    expect(canEditReport(admin, confirmed)).toBe(true);
  });
  it('他団体のレポートは編集できない', () => {
    expect(canEditReport(orgA, other)).toBe(false);
  });
  it('入力先・還元レポートも自団体のみ', () => {
    expect(canWriteForOrg(orgA, 'org_a')).toBe(true);
    expect(canWriteForOrg(orgA, 'org_b')).toBe(false);
    expect(canWriteForOrg(orgless, 'org_a')).toBe(false);
    expect(canWriteForOrg(viewer, 'org_a')).toBe(false);
    expect(canViewOrgSummary(orgA, 'org_b')).toBe(false);
    expect(canViewOrgSummary(admin, 'org_b')).toBe(true);
  });
});

describe('パスワード', () => {
  it('初期パスワードは紛らわしい文字を含まない', () => {
    for (let i = 0; i < 50; i++) {
      const pw = generateInitialPassword();
      expect(pw).toHaveLength(12);
      expect(pw).not.toMatch(/[0O1lI]/);
    }
  });
  it('新しいパスワードの条件', () => {
    expect(validateNewPassword('short1')).not.toBeNull();
    expect(validateNewPassword('onlyletters')).not.toBeNull();
    expect(validateNewPassword('12345678')).not.toBeNull();
    expect(validateNewPassword('hogo2026data')).toBeNull();
  });
});

describe('年度ヘルパー', () => {
  it('年度は 4 月始まり、四半期で 3 か月ずつ', () => {
    expect(fiscalMonths(2026)[0]).toEqual({ year: 2026, month: 4 });
    expect(fiscalMonths(2026)[11]).toEqual({ year: 2027, month: 3 });
    expect(fiscalMonths(2026, 4)).toEqual([{ year: 2027, month: 1 }, { year: 2027, month: 2 }, { year: 2027, month: 3 }]);
  });
  it('inFiscalPeriod', () => {
    expect(inFiscalPeriod({ year: 2027, month: 2 }, 2026)).toBe(true);
    expect(inFiscalPeriod({ year: 2027, month: 2 }, 2026, 4)).toBe(true);
    expect(inFiscalPeriod({ year: 2026, month: 3 }, 2026)).toBe(false);
  });
  it('1 月の「先月」は前年 12 月', () => {
    expect(previousYearMonth(new Date(2027, 0, 5))).toEqual({ year: 2026, month: 12 });
    expect(previousYearMonth(new Date(2026, 9, 2))).toEqual({ year: 2026, month: 9 });
  });
});
