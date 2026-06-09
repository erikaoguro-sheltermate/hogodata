// JASA Data Hub — 収支整合（仕様書 §6 V-04 / 要件 §5.5）
//   balanceDelta = beginningCount + Σintake − Σoutcome − endingCount
// 0 なら整合。0以外は警告（needsReview）。一時預かり内数は式に含めない（参考値）。

import type { ReportInput, IntakeEntryInput, OutcomeEntryInput } from '../types';

export function sumIntake(entries: ReadonlyArray<IntakeEntryInput>): number {
  return entries.reduce((s, e) => s + (e.count || 0), 0);
}

export function sumOutcome(entries: ReadonlyArray<OutcomeEntryInput>): number {
  return entries.reduce((s, e) => s + (e.count || 0), 0);
}

export interface BalanceResult {
  intakeTotal: number;
  outcomeTotal: number;
  /** あるべき記録終了時頭数 = beginningCount + intakeTotal − outcomeTotal */
  expectedEnding: number;
  /** 実入力の記録終了時頭数 */
  actualEnding: number;
  /** beginningCount + intakeTotal − outcomeTotal − endingCount */
  delta: number;
  balanced: boolean;
}

export function checkBalance(
  input: Pick<ReportInput, 'beginningCount' | 'endingCount' | 'intakeEntries' | 'outcomeEntries'>,
): BalanceResult {
  const intakeTotal = sumIntake(input.intakeEntries);
  const outcomeTotal = sumOutcome(input.outcomeEntries);
  const expectedEnding = input.beginningCount + intakeTotal - outcomeTotal;
  const delta = expectedEnding - input.endingCount;
  return {
    intakeTotal,
    outcomeTotal,
    expectedEnding,
    actualEnding: input.endingCount,
    delta,
    balanced: delta === 0,
  };
}
