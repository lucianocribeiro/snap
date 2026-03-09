"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { PeriodType, ProjectStatus } from "@/components/dashboard/types";

export type ProjectTableRow = {
  id: string;
  name: string;
  periodType: PeriodType;
  columnsCount: number;
  categoriesCount: number;
  invoicesCount: number;
  createdAt: string;
  status: ProjectStatus;
};

type ProjectsTableProps = {
  projects: ProjectTableRow[];
  canManage: boolean;
  onArchive: (project: ProjectTableRow) => void;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function periodBadgeClass(periodType: PeriodType) {
  if (periodType === "Weekly") return "border-blue-500/40 bg-blue-500/10 text-blue-300";
  if (periodType === "Monthly") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  return "border-violet-500/40 bg-violet-500/10 text-violet-300";
}

export function ProjectsTable({ projects, canManage, onArchive }: ProjectsTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-snap-border bg-snap-surface">
      <table className="min-w-full divide-y divide-snap-border">
        <thead className="bg-snap-bg/80">
          <tr>
            {[
              "Project",
              "Period Type",
              "Columns",
              "Categories",
              "Invoices",
              "Created",
              "Status",
              "Actions",
            ].map((column) => (
              <th
                key={column}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-snap-textDim"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-snap-border bg-snap-surface">
          {projects.map((project) => (
            <tr key={project.id}>
              <td className="px-4 py-4 text-sm font-medium text-snap-textMain">
                <Link href={`/projects/${project.id}`} className="hover:underline">
                  {project.name}
                </Link>
              </td>
              <td className="px-4 py-4 text-sm">
                <span
                  className={[
                    "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
                    periodBadgeClass(project.periodType),
                  ].join(" ")}
                >
                  {project.periodType}
                </span>
              </td>
              <td className="px-4 py-4 text-sm text-snap-textDim">{project.columnsCount} columns</td>
              <td className="px-4 py-4 text-sm text-snap-textDim">{project.categoriesCount}</td>
              <td className="px-4 py-4 text-sm text-snap-textDim">{project.invoicesCount}</td>
              <td className="px-4 py-4 text-sm text-snap-textDim">{formatDate(project.createdAt)}</td>
              <td className="px-4 py-4 text-sm">
                <StatusBadge status={project.status} variant="project" />
              </td>
              <td className="px-4 py-4 text-sm text-snap-textDim">
                <div className="flex items-center gap-3">
                  <Link href={`/projects/${project.id}`} className="hover:text-snap-textMain">
                    View
                  </Link>
                  {canManage ? (
                    <>
                      <Link href={`/projects/${project.id}/edit`} className="hover:text-snap-textMain">
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => onArchive(project)}
                        className="text-amber-300 hover:text-amber-200"
                      >
                        Archive
                      </button>
                    </>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
