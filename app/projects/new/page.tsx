"use client";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function NewProjectPage() {
  const { t } = useLanguage();

  return (
    <DashboardLayout pageTitle={t("projects.newProject")}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <PageHeader
          title={t("projects.createProject")}
          description={t("projects.createProjectDescription")}
        />
        <ProjectForm mode="create" />
      </div>
    </DashboardLayout>
  );
}
