import type { AoiZone } from "@/lib/hcc/types";

// warna per-zona (HSL triple, dipakai apa adanya via hsl())
const ZONE_COLORS = ["199 89% 55%", "152 62% 45%", "38 92% 55%", "265 80% 65%", "0 72% 60%", "180 70% 45%"];
export const zoneColor = (i: number) => `hsl(${ZONE_COLORS[i % ZONE_COLORS.length]})`;
export const ptsStr = (poly: number[][]) => poly.map(([x, y]) => `${x},${y}`).join(" ");

/**
 * SVG overlay poligon zona AoI (read-only). Diposisikan absolute mengisi
 * kontainer relatif induknya; koordinat ternormalisasi 0..1.
 */
export function AoiOverlay({ zones }: { zones: AoiZone[] }) {
  if (!zones?.length) return null;
  return (
    <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
      {zones.map((z, i) => (
        <polygon
          key={i}
          points={ptsStr(z.polygon)}
          fill={zoneColor(i)}
          fillOpacity={0.18}
          stroke={zoneColor(i)}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
