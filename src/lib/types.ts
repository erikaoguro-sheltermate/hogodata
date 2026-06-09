// JASA Data Hub — ドメイン型（Prismaモデル / API ペイロードに対応）
// 仕様書 §3・§5 準拠。UI・データ層・バリデーションで共用する。

export type Role = 'ADMIN' | 'ORG_USER' | 'VIEWER';
export type Species = 'DOG' | 'CAT';
export type Region = 'IN_PREF' | 'ADJACENT' | 'DISTANT' | 'NONE';
export type ReportStatus = 'DRAFT' | 'SUBMITTED' | 'CONFIRMED';

export type AgeGroupCode = 'UNDER_5M' | 'M5_TO_Y10' | 'OVER_10Y';
export type IntakeCode =
  | 'STRAY' | 'OWNER_SURRENDER' | 'FROM_GOV' | 'TRANSFER_IN'
  | 'NEGLECT' | 'FROM_TNR' | 'OTHER';
export type OutcomeCode =
  | 'DIED' | 'LOST' | 'EUTHANASIA' | 'ADOPTION'
  | 'RTO' | 'TRANSFER_OUT' | 'OUTDOOR_RELEASE' | 'OTHER_LIVE';

// ---- マスタ ----
export interface AgeGroup {
  code: AgeGroupCode;
  name: string;
  sortOrder: number;
}
export interface RegionOption {
  code: Exclude<Region, 'NONE'>;
  name: string;
  sortOrder: number;
}
export interface IntakeCategory {
  code: IntakeCode;
  name: string;
  requiresRegion: boolean;
  species: Species | null; // null=共通, 'CAT'=猫のみ
  sortOrder: number;
}
export interface OutcomeCategory {
  code: OutcomeCode;
  name: string;
  isLiveOutcome: boolean;
  requiresRegion: boolean;
  species: Species | null;
  sortOrder: number;
}
export interface Prefecture {
  id: string;
  code: string; // JISコード（2桁）
  name: string;
  region: string; // 地方ブロック
}

// ---- 団体 ----
export type AnimalKind = 'DOG' | 'CAT' | 'OTHER';

export interface Organization {
  id: string;
  name: string;
  prefectureCode: string;
  orgType: string;
  contactName?: string | null;
  contactEmail?: string | null;
  isActive: boolean;
  notes?: string | null;
  // ---- 団体プロフィール（登録フォーム項目）----
  establishedYear?: number | null;        // 活動開始年
  animalHandling?: string | null;         // 動物取扱業の区分
  animalTypes?: AnimalKind[];             // 保護している動物種（複数）
  memberCount?: number | null;            // 正規メンバーの人数
  volunteerCount?: number | null;         // ボランティアの人数
  avgAnimalsManaged?: number | null;      // 管理している動物の平均頭数
  partnerMunicipalities?: string | null;  // 連携している自治体（自由記述）
  hasPartnerOrgs?: boolean | null;        // 連携している民間団体の有無
  activities?: string[];                  // 主な活動内容（複数選択）
}

// ---- 明細（入力ペイロード） ----
export interface IntakeEntryInput {
  intakeCategoryCode: IntakeCode;
  ageGroupCode: AgeGroupCode;
  region: Region; // requiresRegion=false は 'NONE'
  count: number;
}
export interface OutcomeEntryInput {
  outcomeCategoryCode: OutcomeCode;
  ageGroupCode: AgeGroupCode;
  region: Region;
  count: number;
}
export interface TnrInput {
  periodStart: string | null;
  periodEnd: string | null;
  soloCount: number;
  collaborativeCount: number;
}

// ---- レポート入力（フォーム→API、仕様書 §5.1） ----
export interface ReportInput {
  organizationId: string;
  species: Species;
  year: number;
  month: number;
  periodStart: string; // ISO date
  periodEnd: string;
  beginningCount: number;
  beginningFosterCount: number;
  endingCount: number;
  endingFosterCount: number;
  note?: string;
  intakeEntries: IntakeEntryInput[];
  outcomeEntries: OutcomeEntryInput[];
  tnr?: TnrInput | null; // 猫のみ
}

// ---- 保存済みレポート ----
export interface MonthlyReport extends ReportInput {
  id: string;
  status: ReportStatus;
  submittedAt: string | null;
  enteredById: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
