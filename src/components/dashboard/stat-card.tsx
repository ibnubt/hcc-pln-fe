import { Card } from "@/components/ui/card";

export interface Stat {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string; // "212 82% 50%"
  tip?: string;
}

export function StatCard({ stat, delay = 0 }: { stat: Stat; delay?: number }) {
  const accent = `hsl(${stat.accent})`;
  const Icon = stat.icon;
  return (
    <Card
      title={stat.tip}
      className="group relative overflow-hidden animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: accent }} />
      <div className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {stat.label}
          </span>
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: `color-mix(in srgb, ${accent} 15%, transparent)`, color: accent }}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        </div>
        <div className="mt-2 tabular text-2xl font-bold tracking-tight text-foreground">
          {stat.value}
        </div>
        {stat.sub && <div className="mt-1 truncate text-[11px] text-muted-foreground">{stat.sub}</div>}
      </div>
    </Card>
  );
}

export function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {stats.map((s, i) => (
        <StatCard key={s.label} stat={s} delay={i * 45} />
      ))}
    </div>
  );
}
