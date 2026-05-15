import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Hexagon, LogOut, Menu, Settings, User, Users } from "lucide-react";
import { useAuth } from "@/services/authContext";
import { useClickOutside } from "./ui/hooks";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
}

export default function Navbar({ onOpenMobile }: { onOpenMobile?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  useClickOutside(dropRef, () => setDropOpen(false));

  const handleLogout = () => {
    setDropOpen(false);
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        {/* Left */}
        <div className="flex items-center gap-2">
          {onOpenMobile && (
            <button
              type="button"
              className="inline-flex rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden focus-ring"
              aria-label="Open menu"
              onClick={onOpenMobile}
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600/20 text-brand-400 ring-1 ring-brand-500/30">
              <Hexagon className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline">
              <span className="text-gradient">Vinit</span>
              <span className="text-slate-400"> Task Hub</span>
            </span>
          </Link>
        </div>

        {/* Right — profile dropdown */}
        {user && (
          <div className="relative" ref={dropRef}>
            <button
              type="button"
              onClick={() => setDropOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full bg-slate-800/60 pl-2 pr-3 py-1.5 text-xs ring-1 ring-slate-700/80 hover:ring-brand-500/40 transition focus-ring"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600/20 text-[10px] font-bold text-brand-300 ring-1 ring-brand-500/30">
                {initials(user.name)}
              </span>
              <span className="hidden max-w-[120px] truncate font-medium text-slate-200 sm:block">{user.name}</span>
              <span className="hidden rounded-md bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-300 sm:block">
                {user.role}
              </span>
            </button>

            {dropOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 animate-fade-in rounded-2xl border border-slate-700/80 bg-slate-900 py-2 shadow-2xl">
                {/* User info */}
                <div className="px-4 py-3 border-b border-slate-800">
                  <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  <span className="mt-1.5 inline-block rounded-md bg-brand-600/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-300">
                    {user.role}
                  </span>
                </div>
                {/* Links */}
                <div className="py-1">
                  <Link
                    to="/profile"
                    onClick={() => setDropOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition"
                  >
                    <User className="h-4 w-4 shrink-0 text-slate-500" />
                    My Profile
                  </Link>
                  {user.role === "Admin" && (
                    <Link
                      to="/team"
                      onClick={() => setDropOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition"
                    >
                      <Users className="h-4 w-4 shrink-0 text-slate-500" />
                      Manage Team
                    </Link>
                  )}
                  <Link
                    to="/profile"
                    onClick={() => setDropOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition"
                  >
                    <Settings className="h-4 w-4 shrink-0 text-slate-500" />
                    Settings
                  </Link>
                </div>
                <div className="border-t border-slate-800 py-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-rose-300 hover:bg-rose-500/10 transition"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
