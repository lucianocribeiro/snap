"use client";

import { useEffect, useMemo, useState } from "react";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TaskEditModal } from "@/components/projects/TaskEditModal";
import { useAuth } from "@/lib/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type OrgUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

type ProjectInvoice = {
  id: string;
  label: string;
};

type Task = {
  id: string;
  description: string;
  status: "open" | "in_progress" | "done";
  assignedTo: string | null;
  assignedToName: string | null;
  createdBy: string;
  createdByName: string;
  invoiceId: string | null;
  invoiceLabel: string | null;
  createdAt: string;
};

type TasksTabProps = {
  projectId: string;
  organizationId: string;
};

const EMPTY_FORM = {
  description: "",
  assignedTo: "",
  invoiceId: "",
  status: "open" as "open" | "in_progress" | "done",
};

export function TasksTab({ projectId, organizationId }: TasksTabProps) {
  const supabase = useMemo(() => createClient(), []);
  const { userRole, user } = useAuth();
  const { t } = useLanguage();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [invoices, setInvoices] = useState<ProjectInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const isAdmin = userRole === "org_admin";

  // Show toast briefly
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const [{ data: taskRows }, { data: userRows }, { data: invoiceRows }] = await Promise.all([
        supabase
          .from("tasks")
          .select(
            `id, description, status, assigned_to, created_by, invoice_id, created_at,
             assignee:user_profiles!tasks_assigned_to_fkey(first_name, last_name),
             creator:user_profiles!tasks_created_by_fkey(first_name, last_name)`
          )
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }),
        supabase
          .from("user_profiles")
          .select("id, first_name, last_name, email, role")
          .eq("organization_id", organizationId)
          .neq("role", "super_admin")
          .order("first_name"),
        supabase
          .from("invoices")
          .select("id, invoice_number, vendor")
          .eq("project_id", projectId)
          .order("uploaded_at", { ascending: false }),
      ]);

      setTasks(
        ((taskRows ?? []) as Record<string, unknown>[]).map((row) => {
          const assignee = row["assignee"] as { first_name: string | null; last_name: string | null } | null;
          const creator = row["creator"] as { first_name: string | null; last_name: string | null } | null;
          const inv = invoiceRows?.find((i) => i.id === row["invoice_id"]);
          return {
            id: row["id"] as string,
            description: row["description"] as string,
            status: row["status"] as "open" | "in_progress" | "done",
            assignedTo: (row["assigned_to"] as string | null) ?? null,
            assignedToName: assignee
              ? [assignee.first_name, assignee.last_name].filter(Boolean).join(" ")
              : null,
            createdBy: row["created_by"] as string,
            createdByName: creator
              ? [creator.first_name, creator.last_name].filter(Boolean).join(" ")
              : "",
            invoiceId: (row["invoice_id"] as string | null) ?? null,
            invoiceLabel: inv ? (inv.vendor || inv.invoice_number || inv.id) : null,
            createdAt: row["created_at"] as string,
          };
        }),
      );

      setUsers(
        ((userRows ?? []) as Record<string, unknown>[]).map((u) => ({
          id: u["id"] as string,
          firstName: (u["first_name"] as string | null) ?? "",
          lastName: (u["last_name"] as string | null) ?? "",
          email: u["email"] as string,
          role: u["role"] as string,
        })),
      );

      setInvoices(
        ((invoiceRows ?? []) as Record<string, unknown>[]).map((i) => ({
          id: i["id"] as string,
          label: (i["vendor"] as string | null) || (i["invoice_number"] as string | null) || (i["id"] as string),
        })),
      );

      setLoading(false);
    };

    void load();
  }, [projectId, organizationId, supabase]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setCreateOpen(true);
  }

  function handleTaskSaved(updated: {
    id: string;
    description: string;
    status: "open" | "in_progress" | "done";
    assignedTo: string | null;
    assignedToName: string | null;
    invoiceId: string | null;
    invoiceLabel: string | null;
  }) {
    setTasks((prev) =>
      prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)),
    );
    setEditingTaskId(null);
    showToast(t("tasks.updated"));
  }

  async function handleCreate() {
    if (!form.description.trim() || !form.assignedTo) return;
    if (!user?.id) return;
    setSaving(true);

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        project_id: projectId,
        description: form.description.trim(),
        assigned_to: form.assignedTo || null,
        invoice_id: form.invoiceId || null,
        created_by: user.id,
      })
      .select(
        `id, description, status, assigned_to, created_by, invoice_id, created_at,
         assignee:user_profiles!tasks_assigned_to_fkey(first_name, last_name),
         creator:user_profiles!tasks_created_by_fkey(first_name, last_name)`
      )
      .single();

    setSaving(false);
    if (error || !data) return;

    const row = data as Record<string, unknown>;
    const assignee = row["assignee"] as { first_name: string | null; last_name: string | null } | null;
    const creator = row["creator"] as { first_name: string | null; last_name: string | null } | null;
    const inv = invoices.find((i) => i.id === row["invoice_id"]);

    const newTask: Task = {
      id: row["id"] as string,
      description: row["description"] as string,
      status: row["status"] as "open" | "in_progress" | "done",
      assignedTo: (row["assigned_to"] as string | null) ?? null,
      assignedToName: assignee
        ? [assignee.first_name, assignee.last_name].filter(Boolean).join(" ")
        : null,
      createdBy: row["created_by"] as string,
      createdByName: creator
        ? [creator.first_name, creator.last_name].filter(Boolean).join(" ")
        : "",
      invoiceId: (row["invoice_id"] as string | null) ?? null,
      invoiceLabel: inv ? inv.label : null,
      createdAt: row["created_at"] as string,
    };

    setTasks((prev) => [newTask, ...prev]);
    setCreateOpen(false);
    showToast(t("tasks.created"));
  }

  async function handleDelete() {
    if (!deleteTask) return;
    const { error } = await supabase.from("tasks").delete().eq("id", deleteTask.id);
    if (error) return;
    setTasks((prev) => prev.filter((t) => t.id !== deleteTask.id));
    setDeleteTask(null);
    showToast(t("tasks.deleted"));
  }

  function statusLabel(status: string) {
    if (status === "open") return t("tasks.statusOpen");
    if (status === "in_progress") return t("tasks.statusInProgress");
    if (status === "done") return t("tasks.statusDone");
    return status;
  }

  return (
    <div className="space-y-4">
      {toast ? (
        <div className="rounded-md border border-snap-border bg-snap-surface px-4 py-3 text-sm text-snap-textMain">
          {toast}
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-snap-textMain">{t("tasks.title")}</h2>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm text-snap-textMain hover:bg-snap-bg"
        >
          + {t("tasks.newTask")}
        </button>
      </div>

      {loading ? (
        <div className="rounded-lg border border-snap-border bg-snap-surface p-6 text-sm text-snap-textDim">
          {t("common.loading")}
        </div>
      ) : null}

      {!loading && tasks.length === 0 ? (
        <div className="rounded-lg border border-snap-border bg-snap-surface p-10 text-center text-sm text-snap-textDim">
          {t("tasks.empty")}
        </div>
      ) : null}

      {!loading && tasks.length > 0 ? (
        <ul className="space-y-3">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="rounded-lg border border-snap-border bg-snap-surface p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-snap-textMain">{task.description}</p>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTaskId(task.id)}
                    className="rounded-md border border-snap-border px-3 py-1 text-xs text-snap-textMain hover:bg-snap-bg"
                  >
                    {t("common.edit")}
                  </button>
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => setDeleteTask(task)}
                      className="rounded-md border border-red-500/30 px-3 py-1 text-xs text-red-400 hover:bg-red-500/10"
                    >
                      {t("common.delete")}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={statusLabel(task.status)} variant="task" />
                <span className="text-xs text-snap-textDim">
                  {t("tasks.assignTo")}:{" "}
                  <span className="text-snap-textMain">
                    {task.assignedToName || t("tasks.unassigned")}
                  </span>
                </span>
                {task.invoiceLabel ? (
                  <span className="text-xs text-snap-textDim">
                    {t("tasks.linkInvoice")}:{" "}
                    <span className="text-blue-300">{task.invoiceLabel}</span>
                  </span>
                ) : null}
              </div>

              <p className="text-xs text-snap-textDim">
                {t("tasks.createdBy")} {task.createdByName} &middot;{" "}
                {new Date(task.createdAt).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      {/* Create Modal */}
      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-md space-y-5 rounded-xl border border-snap-border bg-snap-surface p-8">
            <h3 className="text-lg font-semibold text-snap-textMain">{t("tasks.newTask")}</h3>

            <div className="space-y-1">
              <label className="text-xs text-snap-textDim">{t("tasks.description")} *</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-snap-textDim">{t("tasks.assignTo")} *</label>
              <select
                value={form.assignedTo}
                onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
                className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain focus:outline-none"
              >
                <option value="">{t("tasks.selectAssignee")}</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {[u.firstName, u.lastName].filter(Boolean).join(" ")} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-snap-textDim">{t("tasks.linkInvoice")}</label>
              <select
                value={form.invoiceId}
                onChange={(e) => setForm((f) => ({ ...f, invoiceId: e.target.value }))}
                className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain focus:outline-none"
              >
                <option value="">{t("tasks.noInvoice")}</option>
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-md border border-snap-border px-4 py-2 text-sm text-snap-textDim hover:bg-snap-bg"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={saving || !form.description.trim() || !form.assignedTo}
                className="rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm text-snap-textMain hover:bg-snap-bg disabled:opacity-50"
              >
                {saving ? t("common.loading") : t("common.save")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Edit Modal */}
      {editingTaskId ? (
        <TaskEditModal
          taskId={editingTaskId}
          onClose={() => setEditingTaskId(null)}
          onSaved={handleTaskSaved}
        />
      ) : null}

      {/* Delete Confirm Modal */}
      <ConfirmModal
        open={deleteTask !== null}
        title={t("tasks.editTask")}
        description={t("tasks.deleteConfirm")}
        confirmLabel={t("common.delete")}
        destructive
        onCancel={() => setDeleteTask(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
