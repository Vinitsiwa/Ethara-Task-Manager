import { NavLink } from "react-router-dom";
import { FolderKanban, LayoutDashboard, ListTodo, Users, X } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/services/authContext";

const baseLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/tasks", label: "Tasks", icon: ListTodo },
];

const adminLinks = [
  { to: "/team", label: "Team", icon: Users },
];

export default function Sidebar({ mobileOpen, onCloseMobile }: { mobileOpen?: boolean; onCloseMobile?: () => void }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const links = isAdmin ? [...baseLinks, ...adminLinks] : baseLinks;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    clsx(
      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
      isActive
        ? "bg-brand-600/15 text-brand-200 ring-1 ring-brand-500/30"
        : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
    );

  const nav = (
    <nav className="space-y-1 p-3">
      <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Workspace</p>
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className={linkClass} onClick={() => onCloseMobile?.()}>
          <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <>
      <aside className="hidden w-56 shrink-0 border-r border-slate-800/80 bg-slate-950/50 md:block">{nav}</aside>

      {/* Mobile overlay */}
      <div
        className={clsx(
          "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden={!mobileOpen}
        onClick={() => onCloseMobile?.()}
      />
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r border-slate-800 bg-slate-950 shadow-2xl transition-transform duration-200 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-3 py-3">
          <span className="text-sm font-semibold text-white">Menu</span>
          <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white focus-ring" onClick={() => onCloseMobile?.()}>
            <X className="h-5 w-5" />
          </button>
        </div>
        {nav}
      </aside>
    </>
  );
}
