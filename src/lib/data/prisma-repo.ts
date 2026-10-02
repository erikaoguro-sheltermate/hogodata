// JASA Data Hub — Prisma 版データアクセス（本番DB）。
// インメモリ版（store.ts）と同一の非同期APIを提供する。
// アプリのドメイン型（コードベース）と Prisma のリレーショナル構造を相互変換する。

import { prisma } from '../db';
import type {
  Organization, MonthlyReport, ReportInput, ReportStatus, Species, AnimalKind, Region,
  UserProfile, AuditEntry, AuditAction, Role,
} from '../types';
import type { ReportFilter } from './store';

const REPORT_INCLUDE = {
  intakeEntries: { include: { intakeCategory: true, ageGroup: true } },
  outcomeEntries: { include: { outcomeCategory: true, ageGroup: true } },
  tnrEntry: true,
} as const;

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ---- マッピング ----
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toAppOrg(o: any): Organization {
  return {
    id: o.id,
    name: o.name,
    prefectureCode: o.prefecture?.code ?? '',
    orgType: o.orgType,
    contactName: o.contactName,
    contactEmail: o.contactEmail,
    isActive: o.isActive,
    notes: o.notes,
    establishedYear: o.establishedYear,
    animalHandling: o.animalHandling ?? [],
    animalTypes: (o.animalTypes ?? []) as AnimalKind[],
    memberCount: o.memberCount,
    volunteerCount: o.volunteerCount,
    avgAnimalsManaged: o.avgAnimalsManaged,
    partnerMunicipalities: o.partnerMunicipalities,
    hasPartnerOrgs: o.hasPartnerOrgs,
    activities: o.activities ?? [],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toAppReport(r: any): MonthlyReport {
  return {
    id: r.id,
    organizationId: r.organizationId,
    species: r.species as Species,
    year: r.year,
    month: r.month,
    periodStart: dateOnly(r.periodStart),
    periodEnd: dateOnly(r.periodEnd),
    beginningCount: r.beginningCount,
    beginningFosterCount: r.beginningFosterCount,
    endingCount: r.endingCount,
    endingFosterCount: r.endingFosterCount,
    note: r.note ?? undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    intakeEntries: r.intakeEntries.map((e: any) => ({
      intakeCategoryCode: e.intakeCategory.code,
      ageGroupCode: e.ageGroup.code,
      region: e.region as Region,
      count: e.count,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    outcomeEntries: r.outcomeEntries.map((e: any) => ({
      outcomeCategoryCode: e.outcomeCategory.code,
      ageGroupCode: e.ageGroup.code,
      region: e.region as Region,
      count: e.count,
    })),
    tnr: r.tnrEntry
      ? {
          periodStart: r.tnrEntry.periodStart ? dateOnly(r.tnrEntry.periodStart) : null,
          periodEnd: r.tnrEntry.periodEnd ? dateOnly(r.tnrEntry.periodEnd) : null,
          soloCount: r.tnrEntry.soloCount,
          collaborativeCount: r.tnrEntry.collaborativeCount,
        }
      : null,
    status: r.status as ReportStatus,
    submittedAt: r.submittedAt ? r.submittedAt.toISOString() : null,
    enteredById: r.enteredById ?? null,
    isActive: r.isActive,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

// ============================================================
// Organizations
// ============================================================
export async function listOrganizations(): Promise<Organization[]> {
  const rows = await prisma.organization.findMany({ include: { prefecture: true }, orderBy: { name: 'asc' } });
  return rows.map(toAppOrg);
}
export async function getOrganization(id: string): Promise<Organization | undefined> {
  const o = await prisma.organization.findUnique({ where: { id }, include: { prefecture: true } });
  return o ? toAppOrg(o) : undefined;
}

function orgWriteData(data: Partial<Omit<Organization, 'id'>>) {
  return {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.prefectureCode ? { prefecture: { connect: { code: data.prefectureCode } } } : {}),
    ...(data.orgType !== undefined ? { orgType: data.orgType } : {}),
    contactName: data.contactName ?? null,
    contactEmail: data.contactEmail ?? null,
    ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    notes: data.notes ?? null,
    establishedYear: data.establishedYear ?? null,
    animalHandling: data.animalHandling ?? [],
    animalTypes: data.animalTypes ?? [],
    memberCount: data.memberCount ?? null,
    volunteerCount: data.volunteerCount ?? null,
    avgAnimalsManaged: data.avgAnimalsManaged ?? null,
    partnerMunicipalities: data.partnerMunicipalities ?? null,
    hasPartnerOrgs: data.hasPartnerOrgs ?? null,
    activities: data.activities ?? [],
  };
}

export async function createOrganization(data: Omit<Organization, 'id'>): Promise<Organization> {
  const o = await prisma.organization.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: orgWriteData(data) as any,
    include: { prefecture: true },
  });
  return toAppOrg(o);
}
export async function updateOrganization(id: string, data: Partial<Omit<Organization, 'id'>>): Promise<Organization | undefined> {
  const o = await prisma.organization.update({
    where: { id },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: orgWriteData(data) as any,
    include: { prefecture: true },
  });
  return toAppOrg(o);
}

// ============================================================
// Reports
// ============================================================
export async function listReports(filter: ReportFilter = {}): Promise<MonthlyReport[]> {
  const prefWhere = filter.prefectureCode || filter.regionBlock
    ? { prefecture: { ...(filter.prefectureCode ? { code: filter.prefectureCode } : {}), ...(filter.regionBlock ? { region: filter.regionBlock } : {}) } }
    : undefined;
  const rows = await prisma.monthlyReport.findMany({
    where: {
      isActive: true,
      ...(filter.year ? { year: filter.year } : {}),
      ...(filter.month ? { month: filter.month } : {}),
      ...(filter.species ? { species: filter.species } : {}),
      ...(filter.organizationId ? { organizationId: filter.organizationId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(prefWhere ? { organization: prefWhere } : {}),
    },
    include: REPORT_INCLUDE,
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });
  return rows.map(toAppReport);
}

export async function getReport(id: string): Promise<MonthlyReport | undefined> {
  const r = await prisma.monthlyReport.findFirst({ where: { id, isActive: true }, include: REPORT_INCLUDE });
  return r ? toAppReport(r) : undefined;
}

export async function findReport(organizationId: string, species: Species, year: number, month: number): Promise<MonthlyReport | undefined> {
  const r = await prisma.monthlyReport.findFirst({
    where: { organizationId, species, year, month, isActive: true },
    include: REPORT_INCLUDE,
  });
  return r ? toAppReport(r) : undefined;
}

export async function saveReport(input: ReportInput, id: string | undefined, enteredById: string): Promise<MonthlyReport> {
  const header = {
    species: input.species,
    year: input.year,
    month: input.month,
    periodStart: new Date(input.periodStart),
    periodEnd: new Date(input.periodEnd),
    beginningCount: input.beginningCount,
    beginningFosterCount: input.beginningFosterCount,
    endingCount: input.endingCount,
    endingFosterCount: input.endingFosterCount,
    note: input.note ?? null,
    enteredById,
  };
  const intakeCreate = input.intakeEntries.map((e) => ({
    intakeCategory: { connect: { code: e.intakeCategoryCode } },
    ageGroup: { connect: { code: e.ageGroupCode } },
    region: e.region,
    count: e.count,
  }));
  const outcomeCreate = input.outcomeEntries.map((e) => ({
    outcomeCategory: { connect: { code: e.outcomeCategoryCode } },
    ageGroup: { connect: { code: e.ageGroupCode } },
    region: e.region,
    count: e.count,
  }));
  const tnrData = input.tnr && input.species === 'CAT'
    ? {
        periodStart: input.tnr.periodStart ? new Date(input.tnr.periodStart) : null,
        periodEnd: input.tnr.periodEnd ? new Date(input.tnr.periodEnd) : null,
        soloCount: input.tnr.soloCount,
        collaborativeCount: input.tnr.collaborativeCount,
      }
    : null;

  let reportId: string;
  if (id) {
    await prisma.monthlyReport.update({
      where: { id },
      data: {
        ...header,
        intakeEntries: { deleteMany: {}, create: intakeCreate },
        outcomeEntries: { deleteMany: {}, create: outcomeCreate },
      },
    });
    reportId = id;
  } else {
    const created = await prisma.monthlyReport.create({
      data: {
        organization: { connect: { id: input.organizationId } },
        ...header,
        status: 'DRAFT',
        intakeEntries: { create: intakeCreate },
        outcomeEntries: { create: outcomeCreate },
      },
    });
    reportId = created.id;
  }

  // TNR（1:1）は別途置換
  await prisma.tnrEntry.deleteMany({ where: { reportId } });
  if (tnrData) await prisma.tnrEntry.create({ data: { ...tnrData, reportId } });

  const full = await prisma.monthlyReport.findUnique({ where: { id: reportId }, include: REPORT_INCLUDE });
  return toAppReport(full);
}

export async function setReportStatus(id: string, status: ReportStatus): Promise<MonthlyReport | undefined> {
  const r = await prisma.monthlyReport.update({
    where: { id },
    data: { status, ...(status === 'SUBMITTED' ? { submittedAt: new Date() } : {}) },
    include: REPORT_INCLUDE,
  });
  return toAppReport(r);
}

export async function deleteReport(id: string): Promise<boolean> {
  await prisma.monthlyReport.update({ where: { id }, data: { isActive: false } });
  return true;
}

export async function getReportNote(key: string): Promise<string | null> {
  const n = await prisma.reportNote.findUnique({ where: { key } });
  return n?.body ?? null;
}
export async function saveReportNote(key: string, body: string, updatedBy?: string): Promise<void> {
  await prisma.reportNote.upsert({
    where: { key },
    update: { body, updatedBy: updatedBy ?? null },
    create: { key, body, updatedBy: updatedBy ?? null },
  });
}

// ============================================================
// Profiles / Audit
// ============================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toAppProfile(p: any): UserProfile {
  return {
    id: p.id,
    email: p.email,
    displayName: p.displayName,
    role: p.role as Role,
    organizationId: p.organizationId,
    createdAt: p.createdAt.toISOString(),
  };
}

export async function listProfiles(): Promise<UserProfile[]> {
  const rows = await prisma.profile.findMany({ orderBy: { displayName: 'asc' } });
  return rows.map(toAppProfile);
}
export async function getProfile(id: string): Promise<UserProfile | undefined> {
  const p = await prisma.profile.findUnique({ where: { id } });
  return p ? toAppProfile(p) : undefined;
}
export async function upsertProfile(p: Omit<UserProfile, 'createdAt'>): Promise<UserProfile> {
  const data = { email: p.email, displayName: p.displayName, role: p.role, organizationId: p.organizationId };
  const row = await prisma.profile.upsert({ where: { id: p.id }, update: data, create: { id: p.id, ...data } });
  return toAppProfile(row);
}

export async function recordAudit(e: Omit<AuditEntry, 'id' | 'createdAt' | 'actorName'>): Promise<void> {
  // actor は Profile への外部キー。Profile の無い操作者（共有パスワード運用など）は記録しない。
  const actor = await prisma.profile.findUnique({ where: { id: e.actorId }, select: { id: true } });
  if (!actor) return;
  await prisma.auditLog.create({
    data: {
      actorId: e.actorId,
      action: e.action,
      entity: e.entity,
      entityId: e.entityId,
      diff: e.summary ? { summary: e.summary } : undefined,
    },
  });
}
export async function listAudit(limit: number): Promise<AuditEntry[]> {
  const rows = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: limit, include: { actor: true } });
  return rows.map((r) => ({
    id: r.id,
    actorId: r.actorId,
    actorName: r.actor.displayName,
    action: r.action as AuditAction,
    entity: r.entity,
    entityId: r.entityId,
    summary: (r.diff as { summary?: string } | null)?.summary ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}
