import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronRight, FolderKanban, Pencil, Plus, Trash2, UserMinus } from "lucide-react";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "@/services/api";
import { qk } from "@/services/queryClient";
import { useAuth } from "@/services/authContext";
import type { Project, ProjectMemberDetail, Task, TaskStatus, User } from "@/services/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Select } from "@/components/ui/Select";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import clsx from "clsx";

const STATUS_OPTIONS = [
  { value: "Todo", label: "Todo" },
  { value: "In Progress", label: "In Progress" },
  { value: "Completed", label: "Completed" },
];

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const pid = Number(id);
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const qc = useQueryClient();
  const navigate = useNavigate();
  const confirm = useConfirm();

  // ── Queries ──────────────────────────────────────────────────────────
  const projectQ = useQuery({ queryKey: qk.project(pid), queryFn: () => api.get<Project>(`/api/projects/${pid}`).then((r) => r.data) });
  const membersQ = useQuery({ queryKey: qk.projectMembers(pid), queryFn: () => api.get<ProjectMemberDetail[]>(`/api/projects/${pid}/members`).then((r) => r.data) });
  const tasksQ = useQuery({ queryKey: qk.tasks, queryFn: () => api.get<Task[]>("/api/tasks").then((r) => r.data) });
  const usersQ = useQuery({ queryKey: qk.users, queryFn: () => api.get<User[]>("/api/users").then((r) => r.data), enabled: isAdmin });

  const project = projectQ.data;
  const members = membersQ.data ?? [];
  const tasks = (tasksQ.data ?? []).filter((t) => t.project_id === pid);
  const allUsers = usersQ.data ?? [];

  // ── Edit project ──────────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editErrors, setEditErrors] = useState<{ name?: string }>({});

  const openEdit = () => {
    setEditName(project?.name ?? "");
    setEditDesc(project?.description ?? "");
    setEditErrors({});
    setEditOpen(true);
  };

  const editM = useMutation({
    mutationFn: () => api.put(`/api/projects/${pid}`, { name: editName.trim(), description: editDesc.trim() || null }),
    onSuccess: async () => {
      toast.success("Project updated");
      setEditOpen(false);
      await qc.invalidateQueries({ queryKey: qk.project(pid) });
      await qc.invalidateQueries({ queryKey: qk.projects });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const validateEdit = () => {
    if (!editName.trim()) { setEditErrors({ name: "Name is required" }); return false; }
    setEditErrors({});
    return true;
  };

  // ── Delete project ────────────────────────────────────────────────────
  const deleteProjectM = useMutation({
    mutationFn: () => api.delete(`/api/projects/${pid}`),
    onSuccess: async () => {
      toast.success("Project deleted");
      await qc.invalidateQueries({ queryKey: qk.projects });
      navigate("/projects");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handleDeleteProject = async () => {
    const ok = await confirm({ title: "Delete project", description: `Delete "${project?.name}"? All tasks will be removed. This cannot be undone.`, confirmLabel: "Delete project", tone: "danger" });
    if (ok) deleteProjectM.mutate();
  };

  // ── Members ───────────────────────────────────────────────────────────
  const addableUsers = allUsers.filter((u) => !members.some((m) => m.user_id === u.id));
  const addableOptions = addableUsers
    .map((u) => ({ value: String(u.id), label: u.name, description: u.email }));

  const addMemberM = useMutation({
    mutationFn: (userId: number) => api.post(`/api/projects/${pid}/members`, { user_id: userId }),
    onSuccess: async () => { toast.success("Member added"); await qc.invalidateQueries({ queryKey: qk.projectMembers(pid) }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const removeMemberM = useMutation({
    mutationFn: (userId: number) => api.delete(`/api/projects/${pid}/members/${userId}`),
    onSuccess: async () => { toast.success("Member removed"); await qc.invalidateQueries({ queryKey: qk.projectMembers(pid) }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // ── Create task ───────────────────────────────────────────────────────
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskStatus, setTaskStatus] = useState<TaskStatus>("Todo");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskDue, setTaskDue] = useState<Date | null>(null);
  const [taskErrors, setTaskErrors] = useState<{ title?: string }>({});

  const memberOptions = members.map((m) => ({ value: String(m.user_id), label: m.name, description: m.email }));

  const validateTask = () => {
    if (!taskTitle.trim()) { setTaskErrors({ title: "Task title is required" }); return false; }
    setTaskErrors({});
    return true;
  };

  const createTaskM = useMutation({
    mutationFn: () => api.post("/api/tasks", {
      title: taskTitle.trim(), description: taskDesc.trim() || null,
      status: taskStatus, assigned_to: taskAssignee ? Number(taskAssignee) : null,
      project_id: pid, due_date: taskDue ? taskDue.toISOString() : null,
    }),
    onSuccess: async () => {
      toast.success("Task created");
      setTaskTitle(""); setTaskDesc(""); setTaskAssignee(""); setTaskDue(null); setTaskStatus("Todo");
      await qc.invalidateQueries({ queryKey: qk.tasks });
      await qc.invalidateQueries({ queryKey: qk.dashboard });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // ── Task edit (admin) ─────────────────────────────────────────────────
  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [etTitle, setEtTitle] = useState("");
  const [etDesc, setEtDesc] = useState("");
  const [etStatus, setEtStatus] = useState<TaskStatus>("Todo");
  const [etAssignee, setEtAssignee] = useState("");
  const [etDue, setEtDue] = useState<Date | null>(null);
  const [etErrors, setEtErrors] = useState<{ title?: string }>({});

  const openEditTask = (t: Task) => {
    setEditingTask(t);
    setEtTitle(t.title); setEtDesc(t.description ?? ""); setEtStatus(t.status);
    setEtAssignee(t.assigned_to ? String(t.assigned_to) : ""); setEtDue(t.due_date ? new Date(t.due_date) : null);
    setEtErrors({});
    setEditTaskOpen(true);
  };

  const updateTaskM = useMutation({
    mutationFn: () => api.put(`/api/tasks/${editingTask!.id}`, {
      title: etTitle.trim(), description: etDesc.trim() || null,
      status: etStatus, assigned_to: etAssignee ? Number(etAssignee) : null,
      project_id: pid, due_date: etDue ? etDue.toISOString() : null,
    }),
    onSuccess: async () => {
      toast.success("Task updated");
      setEditTaskOpen(false);
      await qc.invalidateQueries({ queryKey: qk.tasks });
      await qc.invalidateQueries({ queryKey: qk.dashboard });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteTaskM = useMutation({
    mutationFn: (taskId: number) => api.delete(`/api/tasks/${taskId}`),
    onSuccess: async () => {
      toast.success("Task deleted");
      await qc.invalidateQueries({ queryKey: qk.tasks });
      await qc.invalidateQueries({ queryKey: qk.dashboard });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const statusM = useMutation({
    mutationFn: ({ id, status: s }: { id: number; status: TaskStatus }) => api.put(`/api/tasks/${id}`, { status: s }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: qk.tasks }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handleDeleteTask = async (t: Task) => {
    const ok = await confirm({ title: "Delete task", description: `Delete "${t.title}"?`, confirmLabel: "Delete", tone: "danger" });
    if (ok) deleteTaskM.mutate(t.id);
  };

  if (projectQ.isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (projectQ.isError || !project) {
    return <Card className="border-rose-500/30 bg-rose-950/20 text-sm text-rose-200">Project not found or access denied.</Card>;
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link to="/projects" className="hover:text-slate-200 transition">Projects</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-slate-200">{project.name}</span>
      </nav>

      <div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
            {project.description && <p className="mt-1 text-sm text-slate-400">{project.description}</p>}
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={openEdit}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
              <Button variant="danger" size="sm" onClick={handleDeleteProject}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
            </div>
          )}
        </div>
      </div>

      {/* Team Section (Admin) */}
      {isAdmin && (
        <Card>
          <h2 className="text-lg font-semibold text-white">Team</h2>
          <p className="mt-1 text-sm text-slate-500">Add users to this project so they can be assigned tasks.</p>
          {addableOptions.length > 0 && (
            <div className="mt-4 flex gap-3">
              <div className="flex-1">
                <Select
                  options={addableOptions}
                  value=""
                  onChange={(v) => addMemberM.mutate(Number(v))}
                  placeholder="Add user to project…"
                  searchable
                />
              </div>
            </div>
          )}
          <div className="mt-4 space-y-2">
            {members.length === 0 && <p className="text-sm text-slate-500">No members yet.</p>}
            {members.map((m) => (
              <div key={m.user_id} className="flex items-center justify-between rounded-xl bg-slate-800/40 px-4 py-3 ring-1 ring-slate-700/50">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600/20 text-xs font-bold text-brand-300 ring-1 ring-brand-500/30">
                    {initials(m.name)}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">{m.name}</p>
                    <p className="text-xs text-slate-500">{m.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={clsx(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                    m.role === "Admin" ? "bg-brand-600/20 text-brand-300" : "bg-slate-700 text-slate-400"
                  )}>{m.role}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeMemberM.mutate(m.user_id)}>
                    <UserMinus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Create Task */}
      {isAdmin && (
        <Card>
          <h2 className="text-lg font-semibold text-white">New task</h2>
          <form
            className="mt-5 grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => { e.preventDefault(); if (validateTask()) createTaskM.mutate(); }}
            noValidate
          >
            <div className="sm:col-span-2">
              <label className="label-base">Title</label>
              <input
                className={`input-base${taskErrors.title ? " input-error" : ""}`}
                value={taskTitle}
                onChange={(e) => { setTaskTitle(e.target.value); if (taskErrors.title) setTaskErrors({}); }}
                placeholder="Task name"
              />
              {taskErrors.title && <p className="error-text">! {taskErrors.title}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="label-base">Description</label>
              <textarea rows={2} className="input-base" value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} />
            </div>
            <div>
              <label className="label-base">Status</label>
              <Select options={STATUS_OPTIONS} value={taskStatus} onChange={(v) => setTaskStatus(v as TaskStatus)} />
            </div>
            <div>
              <label className="label-base">Assignee</label>
              <Select
                options={memberOptions}
                value={taskAssignee}
                onChange={setTaskAssignee}
                placeholder="Select member…"
                searchable
              />
            </div>
            <div>
              <label className="label-base">Due date</label>
              <DateTimePicker value={taskDue} onChange={setTaskDue} placeholder="No deadline" />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={createTaskM.isPending}>
                <Plus className="h-4 w-4" />
                {createTaskM.isPending ? "Creating…" : "Add task"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tasks list */}
      <Card padding={false} className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
          <h2 className="font-semibold text-white">Tasks ({tasks.length})</h2>
        </div>
        {tasksQ.isLoading ? (
          <div className="space-y-2 p-4"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
        ) : tasks.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={FolderKanban} title="No tasks" description={isAdmin ? "Create the first task above." : "No tasks are assigned to you in this project."} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-slate-900/80">
                <tr>
                  <th className="px-5 py-3 font-semibold text-slate-400">Task</th>
                  <th className="px-5 py-3 font-semibold text-slate-400">Assignee</th>
                  <th className="px-5 py-3 font-semibold text-slate-400">Status</th>
                  <th className="px-5 py-3 font-semibold text-slate-400">Due</th>
                  <th className="w-32 px-5 py-3 font-semibold text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {tasks.map((t) => {
                  const assigneeName = members.find((m) => m.user_id === t.assigned_to)?.name ?? (t.assigned_to ? `#${t.assigned_to}` : "Unassigned");
                  return (
                    <tr key={t.id} className="transition hover:bg-slate-800/30">
                      <td className="px-5 py-3.5 font-medium text-white">{t.title}</td>
                      <td className="px-5 py-3.5 text-slate-400">{assigneeName}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={t.status} /></td>
                      <td className="px-5 py-3.5 text-slate-500">{t.due_date ? new Date(t.due_date).toLocaleDateString() : "—"}</td>
                      <td className="px-5 py-3.5">
                        {isAdmin && (
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEditTask(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="danger" size="sm" onClick={() => handleDeleteTask(t)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        )}
                        {!isAdmin && t.assigned_to === user?.id && (
                          <Select options={STATUS_OPTIONS} value={t.status} onChange={(v) => statusM.mutate({ id: t.id, status: v as TaskStatus })} className="w-36" />
                        )}
                        {!isAdmin && t.assigned_to !== user?.id && <span className="text-slate-600">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit Project Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit project">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (validateEdit()) editM.mutate(); }} noValidate>
          <div>
            <label className="label-base">Name</label>
            <input className={`input-base${editErrors.name ? " input-error" : ""}`} value={editName} onChange={(e) => { setEditName(e.target.value); if (editErrors.name) setEditErrors({}); }} />
            {editErrors.name && <p className="error-text">! {editErrors.name}</p>}
          </div>
          <div>
            <label className="label-base">Description</label>
            <textarea rows={3} className="input-base" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
          </div>
        </form>
        <div slot="footer" className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button onClick={() => { if (validateEdit()) editM.mutate(); }} disabled={editM.isPending}>{editM.isPending ? "Saving…" : "Save changes"}</Button>
        </div>
      </Modal>

      {/* Edit Task Modal */}
      <Modal open={editTaskOpen} onClose={() => setEditTaskOpen(false)} title="Edit task" size="lg">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label-base">Title</label>
            <input className={`input-base${etErrors.title ? " input-error" : ""}`} value={etTitle} onChange={(e) => { setEtTitle(e.target.value); if (etErrors.title) setEtErrors({}); }} />
            {etErrors.title && <p className="error-text">! {etErrors.title}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="label-base">Description</label>
            <textarea rows={3} className="input-base" value={etDesc} onChange={(e) => setEtDesc(e.target.value)} />
          </div>
          <div>
            <label className="label-base">Status</label>
            <Select options={STATUS_OPTIONS} value={etStatus} onChange={(v) => setEtStatus(v as TaskStatus)} />
          </div>
          <div>
            <label className="label-base">Assignee</label>
            <Select options={memberOptions} value={etAssignee} onChange={setEtAssignee} placeholder="No assignee" searchable />
          </div>
          <div>
            <label className="label-base">Due date</label>
            <DateTimePicker value={etDue} onChange={setEtDue} placeholder="No deadline" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={() => setEditTaskOpen(false)}>Cancel</Button>
          <Button onClick={() => { if (!etTitle.trim()) { setEtErrors({ title: "Title required" }); return; } updateTaskM.mutate(); }} disabled={updateTaskM.isPending}>
            {updateTaskM.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
