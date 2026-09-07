"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`; // m 0-based

function parseISO(v: string) {
  const mt = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || "");
  return mt ? { y: +mt[1], m: +mt[2] - 1, d: +mt[3] } : null;
}
function shiftMonth(v: { y: number; m: number }, delta: number) {
  const total = v.y * 12 + v.m + delta;
  return { y: Math.floor(total / 12), m: ((total % 12) + 12) % 12 };
}

type Mode = "days" | "months" | "years";

export function DatePicker({
  value,
  onChange,
  placeholder = "Pilih tanggal",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("days");
  const wrapRef = useRef<HTMLDivElement>(null);
  const parsed = parseISO(value);

  const now = new Date();
  const todayIso = toISO(now.getFullYear(), now.getMonth(), now.getDate());

  const [view, setView] = useState(() =>
    parsed ? { y: parsed.y, m: parsed.m } : { y: now.getFullYear(), m: now.getMonth() }
  );

  // saat dibuka, reset ke tampilan hari & lompat ke bulan tanggal terpilih
  useEffect(() => {
    if (!open) return;
    setMode("days");
    const p = parseISO(value);
    if (p) setView({ y: p.y, m: p.m });
  }, [open, value]);

  // tutup saat klik di luar / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const cells = useMemo(() => {
    const startDow = new Date(view.y, view.m, 1).getDay(); // 0=Minggu
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
    const out: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(d);
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [view]);

  const yearStart = view.y - (((view.y % 12) + 12) % 12); // blok 12 tahun stabil
  const label = parsed ? `${parsed.d} ${MONTHS_SHORT[parsed.m]} ${parsed.y}` : placeholder;

  const headerTitle =
    mode === "days" ? `${MONTHS[view.m]} ${view.y}` : mode === "months" ? `${view.y}` : `${yearStart} – ${yearStart + 11}`;

  function step(delta: number) {
    if (mode === "days") setView((v) => shiftMonth(v, delta));
    else if (mode === "months") setView((v) => ({ ...v, y: v.y + delta }));
    else setView((v) => ({ ...v, y: v.y + delta * 12 }));
  }

  const cellBtn =
    "grid place-items-center rounded-md text-xs tabular-nums transition-colors";

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-lg border bg-card px-3 text-sm transition-colors",
          open ? "border-primary" : "border-border hover:border-primary/50"
        )}
      >
        <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className={cn("truncate", !parsed && "text-muted-foreground")}>{label}</span>
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1 w-64 rounded-xl border border-border bg-card p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMode((m) => (m === "days" ? "months" : m === "months" ? "years" : "years"))}
              className="rounded-md px-1.5 py-0.5 text-sm font-semibold hover:bg-muted"
              title="Ganti bulan / tahun"
            >
              {headerTitle}
            </button>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => step(-1)}
                className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {mode === "days" && (
            <>
              <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-muted-foreground">
                {DAYS.map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>
              <div className="mt-0.5 grid grid-cols-7 gap-0.5">
                {cells.map((d, i) => {
                  if (d === null) return <span key={i} />;
                  const iso = toISO(view.y, view.m, d);
                  const isSelected = iso === value;
                  const isToday = iso === todayIso;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        onChange(iso);
                        setOpen(false);
                      }}
                      className={cn(
                        cellBtn,
                        "h-8 w-8",
                        isSelected ? "bg-primary font-semibold text-white" : "hover:bg-muted",
                        !isSelected && isToday && "ring-1 ring-inset ring-primary/60 font-semibold text-primary"
                      )}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {mode === "months" && (
            <div className="grid grid-cols-3 gap-1">
              {MONTHS_SHORT.map((mn, m) => {
                const isSelected = !!parsed && parsed.y === view.y && parsed.m === m;
                const isCurrent = now.getFullYear() === view.y && now.getMonth() === m;
                return (
                  <button
                    key={mn}
                    type="button"
                    onClick={() => {
                      setView((v) => ({ ...v, m }));
                      setMode("days");
                    }}
                    className={cn(
                      cellBtn,
                      "h-9",
                      isSelected ? "bg-primary font-semibold text-white" : "hover:bg-muted",
                      !isSelected && isCurrent && "ring-1 ring-inset ring-primary/60 font-semibold text-primary"
                    )}
                  >
                    {mn}
                  </button>
                );
              })}
            </div>
          )}

          {mode === "years" && (
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 12 }, (_, i) => yearStart + i).map((y) => {
                const isSelected = !!parsed && parsed.y === y;
                const isCurrent = now.getFullYear() === y;
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setView((v) => ({ ...v, y }));
                      setMode("months");
                    }}
                    className={cn(
                      cellBtn,
                      "h-9",
                      isSelected ? "bg-primary font-semibold text-white" : "hover:bg-muted",
                      !isSelected && isCurrent && "ring-1 ring-inset ring-primary/60 font-semibold text-primary"
                    )}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="text-xs font-medium text-muted-foreground hover:text-danger"
            >
              Hapus
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(todayIso);
                setOpen(false);
              }}
              className="text-xs font-medium text-primary hover:underline"
            >
              Hari ini
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
