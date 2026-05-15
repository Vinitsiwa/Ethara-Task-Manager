import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ClipboardList, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "@/services/api";
import { qk } from "@/services/queryClient";
import { useAuth } from "@/services/authContext";
import type { Project, Task, TaskStatus } from "@/services/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Select } from "@/components/ui/Select";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { useConfirm } from "@/components/ui/ConfirmDialog";

const STATUS_OPTIONS = [
  { value: "Todo", label: "Todo" },
  { value: "In Progress", label: "In Progress" },
  { value: "Completed", label: "Completed" },
];

export default function TasksPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const qc = useQueryClient();
  const confirm = useConfirm();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [status, setStatus] = useState<TaskStatus>("Todo");
  const [errors, setErrors] = useState<{ title?: string; project?: string }>({});

  const projectsQ = useQuery({ queryKey: qk.projects, queryFn: () => api.get<Project[]>("/api/projects").then((r) => r.data) });
  const tasksQ = useQuery({ queryKey: qk.tasks, queryFn: () => api.get<Task[]>("/api/tasks").then((r) => r.data) });

  const projects = projectsQ.data ?? [];
  const tasks = tasksQ.data ?? [];

  const projectOptions = projects.map((p) => ({ value: String(p.id), label: p.name }));

  const validate = () => {
    const e: typeof errors = {};
    if (!title.trim()) e.title = "Title is required";
    if (!projectId) e.project = "Please select a project";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const createM = useMutation({
    mutationFn: () => api.post("/api/tasks", {
      title: title.trim(),
      description: description.trim() || null,
      status,
      assigned_to: assigneeId ? Number(assigneeId) : null,
      project_id: Number(projectId),
      due_date: dueDate ? dueDate.toISOString() : null,
    }),
    onSuccess: async () => {
      toast.success("Task created");
      setTitle(""); setDescription(""); setAssigneeId(""); setDueDate(null); setStatus("Todo");
      await qc.invalidateQueries({ queryKey: qk.tasks });
      await qc.invalidateQueries({ queryKey: qk.dashboard });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const statusM = useMutation({
    mutationFn: ({ id, status: s }: { id: number; status: TaskStatus }) => api.put(`/api/tasks/${id}`, { status: s }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: qk.tasks }); await qc.invalidateQueries({ queryKey: qk.dashboard }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteM = useMutation({
    mutationFn: (id: number) => api.delete(`/api/tasks/${id}`),
    onSuccess: async () => {
      toast.success("Task deleted");
      await qc.invalidateQueries({ queryKey: qk.tasks });
      await qc.invalidateQueries({ queryKey: qk.dashboard });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handleDelete = async (task: Task) => {
    const ok = await confirm({ title: "Delete task", description: `Delete "${task.title}"? This cannot be undone.`, confirmLabel: "Delete", tone: "danger" });
    if (ok) deleteM.mutate(task.id);
  };

  const loading = tasksQ.isLoading || projectsQ.isLoading;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Tasks</h1>
        <p className="mt-1 text-sm text-slate-400">Create, assign, and track work across all projects.</p>
      </div>

      {isAdmin && (
        <Card>
          <h2 className="text-lg font-semibold text-white">Create task</h2>
          <p className="mt-1 text-sm text-slate-500">Assignees must be project members.</p>
          <form
            className="mt-5 grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => { e.preventDefault(); if (validate()) createM.mutate(); }}
            noValidate
          >
            <div className="sm:col-span-2">
              <label className="label-base">Title</label>
              <input
                className={`input-base${errors.title ? " input-error" : ""}`}
                value={title}
                onChange={(e) => { setTitle(e.target.value); if (errors.title) setErrors((p) => ({ ...p, title: undefined })); }}
                placeholder="Task name"
              />
              {errors.title && <p className="error-text">! {errors.title}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="label-base">Description</label>
              <textarea rows={2} className="input-base" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <label className="label-base">Project</label>
              <Select
                options={projectOptions}
                value={projectId}
                onChange={(v) => { setProjectId(v); if (errors.project) setErrors((p) => ({ ...p, project: undefined })); }}
                placeholder="Select project…"
                searchable
                error={errors.project}
              />
            </div>
            <div>
              <label className="label-base">Status</label>
              <Select options={STATUS_OPTIONS} value={status} onChange={(v) => setStatus(v as TaskStatus)} />
            </div>
            <div>
              <label className="label-base">Assignee (user id)</label>
              <input
                className="input-base"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                placeholder="Optional — must be project member"
              />
            </div>
            <div>
              <label className="label-base">Due date</label>
              <DateTimePicker value={dueDate} onChange={setDueDate} placeholder="No deadline" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={createM.isPending || !projects.length}>
                <Plus className="h-4 w-4" />
                {createM.isPending ? "Creating…" : "Create task"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading && (
        <div className="space-y-3"><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
      )}
      {!loading && tasks.length === 0 && (
        <EmptyState icon={ClipboardList} title="No tasks" description="Tasks assigned to you or all tasks (admin) appear here." />
      )}
      {!loading && tasks.length > 0 && (
        <Card padding={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-900/80">
                <tr>
                  <th className="px-5 py-3 font-semibold text-slate-400">Task</th>
                  <th className="px-5 py-3 font-semibold text-slate-400">Project</th>
                  <th className="px-5 py-3 font-semibold text-slate-400">Status</th>
                  <th className="px-5 py-3 font-semibold text-slate-400">Due</th>
                  <th className="w-36 px-5 py-3 font-semibold text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {tasks.map((t) => {
                  const pname = projects.find((p) => p.id === t.project_id)?.name ?? `#${t.project_id}`;
                  return (
                    <tr key={t.id} className="transition hover:bg-slate-800/30">
                      <td className="px-5 py-4 font-medium text-white">
                        <Link to={`/projects/${t.project_id}`} className="text-brand-400 hover:text-brand-300">{t.title}</Link>
                      </td>
                      <td className="px-5 py-4 text-slate-400">{pname}</td>
                      <td className="px-5 py-4"><StatusBadge status={t.status} /></td>
                      <td className="px-5 py-4 text-slate-500">{t.due_date ? new Date(t.due_date).toLocaleDateString() : "—"}</td>
                      <td className="px-5 py-4">
                        {isAdmin && (
                          <Button variant="danger" size="sm" disabled={deleteM.isPending} onClick={() => handleDelete(t)}>
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </Button>
                        )}
                        {!isAdmin && t.assigned_to === user?.id && (
                          <Select
                            options={STATUS_OPTIONS}
                            value={t.status}
                            onChange={(v) => statusM.mutate({ id: t.id, status: v as TaskStatus })}
                            className="w-40"
                          />
                        )}
                        {!isAdmin && t.assigned_to !== user?.id && <span className="text-slate-600">—</span>}
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
