// ── Tipe domain HCC (mengikuti control-plane REST API) ────────────────────

export type CameraStatus = "online" | "offline" | "degraded";

export interface Camera {
  id: string;
  name: string;
  group_name: string | null;
  stream_key: string;
  aoi: Record<string, unknown>;
  rules: Record<string, unknown>;
  whatsapp_targets: string[];
  enabled: boolean;
  /** Status stream — turunan/telemetri (bila API menyediakan). */
  status?: CameraStatus;
  /** Model yang sedang terpasang (dari assignment). */
  assigned_model_id?: string | null;
  assigned_model_name?: string | null;
  /** URL stream siap-tonton (HLS .m3u8) dari rules.stream_fe — opsional. */
  stream_url?: string | null;
  last_seen?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type ModelStatus = "ready" | "training" | "draft" | "archived" | "failed";

export interface Model {
  id: string;
  name: string;
  classes: string[];
  status: ModelStatus;
  version?: number;
  file_key?: string | null;
  size_bytes?: number | null;
  /** Metrik ringkas hasil training terbaik (opsional). */
  metrics?: ModelMetrics | null;
  created_at?: string;
  updated_at?: string;
}

export interface ModelMetrics {
  map50?: number;
  map5095?: number;
  precision?: number;
  recall?: number;
}

export interface Assignment {
  camera_id: string;
  camera_name?: string;
  model_id: string;
  model_name?: string;
  assigned_at?: string;
}

export type RunStatus =
  | "queued"
  | "running"
  | "pending_review"
  | "promoted"
  | "rejected"
  | "failed";

export interface TrainingRun {
  id: string;
  model_name: string;
  base_model_key?: string | null;
  status: RunStatus;
  epochs?: number | null;
  progress?: number; // 0..1
  metrics?: ModelMetrics | null;
  sample_video_key?: string | null;
  dataset_size?: number | null;
  created_at?: string;
  started_at?: string | null;
  finished_at?: string | null;
  message?: string | null;
}

export type ReviewStatus = "pending" | "confirmed" | "rejected";

export interface Detection {
  id: number;
  camera_name: string;
  model_name?: string | null;
  label: string;
  confidence: number; // 0..1
  bbox?: [number, number, number, number]; // cx,cy,w,h (normalized)
  review_status: ReviewStatus;
  image_key?: string | null;
  /** true bila deteksi memicu alert/notifikasi (mis. no-helmet). */
  alert?: boolean;
  created_at: string;
}

export interface Annotation {
  class: string;
  bbox: [number, number, number, number];
}

export interface Correction {
  id: string;
  model_name: string;
  camera_name?: string | null;
  detection_id?: number | null;
  annotations: Annotation[];
  source: "human" | "auto" | string;
  consumed: boolean;
  created_at: string;
}

export interface SystemStatus {
  status: "ok" | "degraded" | "down" | string;
  version?: string;
  uptime_seconds?: number;
  cameras: { total: number; enabled: number; online?: number };
  models: { total: number; ready: number };
  detections: { today: number; pending_review: number };
  corrections?: { pending: number };
  worker?: { training: "idle" | "busy" | string; queue: number };
  storage?: { used_bytes?: number; object_count?: number };
  services?: { name: string; status: "ok" | "down" | "degraded" | string }[];
}

export interface PresignedUrl {
  url: string;
  expires_in?: number;
}

/** Sumber data respons: dari API asli, atau fallback demo. */
export type DataSource = "live" | "demo" | "error";
