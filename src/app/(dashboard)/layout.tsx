import { Sidebar } from '@/components/Sidebar';
import { requireSession, authMode } from '@/lib/auth/session';
import { unreadAnnouncementCount } from '@/lib/data/repo';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const unread = await unreadAnnouncementCount(session.userId).catch(() => 0);
  return (
    <div className="flex h-screen overflow-hidden print:block print:h-auto print:overflow-visible">
      <Sidebar role={session.role} displayName={session.displayName} mode={authMode()} unreadCount={unread} />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0 print:overflow-visible print:pt-0">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8 print:max-w-none print:p-0">{children}</div>
      </main>
    </div>
  );
}
