"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import type { PeriodType, ProjectStatus } from "@/components/dashboard/types";
import { ProjectsTable, type ProjectTableRow } from "@/components/projects/ProjectsTable";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAuth } from "@/lib/context/AuthContext";
import { createClient } from "@/lib/supabase/client";

type ProjectRecord = {
  id: string;
  name: string;
  period_type: string;
  selected_columns: unknown[] | null;
  created_at: string;
  status: string | null;
};

function mapPeriodType(value: string): PeriodType {
  if (value === "Weekly" || value === "Monthly" || value === "Custom") return value;
  return "Monthly";
}

function mapProjectStatus(value: string | null): ProjectStatus {
  if (!value) return "Active";
  if (value.toLowerCase() === "archived" || value.toLowerCase() === "inactive") return "Archived";
  return "Active";
}

export default function ProjectsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectTableRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Archived">("All");
  const [projectToArchive, setProjectToArchive] = useState<ProjectTableRow | null>(null);

  const canManage = userRole === "org_admin";

  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true);

      const [{ data: projectRows }, { data: categoryRows }, { data: invoiceRows }] = await Promise.all([
        supabase
          .from("projects")
          .select("id, name, period_type, selected_columns, created_at, status")
          .order("created_at", { ascending: false }),
        supabase.from("categories").select("id, project_id"),
        supabase.from("invoices").select("id, project_id"),
      ]);

      const categoryCounts = new Map<string, number>();
      (categoryRows ?? []).forEach((row) => {
        const key = row.project_id as string;
        categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + 1);
      });

      const invoiceCounts = new Map<string, number>();
      (invoiceRows ?? []).forEach((row) => {
        const key = row.project_id as string;
        invoiceCounts.set(key, (invoiceCounts.get(key) ?? 0) + 1);
      });

      const mapped = (projectRows as ProjectRecord[] | null)?.map((project) => ({
        id: project.id,
        name: project.name,
        periodType: mapPeriodType(project.period_type),
        columnsCount: Array.isArray(project.selected_columns) ? project.selected_columns.length : 0,
        categoriesCount: categoryCounts.get(project.id) ?? 0,
        invoicesCount: invoiceCounts.get(project.id) ?? 0,
        createdAt: project.created_at,
        status: mapProjectStatus(project.status),
      }));

      setProjects(mapped ?? []);
      setLoading(false);
    };

    void loadProjects();
  }, [supabase]);

  const filteredProjects = projects.filter((project) => {
    const byName = project.name.toLowerCase().includes(search.toLowerCase());
    const byStatus = statusFilter === "All" ? true : project.status === statusFilter;
    return byName && byStatus;
  });

  const archiveProject = async () => {
    if (!projectToArchive) return;
    await supabase
      .from("projects")
      .update({ status: "archived" })
      .eq("id", projectToArchive.id);

    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectToArchive.id ? { ...project, status: "Archived" } : project,
      ),
    );
    setProjectToArchive(null);
  };

  return (
    <DashboardLayout pageTitle="Projects">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader
          title="Projects"
          action={
            canManage ? (
              <button
                type="button"
                onClick={() => router.push("/projects/new")}
                className="rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain hover:bg-snap-bg"
              >
                + New Project
              </button>
            ) : null
          }
        />

        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search project name..."
            className="w-full rounded-md border border-snap-border bg-snap-surface px-3 py-2 text-sm text-snap-textMain outline-none"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "All" | "Active" | "Archived")}
            className="rounded-md border border-snap-border bg-snap-surface px-3 py-2 text-sm text-snap-textMain outline-none"
          >
            <option>All</option>
            <option>Active</option>
            <option>Archived</option>
          </select>
        </div>

        {loading ? (
          <div className="rounded-lg border border-snap-border bg-snap-surface p-6 text-sm text-snap-textDim">
            Loading projects...
          </div>
        ) : filteredProjects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description="Create your first project to get started."
            actionLabel={canManage ? "+ New Project" : undefined}
            onAction={canManage ? () => router.push("/projects/new") : undefined}
          />
        ) : (
          <ProjectsTable
            projects={filteredProjects}
            canManage={canManage}
            onArchive={setProjectToArchive}
          />
        )}
      </div>

      <ConfirmModal
        open={Boolean(projectToArchive)}
        title="Archive Project"
        description="This project will be moved to archived status."
        confirmLabel="Archive"
        destructive
        onCancel={() => setProjectToArchive(null)}
        onConfirm={() => void archiveProject()}
      />
    </DashboardLayout>
  );
}
