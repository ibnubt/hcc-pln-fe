import type { Tone } from "@/components/ui/badge";
import type { CameraStatus, ModelStatus, RunStatus, ReviewStatus } from "./types";

export function cameraTone(s?: CameraStatus | null, enabled = true): { tone: Tone; label: string } {
  if (!enabled) return { tone: "muted", label: "Nonaktif" };
  switch (s) {
    case "online":
      return { tone: "success", label: "Online" };
    case "degraded":
      return { tone: "warning", label: "Degraded" };
    case "offline":
      return { tone: "danger", label: "Offline" };
    default:
      return { tone: "muted", label: "—" };
  }
}

export function modelTone(s?: ModelStatus): { tone: Tone; label: string } {
  switch (s) {
    case "ready":
      return { tone: "success", label: "Ready" };
    case "training":
      return { tone: "sky", label: "Training" };
    case "draft":
      return { tone: "muted", label: "Draft" };
    case "archived":
      return { tone: "muted", label: "Archived" };
    case "failed":
      return { tone: "danger", label: "Failed" };
    default:
      return { tone: "muted", label: s ?? "—" };
  }
}

export function runTone(s?: RunStatus): { tone: Tone; label: string } {
  switch (s) {
    case "queued":
      return { tone: "muted", label: "Antre" };
    case "running":
      return { tone: "sky", label: "Berjalan" };
    case "pending_review":
      return { tone: "warning", label: "Menunggu Review" };
    case "promoted":
      return { tone: "success", label: "Dipromosikan" };
    case "rejected":
      return { tone: "danger", label: "Ditolak" };
    case "failed":
      return { tone: "danger", label: "Gagal" };
    default:
      return { tone: "muted", label: s ?? "—" };
  }
}

export function reviewTone(s?: ReviewStatus): { tone: Tone; label: string } {
  switch (s) {
    case "pending":
      return { tone: "warning", label: "Pending" };
    case "confirmed":
      return { tone: "success", label: "Terkonfirmasi" };
    case "rejected":
      return { tone: "danger", label: "Ditolak" };
    default:
      return { tone: "muted", label: s ?? "—" };
  }
}

/** Label yang memicu alert (mis. no-helmet / no-vest / fire / smoke). */
export function isAlertLabel(label: string) {
  return /^no-|fire|smoke|intrus/i.test(label);
}
