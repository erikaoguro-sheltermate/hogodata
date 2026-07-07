'use client';

import Link from 'next/link';

export function PrintBar() {
  return (
    <div className="no-print mb-6 flex items-center justify-between gap-2">
      <Link href="/analytics" className="text-sm text-slate-400 hover:text-slate-600">← 集計に戻る</Link>
      <button
        onClick={() => window.print()}
        className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        📄 PDFで保存 / 印刷
      </button>
    </div>
  );
}
