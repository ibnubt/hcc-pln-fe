"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, Loader2, ShieldCheck, Cctv } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        router.replace("/");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.detail ?? "Login gagal.");
        setLoading(false);
      }
    } catch {
      setError("Tidak dapat terhubung ke server.");
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="cc-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />

      <div className="relative w-full max-w-sm animate-fade-in">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-2.5 shadow-lg ring-1 ring-black/5">
            <img src="/logo-pln.svg" alt="PLN" className="h-full w-full object-contain" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight">HCC PLN</h1>
            <span className="inline-flex items-center gap-1 rounded bg-pln-yellow/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-pln-gold">
              <Cctv className="h-3 w-3" /> CCTV AI
            </span>
          </div>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Command Center · Platform Deteksi
          </p>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-6 shadow-xl">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Masuk
          </div>
          <p className="mb-4 text-[11px] text-muted-foreground">
            Silakan login untuk mengakses control-plane.
          </p>

          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Username</label>
          <div className="relative mb-3">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
              placeholder="admin"
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary/60"
            />
          </div>

          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Password</label>
          <div className="relative mb-4">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary/60"
            />
          </div>

          {error && (
            <div className="mb-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[12px] text-danger">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Memproses…" : "Masuk"}
          </button>

          <div className="mt-4 rounded-lg bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">Demo login</span> — username{" "}
            <code className="rounded bg-background px-1 font-mono">admin</code> · password{" "}
            <code className="rounded bg-background px-1 font-mono">pln2026</code>
          </div>
        </form>

        <p className="mt-4 text-center text-[10px] text-muted-foreground/70">
          © PLN · Internal — HCC CCTV AI Command Center
        </p>
      </div>
    </div>
  );
}
