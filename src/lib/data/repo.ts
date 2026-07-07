// JASA Data Hub — データアクセスAPI（非同期・環境で自動切替）
//
// DATABASE_URL が設定されていれば Prisma（本番DB）、未設定ならインメモリ（デモ）を使う。
// UI（Server Components / Server Actions）はこの層のみを呼ぶ。

import type { Organization, MonthlyReport, ReportInput, ReportStatus, Species } from '../types';
import { isDatabaseConfigured } from '../db';
import * as memory from './memory-repo';
import * as database from './prisma-repo';

export type { ReportFilter } from './store';
import type { ReportFilter } from './store';

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
export function deleteReport(id: string): Promise<boolean> {
  return impl().deleteReport(id);
}

export function getReportNote(key: string): Promise<string | null> {
  return impl().getReportNote(key);
}
export function saveReportNote(key: string, body: string, updatedBy?: string): Promise<void> {
  return impl().saveReportNote(key, body, updatedBy);
}
