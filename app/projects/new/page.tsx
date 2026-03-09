import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProjectForm } from "@/components/projects/ProjectForm";

export default function NewProjectPage() {
  return (
    <DashboardLayout pageTitle="New Project">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <PageHeader
          title="Create Project"
          description="Configure project settings, periods, columns, and categories."
        />
        <ProjectForm mode="create" />
      </div>
    </DashboardLayout>
  );
}
