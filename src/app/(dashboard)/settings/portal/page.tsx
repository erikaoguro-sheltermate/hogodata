import { requireRole } from '@/lib/auth/session';
import { getSettings } from '@/lib/data/repo';
import { Card, CardBody } from '@/components/ui';
import { SettingsTabs } from '../SettingsTabs';
import { SettingsForm } from './SettingsForm';

export default async function PortalSettingsPage() {
  await requireRole('ADMIN');
  const settings = await getSettings();
  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-800">設定</h1>
      </div>
      <SettingsTabs current="/settings/portal" />
      <Card><CardBody><SettingsForm initial={settings} /></CardBody></Card>
    </div>
  );
}
