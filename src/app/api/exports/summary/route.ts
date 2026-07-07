// 期間集計エクスポート（月次/四半期/年次）— 報告会向け
import { listReports, type ReportFilter } from '@/lib/data/repo';
import { summarizeByPeriod, type PeriodType } from '@/lib/data/analytics';
import type { Species } from '@/lib/types';

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const period = (['month', 'quarter', 'year'].includes(url.searchParams.get('period') ?? '')
    ? url.searchParams.get('period') : 'quarter') as PeriodType;
  const filter: ReportFilter = {
    year: url.searchParams.get('year') ? Number(url.searchParams.get('year')) : undefined,
    species: (url.searchParams.get('species') as Species) || undefined,
    regionBlock: url.searchParams.get('block') || undefined,
  };
  const reports = await listReports(filter);
  const rows = summarizeByPeriod(reports, period);

  const header = ['期間', '提出団体数', '犬レポート', '猫レポート', '新規収容', '転帰合計', '生存転帰', '非生存転帰', '生存転帰率(%)'];
  const body = rows.map((r) => [
    r.label, r.orgCount, r.dogReports, r.catReports,
    r.intakeTotal, r.outcomeTotal, r.liveOutcomeTotal, r.nonLiveOutcomeTotal,
    r.liveReleaseRate ?? '',
  ].map(csvCell).join(','));
  const csv = '﻿' + [header.map(csvCell).join(','), ...body].join('\r\n');

  const label = period === 'month' ? 'monthly' : period === 'quarter' ? 'quarterly' : 'yearly';
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="jasa-summary-${label}.csv"`,
    },
  });
}
