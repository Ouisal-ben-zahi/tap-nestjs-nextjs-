"use client";

import { useState } from "react";
import AuthGuard from "@/components/app/AuthGuard";
import HydrationGate from "@/components/app/HydrationGate";
import AppNavbar from "@/components/app/AppNavbar";
import AppSidebar from "@/components/app/AppSidebar";
import { Menu } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

        <div className="relative z-10 flex flex-col h-full">
          <AppNavbar
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            sidebarOpen={sidebarOpen}
          />
          <div className="flex flex-1 overflow-hidden">
            <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <main className="flex-1 p-5 sm:p-8 lg:p-10 overflow-y-auto overflow-x-hidden relative">
              {/* Burger pour ouvrir / fermer la sidebar, en haut à gauche du main */}
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
        </div>
      </div>
    </AuthGuard>
    </HydrationGate>
  );
}
