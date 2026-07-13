// ── Demo store (in-memory) ────────────────────────────────────────────────
// Dipakai proxy saat API asli tidak dapat dihubungi (HCC_DEMO_FALLBACK=true).
// Mendukung CRUD sederhana supaya seluruh console tetap interaktif untuk demo.
// State disimpan di globalThis agar bertahan melewati Hot-Reload dev.

import type {
  Camera,
  Model,
  Assignment,
  TrainingRun,
  Detection,
  Correction,
} from "./types";

export interface MockResult {
  status: number;
  json: unknown;
}

interface DemoDb {
  seq: number;
  detSeq: number;
  cameras: Camera[];
  models: Model[];
  assignments: Assignment[];
  runs: TrainingRun[];
  detections: Detection[];
  corrections: Correction[];
}

const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();
const id = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

function seed(): DemoDb {
  const cameras: Camera[] = [
    cam("gate-1", "north", "example_cam_01", true, "online", ["+628123450001"]),
    cam("gate-2", "north", "example_cam_02", true, "online", []),
    cam("lobby-1", "south", "example_cam_03", true, "degraded", ["+628123450002"]),
    cam("gudang-1", "west", "example_cam_04", true, "online", ["+628123450003"]),
    cam("yard-cam", "east", "example_cam_05", false, "offline", []),
  ];

  const models: Model[] = [
    model("ppe", ["person", "helmet", "vest"], "ready", {
      map50: 0.91, map5095: 0.68, precision: 0.9, recall: 0.87,
    }),
    model("fire-smoke", ["fire", "smoke"], "ready", {
      map50: 0.84, map5095: 0.6, precision: 0.86, recall: 0.79,
    }),
    model("intrusion", ["person"], "training", null),
  ];

  const assignments: Assignment[] = [
    { camera_id: cameras[0].id, camera_name: "gate-1", model_id: models[0].id, model_name: "ppe", assigned_at: ago(4000) },
    { camera_id: cameras[2].id, camera_name: "lobby-1", model_id: models[0].id, model_name: "ppe", assigned_at: ago(3200) },
    { camera_id: cameras[3].id, camera_name: "gudang-1", model_id: models[1].id, model_name: "fire-smoke", assigned_at: ago(1800) },
  ];
  cameras[0].assigned_model_id = models[0].id; cameras[0].assigned_model_name = "ppe";
  cameras[2].assigned_model_id = models[0].id; cameras[2].assigned_model_name = "ppe";
  cameras[3].assigned_model_id = models[1].id; cameras[3].assigned_model_name = "fire-smoke";

  const runs: TrainingRun[] = [
    run("ppe", "promoted", 1, { map50: 0.91, map5095: 0.68, precision: 0.9, recall: 0.87 }, ago(6000), ago(5600)),
    run("fire-smoke", "pending_review", 0.62, { map50: 0.84, map5095: 0.6, precision: 0.86, recall: 0.79 }, ago(220), ago(30)),
    run("intrusion", "running", 0.34, null, ago(45), null),
    run("ppe", "rejected", 1, { map50: 0.71, map5095: 0.49, precision: 0.72, recall: 0.66 }, ago(9000), ago(8600)),
  ];
  runs[2].progress = 0.34;

  const labels = ["person", "helmet", "vest", "no-helmet", "no-vest"];
  const detections: Detection[] = [];
  let detSeq = 1;
  for (let i = 0; i < 46; i++) {
    const label = labels[Math.floor(Math.random() * labels.length)];
    const alert = label.startsWith("no-");
    const camName = cameras[Math.floor(Math.random() * 4)].name;
    detections.push({
      id: detSeq++,
      camera_name: camName,
      model_name: camName === "gudang-1" ? "fire-smoke" : "ppe",
      label,
      confidence: 0.55 + Math.random() * 0.44,
      bbox: [Math.random() * 0.6 + 0.2, Math.random() * 0.6 + 0.2, 0.1 + Math.random() * 0.2, 0.15 + Math.random() * 0.3],
      review_status: i < 8 ? "pending" : Math.random() > 0.5 ? "confirmed" : "pending",
      image_key: `frames/${camName}/${detSeq}.jpg`,
      alert,
      created_at: ago(Math.floor(i * 7 + Math.random() * 6)),
    });
  }
  detections.reverse(); // terbaru dahulu bukan urusan store; list akan sort

  const corrections: Correction[] = [
    {
      id: id("cor"), model_name: "ppe", camera_name: "gate-1", detection_id: 3,
      annotations: [{ class: "helmet", bbox: [0.51, 0.32, 0.12, 0.14] }],
      source: "human", consumed: false, created_at: ago(120),
    },
    {
      id: id("cor"), model_name: "ppe", camera_name: "lobby-1", detection_id: null,
      annotations: [{ class: "vest", bbox: [0.44, 0.55, 0.2, 0.3] }],
      source: "human", consumed: false, created_at: ago(300),
    },
    {
      id: id("cor"), model_name: "fire-smoke", camera_name: "gudang-1", detection_id: 12,
      annotations: [{ class: "smoke", bbox: [0.6, 0.4, 0.25, 0.3] }],
      source: "human", consumed: true, created_at: ago(2600),
    },
  ];

  return { seq: 100, detSeq, cameras, models, assignments, runs, detections, corrections };
}

