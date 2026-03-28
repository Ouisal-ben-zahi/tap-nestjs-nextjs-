"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  useCandidatStats,
  useCandidatGenerationComplete,
} from "@/hooks/use-candidat";
import { useRecruiterCompanyProfile } from "@/hooks/use-recruteur";
import { isRecruiterCompanyProfileComplete } from "@/lib/recruiter-profile";
import CandidatDashboard from "@/components/app/dashboard/CandidatDashboard";
import RecruteurDashboard from "@/components/app/dashboard/RecruteurDashboard";
import { Skeleton } from "@/components/ui/Skeleton";
import ErrorState from "@/components/ui/ErrorState";
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

interface Feature {
  href: string;
  icon: LucideIcon;
  title: string;
  color: string;
}

const candidatFeatures: Feature[] = [
  { href: "/app/analyse-cv", icon: FileText, title: "Analyse CV", color: "#ef4444" },
  { href: "/app/scoring", icon: BarChart3, title: "Évaluation", color: "#3b82f6" },
  { href: "/app/matching", icon: Users, title: "Offres IA", color: "#10b981" },
  { href: "/app/formation", icon: GraduationCap, title: "Formation", color: "#f59e0b" },
  { href: "/app/entretien", icon: MessageSquare, title: "Entretien IA", color: "#a855f7" },
  { href: "/app/mes-fichiers", icon: FolderOpen, title: "Mes fichiers", color: "#06b6d4" },
];

