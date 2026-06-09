'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  AGE_GROUPS, REGION_OPTIONS, intakeCategoriesFor, outcomeCategoriesFor,
  SPECIES_LABEL, REGION_LABEL,
} from '@/lib/masters';
import { validateReport } from '@/lib/validation';
import { checkBalance } from '@/lib/validation/balance';
import type {
  Organization, MonthlyReport, ReportInput, Species, Region,
  IntakeEntryInput, OutcomeEntryInput,
} from '@/lib/types';
import { Card, CardBody, Button, Badge, Field, Input, Select } from '@/components/ui';
import { formatNumber } from '@/lib/format';
import { saveReportAction } from './actions';
import { cn } from '@/lib/utils';

type SectionKind = 'intake' | 'outcome';

function cellKey(section: SectionKind, cat: string, age: string, region: Region): string {
  return `${section}:${cat}:${age}:${region}`;
}

function lastDayIso(year: number, month: number): string {
  const d = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function firstDayIso(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

export function ReportForm({
  orgs, role, sessionOrgId, initial, defaultOrgId, defaultSpecies, defaultYear, defaultMonth,
}: {
  orgs: Organization[];
  role: string;
  sessionOrgId: string | null;
  initial: MonthlyReport | null;
  defaultOrgId?: string;
  defaultSpecies?: Species;
  defaultYear?: number;
  defaultMonth?: number;
}) {
  const router = useRouter();
  const isOrgUser = role === 'ORG_USER';
  const initYear = initial?.year ?? defaultYear ?? 2026;
  const initMonth = initial?.month ?? defaultMonth ?? 5;

  const [orgId, setOrgId] = React.useState(
    initial?.organizationId ?? (isOrgUser ? sessionOrgId ?? '' : defaultOrgId ?? orgs[0]?.id ?? ''),
  );
  const [species, setSpecies] = React.useState<Species>(initial?.species ?? defaultSpecies ?? 'CAT');
  const [year, setYear] = React.useState(initYear);
  const [month, setMonth] = React.useState(initMonth);
  const [periodStart, setPeriodStart] = React.useState(initial?.periodStart ?? firstDayIso(initYear, initMonth));
  const [periodEnd, setPeriodEnd] = React.useState(initial?.periodEnd ?? lastDayIso(initYear, initMonth));
  const [beginningCount, setBeginningCount] = React.useState(initial?.beginningCount ?? 0);
  const [beginningFosterCount, setBeginningFosterCount] = React.useState(initial?.beginningFosterCount ?? 0);
  const [endingCount, setEndingCount] = React.useState(initial?.endingCount ?? 0);
  const [endingFosterCount, setEndingFosterCount] = React.useState(initial?.endingFosterCount ?? 0);
  const [note, setNote] = React.useState(initial?.note ?? '');

  // TNR
  const [soloCount, setSoloCount] = React.useState(initial?.tnr?.soloCount ?? 0);
  const [collaborativeCount, setCollaborativeCount] = React.useState(initial?.tnr?.collaborativeCount ?? 0);

  // 明細セル
  const [counts, setCounts] = React.useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    initial?.intakeEntries.forEach((e) => { m[cellKey('intake', e.intakeCategoryCode, e.ageGroupCode, e.region)] = e.count; });
    initial?.outcomeEntries.forEach((e) => { m[cellKey('outcome', e.outcomeCategoryCode, e.ageGroupCode, e.region)] = e.count; });
    return m;
  });

  const [saving, setSaving] = React.useState(false);
  const [serverMsg, setServerMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  const canEdit = !(initial?.status === 'CONFIRMED' && role !== 'ADMIN');

  const getCount = (key: string) => counts[key] ?? 0;
  const setCount = (key: string, val: number) =>
    setCounts((prev) => ({ ...prev, [key]: Number.isNaN(val) ? 0 : Math.max(0, Math.trunc(val)) }));

  function syncPeriod(y: number, m: number) {
    setPeriodStart(firstDayIso(y, m));
    setPeriodEnd(lastDayIso(y, m));
  }

  // 入力ペイロードを構築
  const input: ReportInput = React.useMemo(() => {
    const intakeEntries: IntakeEntryInput[] = [];
    for (const cat of intakeCategoriesFor(species)) {
      const regions: Region[] = cat.requiresRegion ? REGION_OPTIONS.map((r) => r.code) : ['NONE'];
      for (const region of regions) {
        for (const age of AGE_GROUPS) {
          const c = getCount(cellKey('intake', cat.code, age.code, region));
          if (c > 0) intakeEntries.push({ intakeCategoryCode: cat.code, ageGroupCode: age.code, region, count: c });
        }
      }
    }
    const outcomeEntries: OutcomeEntryInput[] = [];
    for (const cat of outcomeCategoriesFor(species)) {
      const regions: Region[] = cat.requiresRegion ? REGION_OPTIONS.map((r) => r.code) : ['NONE'];
      for (const region of regions) {
        for (const age of AGE_GROUPS) {
          const c = getCount(cellKey('outcome', cat.code, age.code, region));
          if (c > 0) outcomeEntries.push({ outcomeCategoryCode: cat.code, ageGroupCode: age.code, region, count: c });
        }
      }
    }
    return {
      organizationId: orgId, species, year, month, periodStart, periodEnd,
      beginningCount, beginningFosterCount, endingCount, endingFosterCount,
      note: note || undefined,
      intakeEntries, outcomeEntries,
      tnr: species === 'CAT' ? { periodStart, periodEnd, soloCount, collaborativeCount } : null,
    };
  }, [orgId, species, year, month, periodStart, periodEnd, beginningCount, beginningFosterCount,
    endingCount, endingFosterCount, note, counts, soloCount, collaborativeCount]);

  const balance = checkBalance(input);
  const validation = validateReport(input);

  async function handleSave(submit: boolean) {
    setSaving(true);
    setServerMsg(null);
    try {
      const res = await saveReportAction(input, initial?.id, submit);
      if (res.ok) {
        setServerMsg({ ok: true, text: submit ? '提出しました。' : '下書きを保存しました。' });
        router.push('/reports');
        router.refresh();
      } else {
        setServerMsg({ ok: false, text: res.errors.map((e) => e.message).join(' / ') || '保存できませんでした。' });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
      {/* ===== 入力本体 ===== */}
      <div className="space-y-6">
        {/* ヘッダー */}
        <Card>
          <CardBody>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <Field label="団体" required>
                <Select value={orgId} disabled={isOrgUser || !canEdit} onChange={(e) => setOrgId(e.target.value)}>
                  {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </Select>
              </Field>
              <Field label="種別" required>
                <Select value={species} disabled={!canEdit} onChange={(e) => setSpecies(e.target.value as Species)}>
                  <option value="DOG">犬</option>
                  <option value="CAT">猫</option>
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="対象年" required>
                  <Select value={year} disabled={!canEdit} onChange={(e) => { const y = Number(e.target.value); setYear(y); syncPeriod(y, month); }}>
                    {[2026, 2027].map((y) => <option key={y} value={y}>{y}年</option>)}
                  </Select>
                </Field>
                <Field label="対象月" required>
                  <Select value={month} disabled={!canEdit} onChange={(e) => { const m = Number(e.target.value); setMonth(m); syncPeriod(year, m); }}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}月</option>)}
                  </Select>
                </Field>
              </div>
              <Field label="記録開始日" required>
                <Input type="date" value={periodStart} disabled={!canEdit} onChange={(e) => setPeriodStart(e.target.value)} />
              </Field>
              <Field label="記録終了日" required>
                <Input type="date" value={periodEnd} disabled={!canEdit} onChange={(e) => setPeriodEnd(e.target.value)} />
              </Field>
            </div>
          </CardBody>
        </Card>

        {/* §1 記録開始時の管理頭数 */}
        <PopulationCard
          title="① 記録開始時の管理頭数"
          total={beginningCount} foster={beginningFosterCount}
          onTotal={setBeginningCount} onFoster={setBeginningFosterCount} disabled={!canEdit}
        />

        {/* §2 新規収容 */}
        <Card>
          <CardBody>
            <h3 className="mb-1 text-base font-bold text-slate-800">② 新規収容</h3>
            <p className="mb-4 text-xs text-slate-500">カテゴリー × 年齢区分。地域区分を持つカテゴリーは県内/県外で行が分かれます。</p>
            <div className="space-y-4">
              {intakeCategoriesFor(species).map((cat) => (
                <CategoryMatrix
                  key={cat.code} section="intake" code={cat.code} name={cat.name}
                  requiresRegion={cat.requiresRegion} catOnly={cat.species === 'CAT'}
                  getCount={getCount} setCount={setCount} disabled={!canEdit}
                />
              ))}
            </div>
          </CardBody>
        </Card>

        {/* §3 転帰 */}
        <Card>
          <CardBody>
            <h3 className="mb-4 text-base font-bold text-slate-800">③ 転帰</h3>
            <div className="space-y-5">
              <div>
                <div className="mb-2 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-400" /><span className="text-sm font-semibold text-slate-700">非生存転帰</span></div>
                <div className="space-y-4">
                  {outcomeCategoriesFor(species).filter((c) => !c.isLiveOutcome).map((cat) => (
                    <CategoryMatrix key={cat.code} section="outcome" code={cat.code} name={cat.name}
                      requiresRegion={cat.requiresRegion} catOnly={cat.species === 'CAT'}
                      getCount={getCount} setCount={setCount} disabled={!canEdit} />
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" /><span className="text-sm font-semibold text-slate-700">生存転帰</span></div>
                <div className="space-y-4">
                  {outcomeCategoriesFor(species).filter((c) => c.isLiveOutcome).map((cat) => (
                    <CategoryMatrix key={cat.code} section="outcome" code={cat.code} name={cat.name}
                      requiresRegion={cat.requiresRegion} catOnly={cat.species === 'CAT'}
                      getCount={getCount} setCount={setCount} disabled={!canEdit} />
                  ))}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* §4 記録終了時の管理頭数 */}
        <PopulationCard
          title="④ 記録終了時の管理頭数"
          total={endingCount} foster={endingFosterCount}
          onTotal={setEndingCount} onFoster={setEndingFosterCount} disabled={!canEdit}
        />

        {/* §5 TNR（猫のみ） */}
        {species === 'CAT' && (
          <Card>
            <CardBody>
              <h3 className="mb-1 text-base font-bold text-slate-800">⑤ TNR頭数 <Badge color="blue">猫のみ</Badge></h3>
              <p className="mb-4 text-xs text-slate-500">TNR活動の頭数。収容（②）とは別枠の参考値で、収支計算には含めません。</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="団体が単独で実施（匹）">
                  <NumInput value={soloCount} disabled={!canEdit} onChange={setSoloCount} />
                </Field>
                <Field label="他団体と協力して実施（匹）">
                  <NumInput value={collaborativeCount} disabled={!canEdit} onChange={setCollaborativeCount} />
                </Field>
              </div>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardBody>
            <Field label="備考">
              <textarea value={note} disabled={!canEdit} onChange={(e) => setNote(e.target.value)} rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
            </Field>
          </CardBody>
        </Card>
      </div>

      {/* ===== 収支整合パネル（固定） ===== */}
      <div>
        <div className="sticky top-6 space-y-4">
          <BalancePanel balance={balance} beginning={beginningCount} beginningFoster={beginningFosterCount} endingFoster={endingFosterCount} />

          {(validation.errors.length > 0 || validation.warnings.length > 0) && (
            <Card>
              <CardBody className="space-y-2">
                {validation.errors.map((e, i) => (
                  <div key={`e${i}`} className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">⚠ {e.message}</div>
                ))}
                {validation.warnings.map((w, i) => (
                  <div key={`w${i}`} className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">注意：{w.message}</div>
                ))}
              </CardBody>
            </Card>
          )}

          {serverMsg && (
            <div className={cn('rounded-lg px-3 py-2 text-sm', serverMsg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
              {serverMsg.text}
            </div>
          )}

          {canEdit ? (
            <div className="grid gap-2">
              <Button onClick={() => handleSave(true)} disabled={saving || validation.errors.length > 0}>
                {saving ? '保存中…' : '提出する'}
              </Button>
              <Button variant="secondary" onClick={() => handleSave(false)} disabled={saving || validation.errors.length > 0}>
                下書き保存
              </Button>
            </div>
          ) : (
            <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500">確定済みのため編集できません（事務局のみ可）。</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- 管理頭数カード ----
function PopulationCard({ title, total, foster, onTotal, onFoster, disabled }: {
  title: string; total: number; foster: number; onTotal: (n: number) => void; onFoster: (n: number) => void; disabled: boolean;
}) {
  return (
    <Card>
      <CardBody>
        <h3 className="mb-3 text-base font-bold text-slate-800">{title}</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="合計管理頭数">
            <NumInput value={total} disabled={disabled} onChange={onTotal} />
          </Field>
          <Field label="うち一時預かり先（内数）" hint="合計に含まれる参考値">
            <NumInput value={foster} disabled={disabled} onChange={onFoster} />
          </Field>
        </div>
      </CardBody>
    </Card>
  );
}

// ---- カテゴリー別マトリクス（地域行 × 年齢列） ----
function CategoryMatrix({ section, code, name, requiresRegion, catOnly, getCount, setCount, disabled }: {
  section: SectionKind; code: string; name: string; requiresRegion: boolean; catOnly: boolean;
  getCount: (k: string) => number; setCount: (k: string, v: number) => void; disabled: boolean;
}) {
  const regions: Region[] = requiresRegion ? REGION_OPTIONS.map((r) => r.code) : ['NONE'];
  let catTotal = 0;
  for (const region of regions) for (const age of AGE_GROUPS) catTotal += getCount(cellKey(section, code, age.code, region));

  return (
    <div className="rounded-xl border border-slate-200">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
        <span className="text-sm font-medium text-slate-700">{name} {catOnly && <Badge color="blue">猫のみ</Badge>}</span>
        <span className="text-xs text-slate-500">小計 <span className="font-semibold text-slate-700">{formatNumber(catTotal)}</span></span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-400">
            <th className="px-3 py-1.5 text-left font-medium">{requiresRegion ? '地域' : ''}</th>
            {AGE_GROUPS.map((a) => <th key={a.code} className="px-2 py-1.5 text-right font-medium">{a.name}</th>)}
            <th className="px-3 py-1.5 text-right font-medium">合計</th>
          </tr>
        </thead>
        <tbody>
          {regions.map((region) => {
            let rowTotal = 0;
            for (const age of AGE_GROUPS) rowTotal += getCount(cellKey(section, code, age.code, region));
            return (
              <tr key={region} className="border-t border-slate-50">
                <td className="px-3 py-1.5 text-xs text-slate-500">{requiresRegion ? REGION_LABEL[region] : '—'}</td>
                {AGE_GROUPS.map((age) => {
                  const key = cellKey(section, code, age.code, region);
                  const v = getCount(key);
                  return (
                    <td key={age.code} className="px-1 py-1">
                      <input
                        type="number" min={0} inputMode="numeric" disabled={disabled}
                        value={v === 0 ? '' : v} placeholder="0"
                        onChange={(e) => setCount(key, parseInt(e.target.value, 10))}
                        className="w-full rounded-md border border-slate-200 px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 disabled:bg-slate-50"
                      />
                    </td>
                  );
                })}
                <td className="px-3 py-1.5 text-right text-sm font-medium tabular-nums text-slate-600">{rowTotal || ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---- 収支整合パネル ----
function BalancePanel({ balance, beginning, beginningFoster, endingFoster }: {
  balance: ReturnType<typeof checkBalance>; beginning: number; beginningFoster: number; endingFoster: number;
}) {
  const ok = balance.balanced;
  return (
    <Card className={cn('border-2', ok ? 'border-emerald-300' : 'border-amber-300')}>
      <CardBody>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-700">収支整合チェック</span>
          {ok ? <Badge color="green">一致 ✓</Badge> : <Badge color="amber">不一致</Badge>}
        </div>
        <dl className="space-y-1.5 text-sm">
          <Row label="記録開始時" value={beginning} />
          <Row label="＋ 新規収容 合計" value={balance.intakeTotal} accent="sky" />
          <Row label="− 転帰 合計" value={balance.outcomeTotal} accent="red" />
          <div className="my-1 border-t border-dashed border-slate-200" />
          <Row label="= あるべき記録終了時" value={balance.expectedEnding} strong />
          <Row label="入力した記録終了時" value={balance.actualEnding} strong />
        </dl>
        <div className={cn('mt-3 rounded-lg px-3 py-2 text-center text-sm font-bold', ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800')}>
          差分 {balance.delta > 0 ? '+' : ''}{balance.delta}
          {!ok && <span className="ml-1 font-normal">— 値をご確認ください</span>}
        </div>
        <div className="mt-3 text-[11px] text-slate-400">
          一時預かり内数：開始 {formatNumber(beginningFoster)} / 終了 {formatNumber(endingFoster)}（参考・収支式には含めません）
        </div>
      </CardBody>
    </Card>
  );
}

function Row({ label, value, accent, strong }: { label: string; value: number; accent?: 'sky' | 'red'; strong?: boolean }) {
  const color = accent === 'sky' ? 'text-sky-600' : accent === 'red' ? 'text-red-600' : 'text-slate-700';
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className={cn('tabular-nums', color, strong && 'font-bold')}>{formatNumber(value)}</dd>
    </div>
  );
}

// ---- 数値入力 ----
function NumInput({ value, onChange, disabled }: { value: number; onChange: (n: number) => void; disabled?: boolean }) {
  return (
    <Input type="number" min={0} inputMode="numeric" disabled={disabled}
      value={value === 0 ? '' : value} placeholder="0"
      onChange={(e) => onChange(Math.max(0, Math.trunc(parseInt(e.target.value, 10) || 0)))} />
  );
}
