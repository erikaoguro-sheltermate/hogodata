// ============================================================================
// JASA Data Hub — 収支整合バリデーション（F-04 / 要件 §5.5）
//
// 恒等式:
//   記録終了時の管理頭数 = 記録開始時の管理頭数 + 新規収容合計 − 転帰合計（生存＋非生存）
//
// 入力時にこの差分を計算し、不一致なら警告する。強制エラーにするかは運用判断のため
// しきい値・モードを設定化できるようにしてある。
// 一時預かり内数（§5.3）は合計の一部であり本式には含めない（参考値）。
// ============================================================================

import type { ReportLine, PopulationCount } from './types';

export interface BalanceInput {
  /** 記録開始時の管理頭数（合計） */
  startTotal: number;
  /** 記録終了時の管理頭数（合計） */
  endTotal: number;
  /** 新規収容の合計頭数 */
  intakeTotal: number;
  /** 転帰の合計頭数（生存＋非生存） */
  outcomeTotal: number;
}

export interface BalanceResult {
  /** 理論上あるべき期末頭数 = startTotal + intakeTotal − outcomeTotal */
  expectedEndTotal: number;
  /** 実入力の期末頭数 */
  actualEndTotal: number;
  /** 差分（actual − expected）。0 なら整合 */
  diff: number;
  /** 整合しているか */
  isBalanced: boolean;
}

/** 収支恒等式を検算する純粋関数 */
export function checkBalance(input: BalanceInput): BalanceResult {
  const expectedEndTotal = input.startTotal + input.intakeTotal - input.outcomeTotal;
  const diff = input.endTotal - expectedEndTotal;
  return {
    expectedEndTotal,
    actualEndTotal: input.endTotal,
    diff,
    isBalanced: diff === 0,
  };
}

/** report_lines から section ごとの合計を集計する */
export function sumLines(lines: ReadonlyArray<ReportLine>): {
  intakeTotal: number;
  outcomeLiveTotal: number;
  outcomeNonLiveTotal: number;
  outcomeTotal: number;
} {
  let intakeTotal = 0;
  let outcomeLiveTotal = 0;
  let outcomeNonLiveTotal = 0;

  for (const line of lines) {
    switch (line.section) {
      case 'intake':
        intakeTotal += line.count;
        break;
      case 'outcome_live':
        outcomeLiveTotal += line.count;
        break;
      case 'outcome_nonlive':
        outcomeNonLiveTotal += line.count;
        break;
    }
  }

  return {
    intakeTotal,
    outcomeLiveTotal,
    outcomeNonLiveTotal,
    outcomeTotal: outcomeLiveTotal + outcomeNonLiveTotal,
  };
}

/** 管理頭数（開始/終了）を取り出すヘルパー */
export function pickPopulationTotals(counts: ReadonlyArray<PopulationCount>): {
  startTotal: number;
  endTotal: number;
} {
  const start = counts.find((c) => c.point === 'start');
  const end = counts.find((c) => c.point === 'end');
  return {
    startTotal: start?.totalCount ?? 0,
    endTotal: end?.totalCount ?? 0,
  };
}

/** レポート明細・管理頭数から収支整合をまとめて検算する高レベル関数 */
export function checkReportBalance(
  lines: ReadonlyArray<ReportLine>,
  populationCounts: ReadonlyArray<PopulationCount>,
): BalanceResult {
  const { intakeTotal, outcomeTotal } = sumLines(lines);
  const { startTotal, endTotal } = pickPopulationTotals(populationCounts);
  return checkBalance({ startTotal, endTotal, intakeTotal, outcomeTotal });
}
