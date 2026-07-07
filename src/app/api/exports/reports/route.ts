// F-09 エクスポート：レポートのフラットCSV出力
import { listReports, listOrganizations, type ReportFilter } from '@/lib/data/repo';
import { reportIntakeTotal, reportOutcomeTotal } from '@/lib/data/analytics';
import { SPECIES_LABEL, STATUS_LABEL, prefectureByCode } from '@/lib/masters';
import type { Species } from '@/lib/types';

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const filter: ReportFilter = {
    year: url.searchParams.get('year') ? Number(url.searchParams.get('year')) : undefined,
    species: (url.searchParams.get('species') as Species) || undefined,
    regionBlock: url.searchParams.get('block') || undefined,
  };
  const [reports, orgs] = await Promise.all([listReports(filter), listOrganizations()]);
  const header = ['団体', '都道府県', '対象年', '対象月', '種別', '記録開始時', '新規収容計', '転帰計', '記録終了時', '収支差分', '状態'];
  const rows = reports.map((r) => {
    const org = orgs.find((o) => o.id === r.organizationId);
    const intake = reportIntakeTotal(r);
    const outcome = reportOutcomeTotal(r);
    const delta = r.beginningCount + intake - outcome - r.endingCount;
    return [
      org?.name ?? '',
      prefectureByCode(org?.prefectureCode ?? '')?.name ?? '',
      r.year, r.month, SPECIES_LABEL[r.species],
      r.beginningCount, intake, outcome, r.endingCount, delta, STATUS_LABEL[r.status],
    ].map(csvCell).join(',');
  });
  const csv = '﻿' + [header.map(csvCell).join(','), ...rows].join('\r\n'); // BOM付きでExcel互換

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="jasa-reports.csv"`,
    },
  });
}
