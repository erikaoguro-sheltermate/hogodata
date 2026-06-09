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
