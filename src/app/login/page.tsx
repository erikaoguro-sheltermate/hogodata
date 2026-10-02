import { Card, CardBody, Button } from '@/components/ui';
import { authMode, getSession } from '@/lib/auth/session';
import { getSettings } from '@/lib/data/repo';
import { DemoRoleButtons } from './DemoRoleButtons';
import { gateLogin, passwordLogin, logout } from './actions';

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

function ErrorBox({ children }: { children: React.ReactNode }) {
  return <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600">{children}</p>;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const mode = authMode();
  const { contactEmail } = await getSettings();
  // ログイン済みだが使えない状態（Profile 未登録・停止中）
  const blocked = mode === 'supabase' && sp.error === 'noaccess' && (await getSession()).userId !== 'anonymous';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 to-slate-50 p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-2xl">🐾</div>
          <h1 className="text-2xl font-bold text-slate-800">どうぶつ保護データプロジェクト</h1>
        </div>
        <Card>
          <CardBody>
            {mode === 'supabase' && (
              blocked ? (
                <form action={logout} className="space-y-3">
                  <ErrorBox>このアカウントは現在ご利用いただけません。</ErrorBox>
                  <p className="text-center text-sm text-slate-500">
                    アカウントの準備中か、利用が停止されています。JASA事務局にお問い合わせください。
                  </p>
                  <Button type="submit" variant="secondary" className="w-full">ログアウトして別のアカウントで入る</Button>
                </form>
              ) : (
                <form action={passwordLogin} className="space-y-3">
                  {sp.error === 'invalid' && <ErrorBox>メールアドレスまたはパスワードが正しくありません</ErrorBox>}
                  {sp.error === 'noaccess' && <ErrorBox>このアカウントは現在ご利用いただけません。事務局にお問い合わせください。</ErrorBox>}
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">メールアドレス</span>
                    <input type="email" name="email" required autoFocus autoComplete="email" className={inputCls} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">パスワード</span>
                    <input type="password" name="password" required autoComplete="current-password" className={inputCls} />
                  </label>
                  <Button type="submit" className="w-full">ログイン</Button>
                  <p className="pt-1 text-center text-xs text-slate-400">
                    パスワードを忘れた場合は、JASA事務局に再発行を依頼してください。
                    {contactEmail && <><br /><a href={`mailto:${contactEmail}`} className="text-emerald-700 hover:underline">{contactEmail}</a></>}
                  </p>
                </form>
              )
            )}

            {mode === 'gate' && (
              <form action={gateLogin} className="space-y-3">
                <p className="text-center text-sm text-slate-500">運営パスワードを入力してください</p>
                {sp.error && <ErrorBox>パスワードが正しくありません</ErrorBox>}
                <input type="password" name="password" required autoFocus placeholder="パスワード" className={inputCls} />
                <Button type="submit" className="w-full">ログイン</Button>
              </form>
            )}

            {mode === 'demo' && <DemoRoleButtons />}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
