"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthGuard from "@/components/app/AuthGuard";
import HydrationGate from "@/components/app/HydrationGate";
import AppSidebar from "@/components/app/AppSidebar";
import RecruiterTalentCardSidebar from "@/components/app/RecruiterTalentCardSidebar";
import { useRecruiterTalentPanelStore } from "@/stores/recruiter-talent-panel";
import { Menu, ArrowUpRight, X } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
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
    const el = mainScrollRef.current;
    if (!el) return;
    const close = () => closeRecruiterTalentPanel();
    el.addEventListener("scroll", close, { passive: true });
    /* La molette ne déclenche pas toujours scroll (ex. fond sans défilement) */
    el.addEventListener("wheel", close, { passive: true });
    return () => {
      el.removeEventListener("scroll", close);
      el.removeEventListener("wheel", close);
    };
  }, [recruiterTalentOpen, closeRecruiterTalentPanel]);
  // La sidebar : margin gauche (left-3 => 12px). La talent card est centrée en overlay (pas de décalage du main).
  const sidebarLeftPaddingClass = collapsed ? "lg:pl-[112px]" : "lg:pl-[300px]";

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("dashboard-theme", "dark");
    window.dispatchEvent(new Event("dashboard-theme-change"));
  }, []);

  return (
    <HydrationGate>
    <AuthGuard>
      <div className="h-screen relative overflow-hidden bg-black">
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
            className={`flex-1 min-h-0 ${sidebarLeftPaddingClass} p-5 sm:p-8 lg:p-10 pb-20 overflow-y-auto overflow-x-hidden relative bg-[#020001]`}
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

            {/* Header fixe du dashboard (comme avant) */}
            <div className="fixed top-0 left-0 right-0 z-30">
              <div
                className={`flex items-center justify-between px-3 py-2 sm:px-6 sm:py-3 ${sidebarLeftPaddingClass} ${
                  "bg-[#020001]"
                }`}
              >
                {/* Left: (vide) */}
                <div />

                {/* Right: Retour au site */}
                <div className="flex items-center gap-3">
                  <Link
                    href="/"
                    className="btn-primary btn-sm gap-2 w-auto !py-1.5 !px-3 text-[12px]"
                    aria-label="Retour au site"
                  >
                    <span className="hidden sm:inline">Retour au site</span>
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>
            </div>

            {/* Avatar/menu profil retirés : la sidebar contient maintenant l'avatar + email/role */}
            {/* Espace sous la barre fixe (margin-bottom visuel) */}
            <div className="h-[64px] mb-6 sm:mb-8" />

            {children}
          </main>
        </div>

        {recruiterTalentOpen ? (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label="Portfolio"
          >
            <button
              type="button"
              className="absolute inset-0 cursor-default border-0 bg-transparent p-0"
              onClick={closeRecruiterTalentPanel}
              aria-label="Fermer le portfolio"
            />
            <div
              className="relative z-10 w-full h-full sm:h-auto sm:max-h-[92vh] shrink-0 overflow-y-auto pointer-events-auto bg-[#020001] rounded-none sm:rounded-2xl lg:w-[420px] lg:min-w-[420px] lg:max-w-[420px]"
              data-recruiter-talent-panel
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={closeRecruiterTalentPanel}
                className="absolute top-3 right-3 z-10 lg:hidden w-9 h-9 rounded-lg border border-white/[0.10] bg-white/[0.06] text-white/70 hover:text-white hover:bg-white/[0.10] flex items-center justify-center"
                aria-label="Fermer"
                title="Fermer"
              >
                <X size={18} />
              </button>
              <RecruiterTalentCardSidebar />
            </div>
          </div>
        ) : null}
      </div>
    </AuthGuard>
    </HydrationGate>
  );
}
