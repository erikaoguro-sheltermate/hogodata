// JASA Data Hub — バリデーション V-01〜V-09（仕様書 §6）
// フロント（即時表示）と API（保存前）で共用する純粋関数。

import type { ReportInput, Species } from '../types';
import { intakeCategory, outcomeCategory } from '../masters';
import { checkBalance, type BalanceResult } from './balance';

export type Severity = 'error' | 'warning';

export interface ValidationIssue {
  rule: string; // 'V-01' など
  severity: Severity;
  field?: string;
  message: string;
}

export interface ValidationResult {
  issues: ValidationIssue[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  ok: boolean; // error が無ければ true
  balance: BalanceResult;
  needsReview: boolean; // 収支不一致フラグ（V-04）
}

export interface ValidateOptions {
  /** V-04 収支整合を必須エラーにするか（既定: 警告） */
  balanceMode?: 'warn' | 'error';
  /** 実施年度の妥当範囲（V-02） */
  yearRange?: [number, number];
}

const isNonNegInt = (n: number) => Number.isInteger(n) && n >= 0;

export function validateReport(input: ReportInput, opts: ValidateOptions = {}): ValidationResult {
  const { balanceMode = 'warn', yearRange = [2026, 2027] } = opts;
  const issues: ValidationIssue[] = [];
  const add = (rule: string, severity: Severity, message: string, field?: string) =>
    issues.push({ rule, severity, message, field });

  // V-01: すべての件数・頭数は 0以上の整数
  const counts = [
    input.beginningCount, input.beginningFosterCount,
    input.endingCount, input.endingFosterCount,
    ...input.intakeEntries.map((e) => e.count),
    ...input.outcomeEntries.map((e) => e.count),
  ];
  if (input.tnr) counts.push(input.tnr.soloCount, input.tnr.collaborativeCount);
  if (!counts.every(isNonNegInt)) add('V-01', 'error', 'すべての頭数は0以上の整数で入力してください。');

  // V-02: year/month/期間の妥当性
  if (input.year < yearRange[0] || input.year > yearRange[1]) {
    add('V-02', 'error', `対象年は ${yearRange[0]}〜${yearRange[1]} の範囲で入力してください。`, 'year');
  }
  if (!Number.isInteger(input.month) || input.month < 1 || input.month > 12) {
    add('V-02', 'error', '対象月は 1〜12 で入力してください。', 'month');
  }
  if (input.periodStart && input.periodEnd && input.periodStart > input.periodEnd) {
    add('V-02', 'error', '記録開始日は終了日より前にしてください。', 'periodEnd');
  }

  // V-05 / V-08: 種別とカテゴリーの整合（猫専用カテゴリーを犬で使わない）
  const speciesMismatch = (catSpecies: Species | null | undefined, name: string) => {
    if (catSpecies && catSpecies !== input.species) {
      add('V-05', 'error', `「${name}」は ${catSpecies === 'CAT' ? '猫' : '犬'} のレポートのみ使用できます。`);
    }
  };
  for (const e of input.intakeEntries) {
    if (e.count <= 0) continue;
    const cat = intakeCategory(e.intakeCategoryCode);
    if (!cat) { add('V-08', 'error', `不明な収容カテゴリー: ${e.intakeCategoryCode}`); continue; }
    speciesMismatch(cat.species, cat.name);
    // V-06: requiresRegion=true は region 必須、false は NONE
    if (cat.requiresRegion && (e.region === 'NONE')) {
      add('V-06', 'error', `「${cat.name}」は地域区分（県内/県外）が必要です。`);
    }
    if (!cat.requiresRegion && e.region !== 'NONE') {
      add('V-06', 'error', `「${cat.name}」は地域区分を持ちません。`);
    }
  }
  for (const e of input.outcomeEntries) {
    if (e.count <= 0) continue;
    const cat = outcomeCategory(e.outcomeCategoryCode);
    if (!cat) { add('V-08', 'error', `不明な転帰カテゴリー: ${e.outcomeCategoryCode}`); continue; }
    speciesMismatch(cat.species, cat.name);
    if (cat.requiresRegion && e.region === 'NONE') {
      add('V-06', 'error', `「${cat.name}」は地域区分（県内/県外）が必要です。`);
    }
    if (!cat.requiresRegion && e.region !== 'NONE') {
      add('V-06', 'error', `「${cat.name}」は地域区分を持ちません。`);
    }
  }

  // V-05: 犬レポートで TNR を送らない
  if (input.species === 'DOG' && input.tnr && (input.tnr.soloCount > 0 || input.tnr.collaborativeCount > 0)) {
    add('V-05', 'error', 'TNR頭数は猫のレポートのみ入力できます。');
  }

  // V-07: 一時預かり内数 ≤ 合計
  if (input.beginningFosterCount > input.beginningCount) {
    add('V-07', 'error', '記録開始時の一時預かり内数が合計頭数を超えています。', 'beginningFosterCount');
  }
  if (input.endingFosterCount > input.endingCount) {
    add('V-07', 'error', '記録終了時の一時預かり内数が合計頭数を超えています。', 'endingFosterCount');
  }

  // V-04: 収支整合
  const balance = checkBalance(input);
  const needsReview = !balance.balanced;
  if (needsReview) {
    add('V-04', balanceMode === 'error' ? 'error' : 'warning',
      `収支が一致しません（差分 ${balance.delta > 0 ? '+' : ''}${balance.delta}）。`
      + `記録開始 ${input.beginningCount} ＋ 収容 ${balance.intakeTotal} − 転帰 ${balance.outcomeTotal} = ${balance.expectedEnding}、`
      + `入力した記録終了は ${balance.actualEnding} です。`);
  }

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  return { issues, errors, warnings, ok: errors.length === 0, balance, needsReview };
}
