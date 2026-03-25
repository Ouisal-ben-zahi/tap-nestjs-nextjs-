"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useCandidatStats } from "@/hooks/use-candidat";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";
import RecruiterTalentCardSidebar from "@/components/app/RecruiterTalentCardSidebar";
import { useRecruiterTalentPanelStore } from "@/stores/recruiter-talent-panel";
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
  { href: "/app/parametres", label: "Paramètres", icon: Settings },
];

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export default function AppSidebar({
  open,
  onClose,
  collapsed,
  onToggleCollapsed,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const isCandidat = user?.role === "candidat";
  const theme = useDashboardTheme();
  const isLight = theme === "light";

  // Pour les candidats, on vérifie si un profil existe en base
  const statsQuery = useCandidatStats();
  const stats = statsQuery.data;
  const avatarUrl = isCandidat ? stats?.avatarUrl ?? null : null;
  const initial = (user?.email?.[0] || "").toUpperCase();
  const hasProfile =
    !isCandidat ||
    (stats?.candidateId !== null && stats?.candidateId !== undefined);

  const navItems = user?.role === "recruteur" ? recruteurNavItems : candidatNavItems;
  const isRecruteur = user?.role === "recruteur";
  const talentPanel = useRecruiterTalentPanelStore((s) => s.talentPanel);
  const closeTalentPanel = useRecruiterTalentPanelStore((s) => s.closeTalentPanel);
  const showTalentBesideNav =
    isRecruteur && pathname === "/app/candidats" && Boolean(talentPanel);

  useEffect(() => {
    if (pathname !== "/app/candidats" && talentPanel) {
      closeTalentPanel();
    }
  }, [pathname, talentPanel, closeTalentPanel]);

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

      <div className="fixed top-3 bottom-3 left-3 z-50 flex flex-row gap-2 items-stretch">
        <aside
          className={`relative shrink-0 self-stretch min-h-0 top-0 bottom-0 left-0 ${
            collapsed ? "w-[80px]" : "w-[250px]"
          } ${
            isLight
              ? "bg-tap-red text-white"
              : "bg-zinc-900/60 text-white border border-white/[0.07]"
          } z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
            open ? "translate-x-0" : "-translate-x-full"
          } rounded-2xl overflow-hidden`}
          onDoubleClick={(e) => {
            const target = e.target as HTMLElement;
            // Evite de replier/déplier si l'utilisateur double-clic sur un lien ou un bouton
            if (target.closest("a")) return;
            if (target.closest("button")) return;
            onToggleCollapsed();
          }}
        >
        {/* Overlay blanc translucide (effet premium) */}
        <div className={`absolute inset-0 pointer-events-none ${isLight ? "bg-white/10" : "bg-white/[0.03]"}`} />

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

        {/* Top profil (double-clic sur la zone vide de la sidebar) */}
        <div className="hidden lg:flex flex-col items-center px-3 pt-5 pb-4">
          <div
            className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center border border-[#CA1B28]/80 ${
              isLight
                ? "bg-[radial-gradient(circle_at_top,rgba(202,27,40,0.28),transparent_62%)]"
                : "bg-[radial-gradient(circle_at_top,rgba(202,27,40,0.24),transparent_62%)]"
            }`}
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={user?.email || "Avatar"}
                width={48}
                height={48}
                className="w-12 h-12 object-cover"
              />
            ) : (
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-[13px] font-bold uppercase ${
                  isLight ? "bg-tap-red text-white" : "bg-tap-red text-black"
                }`}
              >
                {initial || "?"}
              </div>
            )}
          </div>

          {!collapsed && (
            <>
              <p className="mt-3 w-full text-center text-[12px] text-white/80 truncate">
                {user?.email}
              </p>
              <p className="mt-1 w-full text-center text-[11px] text-white/35 capitalize truncate">
                {isCandidat ? "Candidat" : "Recruteur"}
              </p>
            </>
          )}
        </div>

        <nav className="flex-1 pl-3 pr-2 py-4 space-y-0.5 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            // Si candidat sans profil : on ne laisse cliquer que sur Paramètres
            const isCandidatParam = isCandidat && item.href === "/app/parametres";
            const disabled = isCandidat && !hasProfile && !isCandidatParam;

            const baseClasses = collapsed
              ? "relative flex items-center justify-center px-3 py-2.5 rounded-full border border-transparent transition-all duration-300 group"
              : "relative flex items-center gap-3 px-3 py-2.5 rounded-full text-[13px] border border-transparent transition-all duration-300 group";
            const activeClasses = isActive
              ? isLight
                ? "bg-white/[0.06] text-tap-red font-medium shadow-none !rounded-full overflow-hidden"
                : "bg-white/[0.06] text-tap-red font-medium shadow-none !rounded-full overflow-hidden"
              : isLight
                ? "text-white/80 hover:text-white hover:bg-white/10 hover:border-tap-red/40"
                : "text-white/70 hover:text-white hover:bg-white/5 hover:border-white/[0.14]";
            const disabledClasses =
              "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-white/45";

            const content = (
              <>
                <div
                  className={`w-8 h-8 flex items-center justify-center transition-colors duration-300 ${
                    isActive
                      ? "rounded-full bg-white/[0.12] backdrop-blur-md border-t border-b border-tap-red/25 shadow-[0_0_0_1px_rgba(202,27,40,0.18)]"
                      : ""
                  }`}
                >
                  <Icon
                    size={16}
                    strokeWidth={isActive ? 2 : 1.5}
                    className={
                      isLight
                        ? isActive
                          ? "text-tap-red"
                          : "text-white"
                        : isActive
                          ? "text-tap-red"
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
            type="button"
            className={
              isLight
                ? `inline-flex items-center justify-center w-full btn-sm ${
                    collapsed ? "gap-0" : "gap-2"
                  } rounded-full bg-[#E6E6E6] text-tap-red border-t border-b border-tap-red/20 transition-colors hover:bg-[#E6E6E6]/85`
                : `btn-primary btn-sm w-full justify-center ${collapsed ? "gap-0" : "gap-2"}`
            }
          >
            <LogOut size={14} />
            {!collapsed && (
              <span>Se déconnecter</span>
            )}
          </button>
        </div>
        </aside>

        {showTalentBesideNav ? (
          <div
            data-recruiter-talent-panel
            className="fixed z-[55] inset-0 lg:static lg:inset-auto lg:z-auto lg:flex lg:flex-col lg:w-[min(320px,calc(100vw-120px))] lg:shrink-0 lg:min-h-0 lg:self-stretch flex flex-col pointer-events-none lg:pointer-events-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Talent card"
          >
            <button
              type="button"
              className="lg:hidden absolute inset-0 bg-black/60 backdrop-blur-[2px] border-0 p-0 cursor-default pointer-events-auto"
              onClick={closeTalentPanel}
              onWheel={closeTalentPanel}
              aria-label="Fermer"
            />
            <div className="relative z-[1] mt-[72px] mb-3 mx-3 lg:m-0 lg:flex-1 lg:min-h-0 lg:mt-0 flex-1 min-h-0 max-h-[calc(100vh-96px)] lg:max-h-none flex flex-col pointer-events-auto">
              <RecruiterTalentCardSidebar />
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
