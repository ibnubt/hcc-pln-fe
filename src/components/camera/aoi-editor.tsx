"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2, Undo2, Plus, Eraser } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/hcc/client";
import { attachHls } from "@/lib/hls";
import { zoneColor, ptsStr } from "@/components/camera/aoi-overlay";
import type { Camera, AoiConfig, AoiZone } from "@/lib/hcc/types";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function AoiEditorModal({
  camera,
  onClose,
  onSaved,
}: {
  camera: Camera;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const toast = useToast();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [zones, setZones] = useState<AoiZone[]>([]);
  const [draft, setDraft] = useState<number[][]>([]); // poligon yang sedang digambar
  const [draftName, setDraftName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // muat zona yang sudah ada
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get<AoiConfig>(`cameras/${camera.id}/aoi`);
        if (alive) setZones(data.zones ?? []);
      } catch {
        if (alive) toast.error("Gagal memuat AoI.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera.id]);

  // backdrop stream langsung (opsional)
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !camera.stream_url) return;
    return attachHls(v, camera.stream_url);
  }, [camera.stream_url]);

  function addPoint(e: React.MouseEvent<HTMLDivElement>) {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clamp01((e.clientX - rect.left) / rect.width);
    const y = clamp01((e.clientY - rect.top) / rect.height);
    setDraft((d) => [...d, [Number(x.toFixed(4)), Number(y.toFixed(4))]]);
  }

  function commitZone() {
    if (draft.length < 3) {
      toast.error("Zona butuh minimal 3 titik.");
      return;
    }
    const name = draftName.trim() || `zona-${zones.length + 1}`;
    setZones((z) => [...z, { name, polygon: draft }]);
    setDraft([]);
    setDraftName("");
  }

  async function save() {
    if (draft.length > 0 && !window.confirm("Ada titik zona yang belum ditambahkan. Simpan tanpa zona itu?")) return;
    setBusy(true);
    try {
      const { data } = await api.put<AoiConfig>(`cameras/${camera.id}/aoi`, { zones });
      setZones(data.zones ?? []);
      toast.success(zones.length ? `${zones.length} zona AoI disimpan.` : "AoI dikosongkan — deteksi seluruh frame.");
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.detail : "Gagal menyimpan AoI.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Area Deteksi (AoI) · ${camera.name}`}
      description="Klik pada frame untuk menaruh titik poligon. Deteksi di luar semua zona diabaikan. Tanpa zona = seluruh frame."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button size="sm" onClick={save} loading={busy}>
            Simpan AoI
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {/* kanvas gambar */}
        <div
          ref={surfaceRef}
          onClick={addPoint}
          className="relative aspect-video w-full cursor-crosshair select-none overflow-hidden rounded-lg border border-border bg-black"
        >
          {camera.stream_url ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="pointer-events-none absolute inset-0 h-full w-full object-fill opacity-80"
            />
          ) : (
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-[11px] text-white/40">
              (tanpa stream — gambar zona di atas bidang kosong)
            </div>
          )}

          <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
            {zones.map((z, i) => (
              <polygon
                key={i}
                points={ptsStr(z.polygon)}
                fill={zoneColor(i)}
                fillOpacity={0.22}
                stroke={zoneColor(i)}
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {draft.length > 0 && (
              <polyline
                points={ptsStr(draft)}
                fill="rgba(255,255,255,0.10)"
                stroke="#fff"
                strokeWidth={2}
                strokeDasharray="4 3"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>

          {/* handle titik draft */}
          {draft.map(([x, y], i) => (
            <span
              key={i}
              style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
              className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-primary"
            />
          ))}

          {loading && (
            <div className="absolute inset-0 grid place-items-center bg-black/50 text-xs text-white">Memuat…</div>
          )}
        </div>

        {/* kontrol draft */}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="Nama zona (mis. gudang)"
            className="h-8 min-w-[140px] flex-1"
          />
          <Button variant="outline" size="sm" onClick={() => setDraft((d) => d.slice(0, -1))} disabled={!draft.length}>
            <Undo2 className="h-4 w-4" /> Titik
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDraft([])} disabled={!draft.length}>
            <Eraser className="h-4 w-4" /> Reset
          </Button>
          <Button size="sm" onClick={commitZone} disabled={draft.length < 3}>
            <Plus className="h-4 w-4" /> Tambah zona ({draft.length} titik)
          </Button>
        </div>

        {/* daftar zona */}
        {zones.length === 0 && draft.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">
            Belum ada zona — deteksi berlaku di seluruh frame. Klik pada frame untuk mulai menggambar.
          </p>
        ) : (
          <div className="space-y-1">
            {zones.map((z, i) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-border px-2 py-1.5">
                <div className="flex items-center gap-2 text-sm">
                  <span className="h-3 w-3 rounded-sm" style={{ background: zoneColor(i) }} />
                  <span className="font-medium">{z.name}</span>
                  <span className="text-[10px] text-muted-foreground">{z.polygon.length} titik</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:text-danger"
                  title="Hapus zona"
                  onClick={() => setZones((zs) => zs.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
