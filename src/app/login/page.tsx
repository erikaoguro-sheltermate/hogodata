import { Card, CardBody, Button } from '@/components/ui';
import { DemoRoleButtons } from './DemoRoleButtons';
import { gateLogin } from './actions';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const gated = !!process.env.APP_PASSWORD;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 to-slate-50 p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-2xl">🐾</div>
          <h1 className="text-xl font-bold text-slate-800">JASA Data Hub</h1>
          <p className="mt-1 text-sm text-slate-500">どうぶつ保護データプロジェクト</p>
        </div>
        <Card>
          <CardBody>
            {gated ? (
              <form action={gateLogin} className="space-y-3">
                <p className="text-center text-sm text-slate-500">運営パスワードを入力してください</p>
                {sp.error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600">
                    パスワードが正しくありません
                  </p>
                )}
                <input
                  type="password" name="password" required autoFocus placeholder="パスワード"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
                <Button type="submit" className="w-full">ログイン</Button>
              </form>
            ) : (
              <DemoRoleButtons />
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
