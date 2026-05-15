import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "@/services/api";
import { useAuth } from "@/services/authContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import clsx from "clsx";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
}

function getStrength(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"];
const strengthColors = ["", "bg-rose-500", "bg-orange-500", "bg-yellow-500", "bg-emerald-500"];
const strengthText = ["", "text-rose-400", "text-orange-400", "text-yellow-400", "text-emerald-400"];

export default function ProfilePage() {
  const { user, refreshMe } = useAuth();

  // ── Profile edit ──────────────────────────────────────────────────────
  const [pName, setPName] = useState(user?.name ?? "");
  const [pEmail, setPEmail] = useState(user?.email ?? "");
  const [pErrors, setPErrors] = useState<{ name?: string; email?: string }>({});

  const profileM = useMutation({
    mutationFn: () => api.patch("/api/auth/me", { name: pName.trim(), email: pEmail.trim() }),
    onSuccess: async () => { toast.success("Profile updated"); await refreshMe(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const validateProfile = () => {
    const e: typeof pErrors = {};
    if (!pName.trim()) e.name = "Name is required";
    if (!pEmail.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pEmail)) e.email = "Enter a valid email";
    setPErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Password change ───────────────────────────────────────────────────
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confPw, setConfPw] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [pwErrors, setPwErrors] = useState<{ current?: string; new?: string; confirm?: string }>({});

  const strength = getStrength(newPw);

  const passwordM = useMutation({
    mutationFn: () => api.patch("/api/auth/me", { current_password: curPw, new_password: newPw }),
    onSuccess: () => {
      toast.success("Password changed");
      setCurPw(""); setNewPw(""); setConfPw("");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const validatePw = () => {
    const e: typeof pwErrors = {};
    if (!curPw) e.current = "Current password is required";
    if (!newPw) e.new = "New password is required";
    else if (newPw.length < 6) e.new = "Must be at least 6 characters";
    if (!confPw) e.confirm = "Confirm your new password";
    else if (confPw !== newPw) e.confirm = "Passwords do not match";
    setPwErrors(e);
    return Object.keys(e).length === 0;
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-lg space-y-8">
      {/* Header */}
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-600/20 text-2xl font-bold text-brand-300 ring-2 ring-brand-500/30">
          {initials(user.name)}
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">{user.name}</h1>
          <p className="text-sm text-slate-400">{user.email}</p>
          <span className={clsx(
            "mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide",
            user.role === "Admin" ? "bg-brand-600/20 text-brand-300 ring-1 ring-brand-500/30" : "bg-slate-700 text-slate-400"
          )}>
            {user.role}
          </span>
          <p className="mt-2 text-xs text-slate-500">
            Member since {new Date(user.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Account details */}
      <Card>
        <h2 className="font-semibold text-white">Account details</h2>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => { e.preventDefault(); if (validateProfile()) profileM.mutate(); }}
          noValidate
        >
          <div>
            <label className="label-base">Full name</label>
            <input
              className={clsx("input-base", pErrors.name && "input-error")}
              value={pName}
              onChange={(e) => { setPName(e.target.value); if (pErrors.name) setPErrors((p) => ({ ...p, name: undefined })); }}
            />
            {pErrors.name && <p className="error-text">! {pErrors.name}</p>}
          </div>
          <div>
            <label className="label-base">Email</label>
            <input
              type="email"
              className={clsx("input-base", pErrors.email && "input-error")}
              value={pEmail}
              onChange={(e) => { setPEmail(e.target.value); if (pErrors.email) setPErrors((p) => ({ ...p, email: undefined })); }}
            />
            {pErrors.email && <p className="error-text">! {pErrors.email}</p>}
          </div>
          <Button type="submit" disabled={profileM.isPending}>
            {profileM.isPending ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </Card>

      {/* Change password */}
      <Card>
        <h2 className="font-semibold text-white">Change password</h2>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => { e.preventDefault(); if (validatePw()) passwordM.mutate(); }}
          noValidate
        >
          {/* Current password */}
          <div>
            <label className="label-base">Current password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type={showCur ? "text" : "password"}
                className={clsx("input-base pl-10 pr-10", pwErrors.current && "input-error")}
                value={curPw}
                onChange={(e) => { setCurPw(e.target.value); if (pwErrors.current) setPwErrors((p) => ({ ...p, current: undefined })); }}
              />
              <button type="button" onClick={() => setShowCur((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition">
                {showCur ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {pwErrors.current && <p className="error-text">! {pwErrors.current}</p>}
          </div>

          {/* New password */}
          <div>
            <label className="label-base">New password</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                className={clsx("input-base pr-10", pwErrors.new && "input-error")}
                placeholder="Min. 6 characters"
                value={newPw}
                onChange={(e) => { setNewPw(e.target.value); if (pwErrors.new) setPwErrors((p) => ({ ...p, new: undefined })); }}
              />
              <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition">
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {newPw.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">{[1, 2, 3, 4].map((s) => <div key={s} className={clsx("h-1 flex-1 rounded-full transition-all", s <= strength ? strengthColors[strength] : "bg-slate-700")} />)}</div>
                <p className={clsx("text-xs", strengthText[strength])}>{strengthLabel[strength]}</p>
              </div>
            )}
            {pwErrors.new && <p className="error-text">! {pwErrors.new}</p>}
          </div>

          {/* Confirm password */}
          <div>
            <label className="label-base">Confirm new password</label>
            <div className="relative">
              <input
                type={showConf ? "text" : "password"}
                className={clsx("input-base pr-10", pwErrors.confirm && "input-error")}
                value={confPw}
                onChange={(e) => { setConfPw(e.target.value); if (pwErrors.confirm) setPwErrors((p) => ({ ...p, confirm: undefined })); }}
              />
              <button type="button" onClick={() => setShowConf((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition">
                {showConf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {pwErrors.confirm && <p className="error-text">! {pwErrors.confirm}</p>}
          </div>

          <Button type="submit" disabled={passwordM.isPending}>
            {passwordM.isPending ? "Updating…" : "Update password"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
