import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, CircleDashed, Flame, ListChecks, Zap } from "lucide-react";
import { api } from "@/services/api";
import { qk } from "@/services/queryClient";
import type { OverviewStats } from "@/services/types";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

function MetricCard({
  label,
  value,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: number;
  icon: typeof ListChecks;
  iconClass: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-white">{value}</p>
        </div>
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset ring-white/10 ${iconClass}`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  );
}

export default function OverviewPage() {
  const q = useQuery({
    queryKey: qk.overview,
    queryFn: () => api.get<OverviewStats>("/api/overview").then((r) => r.data),
  });

  if (q.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (q.isError) {
    return (
      <Card className="border-rose-500/30 bg-rose-950/20">
        <p className="flex items-center gap-2 text-sm text-rose-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Could not load overview. Refresh or sign in again.
        </p>
      </Card>
    );
  }

  const s = q.data!;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Overview</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Snapshot of work items visible to you — admins see everything; members see assigned items only.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Total items" value={s.total_items} icon={ListChecks} iconClass="bg-accent-600/25 text-accent-300" />
        <MetricCard label="Pending" value={s.pending_count} icon={CircleDashed} iconClass="bg-zinc-600/25 text-zinc-300" />
        <MetricCard label="Active" value={s.active_count} icon={Zap} iconClass="bg-amber-600/25 text-amber-200" />
        <MetricCard label="Done" value={s.done_count} icon={CheckCircle2} iconClass="bg-emerald-600/25 text-emerald-200" />
        <MetricCard label="Overdue" value={s.overdue_count} icon={AlertTriangle} iconClass="bg-rose-600/25 text-rose-200" />
        <MetricCard label="High priority" value={s.high_priority_count} icon={Flame} iconClass="bg-orange-600/25 text-orange-200" />
      </div>
    </div>
  );
}
