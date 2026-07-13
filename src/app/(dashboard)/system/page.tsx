"use client";

import { useState } from "react";
import {
  RefreshCw,
  Cctv,
  BrainCircuit,
  ScanSearch,
  ClipboardCheck,
  PencilRuler,
  HardDrive,
  HeartPulse,
  Server,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, SectionLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusDot, type Tone } from "@/components/ui/badge";
import { StatGrid, type Stat } from "@/components/dashboard/stat-card";
import { LoadingBlock, ErrorState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { useHcc, api, useDataSource, ApiError } from "@/lib/hcc/client";
import { fmt, humanUptime } from "@/lib/utils";
import type { SystemStatus } from "@/lib/hcc/types";

function fmtBytes(b?: number) {
  if (!b) return "—";
  if (b >= 1e9) return `${(b / 1e9).toFixed(1)} GB`;
  if (b >= 1e6) return `${(b / 1e6).toFixed(0)} MB`;
  return `${(b / 1e3).toFixed(0)} KB`;
}

const statusTone: Record<string, Tone> = {
  ok: "success",
  degraded: "warning",
  down: "danger",
};

export default function SystemPage() {
  const { data, loading, error, refetch } = useHcc<SystemStatus>("system/status", {
    intervalMs: 15000,
  });
  const source = useDataSource();
  const toast = useToast();
  const [pinging, setPinging] = useState(false);

  async function ping() {
    setPinging(true);
    try {
      const { data } = await api.get<{ status: string }>("health");
      toast.success(`Health: ${data?.status ?? "ok"}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.detail : "Health check gagal.");
    } finally {
      setPinging(false);
    }
  }

  const s = data;
  const stats: Stat[] = s
    ? [
        {
          label: "Kamera",
          value: `${s.cameras.online ?? "—"}/${s.cameras.total}`,
          sub: `${s.cameras.enabled} aktif`,
          icon: Cctv,
          accent: "205 90% 55%",
        },
        {
          label: "Model Ready",
          value: fmt(s.models.ready),
          sub: `dari ${fmt(s.models.total)}`,
          icon: BrainCircuit,
          accent: "152 62% 40%",
        },
        {
          label: "Deteksi Hari Ini",
          value: fmt(s.detections.today),
          sub: `${fmt(s.detections.pending_review)} pending review`,
          icon: ScanSearch,
          accent: "212 82% 50%",
        },
        {
          label: "Pending Review",
          value: fmt(s.detections.pending_review),
          sub: "deteksi",
          icon: ClipboardCheck,
          accent: "38 92% 50%",
        },
        {
          label: "Koreksi Pending",
          value: fmt(s.corrections?.pending ?? 0),
          sub: "belum dikonsumsi",
          icon: PencilRuler,
          accent: "265 80% 62%",
        },
        {
          label: "Storage",
          value: fmtBytes(s.storage?.used_bytes),
          sub: `${fmt(s.storage?.object_count ?? 0)} objek`,
          icon: HardDrive,
          accent: "199 89% 55%",
        },
      ]
    : [];

  return (
    <div className="space-y-4">
      {/* Header status */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-4">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"
            >
              <Server className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold">Platform HCC</h3>
                {s && <Badge tone={statusTone[s.status] ?? "muted"}>{s.status.toUpperCase()}</Badge>}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {s?.version ? `Versi ${s.version} · ` : ""}
                Uptime {humanUptime(s?.uptime_seconds)} ·{" "}
                {s?.worker ? `worker ${s.worker.training} (${s.worker.queue} antre)` : "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={ping} loading={pinging}>
              <HeartPulse className="h-4 w-4" /> Health check
            </Button>
            <Button variant="outline" size="icon" onClick={refetch} title="Muat ulang">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {loading && !s ? (
        <Card>
          <LoadingBlock rows={3} label="Mengambil status sistem…" />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState message={error.detail} onRetry={refetch} />
        </Card>
      ) : (
        <>
          <StatGrid stats={stats} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>
                  <SectionLabel>Kesehatan</SectionLabel>
                  <h3 className="text-sm font-semibold">Layanan</h3>
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="divide-y divide-border">
                  {(s?.services ?? []).map((svc) => {
                    const tone = statusTone[svc.status] ?? "muted";
                    return (
                      <div key={svc.name} className="flex items-center justify-between py-2.5">
                        <div className="flex items-center gap-2.5">
                          <StatusDot tone={tone} ping={svc.status === "ok"} />
                          <span className="text-sm font-medium">{svc.name}</span>
                        </div>
                        <Badge tone={tone}>{svc.status}</Badge>
                      </div>
                    );
                  })}
                  {(s?.services?.length ?? 0) === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      API tidak mengirim detail layanan.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  <SectionLabel>Koneksi</SectionLabel>
                  <h3 className="text-sm font-semibold">Sumber Data</h3>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Mode</span>
                  <Badge tone={source === "live" ? "success" : source === "demo" ? "accent" : "danger"}>
                    {source === "live" ? "API Live" : source === "demo" ? "Demo (mock)" : "Terputus"}
                  </Badge>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
                  {source === "live" ? (
                    <>Terhubung ke API HCC melalui proxy server. Data real-time.</>
                  ) : source === "demo" ? (
                    <>
                      API HCC belum terhubung — menampilkan data contoh. Atur{" "}
                      <code className="rounded bg-background px-1 font-mono">HCC_API_URL</code> pada{" "}
                      <code className="rounded bg-background px-1 font-mono">.env.local</code> menuju API lokal, lalu
                      restart.
                    </>
                  ) : (
                    <>
                      Tidak dapat menghubungi API dan fallback demo dimatikan. Periksa API atau nyalakan{" "}
                      <code className="rounded bg-background px-1 font-mono">HCC_DEMO_FALLBACK</code>.
                    </>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground/70">
                  API key hanya digunakan di sisi server (proxy) dan tidak pernah dikirim ke browser.
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
