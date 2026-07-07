// JASA Data Hub — 集計（仕様書 §4.2）
// 団体個別値は出さず、フィルタされたレポート群を匿名集計する。

import type { MonthlyReport } from '../types';
import { INTAKE_CATEGORIES, OUTCOME_CATEGORIES, outcomeCategory } from '../masters';
import { sumIntake, sumOutcome } from '../validation/balance';
import { ymLabel, liveReleaseRate } from '../format';

export interface CategoryCount { code: string; name: string; count: number }
export interface TrendPoint { key: string; label: string; intake: number; outcome: number }

export interface Summary {
  reportCount: number;
  organizationCount: number;
  intakeTotal: number;
  outcomeTotal: number;
  liveOutcomeTotal: number;
  nonLiveOutcomeTotal: number;
  liveReleaseRate: number | null; // %
  intakeByCategory: CategoryCount[];
  outcomeByCategory: CategoryCount[];
  trend: TrendPoint[];
  transferIn: number;
  transferOut: number;
  dogReports: number;
  catReports: number;
}

export function reportIntakeTotal(r: MonthlyReport): number {
  return sumIntake(r.intakeEntries);
}
export function reportOutcomeTotal(r: MonthlyReport): number {
  return sumOutcome(r.outcomeEntries);
}

export function summarize(reports: MonthlyReport[]): Summary {
  const intakeMap = new Map<string, number>();
  const outcomeMap = new Map<string, number>();
  const trendMap = new Map<string, TrendPoint>();
  const orgs = new Set<string>();
  let liveOutcomeTotal = 0;
  let nonLiveOutcomeTotal = 0;
  let dogReports = 0;
  let catReports = 0;

  for (const r of reports) {
    orgs.add(r.organizationId);
    if (r.species === 'DOG') dogReports++; else catReports++;

    for (const e of r.intakeEntries) {
      intakeMap.set(e.intakeCategoryCode, (intakeMap.get(e.intakeCategoryCode) ?? 0) + e.count);
    }
    for (const e of r.outcomeEntries) {
      outcomeMap.set(e.outcomeCategoryCode, (outcomeMap.get(e.outcomeCategoryCode) ?? 0) + e.count);
      const cat = outcomeCategory(e.outcomeCategoryCode);
      if (cat?.isLiveOutcome) liveOutcomeTotal += e.count;
      else nonLiveOutcomeTotal += e.count;
    }

    const key = `${r.year}-${String(r.month).padStart(2, '0')}`;
    const point = trendMap.get(key) ?? { key, label: ymLabel(r.year, r.month), intake: 0, outcome: 0 };
    point.intake += reportIntakeTotal(r);
    point.outcome += reportOutcomeTotal(r);
    trendMap.set(key, point);
  }

  const intakeByCategory: CategoryCount[] = INTAKE_CATEGORIES
    .map((c) => ({ code: c.code, name: c.name, count: intakeMap.get(c.code) ?? 0 }))
    .filter((c) => c.count > 0);
  const outcomeByCategory: CategoryCount[] = OUTCOME_CATEGORIES
    .map((c) => ({ code: c.code, name: c.name, count: outcomeMap.get(c.code) ?? 0 }))
    .filter((c) => c.count > 0);

  const intakeTotal = [...intakeMap.values()].reduce((a, b) => a + b, 0);
  const outcomeTotal = liveOutcomeTotal + nonLiveOutcomeTotal;
  const trend = [...trendMap.values()].sort((a, b) => a.key.localeCompare(b.key));

  return {
    reportCount: reports.length,
    organizationCount: orgs.size,
    intakeTotal,
    outcomeTotal,
    liveOutcomeTotal,
    nonLiveOutcomeTotal,
    liveReleaseRate: liveReleaseRate(liveOutcomeTotal, outcomeTotal),
    intakeByCategory,
    outcomeByCategory,
    trend,
    transferIn: intakeMap.get('TRANSFER_IN') ?? 0,
    transferOut: outcomeMap.get('TRANSFER_OUT') ?? 0,
    dogReports,
    catReports,
  };
}

// ============================================================
// 期間別集計（月次 / 四半期 / 年次）
// 年度ベース：4月始まり（4-6月=Q1 / 7-9=Q2 / 10-12=Q3 / 1-3=Q4）
// ============================================================
export type PeriodType = 'month' | 'quarter' | 'year';

export function fiscalYear(year: number, month: number): number {
  return month >= 4 ? year : year - 1;
}
export function fiscalQuarter(month: number): number {
  return Math.floor(((month - 4 + 12) % 12) / 3) + 1;
}
const QUARTER_RANGE: Record<number, string> = { 1: '4-6月', 2: '7-9月', 3: '10-12月', 4: '1-3月' };

export function periodBucket(year: number, month: number, type: PeriodType): { key: string; label: string } {
  if (type === 'month') {
    return { key: `${year}-${String(month).padStart(2, '0')}`, label: ymLabel(year, month) };
  }
  const fy = fiscalYear(year, month);
  if (type === 'year') return { key: `FY${fy}`, label: `${fy}年度` };
  const q = fiscalQuarter(month);
  return { key: `FY${fy}-Q${q}`, label: `${fy}年度 Q${q}（${QUARTER_RANGE[q]}）` };
}

export interface PeriodSummary {
  key: string;
  label: string;
  orgCount: number;            // 提出した団体数（ユニーク）
  dogReports: number;
  catReports: number;
  intakeTotal: number;
  outcomeTotal: number;
  liveOutcomeTotal: number;
  nonLiveOutcomeTotal: number;
  liveReleaseRate: number | null;
}

export function summarizeByPeriod(reports: MonthlyReport[], type: PeriodType): PeriodSummary[] {
  const map = new Map<string, {
    key: string; label: string; orgs: Set<string>;
    dogReports: number; catReports: number; intakeTotal: number;
    liveOutcomeTotal: number; nonLiveOutcomeTotal: number;
  }>();

  for (const r of reports) {
    const { key, label } = periodBucket(r.year, r.month, type);
    const b = map.get(key) ?? { key, label, orgs: new Set<string>(), dogReports: 0, catReports: 0, intakeTotal: 0, liveOutcomeTotal: 0, nonLiveOutcomeTotal: 0 };
    b.orgs.add(r.organizationId);
    if (r.species === 'DOG') b.dogReports++; else b.catReports++;
    b.intakeTotal += reportIntakeTotal(r);
    for (const e of r.outcomeEntries) {
      const cat = outcomeCategory(e.outcomeCategoryCode);
      if (cat?.isLiveOutcome) b.liveOutcomeTotal += e.count;
      else b.nonLiveOutcomeTotal += e.count;
    }
    map.set(key, b);
  }

  return [...map.values()]
    .map((b) => ({
      key: b.key,
      label: b.label,
      orgCount: b.orgs.size,
      dogReports: b.dogReports,
      catReports: b.catReports,
      intakeTotal: b.intakeTotal,
      outcomeTotal: b.liveOutcomeTotal + b.nonLiveOutcomeTotal,
      liveOutcomeTotal: b.liveOutcomeTotal,
      nonLiveOutcomeTotal: b.nonLiveOutcomeTotal,
      liveReleaseRate: liveReleaseRate(b.liveOutcomeTotal, b.liveOutcomeTotal + b.nonLiveOutcomeTotal),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}
