"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useCandidatStats } from "@/hooks/use-candidat";
import { ArrowUpRight, LogOut, Menu, Settings } from "lucide-react";

interface AppNavbarProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export default function AppNavbar({ onToggleSidebar }: AppNavbarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const isCandidat = user?.role === "candidat";
  const statsQuery = useCandidatStats();
  const avatarUrl = isCandidat ? statsQuery.data?.avatarUrl ?? null : null;
  const initial = (user?.email?.[0] || "").toUpperCase();
  const [openProfileMenu, setOpenProfileMenu] = useState(false);

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  const toggleProfileMenu = () => {
    setOpenProfileMenu((v) => !v);
  };

  const goToSettings = () => {
    setOpenProfileMenu(false);
    router.push("/app/parametres");
  };

  return (
    <header className="relative h-[60px] bg-black/80 backdrop-blur-2xl border-b border-white/[0.06] flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40">
      {/* Red accent line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-tap-red/30 to-transparent" />

      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu size={18} />
        </button>
        <Link href="/" className="opacity-80 hover:opacity-100 transition-opacity">
          <Image
            src="/images/logo-white.svg"
            alt="TAP"
            width={90}
            height={30}
            className="h-[24px] w-auto"
          />
        </Link>
      </div>

      <div className="relative flex items-center gap-3">
        {user?.email && (
          <button
            type="button"
            onClick={toggleProfileMenu}
            className="group flex items-center gap-2.5 px-2.5 sm:px-3.5 py-2 rounded-xl border border-white/20 hover:border-tap-red/70 hover:bg-white/[0.06] transition-all duration-300 hover:shadow-[0_0_18px_rgba(202,27,40,0.22)]"
          >
            <span className="hidden sm:block text-[12px] text-white/45 truncate max-w-[160px] text-left">
              {user.email}
            </span>
            {avatarUrl ? (
              <div className="w-7 h-7 rounded-full overflow-hidden bg-black/20 flex items-center justify-center ring-1 ring-tap-red/30 group-hover:ring-tap-red/80 group-hover:scale-105 transition-all duration-300">
                <Image
                  src={avatarUrl}
                  alt={user.email}
                  width={28}
                  height={28}
                  className="w-7 h-7 object-cover"
                />
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full bg-tap-red flex items-center justify-center text-[11px] font-bold text-white uppercase ring-1 ring-tap-red/40 group-hover:ring-tap-red/90 group-hover:scale-105 transition-all duration-300">
                {initial || "?"}
              </div>
            )}
          </button>
        )}

        {/* Bouton "Retour au site" à droite du profil — icône seule avec tooltip décoré */}
        <div className="hidden sm:block relative group">
          <Link
            href="/"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors"
            aria-label="Retour au site"
          >
            <ArrowUpRight size={16} />
          </Link>
          <div className="pointer-events-none absolute right-0 top-10 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-1 transition-all duration-150">
            <div className="px-3 py-1.5 rounded-md bg-white text-[11px] font-medium text-black shadow-lg shadow-black/40 whitespace-nowrap">
              Retour au site
            </div>
          </div>
        </div>

        {openProfileMenu && (
          <div className="absolute right-0 top-[52px] w-64 bg-[#050505]/95 border border-white/[0.08] rounded-2xl shadow-lg backdrop-blur-xl overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-3">
              {avatarUrl ? (
                <div className="w-8 h-8 rounded-full overflow-hidden bg-black/20 flex items-center justify-center ring-1 ring-tap-red/30">
                  <Image
                    src={avatarUrl}
                    alt={user?.email || "Profil"}
                    width={32}
                    height={32}
                    className="w-8 h-8 object-cover"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-tap-red flex items-center justify-center text-[12px] font-bold text-white uppercase ring-1 ring-tap-red/40">
                  {initial || "?"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-white/80 truncate">{user?.email}</p>
                <p className="text-[11px] text-white/30 truncate capitalize">
                  {isCandidat ? "Candidat" : "Recruteur"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={goToSettings}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-[13px] text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              <Settings size={14} className="text-white/60" />
              <span>Paramètres du compte</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-[13px] text-red-300 hover:text-red-200 hover:bg-red-500/10 border-t border-white/[0.04] transition-colors"
            >
              <LogOut size={14} />
              <span>Se déconnecter</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
