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

import { deadlineFor } from '@/lib/deadline';
import { expectedSpecies, orgMonthStatus } from '@/lib/submissions';
import type { MonthlyReport } from '@/lib/types';

describe('提出期限', () => {
  it('対象月の翌月 N 日が期限', () => {
    expect(deadlineFor(2026, 9, 10, new Date(2026, 9, 3)).date).toBe('2026-10-10');
    expect(deadlineFor(2026, 12, 10, new Date(2027, 0, 1)).date).toBe('2027-01-10');
  });
  it('残り日数と状態', () => {
    expect(deadlineFor(2026, 9, 10, new Date(2026, 9, 3))).toMatchObject({ daysLeft: 7, state: 'open' });
    expect(deadlineFor(2026, 9, 10, new Date(2026, 9, 8))).toMatchObject({ daysLeft: 2, state: 'soon' });
    expect(deadlineFor(2026, 9, 10, new Date(2026, 9, 10))).toMatchObject({ daysLeft: 0, state: 'soon' });
    expect(deadlineFor(2026, 9, 10, new Date(2026, 9, 11))).toMatchObject({ daysLeft: -1, state: 'overdue' });
  });
});

describe('提出状況', () => {
  const rep = (species: 'DOG' | 'CAT', status: MonthlyReport['status']) =>
    ({ organizationId: 'o', species, year: 2026, month: 9, status } as MonthlyReport);

  it('保護動物種が未設定なら犬・猫とも対象', () => {
    expect(expectedSpecies({ animalTypes: [] })).toEqual(['DOG', 'CAT']);
    expect(expectedSpecies({ animalTypes: ['CAT', 'OTHER'] })).toEqual(['CAT']);
  });
  it('全種別が提出済みなら done、下書きや片方だけなら partial', () => {
    const org = { id: 'o', animalTypes: ['DOG', 'CAT'] as ('DOG' | 'CAT')[] };
    expect(orgMonthStatus(org, [rep('DOG', 'SUBMITTED'), rep('CAT', 'CONFIRMED')], 2026, 9).state).toBe('done');
    expect(orgMonthStatus(org, [rep('DOG', 'SUBMITTED')], 2026, 9).state).toBe('partial');
    expect(orgMonthStatus(org, [rep('DOG', 'DRAFT'), rep('CAT', 'DRAFT')], 2026, 9).state).toBe('partial');
    expect(orgMonthStatus(org, [], 2026, 9).state).toBe('none');
  });
  it('猫だけの団体は猫が出ていれば done', () => {
    expect(orgMonthStatus({ id: 'o', animalTypes: ['CAT'] }, [rep('CAT', 'SUBMITTED')], 2026, 9).state).toBe('done');
  });
});

import { isParticipating, isReturned, wasResubmitted, yearOptions } from '@/lib/submissions';

describe('提出フロー', () => {
  it('参加開始月より前は対象外', () => {
    const org = { joinedYear: 2026, joinedMonth: 7 };
    expect(isParticipating(org, 2026, 6)).toBe(false);
    expect(isParticipating(org, 2026, 7)).toBe(true);
    expect(isParticipating(org, 2027, 1)).toBe(true);
    expect(isParticipating({ joinedYear: null, joinedMonth: null }, 2026, 4)).toBe(true);
  });
  it('差し戻し中かどうか', () => {
    const base = { status: 'DRAFT' as const, returnNote: '頭数をご確認ください', returnedAt: '2026-10-05T00:00:00Z' };
    expect(isReturned({ ...base, resubmittedAt: null })).toBe(true);
    expect(isReturned({ ...base, resubmittedAt: '2026-10-06T00:00:00Z' })).toBe(false);
    expect(isReturned({ ...base, status: 'SUBMITTED', resubmittedAt: null })).toBe(false);
    expect(isReturned({ ...base, returnNote: null, resubmittedAt: null })).toBe(false);
  });
  it('再提出の印は提出済みのときだけ', () => {
    expect(wasResubmitted({ status: 'SUBMITTED', resubmittedAt: '2026-10-06T00:00:00Z' })).toBe(true);
    expect(wasResubmitted({ status: 'CONFIRMED', resubmittedAt: '2026-10-06T00:00:00Z' })).toBe(false);
  });
  it('年の選択肢は今年の翌年まで自動で増える', () => {
    expect(yearOptions(new Date(2026, 9, 1))).toEqual([2026, 2027]);
    expect(yearOptions(new Date(2028, 0, 1))).toEqual([2026, 2027, 2028, 2029]);
  });
});
