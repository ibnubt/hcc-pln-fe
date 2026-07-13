"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cctv } from "lucide-react";
import { NAV } from "./nav";
import { cn } from "@/lib/utils";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-card">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-black/5">
          <img src="/logo-pln.svg" alt="PLN" className="h-full w-full object-contain" />
        </div>
        <div className="leading-tight">
          <div className="flex items-center gap-1.5">
            <h1 className="text-[15px] font-semibold tracking-tight">HCC PLN</h1>
            <span className="inline-flex items-center gap-0.5 rounded bg-pln-yellow/15 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-pln-gold">
              <Cctv className="h-2.5 w-2.5" /> CCTV AI
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">Command Center</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "")} />
              <span className="flex-1">{item.label}</span>
              {active && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-4 py-3 text-[10px] text-muted-foreground/70">
        © PLN · Internal
        <div className="text-muted-foreground/50">HCC CCTV AI v0.1</div>
      </div>
    </aside>
  );
}
