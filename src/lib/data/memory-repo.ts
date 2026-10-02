// JASA Data Hub — インメモリ版データアクセス（デモ/開発用）。
// store.ts（シード済みインメモリ）を非同期APIでラップする。

import type { Organization, MonthlyReport, ReportInput, ReportStatus, Species, UserProfile, AuditEntry } from '../types';
import * as store from './store';

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

export async function getReportNote(key: string): Promise<string | null> {
  return store._getReportNote(key);
}
export async function saveReportNote(key: string, body: string, _updatedBy?: string): Promise<void> {
  store._saveReportNote(key, body);
}

export async function listProfiles(): Promise<UserProfile[]> {
  return store._listProfiles();
}
export async function getProfile(id: string): Promise<UserProfile | undefined> {
  return store._getProfile(id);
}
export async function upsertProfile(p: Omit<UserProfile, 'createdAt'>): Promise<UserProfile> {
  return store._upsertProfile(p);
}
export async function recordAudit(e: Omit<AuditEntry, 'id' | 'createdAt' | 'actorName'>): Promise<void> {
  store._recordAudit(e);
}
export async function listAudit(limit: number): Promise<AuditEntry[]> {
  return store._listAudit(limit);
}