function cam(
  name: string, group: string, streamKey: string, enabled: boolean,
  status: Camera["status"], wa: string[]
): Camera {
  return {
    id: id("cam"), name, group_name: group, stream_key: streamKey,
    aoi: {}, rules: {}, whatsapp_targets: wa, enabled, status,
    assigned_model_id: null, assigned_model_name: null,
    last_seen: status === "offline" ? ago(240) : ago(Math.floor(Math.random() * 3)),
    created_at: ago(9000), updated_at: ago(120),
  };
}

function model(
  name: string, classes: string[], status: Model["status"],
  metrics: Model["metrics"]
): Model {
  return {
    id: id("mdl"), name, classes, status, version: 1,
    file_key: `models/${name}/best.pt`, size_bytes: 6_200_000 + Math.floor(Math.random() * 4_000_000),
    metrics, created_at: ago(8000), updated_at: ago(600),
  };
}

function run(
  modelName: string, status: TrainingRun["status"], progress: number,
  metrics: TrainingRun["metrics"], started: string, finished: string | null
): TrainingRun {
  return {
    id: id("run"), model_name: modelName, base_model_key: null, status,
    epochs: 100, progress, metrics,
    sample_video_key: finished ? `runs/${modelName}/sample.mp4` : null,
    dataset_size: 800 + Math.floor(Math.random() * 1200),
    created_at: started, started_at: started, finished_at: finished,
    message: status === "failed" ? "CUDA out of memory" : null,
  };
}

// Singleton lewat globalThis (bertahan melewati HMR)
const g = globalThis as unknown as { __hccDemo?: DemoDb };
function db(): DemoDb {
  if (!g.__hccDemo) g.__hccDemo = seed();
  return g.__hccDemo;
}

// ── Router ─────────────────────────────────────────────────────────────────

const ok = (json: unknown, status = 200): MockResult => ({ status, json });
const notFound = (msg = "Not found"): MockResult => ({ status: 404, json: { detail: msg } });

