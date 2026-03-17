"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { SuperAdminSettingsClient } from "@/components/super-admin/SuperAdminSettingsClient";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function SuperAdminSettingsPage() {
  const { t } = useLanguage();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <PageHeader
        title={t("settings.title")}
        description={t("superAdmin.settingsDescription")}
      />
      <SuperAdminSettingsClient />
    </div>
  );
}
