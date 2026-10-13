import { describe, it, expect } from 'vitest';
import { summarize, summarizeByPeriod, currentManagedCount } from '@/lib/data/analytics';
import type { MonthlyReport, ReportStatus } from '@/lib/types';

function report(id: string, status: ReportStatus, overrides: Partial<MonthlyReport> = {}): MonthlyReport {
  return {
    id,
    status,
    organizationId: `org_${id}`,
    species: 'CAT',
    year: 2026,
    month: 5,
    periodStart: '2026-05-01',
    periodEnd: '2026-05-31',
    beginningCount: 10,
    beginningFosterCount: 0,
    endingCount: 12,
    endingFosterCount: 1,
    intakeEntries: [{ intakeCategoryCode: 'STRAY', ageGroupCode: 'UNDER_5M', region: 'IN_PREF', count: 5 }],
    outcomeEntries: [{ outcomeCategoryCode: 'ADOPTION', ageGroupCode: 'UNDER_5M', region: 'IN_PREF', count: 3 }],
    tnr: { periodStart: '2026-05-01', periodEnd: '2026-05-31', soloCount: 0, collaborativeCount: 0 },
    submittedAt: status === 'DRAFT' ? null : '2026-06-05T00:00:00Z',
    enteredById: null,
    isActive: true,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

const reports = [
  report('a', 'SUBMITTED'),
  report('b', 'CONFIRMED'),
  report('c', 'DRAFT'),
  // 差し戻し中（DRAFT に戻され理由付き）
  report('d', 'DRAFT', { returnNote: '数字の確認をお願いします', returnedAt: '2026-06-06T00:00:00Z' }),
];

describe('集計は提出済み・確定のみ（下書き・差し戻し中は含めない）', () => {
  it('summarize', () => {
    const s = summarize(reports);
    expect(s.reportCount).toBe(2);
    expect(s.organizationCount).toBe(2);
    expect(s.intakeTotal).toBe(10);
    expect(s.outcomeTotal).toBe(6);
    expect(s.trend).toEqual([{ key: '2026-05', label: expect.any(String), intake: 10, outcome: 6 }]);
  });

  it('summarizeByPeriod', () => {
    const [p] = summarizeByPeriod(reports, 'month');
    expect(p.orgCount).toBe(2);
    expect(p.catReports).toBe(2);
    expect(p.intakeTotal).toBe(10);
    expect(p.outcomeTotal).toBe(6);
  });

  it('currentManagedCount', () => {
    expect(currentManagedCount(reports).total).toBe(24);
  });

  it('下書きしかなければ 0', () => {
    const s = summarize([report('x', 'DRAFT')]);
    expect(s.reportCount).toBe(0);
    expect(s.intakeTotal).toBe(0);
    expect(summarizeByPeriod([report('x', 'DRAFT')], 'quarter')).toEqual([]);
  });
});
