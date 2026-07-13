import {
  LayoutDashboard,
  Cctv,
  BrainCircuit,
  GraduationCap,
  ScanSearch,
  PencilRuler,
  Server,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
}

export const NAV: NavItem[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard, desc: "Ringkasan & status live" },
  { href: "/cameras", label: "Kamera", icon: Cctv, desc: "Kelola kamera CCTV" },
  { href: "/models", label: "Model", icon: BrainCircuit, desc: "Model deteksi AI" },
  { href: "/training", label: "Training", icon: GraduationCap, desc: "Job & review pelatihan" },
  { href: "/detections", label: "Deteksi", icon: ScanSearch, desc: "Hasil deteksi & review" },
  { href: "/corrections", label: "Koreksi", icon: PencilRuler, desc: "Anotasi untuk re-training" },
  { href: "/system", label: "Sistem", icon: Server, desc: "Kesehatan platform" },
];

export function titleFor(pathname: string): NavItem {
  // cocokkan path terpanjang yang match (mengabaikan sub-route)
  const exact = NAV.find((n) => n.href === pathname);
  if (exact) return exact;
  const nested = NAV.filter((n) => n.href !== "/" && pathname.startsWith(n.href)).sort(
    (a, b) => b.href.length - a.href.length
  )[0];
  return nested ?? NAV[0];
}
