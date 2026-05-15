import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ClipboardList, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "@/services/api";
import { qk } from "@/services/queryClient";
import { useAuth } from "@/services/authContext";
import type { ItemPriority, ItemStatus, Workspace, WorkItem } from "@/services/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { Skeleton } from "@/components/ui/Skeleton";

export default function WorkItemsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<ItemStatus>("Pending");
  const [priority, setPriority] = useState<ItemPriority>("Medium");

  const workspacesQ = useQuery({
    queryKey: qk.workspaces,
    queryFn: () => api.get<Workspace[]>("/api/workspaces").then((r) => r.data),
  });

  const itemsQ = useQuery({
    queryKey: qk.workItems,
    queryFn: () => api.get<WorkItem[]>("/api/work-items").then((r) => r.data),
  });

  const workspaces = workspacesQ.data ?? [];
  const items = itemsQ.data ?? [];

  useEffect(() => {
    if (!workspaceId && workspaces.length) setWorkspaceId(String(workspaces[0].id));
  }, [workspaces, workspaceId]);

  const createM = useMutation({
    mutationFn: () =>
      api.post("/api/work-items", {
        title: title.trim(),
        notes: notes.trim() || null,
        status,
        priority,
        assignee_id: assigneeId ? Number(assigneeId) : null,
        workspace_id: Number(workspaceId),
        deadline: deadline ? new Date(deadline).toISOString() : null,
      }),
    onSuccess: async () => {
      toast.success("Work item created");
      setTitle("");
      setNotes("");
      setAssigneeId("");
      setDeadline("");
      setStatus("Pending");
      setPriority("Medium");
      await qc.invalidateQueries({ queryKey: qk.workItems });
      await qc.invalidateQueries({ queryKey: qk.overview });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const statusM = useMutation({
    mutationFn: ({ id, status: s }: { id: number; status: ItemStatus }) =>
      api.put(`/api/work-items/${id}`, { status: s }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: qk.workItems });
      await qc.invalidateQueries({ queryKey: qk.overview });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteM = useMutation({
    mutationFn: (id: number) => api.delete(`/api/work-items/${id}`),
    onSuccess: async () => {
      toast.success("Work item deleted");
      await qc.invalidateQueries({ queryKey: qk.workItems });
      await qc.invalidateQueries({ queryKey: qk.overview });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const loading = itemsQ.isLoading || workspacesQ.isLoading;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Work items</h1>
        <p className="mt-1 text-sm text-zinc-400">Create, assign, and track deliverables across workspaces.</p>
      </div>

      {isAdmin && (
        <Card>
          <h2 className="text-lg font-semibold text-white">New work item</h2>
          <p className="mt-1 text-sm text-zinc-500">Assignees must be collaborators in the selected workspace.</p>
          <form
            className="mt-5 grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              createM.mutate();
            }}
          >
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">Title</label>
              <input
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">Notes</label>
              <textarea
                rows={2}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">Workspace</label>
              <select
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                required
                disabled={!workspaces.length}
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Assignee (user id)
              </label>
              <input
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">Deadline</label>
              <input
                type="datetime-local"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">Status</label>
              <select
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                value={status}
                onChange={(e) => setStatus(e.target.value as ItemStatus)}
              >
                <option>Pending</option>
                <option>Active</option>
                <option>Done</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">Priority</label>
              <select
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                value={priority}
                onChange={(e) => setPriority(e.target.value as ItemPriority)}
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={createM.isPending || !workspaces.length}>
                <Plus className="h-4 w-4" />
                {createM.isPending ? "Saving…" : "Create work item"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      )}

      {!loading && items.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title="No work items"
          description="Assigned items (members) or all items (admins) appear here."
        />
      )}

      {!loading && items.length > 0 && (
        <Card padding={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-900/80">
                <tr>
                  <th className="px-5 py-3 font-semibold text-zinc-400">Item</th>
                  <th className="px-5 py-3 font-semibold text-zinc-400">Workspace</th>
                  <th className="px-5 py-3 font-semibold text-zinc-400">Status</th>
                  <th className="px-5 py-3 font-semibold text-zinc-400">Priority</th>
                  <th className="px-5 py-3 font-semibold text-zinc-400">Assignee</th>
                  <th className="px-5 py-3 font-semibold text-zinc-400">Deadline</th>
                  <th className="w-36 px-5 py-3 font-semibold text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {items.map((item) => {
                  const wtitle = workspaces.find((w) => w.id === item.workspace_id)?.title ?? `#${item.workspace_id}`;
                  return (
                    <tr key={item.id} className="transition hover:bg-zinc-800/30">
                      <td className="px-5 py-4 font-medium text-white">
                        <Link
                          to={`/workspaces/${item.workspace_id}`}
                          className="text-accent-400 hover:text-accent-300"
                        >
                          {item.title}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-zinc-400">{wtitle}</td>
                      <td className="px-5 py-4">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-5 py-4">
                        <PriorityBadge priority={item.priority} />
                      </td>
                      <td className="px-5 py-4 text-zinc-400">{item.assignee_id ?? "—"}</td>
                      <td className="px-5 py-4 text-zinc-400">
                        {item.deadline ? new Date(item.deadline).toLocaleString() : "—"}
                      </td>
                      <td className="px-5 py-4">
                        {isAdmin && (
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={deleteM.isPending}
                            onClick={() => {
                              if (window.confirm("Delete this work item?")) deleteM.mutate(item.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        )}
                        {!isAdmin && item.assignee_id === user?.id && (
                          <select
                            className="w-full max-w-[160px] rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-white focus-ring"
                            value={item.status}
                            onChange={(e) =>
                              statusM.mutate({ id: item.id, status: e.target.value as ItemStatus })
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
        </Card>
      )}
    </div>
  );
}
