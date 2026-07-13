"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, Link2, Cctv, RefreshCw, Unlink } from "lucide-react";
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
    </div>
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
  const [rules, setRules] = useState(JSON.stringify(camera?.rules ?? {}, null, 2));
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim() || !streamKey.trim()) {
      toast.error("Nama dan stream key wajib diisi.");
      return;
    }
    let aoiObj = {};
    let rulesObj = {};
    try {
      aoiObj = JSON.parse(aoi || "{}");
      rulesObj = JSON.parse(rules || "{}");
    } catch {
      toast.error("AOI / Rules bukan JSON yang valid.");
      return;
    }
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
          {advanced ? "Sembunyikan" : "Tampilkan"} pengaturan lanjutan (AOI & Rules)
        </button>
        {advanced && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="AOI (JSON)">
              <Textarea value={aoi} onChange={(e) => setAoi(e.target.value)} rows={4} />
            </Field>
            <Field label="Rules (JSON)">
              <Textarea value={rules} onChange={(e) => setRules(e.target.value)} rows={4} />
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
