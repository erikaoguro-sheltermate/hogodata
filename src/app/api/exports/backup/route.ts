// 控え用の一括出力（事務局のみ）：全データを 3 つの CSV にまとめて ZIP なしで扱えるよう、
// 1 つの CSV に「種類」列を付けた縦持ちで出す。万一のときに手で復元できる粒度（明細まで）。
//
//   kind=reports  … 1 行 = 1 レポート（頭数・状態・差し戻し理由・備考）
//   kind=cells    … 1 行 = 区分×年齢×地域の数字 1 つ（収容・転帰）＋ TNR
//   kind=orgs     … 1 行 = 1 団体（連絡先・プロフィール・参加開始月）
import { listReports, listOrganizations } from '@/lib/data/repo';
import { reportIntakeTotal, reportOutcomeTotal } from '@/lib/data/analytics';
import { SPECIES_LABEL, STATUS_LABEL, REGION_LABEL, prefectureByCode, intakeCategory, outcomeCategory, AGE_GROUPS, ANIMAL_KIND_LABEL } from '@/lib/masters';
import { getSession } from '@/lib/auth/session';
import { jstDateString } from '@/lib/jst';
import { reportStatusLabel } from '@/components/ReportStatusBadge';
import ExcelJS from 'exceljs';

function csvCell(v: string | number | null | undefined | boolean): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'boolean' ? (v ? 'あり' : 'なし') : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const line = (cells: Cell[]): string => cells.map(csvCell).join(',');
const ageName = (code: string) => AGE_GROUPS.find((a) => a.code === code)?.name ?? code;

type Cell = string | number | null | undefined | boolean;

/** 3 種類の表を行データとして作る（CSV・Excel 共用） */
async function buildTables(): Promise<Record<'reports' | 'cells' | 'orgs', Cell[][]>> {
  const [reports, orgs] = await Promise.all([listReports(), listOrganizations()]);
  const orgName = (id: string) => orgs.find((o) => o.id === id)?.name ?? id;
  const out: Record<'reports' | 'cells' | 'orgs', Cell[][]> = { reports: [], cells: [], orgs: [] };

  {
    const lines = out.orgs;
    lines.push((['団体ID', '団体名', '都道府県', '種別区分', '有効', '担当者', '連絡先メール', '活動開始年', '動物取扱業', '保護動物種', '正規メンバー', 'ボランティア', '平均管理頭数', '連携自治体', '連携民間団体', '主な活動', '参加開始年', '参加開始月', '備考']));
    for (const o of orgs) {
      lines.push(([
        o.id, o.name, prefectureByCode(o.prefectureCode)?.name ?? o.prefectureCode, o.orgType, o.isActive,
        o.contactName, o.contactEmail, o.establishedYear, (o.animalHandling ?? []).join('／'),
        (o.animalTypes ?? []).map((k) => ANIMAL_KIND_LABEL[k]).join('／'), o.memberCount, o.volunteerCount,
        o.avgAnimalsManaged, o.partnerMunicipalities, o.hasPartnerOrgs ?? '', (o.activities ?? []).join('／'),
        o.joinedYear, o.joinedMonth, o.notes,
      ]));
    }
  }
  {
    const lines = out.cells;
    lines.push((['レポートID', '団体', '対象年', '対象月', '種別', '区分種類', '区分', '地域', '年齢区分', '頭数']));
    for (const r of reports) {
      for (const e of r.intakeEntries) {
        lines.push(([r.id, orgName(r.organizationId), r.year, r.month, SPECIES_LABEL[r.species], '新規収容', intakeCategory(e.intakeCategoryCode)?.name ?? e.intakeCategoryCode, e.region === 'NONE' ? '' : REGION_LABEL[e.region], ageName(e.ageGroupCode), e.count]));
      }
      for (const e of r.outcomeEntries) {
        lines.push(([r.id, orgName(r.organizationId), r.year, r.month, SPECIES_LABEL[r.species], '転帰', outcomeCategory(e.outcomeCategoryCode)?.name ?? e.outcomeCategoryCode, e.region === 'NONE' ? '' : REGION_LABEL[e.region], ageName(e.ageGroupCode), e.count]));
      }
      if (r.tnr) {
        lines.push(([r.id, orgName(r.organizationId), r.year, r.month, SPECIES_LABEL[r.species], 'TNR', '単独実施', '', '', r.tnr.soloCount]));
        lines.push(([r.id, orgName(r.organizationId), r.year, r.month, SPECIES_LABEL[r.species], 'TNR', '協力実施', '', '', r.tnr.collaborativeCount]));
      }
    }
  }
  {
    const lines = out.reports;
    lines.push((['レポートID', '団体', '対象年', '対象月', '種別', '記録開始日', '記録終了日', '記録開始時', 'うち一時預かり（開始）', '新規収容計', '転帰計', '記録終了時', 'うち一時預かり（終了）', '収支差分', '状態', '表示状態', '提出日時', '再提出日時', '差し戻し理由', '備考', '更新日時']));
    for (const r of reports) {
      const intake = reportIntakeTotal(r);
      const outcome = reportOutcomeTotal(r);
      lines.push(([
        r.id, orgName(r.organizationId), r.year, r.month, SPECIES_LABEL[r.species], r.periodStart, r.periodEnd,
        r.beginningCount, r.beginningFosterCount, intake, outcome, r.endingCount, r.endingFosterCount,
        r.beginningCount + intake - outcome - r.endingCount, STATUS_LABEL[r.status], reportStatusLabel(r),
        r.submittedAt, r.resubmittedAt, r.returnNote, r.note, r.updatedAt,
      ]));
    }
  }

  return out;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session.hasAccess || session.role !== 'ADMIN') {
    return new Response('控えの出力は事務局のみ可能です。', { status: 403 });
  }
  const params = new URL(request.url).searchParams;
  const tables = await buildTables();
  const date = jstDateString();

  // Excel：1 ファイルに 3 シート（通常はこちら）
  if (params.get('format') === 'xlsx') {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'どうぶつ保護データプロジェクト';
    const sheets: [keyof typeof tables, string][] = [['reports', 'レポート一覧'], ['cells', 'レポート明細'], ['orgs', '団体一覧']];
    for (const [key, title] of sheets) {
      const ws = wb.addWorksheet(title, { views: [{ state: 'frozen', ySplit: 1 }] });
      const [header, ...rows] = tables[key];
      ws.addRow(header.map((h) => String(h ?? '')));
      ws.getRow(1).font = { bold: true };
      for (const r of rows) ws.addRow(r.map((v) => (typeof v === 'boolean' ? (v ? 'あり' : 'なし') : v ?? '')));
      ws.columns.forEach((col) => { col.width = 16; });
    }
    const buf = await wb.xlsx.writeBuffer();
    return new Response(buf as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="hogodata-backup-${date}.xlsx"`,
      },
    });
  }

  // CSV：種類ごとに 1 ファイル
  const kind = (params.get('kind') ?? 'reports') as keyof typeof tables;
  const rows = tables[kind] ?? tables.reports;
  const csv = '\ufeff' + rows.map(line).join('\r\n'); // BOM 付きで Excel / スプレッドシート互換
  const name = kind === 'orgs' ? 'organizations' : kind === 'cells' ? 'report-details' : 'reports';
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="hogodata-${name}-${date}.csv"`,
    },
  });
}
