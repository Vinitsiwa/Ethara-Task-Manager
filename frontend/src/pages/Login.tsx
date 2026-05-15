import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowRight, Eye, EyeOff, Hexagon, Lock, Mail } from "lucide-react";
import { getErrorMessage } from "@/services/api";
import { useAuth } from "@/services/authContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import clsx from "clsx";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || "/dashboard";
  const qc = useQueryClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const mutation = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: async () => {
      toast.success("Welcome back!");
      await qc.invalidateQueries();
      navigate(from, { replace: true });
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
          <h1 className="text-2xl font-bold tracking-tight text-white">Sign in to your account</h1>
          <p className="mt-2 text-sm text-slate-400">Vinit Task Hub — projects, teams, and delivery.</p>
        </div>
        <Card>
          <form
            className="space-y-4"
            onSubmit={(e) => { e.preventDefault(); if (validate()) mutation.mutate(); }}
            noValidate
          >
            {/* Email */}
            <div>
              <label htmlFor="email" className="label-base">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="email" type="email" autoComplete="email"
                  className={clsx("input-base pl-10", errors.email && "input-error")}
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((p) => ({ ...p, email: undefined })); }}
                />
              </div>
              {errors.email && <p className="error-text">! {errors.email}</p>}
            </div>
            {/* Password */}
            <div>
              <label htmlFor="password" className="label-base">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="password" type={showPw ? "text" : "password"} autoComplete="current-password"
                  className={clsx("input-base pl-10 pr-10", errors.password && "input-error")}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((p) => ({ ...p, password: undefined })); }}
                />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="error-text">! {errors.password}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Signing in…" : "Continue"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-400">
            New here?{" "}
            <Link to="/signup" className="font-medium text-brand-400 hover:text-brand-300">Create an account</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
