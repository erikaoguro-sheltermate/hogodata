// 団体ごとの月次提出状況（純粋関数・テスト対象）
import type { MonthlyReport, Organization, ReportStatus, Species } from './types';

/** 団体が報告すべき種別（団体プロフィールの保護動物種。未設定なら犬・猫とも） */
export function expectedSpecies(org: Pick<Organization, 'animalTypes'>): Species[] {
  const kinds = (org.animalTypes ?? []).filter((k): k is Species => k === 'DOG' || k === 'CAT');
  return kinds.length > 0 ? kinds : ['DOG', 'CAT'];
}

export type SlotState = 'none' | ReportStatus;
export type OrgMonthState = 'done' | 'partial' | 'none';

export interface OrgMonthStatus {
  species: Species[];
  slots: Partial<Record<Species, { state: SlotState; report?: MonthlyReport }>>;
  /** done=全種別が提出済み/確定、partial=一部または下書きあり、none=何もない */
  state: OrgMonthState;
}

export function orgMonthStatus(
  org: Pick<Organization, 'id' | 'animalTypes'>, reports: MonthlyReport[], year: number, month: number,
): OrgMonthStatus {
  const species = expectedSpecies(org);
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
  return { species, slots, state: submitted === species.length ? 'done' : any > 0 ? 'partial' : 'none' };
}
