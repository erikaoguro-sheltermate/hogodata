// JASA Data Hub — データアクセスAPI（非同期・環境で自動切替）
//
// DATABASE_URL が設定されていれば Prisma（本番DB）、未設定ならインメモリ（デモ）を使う。
// UI（Server Components / Server Actions）はこの層のみを呼ぶ。

import type { Organization, MonthlyReport, ReportInput, ReportStatus, Species, UserProfile, AuditEntry, Announcement, PortalSettings } from '../types';
import { isDatabaseConfigured } from '../db';
import { DEFAULT_SETTINGS } from '../deadline';
import * as memory from './memory-repo';
import * as database from './prisma-repo';

export type { ReportFilter, ReportMetaPatch } from './store';
import type { ReportFilter, ReportMetaPatch } from './store';

function impl() {
  return isDatabaseConfigured() ? database : memory;
}

export function listOrganizations(): Promise<Organization[]> {
  return impl().listOrganizations();
}
export function getOrganization(id: string): Promise<Organization | undefined> {
  return impl().getOrganization(id);
}
export function createOrganization(data: Omit<Organization, 'id'>): Promise<Organization> {
  return impl().createOrganization(data);
}
export function updateOrganization(id: string, data: Partial<Omit<Organization, 'id'>>): Promise<Organization | undefined> {
  return impl().updateOrganization(id, data);
}

export function listReports(filter: ReportFilter = {}): Promise<MonthlyReport[]> {
  return impl().listReports(filter);
}
export function getReport(id: string): Promise<MonthlyReport | undefined> {
  return impl().getReport(id);
}
export function findReport(organizationId: string, species: Species, year: number, month: number): Promise<MonthlyReport | undefined> {
  return impl().findReport(organizationId, species, year, month);
}
export function saveReport(input: ReportInput, id: string | undefined, enteredById: string): Promise<MonthlyReport> {
  return impl().saveReport(input, id, enteredById);
}
export function setReportStatus(id: string, status: ReportStatus): Promise<MonthlyReport | undefined> {
  return impl().setReportStatus(id, status);
}
export function patchReportMeta(id: string, patch: ReportMetaPatch): Promise<void> {
  return impl().patchReportMeta(id, patch);
}
export function deleteReport(id: string): Promise<boolean> {
  return impl().deleteReport(id);
}

export function getReportNote(key: string): Promise<string | null> {
  return impl().getReportNote(key);
}
export function saveReportNote(key: string, body: string, updatedBy?: string): Promise<void> {
  return impl().saveReportNote(key, body, updatedBy);
}

export function listProfiles(): Promise<UserProfile[]> {
  return impl().listProfiles();
}
export function getProfile(id: string): Promise<UserProfile | undefined> {
  return impl().getProfile(id);
}
export function upsertProfile(p: Omit<UserProfile, 'createdAt'>): Promise<UserProfile> {
  return impl().upsertProfile(p);
}
/** 監査ログ（F-12）。記録の失敗で本処理を止めない。 */
export async function recordAudit(e: Omit<AuditEntry, 'id' | 'createdAt' | 'actorName'>): Promise<void> {
  try {
    await impl().recordAudit(e);
  } catch (err) {
    console.error('[audit] 記録に失敗しました', err);
  }
}
export function listAudit(limit = 200): Promise<AuditEntry[]> {
  return impl().listAudit(limit);
}

// お知らせ・設定は表示の補助。テーブル未作成（マイグレーション前）でも画面を止めない。
async function orFallback<T>(p: Promise<T>, fallback: T, what: string): Promise<T> {
  try {
    return await p;
  } catch (err) {
    console.error(`[portal] ${what} を読み込めませんでした`, err);
    return fallback;
  }
}

export function listAnnouncements(): Promise<Announcement[]> {
  return orFallback(impl().listAnnouncements(), [], 'お知らせ');
}
export function saveAnnouncement(a: Pick<Announcement, 'title' | 'body' | 'pinned'>, id?: string, by?: string): Promise<Announcement> {
  return impl().saveAnnouncement(a, id, by);
}
export function deleteAnnouncement(id: string): Promise<void> {
  return impl().deleteAnnouncement(id);
}
export function readAnnouncementIds(userId: string): Promise<string[]> {
  return orFallback(impl().readAnnouncementIds(userId), [], '既読');
}
export function markAnnouncementsRead(userId: string, ids: string[]): Promise<void> {
  return impl().markAnnouncementsRead(userId, ids);
}
/** 未読のお知らせ件数 */
export async function unreadAnnouncementCount(userId: string): Promise<number> {
  const [all, read] = await Promise.all([listAnnouncements(), readAnnouncementIds(userId)]);
  const seen = new Set(read);
  return all.filter((a) => !seen.has(a.id)).length;
}
export function getSettings(): Promise<PortalSettings> {
  return orFallback(impl().getSettings(), DEFAULT_SETTINGS, '設定');
}
export function saveSettings(s: PortalSettings): Promise<void> {
  return impl().saveSettings(s);
}

/** 確認待ち（提出済み・未確定）の件数 */
export async function countAwaitingReview(): Promise<number> {
  return (await listReports({ status: 'SUBMITTED' })).length;
}
