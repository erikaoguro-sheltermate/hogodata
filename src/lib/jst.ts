// 日本時間（Asia/Tokyo）での「今日」。サーバーは UTC で動く（Vercel）ため、
// 月初 0:00〜9:00 JST に「先月」がずれないよう、日付の判定は必ずここを通す。

export interface Ymd { year: number; month: number; day: number }

const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' });

/** 指定時刻（既定: 現在）の日本時間での年月日 */
export function jstYmd(at: Date = new Date()): Ymd {
  const [year, month, day] = fmt.format(at).split('-').map(Number);
  return { year, month, day };
}

/** 日本時間の日付（YYYY-MM-DD） */
export function jstDateString(at: Date = new Date()): string {
  return fmt.format(at);
}
