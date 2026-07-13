"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Cctv,
  BrainCircuit,
  ScanSearch,
  ClipboardCheck,
  ShieldAlert,
  Cpu,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, SectionLabel } from "@/components/ui/card";
import { Badge, StatusDot } from "@/components/ui/badge";
import { StatGrid, type Stat } from "@/components/dashboard/stat-card";
import { LoadingBlock, EmptyState } from "@/components/ui/states";
import { useHcc } from "@/lib/hcc/client";
import { cameraTone, reviewTone, isAlertLabel } from "@/lib/hcc/status";
import { fmt, pct, relTime } from "@/lib/utils";
import type { SystemStatus, Detection, Camera, TrainingRun } from "@/lib/hcc/types";

export default function OverviewPage() {
  const sys = useHcc<SystemStatus>("system/status", { intervalMs: 15000 });
  const dets = useHcc<Detection[]>("detections", { query: { limit: 300 }, intervalMs: 8000 });
  const cams = useHcc<Camera[]>("cameras", { intervalMs: 30000 });
  const review = useHcc<TrainingRun[]>("training/runs", { query: { status: "pending_review" } });

  const detections = dets.data ?? [];
  const cameras = cams.data ?? [];
  const s = sys.data;

  const derived = useMemo(() => {
    const now = Date.now();
    const dayAgo = now - 24 * 3600 * 1000;
    const last24 = detections.filter((d) => new Date(d.created_at).getTime() >= dayAgo);

    // per-jam buckets (24)
    const buckets = Array.from({ length: 24 }, (_, i) => {
      const h = new Date(now - (23 - i) * 3600 * 1000);
      return { label: `${h.getHours().toString().padStart(2, "0")}:00`, count: 0, alert: 0 };
    });
    for (const d of last24) {
      const idx = 23 - Math.floor((now - new Date(d.created_at).getTime()) / (3600 * 1000));
      if (idx >= 0 && idx < 24) {
        buckets[idx].count++;
        if (d.alert || isAlertLabel(d.label)) buckets[idx].alert++;
      }
    }

    // distribusi label
    const labelMap = new Map<string, number>();
    for (const d of last24) labelMap.set(d.label, (labelMap.get(d.label) ?? 0) + 1);
    const labels = [...labelMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const maxLabel = labels[0]?.[1] ?? 1;

    const alerts24 = last24.filter((d) => d.alert || isAlertLabel(d.label)).length;
    const pending = detections.filter((d) => d.review_status === "pending").length;

    return { buckets, labels, maxLabel, alerts24, pending, count24: last24.length };
  }, [detections]);

  const stats: Stat[] = [
    {
      label: "Kamera Online",
      value: `${s?.cameras.online ?? cameras.filter((c) => c.status === "online").length}/${s?.cameras.total ?? cameras.length}`,
      sub: `${s?.cameras.enabled ?? cameras.filter((c) => c.enabled).length} aktif`,
      icon: Cctv,
      accent: "205 90% 55%",
      tip: "Kamera dengan stream online / total terdaftar.",
    },
    {
      label: "Model Ready",
      value: fmt(s?.models.ready ?? 0),
      sub: `dari ${fmt(s?.models.total ?? 0)} model`,
      icon: BrainCircuit,
      accent: "152 62% 40%",
      tip: "Model berstatus ready yang siap dipasang ke kamera.",
    },
    {
      label: "Deteksi 24 Jam",
      value: fmt(derived.count24),
      sub: `${fmt(s?.detections.today ?? derived.count24)} hari ini`,
      icon: ScanSearch,
      accent: "212 82% 50%",
      tip: "Jumlah deteksi dalam 24 jam terakhir.",
    },
    {
      label: "Menunggu Review",
      value: fmt(s?.detections.pending_review ?? derived.pending),
      sub: "deteksi perlu ditinjau",
      icon: ClipboardCheck,
      accent: "38 92% 50%",
      tip: "Deteksi dengan review_status = pending.",
    },
    {
      label: "Alert 24 Jam",
      value: fmt(derived.alerts24),
      sub: "no-helmet / no-vest / api",
      icon: ShieldAlert,
      accent: "0 72% 55%",
      tip: "Deteksi yang memicu alert keselamatan dalam 24 jam.",
    },
    {
      label: "Training Worker",
      value: s?.worker?.training === "busy" ? "Sibuk" : "Idle",
      sub: `${fmt(s?.worker?.queue ?? 0)} antre · ${fmt(review.data?.length ?? 0)} review`,
      icon: Cpu,
      accent: "265 80% 62%",
      tip: "Status worker training & jumlah run menunggu review.",
    },
  ];

  return (
    <div className="space-y-4">
      {sys.loading && !s ? (
        <Card>
          <LoadingBlock rows={2} label="Menghubungi API HCC…" />
        </Card>
      ) : (
        <StatGrid stats={stats} />
      )}

      {/* Banner review reminder */}
      {(review.data?.length ?? 0) > 0 && (
        <Link href="/training">
          <Card className="flex items-center justify-between gap-3 border-pln-yellow/30 bg-pln-yellow/[0.06] px-5 py-3 transition-colors hover:border-pln-yellow/50">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pln-yellow/15 text-pln-gold">
                <GraduationCap className="h-4 w-4" />
              </span>
              <div className="text-sm">
                <span className="font-semibold text-foreground">
                  {review.data?.length} run training menunggu review
                </span>
                <span className="text-muted-foreground"> — tinjau & promosikan model baru.</span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-pln-gold" />
          </Card>
        </Link>
      )}

      {/* Chart + camera status */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              <SectionLabel>Aktivitas Deteksi</SectionLabel>
              <h3 className="text-sm font-semibold">Deteksi per jam · 24 jam terakhir</h3>
            </CardTitle>
            <Badge tone="sky" dot>
              {fmt(derived.count24)} deteksi
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={derived.buckets} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="detFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="alertFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--danger))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--danger))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    interval={3}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={32}
                  />
                  <Tooltip content={<ChartTip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Deteksi"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#detFill)"
                  />
                  <Area
                    type="monotone"
                    dataKey="alert"
                    name="Alert"
                    stroke="hsl(var(--danger))"
                    strokeWidth={1.5}
                    fill="url(#alertFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <SectionLabel>Status</SectionLabel>
              <h3 className="text-sm font-semibold">Kamera</h3>
            </CardTitle>
            <Link href="/cameras" className="text-[11px] font-medium text-primary hover:underline">
              Kelola
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {cams.loading && cameras.length === 0 ? (
              <LoadingBlock rows={4} />
            ) : cameras.length === 0 ? (
              <EmptyState title="Belum ada kamera" icon={Cctv} />
            ) : (
              <div className="scrollbar-thin max-h-64 space-y-1 overflow-y-auto">
                {cameras.map((c) => {
                  const t = cameraTone(c.status, c.enabled);
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/40"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <StatusDot tone={t.tone} ping={c.status === "online" && c.enabled} />
                        <div className="min-w-0">
                          <div className="truncate text-xs font-medium">{c.name}</div>
                          <div className="truncate text-[10px] text-muted-foreground">
                            {c.group_name ?? "—"} · {c.assigned_model_name ?? "tanpa model"}
                          </div>
                        </div>
                      </div>
                      <Badge tone={t.tone}>{t.label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent detections + label distribution */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              <SectionLabel>Live</SectionLabel>
              <h3 className="text-sm font-semibold">Deteksi Terbaru</h3>
            </CardTitle>
            <Link href="/detections" className="text-[11px] font-medium text-primary hover:underline">
              Semua deteksi
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {dets.loading && detections.length === 0 ? (
              <LoadingBlock rows={5} />
            ) : detections.length === 0 ? (
              <EmptyState title="Belum ada deteksi" icon={ScanSearch} />
            ) : (
              <div className="scrollbar-thin max-h-80 space-y-1.5 overflow-y-auto">
                {detections.slice(0, 10).map((d) => {
                  const alert = d.alert || isAlertLabel(d.label);
                  const rev = reviewTone(d.review_status);
                  return (
                    <Link
                      key={d.id}
                      href={`/detections?focus=${d.id}`}
                      className="flex items-center gap-3 rounded-lg border border-transparent px-2 py-1.5 transition-colors hover:border-border hover:bg-muted/40"
                    >
                      <div className="h-9 w-14 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/frame-placeholder.svg" alt="" className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge tone={alert ? "danger" : "primary"}>{d.label}</Badge>
                          <span className="truncate text-xs text-muted-foreground">{d.camera_name}</span>
                        </div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          {pct(d.confidence)} · {relTime(d.created_at)}
                        </div>
                      </div>
                      <Badge tone={rev.tone}>{rev.label}</Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <SectionLabel>24 Jam</SectionLabel>
              <h3 className="text-sm font-semibold">Distribusi Label</h3>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {derived.labels.length === 0 ? (
              <EmptyState title="Belum ada data" icon={ScanSearch} />
            ) : (
              <div className="space-y-2.5">
                {derived.labels.map(([label, count]) => {
                  const alert = isAlertLabel(label);
                  return (
                    <div key={label}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className={alert ? "font-medium text-danger" : "font-medium"}>{label}</span>
                        <span className="tabular text-muted-foreground">{fmt(count)}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full animate-bar-grow"
                          style={{
                            width: `${(count / derived.maxLabel) * 100}%`,
                            background: alert ? "hsl(var(--danger))" : "hsl(var(--primary))",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-medium">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="tabular font-medium">{p.value}</span>
        </div>
      ))}
    </div>
  );
}
