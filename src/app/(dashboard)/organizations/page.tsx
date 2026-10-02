import { listOrganizations } from '@/lib/data/repo';
import { requireRole } from '@/lib/auth/session';
import { OrganizationsClient } from './OrganizationsClient';

export default async function OrganizationsPage() {
  await requireRole('ADMIN');
  const orgs = await listOrganizations();
  return <OrganizationsClient organizations={orgs} canEdit />;
}
