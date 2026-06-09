import { listOrganizations } from '@/lib/data/repo';
import { getSession, isAdmin } from '@/lib/auth/session';
import { OrganizationsClient } from './OrganizationsClient';

export default async function OrganizationsPage() {
  const [orgs, session] = await Promise.all([listOrganizations(), getSession()]);
  return <OrganizationsClient organizations={orgs} canEdit={isAdmin(session)} />;
}
