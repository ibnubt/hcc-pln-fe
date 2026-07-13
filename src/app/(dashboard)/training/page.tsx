"use client";

import { useState } from "react";
import {
  Plus,
  RefreshCw,
  GraduationCap,
  Check,
  X,
  Film,
  Info,
  CircleDot,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select, Field } from "@/components/ui/input";
import { Table, THead, TBody, TH, TD, TR } from "@/components/ui/table";
import { Modal, ConfirmModal } from "@/components/ui/modal";
import { LoadingBlock, EmptyState, ErrorState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { useHcc, api, ApiError } from "@/lib/hcc/client";
import { runTone } from "@/lib/hcc/status";
import { formatDateTime, pct, fmt } from "@/lib/utils";
import type { TrainingRun, Model, PresignedUrl } from "@/lib/hcc/types";

export default function TrainingPage() {
  const { data, loading, error, refetch } = useHcc<TrainingRun[]>("training/runs", {
    query: { limit: 50 },
    intervalMs: 10000,
  });
  const models = useHcc<Model[]>("models");
  const toast = useToast();
  const [status, setStatus] = useState("");
  const [enqueue, setEnqueue] = useState(false);
  const [detail, setDetail] = useState<TrainingRun | null>(null);
  const [confirm, setConfirm] = useState<{ run: TrainingRun; action: "promote" | "reject" } | null>(null);
  const [busy, setBusy] = useState(false);

  const runs = (data ?? []).filter((r) => !status || r.status === status);
  const pendingReview = (data ?? []).filter((r) => r.status === "pending_review").length;

  async function openSample(run: TrainingRun) {
    try {
      const { data } = await api.get<PresignedUrl>(`training/runs/${run.id}/sample-video`);
      if (data?.url) window.open(data.url, "_blank");
      else toast.error("Sample video belum tersedia untuk run ini.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.detail : "Gagal mengambil sample video.");
    }
  }

  async function doConfirm() {
    if (!confirm) return;
    setBusy(true);
    try {
      await api.post(`training/runs/${confirm.run.id}/${confirm.action}`);
      toast.success(confirm.action === "promote" ? "Run dipromosikan ke produksi." : "Run ditolak.");
      setConfirm(null);
      refetch();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.detail : "Gagal memproses run.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {pendingReview > 0 && (
          <Badge tone="warning" dot>
            {pendingReview} menunggu review
          </Badge>
        )}
        <div className="flex-1" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44">
          <option value="">Semua status</option>
          <option value="queued">Antre</option>
          <option value="running">Berjalan</option>
          <option value="pending_review">Menunggu Review</option>
          <option value="promoted">Dipromosikan</option>
          <option value="rejected">Ditolak</option>
          <option value="failed">Gagal</option>
        </Select>
        <Button variant="outline" size="icon" onClick={refetch} title="Muat ulang">
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button onClick={() => setEnqueue(true)}>
          <Plus className="h-4 w-4" /> Job Training
        </Button>
      </div>

      <Card>
        {loading && (data ?? []).length === 0 ? (
          <LoadingBlock rows={5} label="Memuat run training…" />
        ) : error ? (
          <ErrorState message={error.detail} onRetry={refetch} />
        ) : runs.length === 0 ? (
          <EmptyState
            title="Belum ada run training"
            hint="Antrekan job training untuk melatih atau memperbarui model."
            icon={GraduationCap}
            action={
              <Button size="sm" onClick={() => setEnqueue(true)}>
                <Plus className="h-4 w-4" /> Job Training
              </Button>
            }
          />
        ) : (
          <Table>
            <THead>
              <TH>Run</TH>
              <TH>Status</TH>
              <TH>Progress</TH>
              <TH>mAP@50</TH>
              <TH>Dataset</TH>
              <TH>Selesai</TH>
              <TH className="text-right">Aksi</TH>
            </THead>
            <TBody>
              {runs.map((r) => {
                const t = runTone(r.status);
                const running = r.status === "running" || r.status === "queued";
                return (
                  <TR key={r.id}>
                    <TD>
                      <div className="text-sm font-medium">{r.model_name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{r.id}</div>
                    </TD>
                    <TD>
                      <Badge tone={t.tone} dot={running}>
                        {t.label}
                      </Badge>
                    </TD>
                    <TD className="w-40">
                      {running ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-pln-sky transition-all"
                              style={{ width: `${Math.round((r.progress ?? 0) * 100)}%` }}
                            />
                          </div>
                          <span className="tabular text-[10px] text-muted-foreground">
                            {Math.round((r.progress ?? 0) * 100)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TD>
                    <TD className="tabular">{r.metrics?.map50 != null ? pct(r.metrics.map50) : "—"}</TD>
                    <TD className="tabular text-muted-foreground">
                      {r.dataset_size != null ? fmt(r.dataset_size) : "—"}
                    </TD>
                    <TD className="text-xs text-muted-foreground">{formatDateTime(r.finished_at)}</TD>
                    <TD>
                      <div className="flex items-center justify-end gap-1">
                        {r.sample_video_key && (
                          <Button variant="ghost" size="icon" title="Sample video" onClick={() => openSample(r)}>
                            <Film className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" title="Detail" onClick={() => setDetail(r)}>
                          <Info className="h-4 w-4" />
                        </Button>
                        {r.status === "pending_review" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Promosikan"
                              className="text-[hsl(var(--success))]"
                              onClick={() => setConfirm({ run: r, action: "promote" })}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Tolak"
                              className="hover:text-danger"
                              onClick={() => setConfirm({ run: r, action: "reject" })}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>

      {enqueue && (
        <EnqueueModal
          models={models.data ?? []}
          onClose={() => setEnqueue(false)}
          onSaved={() => {
            setEnqueue(false);
            refetch();
          }}
        />
      )}

      {detail && <RunDetail run={detail} onClose={() => setDetail(null)} onSample={() => openSample(detail)} />}

      <ConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={doConfirm}
        loading={busy}
        danger={confirm?.action === "reject"}
        confirmLabel={confirm?.action === "promote" ? "Promosikan" : "Tolak"}
        title={confirm?.action === "promote" ? "Promosikan run?" : "Tolak run?"}
        message={
          confirm?.action === "promote"
            ? `Model "${confirm?.run.model_name}" hasil run ini akan dijadikan versi produksi (ready).`
            : `Run "${confirm?.run.model_name}" akan ditolak dan tidak dipromosikan.`
        }
      />
    </div>
  );
}

function EnqueueModal({
  models,
  onClose,
  onSaved,
}: {
  models: Model[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [modelName, setModelName] = useState(models[0]?.name ?? "");
  const [baseKey, setBaseKey] = useState("");
  const [epochs, setEpochs] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!modelName.trim()) {
      toast.error("Nama model wajib diisi.");
      return;
    }
    setBusy(true);
    try {
      await api.post("training/jobs", {
        model_name: modelName.trim(),
        base_model_key: baseKey.trim() || null,
        epochs: epochs ? Number(epochs) : null,
      });
      toast.success("Job training diantrekan.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.detail : "Gagal mengantre job.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Job Training Baru"
      description="Job akan mengumpulkan koreksi terbaru sebagai data latih untuk model ini."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button size="sm" onClick={submit} loading={busy}>
            Antrekan
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Nama model" required hint="Model target yang akan dilatih/diperbarui.">
          <Input
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            placeholder="ppe"
            list="model-names"
          />
          <datalist id="model-names">
            {models.map((m) => (
              <option key={m.id} value={m.name} />
            ))}
          </datalist>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Base model key" hint="Kosongkan untuk default.">
            <Input value={baseKey} onChange={(e) => setBaseKey(e.target.value)} placeholder="opsional" />
          </Field>
          <Field label="Epochs" hint="Kosongkan untuk default.">
            <Input
              type="number"
              value={epochs}
              onChange={(e) => setEpochs(e.target.value)}
              placeholder="auto"
              min={1}
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

function RunDetail({
  run,
  onClose,
  onSample,
}: {
  run: TrainingRun;
  onClose: () => void;
  onSample: () => void;
}) {
  const m = run.metrics;
  const t = runTone(run.status);
  const rows: [string, string][] = [
    ["mAP@50", m?.map50 != null ? pct(m.map50, 1) : "—"],
    ["mAP@50-95", m?.map5095 != null ? pct(m.map5095, 1) : "—"],
    ["Precision", m?.precision != null ? pct(m.precision, 1) : "—"],
    ["Recall", m?.recall != null ? pct(m.recall, 1) : "—"],
  ];
  return (
    <Modal
      open
      onClose={onClose}
      title={`Run · ${run.model_name}`}
      description={run.id}
      footer={
        run.sample_video_key ? (
          <Button variant="outline" size="sm" onClick={onSample}>
            <Film className="h-4 w-4" /> Sample video
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge tone={t.tone}>{t.label}</Badge>
          {run.epochs != null && (
            <span className="text-xs text-muted-foreground">
              <CircleDot className="mr-1 inline h-3 w-3" />
              {run.epochs} epochs
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {rows.map(([k, v]) => (
            <div key={k} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
              <div className="tabular text-sm font-semibold">{v}</div>
            </div>
          ))}
        </div>
        {run.message && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[12px] text-danger">
            {run.message}
          </div>
        )}
        <div className="space-y-1 text-[11px] text-muted-foreground">
          <div>
            <span className="text-foreground">Dataset:</span>{" "}
            {run.dataset_size != null ? `${fmt(run.dataset_size)} sampel` : "—"}
          </div>
          <div>
            <span className="text-foreground">Dimulai:</span> {formatDateTime(run.started_at)}
          </div>
          <div>
            <span className="text-foreground">Selesai:</span> {formatDateTime(run.finished_at)}
          </div>
        </div>
      </div>
    </Modal>
  );
}
