import { UsersAuditClient } from "@/components/super-admin/UsersAuditClient";
import { getUsersAuditData } from "@/lib/super-admin/data";

export default async function SuperAdminUsersPage() {
  const users = await getUsersAuditData();

  return <UsersAuditClient users={users} />;
}
