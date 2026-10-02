import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { requireSession, authMode } from '@/lib/auth/session';
import { unreadAnnouncementCount, countAwaitingReview } from '@/lib/data/repo';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const [unread, review] = await Promise.all([
    unreadAnnouncementCount(session.userId).catch(() => 0),
    session.role === 'ADMIN' ? countAwaitingReview() : Promise.resolve(0),
  ]);
  return (
    <div className="flex h-screen overflow-hidden print:block print:h-auto print:overflow-visible">
      <Sidebar role={session.role} displayName={session.displayName} mode={authMode()} unreadCount={unread} reviewCount={review} />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0 print:overflow-visible print:pt-0">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8 print:max-w-none print:p-0">
          {session.mustChangePassword && (
            <div role="alert" className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-5 py-3 print:hidden">
              <span className="text-sm text-amber-900">
                🔑 事務局から受け取った初期パスワードのままです。ご自身だけが知っているパスワードに変更してください。
              </span>
              <Link href="/account" className="rounded-full bg-amber-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-700">今すぐ変更する</Link>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
