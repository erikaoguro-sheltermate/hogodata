// JASA Data Hub — マスタ初期データ（仕様書 §3.1）
// prisma/seed.ts と同一の定義。UI とインメモリデータ層が参照する。

import type {
  AgeGroup, RegionOption, IntakeCategory, OutcomeCategory,
  Prefecture, Species, Region, ReportStatus,
} from './types';

// ---- 年齢区分 ----
export const AGE_GROUPS: AgeGroup[] = [
  { code: 'UNDER_5M', name: '〜5ヶ月齢', sortOrder: 1 },
  { code: 'M5_TO_Y10', name: '5ヶ月〜10歳', sortOrder: 2 },
  { code: 'OVER_10Y', name: '10歳〜', sortOrder: 3 },
];

// ---- 地域区分（NONE は除く。入力で使う3区分）----
export const REGION_OPTIONS: RegionOption[] = [
  { code: 'IN_PREF', name: '県内', sortOrder: 1 },
  { code: 'ADJACENT', name: '県外：隣接', sortOrder: 2 },
  { code: 'DISTANT', name: '県外：遠隔', sortOrder: 3 },
];

// ---- 収容カテゴリー ----
export const INTAKE_CATEGORIES: IntakeCategory[] = [
  { code: 'STRAY', name: '所有者不明', requiresRegion: true, species: null, sortOrder: 1 },
  { code: 'OWNER_SURRENDER', name: '飼い主からの引き取り', requiresRegion: true, species: null, sortOrder: 2 },
  { code: 'FROM_GOV', name: '行政施設からの引き取り', requiresRegion: true, species: null, sortOrder: 3 },
  { code: 'TRANSFER_IN', name: '他の民間団体からの移動', requiresRegion: true, species: null, sortOrder: 4 },
  { code: 'NEGLECT', name: '不適切飼養環境からの収容', requiresRegion: true, species: null, sortOrder: 5 },
  { code: 'FROM_TNR', name: 'TNR経由からの収容', requiresRegion: false, species: 'CAT', sortOrder: 6 },
  { code: 'OTHER', name: 'その他', requiresRegion: false, species: null, sortOrder: 7 },
];

// ---- 転帰カテゴリー ----
export const OUTCOME_CATEGORIES: OutcomeCategory[] = [
  { code: 'DIED', name: '死亡', isLiveOutcome: false, requiresRegion: false, species: null, sortOrder: 1 },
  { code: 'LOST', name: '行方不明・失踪', isLiveOutcome: false, requiresRegion: false, species: null, sortOrder: 2 },
  { code: 'EUTHANASIA', name: '安楽死', isLiveOutcome: false, requiresRegion: false, species: null, sortOrder: 3 },
  { code: 'ADOPTION', name: '一般譲渡', isLiveOutcome: true, requiresRegion: true, species: null, sortOrder: 4 },
  { code: 'RTO', name: '飼い主への返還', isLiveOutcome: true, requiresRegion: false, species: null, sortOrder: 5 },
  { code: 'TRANSFER_OUT', name: '他の民間団体への引渡し', isLiveOutcome: true, requiresRegion: true, species: null, sortOrder: 6 },
  { code: 'OUTDOOR_RELEASE', name: '屋外へのリリース', isLiveOutcome: true, requiresRegion: false, species: 'CAT', sortOrder: 7 },
  { code: 'OTHER_LIVE', name: 'その他', isLiveOutcome: true, requiresRegion: false, species: null, sortOrder: 8 },
];

// ---- 都道府県（JISコード + 地方ブロック）----
const PREF_RAW: Array<[string, string, string]> = [
  ['01', '北海道', '北海道'],
  ['02', '青森県', '東北'], ['03', '岩手県', '東北'], ['04', '宮城県', '東北'],
  ['05', '秋田県', '東北'], ['06', '山形県', '東北'], ['07', '福島県', '東北'],
  ['08', '茨城県', '関東'], ['09', '栃木県', '関東'], ['10', '群馬県', '関東'],
  ['11', '埼玉県', '関東'], ['12', '千葉県', '関東'], ['13', '東京都', '関東'], ['14', '神奈川県', '関東'],
  ['15', '新潟県', '中部'], ['16', '富山県', '中部'], ['17', '石川県', '中部'], ['18', '福井県', '中部'],
  ['19', '山梨県', '中部'], ['20', '長野県', '中部'], ['21', '岐阜県', '中部'], ['22', '静岡県', '中部'], ['23', '愛知県', '中部'],
  ['24', '三重県', '近畿'], ['25', '滋賀県', '近畿'], ['26', '京都府', '近畿'], ['27', '大阪府', '近畿'],
  ['28', '兵庫県', '近畿'], ['29', '奈良県', '近畿'], ['30', '和歌山県', '近畿'],
  ['31', '鳥取県', '中国'], ['32', '島根県', '中国'], ['33', '岡山県', '中国'], ['34', '広島県', '中国'], ['35', '山口県', '中国'],
  ['36', '徳島県', '四国'], ['37', '香川県', '四国'], ['38', '愛媛県', '四国'], ['39', '高知県', '四国'],
  ['40', '福岡県', '九州'], ['41', '佐賀県', '九州'], ['42', '長崎県', '九州'], ['43', '熊本県', '九州'],
  ['44', '大分県', '九州'], ['45', '宮崎県', '九州'], ['46', '鹿児島県', '九州'], ['47', '沖縄県', '九州'],
];
export const PREFECTURES: Prefecture[] = PREF_RAW.map(([code, name, region]) => ({
  id: `pref_${code}`, code, name, region,
}));

export const REGION_BLOCKS = ['北海道', '東北', '関東', '中部', '近畿', '中国', '四国', '九州'];

// ---- 団体種別 ----
export const ORG_TYPES = ['NPO法人', '一般社団法人', '任意団体', '個人活動者', 'フォスター', 'その他'];

// ---- ラベル ----
export const SPECIES_LABEL: Record<Species, string> = { DOG: '犬', CAT: '猫' };
export const STATUS_LABEL: Record<ReportStatus, string> = {
  DRAFT: '下書き', SUBMITTED: '提出済み', CONFIRMED: '確定',
};
export const REGION_LABEL: Record<Region, string> = {
  IN_PREF: '県内', ADJACENT: '県外：隣接', DISTANT: '県外：遠隔', NONE: '—',
};

// ---- ヘルパー ----
/** 種別に応じた収容カテゴリー（猫のみ項目を犬では除外）。 */
export function intakeCategoriesFor(species: Species): IntakeCategory[] {
  return INTAKE_CATEGORIES.filter((c) => c.species === null || c.species === species);
}
/** 種別に応じた転帰カテゴリー。 */
export function outcomeCategoriesFor(species: Species): OutcomeCategory[] {
  return OUTCOME_CATEGORIES.filter((c) => c.species === null || c.species === species);
}
export function intakeCategory(code: string): IntakeCategory | undefined {
  return INTAKE_CATEGORIES.find((c) => c.code === code);
}
export function outcomeCategory(code: string): OutcomeCategory | undefined {
  return OUTCOME_CATEGORIES.find((c) => c.code === code);
}
export function prefectureByCode(code: string): Prefecture | undefined {
  return PREFECTURES.find((p) => p.code === code);
}
