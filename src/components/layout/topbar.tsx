"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { titleFor } from "./nav";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LogoutButton } from "./logout-button";
import { useDataSource } from "@/lib/hcc/client";

function ConnChip() {
  const source = useDataSource();
  const map = {
    live: { label: "Live", cls: "border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]", ping: true },
    demo: { label: "Demo", cls: "border-pln-yellow/30 bg-pln-yellow/10 text-pln-gold", ping: false },
    error: { label: "Terputus", cls: "border-danger/30 bg-danger/10 text-danger", ping: false },
  }[source];

  return (
    <div className={`hidden items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium md:flex ${map.cls}`}>
      <span className="relative flex h-2 w-2">
        {map.ping && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
        )}
        <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
      </span>
      {map.label}
    </div>
  );
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const item = titleFor(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenu}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground lg:hidden"
            aria-label="Menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="leading-tight">
            <h2 className="text-[15px] font-semibold tracking-tight">{item.label}</h2>
            <p className="text-[11px] text-muted-foreground">{item.desc}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ConnChip />
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
