// ヘルプ・よくある質問（全ロール）
// 文言はこのファイルを直接編集する。問い合わせ先は「設定 › 提出期限・問い合わせ先」から変更できる。
import Link from 'next/link';
import { requireSession } from '@/lib/auth/session';
import { getSettings } from '@/lib/data/repo';
import { Card, CardBody, SectionTitle } from '@/components/ui';

const STEPS = [
  { title: 'ホームの「入力する」を押す', body: '先月分の報告がまだの場合、ホームの一番上に犬・猫ごとのボタンが出ます。過去の月は、ホームの「提出状況」の表の「未入力 ＋」からも入力できます。' },
  { title: '① 記録開始時の管理頭数を確認する', body: '前月の報告があれば、前月の月末の頭数が自動で入っています。違っている場合だけ直してください。' },
  { title: '② 新規収容・③ 転帰を入力する', body: 'その月に新しく保護した頭数と、譲渡・返還・死亡などで送り出した頭数を、区分と年齢ごとに入力します。0 の欄は空のままで構いません。' },
  { title: '④ 記録終了時の管理頭数を入力する', body: '月末時点の頭数です。画面の下（PCでは右側）の「収支整合チェック」で「開始 ＋ 収容 − 転帰 ＝ 終了」になっているか確認できます。' },
  { title: '「提出する」を押す', body: '「受け付けました」の画面が出たら完了です。途中でやめるときは「下書き保存（あとで続ける）」。提出後も、事務局が確定するまでは直して「修正して再提出」できます。' },
];

const TERMS = [
  ['記録開始時 / 記録終了時の管理頭数', '月の初め・月末の時点で、団体が保護・管理している頭数の合計です。一時預かり（フォスター）先にいる子も含みます。'],
  ['うち一時預かり先', '管理頭数のうち、一時預かりボランティアさんの家などにいる頭数です（合計に含まれる内数）。'],
  ['新規収容', 'その月に新しく団体が引き受けた頭数です。所有者不明・飼い主からの引き取り・行政施設からの引き取り などの区分ごとに入力します。'],
  ['転帰', 'その月に団体の管理を離れた頭数です。譲渡・返還・他団体への引渡しなど（生存転帰）と、死亡・行方不明・安楽死（非生存転帰）に分かれます。'],
  ['生存転帰率', '転帰のうち、生きて送り出せた割合です（生存転帰 ÷ 転帰の合計）。'],
  ['地域区分（県内 / 県外：隣接 / 県外：遠隔）', '動物がどこから来たか・どこへ行ったかです。県内＝団体の所在都道府県、隣接＝隣の都道府県、遠隔＝それ以外です。'],
  ['年齢区分', '〜5ヶ月齢 / 5ヶ月〜10歳 / 10歳〜 の 3 つです。収容・転帰の時点の年齢で入力します。'],
  ['TNR（猫のみ）', '捕獲・不妊去勢手術・元の場所に戻す活動の頭数です。団体単独で実施した分と、他団体と協力した分に分けて入力します。'],
];

const FAQ = [
  ['収支整合チェックで「差分」が出ます。提出できますか？', '提出できます。ただし数字の入れ間違いがないか一度ご確認ください。理由がある場合は備考欄に書いていただけると助かります。'],
  ['提出したあとに間違いに気づきました。', '事務局が「確定」するまでは、レポートを開いて直し「修正して再提出」を押してください。確定後の修正は事務局にご連絡ください。'],
  ['「差し戻し」と表示されています。', '事務局から確認のお願いです。ホームのいちばん上に理由が出ています。「直して再提出」から内容を直して、もう一度「提出する」を押してください。'],
  ['前月の頭数が自動で入りません。', '前月分の報告がまだシステムにない場合は入りません（参加 1 か月目など）。手で入力してください。'],
  ['犬と猫の両方を保護しています。', '犬と猫は別々のレポートです。ホームにそれぞれのボタンが出ます。'],
  ['ある月に動きがありませんでした。', 'ホームの「動きなしで提出」を押すと、前月の頭数のまま、収容・転帰ゼロとして提出できます（前月の報告がある場合）。「動きがなかった」ことも大切なデータです。'],
  ['入力したデータは他の団体に見えますか？', '見えません。他の団体が見られるのは、団体名を伏せた全国の合計だけです。団体どうしの比較や順位付けもしません。'],
  ['パスワードを忘れました。', '事務局に再発行をご依頼ください。新しい初期パスワードをお知らせします。'],
];

export default async function HelpPage() {
  const session = await requireSession();
  const settings = await getSettings();

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">ヘルプ・よくある質問</h1>
        <p className="mt-1 text-sm text-slate-500">
          毎月の提出期限は <b>翌月 {settings.deadlineDay} 日</b> です（例：9月分 → 10月{settings.deadlineDay}日）。
        </p>
      </div>

      {session.role !== 'ORG_USER' && (
        <p className="mb-4 rounded-lg bg-slate-50 px-4 py-2 text-xs text-slate-500">このページは団体ユーザー向けの説明です。団体の方からの質問に答えるときの参考にしてください。</p>
      )}
      <SectionTitle>毎月の報告のしかた</SectionTitle>
      <Card className="mb-8">
        <CardBody>
          <ol className="space-y-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">{i + 1}</span>
                <div>
                  <div className="text-sm font-semibold text-slate-800">{s.title}</div>
                  <p className="mt-0.5 text-sm text-slate-600">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          {session.role === 'ORG_USER' && (
            <div className="mt-5">
              <Link href="/" className="text-sm font-medium text-emerald-700 hover:underline">→ ホームから入力をはじめる</Link>
            </div>
          )}
        </CardBody>
      </Card>

      <SectionTitle>よくある質問</SectionTitle>
      <div className="mb-8 space-y-2">
        {FAQ.map(([q, a]) => (
          <details key={q} className="group rounded-xl border border-slate-200 bg-white px-5 py-3">
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700">
              <span className="mr-2 text-emerald-600">Q.</span>{q}
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-slate-600"><span className="mr-2 font-semibold text-slate-400">A.</span>{a}</p>
          </details>
        ))}
      </div>

      <SectionTitle>用語の説明</SectionTitle>
      <Card className="mb-8">
        <CardBody>
          <dl className="divide-y divide-slate-100">
            {TERMS.map(([term, desc]) => (
              <div key={term} className="py-3 first:pt-0 last:pb-0">
                <dt className="text-sm font-semibold text-slate-700">{term}</dt>
                <dd className="mt-0.5 text-sm text-slate-600">{desc}</dd>
              </div>
            ))}
          </dl>
        </CardBody>
      </Card>

      <SectionTitle>お問い合わせ</SectionTitle>
      <Card>
        <CardBody>
          <p className="text-sm text-slate-600">JASA（どうぶつ保護データプロジェクト）事務局</p>
          {settings.contactEmail ? (
            <p className="mt-1 text-sm">
              <a href={`mailto:${settings.contactEmail}`} className="font-medium text-emerald-700 hover:underline">{settings.contactEmail}</a>
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-400">（問い合わせ先は準備中です）</p>
          )}
          {settings.contactNote && <p className="mt-1 text-xs text-slate-500">{settings.contactNote}</p>}
        </CardBody>
      </Card>
    </div>
  );
}
