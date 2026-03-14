import { OrganizationsListClient } from "@/components/super-admin/OrganizationsListClient";
import { getOrganizationsWithCounts } from "@/lib/super-admin/data";

export default async function SuperAdminOrganizationsPage() {
  const organizations = await getOrganizationsWithCounts();

  return <OrganizationsListClient organizations={organizations} />;
}
