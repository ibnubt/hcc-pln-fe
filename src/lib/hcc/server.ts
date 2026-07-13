// ── Server-side proxy ke API HCC (+ fallback demo) ────────────────────────
// Dipanggil dari route handler /api/hcc/[...path]. API key hanya hidup di sini.

import type { NextRequest } from "next/server";
import { mockDispatch } from "./mock";

const UPSTREAM_TIMEOUT_MS = 4500;

export function hccConfig() {
  return {
    baseUrl: (process.env.HCC_API_URL ?? "http://localhost:8000").replace(/\/+$/, ""),
    apiKey: process.env.HCC_API_KEY ?? "",
    demoFallback: (process.env.HCC_DEMO_FALLBACK ?? "true").toLowerCase() !== "false",
  };
}

const HAS_BODY = (m: string) => !["GET", "HEAD"].includes(m.toUpperCase());

/** Ubah FormData jadi object biasa untuk konsumsi demo (file -> metadata). */
async function parseForDemo(req: Request, contentType: string): Promise<unknown> {
  try {
    if (contentType.includes("application/json")) {
      const text = await req.text();
      return text ? JSON.parse(text) : undefined;
    }
    if (contentType.includes("multipart/form-data") || contentType.includes("form-urlencoded")) {
      const form = await req.formData();
      const obj: Record<string, unknown> = {};
      form.forEach((value, key) => {
        obj[key] = value instanceof File ? { filename: value.name, size: value.size } : value;
      });
      return obj;
    }
    const text = await req.text();
    return text || undefined;
  } catch {
    return undefined;
  }
}

function jsonResponse(status: number, json: unknown, source: string): Response {
  return new Response(JSON.stringify(json), {
    status,
    headers: { "content-type": "application/json", "x-hcc-source": source },
  });
}

export async function handleProxy(req: NextRequest, segments: string[]): Promise<Response> {
  const { baseUrl, apiKey, demoFallback } = hccConfig();
  const method = req.method.toUpperCase();
  const search = req.nextUrl.search; // "?a=b" atau ""
  const query = req.nextUrl.searchParams;
  const path = segments.map(encodeURIComponent).join("/");
  const url = `${baseUrl}/${path}${search}`;
  const contentType = req.headers.get("content-type") ?? "";

  // Simpan klon untuk parse demo (jika nanti perlu fallback).
  const demoClone = HAS_BODY(method) ? req.clone() : null;
  const rawBody = HAS_BODY(method) ? await req.arrayBuffer() : undefined;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = { "X-API-Key": apiKey, accept: "application/json" };
    if (contentType) headers["content-type"] = contentType;

    const upstream = await fetch(url, {
      method,
      headers,
      body: rawBody && rawBody.byteLength ? rawBody : undefined,
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);

    // API asli menjawab (termasuk 4xx/5xx) — teruskan apa adanya.
    const buf = await upstream.arrayBuffer();
    const resHeaders = new Headers();
    const ct = upstream.headers.get("content-type");
    if (ct) resHeaders.set("content-type", ct);
    resHeaders.set("x-hcc-source", "live");
    return new Response(buf, { status: upstream.status, headers: resHeaders });
  } catch (err) {
    clearTimeout(timer);
    // Network-level failure (API down / timeout / DNS) -> fallback demo.
    if (!demoFallback) {
      return jsonResponse(
        502,
        { detail: "API HCC tidak dapat dihubungi.", target: baseUrl, error: String((err as Error)?.message ?? err) },
        "error"
      );
    }
    const body = demoClone ? await parseForDemo(demoClone, contentType) : undefined;
    const result = mockDispatch(method, segments, query, body);
    return jsonResponse(result.status, result.json, "demo");
  }
}
