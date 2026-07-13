"use client";

// ── Client HCC (browser) ──────────────────────────────────────────────────
// Semua request menuju proxy Next.js di /api/hcc/*, bukan langsung ke API.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { DataSource } from "./types";

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

// ── Data-source store (untuk banner mode demo) ────────────────────────────
let currentSource: DataSource = "live";
const listeners = new Set<() => void>();
function setDataSource(s: DataSource) {
  if (s !== currentSource) {
    currentSource = s;
    listeners.forEach((l) => l());
  }
}
export function useDataSource(): DataSource {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => currentSource,
    () => "live" as DataSource
  );
}

interface RequestOpts {
  json?: unknown;
  form?: FormData;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOpts["query"]) {
  const clean = path.replace(/^\/+/, "");
  const qs = new URLSearchParams();
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    }
  }
  const s = qs.toString();
  return `/api/hcc/${clean}${s ? `?${s}` : ""}`;
}

export async function hccRequest<T = unknown>(
  method: string,
  path: string,
  opts: RequestOpts = {}
): Promise<{ data: T; source: DataSource }> {
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;
  if (opts.form) {
    body = opts.form; // browser set boundary sendiri
  } else if (opts.json !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(opts.json);
  }

  const res = await fetch(buildUrl(path, opts.query), {
    method,
    headers,
    body,
    signal: opts.signal,
    cache: "no-store",
  });

  const source = (res.headers.get("x-hcc-source") as DataSource) || "live";
  setDataSource(source);

  const text = await res.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const detail =
      (parsed as { detail?: string; message?: string })?.detail ||
      (parsed as { message?: string })?.message ||
      `Request gagal (${res.status})`;
    throw new ApiError(res.status, detail);
  }

  return { data: parsed as T, source };
}

export const api = {
  get: <T>(path: string, query?: RequestOpts["query"]) => hccRequest<T>("GET", path, { query }),
  post: <T>(path: string, json?: unknown) => hccRequest<T>("POST", path, { json }),
  postForm: <T>(path: string, form: FormData) => hccRequest<T>("POST", path, { form }),
  put: <T>(path: string, json?: unknown) => hccRequest<T>("PUT", path, { json }),
  patch: <T>(path: string, json?: unknown) => hccRequest<T>("PATCH", path, { json }),
  del: <T>(path: string) => hccRequest<T>("DELETE", path),
};

// ── Hook GET dengan loading/error/refetch + polling opsional ───────────────
interface UseHccOpts {
  query?: RequestOpts["query"];
  intervalMs?: number;
  enabled?: boolean;
  /** kunci tambahan untuk memaksa refetch saat berubah */
  deps?: unknown[];
}

export function useHcc<T>(path: string | null, opts: UseHccOpts = {}) {
  const { query, intervalMs, enabled = true, deps = [] } = opts;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState<boolean>(!!path && enabled);
  const [source, setSource] = useState<DataSource>("live");
  const queryKey = JSON.stringify(query ?? {});
  const mounted = useRef(true);

  const load = useCallback(
    async (silent = false) => {
      if (!path || !enabled) return;
      if (!silent) setLoading(true);
      try {
        const res = await hccRequest<T>("GET", path, { query });
        if (!mounted.current) return;
        setData(res.data);
        setSource(res.source);
        setError(null);
      } catch (e) {
        if (!mounted.current) return;
        setError(e instanceof ApiError ? e : new ApiError(0, String(e)));
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [path, queryKey, enabled]
  );

  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, queryKey, enabled, ...deps]);

  useEffect(() => {
    if (!intervalMs || !path || !enabled) return;
    const t = setInterval(() => load(true), intervalMs);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, path, queryKey, enabled]);

  return { data, error, loading, source, refetch: () => load(false) };
}
