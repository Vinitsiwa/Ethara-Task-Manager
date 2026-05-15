import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, CircleDashed, ListChecks, Timer } from "lucide-react";
import { api } from "@/services/api";
import { qk } from "@/services/queryClient";
import type { Dashboard } from "@/services/types";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/services/authContext";
import clsx from "clsx";

const stats = (d: Dashboard) => [
  { label: "Total Tasks", value: d.total_tasks, icon: ListChecks, iconClass: "bg-brand-600/25 text-brand-300", shadow: "hover:shadow-[0_4px_20px_-4px_rgba(99,102,241,0.4)]" },
  { label: "Todo", value: d.todo_count, icon: CircleDashed, iconClass: "bg-slate-600/25 text-slate-300", shadow: "hover:shadow-[0_4px_20px_-4px_rgba(100,116,139,0.4)]" },
  { label: "In Progress", value: d.in_progress_count, icon: Timer, iconClass: "bg-amber-600/25 text-amber-200", shadow: "hover:shadow-[0_4px_20px_-4px_rgba(217,119,6,0.4)]" },
  { label: "Completed", value: d.completed_count, icon: CheckCircle2, iconClass: "bg-emerald-600/25 text-emerald-200", shadow: "hover:shadow-[0_4px_20px_-4px_rgba(16,185,129,0.4)]" },
  { label: "Overdue", value: d.overdue_count, icon: AlertTriangle, iconClass: "bg-rose-600/25 text-rose-200", shadow: "hover:shadow-[0_4px_20px_-4px_rgba(239,68,68,0.4)]" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: qk.dashboard,
    queryFn: () => api.get<Dashboard>("/api/dashboard").then((r) => r.data),
  });

  if (q.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  if (q.isError) {
    return (
      <Card className="border-rose-500/30 bg-rose-950/20">
        <p className="flex items-center gap-2 text-sm text-rose-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Could not load dashboard. Refresh or sign in again.
        </p>
      </Card>
    );
  }

  const d = q.data!;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          {user?.role === "Admin"
            ? "Global task counts across all projects."
            : "Counts for tasks assigned to you."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats(d).map(({ label, value, icon: Icon, iconClass, shadow }) => (
          <Card
            key={label}
            className={clsx(
              "group cursor-default transition-all duration-200",
              "hover:-translate-y-0.5 hover:border-slate-700",
              shadow
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-white">{value}</p>
              </div>
              <span className={clsx(
                "flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset ring-white/10 transition-transform group-hover:scale-110",
                iconClass
              )}>
                <Icon className="h-5 w-5" />
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