const recruteurFeatures: Feature[] = [
  { href: "/app/offres", icon: Briefcase, title: "Mes offres", color: "#ef4444" },
  { href: "/app/candidats", icon: Search, title: "Candidats", color: "#3b82f6" },
  { href: "/app/matching-recruteur", icon: UserCheck, title: "Appariement IA", color: "#10b981" },
  { href: "/app/entretiens-planifies", icon: MessageSquare, title: "Entretiens", color: "#a855f7" },
  { href: "/app/statistiques", icon: LayoutList, title: "Statistiques", color: "#f59e0b" },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuth();
  const isRecruteur = user?.role === "recruteur";
  const isCandidat = user?.role === "candidat";
  const statsQuery = useCandidatStats();
  const recruiterCompanyQuery = useRecruiterCompanyProfile(isRecruteur);
  const features = isRecruteur ? recruteurFeatures : candidatFeatures;
  const stats = statsQuery.data;
  const hasCandidateProfile =
    stats?.candidateId !== null && stats?.candidateId !== undefined;
  const generationCheckEnabled =
    isCandidat &&
    !statsQuery.isLoading &&
    !statsQuery.isError &&
    hasCandidateProfile;
  const generationQuery = useCandidatGenerationComplete(generationCheckEnabled);
  const candidateFullName = isCandidat
    ? [stats?.firstName, stats?.lastName].filter((v) => Boolean(v && String(v).trim())).join(" ")
    : "";
  /** Tableau de bord recruteur : nom affiché à côté de « Bienvenue » = nom de société (fiche entreprise). */
  const recruiterWelcomeLabel = isRecruteur
    ? (recruiterCompanyQuery.data?.nomSociete?.trim() ?? "")
    : "";
  const welcomeName =
    (isRecruteur ? recruiterWelcomeLabel : candidateFullName) ||
    user?.email?.split("@")[0] ||
    "";
  const isLight = false;

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("dashboard-theme", "dark");
    window.dispatchEvent(new Event("dashboard-theme-change"));
  }, []);

  // Recruteur sans fiche entreprise valide (ou erreur API) → onboarding
  useEffect(() => {
    if (!isRecruteur || !isHydrated) return;
    if (recruiterCompanyQuery.isLoading || recruiterCompanyQuery.isFetching) return;
    if (
      recruiterCompanyQuery.isSuccess &&
      isRecruiterCompanyProfileComplete(recruiterCompanyQuery.data)
    ) {
      return;
    }
    router.replace("/app/onboarding-recruteur");
  }, [
    isRecruteur,
    isHydrated,
    recruiterCompanyQuery.isLoading,
    recruiterCompanyQuery.isFetching,
    recruiterCompanyQuery.isSuccess,
    recruiterCompanyQuery.data,
    recruiterCompanyQuery.isError,
    router,
  ]);

  // Si candidat connecté mais aucun profil candidat en base, rediriger vers onboarding
  useEffect(() => {
    if (!isCandidat) return;
    if (statsQuery.isLoading || statsQuery.isError || statsQuery.isFetching)
      return;
    if (!hasCandidateProfile) {
      router.push("/app/onboarding-candidat");
    }
  }, [
    isCandidat,
    hasCandidateProfile,
    statsQuery.isLoading,
    statsQuery.isError,
    statsQuery.isFetching,
    statsQuery.data,
    router,
  ]);

  // Profil créé mais fichiers (CV, Talent Card, scoring, portfolio) encore absents → onboarding
  useEffect(() => {
    if (!isCandidat) return;
    if (!generationCheckEnabled) return;
    if (generationQuery.isLoading) return;
    if (generationQuery.isError) return;
    if (generationQuery.data !== false) return;
    router.push("/app/onboarding-candidat?resume=1");
  }, [
    isCandidat,
    generationCheckEnabled,
    generationQuery.isLoading,
    generationQuery.isError,
    generationQuery.data,
    router,
  ]);

  const recruiterGateBlocking =
    isRecruteur &&
    (!isHydrated ||
      recruiterCompanyQuery.isLoading ||
      recruiterCompanyQuery.isFetching ||
      recruiterCompanyQuery.isError ||
      (recruiterCompanyQuery.isSuccess &&
        !isRecruiterCompanyProfileComplete(recruiterCompanyQuery.data)));

  const generationGateBlocking =
    isCandidat &&
    hasCandidateProfile &&
    (generationQuery.isLoading ||
      generationQuery.data === false ||
      (generationQuery.isError && generationQuery.data !== true));

  if (recruiterGateBlocking) {
    return (
      <div className="max-w-[1100px] mx-auto py-12">
        <Skeleton className="h-10 w-2/3 max-w-md mb-6 rounded-lg" />
        <Skeleton className="h-48 w-full mb-4 rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (generationGateBlocking) {
    if (generationQuery.isError) {
      return (
        <div className="max-w-[1100px] mx-auto py-12">
          <ErrorState
            message="Impossible de vérifier que ton profil est prêt. Réessaie dans un instant."
            onRetry={() => generationQuery.refetch()}
          />
        </div>
      );
    }
    return (
      <div className="max-w-[1100px] mx-auto py-12">
        <Skeleton className="h-10 w-2/3 max-w-md mb-6 rounded-lg" />
        <Skeleton className="h-48 w-full mb-4 rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

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
            Bienvenue{welcomeName ? "," : ""}
            {welcomeName && (
              <span
                className={`ml-2 ${
                  isLight
                    ? "text-[rgba(202,27,40,1)]"
                    : "text-[rgba(202,27,40,1)]"
                }`}
              >
                {welcomeName}
              </span>
            )}
          </h1>
          <p className={`text-[15px] font-light max-w-md ${isLight ? "text-black/55" : "text-white/45"}`}>
            {isRecruteur ? "Gérez vos recrutements et trouvez les meilleurs talents." : ""}
          </p>
        </div>
      </div>

      {/* Live Dashboard */}
      <div className="mt-14 sm:mt-16">
        {isRecruteur ? <RecruteurDashboard /> : <CandidatDashboard />}
      </div>

      {/* Bottom */}
      <div className={`mt-10 pt-8 flex items-center justify-center ${isLight ? "border-t border-black/10" : "border-t border-white/[0.04]"}`}>
        <p className={`text-[12px] font-light ${isLight ? "text-black/40" : "text-white/30"}`}>
          Propulsé par l&apos;intelligence artificielle — TAP {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
