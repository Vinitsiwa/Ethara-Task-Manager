import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FolderKanban, FolderPlus } from "lucide-react";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "@/services/api";
import { qk } from "@/services/queryClient";
import { useAuth } from "@/services/authContext";
import type { Project } from "@/services/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import clsx from "clsx";

export default function ProjectsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<{ name?: string }>({});

  const listQ = useQuery({
    queryKey: qk.projects,
    queryFn: () => api.get<Project[]>("/api/projects").then((r) => r.data),
  });

  const validate = () => {
    if (!name.trim()) { setErrors({ name: "Project name is required" }); return false; }
    setErrors({});
    return true;
  };

  const createM = useMutation({
    mutationFn: () => api.post<Project>("/api/projects", { name: name.trim(), description: description.trim() || null }),
    onSuccess: async () => {
      toast.success("Project created");
      setName(""); setDescription("");
      await qc.invalidateQueries({ queryKey: qk.projects });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Projects</h1>
        <p className="mt-1 text-sm text-slate-400">Organise workstreams and track team deliverables.</p>
      </div>

      {isAdmin && (
        <Card>
          <h2 className="text-lg font-semibold text-white">New project</h2>
          <p className="mt-1 text-sm text-slate-500">You are added as a member automatically.</p>
          <form
            className="mt-5 grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => { e.preventDefault(); if (validate()) createM.mutate(); }}
            noValidate
          >
            <div className="sm:col-span-2">
              <label className="label-base">Name</label>
              <input
                className={clsx("input-base", errors.name && "input-error")}
                value={name}
                onChange={(e) => { setName(e.target.value); if (errors.name) setErrors({}); }}
                placeholder="e.g. Website relaunch"
              />
              {errors.name && <p className="error-text">! {errors.name}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="label-base">Description</label>
              <textarea
                rows={3}
                className="input-base"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional context for your team"
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={createM.isPending}>
                <FolderPlus className="h-4 w-4" />
                {createM.isPending ? "Creating…" : "Create project"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {listQ.isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      )}

      {listQ.isError && (
        <Card className="border-rose-500/30 bg-rose-950/20 text-sm text-rose-200">Failed to load projects.</Card>
      )}

      {listQ.isSuccess && listQ.data.length === 0 && (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description={isAdmin ? "Create your first project above." : "Ask an admin to add you to a project."}
        />
      )}

      {listQ.isSuccess && listQ.data.length > 0 && (
        <Card padding={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-900/80">
                <tr>
                  <th className="px-5 py-3 font-semibold text-slate-400">Project</th>
                  <th className="px-5 py-3 font-semibold text-slate-400">Description</th>
                  <th className="w-28 px-5 py-3 font-semibold text-slate-400" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {listQ.data.map((p) => (
                  <tr key={p.id} className="transition hover:bg-slate-800/30">
                    <td className="px-5 py-4 font-medium text-white">{p.name}</td>
                    <td className="max-w-md truncate px-5 py-4 text-slate-400">{p.description || "—"}</td>
                    <td className="px-5 py-4">
                      <Link to={`/projects/${p.id}`} className="font-medium text-brand-400 hover:text-brand-300">
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
