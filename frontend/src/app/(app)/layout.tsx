"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import AuthGuard from "@/components/app/AuthGuard";
import HydrationGate from "@/components/app/HydrationGate";
import AppSidebar from "@/components/app/AppSidebar";
import RecruiterTalentCardSidebar from "@/components/app/RecruiterTalentCardSidebar";
import { useRecruiterTalentPanelStore } from "@/stores/recruiter-talent-panel";
import RecruiterIncompleteProfileGuard from "@/components/app/RecruiterIncompleteProfileGuard";
import { Menu, X } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const layoutCardLikeBgClass =
    "bg-[linear-gradient(180deg,rgba(202,27,40,0.08)_0%,rgba(10,10,10,0.96)_30%,rgba(10,10,10,0.96)_100%)]";
  const recruiterTalentOpen = useRecruiterTalentPanelStore((s) => Boolean(s.talentPanel));
  const closeRecruiterTalentPanel = useRecruiterTalentPanelStore((s) => s.closeTalentPanel);
  const mainScrollRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (pathname !== "/app/candidats" && recruiterTalentOpen) {
      closeRecruiterTalentPanel();
    }
  }, [pathname, recruiterTalentOpen, closeRecruiterTalentPanel]);

  useEffect(() => {
    if (!recruiterTalentOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRecruiterTalentPanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [recruiterTalentOpen, closeRecruiterTalentPanel]);
  // Sidebar collée au bord gauche / haut / bas (sans marge) : largeur + même espacement qu’avant vers le contenu.
  const sidebarLeftPaddingClass = collapsed ? "lg:pl-[100px]" : "lg:pl-[288px]";

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("dashboard-theme", "dark");
    window.dispatchEvent(new Event("dashboard-theme-change"));
  }, []);

  return (
    <HydrationGate>
    <AuthGuard>
      <RecruiterIncompleteProfileGuard />
      <div className={`h-screen relative overflow-hidden ${layoutCardLikeBgClass}`}>
        {/* Background effects (dark only) */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[5%] right-[-8%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.04),transparent_60%)] blur-3xl" />
          <div className="absolute bottom-[15%] left-[-8%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.025),transparent_60%)] blur-3xl" />
          {/* Subtle grid */}
          <div
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="relative z-10 flex flex-1 h-full overflow-hidden">
          <AppSidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            collapsed={collapsed}
            onToggleCollapsed={() => setCollapsed((v) => !v)}
          />
          <main
            ref={mainScrollRef}
            className={`flex-1 min-h-0 ${sidebarLeftPaddingClass} p-5 sm:p-8 lg:p-10 pb-20 overflow-y-auto overflow-x-hidden relative ${layoutCardLikeBgClass}`}
          >
            {/* Burger mobile (seul en haut à gauche) */}
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              className="lg:hidden mb-4 inline-flex items-center justify-center w-9 h-9 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
              aria-label="Ouvrir ou fermer la navigation"
            >
              <Menu size={18} />
            </button>

            {children}
          </main>
        </div>

        {recruiterTalentOpen ? (
          <div
            className="fixed right-0 top-1/2 z-[60] flex h-[80dvh] max-h-[80vh] w-full max-w-full -translate-y-1/2 flex-col overflow-hidden border-0 bg-black shadow-none pointer-events-auto lg:max-w-[40vw] lg:w-[40vw]"
            role="dialog"
            aria-modal="false"
            aria-label="Talent Card du candidat"
            data-recruiter-talent-panel
          >
            <button
              type="button"
              onClick={closeRecruiterTalentPanel}
              className="absolute top-3 right-3 z-20 w-9 h-9 rounded-lg border border-white/[0.10] bg-black/60 text-white/90 hover:bg-black/70 flex items-center justify-center"
              aria-label="Fermer"
              title="Fermer (Échap)"
            >
              <X size={18} />
            </button>
            <RecruiterTalentCardSidebar />
          </div>
        ) : null}
      </div>
    </AuthGuard>
    </HydrationGate>
  );
}
