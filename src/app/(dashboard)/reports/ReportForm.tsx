'use client';

import { yearOptions } from '@/lib/submissions';
import { previousYearMonth } from '@/lib/data/analytics';
import { expectedSpecies } from '@/lib/submissions';
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
import { formatNumber, ymLabel } from '@/lib/format';
import { saveReportAction, getPreviousEndingAction, type PreviousEnding } from './actions';
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
  // 既定は「先月」分（月初に前月分を入力する運用）
  const prev = previousYearMonth();
  const initYear = initial?.year ?? defaultYear ?? prev.year;
  const initMonth = initial?.month ?? defaultMonth ?? prev.month;

  const [orgId, setOrgId] = React.useState(
    initial?.organizationId ?? (isOrgUser ? sessionOrgId ?? '' : defaultOrgId ?? orgs[0]?.id ?? ''),
  );
  // 団体の報告対象（犬だけ・猫だけ）に合わせる。両方なら犬を既定にする
  const currentOrg = orgs.find((o) => o.id === orgId);
  const speciesOptions: Species[] = initial ? [initial.species] : expectedSpecies(currentOrg ?? {});
  const [species, setSpecies] = React.useState<Species>(
    initial?.species ?? (defaultSpecies && speciesOptions.includes(defaultSpecies) ? defaultSpecies : speciesOptions[0]),
  );
  React.useEffect(() => {
    if (!speciesOptions.includes(species)) setSpecies(speciesOptions[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);
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

  // 前月の月末頭数 → 今月の記録開始時（新規入力では自動で入れる。手で直したら上書きしない）
  const [prevEnding, setPrevEnding] = React.useState<PreviousEnding | null>(null);
  const [prevChecked, setPrevChecked] = React.useState(false);
  const prevOfSelected = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const beginningTouched = React.useRef(!!initial);
  const [autoFilled, setAutoFilled] = React.useState(false);
  React.useEffect(() => {
    let cancelled = false;
    if (!orgId) return;
    getPreviousEndingAction(orgId, species, year, month).then((p) => {
      if (cancelled) return;
      setPrevEnding(p);
      setPrevChecked(true);
      if (!beginningTouched.current) {
        setBeginningCount(p?.endingCount ?? 0);
        setBeginningFosterCount(p?.endingFosterCount ?? 0);
        setAutoFilled(!!p);
      }
    });
    return () => { cancelled = true; };
  }, [orgId, species, year, month]);

  function editBeginning(total: number) {
    beginningTouched.current = true;
    setAutoFilled(false);
    setBeginningCount(total);
  }
  function editBeginningFoster(foster: number) {
    beginningTouched.current = true;
    setAutoFilled(false);
    setBeginningFosterCount(foster);
  }
  function applyPrevEnding() {
    if (!prevEnding) return;
    setBeginningCount(prevEnding.endingCount);
    setBeginningFosterCount(prevEnding.endingFosterCount);
    setAutoFilled(true);
  }
  const beginningMismatch = !!prevEnding &&
    (prevEnding.endingCount !== beginningCount || prevEnding.endingFosterCount !== beginningFosterCount);

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
  // 主ボタン：団体が提出済みを直す→再提出 / 事務局が提出済み・確定を直す→保存 / それ以外→提出
  const orgResubmit = isOrgUser && initial?.status === 'SUBMITTED';
  const adminFix = !isOrgUser && !!initial && initial.status !== 'DRAFT';
  const mainSubmit = !adminFix;
  const mainLabel = orgResubmit ? '修正して再提出' : adminFix ? '修正を保存' : '提出する';

  async function handleSave(submit: boolean) {
    setSaving(true);
    setServerMsg(null);
    try {
      const res = await saveReportAction(input, initial?.id, submit);
      if (res.ok) {
        setServerMsg({ ok: true, text: submit ? '提出しました。' : '保存しました。' });
        // 提出（再提出を含む）は受付画面へ。下書きは団体ならホーム、事務局なら一覧へ。
        router.push(submit && res.id ? `/reports/${res.id}/submitted` : isOrgUser ? '/' : '/reports');
        router.refresh();
      } else {
        setServerMsg({ ok: false, text: res.errors.map((e) => e.message).join(' / ') || '保存できませんでした。' });
      }
    } catch (err) {
      console.error(err);
      setServerMsg({ ok: false, text: '保存できませんでした。通信状態を確認して、もう一度お試しください。' });
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              <Field label="団体" required>
                <Select value={orgId} disabled={isOrgUser || !canEdit || !!initial} onChange={(e) => setOrgId(e.target.value)}>
                  {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </Select>
              </Field>
              <Field label="種別" required hint={speciesOptions.length === 1 ? 'この団体の報告対象は 1 種別です' : undefined}>
                <Select value={species} disabled={!canEdit || !!initial} onChange={(e) => setSpecies(e.target.value as Species)}>
                  {speciesOptions.map((s) => <option key={s} value={s}>{s === 'DOG' ? '犬' : '猫'}</option>)}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="対象年" required>
                  <Select value={year} disabled={!canEdit || !!initial} onChange={(e) => { const y = Number(e.target.value); setYear(y); syncPeriod(y, month); }}>
                    {yearOptions().map((y) => <option key={y} value={y}>{y}</option>)}
                  </Select>
                </Field>
                <Field label="対象月" required>
                  <Select value={month} disabled={!canEdit || !!initial} onChange={(e) => { const m = Number(e.target.value); setMonth(m); syncPeriod(year, m); }}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}月</option>)}
                  </Select>
                </Field>
              </div>
              <Field label="記録開始日" required>
                <Input type="date" required value={periodStart} disabled={!canEdit} onChange={(e) => setPeriodStart(e.target.value)} />
              </Field>
              <Field label="記録終了日" required>
                <Input type="date" required value={periodEnd} disabled={!canEdit} onChange={(e) => setPeriodEnd(e.target.value)} />
              </Field>
            </div>
          </CardBody>
        </Card>

        {/* §1 記録開始時の管理頭数 */}
        <PopulationCard
          title="① 記録開始時の管理頭数"
          total={beginningCount} foster={beginningFosterCount}
          onTotal={editBeginning} onFoster={editBeginningFoster} disabled={!canEdit}
        />
        {!prevEnding && !initial && prevChecked && (
          <p className="-mt-4 rounded-lg bg-slate-50 px-4 py-2 text-sm text-slate-600">
            {ymLabel(prevOfSelected.year, prevOfSelected.month)}分の報告がまだないため、自動では入りません。月初の時点で管理していた頭数を入力してください。
          </p>
        )}
        {prevEnding && !beginningMismatch && autoFilled && (
          <p className="-mt-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
            ✓ {prevEnding.year}年{prevEnding.month}月の記録終了時の頭数（{formatNumber(prevEnding.endingCount)}頭・うち一時預かり {formatNumber(prevEnding.endingFosterCount)}）を自動で入れました。
          </p>
        )}
        {prevEnding && beginningMismatch && (
          <div className="-mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800">
            <span>
              {prevEnding.year}年{prevEnding.month}月の記録終了時の頭数は {formatNumber(prevEnding.endingCount)}頭（うち一時預かり {formatNumber(prevEnding.endingFosterCount)}）で、今月の記録開始時と違っています。
              前月の数字のほうが間違っている場合は前月の報告を直すか、備考に理由を書いてください。
            </span>
            {canEdit && <Button size="sm" variant="secondary" onClick={applyPrevEnding}>前月の数字にそろえる</Button>}
          </div>
        )}

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

      {/* ===== スマホ用：画面下に収支と提出ボタンを固定 ===== */}
      {canEdit && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-2 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden print:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs">
              <span className="text-slate-500">収支：</span>
              {balance.balanced
                ? <span className="font-semibold text-emerald-700">一致</span>
                : <span className="font-semibold text-amber-700">差分 {balance.delta > 0 ? '+' : ''}{balance.delta}</span>}
              {validation.errors.length > 0 && <span className="ml-2 text-red-600">⚠ 入力に誤りがあります</span>}
            </div>
            <Button size="sm" onClick={() => handleSave(mainSubmit)} disabled={saving || validation.errors.length > 0}>
              {saving ? '送信中…' : mainLabel}
            </Button>
          </div>
        </div>
      )}

      {/* ===== 収支整合パネル（固定） ===== */}
      <div className={canEdit ? 'pb-16 lg:pb-0' : undefined}>
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
              {orgResubmit || adminFix ? (
                <Button onClick={() => handleSave(mainSubmit)} disabled={saving || validation.errors.length > 0}>
                  {saving ? '送信中…' : mainLabel}
                </Button>
              ) : (
                <>
                  <Button onClick={() => handleSave(true)} disabled={saving || validation.errors.length > 0}>
                    {saving ? '送信中…' : '提出する'}
                  </Button>
                  <Button variant="secondary" onClick={() => handleSave(false)} disabled={saving || validation.errors.length > 0}>
                    下書き保存（あとで続ける）
                  </Button>
                </>
              )}
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
      <div className="overflow-x-auto">
      <table className="w-full min-w-[22rem] text-sm">
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
                        aria-label={`${name}${requiresRegion ? ` ${REGION_LABEL[region]}` : ''} ${age.name}`}
                        value={v === 0 ? '' : v} placeholder="0"
                        onChange={(e) => setCount(key, parseInt(e.target.value, 10))}
                        className="w-full min-w-[3.5rem] rounded-md border border-slate-200 px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 disabled:bg-slate-50"
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
