"use client";

import { useEffect, useState } from "react";
import { RefreshCw, ScanSearch, PencilRuler, ShieldAlert, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select, Field } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { LoadingBlock, EmptyState, ErrorState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { useHcc, api, ApiError } from "@/lib/hcc/client";
import { reviewTone, isAlertLabel } from "@/lib/hcc/status";
import { pct, relTime, formatDateTime, toClassList } from "@/lib/utils";
import type { Detection, Camera, Model, Annotation } from "@/lib/hcc/types";

export default function DetectionsPage() {
  const [camera, setCamera] = useState("");
  const [label, setLabel] = useState("");
  const [review, setReview] = useState("");
  const [limit, setLimit] = useState("60");
  const [live, setLive] = useState(true);

  const cameras = useHcc<Camera[]>("cameras");
  const models = useHcc<Model[]>("models");
  const { data, loading, error, refetch } = useHcc<Detection[]>("detections", {
    query: { camera_name: camera, label, review_status: review, limit },
    intervalMs: live ? 8000 : undefined,
  });

  const [selected, setSelected] = useState<Detection | null>(null);
  const detections = data ?? [];

  // Auto-buka detail dari ?focus=<id> (dari Overview)
  useEffect(() => {
    if (typeof window === "undefined" || detections.length === 0) return;
    const focus = new URLSearchParams(window.location.search).get("focus");
    if (focus) {
      const d = detections.find((x) => String(x.id) === focus);
      if (d) setSelected(d);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={camera} onChange={(e) => setCamera(e.target.value)} className="w-36">
          <option value="">Semua kamera</option>
          {(cameras.data ?? []).map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </Select>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (person…)"
          className="w-36"
        />
        <Select value={review} onChange={(e) => setReview(e.target.value)} className="w-40">
          <option value="">Semua review</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Terkonfirmasi</option>
          <option value="rejected">Ditolak</option>
        </Select>
        <Select value={limit} onChange={(e) => setLimit(e.target.value)} className="w-24">
          <option value="30">30</option>
          <option value="60">60</option>
          <option value="120">120</option>
        </Select>
        <div className="flex-1" />
        <button
          onClick={() => setLive((v) => !v)}
          className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors ${
            live
              ? "border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]"
              : "border-border bg-card text-muted-foreground"
          }`}
        >
          <span className="relative flex h-2 w-2">
            {live && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
            )}
            <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
          </span>
          {live ? "Live" : "Jeda"}
        </button>
        <Button variant="outline" size="icon" onClick={refetch} title="Muat ulang">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {loading && detections.length === 0 ? (
        <Card>
          <LoadingBlock rows={4} label="Memuat deteksi…" />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState message={error.detail} onRetry={refetch} />
        </Card>
      ) : detections.length === 0 ? (
        <Card>
          <EmptyState title="Belum ada deteksi" hint="Sesuaikan filter atau tunggu deteksi baru." icon={ScanSearch} />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {detections.map((d) => (
            <DetectionCard key={d.id} d={d} onClick={() => setSelected(d)} />
          ))}
        </div>
      )}

      {selected && (
        <DetectionModal
          detection={selected}
          modelClasses={
            toClassList(
              (models.data ?? []).find((m) => m.name === selected.model_name)?.classes ?? []
            )
          }
          onClose={() => setSelected(null)}
          onCorrected={() => {
            setSelected(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function BBoxFrame({ bbox, src = "/frame-placeholder.svg" }: { bbox?: number[]; src?: string }) {
  const box =
    bbox && bbox.length === 4
      ? {
          left: `${(bbox[0] - bbox[2] / 2) * 100}%`,
          top: `${(bbox[1] - bbox[3] / 2) * 100}%`,
          width: `${bbox[2] * 100}%`,
          height: `${bbox[3] * 100}%`,
        }
      : null;
  return (
    <div className="relative aspect-video w-full overflow-hidden bg-pln-navy">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-full w-full object-cover" />
      {box && (
        <div
          className="absolute rounded-sm border-2 border-pln-sky shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
          style={box}
        />
      )}
    </div>
  );
}

function DetectionCard({ d, onClick }: { d: Detection; onClick: () => void }) {
  const alert = d.alert || isAlertLabel(d.label);
  const rev = reviewTone(d.review_status);
  return (
    <button
      onClick={onClick}
      className="group overflow-hidden rounded-lg border border-border bg-card text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
    >
      <div className="relative">
        <BBoxFrame bbox={d.bbox} />
        {alert && (
          <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded bg-danger px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
            <ShieldAlert className="h-2.5 w-2.5" /> Alert
          </span>
        )}
        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-white">
          {pct(d.confidence)}
        </span>
      </div>
      <div className="space-y-1 p-2.5">
        <div className="flex items-center justify-between gap-1">
          <Badge tone={alert ? "danger" : "primary"}>{d.label}</Badge>
          <Badge tone={rev.tone}>{rev.label}</Badge>
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="truncate">{d.camera_name}</span>
          <span className="shrink-0">{relTime(d.created_at)}</span>
        </div>
      </div>
    </button>
  );
}

function DetectionModal({
  detection,
  modelClasses,
  onClose,
  onCorrected,
}: {
  detection: Detection;
  modelClasses: string[];
  onClose: () => void;
  onCorrected: () => void;
}) {
  const [imgUrl, setImgUrl] = useState("/frame-placeholder.svg");
  const [correcting, setCorrecting] = useState(false);
  const alert = detection.alert || isAlertLabel(detection.label);
  const rev = reviewTone(detection.review_status);

  useEffect(() => {
    let active = true;
    api
      .get<{ url: string }>(`detections/${detection.id}/image`)
      .then((r) => {
        if (active && r.data?.url) setImgUrl(r.data.url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [detection.id]);

  if (correcting) {
    return (
      <CorrectionEditor
        detection={detection}
        classes={modelClasses.length ? modelClasses : [detection.label]}
        imgUrl={imgUrl}
        onBack={() => setCorrecting(false)}
        onClose={onClose}
        onSaved={onCorrected}
      />
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Deteksi #${detection.id}`}
      description={`${detection.camera_name} · ${detection.model_name ?? "model —"}`}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Tutup
          </Button>
          <Button size="sm" onClick={() => setCorrecting(true)}>
            <PencilRuler className="h-4 w-4" /> Buat Koreksi
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="overflow-hidden rounded-lg border border-border">
          <BBoxFrame bbox={detection.bbox} src={imgUrl} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={alert ? "danger" : "primary"}>{detection.label}</Badge>
          <Badge tone={rev.tone}>{rev.label}</Badge>
          <span className="tabular text-xs text-muted-foreground">confidence {pct(detection.confidence, 1)}</span>
        </div>
        <div className="text-[11px] text-muted-foreground">Waktu: {formatDateTime(detection.created_at)}</div>
      </div>
    </Modal>
  );
}

function CorrectionEditor({
  detection,
  classes,
  imgUrl,
  onBack,
  onClose,
  onSaved,
}: {
  detection: Detection;
  classes: string[];
  imgUrl: string;
  onBack: () => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [annotations, setAnnotations] = useState<Annotation[]>([
    {
      class: classes[0] ?? detection.label,
      bbox: (detection.bbox as Annotation["bbox"]) ?? [0.5, 0.5, 0.2, 0.3],
    },
  ]);
  const [busy, setBusy] = useState(false);

  function update(i: number, patch: Partial<Annotation>) {
    setAnnotations((a) => a.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  function setBboxVal(i: number, j: number, v: number) {
    setAnnotations((a) =>
      a.map((x, idx) => {
        if (idx !== i) return x;
        const bbox = [...x.bbox] as Annotation["bbox"];
        bbox[j] = v;
        return { ...x, bbox };
      })
    );
  }

  async function submit() {
    setBusy(true);
    try {
      await api.post("corrections/from-detection", {
        detection_id: detection.id,
        model_name: detection.model_name ?? null,
        camera_name: detection.camera_name,
        annotations,
        source: "human",
      });
      toast.success("Koreksi disimpan untuk re-training.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.detail : "Gagal menyimpan koreksi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Koreksi Deteksi #${detection.id}`}
      description="Perbaiki label/kotak. Data menjadi bahan re-training model."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onBack} disabled={busy}>
            Kembali
          </Button>
          <Button size="sm" onClick={submit} loading={busy}>
            Simpan Koreksi
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="overflow-hidden rounded-lg border border-border">
          <BBoxFrame bbox={annotations[0]?.bbox} src={imgUrl} />
        </div>
        <div className="space-y-2">
          {annotations.map((ann, i) => (
            <div key={i} className="rounded-lg border border-border p-2.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">Objek #{i + 1}</span>
                {annotations.length > 1 && (
                  <button
                    onClick={() => setAnnotations((a) => a.filter((_, idx) => idx !== i))}
                    className="text-muted-foreground hover:text-danger"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Kelas">
                  {classes.length > 1 ? (
                    <Select value={ann.class} onChange={(e) => update(i, { class: e.target.value })}>
                      {classes.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input value={ann.class} onChange={(e) => update(i, { class: e.target.value })} />
                  )}
                </Field>
                <div className="grid grid-cols-4 gap-1">
                  {(["cx", "cy", "w", "h"] as const).map((k, j) => (
                    <Field key={k} label={k}>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        max={1}
                        value={ann.bbox[j]}
                        onChange={(e) => setBboxVal(i, j, Number(e.target.value))}
                        className="px-1.5 text-center text-xs"
                      />
                    </Field>
                  ))}
                </div>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setAnnotations((a) => [...a, { class: classes[0] ?? "", bbox: [0.5, 0.5, 0.2, 0.3] }])
            }
          >
            + Tambah objek
          </Button>
        </div>
      </div>
    </Modal>
  );
}
