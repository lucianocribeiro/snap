"use client";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { SettingsClient } from "@/components/settings/SettingsClient";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function SettingsPage() {
  const { t } = useLanguage();

  return (
    <DashboardLayout pageTitle={t("settings.title")}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <PageHeader title={t("settings.title")} />
        <SettingsClient />
      </div>
    </DashboardLayout>
  );
}
