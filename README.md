# HCC PLN — CCTV AI Command Center

Dashboard control-plane untuk platform deteksi CCTV AI HCC PLN. Mengkonsumsi
[HCC API](./hcc-api.postman_collection.json) untuk mengelola kamera, model, training,
deteksi, dan koreksi. Tema visual mengikuti `wellness-pln-dashboard` (Next.js 14 + Tailwind,
brand PLN, dark/light).

## Fitur

| Menu | Fungsi |
|------|--------|
| **Overview** | KPI live, grafik deteksi per jam, status kamera, feed deteksi terbaru, distribusi label, pengingat review training |
| **Kamera** | CRUD kamera, toggle aktif, assign/unassign model, target WhatsApp, AOI & rules (JSON) |
| **Model** | Upload model (.pt), lihat kelas & metrik (mAP/precision/recall), hapus |
| **Training** | Antre job training, pantau progress, promote/reject run, sample video |
| **Deteksi** | Galeri live berfilter, overlay bounding-box, buat koreksi dari deteksi |
| **Koreksi** | Daftar & upload koreksi anotasi (data re-training), hapus |
| **Sistem** | Status platform, kesehatan layanan, storage, mode koneksi |

## Arsitektur koneksi

```
Browser ──▶ /api/hcc/*  (route handler Next.js, server-side)
                │  menyuntik header  X-API-Key
                ▼
        HCC_API_URL  (mis. http://localhost:8000 — API lokal teman)
```

- **API key tidak pernah bocor ke browser** — hanya dipakai proxy di server.
- **Tanpa masalah CORS** — semua request se-origin ke Next.js.
- **Mode demo**: bila API tidak dapat dihubungi dan `HCC_DEMO_FALLBACK=true`, proxy
  menyajikan data contoh (in-memory, mendukung CRUD) sehingga console tetap bisa
  didemokan. Banner "Mode Demo" muncul otomatis. Begitu API asli hidup, data langsung
  beralih ke live.

## Menjalankan

```bash
npm install
cp .env.local.example .env.local   # sudah dibuat otomatis
npm run dev                         # http://localhost:3000
```

Login demo: **admin / pln2026**.

## Konfigurasi (`.env.local`)

| Variabel | Arti |
|----------|------|
| `HCC_API_URL` | URL API HCC. Di tempat teman, arahkan ke API lokalnya (mis. `http://192.168.x.x:8000`). |
| `HCC_API_KEY` | Nilai header `X-API-Key`. |
| `HCC_DEMO_FALLBACK` | `true` (default) = fallback demo saat API mati. Set `false` bila API pasti tersedia. |
| `DASHBOARD_USER` / `DASHBOARD_PASS` | Kredensial login dashboard. |

> Saat dipindah ke laptop teman yang sudah dimapping ke API lokalnya, cukup ubah
> `HCC_API_URL` (dan `HCC_API_KEY` bila berbeda). Tidak ada perubahan kode.

## Endpoint yang dipakai

Semua path mengikuti Postman `HCC API`:
`/system/status`, `/health`, `/cameras`, `/assignments/{cameraId}`, `/models`,
`/models/upload`, `/training/jobs`, `/training/runs`, `/training/runs/{id}/promote|reject|sample-video`,
`/detections`, `/detections/{id}/image`, `/corrections`, `/corrections/from-detection`, `/corrections/upload`.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · lucide-react · recharts · next-themes.
