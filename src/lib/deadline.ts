// 提出期限（純粋関数・テスト対象）
// 対象月の翌月 deadlineDay 日が期限。例：9月分 → 10月10日。

import type { PortalSettings } from './types';
import { jstYmd } from './jst';

export const DEFAULT_SETTINGS: PortalSettings = {
  deadlineDay: 10,
  contactEmail: '',
  contactNote: '',
};

export interface Deadline {
  /** 期限日（YYYY-MM-DD） */
  date: string;
  /** 期限まであと何日（当日=0、過ぎたら負） */
  daysLeft: number;
  state: 'open' | 'soon' | 'overdue';
}

const SOON_DAYS = 3;

function ymd(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function deadlineFor(year: number, month: number, deadlineDay: number, today: Date = new Date()): Deadline {
  const ny = month === 12 ? year + 1 : year;
  const nm = month === 12 ? 1 : month + 1;
  const day = Math.min(Math.max(1, Math.trunc(deadlineDay) || 10), 28);
  const due = Date.UTC(ny, nm - 1, day);
  const j = jstYmd(today); // 日本時間の今日
  const t = Date.UTC(j.year, j.month - 1, j.day);
  const daysLeft = Math.round((due - t) / 86_400_000);
  return {
    date: ymd(ny, nm, day),
    daysLeft,
    state: daysLeft < 0 ? 'overdue' : daysLeft <= SOON_DAYS ? 'soon' : 'open',
  };
}

/** 「10月10日（金）」形式 */
export function formatDeadline(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const w = '日月火水木金土'[new Date(y, m - 1, d).getDay()];
  return `${m}月${d}日（${w}）`;
}
