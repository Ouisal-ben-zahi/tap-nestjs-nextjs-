"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useCandidatStats } from "@/hooks/use-candidat";
import CandidatDashboard from "@/components/app/dashboard/CandidatDashboard";
import RecruteurDashboard from "@/components/app/dashboard/RecruteurDashboard";
import Link from "next/link";
import {
  FileText,
  BarChart3,
  Users,
  GraduationCap,
  MessageSquare,
  FolderOpen,
  ArrowRight,
  Sparkles,
  Briefcase,
  Search,
  UserCheck,
  LayoutList,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";

interface Feature {
  href: string;
  icon: LucideIcon;
  title: string;
  color: string;
}

const candidatFeatures: Feature[] = [
  { href: "/app/analyse-cv", icon: FileText, title: "Analyse CV", color: "#ef4444" },
  { href: "/app/scoring", icon: BarChart3, title: "Scoring", color: "#3b82f6" },
  { href: "/app/matching", icon: Users, title: "Matching", color: "#10b981" },
  { href: "/app/formation", icon: GraduationCap, title: "Formation", color: "#f59e0b" },
  { href: "/app/entretien", icon: MessageSquare, title: "Entretien IA", color: "#a855f7" },
  { href: "/app/mes-fichiers", icon: FolderOpen, title: "Mes fichiers", color: "#06b6d4" },
];

const recruteurFeatures: Feature[] = [
  { href: "/app/offres", icon: Briefcase, title: "Mes offres", color: "#ef4444" },
  { href: "/app/candidats", icon: Search, title: "Candidats", color: "#3b82f6" },
  { href: "/app/matching-recruteur", icon: UserCheck, title: "Matching IA", color: "#10b981" },
  { href: "/app/entretiens-planifies", icon: MessageSquare, title: "Entretiens", color: "#a855f7" },
  { href: "/app/statistiques", icon: LayoutList, title: "Statistiques", color: "#f59e0b" },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isRecruteur = user?.role === "recruteur";
  const isCandidat = user?.role === "candidat";
  const statsQuery = useCandidatStats();
  const features = isRecruteur ? recruteurFeatures : candidatFeatures;
  const firstName = user?.email?.split("@")[0] || "";
  const theme = useDashboardTheme();
  const isLight = theme === "light";

  // Si candidat connecté mais aucun profil candidat en base, rediriger vers onboarding
  useEffect(() => {
    if (!isCandidat) return;
    if (statsQuery.isLoading || statsQuery.isError || statsQuery.isFetching)
      return;
    const stats = statsQuery.data;
    const hasProfile =
      stats?.candidateId !== null && stats?.candidateId !== undefined;
    if (!hasProfile) {
      router.push("/app/onboarding-candidat");
    }
  }, [
    isCandidat,
    statsQuery.isLoading,
    statsQuery.isError,
    statsQuery.isFetching,
    statsQuery.data,
    router,
  ]);

  return (
    <div className="max-w-[1100px] mx-auto">
      {/* Hero header */}
      <div className={`relative mb-10 pb-8 ${isLight ? "border-b border-black/10" : "border-b border-white/[0.04]"}`}>
        <div className="absolute top-[-80px] left-[-100px] w-[350px] h-[350px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.08),transparent_60%)] blur-3xl pointer-events-none" />
        <div className="absolute top-[-40px] right-[10%] w-[200px] h-[200px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.04),transparent_60%)] blur-3xl pointer-events-none" />

        <div className="relative">
          <h1
            className={`text-[28px] sm:text-[40px] font-bold tracking-[-0.04em] font-heading leading-tight mb-2 ${
              isLight ? "text-[rgba(35,35,35,1)]" : "text-white"
            }`}
          >
            Bienvenue{firstName ? "," : ""}
            {firstName && (
              <span
                className={`ml-2 ${
                  isLight
                    ? "text-[rgba(202,27,40,1)]"
                    : "text-[rgba(202,27,40,1)]"
                }`}
              >
                {firstName}
              </span>
            )}
          </h1>
          <p className={`text-[15px] font-light max-w-md ${isLight ? "text-black/55" : "text-white/45"}`}>
            {isRecruteur
              ? "Gérez vos recrutements et trouvez les meilleurs talents."
              : "Explorez vos outils dsfdg IA pour booster votre carrière."}
          </p>
        </div>
      </div>

      {/* Live Dashboard */}
      <div className="mt-14 sm:mt-16">
        {isRecruteur ? <RecruteurDashboard /> : <CandidatDashboard />}
      </div>

      {/* Separator */}
      <div className={`mt-10 mb-6 pt-6 ${isLight ? "border-t border-black/10" : "border-t border-white/[0.04]"}`}>
        <div className="flex items-center gap-3">
          <div className="w-1 h-5 rounded-full bg-tap-red" />
          <h2 className={`text-[13px] uppercase tracking-[2px] font-semibold ${isLight ? "text-black/60" : "text-white/50"}`}>
            {isRecruteur ? "Outils de recrutement" : "Accès rapide"}
          </h2>
        </div>
      </div>

      {/* Feature cards — compact */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Link
              key={feature.href}
              href={feature.href}
              className={`group rounded-xl p-4 transition-all duration-300 flex flex-col items-center gap-3 text-center ${
                isLight
                  ? "bg-white border border-tap-red/40 hover:border-tap-red/70 hover:bg-white"
                  : "bg-zinc-900/50 border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.03]"
              }`}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center border transition-all duration-300 group-hover:scale-110"
                style={{ background: `${feature.color}0D`, borderColor: `${feature.color}15` }}
              >
                <Icon size={16} strokeWidth={1.5} style={{ color: `${feature.color}99` }} />
              </div>
              <span
                className={`text-[11px] font-medium transition-colors ${
                  isLight ? "text-black group-hover:text-black" : "text-white/50 group-hover:text-white/70"
                }`}
              >
                {feature.title}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Bottom */}
      <div className={`mt-10 pt-8 flex items-center gap-3 ${isLight ? "border-t border-black/10" : "border-t border-white/[0.04]"}`}>
        <Sparkles size={13} className="text-tap-red/50" />
        <p className={`text-[12px] font-light ${isLight ? "text-black/40" : "text-white/30"}`}>
          Propulsé par l&apos;intelligence artificielle — TAP {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
