"use client";

import { useState } from "react";
import { Upload, Search, Trash2, BrainCircuit, RefreshCw, FileUp, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select, Field } from "@/components/ui/input";
import { Table, THead, TBody, TH, TD, TR } from "@/components/ui/table";
import { Modal, ConfirmModal } from "@/components/ui/modal";
import { LoadingBlock, EmptyState, ErrorState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { useHcc, api, ApiError } from "@/lib/hcc/client";
import { modelTone } from "@/lib/hcc/status";
import { toClassList, formatDateTime, pct } from "@/lib/utils";
import type { Model } from "@/lib/hcc/types";

function fmtSize(bytes?: number | null) {
  if (!bytes) return "—";
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${(bytes / 1e3).toFixed(0)} KB`;
}

export default function ModelsPage() {
  const { data, loading, error, refetch } = useHcc<Model[]>("models");
  const toast = useToast();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const [detail, setDetail] = useState<Model | null>(null);
  const [deleting, setDeleting] = useState<Model | null>(null);
  const [busy, setBusy] = useState(false);

  const models = data ?? [];
  const filtered = models.filter(
    (m) => (!q || m.name.toLowerCase().includes(q.toLowerCase())) && (!status || m.status === status)
  );

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.del(`models/${deleting.id}`);
      toast.success(`Model ${deleting.name} dihapus.`);
      setDeleting(null);
      refetch();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.detail : "Gagal menghapus model.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama model…" className="pl-9" />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
          <option value="">Semua status</option>
          <option value="ready">Ready</option>
          <option value="training">Training</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </Select>
        <Button variant="outline" size="icon" onClick={refetch} title="Muat ulang">
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button onClick={() => setUploading(true)}>
          <Upload className="h-4 w-4" /> Upload Model
        </Button>
      </div>

      <Card>
        {loading && models.length === 0 ? (
          <LoadingBlock rows={5} label="Memuat model…" />
        ) : error ? (
          <ErrorState message={error.detail} onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={models.length === 0 ? "Belum ada model" : "Tidak ada yang cocok"}
            hint={models.length === 0 ? "Upload bobot model (.pt) untuk mulai mendeteksi." : undefined}
            icon={BrainCircuit}
            action={
              models.length === 0 ? (
                <Button size="sm" onClick={() => setUploading(true)}>
                  <Upload className="h-4 w-4" /> Upload Model
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <THead>
              <TH>Model</TH>
              <TH>Kelas</TH>
              <TH>Status</TH>
              <TH>mAP@50</TH>
              <TH>Ukuran</TH>
              <TH>Dibuat</TH>
              <TH className="text-right">Aksi</TH>
            </THead>
            <TBody>
              {filtered.map((m) => {
                const t = modelTone(m.status);
                const classes = toClassList(m.classes);
                return (
                  <TR key={m.id}>
                    <TD>
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <BrainCircuit className="h-3.5 w-3.5" />
                        </span>
                        <div>
                          <div className="text-sm font-medium">{m.name}</div>
                          <div className="text-[10px] text-muted-foreground">v{m.version ?? 1}</div>
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <div className="flex max-w-[220px] flex-wrap gap-1">
                        {classes.slice(0, 4).map((c) => (
                          <Badge key={c} tone="muted">
                            {c}
                          </Badge>
                        ))}
                        {classes.length > 4 && <Badge tone="muted">+{classes.length - 4}</Badge>}
                      </div>
                    </TD>
                    <TD>
                      <Badge tone={t.tone}>{t.label}</Badge>
                    </TD>
                    <TD className="tabular">{m.metrics?.map50 != null ? pct(m.metrics.map50) : "—"}</TD>
                    <TD className="tabular text-muted-foreground">{fmtSize(m.size_bytes)}</TD>
                    <TD className="text-xs text-muted-foreground">{formatDateTime(m.created_at)}</TD>
                    <TD>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" title="Detail" onClick={() => setDetail(m)}>
                          <Info className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Hapus"
                          className="hover:text-danger"
                          onClick={() => setDeleting(m)}
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

      {uploading && (
        <UploadModal
          onClose={() => setUploading(false)}
          onSaved={() => {
            setUploading(false);
            refetch();
          }}
        />
      )}

      {detail && <DetailModal model={detail} onClose={() => setDetail(null)} />}

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={busy}
        title="Hapus model?"
        message={`Model "${deleting?.name}" akan dihapus dan dilepas dari semua kamera. Lanjutkan?`}
      />
    </div>
  );
}

function UploadModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [classes, setClasses] = useState("");
  const [status, setStatus] = useState("ready");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim() || !classes.trim() || !file) {
      toast.error("Nama, kelas, dan file model wajib diisi.");
      return;
    }
    const form = new FormData();
    form.set("name", name.trim());
    form.set("classes", toClassList(classes).join(","));
    form.set("status", status);
    form.set("file", file);
    setBusy(true);
    try {
      await api.postForm("models/upload", form);
      toast.success("Model berhasil diupload.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.detail : "Gagal upload model.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Upload Model"
      description="Unggah bobot model deteksi (mis. best.pt) beserta daftar kelas."
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
          <Field label="Nama" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ppe" />
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ready">ready</option>
              <option value="draft">draft</option>
            </Select>
          </Field>
        </div>
        <Field label="Kelas" required hint="Pisahkan dengan koma (mis. person,helmet,vest).">
          <Input value={classes} onChange={(e) => setClasses(e.target.value)} placeholder="person,helmet,vest" />
        </Field>
        <Field label="File model" required hint="Format .pt / .onnx.">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-input bg-background px-3 py-3 text-sm transition-colors hover:border-primary/50">
            <FileUp className="h-5 w-5 text-muted-foreground" />
            <span className="flex-1 truncate">
              {file ? (
                <span className="font-medium">{file.name}</span>
              ) : (
                <span className="text-muted-foreground">Pilih file model…</span>
              )}
            </span>
            <input
              type="file"
              className="hidden"
              accept=".pt,.onnx,.engine,.pth"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </Field>
      </div>
    </Modal>
  );
}

function DetailModal({ model, onClose }: { model: Model; onClose: () => void }) {
  const m = model.metrics;
  const rows: [string, string][] = [
    ["mAP@50", m?.map50 != null ? pct(m.map50, 1) : "—"],
    ["mAP@50-95", m?.map5095 != null ? pct(m.map5095, 1) : "—"],
    ["Precision", m?.precision != null ? pct(m.precision, 1) : "—"],
    ["Recall", m?.recall != null ? pct(m.recall, 1) : "—"],
  ];
  return (
    <Modal open onClose={onClose} title={`Model · ${model.name}`} size="sm">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1">
          {toClassList(model.classes).map((c) => (
            <Badge key={c} tone="primary">
              {c}
            </Badge>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {rows.map(([k, v]) => (
            <div key={k} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
              <div className="tabular text-sm font-semibold">{v}</div>
            </div>
          ))}
        </div>
        <div className="space-y-1 text-[11px] text-muted-foreground">
          <div>
            <span className="text-foreground">File:</span>{" "}
            <span className="font-mono">{model.file_key ?? "—"}</span>
          </div>
          <div>
            <span className="text-foreground">Dibuat:</span> {formatDateTime(model.created_at)}
          </div>
        </div>
      </div>
    </Modal>
  );
}
