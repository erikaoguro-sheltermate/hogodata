// データの控え（事務局）：全データを CSV で手元に保存する。
// システムが使えなくなったときにも数字が残るよう、月に一度ダウンロードして Google ドライブ等に保存する運用。
import { requireRole } from '@/lib/auth/session';
import { listReports, listOrganizations } from '@/lib/data/repo';
import { Card, CardBody, buttonClass } from '@/components/ui';
import { jstDateString } from '@/lib/jst';
import { SettingsTabs } from '../SettingsTabs';

const FILES = [
  { kind: 'reports', title: 'レポート一覧', desc: '1 行 = 1 レポート。頭数の合計・状態・提出日時・差し戻し理由・備考。' },
  { kind: 'cells', title: 'レポート明細', desc: '1 行 = 区分×年齢×地域の数字 1 つ（新規収容・転帰・TNR）。手で復元するときに必要。' },
  { kind: 'orgs', title: '団体一覧', desc: '団体名・連絡先・プロフィール・参加開始月。' },
];

export default async function BackupPage() {
  await requireRole('ADMIN');
  const [reports, orgs] = await Promise.all([listReports(), listOrganizations()]);
  const today = jstDateString();

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-800">設定</h1>
      </div>
      <SettingsTabs current="/settings/backup" />

      <Card className="mb-6">
        <CardBody>
          <h2 className="text-base font-bold text-slate-800">データの控えをダウンロード</h2>
          <p className="mt-1 text-sm text-slate-600">
            いま登録されている全データ（レポート {reports.length} 件・団体 {orgs.length} 件）を CSV で保存します。
            Excel や Google スプレッドシートでそのまま開けます。
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {FILES.map((f) => (
              <div key={f.kind} className="rounded-lg border border-slate-200 p-4">
                <div className="text-sm font-semibold text-slate-800">{f.title}</div>
                <p className="mt-1 min-h-[3rem] text-xs text-slate-500">{f.desc}</p>
                <a href={`/api/exports/backup?kind=${f.kind}`} className={buttonClass('secondary', 'sm', 'mt-3 w-full')}>
                  ダウンロード
                </a>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">ファイル名には日付が入ります（例：hogodata-reports-{today}.csv）。</p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="text-base font-bold text-slate-800">おすすめの運用</h2>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-slate-600">
            <li><b>毎月、提出期限のあと</b>（確定作業が終わったタイミング）に 3 つともダウンロードする。</li>
            <li>Google ドライブなど、このシステムとは別の場所に「年月」のフォルダを作って保存する。</li>
            <li>古いファイルは消さずに残す（いつの時点にも戻せるように）。</li>
          </ol>
          <p className="mt-3 text-xs text-slate-500">
            ※ データベース自体のバックアップ（Supabase の設定）とは別の、人が読める形の控えです。
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
