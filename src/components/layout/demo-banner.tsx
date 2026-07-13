"use client";

import { FlaskConical, WifiOff } from "lucide-react";
import { useDataSource } from "@/lib/hcc/client";

export function DemoBanner() {
  const source = useDataSource();
  if (source === "live") return null;

  if (source === "error") {
    return (
      <div className="flex items-center gap-2 border-b border-danger/30 bg-danger/10 px-4 py-2 text-[12px] font-medium text-danger sm:px-6">
        <WifiOff className="h-3.5 w-3.5" />
        API HCC tidak dapat dihubungi. Periksa <code className="rounded bg-danger/10 px-1 font-mono">HCC_API_URL</code> atau nyalakan API.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 border-b border-pln-yellow/30 bg-pln-yellow/10 px-4 py-2 text-[12px] font-medium text-pln-gold sm:px-6">
      <FlaskConical className="h-3.5 w-3.5" />
      Mode Demo — API HCC belum terhubung, menampilkan data contoh. Ubah{" "}
      <code className="rounded bg-pln-yellow/15 px-1 font-mono">HCC_API_URL</code> di{" "}
      <code className="rounded bg-pln-yellow/15 px-1 font-mono">.env.local</code> untuk memakai API asli.
    </div>
  );
}
