"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useCandidatStats } from "@/hooks/use-candidat";
import { LogOut, Menu, Settings } from "lucide-react";

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
    <header className="relative h-[60px] bg-black/80 backdrop-blur-2xl border-b border-white/[0.06] sticky top-0 z-40">
      {/* Red accent line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-tap-red/30 to-transparent" />

      <div className="flex h-[60px] w-full items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
            aria-label="Ouvrir le menu"
          >
            <Menu size={18} />
          </button>

          {user?.email ? (
            <div className="relative min-w-0">
              <button
                type="button"
                onClick={toggleProfileMenu}
                className="group flex items-center gap-2 rounded-xl px-1 py-1 transition-all duration-300 hover:bg-white/[0.06] hover:shadow-[0_0_18px_rgba(202,27,40,0.22)]"
                aria-expanded={openProfileMenu}
                aria-haspopup="menu"
              >
                {avatarUrl ? (
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-black/20 transition-transform duration-300 group-hover:scale-105">
                    <Image
                      key={`${avatarUrl}-${statsQuery.dataUpdatedAt}`}
                      src={avatarUrl}
                      alt={user.email}
                      fill
                      sizes="32px"
                      className="object-cover object-center"
                    />
                  </div>
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tap-red text-[12px] font-bold uppercase text-white transition-transform duration-300 group-hover:scale-105">
                    {initial || "?"}
                  </div>
                )}
              </button>

              {openProfileMenu && (
                <div className="absolute left-0 top-[52px] z-50 w-64 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#050505]/95 shadow-lg backdrop-blur-xl">
                  <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
                    {avatarUrl ? (
                      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-black/20">
                        <Image
                          key={`${avatarUrl}-${statsQuery.dataUpdatedAt}`}
                          src={avatarUrl}
                          alt={user?.email || "Profil"}
                          fill
                          sizes="32px"
                          className="object-cover object-center"
                        />
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tap-red text-[12px] font-bold uppercase text-white">
                        {initial || "?"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] text-white/80">{user?.email}</p>
                      <p className="truncate text-[11px] capitalize text-white/30">
                        {isCandidat ? "Candidat" : "Recruteur"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={goToSettings}
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13px] text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white"
                  >
                    <Settings size={14} className="text-white/60" />
                    <span>Paramètres du compte</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 border-t border-white/[0.04] px-4 py-3 text-left text-[13px] text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200"
                  >
                    <LogOut size={14} />
                    <span>Se déconnecter</span>
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <Link
          href="/"
          className="shrink-0 opacity-90 transition-opacity hover:opacity-100"
          aria-label="Aller au site public TAP"
        >
          <Image
            src="/images/logo-white.svg"
            alt="TAP"
            width={90}
            height={30}
            className="h-[22px] w-auto sm:h-[24px]"
            priority
          />
        </Link>
      </div>
    </header>
  );
}
