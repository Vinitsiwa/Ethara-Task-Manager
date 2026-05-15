import { Link } from "react-router-dom";
import { Hexagon, LogOut, Menu, User } from "lucide-react";
import { useAuth } from "@/services/authContext";
import { Button } from "./ui/Button";

export default function Navbar({ onOpenMobile }: { onOpenMobile?: () => void }) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-2">
          {onOpenMobile && (
            <button
              type="button"
              className="inline-flex rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white md:hidden focus-ring"
              aria-label="Open menu"
              onClick={onOpenMobile}
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <Link to="/overview" className="flex items-center gap-2 font-semibold text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-600/20 text-accent-400 ring-1 ring-accent-500/30">
              <Hexagon className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline">
              <span className="text-gradient">Vinit</span>
              <span className="text-zinc-400"> Task Hub</span>
            </span>
          </Link>
        </div>
        {user && (
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-full bg-zinc-800/60 px-3 py-1.5 text-xs ring-1 ring-zinc-700/80 sm:flex">
              <User className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
              <span className="max-w-[140px] truncate font-medium text-zinc-200">{user.name}</span>
              <span className="rounded-md bg-zinc-900/80 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-300">
                {user.role}
              </span>
            </div>
            <Button variant="ghost" size="sm" className="!ring-0" onClick={logout}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