export function mockDispatch(
  method: string,
  segments: string[],
  query: URLSearchParams,
  body: unknown
): MockResult {
  const d = db();
  const [root, a, b, c] = segments;
  const m = method.toUpperCase();

  // System
  if (root === "health") return ok({ status: "ok" });
  if (root === "system" && a === "status") return ok(systemStatus(d));

  // Cameras
  if (root === "cameras") {
    if (!a) {
      if (m === "GET") {
        let list = [...d.cameras];
        const group = query.get("group");
        const enabled = query.get("enabled");
        if (group) list = list.filter((x) => x.group_name === group);
        if (enabled != null) list = list.filter((x) => String(x.enabled) === enabled);
        return ok(list);
      }
      if (m === "POST") return ok(createCamera(d, body), 201);
    } else {
      const camIdx = d.cameras.findIndex((x) => x.id === a || x.name === a);
      if (camIdx < 0) return notFound("Camera tidak ditemukan");
      if (m === "GET") return ok(d.cameras[camIdx]);
      if (m === "PATCH") {
        d.cameras[camIdx] = { ...d.cameras[camIdx], ...(body as object), updated_at: new Date().toISOString() };
        return ok(d.cameras[camIdx]);
      }
      if (m === "DELETE") {
        const [removed] = d.cameras.splice(camIdx, 1);
        d.assignments = d.assignments.filter((x) => x.camera_id !== removed.id);
        return ok({ deleted: removed.id });
      }
    }
  }

  // Assignments
  if (root === "assignments") {
    if (!a) {
      if (m === "GET") return ok(d.assignments);
    } else {
      const cam = d.cameras.find((x) => x.id === a || x.name === a);
      if (!cam) return notFound("Camera tidak ditemukan");
      if (m === "PUT") {
        const modelId = (body as { model_id?: string })?.model_id;
        const model = d.models.find((x) => x.id === modelId || x.name === modelId);
        if (!model) return notFound("Model tidak ditemukan");
        d.assignments = d.assignments.filter((x) => x.camera_id !== cam.id);
        const asg: Assignment = {
          camera_id: cam.id, camera_name: cam.name, model_id: model.id,
          model_name: model.name, assigned_at: new Date().toISOString(),
        };
        d.assignments.push(asg);
        cam.assigned_model_id = model.id; cam.assigned_model_name = model.name;
        return ok(asg);
      }
      if (m === "DELETE") {
        d.assignments = d.assignments.filter((x) => x.camera_id !== cam.id);
        cam.assigned_model_id = null; cam.assigned_model_name = null;
        return ok({ unassigned: cam.id });
      }
    }
  }

  // Models
  if (root === "models") {
    if (a === "upload" && m === "POST") return ok(createModel(d, body), 201);
    if (!a) {
      if (m === "GET") {
        let list = [...d.models];
        const name = query.get("name");
        const status = query.get("status");
        if (name) list = list.filter((x) => x.name.includes(name));
        if (status) list = list.filter((x) => x.status === status);
        return ok(list);
      }
    } else {
      const mi = d.models.findIndex((x) => x.id === a || x.name === a);
      if (mi < 0) return notFound("Model tidak ditemukan");
      if (m === "GET") return ok(d.models[mi]);
      if (m === "DELETE") {
        const [removed] = d.models.splice(mi, 1);
        d.assignments = d.assignments.filter((x) => x.model_id !== removed.id);
        return ok({ deleted: removed.id });
      }
    }
  }

  // Training
  if (root === "training") {
    if (a === "jobs" && m === "POST") {
      const mn = (body as { model_name?: string })?.model_name ?? "model";
      const r = run(mn, "queued", 0, null, new Date().toISOString(), null);
      r.progress = 0;
      d.runs.unshift(r);
      return ok(r, 202);
    }
    if (a === "runs") {
      if (!b) {
        if (m === "GET") {
          let list = [...d.runs];
          const mn = query.get("model_name");
          const status = query.get("status");
          const limit = Number(query.get("limit") ?? 50);
          if (mn) list = list.filter((x) => x.model_name === mn);
          if (status) list = list.filter((x) => x.status === status);
          return ok(list.slice(0, limit));
        }
      } else {
        const ri = d.runs.findIndex((x) => x.id === b);
        if (ri < 0) return notFound("Run tidak ditemukan");
        const rrun = d.runs[ri];
        if (!c && m === "GET") return ok(rrun);
        if (c === "sample-video" && m === "GET")
          return ok({ url: rrun.sample_video_key ? `/frame-placeholder.svg` : "", expires_in: 3600 });
        if (c === "promote" && m === "POST") {
          rrun.status = "promoted"; rrun.finished_at = rrun.finished_at ?? new Date().toISOString();
          const mm = d.models.find((x) => x.name === rrun.model_name);
          if (mm) { mm.status = "ready"; mm.metrics = rrun.metrics ?? mm.metrics; mm.version = (mm.version ?? 1) + 1; }
          return ok(rrun);
        }
        if (c === "reject" && m === "POST") {
          rrun.status = "rejected"; rrun.finished_at = rrun.finished_at ?? new Date().toISOString();
          return ok(rrun);
        }
      }
    }
  }

  // Detections
  if (root === "detections") {
    if (!a) {
      if (m === "GET") {
        let list = [...d.detections].sort((x, y) => y.created_at.localeCompare(x.created_at));
        const camera = query.get("camera_name");
        const label = query.get("label");
        const review = query.get("review_status");
        const since = query.get("since");
        const limit = Number(query.get("limit") ?? 100);
        if (camera) list = list.filter((x) => x.camera_name === camera);
        if (label) list = list.filter((x) => x.label === label);
        if (review) list = list.filter((x) => x.review_status === review);
        if (since) list = list.filter((x) => x.created_at >= since);
        return ok(list.slice(0, limit));
      }
    } else {
      const det = d.detections.find((x) => String(x.id) === String(a));
      if (!det) return notFound("Detection tidak ditemukan");
      if (b === "image" && m === "GET")
        return ok({ url: `/frame-placeholder.svg`, expires_in: 3600 });
      if (!b && m === "GET") return ok(det);
    }
  }

  // Corrections
  if (root === "corrections") {
    if (a === "from-detection" && m === "POST") return ok(createCorrection(d, body, "detection"), 201);
    if (a === "upload" && m === "POST") return ok(createCorrection(d, body, "upload"), 201);
    if (!a) {
      if (m === "GET") {
        let list = [...d.corrections].sort((x, y) => y.created_at.localeCompare(x.created_at));
        const mn = query.get("model_name");
        const consumed = query.get("consumed");
        const limit = Number(query.get("limit") ?? 100);
        if (mn) list = list.filter((x) => x.model_name === mn);
        if (consumed != null) list = list.filter((x) => String(x.consumed) === consumed);
        return ok(list.slice(0, limit));
      }
    } else {
      const ci = d.corrections.findIndex((x) => x.id === a);
      if (ci < 0) return notFound("Correction tidak ditemukan");
      if (m === "DELETE") {
        const [removed] = d.corrections.splice(ci, 1);
        return ok({ deleted: removed.id });
      }
    }
  }

  return notFound(`Endpoint demo belum tersedia: ${m} /${segments.join("/")}`);
}

