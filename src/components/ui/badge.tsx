import { cn } from "@/lib/utils";

export type Tone = "muted" | "primary" | "success" | "warning" | "danger" | "accent" | "sky";

const toneClasses: Record<Tone, string> = {
  muted: "bg-muted text-muted-foreground border-transparent",
  primary: "bg-primary/15 text-primary border-primary/20",
  success: "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/25",
  warning: "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/25",
  danger: "bg-danger/15 text-danger border-danger/25",
  accent: "bg-pln-yellow/15 text-pln-gold border-pln-yellow/25",
  sky: "bg-pln-sky/15 text-pln-sky border-pln-sky/25",
};

export function Badge({
  children,
  tone = "muted",
  className,
  dot = false,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium leading-none",
        toneClasses[tone],
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function Pill({
  children,
  className,
  tone = "muted",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: Tone;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusDot({ tone = "muted", ping = false }: { tone?: Tone; ping?: boolean }) {
  const color: Record<Tone, string> = {
    muted: "hsl(var(--muted-foreground))",
    primary: "hsl(var(--primary))",
    success: "hsl(var(--success))",
    warning: "hsl(var(--warning))",
    danger: "hsl(var(--danger))",
    accent: "#f5a623",
    sky: "#38bdf8",
  };
  const c = color[tone];
  return (
    <span className="relative flex h-2 w-2">
      {ping && (
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
          style={{ background: c }}
        />
      )}
      <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: c }} />
    </span>
  );
}
