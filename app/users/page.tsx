"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAuth } from "@/lib/context/AuthContext";
import { createClient } from "@/lib/supabase/client";

type UserRole = "org_admin" | "user";
type UserStatus = "active" | "inactive";
type StatusSource = "is_active" | "status";

type UserProfileRecord = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string | null;
  status: string | null;
  is_active: boolean | null;
  last_login_at: string | null;
};

type UserRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: string | null;
};

type InviteModalState = {
  firstName: string;
  lastName: string;
  email: string;
};

type EditModalState = {
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
};

const INITIAL_INVITE_STATE: InviteModalState = {
  firstName: "",
  lastName: "",
  email: "",
};

function normalizeRole(role: string | null): UserRole {
  return role === "org_admin" ? "org_admin" : "user";
}

function normalizeStatus(record: UserProfileRecord): UserStatus {
  if (typeof record.is_active === "boolean") {
    return record.is_active ? "active" : "inactive";
  }

  return record.status?.toLowerCase() === "inactive" ? "inactive" : "active";
}

function mapUserRecord(record: UserProfileRecord): UserRow {
  return {
    id: record.id,
    firstName: record.first_name?.trim() ?? "",
    lastName: record.last_name?.trim() ?? "",
    email: record.email ?? "-",
    role: normalizeRole(record.role),
    status: normalizeStatus(record),
    lastLoginAt: record.last_login_at,
  };
}

function formatRole(role: UserRole) {
  return role === "org_admin" ? "Admin" : "User";
}

function formatStatus(status: UserStatus) {
  return status === "active" ? "Active" : "Inactive";
}

