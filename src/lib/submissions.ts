// 団体ごとの月次提出状況（純粋関数・テスト対象）
import type { MonthlyReport, Organization, ReportStatus, Species } from './types';

/** 団体が報告すべき種別（団体プロフィールの保護動物種。未設定なら犬・猫とも） */
export function expectedSpecies(org: Pick<Organization, 'animalTypes'>): Species[] {
  const kinds = (org.animalTypes ?? []).filter((k): k is Species => k === 'DOG' || k === 'CAT');
  return kinds.length > 0 ? kinds : ['DOG', 'CAT'];
}

export type SlotState = 'none' | ReportStatus;
export type OrgMonthState = 'done' | 'partial' | 'none' | 'na';

export interface OrgMonthStatus {
  species: Species[];
  slots: Partial<Record<Species, { state: SlotState; report?: MonthlyReport }>>;
  /** done=全種別が提出済み/確定、partial=一部または下書きあり、none=何もない、na=参加前の月 */
  state: OrgMonthState;
}

/** 犬・猫のどちらかを報告対象にしている団体か（未設定なら対象） */
export function handlesDogOrCat(org: Pick<Organization, 'animalTypes'>): boolean {
  const t = org.animalTypes ?? [];
  return t.length === 0 || t.includes('DOG') || t.includes('CAT');
}

export function orgMonthStatus(
  org: Pick<Organization, 'id' | 'animalTypes' | 'joinedYear' | 'joinedMonth'>, reports: MonthlyReport[], year: number, month: number,
): OrgMonthStatus {
  const species = expectedSpecies(org);
  const participating = isParticipating(org, year, month) && handlesDogOrCat(org);
  const slots: OrgMonthStatus['slots'] = {};
  let submitted = 0;
  let any = 0;
  for (const s of species) {
    const report = reports.find((r) => r.organizationId === org.id && r.species === s && r.year === year && r.month === month);
    const state: SlotState = report?.status ?? 'none';
    slots[s] = { state, report };
    if (report) any++;
    if (state === 'SUBMITTED' || state === 'CONFIRMED') submitted++;
  }
  const state: OrgMonthState = submitted === species.length ? 'done' : any > 0 ? 'partial' : participating ? 'none' : 'na';
  return { species, slots, state };
}

/** その月がプロジェクト参加後か（参加開始月が未設定なら常に対象） */
export function isParticipating(org: Pick<Organization, 'joinedYear' | 'joinedMonth'>, year: number, month: number): boolean {
  if (!org.joinedYear) return true;
  const jm = org.joinedMonth ?? 1;
  return year > org.joinedYear || (year === org.joinedYear && month >= jm);
}

/** 差し戻し中（理由付きで下書きに戻され、まだ再提出されていない） */
export function isReturned(r: Pick<MonthlyReport, 'status' | 'returnNote' | 'returnedAt' | 'resubmittedAt'>): boolean {
  if (r.status !== 'DRAFT' || !r.returnNote || !r.returnedAt) return false;
  return !r.resubmittedAt || r.resubmittedAt < r.returnedAt;
}

/** 提出後に修正・再提出された（事務局が見直すべき） */
export function wasResubmitted(r: Pick<MonthlyReport, 'status' | 'resubmittedAt'>): boolean {
  return r.status === 'SUBMITTED' && !!r.resubmittedAt;
}

/** 年の選択肢：パイロット開始年〜今年度の翌年 */
export const FIRST_YEAR = 2026;
export function yearOptions(today: Date = new Date()): number[] {
  const last = Math.max(FIRST_YEAR + 1, today.getFullYear() + 1);
  return Array.from({ length: last - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);
}
