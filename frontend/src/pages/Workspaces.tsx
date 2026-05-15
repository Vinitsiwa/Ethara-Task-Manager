import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Briefcase, FolderPlus } from "lucide-react";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "@/services/api";
import { qk } from "@/services/queryClient";
import { useAuth } from "@/services/authContext";
import type { Workspace } from "@/services/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

export default function WorkspacesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");

  const listQ = useQuery({
    queryKey: qk.workspaces,
    queryFn: () => api.get<Workspace[]>("/api/workspaces").then((r) => r.data),
  });

  const createM = useMutation({
    mutationFn: (body: { title: string; summary: string | null }) =>
      api.post<Workspace>("/api/workspaces", body),
    onSuccess: async () => {
      toast.success("Workspace created");
      setTitle("");
      setSummary("");
      await qc.invalidateQueries({ queryKey: qk.workspaces });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Workspaces</h1>
        <p className="mt-1 text-sm text-zinc-400">Group work by initiative and invite collaborators.</p>
      </div>

      {isAdmin && (
        <Card>
          <h2 className="text-lg font-semibold text-white">New workspace</h2>
          <p className="mt-1 text-sm text-zinc-500">You are added as a collaborator automatically.</p>
          <form
            className="mt-5 grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              createM.mutate({ title: title.trim(), summary: summary.trim() || null });
            }}
          >
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">Title</label>
              <input
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Product launch Q3"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">Summary</label>
              <textarea
                rows={3}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Optional context for collaborators"
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={createM.isPending}>
                <FolderPlus className="h-4 w-4" />
                {createM.isPending ? "Creating…" : "Create workspace"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {listQ.isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      )}

      {listQ.isError && (
        <Card className="border-rose-500/30 bg-rose-950/20 text-sm text-rose-200">Failed to load workspaces.</Card>
      )}

      {listQ.isSuccess && listQ.data.length === 0 && (
        <EmptyState
          icon={Briefcase}
          title="No workspaces yet"
          description={
            isAdmin
              ? "Create your first workspace above to start tracking work items."
              : "Ask an admin to add you to a workspace."
          }
        />
      )}

      {listQ.isSuccess && listQ.data.length > 0 && (
        <Card padding={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-900/80">
                <tr>
                  <th className="px-5 py-3 font-semibold text-zinc-400">Workspace</th>
                  <th className="px-5 py-3 font-semibold text-zinc-400">Summary</th>
                  <th className="w-28 px-5 py-3 font-semibold text-zinc-400" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {listQ.data.map((w) => (
                  <tr key={w.id} className="transition hover:bg-zinc-800/30">
                    <td className="px-5 py-4 font-medium text-white">{w.title}</td>
                    <td className="max-w-md truncate px-5 py-4 text-zinc-400">{w.summary || "—"}</td>
                    <td className="px-5 py-4">
                      <Link
                        to={`/workspaces/${w.id}`}
                        className="font-medium text-accent-400 hover:text-accent-300"
                      >
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