function formatLastLogin(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function isValidEmail(email: string) {
  return /^\S+@\S+\.\S+$/.test(email);
}

export default function UsersPage() {
  const supabase = useMemo(() => createClient(), []);
  const { organizationId, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [statusSource, setStatusSource] = useState<StatusSource>("is_active");
  const [toast, setToast] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState<InviteModalState>(INITIAL_INVITE_STATE);

  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditModalState | null>(null);

  const [statusChangeUser, setStatusChangeUser] = useState<UserRow | null>(null);
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  const isOrgAdmin = userRole === "org_admin";

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const loadUsers = async () => {
    setLoading(true);
    setPageError(null);

    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, first_name, last_name, email, role, is_active, last_login_at")
      .order("first_name", { ascending: true });

    if (error) {
      const fallback = await supabase
        .from("user_profiles")
        .select("id, first_name, last_name, email, role, status, last_login_at")
        .order("first_name", { ascending: true });

      if (fallback.error) {
        setPageError("Failed to load users.");
        setUsers([]);
        setLoading(false);
        return;
      }

      const mappedFallback = ((fallback.data as UserProfileRecord[] | null) ?? []).map(mapUserRecord);
      setUsers(mappedFallback);
      setStatusSource("status");
      setLoading(false);
      return;
    }

    const mapped = ((data as UserProfileRecord[] | null) ?? []).map(mapUserRecord);
    setUsers(mapped);
    setStatusSource("is_active");
    setLoading(false);
  };

  useEffect(() => {
    void loadUsers();
  }, [supabase]);

  const closeInviteModal = () => {
    setInviteOpen(false);
    setInviteError(null);
    setInviteForm(INITIAL_INVITE_STATE);
  };

  const openEditModal = (user: UserRow) => {
    setEditUser(user);
    setEditError(null);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
    });
  };

  const closeEditModal = () => {
    setEditUser(null);
    setEditError(null);
    setEditForm(null);
  };

  const submitInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const firstName = inviteForm.firstName.trim();
    const lastName = inviteForm.lastName.trim();
    const email = inviteForm.email.trim().toLowerCase();

    if (!firstName || !lastName || !email) {
      setInviteError("All fields are required.");
      return;
    }

    if (!isValidEmail(email)) {
      setInviteError("Enter a valid email address.");
      return;
    }

    if (!organizationId) {
      setInviteError("Organization not found for your account.");
      return;
    }

    setInviteSubmitting(true);
    setInviteError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const { error } = await supabase.functions.invoke("invite-user", {
      body: {
        email,
        firstName,
        lastName,
        organizationId,
      },
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
    });

    if (error) {
      setInviteError(error.message || "Failed to invite user.");
      setInviteSubmitting(false);
      return;
    }

    setInviteSubmitting(false);
    closeInviteModal();
    setToast("Invitation sent successfully.");
    await loadUsers();
  };

  const saveUserEdits = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editUser || !editForm) return;

    const firstName = editForm.firstName.trim();
    const lastName = editForm.lastName.trim();

    if (!firstName || !lastName) {
      setEditError("First name and last name are required.");
      return;
    }

    setEditSubmitting(true);
    setEditError(null);

    const payload: Record<string, string | boolean> = {
      first_name: firstName,
      last_name: lastName,
      role: editForm.role,
    };

    if (statusSource === "is_active") {
      payload.is_active = editForm.status === "active";
    } else {
      payload.status = editForm.status;
    }

    const { error } = await supabase.from("user_profiles").update(payload).eq("id", editUser.id);

    if (error) {
      setEditError("Failed to update user.");
      setEditSubmitting(false);
      return;
    }

    setUsers((previous) =>
      previous.map((user) =>
        user.id === editUser.id
          ? {
              ...user,
              firstName,
              lastName,
              role: editForm.role,
              status: editForm.status,
            }
          : user,
      ),
    );

    setEditSubmitting(false);
    closeEditModal();
    setToast("User updated.");
  };

  const confirmStatusChange = async () => {
    if (!statusChangeUser) return;

    const nextStatus: UserStatus = statusChangeUser.status === "active" ? "inactive" : "active";
    setStatusSubmitting(true);

    const payload: Record<string, string | boolean> =
      statusSource === "is_active"
        ? { is_active: nextStatus === "active" }
        : { status: nextStatus };

    const { error } = await supabase.from("user_profiles").update(payload).eq("id", statusChangeUser.id);

    if (error) {
      setToast("Failed to update user status.");
      setStatusSubmitting(false);
      setStatusChangeUser(null);
      return;
    }

    setUsers((previous) =>
      previous.map((user) =>
        user.id === statusChangeUser.id
          ? {
              ...user,
              status: nextStatus,
            }
          : user,
      ),
    );

    setStatusSubmitting(false);
    setStatusChangeUser(null);
    setToast(nextStatus === "active" ? "User activated." : "User deactivated.");
  };

  return (
    <DashboardLayout pageTitle="Users">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        {toast ? (
          <div className="rounded-md border border-snap-border bg-snap-surface px-4 py-3 text-sm text-snap-textMain">
            {toast}
          </div>
        ) : null}

        <PageHeader
          title="Users"
          action={
            isOrgAdmin ? (
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="rounded-md border border-snap-border bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain hover:bg-snap-bg"
              >
                + Invite User
              </button>
            ) : null
          }
        />

        {loading ? (
          <div className="rounded-lg border border-snap-border bg-snap-surface p-6 text-sm text-snap-textDim">
            Loading users...
          </div>
        ) : pageError ? (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-300">{pageError}</div>
        ) : users.length === 0 ? (
          <EmptyState
            title="No users yet"
            description="Invite your first team member to start collaborating."
            actionLabel={isOrgAdmin ? "+ Invite User" : undefined}
            onAction={isOrgAdmin ? () => setInviteOpen(true) : undefined}
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-snap-border bg-snap-surface">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-snap-border bg-snap-bg/30 text-xs uppercase tracking-wide text-snap-textDim">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Last login</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "-";
                    const toggleLabel = user.status === "active" ? "Deactivate" : "Activate";

                    return (
                      <tr key={user.id} className="border-b border-snap-border/70 text-sm text-snap-textMain last:border-b-0">
                        <td className="px-4 py-3">{fullName}</td>
                        <td className="px-4 py-3 text-snap-textDim">{user.email}</td>
                        <td className="px-4 py-3">{formatRole(user.role)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={formatStatus(user.status)} variant="user" />
                        </td>
                        <td className="px-4 py-3 text-snap-textDim">{formatLastLogin(user.lastLoginAt)}</td>
                        <td className="px-4 py-3">
                          {isOrgAdmin ? (
                            <div className="flex items-center gap-2 text-sm">
                              <button
                                type="button"
                                onClick={() => openEditModal(user)}
                                className="text-snap-accent hover:underline"
                              >
                                Edit
                              </button>
                              <span className="text-snap-textDim">·</span>
                              <button
                                type="button"
                                onClick={() => setStatusChangeUser(user)}
                                className={
                                  user.status === "active"
                                    ? "text-red-300 hover:text-red-200"
                                    : "text-emerald-300 hover:text-emerald-200"
                                }
                              >
                                {toggleLabel}
                              </button>
                            </div>
                          ) : (
                            <span className="text-snap-textDim">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {inviteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-lg space-y-5 rounded-xl border border-snap-border bg-snap-surface p-8 shadow-2xl">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-snap-textMain">Invite User</h3>
              <p className="text-sm text-snap-textDim">Send an invitation email to join this organization.</p>
            </div>

            <form onSubmit={submitInvite} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-snap-textDim">First name *</label>
                  <input
                    value={inviteForm.firstName}
                    onChange={(event) =>
                      setInviteForm((previous) => ({ ...previous, firstName: event.target.value }))
                    }
                    className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-snap-textDim">Last name *</label>
                  <input
                    value={inviteForm.lastName}
                    onChange={(event) =>
                      setInviteForm((previous) => ({ ...previous, lastName: event.target.value }))
                    }
                    className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-snap-textDim">Email *</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(event) =>
                    setInviteForm((previous) => ({ ...previous, email: event.target.value }))
                  }
                  className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-snap-textDim">Role</label>
                <div className="rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textDim">User</div>
              </div>

              {inviteError ? (
                <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {inviteError}
                </p>
              ) : null}

              <div className="flex items-center justify-end gap-3 border-t border-snap-border pt-5">
                <button
                  type="button"
                  onClick={closeInviteModal}
                  className="rounded-md border border-snap-border px-4 py-2 text-sm text-snap-textMain hover:bg-snap-bg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteSubmitting}
                  className="rounded-md bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain hover:bg-snap-bg disabled:opacity-60"
                >
                  {inviteSubmitting ? "Inviting..." : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editUser && editForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-lg space-y-5 rounded-xl border border-snap-border bg-snap-surface p-8 shadow-2xl">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-snap-textMain">Edit User</h3>
              <p className="text-sm text-snap-textDim">Update profile details, role, and status.</p>
            </div>

            <form onSubmit={saveUserEdits} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-snap-textDim">First name *</label>
                  <input
                    value={editForm.firstName}
                    onChange={(event) =>
                      setEditForm((previous) =>
                        previous ? { ...previous, firstName: event.target.value } : previous,
                      )
                    }
                    className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-snap-textDim">Last name *</label>
                  <input
                    value={editForm.lastName}
                    onChange={(event) =>
                      setEditForm((previous) =>
                        previous ? { ...previous, lastName: event.target.value } : previous,
                      )
                    }
                    className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-snap-textDim">Role</label>
                  <select
                    value={editForm.role}
                    onChange={(event) =>
                      setEditForm((previous) =>
                        previous
                          ? { ...previous, role: event.target.value === "org_admin" ? "org_admin" : "user" }
                          : previous,
                      )
                    }
                    className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
                  >
                    <option value="user">User</option>
                    <option value="org_admin">Admin</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-snap-textDim">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(event) =>
                      setEditForm((previous) =>
                        previous
                          ? {
                              ...previous,
                              status: event.target.value === "inactive" ? "inactive" : "active",
                            }
                          : previous,
                      )
                    }
                    className="w-full rounded-md border border-snap-border bg-snap-bg px-3 py-2 text-sm text-snap-textMain outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {editError ? (
                <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {editError}
                </p>
              ) : null}

              <div className="flex items-center justify-end gap-3 border-t border-snap-border pt-5">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-md border border-snap-border px-4 py-2 text-sm text-snap-textMain hover:bg-snap-bg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="rounded-md bg-snap-card px-4 py-2 text-sm font-medium text-snap-textMain hover:bg-snap-bg disabled:opacity-60"
                >
                  {editSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={Boolean(statusChangeUser)}
        title={statusChangeUser?.status === "active" ? "Deactivate User" : "Activate User"}
        description={
          statusChangeUser?.status === "active"
            ? "This user will no longer be able to access the organization."
            : "This user will regain access to the organization."
        }
        confirmLabel={statusSubmitting ? "Saving..." : statusChangeUser?.status === "active" ? "Deactivate" : "Activate"}
        destructive={statusChangeUser?.status === "active"}
        onCancel={() => {
          if (statusSubmitting) return;
          setStatusChangeUser(null);
        }}
        onConfirm={() => {
          if (statusSubmitting) return;
          void confirmStatusChange();
        }}
      />
    </DashboardLayout>
  );
}
