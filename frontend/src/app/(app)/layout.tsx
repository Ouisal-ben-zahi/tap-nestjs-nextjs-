"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import { useCandidatStats } from "@/hooks/use-candidat";
import AuthGuard from "@/components/app/AuthGuard";
import HydrationGate from "@/components/app/HydrationGate";
import AppSidebar from "@/components/app/AppSidebar";
import { Menu, ArrowUpRight } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout } = useAuth();
  const isCandidat = user?.role === "candidat";
  const statsQuery = useCandidatStats();
  const avatarUrl = isCandidat ? statsQuery.data?.avatarUrl ?? null : null;
  const initial = (user?.email?.[0] || "").toUpperCase();

  return (
    <HydrationGate>
    <AuthGuard>
      <div className="h-screen bg-black relative overflow-hidden">
        {/* Background effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[5%] right-[-8%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.04),transparent_60%)] blur-3xl" />
          <div className="absolute bottom-[15%] left-[-8%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.025),transparent_60%)] blur-3xl" />
          {/* Subtle grid */}
          <div
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="relative z-10 flex flex-1 h-full overflow-hidden">
          <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <main className="flex-1 p-5 sm:p-8 lg:p-10 pb-20 overflow-y-auto overflow-x-hidden relative">
            {/* Burger mobile (seul en haut à gauche) */}
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              className="lg:hidden mb-4 inline-flex items-center justify-center w-9 h-9 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
              aria-label="Ouvrir ou fermer la navigation"
            >
              <Menu size={18} />
            </button>

            {/* Email + avatar + retour site, fixe en haut du main */}
            {user?.email && (
              <>
                <div className="fixed top-0 left-0 right-0 z-30">
                  <div className="flex justify-end items-center gap-3 px-3 py-2 sm:px-6 sm:py-3 bg-[#050505] rounded-b-2xl shadow-[0_12px_30px_rgba(0,0,0,0.7)]">
                  <button
                    type="button"
                    onClick={() => setProfileOpen((v) => !v)}
                    className="hidden sm:flex items-center gap-2.5 px-3.5 py-2 rounded-full hover:bg-white/15 transition-colors"
                  >
                    <span className="text-[12px] text-white/70 truncate max-w-[220px]">
                      {user.email}
                    </span>
                    {avatarUrl ? (
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-black/20 flex items-center justify-center ring-1 ring-tap-red/30">
                        <Image
                          src={avatarUrl}
                          alt={user.email}
                          width={28}
                          height={28}
                          className="w-7 h-7 object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-tap-red flex items-center justify-center text-[11px] font-bold text-white uppercase ring-1 ring-tap-red/40">
                        {initial || "?"}
                      </div>
                    )}
                  </button>
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full text-white/60 hover:text-white hover:bg-white/20 transition-colors"
                    aria-label="Retour au site"
                  >
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
                </div>

                {profileOpen && (
                  <div className="fixed top-14 right-4 sm:right-6 z-40 w-56 rounded-2xl bg-[#050505]/95 border border-white/10 shadow-[0_18px_45px_rgba(0,0,0,0.8)] backdrop-blur-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/[0.06]">
                      <p className="text-[12px] text-white/80 truncate">{user.email}</p>
                      <p className="text-[11px] text-white/35 capitalize">
                        {isCandidat ? "Candidat" : "Recruteur"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        window.location.href = "/app/parametres";
                      }}
                      className="w-full text-left px-4 py-3 text-[13px] text-white/80 hover:bg-white/[0.04] transition-colors"
                    >
                      Mon compte
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        logout();
                        if (typeof window !== "undefined") {
                          window.location.href = "/";
                        }
                      }}
                      className="w-full text-left px-4 py-3 text-[13px] text-red-300 hover:text-red-200 hover:bg-red-500/10 border-t border-white/[0.04] transition-colors"
                    >
                      Se déconnecter
                    </button>
                  </div>
                )}
                {/* Espace sous la barre fixe (margin-bottom visuel) */}
                <div className="h-[64px] mb-6 sm:mb-8" />
              </>
            )}

            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
    </HydrationGate>
  );
}
