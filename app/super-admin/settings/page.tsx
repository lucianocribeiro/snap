import { PageHeader } from "@/components/shared/PageHeader";
import { SuperAdminSettingsClient } from "@/components/super-admin/SuperAdminSettingsClient";

export default function SuperAdminSettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Manage your profile, password, and language preferences."
      />
      <SuperAdminSettingsClient />
    </div>
  );
}