function createCamera(d: DemoDb, body: unknown): Camera {
  const b = (body ?? {}) as Partial<Camera>;
  const cam: Camera = {
    id: id("cam"),
    name: b.name ?? `cam-${d.seq++}`,
    group_name: b.group_name ?? null,
    stream_key: b.stream_key ?? "",
    aoi: b.aoi ?? {},
    rules: b.rules ?? {},
    whatsapp_targets: b.whatsapp_targets ?? [],
    enabled: b.enabled ?? true,
    status: "online",
    assigned_model_id: null, assigned_model_name: null,
    last_seen: new Date().toISOString(),
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
  d.cameras.push(cam);
  return cam;
}

function createModel(d: DemoDb, body: unknown): Model {
  const b = (body ?? {}) as Record<string, unknown>;
  const classesRaw = b.classes;
  const classes = Array.isArray(classesRaw)
    ? (classesRaw as string[])
    : String(classesRaw ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const mdl: Model = {
    id: id("mdl"),
    name: String(b.name ?? `model-${d.seq++}`),
    classes,
    status: (b.status as Model["status"]) ?? "ready",
    version: 1,
    file_key: `models/${b.name ?? "model"}/best.pt`,
    size_bytes: 6_800_000,
    metrics: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
  d.models.push(mdl);
  return mdl;
}

function createCorrection(d: DemoDb, body: unknown, mode: "detection" | "upload"): Correction {
  const b = (body ?? {}) as Record<string, unknown>;
  let annotations: Correction["annotations"] = [];
  const raw = b.annotations;
  try {
    annotations = Array.isArray(raw) ? (raw as Correction["annotations"]) : JSON.parse(String(raw ?? "[]"));
  } catch {
    annotations = [];
  }
  const det = mode === "detection" ? Number(b.detection_id) : null;
  const detObj = det ? d.detections.find((x) => x.id === det) : null;
  const cor: Correction = {
    id: id("cor"),
    model_name: String(b.model_name ?? detObj?.model_name ?? "ppe"),
    camera_name: (b.camera_name as string) ?? detObj?.camera_name ?? null,
    detection_id: det,
    annotations,
    source: String(b.source ?? "human"),
    consumed: false,
    created_at: new Date().toISOString(),
  };
  d.corrections.unshift(cor);
  if (detObj) detObj.review_status = "confirmed";
  return cor;
}

function systemStatus(d: DemoDb) {
  const enabled = d.cameras.filter((x) => x.enabled).length;
  const online = d.cameras.filter((x) => x.status === "online").length;
  const todayStr = new Date().toISOString().slice(0, 10);
  const today = d.detections.filter((x) => x.created_at.slice(0, 10) === todayStr).length;
  const pending = d.detections.filter((x) => x.review_status === "pending").length;
  const busy = d.runs.some((x) => x.status === "running" || x.status === "queued");
  return {
    status: "ok",
    version: "demo-1.0.0",
    uptime_seconds: 3600 * 27 + 1240,
    cameras: { total: d.cameras.length, enabled, online },
    models: { total: d.models.length, ready: d.models.filter((x) => x.status === "ready").length },
    detections: { today: today || d.detections.length, pending_review: pending },
    corrections: { pending: d.corrections.filter((x) => !x.consumed).length },
    worker: { training: busy ? "busy" : "idle", queue: d.runs.filter((x) => x.status === "queued").length },
    storage: { used_bytes: 4_812_000_000, object_count: d.detections.length + d.models.length + 40 },
    services: [
      { name: "api", status: "ok" },
      { name: "database", status: "ok" },
      { name: "object-store", status: "ok" },
      { name: "inference-worker", status: online > 0 ? "ok" : "degraded" },
      { name: "training-worker", status: busy ? "ok" : "ok" },
    ],
  };
}
