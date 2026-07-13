"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { DemoBanner } from "./demo-banner";
import { ToastProvider } from "@/components/ui/toast";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawer, setDrawer] = useState(false);

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        {/* Sidebar desktop */}
        <div className="sticky top-0 hidden h-screen shrink-0 lg:block">
          <Sidebar />
        </div>

        {/* Drawer mobile */}
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDrawer(false)} />
            <div className="absolute left-0 top-0 h-full animate-fade-in">
              <Sidebar onNavigate={() => setDrawer(false)} />
              <button
                onClick={() => setDrawer(false)}
                className="absolute -right-11 top-4 flex h-9 w-9 items-center justify-center rounded-lg bg-card text-muted-foreground shadow"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Konten */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenu={() => setDrawer(true)} />
          <DemoBanner />
          <main className="flex-1 px-4 py-5 sm:px-6">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
