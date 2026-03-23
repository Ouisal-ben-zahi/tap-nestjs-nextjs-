"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useCandidatStats } from "@/hooks/use-candidat";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Users,
  GraduationCap,
  MessageSquare,
  FolderOpen,
  X,
  Briefcase,
  Search,
  UserCheck,
  LayoutList,
  LogOut,
  Settings,
  ClipboardList,
  Menu,
} from "lucide-react";

const candidatNavItems = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/analyse-cv", label: "Analyse CV", icon: FileText },
  { href: "/app/scoring", label: "Scoring", icon: BarChart3 },
  { href: "/app/matching", label: "Matching", icon: Users },
  { href: "/app/formation", label: "Formation", icon: GraduationCap },
  { href: "/app/entretien", label: "Entretien IA", icon: MessageSquare },
  { href: "/app/mes-fichiers", label: "Mes fichiers", icon: FolderOpen },
  { href: "/app/mes-candidatures", label: "Mes candidatures", icon: ClipboardList },
  { href: "/app/parametres", label: "Paramètres", icon: Settings },
];

const recruteurNavItems = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/offres", label: "Mes offres", icon: Briefcase },
  { href: "/app/candidats", label: "Candidats", icon: Search },
  { href: "/app/matching-recruteur", label: "Matching IA", icon: UserCheck },
  { href: "/app/entretiens-planifies", label: "Entretiens", icon: MessageSquare },
  { href: "/app/statistiques", label: "Statistiques", icon: LayoutList },
  { href: "/app/parametres", label: "Paramètres", icon: Settings },
];

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function AppSidebar({ open, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const isCandidat = user?.role === "candidat";
  const [collapsed, setCollapsed] = useState(false);
  const theme = useDashboardTheme();
  const isLight = theme === "light";

  // Pour les candidats, on vérifie si un profil existe en base
  const statsQuery = useCandidatStats();
  const stats = statsQuery.data;
  const hasProfile =
    !isCandidat ||
    (stats?.candidateId !== null && stats?.candidateId !== undefined);

  const navItems = user?.role === "recruteur" ? recruteurNavItems : candidatNavItems;

  const handleLogout = () => {
    logout();
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  return (
    <>
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 lg:top-0 left-0 h-screen lg:h-screen ${
          collapsed ? "w-[80px]" : "w-[250px]"
        } ${
          isLight
            ? "bg-tap-red text-white"
            : "bg-zinc-900/95 backdrop-blur-2xl shadow-[0_0_28px_rgba(0,0,0,0.55)]"
        } z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile close */}
        <div className="lg:hidden flex items-center justify-end p-3">
          <button
            onClick={onClose}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
              isLight
                ? "text-white/80 hover:bg-white/10"
                : "text-white/30 hover:text-white hover:bg-white/[0.06]"
            }`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Logo + bouton collapse (desktop) */}
        <div className="hidden lg:flex items-center justify-between px-3 pt-4 pb-2">
          <Link href="/app" className="flex items-center justify-center">
            {collapsed ? (
              <Image
                src="/favicon.svg"
                alt="TAP"
                width={32}
                height={32}
                className="h-7 w-7"
              />
            ) : (
              <Image
                src="/images/logo-white.svg"
                alt="TAP"
                width={110}
                height={32}
                className="h-[26px] w-auto"
              />
            )}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
              isLight
                ? "text-white/80 hover:bg-white/10"
                : "text-white/30 hover:text-white hover:bg-white/[0.06]"
            }`}
            aria-label="Basculer la taille de la barre latérale"
          >
            <Menu size={16} />
          </button>
        </div>

        <nav className="flex-1 pl-3 pr-0 py-4 space-y-0.5 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className={`px-3 mb-4 ${collapsed ? "flex items-center justify-center" : ""}`}>
            <span
              className="inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[3px] text-white/70 whitespace-nowrap"
              title="Navigation"
            >
              <span className="w-1 h-1 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
              Navigation
            </span>
          </div>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            // Si candidat sans profil : on ne laisse cliquer que sur Paramètres
            const isCandidatParam = isCandidat && item.href === "/app/parametres";
            const disabled = isCandidat && !hasProfile && !isCandidatParam;

            const baseClasses = collapsed
              ? "relative flex items-center justify-center px-3 py-2.5 rounded-l-full transition-all duration-300 group"
              : "relative flex items-center gap-3 px-3 py-2.5 rounded-l-full text-[13px] transition-all duration-300 group";
            const activeClasses = isActive
              ? isLight
                ? "bg-white text-tap-red font-medium shadow-[0_8px_20px_rgba(0,0,0,0.15)]"
                : "bg-[#0b0b0d] text-white font-medium shadow-[0_0_24px_rgba(0,0,0,0.45)]"
              : isLight
                ? "text-white/80 hover:text-white hover:bg-white/10"
                : "text-white/70 hover:text-white hover:bg-white/5";
            const disabledClasses =
              "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-white/45";

            const content = (
              <>
                {isActive && (
                  <div
                    className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-full animate-pulse ${
                      isLight
                        ? "bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]"
                        : "bg-tap-red shadow-[0_0_12px_rgba(202,27,40,0.8)]"
                    }`}
                  />
                )}
                <div className="w-8 h-8 flex items-center justify-center transition-colors duration-300">
                  <Icon
                    size={16}
                    strokeWidth={isActive ? 2 : 1.5}
                    className={
                      isLight
                        ? isActive
                          ? "text-tap-red"
                          : "text-white"
                        : "text-white"
                    }
                  />
                </div>
                {!collapsed && (
                  <>
                <span className="flex-1">{item.label}</span>
                {disabled && (
                  <span className="ml-2 text-[10px] uppercase tracking-[1px] text-white/40">
                    Inactif
                  </span>
                )}
                  </>
                )}
              </>
            );

            if (disabled) {
              return (
                <div
                  key={item.href}
                  className={`${baseClasses} ${activeClasses} ${disabledClasses}`}
                >
                  {content}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`${baseClasses} ${activeClasses}`}
              >
                {content}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          className="p-3 space-y-2"
        >
          <button
            onClick={handleLogout}
            className={`w-full flex items-center px-3 py-2.5 rounded-xl text-[12px] transition-all duration-300 ${
              collapsed ? "justify-center" : "gap-2.5"
            } ${isLight ? "hover:bg-white/10" : "hover:bg-red-500/10"}`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                isLight ? "bg-white/10" : "bg-white/[0.03]"
              }`}
            >
              <LogOut size={14} className={isLight ? "text-white" : "text-white/70"} />
            </div>
            {!collapsed && (
              <span
                className={isLight ? "text-white/80 hover:text-white" : "text-white/40 hover:text-tap-red/80"}
              >
                Quitter
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
