import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, Users } from "lucide-react";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "@/services/api";
import { qk } from "@/services/queryClient";
import { useAuth } from "@/services/authContext";
import type { User, UserRole } from "@/services/types";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Select } from "@/components/ui/Select";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import clsx from "clsx";

const ROLE_OPTIONS = [
  { value: "Admin", label: "Admin" },
  { value: "Member", label: "Member" },
];

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
}

export default function TeamPage() {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const confirm = useConfirm();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const usersQ = useQuery({
    queryKey: qk.users,
    queryFn: () => api.get<User[]>("/api/users").then((r) => r.data),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: UserRole }) =>
      api.patch(`/api/users/${id}/role`, { role }),
    onSuccess: async () => {
      toast.success("Role updated");
      await qc.invalidateQueries({ queryKey: qk.users });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (me?.role !== "Admin") {
    return (
      <Card className="border-rose-500/30 bg-rose-950/20">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 shrink-0 text-rose-300" />
          <p className="text-sm text-rose-200">Admin access required to view this page.</p>
        </div>
      </Card>
    );
  }

  const users = usersQ.data ?? [];
  const adminCount = users.filter((u) => u.role === "Admin").length;

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = !search || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleRoleChange = async (target: User, newRole: UserRole) => {
    if (target.id === me?.id) { toast.error("You cannot change your own role"); return; }
    const ok = await confirm({
      title: `Change role`,
      description: `Change ${target.name}'s role from ${target.role} to ${newRole}?`,
      confirmLabel: newRole === "Member" ? "Demote" : "Promote",
      tone: newRole === "Member" ? "danger" : "primary",
    });
    if (!ok) return;
    roleMutation.mutate({ id: target.id, role: newRole });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Team</h1>
        <p className="mt-1 text-sm text-slate-400">Manage members and roles.</p>
      </div>

      {/* Stats */}
      <p className="text-sm text-slate-500">
        <span className="font-medium text-slate-300">{adminCount}</span> admin{adminCount !== 1 ? "s" : ""}{" "}
        <span className="text-slate-600">•</span>{" "}
        <span className="font-medium text-slate-300">{users.length}</span> total
      </p>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <input
            className="input-base w-56"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-40">
          <Select
            options={[{ value: "", label: "All roles" }, ...ROLE_OPTIONS]}
            value={roleFilter}
            onChange={setRoleFilter}
            placeholder="All roles"
          />
        </div>
      </div>

      {usersQ.isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      )}

      {usersQ.isError && (
        <Card className="border-rose-500/30 bg-rose-950/20 text-sm text-rose-200">Failed to load users.</Card>
      )}

      {!usersQ.isLoading && filtered.length === 0 && (
        <EmptyState icon={Users} title="No users found" description="Adjust the search or role filter." />
      )}

      {!usersQ.isLoading && filtered.length > 0 && (
        <Card padding={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-900/80">
                <tr>
                  <th className="px-5 py-3 font-semibold text-slate-400">User</th>
                  <th className="px-5 py-3 font-semibold text-slate-400">Current role</th>
                  <th className="px-5 py-3 font-semibold text-slate-400">Change role</th>
                  <th className="px-5 py-3 font-semibold text-slate-400">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filtered.map((u) => (
                  <tr key={u.id} className="transition hover:bg-slate-800/30">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600/20 text-xs font-bold text-brand-300 ring-1 ring-brand-500/30">
                          {initials(u.name)}
                        </span>
                        <div>
                          <p className="font-medium text-white">{u.name} {u.id === me?.id && <span className="ml-1 text-[10px] text-slate-500">(you)</span>}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={clsx(
                        "rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide",
                        u.role === "Admin" ? "bg-brand-600/20 text-brand-300 ring-1 ring-brand-500/30" : "bg-slate-700 text-slate-400 ring-1 ring-slate-600"
                      )}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {u.id === me?.id ? (
                        <span className="text-xs text-slate-600">Cannot change own role</span>
                      ) : (
                        <div className="w-36">
                          <Select
                            options={ROLE_OPTIONS}
                            value={u.role}
                            onChange={(v) => handleRoleChange(u, v as UserRole)}
                            disabled={roleMutation.isPending}
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {new Date(u.created_at).toLocaleDateString()}
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
