"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const endpoint = isSignUp ? "/api/auth/signup" : "/api/auth/login";
    const payload = isSignUp ? { name, email, password } : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between border-r border-[var(--border)] bg-[var(--surface)] p-12 relative overflow-hidden">
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }} />

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-16">
            <Image
              src="/nadi-logo.jpeg"
              alt="NADI Logo"
              width={48}
              height={48}
              className="h-12 w-12 rounded-sm object-cover shadow-[4px_4px_0px_0px_color-mix(in_srgb,var(--primary)_30%,transparent)]"
            />
            <div>
              <h1 className="font-display text-2xl font-black uppercase tracking-widest text-[var(--text-primary)]">NADI</h1>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--primary)]">Orchestrator</p>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="font-display text-5xl font-black uppercase leading-[0.95] tracking-tight text-[var(--text-primary)]">
              Automate<br />
              <span className="text-[var(--primary)]">your</span><br />
              business.
            </h2>
            <p className="max-w-md text-base leading-relaxed text-[var(--text-secondary)]">
              Workflows, approvals, finance pipelines, and audit trails — all in one autonomous orchestrator built for Indonesian MSMEs.
            </p>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          {/* Feature stamps */}
          <div className="flex flex-wrap gap-3">
            {["Workflows", "Approvals", "Finance", "Audit Trail", "Inventory"].map((feature) => (
              <span key={feature} className="rounded-sm border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] shadow-[2px_2px_0px_0px_var(--background)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]">
                {feature}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-[var(--border)] pt-6">
            <div className="h-2 w-2 rounded-none bg-[var(--success)]" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Systems operational</span>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex flex-1 items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 lg:hidden mb-8">
            <Image
              src="/nadi-logo.jpeg"
              alt="NADI Logo"
              width={40}
              height={40}
              className="h-10 w-10 rounded-sm object-cover shadow-[3px_3px_0px_0px_color-mix(in_srgb,var(--primary)_30%,transparent)]"
            />
            <div>
              <h1 className="font-display text-lg font-black uppercase tracking-widest text-[var(--text-primary)]">NADI</h1>
              <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-[var(--primary)]">Orchestrator</p>
            </div>
          </div>

          {/* Header */}
          <div>
            <h2 className="font-display text-3xl font-black uppercase tracking-widest text-[var(--text-primary)]">
              {isSignUp ? "Sign Up" : "Sign In"}
            </h2>
            <p className="mt-2 font-mono text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
              {isSignUp ? "Create your workspace" : "Access your workspace"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <div className="space-y-2">
                <label className="block font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ahmad Rizky"
                  required={isSignUp}
                  className="h-11 w-full rounded-sm border border-[var(--border)] bg-[var(--card)] px-4 font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/40 outline-none transition-all focus:border-[var(--primary)] focus:shadow-[3px_3px_0px_0px_var(--primary)]"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="block font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="h-11 w-full rounded-sm border border-[var(--border)] bg-[var(--card)] px-4 font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/40 outline-none transition-all focus:border-[var(--primary)] focus:shadow-[3px_3px_0px_0px_var(--primary)]"
              />
            </div>

            <div className="space-y-2">
              <label className="block font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                  className="h-11 w-full rounded-sm border border-[var(--border)] bg-[var(--card)] px-4 pr-12 font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/40 outline-none transition-all focus:border-[var(--primary)] focus:shadow-[3px_3px_0px_0px_var(--primary)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4 stroke-[2.5]" /> : <Eye className="h-4 w-4 stroke-[2.5]" />}
                </button>
              </div>
            </div>

            {!isSignUp && (
              <div className="flex justify-end">
                <button type="button" className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--primary)] hover:underline underline-offset-4">
                  Forgot password?
                </button>
              </div>
            )}

            {error && (
              <div className="rounded-sm border border-[var(--danger)] bg-[var(--danger)]/10 px-4 py-3 text-xs font-bold text-[var(--danger)]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-glow flex h-12 w-full items-center justify-center gap-3 rounded-sm border border-[var(--primary)] bg-[var(--primary)] font-display text-sm font-black uppercase tracking-widest text-[#000] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_0px_color-mix(in_srgb,var(--primary)_40%,transparent)] active:translate-x-0 active:translate-y-0 active:shadow-none disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {isSignUp ? "Create Account" : "Enter Workspace"}
                  <ArrowRight className="h-4 w-4 stroke-[3]" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border)]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[var(--background)] px-4 font-mono text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Or</span>
            </div>
          </div>

          {/* Social login buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="flex h-11 items-center justify-center gap-2 rounded-sm border border-[var(--border)] bg-[var(--card)] font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] transition-all hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] hover:shadow-[2px_2px_0px_0px_var(--background)] hover:translate-x-[-1px] hover:translate-y-[-1px]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google
            </button>
            <button
              type="button"
              className="flex h-11 items-center justify-center gap-2 rounded-sm border border-[var(--border)] bg-[var(--card)] font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] transition-all hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] hover:shadow-[2px_2px_0px_0px_var(--background)] hover:translate-x-[-1px] hover:translate-y-[-1px]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              GitHub
            </button>
          </div>

          {/* Toggle */}
          <div className="text-center">
            <span className="text-sm text-[var(--text-muted)]">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}
            </span>
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="ml-2 font-display text-sm font-bold text-[var(--primary)] hover:underline underline-offset-4"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
