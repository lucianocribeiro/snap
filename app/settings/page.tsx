import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { SettingsClient } from "@/components/settings/SettingsClient";

export default function SettingsPage() {
  return (
    <DashboardLayout pageTitle="Settings">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <PageHeader title="Settings" />
        <SettingsClient />
      </div>
    </DashboardLayout>
  );
}
