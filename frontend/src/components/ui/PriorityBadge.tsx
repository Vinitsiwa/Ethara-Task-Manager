import clsx from "clsx";
import type { ItemPriority } from "@/services/types";

const styles: Record<ItemPriority, string> = {
  Low: "bg-sky-500/15 text-sky-200 ring-sky-500/25",
  Medium: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/25",
  High: "bg-orange-500/15 text-orange-200 ring-orange-500/25",
};

export function PriorityBadge({ priority }: { priority: ItemPriority }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        styles[priority]
      )}
    >
      {priority}
    </span>
  );
}
