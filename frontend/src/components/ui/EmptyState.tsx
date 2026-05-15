import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon, title, description,
}: { icon: LucideIcon; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700/80 bg-slate-900/40 px-6 py-14 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-slate-400 ring-1 ring-slate-700">
        <Icon className="h-6 w-6" />
      </div>
      <p className="font-semibold text-slate-200">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-400">{description}</p>}
    </div>
  );
}
