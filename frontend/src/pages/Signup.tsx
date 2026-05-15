import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Eye, EyeOff, Hexagon } from "lucide-react";
import { getErrorMessage } from "@/services/api";
import { useAuth } from "@/services/authContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import clsx from "clsx";

function getStrength(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"];
const strengthColors = ["", "bg-rose-500", "bg-orange-500", "bg-yellow-500", "bg-emerald-500"];
const strengthTextColors = ["", "text-rose-400", "text-orange-400", "text-yellow-400", "text-emerald-400"];

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  const strength = getStrength(password);

  const validate = () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = "Full name is required";
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    else if (password.length < 6) e.password = "Password must be at least 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const mutation = useMutation({
    mutationFn: () => signup(name, email, password),
    onSuccess: (created) => {
      toast.success(
        `Account created! ${created.role === "Admin" ? "You're the Admin 🎉" : "You'll join as a Member."}`,
        { duration: 5000 }
      );
      navigate("/login", { replace: true });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="surface-grid flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600/20 text-brand-400 ring-2 ring-brand-500/30 shadow-glow">
              <Hexagon className="h-7 w-7" />
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Create your account</h1>
          <p className="mt-2 text-sm text-slate-400">The first user to sign up becomes the Admin.</p>
        </div>
        <Card>
          <form
            className="space-y-4"
            onSubmit={(e) => { e.preventDefault(); if (validate()) mutation.mutate(); }}
            noValidate
          >
            {/* Name */}
            <div>
              <label htmlFor="name" className="label-base">Full name</label>
              <input
                id="name" type="text" autoComplete="name"
                className={clsx("input-base", errors.name && "input-error")}
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((p) => ({ ...p, name: undefined })); }}
              />
              {errors.name && <p className="error-text">! {errors.name}</p>}
            </div>
            {/* Email */}
            <div>
              <label htmlFor="email" className="label-base">Email</label>
              <input
                id="email" type="email" autoComplete="email"
                className={clsx("input-base", errors.email && "input-error")}
                placeholder="you@company.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((p) => ({ ...p, email: undefined })); }}
              />
              {errors.email && <p className="error-text">! {errors.email}</p>}
            </div>
            {/* Password */}
            <div>
              <label htmlFor="password" className="label-base">Password</label>
              <div className="relative">
                <input
                  id="password" type={showPw ? "text" : "password"} autoComplete="new-password"
                  className={clsx("input-base pr-10", errors.password && "input-error")}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((p) => ({ ...p, password: undefined })); }}
                />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Strength meter */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((seg) => (
                      <div key={seg} className={clsx("h-1 flex-1 rounded-full transition-all", seg <= strength ? strengthColors[strength] : "bg-slate-700")} />
                    ))}
                  </div>
                  <p className={clsx("text-xs", strengthTextColors[strength])}>{strengthLabel[strength]}</p>
                </div>
              )}
              {errors.password && <p className="error-text">! {errors.password}</p>}
            </div>

            <p className="rounded-xl bg-slate-800/60 px-3 py-2 text-xs text-slate-400 ring-1 ring-slate-700">
              You'll join as a <strong className="text-slate-200">Member</strong> — unless you're the very first user, in which case you'll be <strong className="text-brand-300">Admin</strong>.
            </p>

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating…" : "Create account"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-brand-400 hover:text-brand-300">Sign in</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
