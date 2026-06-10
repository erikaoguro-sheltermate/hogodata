import { Sidebar } from '@/components/Sidebar';
import { getSession } from '@/lib/auth/session';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const gated = !!process.env.APP_PASSWORD;
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={session.role} displayName={session.displayName} gated={gated} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
