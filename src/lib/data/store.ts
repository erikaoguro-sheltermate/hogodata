// JASA Data Hub — インメモリ・データストア（デモ/開発用）
//
// 本番は Prisma + Supabase（prisma/schema.prisma）に置き換える前提。
// ここではDBなしで UI を起動・確認できるよう、シード済みのインメモリ実装を提供する。
// アクセスは src/lib/data/repo.ts の非同期APIを通す（Prisma移行時に repo だけ差し替え）。

import type {
  Organization, MonthlyReport, ReportInput, ReportStatus,
  Species, IntakeEntryInput, OutcomeEntryInput,
} from '../types';
import { PREFECTURES, INTAKE_CATEGORIES, OUTCOME_CATEGORIES } from '../masters';
import { checkBalance } from '../validation/balance';

interface DB {
  organizations: Organization[];
  reports: MonthlyReport[];
}

// HMR をまたいで状態を保持する（dev で seed が毎回走らないように）
const g = globalThis as unknown as { __jasaDB?: DB };

function nowIso() {
  return new Date().toISOString();
}

// ---- シード生成ヘルパー ----
type Cell = [cat: string, age: string, region: string, count: number];

function buildReport(
  id: string, org: Organization, species: Species, year: number, month: number,
  beginning: number, beginningFoster: number, endingFoster: number,
  intakeCells: Cell[], outcomeCells: Cell[],
  tnr?: { solo: number; collab: number },
): MonthlyReport {
  const intakeEntries: IntakeEntryInput[] = intakeCells.map(([cat, age, region, count]) => ({
    intakeCategoryCode: cat as IntakeEntryInput['intakeCategoryCode'],
    ageGroupCode: age as IntakeEntryInput['ageGroupCode'],
    region: region as IntakeEntryInput['region'],
    count,
  }));
  const outcomeEntries: OutcomeEntryInput[] = outcomeCells.map(([cat, age, region, count]) => ({
    outcomeCategoryCode: cat as OutcomeEntryInput['outcomeCategoryCode'],
    ageGroupCode: age as OutcomeEntryInput['ageGroupCode'],
    region: region as OutcomeEntryInput['region'],
    count,
  }));
  const { expectedEnding } = checkBalance({
    beginningCount: beginning, endingCount: 0, intakeEntries, outcomeEntries,
  });
  const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const periodEnd = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
  return {
    id,
    organizationId: org.id,
    species,
    year,
    month,
    periodStart,
    periodEnd,
    beginningCount: beginning,
    beginningFosterCount: beginningFoster,
    endingCount: expectedEnding, // シードは収支整合させる
    endingFosterCount: endingFoster,
    note: null as unknown as undefined,
    intakeEntries,
    outcomeEntries,
    tnr: species === 'CAT' && tnr
      ? { periodStart, periodEnd, soloCount: tnr.solo, collaborativeCount: tnr.collab }
      : null,
    status: 'SUBMITTED',
    submittedAt: nowIso(),
    enteredById: 'seed-admin',
    isActive: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function seed(): DB {
  const pref = (code: string) => PREFECTURES.find((p) => p.code === code)!.code;
  const organizations: Organization[] = [
    {
      id: 'org_1', name: 'あおぞら動物保護ネット', prefectureCode: pref('13'), orgType: 'NPO法人',
      contactName: '山田 花子', contactEmail: 'aozora@example.org', isActive: true, notes: null,
      establishedYear: 2015, animalHandling: ['第一種動物取扱業（登録）', '第二種動物取扱業（届出）'], animalTypes: ['DOG', 'CAT'],
      memberCount: 8, volunteerCount: 45, avgAnimalsManaged: '51〜100匹',
      partnerMunicipalities: '東京都、世田谷区', hasPartnerOrgs: true,
      activities: ['行政施設からの引き出し', 'TNR活動', '高齢動物の保護、引き取り'],
    },
    {
      id: 'org_2', name: 'にゃんこハウス神奈川', prefectureCode: pref('14'), orgType: '一般社団法人',
      contactName: '佐藤 太郎', contactEmail: 'nyanko@example.org', isActive: true, notes: null,
      establishedYear: 2018, animalHandling: ['第二種動物取扱業（届出）'], animalTypes: ['CAT'],
      memberCount: 4, volunteerCount: 22, avgAnimalsManaged: '51〜100匹',
      partnerMunicipalities: '横浜市', hasPartnerOrgs: true,
      activities: ['TNR活動', '多頭飼育崩壊への介入', '離乳前のミルクボランティア'],
    },
    {
      id: 'org_3', name: 'いぬねこ里親会おおさか', prefectureCode: pref('27'), orgType: '任意団体',
      contactName: '田中 美咲', contactEmail: null, isActive: true, notes: null,
      establishedYear: 2012, animalHandling: ['届出予定'], animalTypes: ['DOG', 'CAT'],
      memberCount: 6, volunteerCount: 30, avgAnimalsManaged: '0〜50匹',
      partnerMunicipalities: '大阪府、大阪市、堺市', hasPartnerOrgs: false,
      activities: ['行政施設からの引き出し', '飼い主からの引き取り依頼への対応', '高齢動物の保護、引き取り'],
    },
    {
      id: 'org_4', name: '北の動物ボランティア', prefectureCode: pref('01'), orgType: '個人活動者',
      contactName: '鈴木 一郎', contactEmail: null, isActive: true, notes: null,
      establishedYear: 2020, animalHandling: ['登録・届出なし'], animalTypes: ['DOG', 'CAT', 'OTHER'],
      memberCount: 1, volunteerCount: 5, avgAnimalsManaged: '0〜50匹',
      partnerMunicipalities: '札幌市', hasPartnerOrgs: false,
      activities: ['多頭飼育崩壊への介入', '離乳前のミルクボランティア'],
    },
    {
      id: 'org_5', name: 'ふくおか保護犬の家', prefectureCode: pref('40'), orgType: 'NPO法人',
      contactName: '高橋 結衣', contactEmail: 'fukuoka@example.org', isActive: true, notes: null,
      establishedYear: 2016, animalHandling: ['第一種動物取扱業（登録）'], animalTypes: ['DOG'],
      memberCount: 5, volunteerCount: 18, avgAnimalsManaged: '0〜50匹',
      partnerMunicipalities: '福岡県、福岡市', hasPartnerOrgs: true,
      activities: ['行政施設からの引き出し', '繁殖引退動物、ペットショップ、ブリーダーからの引き取り'],
    },
  ];

  const reports: MonthlyReport[] = [
    // org_1 犬・猫（4月・5月）
    buildReport('rep_1', organizations[0], 'DOG', 2026, 4, 30, 10, 12,
      [['STRAY', 'M5_TO_Y10', 'IN_PREF', 5], ['FROM_GOV', 'M5_TO_Y10', 'IN_PREF', 4], ['OWNER_SURRENDER', 'OVER_10Y', 'IN_PREF', 2], ['NEGLECT', 'UNDER_5M', 'ADJACENT', 3]],
      [['ADOPTION', 'M5_TO_Y10', 'IN_PREF', 6], ['ADOPTION', 'UNDER_5M', 'IN_PREF', 2], ['RTO', 'M5_TO_Y10', 'NONE', 1], ['DIED', 'OVER_10Y', 'NONE', 1]]),
    buildReport('rep_2', organizations[0], 'CAT', 2026, 4, 45, 18, 16,
      [['STRAY', 'UNDER_5M', 'IN_PREF', 9], ['FROM_TNR', 'UNDER_5M', 'NONE', 4], ['NEGLECT', 'M5_TO_Y10', 'IN_PREF', 5]],
      [['ADOPTION', 'UNDER_5M', 'IN_PREF', 8], ['OUTDOOR_RELEASE', 'M5_TO_Y10', 'NONE', 6], ['DIED', 'UNDER_5M', 'NONE', 2]],
      { solo: 14, collab: 6 }),
    buildReport('rep_3', organizations[0], 'DOG', 2026, 5, 31, 12, 11,
      [['STRAY', 'M5_TO_Y10', 'IN_PREF', 4], ['FROM_GOV', 'M5_TO_Y10', 'ADJACENT', 6], ['TRANSFER_IN', 'UNDER_5M', 'DISTANT', 2]],
      [['ADOPTION', 'M5_TO_Y10', 'IN_PREF', 7], ['TRANSFER_OUT', 'M5_TO_Y10', 'ADJACENT', 2], ['EUTHANASIA', 'OVER_10Y', 'NONE', 1]]),
    // org_2 猫
    buildReport('rep_4', organizations[1], 'CAT', 2026, 5, 52, 20, 22,
      [['STRAY', 'UNDER_5M', 'IN_PREF', 12], ['FROM_TNR', 'UNDER_5M', 'NONE', 7], ['OWNER_SURRENDER', 'M5_TO_Y10', 'IN_PREF', 3]],
      [['ADOPTION', 'UNDER_5M', 'IN_PREF', 10], ['ADOPTION', 'M5_TO_Y10', 'ADJACENT', 3], ['OUTDOOR_RELEASE', 'M5_TO_Y10', 'NONE', 5]],
      { solo: 22, collab: 10 }),
    // org_3 犬
    buildReport('rep_5', organizations[2], 'DOG', 2026, 5, 28, 8, 9,
      [['FROM_GOV', 'M5_TO_Y10', 'IN_PREF', 8], ['STRAY', 'OVER_10Y', 'IN_PREF', 2], ['NEGLECT', 'M5_TO_Y10', 'DISTANT', 4]],
      [['ADOPTION', 'M5_TO_Y10', 'IN_PREF', 9], ['RTO', 'M5_TO_Y10', 'NONE', 2], ['DIED', 'OVER_10Y', 'NONE', 1]]),
    // org_5 犬（下書き）
    { ...buildReport('rep_6', organizations[4], 'DOG', 2026, 5, 20, 5, 5,
      [['STRAY', 'M5_TO_Y10', 'IN_PREF', 3], ['FROM_GOV', 'M5_TO_Y10', 'IN_PREF', 2]],
      [['ADOPTION', 'M5_TO_Y10', 'IN_PREF', 4]]),
      status: 'DRAFT', submittedAt: null },
  ];

  return { organizations, reports };
}

function db(): DB {
  if (!g.__jasaDB) g.__jasaDB = seed();
  return g.__jasaDB;
}

// ============================================================
// Organizations
// ============================================================
export function _listOrganizations(): Organization[] {
  return db().organizations.slice().sort((a, b) => a.name.localeCompare(b.name, 'ja'));
}
export function _getOrganization(id: string): Organization | undefined {
  return db().organizations.find((o) => o.id === id);
}
export function _createOrganization(data: Omit<Organization, 'id'>): Organization {
  const org: Organization = { ...data, id: `org_${crypto.randomUUID().slice(0, 8)}` };
  db().organizations.push(org);
  return org;
}
export function _updateOrganization(id: string, data: Partial<Omit<Organization, 'id'>>): Organization | undefined {
  const org = _getOrganization(id);
  if (!org) return undefined;
  Object.assign(org, data);
  return org;
}

// ============================================================
// Reports
// ============================================================
export interface ReportFilter {
  year?: number;
  month?: number;
  species?: Species;
  organizationId?: string;
  status?: ReportStatus;
  prefectureCode?: string;
  regionBlock?: string;
}

export function _listReports(filter: ReportFilter = {}): MonthlyReport[] {
  const orgs = db().organizations;
  return db().reports
    .filter((r) => r.isActive)
    .filter((r) => (filter.year ? r.year === filter.year : true))
    .filter((r) => (filter.month ? r.month === filter.month : true))
    .filter((r) => (filter.species ? r.species === filter.species : true))
    .filter((r) => (filter.organizationId ? r.organizationId === filter.organizationId : true))
    .filter((r) => (filter.status ? r.status === filter.status : true))
    .filter((r) => {
      if (!filter.prefectureCode && !filter.regionBlock) return true;
      const org = orgs.find((o) => o.id === r.organizationId);
      if (!org) return false;
      if (filter.prefectureCode && org.prefectureCode !== filter.prefectureCode) return false;
      if (filter.regionBlock) {
        const pref = PREFECTURES.find((p) => p.code === org.prefectureCode);
        if (!pref || pref.region !== filter.regionBlock) return false;
      }
      return true;
    })
    .sort((a, b) => (b.year - a.year) || (b.month - a.month) || a.organizationId.localeCompare(b.organizationId));
}

export function _getReport(id: string): MonthlyReport | undefined {
  return db().reports.find((r) => r.id === id && r.isActive);
}

export function _findReport(organizationId: string, species: Species, year: number, month: number): MonthlyReport | undefined {
  return db().reports.find(
    (r) => r.isActive && r.organizationId === organizationId && r.species === species && r.year === year && r.month === month,
  );
}

export function _saveReport(input: ReportInput, id: string | undefined, enteredById: string): MonthlyReport {
  const reports = db().reports;
  if (id) {
    const existing = reports.find((r) => r.id === id);
    if (existing) {
      Object.assign(existing, input, { updatedAt: nowIso() });
      return existing;
    }
  }
  const report: MonthlyReport = {
    ...input,
    id: `rep_${crypto.randomUUID().slice(0, 8)}`,
    status: 'DRAFT',
    submittedAt: null,
    enteredById,
    isActive: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  reports.push(report);
  return report;
}

export function _setReportStatus(id: string, status: ReportStatus): MonthlyReport | undefined {
  const r = _getReport(id);
  if (!r) return undefined;
  r.status = status;
  if (status === 'SUBMITTED') r.submittedAt = nowIso();
  r.updatedAt = nowIso();
  return r;
}

export function _deleteReport(id: string): boolean {
  const r = _getReport(id);
  if (!r) return false;
  r.isActive = false;
  r.updatedAt = nowIso();
  return true;
}
