import { requireSession, isAdmin } from '@/lib/auth/session';
import { listAnnouncements, readAnnouncementIds } from '@/lib/data/repo';
import { AnnouncementsClient } from './AnnouncementsClient';

export default async function AnnouncementsPage() {
  const session = await requireSession();
  const [items, read] = await Promise.all([listAnnouncements(), readAnnouncementIds(session.userId)]);
  const seen = new Set(read);
  const unreadIds = items.filter((a) => !seen.has(a.id)).map((a) => a.id);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">お知らせ</h1>
        <p className="mt-1 text-sm text-slate-500">JASA事務局からのお知らせ</p>
      </div>
      <AnnouncementsClient items={items} unreadIds={unreadIds} canEdit={isAdmin(session)} />
    </div>
  );
}
