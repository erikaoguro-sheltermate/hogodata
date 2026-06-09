import { describe, it, expect } from 'vitest';
import { checkBalance } from '@/lib/validation/balance';
import { validateReport } from '@/lib/validation/rules';
import type { ReportInput } from '@/lib/types';

function baseReport(overrides: Partial<ReportInput> = {}): ReportInput {
  return {
    organizationId: 'org_1',
    species: 'CAT',
    year: 2026,
    month: 5,
    periodStart: '2026-05-01',
    periodEnd: '2026-05-31',
    beginningCount: 40,
    beginningFosterCount: 10,
    endingCount: 42,
    endingFosterCount: 12,
    intakeEntries: [
      { intakeCategoryCode: 'STRAY', ageGroupCode: 'UNDER_5M', region: 'IN_PREF', count: 8 },
      { intakeCategoryCode: 'FROM_TNR', ageGroupCode: 'UNDER_5M', region: 'NONE', count: 2 },
    ],
    outcomeEntries: [
      { outcomeCategoryCode: 'ADOPTION', ageGroupCode: 'UNDER_5M', region: 'IN_PREF', count: 6 },
      { outcomeCategoryCode: 'OUTDOOR_RELEASE', ageGroupCode: 'M5_TO_Y10', region: 'NONE', count: 2 },
    ],
    tnr: { periodStart: '2026-05-01', periodEnd: '2026-05-31', soloCount: 10, collaborativeCount: 4 },
    ...overrides,
  };
}

describe('checkBalance (V-04 / 要件 §5.5)', () => {
  it('収支が一致すれば balanced=true, delta=0', () => {
    // 40 + (8+2) − (6+2) = 42 == endingCount 42
    const r = checkBalance(baseReport());
    expect(r.intakeTotal).toBe(10);
    expect(r.outcomeTotal).toBe(8);
    expect(r.expectedEnding).toBe(42);
    expect(r.delta).toBe(0);
    expect(r.balanced).toBe(true);
  });

  it('不一致なら delta が0以外', () => {
    const r = checkBalance(baseReport({ endingCount: 50 }));
    expect(r.delta).toBe(-8); // expected 42 − actual 50
    expect(r.balanced).toBe(false);
  });
});

describe('validateReport', () => {
  it('正常系: error なし、needsReview=false', () => {
    const v = validateReport(baseReport());
    expect(v.ok).toBe(true);
    expect(v.errors).toHaveLength(0);
    expect(v.needsReview).toBe(false);
  });

  it('V-04: 収支不一致は warning（保存可）かつ needsReview=true', () => {
    const v = validateReport(baseReport({ endingCount: 99 }));
    expect(v.ok).toBe(true); // 警告なので error にはならない
    expect(v.needsReview).toBe(true);
    expect(v.warnings.some((w) => w.rule === 'V-04')).toBe(true);
  });

  it('V-04: balanceMode=error なら error 化して保存不可', () => {
    const v = validateReport(baseReport({ endingCount: 99 }), { balanceMode: 'error' });
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => e.rule === 'V-04')).toBe(true);
  });

  it('V-01: 負数はエラー', () => {
    const v = validateReport(baseReport({ beginningCount: -1 }));
    expect(v.errors.some((e) => e.rule === 'V-01')).toBe(true);
  });

  it('V-02: month 範囲外はエラー', () => {
    const v = validateReport(baseReport({ month: 13 }));
    expect(v.errors.some((e) => e.rule === 'V-02')).toBe(true);
  });

  it('V-05: 犬レポートに猫専用カテゴリーはエラー', () => {
    const v = validateReport(baseReport({
      species: 'DOG',
      intakeEntries: [{ intakeCategoryCode: 'FROM_TNR', ageGroupCode: 'UNDER_5M', region: 'NONE', count: 1 }],
      outcomeEntries: [],
      tnr: null,
    }));
    expect(v.errors.some((e) => e.rule === 'V-05')).toBe(true);
  });

  it('V-05: 犬レポートのTNR入力はエラー', () => {
    const v = validateReport(baseReport({
      species: 'DOG',
      intakeEntries: [],
      outcomeEntries: [],
      tnr: { periodStart: null, periodEnd: null, soloCount: 5, collaborativeCount: 0 },
    }));
    expect(v.errors.some((e) => e.rule === 'V-05')).toBe(true);
  });

  it('V-06: requiresRegion=true のカテゴリーで region=NONE はエラー', () => {
    const v = validateReport(baseReport({
      intakeEntries: [{ intakeCategoryCode: 'STRAY', ageGroupCode: 'UNDER_5M', region: 'NONE', count: 3 }],
      outcomeEntries: [],
    }));
    expect(v.errors.some((e) => e.rule === 'V-06')).toBe(true);
  });

  it('V-06: requiresRegion=false のカテゴリーで region 指定はエラー', () => {
    const v = validateReport(baseReport({
      intakeEntries: [{ intakeCategoryCode: 'FROM_TNR', ageGroupCode: 'UNDER_5M', region: 'IN_PREF', count: 3 }],
      outcomeEntries: [],
    }));
    expect(v.errors.some((e) => e.rule === 'V-06')).toBe(true);
  });

  it('V-07: 一時預かり内数 > 合計 はエラー', () => {
    const v = validateReport(baseReport({ beginningFosterCount: 100 }));
    expect(v.errors.some((e) => e.rule === 'V-07')).toBe(true);
  });
});
