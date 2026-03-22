"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { TaskEditModal } from "@/components/projects/TaskEditModal";
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
  createdAt: string;
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

const TASK_TYPES = new Set(["task_assigned", "task_updated"]);

export default function InboxPage() {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuth();
  const { t } = useLanguage();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("notifications")
        .select("id, type, title, body, read, related_task_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setNotifications(
        ((data ?? []) as Record<string, unknown>[]).map((row) => ({
          id: row["id"] as string,
          type: row["type"] as string,
          title: row["title"] as string,
          body: row["body"] as string,
          read: row["read"] as boolean,
          relatedTaskId: (row["related_task_id"] as string | null) ?? null,
          createdAt: row["created_at"] as string,
        })),
      );
      setLoading(false);
    };

    void load();
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

  function openEditTask(n: Notification) {
    if (!n.read) void markRead(n.id);
    setEditingTaskId(n.relatedTaskId);
  }

  return (
    <DashboardLayout pageTitle={t("inbox.title")}>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
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
              return (
                <li key={n.id}>
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
                    <div className="flex-1 space-y-1">
                      <p
                        className={[
                          "text-sm",
                          n.read ? "text-snap-textMain" : "font-semibold text-snap-textMain",
                        ].join(" ")}
                      >
                        {n.title}
                      </p>
                      <p className="text-sm text-snap-textDim">{n.body}</p>
                      <div className="flex items-center gap-3 pt-1">
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
                      </div>
                    </div>
                  </div>
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
