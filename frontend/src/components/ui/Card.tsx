import clsx from "clsx";
import type { HTMLAttributes } from "react";

export function Card({
  children, className, padding = true, ...props
}: HTMLAttributes<HTMLDivElement> & { padding?: boolean }) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-slate-800/80 bg-slate-900/50 shadow-panel backdrop-blur-sm",
        padding && "p-5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
