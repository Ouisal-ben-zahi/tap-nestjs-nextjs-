"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Users,
  GraduationCap,
  MessageSquare,
  FolderOpen,
  X,
  ArrowUpLeft,
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
        className={`fixed lg:sticky top-0 lg:top-[60px] left-0 h-screen lg:h-[calc(100vh-60px)] w-[250px] bg-[#060606]/90 backdrop-blur-xl border-r border-white/[0.05] z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile close */}
        <div className="lg:hidden flex items-center justify-end p-3">
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-0.5 overflow-y-auto">
          <div className="px-3 mb-6">
            <span className="text-[9px] font-bold uppercase tracking-[3px] text-white/25">
              Navigation
            </span>
          </div>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-300 group ${
                  isActive
                    ? "bg-tap-red/[0.08] text-tap-red font-medium"
                    : "text-white/45 hover:text-white/70 hover:bg-white/[0.04] font-normal"
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] bg-tap-red rounded-r-full shadow-[0_0_8px_rgba(202,27,40,0.5)]" />
                )}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                  isActive
                    ? "bg-tap-red/10"
                    : "bg-white/[0.03] group-hover:bg-white/[0.06]"
                }`}>
                  <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
                </div>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/[0.05] space-y-2">
          <Link
            href="/"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12px] text-white/40 hover:text-white/60 hover:bg-white/[0.04] transition-all duration-300"
          >
            <ArrowUpLeft size={14} />
            <span>Retour au site</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12px] text-white/40 hover:text-tap-red/80 hover:bg-tap-red/[0.06] transition-all duration-300"
          >
            <LogOut size={14} />
            <span>Quitter</span>
          </button>
        </div>
      </aside>
    </>
  );
}
