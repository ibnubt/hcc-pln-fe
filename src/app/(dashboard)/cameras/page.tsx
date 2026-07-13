"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, Pencil, Trash2, Link2, Cctv, RefreshCw, Unlink, Video } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Input, Select, Textarea, Field } from "@/components/ui/input";
import { Table, THead, TBody, TH, TD, TR } from "@/components/ui/table";
import { Modal, ConfirmModal } from "@/components/ui/modal";
import { LoadingBlock, EmptyState, ErrorState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { useHcc, api, ApiError } from "@/lib/hcc/client";
import { cameraTone } from "@/lib/hcc/status";
import { toClassList } from "@/lib/utils";
import type { Camera, Model } from "@/lib/hcc/types";

export default function CamerasPage() {
  const { data, loading, error, refetch } = useHcc<Camera[]>("cameras");
  const models = useHcc<Model[]>("models");
  const toast = useToast();

  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");
  const [editing, setEditing] = useState<Camera | "new" | null>(null);
  const [assigning, setAssigning] = useState<Camera | null>(null);
  const [deleting, setDeleting] = useState<Camera | null>(null);
  const [watching, setWatching] = useState<Camera | null>(null);
  const [busy, setBusy] = useState(false);

  const cameras = data ?? [];
  const groups = useMemo(
    () => [...new Set(cameras.map((c) => c.group_name).filter(Boolean))] as string[],
    [cameras]
  );
  const filtered = cameras.filter((c) => {
    const matchQ =
      !q ||
      c.name.toLowerCase().includes(q.toLowerCase()) ||
      (c.stream_key ?? "").toLowerCase().includes(q.toLowerCase());
    const matchG = !group || c.group_name === group;
    return matchQ && matchG;
  });

  async function toggleEnabled(c: Camera) {
    try {
      await api.patch(`cameras/${c.id}`, { enabled: !c.enabled });
      toast.success(`Kamera ${c.name} ${!c.enabled ? "diaktifkan" : "dinonaktifkan"}.`);
      refetch();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.detail : "Gagal memperbarui kamera.");
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.del(`cameras/${deleting.id}`);
      toast.success(`Kamera ${deleting.name} dihapus.`);
      setDeleting(null);
      refetch();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.detail : "Gagal menghapus kamera.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama / stream key…"
            className="pl-9"
          />
        </div>
        <Select value={group} onChange={(e) => setGroup(e.target.value)} className="w-40">
          <option value="">Semua grup</option>
          {groups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </Select>
        <Button variant="outline" size="icon" onClick={refetch} title="Muat ulang">
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" /> Tambah Kamera
        </Button>
      </div>

      <Card>
        {loading && cameras.length === 0 ? (
          <LoadingBlock rows={5} label="Memuat kamera…" />
        ) : error ? (
          <ErrorState message={error.detail} onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={cameras.length === 0 ? "Belum ada kamera" : "Tidak ada yang cocok"}
            hint={cameras.length === 0 ? "Tambahkan kamera CCTV pertama Anda." : undefined}
            icon={Cctv}
            action={
              cameras.length === 0 ? (
                <Button size="sm" onClick={() => setEditing("new")}>
                  <Plus className="h-4 w-4" /> Tambah Kamera
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <THead>
              <TH>Kamera</TH>
              <TH>Grup</TH>
              <TH>Status</TH>
              <TH>Model Terpasang</TH>
              <TH className="text-center">WhatsApp</TH>
              <TH className="text-center">Aktif</TH>
              <TH className="text-right">Aksi</TH>
            </THead>
            <TBody>
              {filtered.map((c) => {
                const t = cameraTone(c.status, c.enabled);
                return (
                  <TR key={c.id}>
                    <TD>
                      <div className="flex items-center gap-2">
                        <StatusDot tone={t.tone} ping={c.status === "online" && c.enabled} />
                        <div>
                          <div className="text-sm font-medium">{c.name}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">{c.stream_key}</div>
                        </div>
                      </div>
                    </TD>
                    <TD className="text-muted-foreground">{c.group_name ?? "—"}</TD>
                    <TD>
                      <Badge tone={t.tone}>{t.label}</Badge>
                    </TD>
                    <TD>
                      {c.assigned_model_name ? (
                        <Badge tone="primary">{c.assigned_model_name}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">tanpa model</span>
                      )}
                    </TD>
                    <TD className="text-center tabular text-muted-foreground">
                      {c.whatsapp_targets?.length ?? 0}
                    </TD>
                    <TD className="text-center">
                      <button
                        onClick={() => toggleEnabled(c)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          c.enabled ? "bg-primary" : "bg-muted"
                        }`}
                        title={c.enabled ? "Nonaktifkan" : "Aktifkan"}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            c.enabled ? "translate-x-4" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </TD>
                    <TD>
                      <div className="flex items-center justify-end gap-1">
                        {c.stream_url && (
                          <Button variant="ghost" size="icon" title="Live stream" onClick={() => setWatching(c)}>
                            <Video className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" title="Assign model" onClick={() => setAssigning(c)}>
                          <Link2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Edit" onClick={() => setEditing(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Hapus"
                          className="hover:text-danger"
                          onClick={() => setDeleting(c)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>

      {editing && (
        <CameraForm
          camera={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refetch();
          }}
        />
      )}

      {assigning && (
        <AssignModal
          camera={assigning}
          models={models.data ?? []}
          onClose={() => setAssigning(null)}
          onSaved={() => {
            setAssigning(null);
            refetch();
          }}
        />
      )}

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={busy}
        title="Hapus kamera?"
        message={`Kamera "${deleting?.name}" beserta assignment-nya akan dihapus. Tindakan ini tidak bisa dibatalkan.`}
      />

      {watching?.stream_url && (
        <LiveStreamModal camera={watching} onClose={() => setWatching(null)} />
      )}
    </div>
  );
}

/** HLS (.m3u8) player: native on Safari/iOS, hls.js elsewhere. */
function HlsPlayer({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    setErr(null);

    // Safari / iOS play HLS natively — no library needed.
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return;
    }

    let cancelled = false;
    let hls: { destroy: () => void } | null = null;
    import("hls.js")
      .then(({ default: Hls }) => {
        if (cancelled || !ref.current) return;
        if (!Hls.isSupported()) {
          setErr("Browser tidak mendukung pemutaran HLS.");
          return;
        }
        const inst = new Hls({ enableWorker: true });
        inst.on(Hls.Events.ERROR, (_evt, data) => {
          if (data?.fatal) setErr("Gagal memuat stream (URL/CORS/offline).");
        });
        inst.loadSource(src);
        inst.attachMedia(ref.current);
        hls = inst;
      })
      .catch(() => setErr("Gagal memuat pemutar HLS."));

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [src]);

  return (
    <div className="space-y-2">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={ref}
        controls
        autoPlay
        muted
        playsInline
        className="aspect-video w-full rounded-lg border border-border bg-black"
      />
      {err && <p className="text-[11px] text-danger">{err}</p>}
    </div>
  );
}

function LiveStreamModal({ camera, onClose }: { camera: Camera; onClose: () => void }) {
  return (
    <Modal
      open
      onClose={onClose}
      title={`Live · ${camera.name}`}
      description="Stream langsung kamera (HLS)."
    >
      {camera.stream_url ? (
        <HlsPlayer src={camera.stream_url} />
      ) : (
        <p className="text-sm text-muted-foreground">Kamera ini tidak memiliki URL stream.</p>
      )}
      {camera.stream_url && (
        <p className="mt-2 break-all font-mono text-[10px] text-muted-foreground">{camera.stream_url}</p>
      )}
    </Modal>
  );
}

function CameraForm({
  camera,
  onClose,
  onSaved,
}: {
  camera: Camera | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const editing = !!camera;
  const [name, setName] = useState(camera?.name ?? "");
  const [groupName, setGroupName] = useState(camera?.group_name ?? "");
  const [streamKey, setStreamKey] = useState(camera?.stream_key ?? "");
  const [wa, setWa] = useState((camera?.whatsapp_targets ?? []).join(", "));
  const [enabled, setEnabled] = useState(camera?.enabled ?? true);
  const [advanced, setAdvanced] = useState(false);
  const [aoi, setAoi] = useState(JSON.stringify(camera?.aoi ?? {}, null, 2));
  // Rules sebagai field ramah (bukan JSON mentah). Key lain yang tak dikenal tetap dipertahankan.
  const initialRules = (camera?.rules ?? {}) as Record<string, unknown>;
  const [labels, setLabels] = useState(
    Array.isArray(initialRules.labels) ? (initialRules.labels as string[]).join(", ") : ""
  );
  const [sourceUrl, setSourceUrl] = useState(
    typeof initialRules.source_url === "string" ? initialRules.source_url : ""
  );
  const [streamFe, setStreamFe] = useState(
    typeof initialRules.stream_fe === "string" ? initialRules.stream_fe : ""
  );
  const [rulesRest] = useState<Record<string, unknown>>(() => {
    const { labels: _l, source_url: _s, stream_fe: _f, ...rest } =
      (camera?.rules ?? {}) as Record<string, unknown>;
    return rest;
  });
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim() || !streamKey.trim()) {
      toast.error("Nama dan stream key wajib diisi.");
      return;
    }
    let aoiObj = {};
    try {
      aoiObj = JSON.parse(aoi || "{}");
    } catch {
      toast.error("AOI bukan JSON yang valid.");
      return;
    }
    // Rules dibangun dari field ramah + pertahankan key lain yang tak disurface.
    const rulesObj: Record<string, unknown> = { ...rulesRest };
    const labelList = toClassList(labels);
    if (labelList.length) rulesObj.labels = labelList;
    const su = sourceUrl.trim();
    if (su) rulesObj.source_url = su;
    const sf = streamFe.trim();
    if (sf) rulesObj.stream_fe = sf;

    const payload = {
      name: name.trim(),
      group_name: groupName.trim() || null,
      stream_key: streamKey.trim(),
      whatsapp_targets: toClassList(wa),
      enabled,
      aoi: aoiObj,
      rules: rulesObj,
    };
    setBusy(true);
    try {
      if (editing && camera) {
        await api.patch(`cameras/${camera.id}`, payload);
        toast.success("Kamera diperbarui.");
      } else {
        await api.post("cameras", payload);
        toast.success("Kamera ditambahkan.");
      }
      onSaved();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.detail : "Gagal menyimpan kamera.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? `Edit Kamera · ${camera?.name}` : "Tambah Kamera"}
      description="Kamera akan dipetakan ke stream_key pada engine deteksi."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button size="sm" onClick={submit} loading={busy}>
            {editing ? "Simpan" : "Tambah"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nama" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="gate-1" />
          </Field>
          <Field label="Grup">
            <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="north" />
          </Field>
        </div>
        <Field label="Stream key" required hint="Kunci stream RTSP/engine (mis. example_cam_01).">
          <Input value={streamKey} onChange={(e) => setStreamKey(e.target.value)} placeholder="example_cam_01" />
        </Field>
        <Field label="Target WhatsApp" hint="Nomor tujuan alert, pisahkan dengan koma.">
          <Input value={wa} onChange={(e) => setWa(e.target.value)} placeholder="+628123..., +628456..." />
        </Field>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 accent-[hsl(var(--primary))]"
          />
          Aktifkan kamera
        </label>

        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          className="text-[11px] font-medium text-primary hover:underline"
        >
          {advanced ? "Sembunyikan" : "Tampilkan"} pengaturan lanjutan (deteksi & stream)
        </button>
        {advanced && (
          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
            <Field label="Label deteksi" hint="Kelas objek yang dideteksi, pisahkan dengan koma.">
              <Input value={labels} onChange={(e) => setLabels(e.target.value)} placeholder="car, person" />
            </Field>
            <Field label="Source URL (RTSP)" hint="Sumber stream untuk engine deteksi.">
              <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="rtsp://…" />
            </Field>
            <Field label="Stream URL FE (HLS)" hint="Link .m3u8 untuk ditonton di dashboard. Kosongkan bila tak ada.">
              <Input value={streamFe} onChange={(e) => setStreamFe(e.target.value)} placeholder="https://…/stream.m3u8" />
            </Field>
            <Field label="AOI (JSON)" hint="Area of Interest — poligon, format JSON.">
              <Textarea value={aoi} onChange={(e) => setAoi(e.target.value)} rows={4} />
            </Field>
          </div>
        )}
      </div>
    </Modal>
  );
}

function AssignModal({
  camera,
  models,
  onClose,
  onSaved,
}: {
  camera: Camera;
  models: Model[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const ready = models.filter((m) => m.status === "ready");
  const [modelId, setModelId] = useState(camera.assigned_model_id ?? ready[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  async function assign() {
    if (!modelId) {
      toast.error("Pilih model terlebih dahulu.");
      return;
    }
    setBusy(true);
    try {
      await api.put(`assignments/${camera.id}`, { model_id: modelId });
      toast.success(`Model dipasang ke ${camera.name}.`);
      onSaved();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.detail : "Gagal memasang model.");
    } finally {
      setBusy(false);
    }
  }

  async function unassign() {
    setBusy(true);
    try {
      await api.del(`assignments/${camera.id}`);
      toast.success(`Model dilepas dari ${camera.name}.`);
      onSaved();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.detail : "Gagal melepas model.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Assign Model · ${camera.name}`}
      description="Model yang dipasang akan dipakai engine untuk kamera ini."
      size="sm"
      footer={
        <>
          {camera.assigned_model_id && (
            <Button variant="danger-outline" size="sm" onClick={unassign} loading={busy}>
              <Unlink className="h-4 w-4" /> Lepas
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button size="sm" onClick={assign} loading={busy}>
            Pasang
          </Button>
        </>
      }
    >
      <Field label="Model (status ready)">
        <Select value={modelId} onChange={(e) => setModelId(e.target.value)}>
          <option value="">— pilih model —</option>
          {ready.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} · {toClassList(m.classes).join(", ")}
            </option>
          ))}
        </Select>
      </Field>
      {ready.length === 0 && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Belum ada model berstatus ready. Latih & promosikan model dahulu di menu Training.
        </p>
      )}
      {camera.assigned_model_name && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          Saat ini terpasang: <span className="font-medium text-foreground">{camera.assigned_model_name}</span>
        </p>
      )}
    </Modal>
  );
}
