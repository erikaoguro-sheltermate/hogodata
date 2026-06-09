// ============================================================================
// JASA Data Hub — ドメイン型
// DBスキーマ（supabase/migrations）と1:1で対応する中核の型定義。
// UI・Infra から独立した純粋な型として保つ。
// ============================================================================

export type Species = 'dog' | 'cat';
export type CategorySpecies = 'common' | 'cat';
export type OutcomeKind = 'live' | 'non_live';
export type ReportSection = 'intake' | 'outcome_live' | 'outcome_nonlive';
export type ReportStatus = 'draft' | 'submitted' | 'confirmed';
export type UserRole = 'admin' | 'org_user' | 'viewer';
export type PopPoint = 'start' | 'end';

/** 年齢区分（§5.0） */
export type AgeBandCode = 'u5m' | '5m_10y' | 'o10y';
/** 地域区分（§5.1） */
export type RegionCode = 'in_pref' | 'out_adjacent' | 'out_remote';

export interface AgeBand {
  code: string;
  label: string;
  sortOrder: number;
}

export interface Region {
  code: string;
  label: string;
  sortOrder: number;
}

export interface IntakeCategory {
  code: string;
  label: string;
  definition: string | null;
  hasRegion: boolean;
  species: CategorySpecies;
  sortOrder: number;
}

export interface OutcomeCategory {
  code: string;
  label: string;
  definition: string | null;
  outcomeKind: OutcomeKind;
  hasRegion: boolean;
  species: CategorySpecies;
  sortOrder: number;
}

export interface Organization {
  id: string;
  name: string;
  prefectureCode: string | null;
  activity: 'shelter' | 'foster_based' | 'tnr' | 'mixed' | 'other';
  isTnrActive: boolean;
  notes: string | null;
}

/** 月次レポート（団体 × 種別 × 対象期間 = 1単位） */
export interface MonthlyReport {
  id: string;
  organizationId: string;
  species: Species;
  periodStart: string; // ISO date
  periodEnd: string; // ISO date
  status: ReportStatus;
  notes: string | null;
}

/** マトリクスの実データ1セル（§5.1 / §5.2） */
export interface ReportLine {
  section: ReportSection;
  categoryCode: string;
  regionCode: RegionCode | null; // 地域区分を持たないカテゴリーは null
  ageBandCode: AgeBandCode;
  count: number;
}

/** 管理頭数（§5.3） */
export interface PopulationCount {
  point: PopPoint;
  totalCount: number;
  fosterCount: number; // うち一時預かり先（内数）
}

/** TNR頭数（§5.4・猫のみ） */
export interface TnrRecord {
  periodStart: string | null;
  periodEnd: string | null;
  soloCount: number;
  collaborativeCount: number;
}
