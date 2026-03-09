"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import type { ProjectColumn, ProjectFormState } from "@/components/dashboard/types";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { PageHeader } from "@/components/shared/PageHeader";
import { createClient } from "@/lib/supabase/client";

function defaultState(): ProjectFormState {
  return {
    name: "",
    description: "",
    periodType: "Monthly",
    customPeriods: [],
    selectedColumns: [],
    customColumnLabels: { custom1: "Custom 1", custom2: "Custom 2", custom3: "Custom 3" },
    categories: [],
  };
}

export default function EditProjectPage() {
  const params = useParams<{ id: string }>();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState<ProjectFormState>(defaultState());
  const [invoicesCount, setInvoicesCount] = useState(0);
  const [loadedPeriodType, setLoadedPeriodType] = useState<ProjectFormState["periodType"]>("Monthly");

  useEffect(() => {
    const loadProject = async () => {
      setLoading(true);
      const projectId = params.id;
      const [{ data: projectRow }, { data: periodRows }, { data: categoryRows }, { count: invoiceCount }] =
        await Promise.all([
          supabase
            .from("projects")
            .select("name, description, period_type, selected_columns, custom_column_labels")
            .eq("id", projectId)
            .maybeSingle(),
          supabase
            .from("project_periods")
            .select("id, name, start_date, end_date")
            .eq("project_id", projectId)
            .order("start_date", { ascending: true }),
          supabase.from("categories").select("name").eq("project_id", projectId),
          supabase
            .from("invoices")
            .select("id", { count: "exact", head: true })
            .eq("project_id", projectId),
        ]);

      if (projectRow) {
        const nextState: ProjectFormState = {
          name: projectRow.name ?? "",
          description: projectRow.description ?? "",
          periodType: projectRow.period_type ?? "Monthly",
          customPeriods: (periodRows ?? []).map((period) => ({
            id: period.id,
            name: period.name,
            startDate: period.start_date,
            endDate: period.end_date,
          })),
          selectedColumns: (projectRow.selected_columns as ProjectColumn[]) ?? [],
          customColumnLabels: {
            custom1: projectRow.custom_column_labels?.custom1 ?? "Custom 1",
            custom2: projectRow.custom_column_labels?.custom2 ?? "Custom 2",
            custom3: projectRow.custom_column_labels?.custom3 ?? "Custom 3",
          },
          categories: (categoryRows ?? []).map((category) => category.name),
        };

        setFormState(nextState);
        setLoadedPeriodType(nextState.periodType);
      }

      setInvoicesCount(invoiceCount ?? 0);
      setLoading(false);
    };

    void loadProject();
  }, [params.id, supabase]);

  return (
    <DashboardLayout pageTitle="Edit Project">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <PageHeader title="Edit Project" description="Update project setup and configuration." />
        {loading ? (
          <div className="rounded-lg border border-snap-border bg-snap-surface p-6 text-sm text-snap-textDim">
            Loading project...
          </div>
        ) : (
          <ProjectForm
            mode="edit"
            projectId={params.id}
            initialState={formState}
            initialPeriodType={loadedPeriodType}
            initialInvoicesCount={invoicesCount}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
