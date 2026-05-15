import clsx from "clsx";
import type { ItemStatus } from "@/services/types";

const styles: Record<ItemStatus, string> = {
  Pending: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/25",
  Active: "bg-amber-500/15 text-amber-200 ring-amber-500/25",
  Done: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/25",
};

export function StatusBadge({ status }: { status: ItemStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        styles[status]
      )}
    >
      {status}
    </span>
  );
}
