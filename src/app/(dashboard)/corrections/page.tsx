"use client";

import { useState } from "react";
import { Upload, RefreshCw, Trash2, PencilRuler, X, FileUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select, Field } from "@/components/ui/input";
import { Table, THead, TBody, TH, TD, TR } from "@/components/ui/table";
import { Modal, ConfirmModal } from "@/components/ui/modal";
import { LoadingBlock, EmptyState, ErrorState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { useHcc, api, ApiError } from "@/lib/hcc/client";
import { formatDateTime, toClassList } from "@/lib/utils";
import type { Correction, Model, Camera, Annotation } from "@/lib/hcc/types";

export default function CorrectionsPage() {
  const [model, setModel] = useState("");
  const [consumed, setConsumed] = useState("");
  const { data, loading, error, refetch } = useHcc<Correction[]>("corrections", {
    query: { model_name: model, consumed, limit: 100 },
  });
  const models = useHcc<Model[]>("models");
  const cameras = useHcc<Camera[]>("cameras");
  const toast = useToast();

  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<Correction | null>(null);
  const [busy, setBusy] = useState(false);

  const corrections = data ?? [];
  const pending = corrections.filter((c) => !c.consumed).length;

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.del(`corrections/${deleting.id}`);
      toast.success("Koreksi dihapus.");
      setDeleting(null);
      refetch();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.detail : "Gagal menghapus koreksi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {pending > 0 && (
          <Badge tone="sky" dot>
            {pending} belum dikonsumsi
          </Badge>
        )}
        <div className="flex-1" />
        <Select value={model} onChange={(e) => setModel(e.target.value)} className="w-40">
          <option value="">Semua model</option>
          {(models.data ?? []).map((m) => (
            <option key={m.id} value={m.name}>
              {m.name}
            </option>
          ))}
        </Select>
        <Select value={consumed} onChange={(e) => setConsumed(e.target.value)} className="w-40">
          <option value="">Semua</option>
          <option value="false">Belum dikonsumsi</option>
          <option value="true">Sudah dikonsumsi</option>
        </Select>
        <Button variant="outline" size="icon" onClick={refetch} title="Muat ulang">
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button onClick={() => setUploading(true)}>
          <Upload className="h-4 w-4" /> Upload Koreksi
        </Button>
      </div>

      <Card>
        {loading && corrections.length === 0 ? (
          <LoadingBlock rows={5} label="Memuat koreksi…" />
        ) : error ? (
          <ErrorState message={error.detail} onRetry={refetch} />
        ) : corrections.length === 0 ? (
          <EmptyState
            title="Belum ada koreksi"
            hint="Koreksi anotasi dari halaman Deteksi, atau upload gambar beranotasi di sini."
            icon={PencilRuler}
            action={
              <Button size="sm" onClick={() => setUploading(true)}>
                <Upload className="h-4 w-4" /> Upload Koreksi
              </Button>
            }
          />
        ) : (
          <Table>
            <THead>
              <TH>Model</TH>
              <TH>Kamera</TH>
              <TH>Anotasi</TH>
              <TH>Sumber</TH>
              <TH>Dari Deteksi</TH>
              <TH>Status</TH>
              <TH>Dibuat</TH>
              <TH className="text-right">Aksi</TH>
            </THead>
            <TBody>
              {corrections.map((c) => (
                <TR key={c.id}>
                  <TD className="font-medium">{c.model_name}</TD>
                  <TD className="text-muted-foreground">{c.camera_name ?? "—"}</TD>
                  <TD>
                    <div className="flex max-w-[220px] flex-wrap gap-1">
                      {c.annotations?.slice(0, 3).map((a, i) => (
                        <Badge key={i} tone="muted">
                          {a.class}
                        </Badge>
                      ))}
                      {(c.annotations?.length ?? 0) > 3 && (
                        <Badge tone="muted">+{c.annotations.length - 3}</Badge>
                      )}
                    </div>
                  </TD>
                  <TD>
                    <Badge tone={c.source === "human" ? "primary" : "muted"}>{c.source}</Badge>
                  </TD>
                  <TD className="tabular text-muted-foreground">
                    {c.detection_id ? `#${c.detection_id}` : "—"}
                  </TD>
                  <TD>
                    <Badge tone={c.consumed ? "success" : "sky"}>
                      {c.consumed ? "Dikonsumsi" : "Menunggu"}
                    </Badge>
                  </TD>
                  <TD className="text-xs text-muted-foreground">{formatDateTime(c.created_at)}</TD>
                  <TD>
                    <div className="flex justify-end">
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
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {uploading && (
        <UploadCorrectionModal
          models={models.data ?? []}
          cameras={cameras.data ?? []}
          onClose={() => setUploading(false)}
          onSaved={() => {
            setUploading(false);
            refetch();
          }}
        />
      )}

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={busy}
        title="Hapus koreksi?"
        message="Koreksi ini akan dihapus dari antrean data latih."
      />
    </div>
  );
}

function UploadCorrectionModal({
  models,
  cameras,
  onClose,
  onSaved,
}: {
  models: Model[];
  cameras: Camera[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [modelName, setModelName] = useState(models[0]?.name ?? "");
  const [cameraName, setCameraName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([
    { class: "", bbox: [0.5, 0.5, 0.2, 0.3] },
  ]);
  const [busy, setBusy] = useState(false);

  const classes = toClassList(models.find((m) => m.name === modelName)?.classes ?? []);

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
    if (!modelName.trim() || !file) {
      toast.error("Model dan file gambar wajib diisi.");
      return;
    }
    const clean = annotations.filter((a) => a.class.trim());
    if (clean.length === 0) {
      toast.error("Tambahkan minimal satu anotasi berkelas.");
      return;
    }
    const form = new FormData();
    form.set("model_name", modelName.trim());
    if (cameraName) form.set("camera_name", cameraName);
    form.set("source", "human");
    form.set("annotations", JSON.stringify(clean));
    form.set("file", file);
    setBusy(true);
    try {
      await api.postForm("corrections/upload", form);
      toast.success("Koreksi diupload.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.detail : "Gagal upload koreksi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Upload Koreksi"
      description="Unggah gambar beranotasi manual sebagai data latih baru."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button size="sm" onClick={submit} loading={busy}>
            <Upload className="h-4 w-4" /> Upload
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Model" required>
            <Select value={modelName} onChange={(e) => setModelName(e.target.value)}>
              <option value="">— pilih —</option>
              {models.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Kamera">
            <Select value={cameraName} onChange={(e) => setCameraName(e.target.value)}>
              <option value="">—</option>
              {cameras.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Gambar" required>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-input bg-background px-3 py-3 text-sm transition-colors hover:border-primary/50">
            <FileUp className="h-5 w-5 text-muted-foreground" />
            <span className="flex-1 truncate">
              {file ? (
                <span className="font-medium">{file.name}</span>
              ) : (
                <span className="text-muted-foreground">Pilih gambar (.jpg / .png)…</span>
              )}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </Field>

        <div className="space-y-2">
          <span className="text-[11px] font-medium text-muted-foreground">Anotasi</span>
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
                  {classes.length > 0 ? (
                    <Select
                      value={ann.class}
                      onChange={(e) =>
                        setAnnotations((a) => a.map((x, idx) => (idx === i ? { ...x, class: e.target.value } : x)))
                      }
                    >
                      <option value="">— pilih —</option>
                      {classes.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      value={ann.class}
                      onChange={(e) =>
                        setAnnotations((a) => a.map((x, idx) => (idx === i ? { ...x, class: e.target.value } : x)))
                      }
                      placeholder="person"
                    />
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
            onClick={() => setAnnotations((a) => [...a, { class: "", bbox: [0.5, 0.5, 0.2, 0.3] }])}
          >
            + Tambah objek
          </Button>
        </div>
      </div>
    </Modal>
  );
}
