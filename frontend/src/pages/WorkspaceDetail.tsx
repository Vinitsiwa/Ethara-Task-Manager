import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ChevronRight,
  ClipboardList,
  Pencil,
  Plus,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "@/services/api";
import { qk } from "@/services/queryClient";
import { useAuth } from "@/services/authContext";
import type {
  Collaborator,
  ItemPriority,
  ItemStatus,
  User,
  WorkItem,
  Workspace,
} from "@/services/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?"
  );
}

export default function WorkspaceDetailPage() {
  const { id } = useParams();
  const workspaceId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const qc = useQueryClient();

  const workspaceQ = useQuery({
    queryKey: qk.workspace(workspaceId),
    queryFn: () => api.get<Workspace>(`/api/workspaces/${workspaceId}`).then((r) => r.data),
    enabled: Number.isFinite(workspaceId),
  });

  const collaboratorsQ = useQuery({
    queryKey: qk.collaborators(workspaceId),
    queryFn: () =>
      api.get<Collaborator[]>(`/api/workspaces/${workspaceId}/collaborators`).then((r) => r.data),
    enabled: Number.isFinite(workspaceId),
  });

  const usersQ = useQuery({
    queryKey: qk.users,
    queryFn: () => api.get<User[]>("/api/users").then((r) => r.data),
    enabled: isAdmin && Number.isFinite(workspaceId),
  });

  const workItemsQ = useQuery({
    queryKey: qk.workItems,
    queryFn: () => api.get<WorkItem[]>("/api/work-items").then((r) => r.data),
    enabled: Number.isFinite(workspaceId),
  });

  const collaborators = collaboratorsQ.data ?? [];
  const collaboratorIds = useMemo(
    () => new Set(collaborators.map((c) => c.user_id)),
    [collaborators]
  );
  const inviteCandidates = useMemo(
    () => (usersQ.data ?? []).filter((u) => !collaboratorIds.has(u.id)),
    [usersQ.data, collaboratorIds]
  );

  const workItems = useMemo(
    () => (workItemsQ.data ?? []).filter((item) => item.workspace_id === workspaceId),
    [workItemsQ.data, workspaceId]
  );

  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [inviteUserId, setInviteUserId] = useState("");

  const [itemTitle, setItemTitle] = useState("");
  const [itemNotes, setItemNotes] = useState("");
  const [itemAssignee, setItemAssignee] = useState("");
  const [itemDeadline, setItemDeadline] = useState("");
  const [itemStatus, setItemStatus] = useState<ItemStatus>("Pending");
  const [itemPriority, setItemPriority] = useState<ItemPriority>("Medium");

  const [editing, setEditing] = useState<WorkItem | null>(null);
  const [editItemTitle, setEditItemTitle] = useState("");
  const [editItemNotes, setEditItemNotes] = useState("");
  const [editItemStatus, setEditItemStatus] = useState<ItemStatus>("Pending");
  const [editItemPriority, setEditItemPriority] = useState<ItemPriority>("Medium");
  const [editItemAssignee, setEditItemAssignee] = useState("");
  const [editItemDeadline, setEditItemDeadline] = useState("");

  useEffect(() => {
    if (workspaceQ.data) {
      setEditTitle(workspaceQ.data.title);
      setEditSummary(workspaceQ.data.summary || "");
    }
  }, [workspaceQ.data]);

  useEffect(() => {
    if (editing) {
      setEditItemTitle(editing.title);
      setEditItemNotes(editing.notes || "");
      setEditItemStatus(editing.status);
      setEditItemPriority(editing.priority);
      setEditItemAssignee(editing.assignee_id != null ? String(editing.assignee_id) : "");
      setEditItemDeadline(
        editing.deadline ? new Date(editing.deadline).toISOString().slice(0, 16) : ""
      );
    }
  }, [editing]);

  const invalidateAll = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: qk.workspace(workspaceId) }),
      qc.invalidateQueries({ queryKey: qk.collaborators(workspaceId) }),
      qc.invalidateQueries({ queryKey: qk.workItems }),
      qc.invalidateQueries({ queryKey: qk.overview }),
      qc.invalidateQueries({ queryKey: qk.workspaces }),
    ]);
  };

  const saveWorkspaceM = useMutation({
    mutationFn: () =>
      api.put(`/api/workspaces/${workspaceId}`, {
        title: editTitle.trim(),
        summary: editSummary.trim() || null,
      }),
    onSuccess: async () => {
      toast.success("Workspace updated");
      await invalidateAll();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteWorkspaceM = useMutation({
    mutationFn: () => api.delete(`/api/workspaces/${workspaceId}`),
    onSuccess: async () => {
      toast.success("Workspace deleted");
      await qc.invalidateQueries({ queryKey: qk.workspaces });
      navigate("/workspaces");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const inviteCollaboratorM = useMutation({
    mutationFn: (user_id: number) =>
      api.post(`/api/workspaces/${workspaceId}/collaborators`, { user_id }),
    onSuccess: async () => {
      toast.success("Collaborator added");
      setInviteUserId("");
      await invalidateAll();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const removeCollaboratorM = useMutation({
    mutationFn: (user_id: number) =>
      api.delete(`/api/workspaces/${workspaceId}/collaborators/${user_id}`),
    onSuccess: async () => {
      toast.success("Collaborator removed");
      await invalidateAll();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const createWorkItemM = useMutation({
    mutationFn: () =>
      api.post("/api/work-items", {
        title: itemTitle.trim(),
        notes: itemNotes.trim() || null,
        status: itemStatus,
        priority: itemPriority,
        assignee_id: itemAssignee ? Number(itemAssignee) : null,
        workspace_id: workspaceId,
        deadline: itemDeadline ? new Date(itemDeadline).toISOString() : null,
      }),
    onSuccess: async () => {
      toast.success("Work item created");
      setItemTitle("");
      setItemNotes("");
      setItemAssignee("");
      setItemDeadline("");
      setItemStatus("Pending");
      setItemPriority("Medium");
      await invalidateAll();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const statusM = useMutation({
    mutationFn: ({ id: itemId, status }: { id: number; status: ItemStatus }) =>
      api.put(`/api/work-items/${itemId}`, { status }),
    onSuccess: async () => {
      toast.success("Status updated");
      await invalidateAll();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateWorkItemM = useMutation({
    mutationFn: () =>
      api.put(`/api/work-items/${editing!.id}`, {
        title: editItemTitle.trim(),
        notes: editItemNotes.trim() || null,
        status: editItemStatus,
        priority: editItemPriority,
        assignee_id: editItemAssignee ? Number(editItemAssignee) : null,
        deadline: editItemDeadline ? new Date(editItemDeadline).toISOString() : null,
      }),
    onSuccess: async () => {
      toast.success("Work item saved");
      setEditing(null);
      await invalidateAll();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteWorkItemM = useMutation({
    mutationFn: (itemId: number) => api.delete(`/api/work-items/${itemId}`),
    onSuccess: async () => {
      toast.success("Work item deleted");
      setEditing(null);
      await invalidateAll();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (!Number.isFinite(workspaceId)) {
    return <p className="text-sm text-rose-400">Invalid workspace.</p>;
  }

  const loading = workspaceQ.isLoading || collaboratorsQ.isLoading || workItemsQ.isLoading;

  if (workspaceQ.isError) {
    return (
      <Card className="border-rose-500/30 text-sm text-rose-200">
        You cannot view this workspace.
      </Card>
    );
  }

  const workspace = workspaceQ.data;

  return (
    <div className="space-y-8">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-zinc-500">
        <Link to="/workspaces" className="hover:text-accent-400">
          Workspaces
        </Link>
        <ChevronRight className="h-4 w-4 text-zinc-600" />
        <span className="font-medium text-zinc-300">{workspace?.title ?? "…"}</span>
      </nav>

      {loading && !workspace && (
        <div className="space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-24" />
        </div>
      )}

      {workspace && (
        <>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{workspace.title}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Created{" "}
              {new Date(workspace.created_at).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
            <p className="mt-3 max-w-3xl text-zinc-300">{workspace.summary || "No summary yet."}</p>
          </div>

          {isAdmin && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <h2 className="text-lg font-semibold text-white">Workspace settings</h2>
                <form
                  className="mt-4 space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveWorkspaceM.mutate();
                  }}
                >
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Title
                    </label>
                    <input
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Summary
                    </label>
                    <textarea
                      rows={3}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                      value={editSummary}
                      onChange={(e) => setEditSummary(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={saveWorkspaceM.isPending}>
                      Save changes
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      disabled={deleteWorkspaceM.isPending}
                      onClick={() => {
                        if (window.confirm("Delete this workspace and all work items?")) {
                          deleteWorkspaceM.mutate();
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete workspace
                    </Button>
                  </div>
                </form>
              </Card>

              <Card>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                  <Users className="h-5 w-5 text-accent-400" />
                  Collaborators
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Invite people from your organization directory.
                </p>

                <form
                  className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const uid = Number(inviteUserId);
                    if (!Number.isFinite(uid)) {
                      toast.error("Select a collaborator");
                      return;
                    }
                    inviteCollaboratorM.mutate(uid);
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Add collaborator
                    </label>
                    <select
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                      value={inviteUserId}
                      onChange={(e) => setInviteUserId(e.target.value)}
                    >
                      <option value="">Choose user…</option>
                      {inviteCandidates.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email}) — {u.role}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="submit"
                    disabled={inviteCollaboratorM.isPending || !inviteCandidates.length}
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </form>

                <div className="mt-6 space-y-2">
                  {collaborators.map((c) => (
                    <div
                      key={c.membership_id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-600/20 text-xs font-bold text-accent-200 ring-1 ring-accent-500/25">
                          {initials(c.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{c.name}</p>
                          <p className="truncate text-xs text-zinc-500">{c.email}</p>
                        </div>
                        <span className="hidden rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] font-bold uppercase text-zinc-400 sm:inline">
                          {c.role}
                        </span>
                      </div>
                      {isAdmin && c.user_id !== user?.id && (
                        <button
                          type="button"
                          className="shrink-0 rounded-lg p-2 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-300 focus-ring"
                          title="Remove collaborator"
                          onClick={() => {
                            if (window.confirm(`Remove ${c.name} from this workspace?`)) {
                              removeCollaboratorM.mutate(c.user_id);
                            }
                          }}
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {collaborators.length === 0 && (
                    <p className="text-sm text-zinc-500">No collaborators listed.</p>
                  )}
                </div>
              </Card>

              <Card className="lg:col-span-2">
                <h2 className="text-lg font-semibold text-white">Create work item</h2>
                <form
                  className="mt-4 grid gap-4 sm:grid-cols-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    createWorkItemM.mutate();
                  }}
                >
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Title
                    </label>
                    <input
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                      value={itemTitle}
                      onChange={(e) => setItemTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Notes
                    </label>
                    <textarea
                      rows={2}
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                      value={itemNotes}
                      onChange={(e) => setItemNotes(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Assign to
                    </label>
                    <select
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                      value={itemAssignee}
                      onChange={(e) => setItemAssignee(e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {collaborators.map((c) => (
                        <option key={c.user_id} value={c.user_id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Deadline
                    </label>
                    <input
                      type="datetime-local"
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                      value={itemDeadline}
                      onChange={(e) => setItemDeadline(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Status
                    </label>
                    <select
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                      value={itemStatus}
                      onChange={(e) => setItemStatus(e.target.value as ItemStatus)}
                    >
                      <option>Pending</option>
                      <option>Active</option>
                      <option>Done</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Priority
                    </label>
                    <select
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                      value={itemPriority}
                      onChange={(e) => setItemPriority(e.target.value as ItemPriority)}
                    >
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="submit" disabled={createWorkItemM.isPending}>
                      <Plus className="h-4 w-4" />
                      Create work item
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          )}

          <Card padding={false} className="overflow-hidden">
            <div className="border-b border-zinc-800 px-5 py-4">
              <h2 className="text-lg font-semibold text-white">Work items</h2>
              <p className="text-sm text-zinc-500">
                {isAdmin
                  ? "All work items in this workspace."
                  : "Work items assigned to you in this workspace."}
              </p>
            </div>
            {workItems.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={ClipboardList}
                  title="No work items yet"
                  description={
                    isAdmin
                      ? "Create the first work item above."
                      : "You have no assigned work items here."
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="border-b border-zinc-800 bg-zinc-900/80">
                    <tr>
                      <th className="px-5 py-3 font-semibold text-zinc-400">Item</th>
                      <th className="px-5 py-3 font-semibold text-zinc-400">Status</th>
                      <th className="px-5 py-3 font-semibold text-zinc-400">Priority</th>
                      <th className="px-5 py-3 font-semibold text-zinc-400">Assignee</th>
                      <th className="px-5 py-3 font-semibold text-zinc-400">Deadline</th>
                      <th className="w-40 px-5 py-3 font-semibold text-zinc-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {workItems.map((item) => {
                      const assigneeName = collaborators.find(
                        (c) => c.user_id === item.assignee_id
                      )?.name;
                      return (
                        <tr key={item.id} className="hover:bg-zinc-800/20">
                          <td className="px-5 py-4 font-medium text-white">{item.title}</td>
                          <td className="px-5 py-4">
                            <StatusBadge status={item.status} />
                          </td>
                          <td className="px-5 py-4">
                            <PriorityBadge priority={item.priority} />
                          </td>
                          <td className="px-5 py-4 text-zinc-400">
                            {assigneeName ?? (item.assignee_id ? `#${item.assignee_id}` : "—")}
                          </td>
                          <td className="px-5 py-4 text-zinc-500">
                            {item.deadline
                              ? new Date(item.deadline).toLocaleString()
                              : "—"}
                          </td>
                          <td className="px-5 py-4">
                            {isAdmin && (
                              <div className="flex flex-wrap gap-2">
                                <Button variant="secondary" size="sm" onClick={() => setEditing(item)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                  Edit
                                </Button>
                              </div>
                            )}
                            {!isAdmin && item.assignee_id === user?.id && (
                              <select
                                className="w-full max-w-[180px] rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-white focus-ring"
                                value={item.status}
                                onChange={(e) =>
                                  statusM.mutate({
                                    id: item.id,
                                    status: e.target.value as ItemStatus,
                                  })
                                }
                              >
                                <option>Pending</option>
                                <option>Active</option>
                                <option>Done</option>
                              </select>
                            )}
                            {!isAdmin && item.assignee_id !== user?.id && (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {editing && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setEditing(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white">Edit work item</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Title
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white focus-ring"
                  value={editItemTitle}
                  onChange={(e) => setEditItemTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Notes
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white focus-ring"
                  value={editItemNotes}
                  onChange={(e) => setEditItemNotes(e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Status
                  </label>
                  <select
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white focus-ring"
                    value={editItemStatus}
                    onChange={(e) => setEditItemStatus(e.target.value as ItemStatus)}
                  >
                    <option>Pending</option>
                    <option>Active</option>
                    <option>Done</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Priority
                  </label>
                  <select
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white focus-ring"
                    value={editItemPriority}
                    onChange={(e) => setEditItemPriority(e.target.value as ItemPriority)}
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Assignee
                  </label>
                  <select
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white focus-ring"
                    value={editItemAssignee}
                    onChange={(e) => setEditItemAssignee(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {collaborators.map((c) => (
                      <option key={c.user_id} value={c.user_id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Deadline
                </label>
                <input
                  type="datetime-local"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white focus-ring"
                  value={editItemDeadline}
                  onChange={(e) => setEditItemDeadline(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  if (!editItemTitle.trim()) {
                    toast.error("Title required");
                    return;
                  }
                  updateWorkItemM.mutate();
                }}
                disabled={updateWorkItemM.isPending}
              >
                Save work item
              </Button>
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={deleteWorkItemM.isPending}
                onClick={() => {
                  if (window.confirm("Delete this work item?")) deleteWorkItemM.mutate(editing.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
