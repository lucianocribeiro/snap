"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type OrgUser = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
};

type ProjectInvoice = {
  id: string;
  label: string;
};

type TaskData = {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "pending_approval" | "done";
  assignedTo: string | null;
  assignedToName: string | null;
  invoiceId: string | null;
  invoiceLabel: string | null;
  projectId: string;
  organizationId: string;
};

type SavedTask = {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "pending_approval" | "done";
  assignedTo: string | null;
  assignedToName: string | null;
  invoiceId: string | null;
  invoiceLabel: string | null;
};

type TaskEditModalProps = {
  taskId: string;
  isAdmin?: boolean;
  onClose: () => void;
  onSaved: (updated: SavedTask) => void;
};

export function TaskEditModal({ taskId, isAdmin = false, onClose, onSaved }: TaskEditModalProps) {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuth();
  const { t } = useLanguage();

  const [task, setTask] = useState<TaskData | null>(null);
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [invoices, setInvoices] = useState<ProjectInvoice[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [status, setStatus] = useState<"open" | "in_progress" | "pending_approval" | "done">("open");
  const [originalStatus, setOriginalStatus] = useState<"open" | "in_progress" | "pending_approval" | "done">("open");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const statusChanged = status !== originalStatus;

  useEffect(() => {
    const load = async () => {
      setLoadingData(true);

      const { data: taskRow } = await supabase
        .from("tasks")
        .select("id, title, description, status, assigned_to, invoice_id, project_id, organization_id")
        .eq("id", taskId)
        .maybeSingle();

      if (!taskRow) {
        setLoadingData(false);
        return;
      }

      const projectId = taskRow.project_id as string;
      const organizationId = taskRow.organization_id as string;

      const [{ data: userRows }, { data: invoiceRows }] = await Promise.all([
        supabase
          .from("user_profiles")
          .select("id, first_name, last_name, role")
          .eq("organization_id", organizationId)
          .neq("role", "super_admin")
          .order("first_name"),
        supabase
          .from("invoices")
          .select("id, invoice_number, vendor")
          .eq("project_id", projectId)
          .order("uploaded_at", { ascending: false }),
      ]);

      const mappedUsers: OrgUser[] = ((userRows ?? []) as Record<string, unknown>[]).map((u) => ({
        id: u["id"] as string,
        firstName: (u["first_name"] as string | null) ?? "",
        lastName: (u["last_name"] as string | null) ?? "",
        role: u["role"] as string,
      }));

      const mappedInvoices: ProjectInvoice[] = ((invoiceRows ?? []) as Record<string, unknown>[]).map((i) => ({
        id: i["id"] as string,
        label: (i["vendor"] as string | null) || (i["invoice_number"] as string | null) || (i["id"] as string),
      }));

      const assigneeUser = mappedUsers.find((u) => u.id === (taskRow.assigned_to as string | null));
      const assigneeInvoice = mappedInvoices.find((i) => i.id === (taskRow.invoice_id as string | null));

      const taskData: TaskData = {
        id: taskRow.id as string,
        title: (taskRow.title as string | null) ?? "",
        description: taskRow.description as string,
        status: taskRow.status as "open" | "in_progress" | "pending_approval" | "done",
        assignedTo: (taskRow.assigned_to as string | null) ?? null,
        assignedToName: assigneeUser
          ? [assigneeUser.firstName, assigneeUser.lastName].filter(Boolean).join(" ")
          : null,
        invoiceId: (taskRow.invoice_id as string | null) ?? null,
        invoiceLabel: assigneeInvoice ? assigneeInvoice.label : null,
        projectId,
        organizationId,
      };

      setTask(taskData);
      setUsers(mappedUsers);
      setInvoices(mappedInvoices);
      setTitle(taskData.title);
      setDescription(taskData.description);
      setAssignedTo(taskData.assignedTo ?? "");
      setInvoiceId(taskData.invoiceId ?? "");
      setStatus(taskData.status);
      setOriginalStatus(taskData.status);
      setLoadingData(false);
    };

    void load();
  }, [taskId, supabase]);

  async function handleSave() {
    if (!task || !title.trim() || !description.trim() || !user?.id) return;
    setSaving(true);

    const { error } = await supabase
      .from("tasks")
      .update({
        title: title.trim(),
        description: description.trim(),
        assigned_to: assignedTo || null,
        invoice_id: invoiceId || null,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id);

    if (error) {
      setSaving(false);
      return;
    }

    if (statusChanged && comment.trim()) {
      await supabase.from("task_comments").insert({
        task_id: task.id,
        user_id: user.id,
        organization_id: task.organizationId,
        comment: comment.trim(),
      });
    }

    const assignedUser = users.find((u) => u.id === assignedTo);
    const inv = invoices.find((i) => i.id === invoiceId);

    setSaving(false);
    onSaved({
      id: task.id,
      title: title.trim(),
      description: description.trim(),
      status,
      assignedTo: assignedTo || null,
      assignedToName: assignedUser
        ? [assignedUser.firstName, assignedUser.lastName].filter(Boolean).join(" ")
        : null,
      invoiceId: invoiceId || null,
      invoiceLabel: inv ? inv.label : null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="w-full max-w-md rounded-xl border border-snap-border bg-snap-surface p-8">
        {loadingData ? (
          <p className="text-sm text-snap-textDim">{t("common.loading")}</p>
        ) : !task ? (
          <div className="space-y-4">
            <p className="text-sm text-snap-textDim">{t("projects.notFound")}</p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-snap-border px-4 py-2 text-sm text-snap-textDim hover:bg-snap-bg"
            >
              {t("common.cancel")}
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-snap-textMain">{t("tasks.editTask")}</h3>

            <div className="space-y-1">
              <label className="text-xs text-snap-textDim">{t("tasks.taskTitle")} *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-snap-textDim">{t("tasks.description")} *</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-snap-textDim">{t("tasks.assignTo")} *</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
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
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
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

            <div className="space-y-1">
              <label className="text-xs text-snap-textDim">{t("tasks.status")}</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "open" | "in_progress" | "pending_approval" | "done")}
                className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain focus:outline-none"
              >
                <option value="open">{t("tasks.statusOpen")}</option>
                <option value="in_progress">{t("tasks.statusInProgress")}</option>
                <option value="pending_approval">{t("tasks.statusPendingApproval")}</option>
                {isAdmin ? (
                  <option value="done">{t("tasks.statusDone")}</option>
                ) : null}
              </select>
            </div>

            {statusChanged ? (
              <div className="space-y-1">
                <label className="text-xs text-snap-textDim">{t("tasks.commentOnStatusChange")}</label>
                <textarea
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t("tasks.commentPlaceholder")}
                  className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain placeholder:text-snap-textDim focus:outline-none"
                />
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-snap-border px-4 py-2 text-sm text-snap-textDim hover:bg-snap-bg"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || !title.trim() || !description.trim()}
                className="rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm text-snap-textMain hover:bg-snap-bg disabled:opacity-50"
              >
                {saving ? t("common.loading") : t("common.save")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
