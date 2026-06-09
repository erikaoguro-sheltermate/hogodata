// JASA Data Hub — データアクセスAPI（非同期）
// UI（Server Components / Server Actions）はこの層のみを呼ぶ。
// Prisma移行時はこのファイルの実装だけを差し替える。

import type { Organization, MonthlyReport, ReportInput, ReportStatus, Species } from '../types';
import * as store from './store';

export type { ReportFilter } from './store';

export async function listOrganizations(): Promise<Organization[]> {
  return store._listOrganizations();
}
export async function getOrganization(id: string): Promise<Organization | undefined> {
  return store._getOrganization(id);
}
export async function createOrganization(data: Omit<Organization, 'id'>): Promise<Organization> {
  return store._createOrganization(data);
}
export async function updateOrganization(id: string, data: Partial<Omit<Organization, 'id'>>): Promise<Organization | undefined> {
  return store._updateOrganization(id, data);
}

export async function listReports(filter: store.ReportFilter = {}): Promise<MonthlyReport[]> {
  return store._listReports(filter);
}
export async function getReport(id: string): Promise<MonthlyReport | undefined> {
  return store._getReport(id);
}
export async function findReport(organizationId: string, species: Species, year: number, month: number): Promise<MonthlyReport | undefined> {
  return store._findReport(organizationId, species, year, month);
}
export async function saveReport(input: ReportInput, id: string | undefined, enteredById: string): Promise<MonthlyReport> {
  return store._saveReport(input, id, enteredById);
}
export async function setReportStatus(id: string, status: ReportStatus): Promise<MonthlyReport | undefined> {
  return store._setReportStatus(id, status);
}
export async function deleteReport(id: string): Promise<boolean> {
  return store._deleteReport(id);
}
