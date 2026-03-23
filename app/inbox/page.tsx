"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { TaskEditModal } from "@/components/projects/TaskEditModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAuth } from "@/lib/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  relatedTaskId: string | null;
  taskDescription: string | null;
  taskStatus: string | null;
  createdAt: string;
};

type ActionForm = {
  notifId: string;
  type: "approve" | "deny";
  text: string;
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

const TASK_TYPES = new Set([
  "task_assigned",
  "task_updated",
  "task_pending_approval",
  "task_approved",
  "task_denied",
]);

export default function InboxPage() {
  const supabase = useMemo(() => createClient(), []);
  const { user, userRole, organizationId } = useAuth();
  const { t } = useLanguage();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [actionForm, setActionForm] = useState<ActionForm | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function statusLabel(status: string): string {
    if (status === "open") return t("tasks.statusOpen");
    if (status === "in_progress") return t("tasks.statusInProgress");
    if (status === "pending_approval") return t("tasks.statusPendingApproval");
    if (status === "done") return t("tasks.statusDone");
    return status;
  }

  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("notifications")
        .select(
          `id, type, title, body, read, related_task_id, created_at,
           task:tasks!notifications_related_task_id_fkey(description, status)`,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setNotifications(
        ((data ?? []) as Record<string, unknown>[]).map((row) => {
          const task = row["task"] as { description: string; status: string } | null;
          return {
            id: row["id"] as string,
            type: row["type"] as string,
            title: row["title"] as string,
            body: row["body"] as string,
            read: row["read"] as boolean,
            relatedTaskId: (row["related_task_id"] as string | null) ?? null,
            taskDescription: task?.description ?? null,
            taskStatus: task?.status ?? null,
            createdAt: row["created_at"] as string,
          };
        }),
      );
      setLoading(false);
    };

    void load();

    const subscription = supabase
      .channel(`inbox-notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setNotifications((prev) => prev.filter((n) => n.id !== deletedId));
        },
      )
      .subscribe();

    return () => {
      void subscription.unsubscribe();
    };
  }, [user?.id, supabase]);

  async function markRead(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }

  async function markAllRead() {
    if (!user?.id) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function confirmApproval(n: Notification, commentText: string) {
    if (!n.relatedTaskId || !user?.id) return;
    setSubmitting(true);

    await supabase.from("task_comments").insert({
      task_id: n.relatedTaskId,
      user_id: user.id,
      organization_id: organizationId,
      content: commentText,
    });

    await supabase
      .from("tasks")
      .update({ status: "done", approved_by: user.id, updated_at: new Date().toISOString() })
      .eq("id", n.relatedTaskId);

    const { data: taskRow } = await supabase
      .from("tasks")
      .select("assigned_to")
      .eq("id", n.relatedTaskId)
      .single();
    const assigneeId = (taskRow as { assigned_to: string | null } | null)?.assigned_to ?? null;
    if (assigneeId && assigneeId !== user.id) {
      await supabase.from("notifications").insert({
        user_id: assigneeId,
        type: "task_approved",
        title: n.title,
        body: `Your task was approved: ${commentText}`,
        related_task_id: n.relatedTaskId,
      });
    }

    await supabase.from("notifications").update({ read: true }).eq("id", n.id);
    setNotifications((prev) => prev.filter((x) => x.id !== n.id));
    setActionForm(null);
    setSubmitting(false);
    showToast(t("tasks.taskApproved"));
  }

  async function confirmDenial(n: Notification, commentText: string) {
    if (!n.relatedTaskId || !user?.id) return;
    setSubmitting(true);

    await supabase.from("task_comments").insert({
      task_id: n.relatedTaskId,
      user_id: user.id,
      organization_id: organizationId,
      content: commentText,
    });

    await supabase
      .from("tasks")
      .update({ status: "open", updated_at: new Date().toISOString() })
      .eq("id", n.relatedTaskId);

    const { data: taskRow } = await supabase
      .from("tasks")
      .select("assigned_to")
      .eq("id", n.relatedTaskId)
      .single();
    const assigneeId = (taskRow as { assigned_to: string | null } | null)?.assigned_to ?? null;
    if (assigneeId && assigneeId !== user.id) {
      await supabase.from("notifications").insert({
        user_id: assigneeId,
        type: "task_denied",
        title: n.title,
        body: `Your task was returned for revision: ${commentText}`,
        related_task_id: n.relatedTaskId,
      });
    }

    await supabase.from("notifications").update({ read: true }).eq("id", n.id);
    setNotifications((prev) => prev.filter((x) => x.id !== n.id));
    setActionForm(null);
    setSubmitting(false);
    showToast(t("tasks.taskDenied"));
  }

  async function submitForApproval(n: Notification) {
    if (!n.relatedTaskId) return;
    await supabase
      .from("tasks")
      .update({ status: "pending_approval", updated_at: new Date().toISOString() })
      .eq("id", n.relatedTaskId);
    await supabase.from("notifications").update({ read: true }).eq("id", n.id);
    setNotifications((prev) =>
      prev.map((x) =>
        x.id === n.id ? { ...x, read: true, taskStatus: "pending_approval" } : x,
      ),
    );
    showToast(t("tasks.submittedForApproval"));
  }

  function openEditTask(n: Notification) {
    if (!n.read) void markRead(n.id);
    setEditingTaskId(n.relatedTaskId);
  }

  return (
    <DashboardLayout pageTitle={t("inbox.title")}>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        {toast ? (
          <div className="rounded-md border border-snap-border bg-snap-surface px-4 py-3 text-sm text-snap-textMain">
            {toast}
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-snap-textMain">{t("inbox.title")}</h2>
          {notifications.some((n) => !n.read) ? (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm text-snap-textMain hover:bg-snap-bg"
            >
              {t("inbox.markAllRead")}
            </button>
          ) : null}
        </div>

        {loading ? (
          <div className="rounded-lg border border-snap-border bg-snap-surface p-6 text-sm text-snap-textDim">
            {t("common.loading")}
          </div>
        ) : null}

        {!loading && notifications.length === 0 ? (
          <div className="rounded-lg border border-snap-border bg-snap-surface p-10 text-center text-sm text-snap-textDim">
            {t("inbox.empty")}
          </div>
        ) : null}

        {!loading && notifications.length > 0 ? (
          <ul className="space-y-2">
            {notifications.map((n) => {
              const isTaskNotif = TASK_TYPES.has(n.type) && Boolean(n.relatedTaskId);
              const isActiveForm = actionForm?.notifId === n.id;
              return (
                <li key={n.id} className="space-y-1">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => { if (!n.read) void markRead(n.id); }}
                    onKeyDown={(e) => { if (e.key === "Enter" && !n.read) void markRead(n.id); }}
                    className="flex w-full cursor-pointer items-start gap-3 rounded-lg border border-snap-border bg-snap-surface p-4 text-left transition hover:bg-snap-bg"
                  >
                    <span
                      className={[
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        n.read ? "bg-transparent" : "bg-blue-400",
                      ].join(" ")}
                    />
                    <div className="flex-1 space-y-1.5">
                      <p
                        className={[
                          "text-sm",
                          n.read ? "text-snap-textMain" : "font-semibold text-snap-textMain",
                        ].join(" ")}
                      >
                        {n.title}
                      </p>

                      {/* Task name + status badge */}
                      {isTaskNotif && n.taskDescription ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {n.taskStatus ? (
                            <StatusBadge
                              status={statusLabel(n.taskStatus)}
                              variant="task"
                            />
                          ) : null}
                          <span className="text-xs text-snap-textMain line-clamp-1">
                            {n.taskDescription}
                          </span>
                        </div>
                      ) : null}

                      <p className="text-sm text-snap-textDim">{n.body}</p>
                      {(n.type === "task_assigned" || n.type === "task_updated") &&
                      (n.taskStatus === "open" || n.taskStatus === "in_progress") &&
                      userRole !== "org_admin" ? (
                        <div className="pt-0.5">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); void submitForApproval(n); }}
                            className="rounded-md border border-amber-500/30 px-3 py-1 text-xs text-amber-400 hover:bg-amber-500/10"
                          >
                            {t("tasks.submitForApproval")}
                          </button>
                        </div>
                      ) : null}
                      <div className="flex items-center gap-3 pt-0.5">
                        <p className="text-xs text-snap-textDim">{timeAgo(n.createdAt)}</p>
                        {isTaskNotif ? (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openEditTask(n); }}
                            className="rounded-md border border-snap-border px-2 py-0.5 text-xs text-snap-textMain hover:bg-snap-bg"
                          >
                            {t("tasks.editTask")}
                          </button>
                        ) : null}
                        {n.type === "task_pending_approval" && userRole === "org_admin" ? (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionForm({ notifId: n.id, type: "approve", text: "" });
                              }}
                              className="rounded-md border border-emerald-500/30 px-2 py-0.5 text-xs text-emerald-400 hover:bg-emerald-500/10"
                            >
                              {t("tasks.approve")}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionForm({ notifId: n.id, type: "deny", text: "" });
                              }}
                              className="rounded-md border border-snap-border px-2 py-0.5 text-xs text-snap-textDim hover:bg-snap-bg"
                            >
                              {t("tasks.sendBack")}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Inline approval / denial form */}
                  {isActiveForm ? (
                    <div className="rounded-lg border border-snap-border bg-snap-surface px-4 py-3 space-y-3">
                      <textarea
                        rows={3}
                        placeholder={
                          actionForm.type === "approve"
                            ? t("tasks.approvalComment")
                            : t("tasks.denialReason")
                        }
                        value={actionForm.text}
                        onChange={(e) =>
                          setActionForm((prev) =>
                            prev ? { ...prev, text: e.target.value } : prev,
                          )
                        }
                        className="w-full resize-none rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain placeholder:text-snap-textDim focus:outline-none"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={!actionForm.text.trim() || submitting}
                          onClick={() => {
                            const notif = notifications.find((x) => x.id === actionForm.notifId);
                            if (!notif) return;
                            if (actionForm.type === "approve") {
                              void confirmApproval(notif, actionForm.text.trim());
                            } else {
                              void confirmDenial(notif, actionForm.text.trim());
                            }
                          }}
                          className={[
                            "rounded-md border px-3 py-1.5 text-xs disabled:opacity-50",
                            actionForm.type === "approve"
                              ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                              : "border-snap-border text-snap-textDim hover:bg-snap-bg",
                          ].join(" ")}
                        >
                          {actionForm.type === "approve"
                            ? t("tasks.confirmApproval")
                            : t("tasks.confirmDenial")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActionForm(null)}
                          className="rounded-md border border-snap-border px-3 py-1.5 text-xs text-snap-textDim hover:bg-snap-bg"
                        >
                          {t("common.cancel")}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      {editingTaskId ? (
        <TaskEditModal
          taskId={editingTaskId}
          onClose={() => setEditingTaskId(null)}
          onSaved={() => setEditingTaskId(null)}
        />
      ) : null}
    </DashboardLayout>
  );
}
