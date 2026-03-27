"use client";

import { useAuth } from "@/hooks/use-auth";
import { useCandidatStats, useCandidatScore } from "@/hooks/use-candidat";
import ScoreRing from "@/components/app/ScoreRing";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { BarChart3, Upload, FileText, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";

const DIMENSION_COLORS = [
  "bg-red-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-cyan-500",
];

export default function ScoringAppPage() {
  const { isCandidat } = useAuth();
  const theme = useDashboardTheme();
  const isLight = theme === "light";
  const statsQuery = useCandidatStats();
  const scoreQuery = useCandidatScore();

  if (!isCandidat) {
    return (
      <EmptyState
        icon={<BarChart3 className="w-12 h-12" />}
        title="Espace candidat uniquement"
        description="Cette section est réservée aux candidats."
      />
    );
  }

  const stats = statsQuery.data;
  const scoreData = scoreQuery.data;

  const hasProfile = stats?.candidateId !== null && stats?.candidateId !== undefined;

  const rawScore = typeof scoreData?.scoreGlobal === "number" ? scoreData.scoreGlobal : null;
  const hasJsonScore = rawScore !== null;
  const score = hasJsonScore ? Math.round(rawScore as number) : 0;

  const jsonDimensions = Array.isArray(scoreData?.dimensions) ? scoreData!.dimensions : [];

  const dimensions =
    hasJsonScore && jsonDimensions.length > 0
      ? jsonDimensions.map((d, i) => ({
          label: d.label,
          color: DIMENSION_COLORS[i % DIMENSION_COLORS.length],
          value: Math.max(0, Math.min(100, Math.round(d.score))),
        }))
      : DIMENSION_COLORS.map((color, i) => ({
          label: ["Compétences techniques", "Soft skills", "Expérience", "Formation", "Langues", "Portfolio"][i] ?? `Dimension ${i + 1}`,
          color,
          value: 0,
        }));
  const themedCardClass =
    "group card-animated-border relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#020001] shadow-[0_10px_28px_rgba(0,0,0,0.45)] hover:bg-[linear-gradient(180deg,rgba(202,27,40,0.08)_0%,rgba(10,10,10,0.96)_30%,rgba(10,10,10,0.96)_100%)] hover:border-tap-red/15 transition-all duration-500";

  return (
    <div className="max-w-[1100px] mx-auto">
      {/* Header */}
      <div className={`relative mb-8 pb-8 ${isLight ? "border-b border-black/10" : "border-b border-white/[0.04]"}`}>
        <div className="absolute top-[-80px] left-[-100px] w-[350px] h-[350px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.08),transparent_60%)] blur-3xl pointer-events-none" />
        <div className="relative">
          <h1 className={`text-[28px] sm:text-[36px] font-bold tracking-[-0.04em] font-heading ${isLight ? "text-black" : "text-white"}`}>
            Votre score
          </h1>
          <p className={`text-[14px] mt-2 font-light ${isLight ? "text-black/60" : "text-white/45"}`}>
            Évaluation détaillée de votre profil basée sur le marché de l&apos;emploi marocain.
          </p>
        </div>
      </div>

      {/* Loading */}
      {statsQuery.isLoading || scoreQuery.isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex justify-center py-12">
            <Skeleton className="w-[200px] h-[200px] rounded-full" />
          </div>
          <div className="space-y-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        </div>
      ) : statsQuery.isError ? (
        <ErrorState onRetry={() => statsQuery.refetch()} />
      ) : !hasProfile ? (
        /* Empty state */
        <EmptyState
          icon={<FileText className="w-12 h-12" />}
          title="Aucun profil analysé"
          description="Uploadez votre CV pour que notre IA évalue votre profil et génère votre score d'employabilité."
          action={
            <Link href="/app/analyse-cv" className="btn-primary gap-2 mt-2">
              <Upload size={14} /> Analyser mon CV
            </Link>
          }
        />
      ) : (
        /* Score Content */
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Score Ring */}
            <div
              className={`flex flex-col items-center justify-center p-6 sm:p-8 transition-all duration-300 hover:-translate-y-0.5 ${
                isLight
                  ? "hover:shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
                  : "hover:brightness-105 hover:shadow-[0_18px_45px_rgba(0,0,0,0.35)]"
              } ${themedCardClass} ${isLight ? "card-luxury-light" : ""}`}
            >
              {!isLight && (
                <div className="pointer-events-none absolute inset-0 opacity-100 transition-opacity duration-500 group-hover:opacity-0">
                  <div className="absolute -top-24 -right-28 h-72 w-72 rounded-full bg-white/5 blur-2xl" />
                  <div className="absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-blue-500/10 opacity-60 blur-2xl" />
                </div>
              )}
              {isLight && (
                <>
                  <div className="pointer-events-none absolute -right-[45px] -top-[45px] h-28 w-28 rounded-full bg-white/5 blur-2xl" />
                  <div className="pointer-events-none absolute -bottom-10 -left-[50px] h-28 w-28 rounded-full bg-tap-red/10 blur-2xl" />
                </>
              )}
              <div className="relative z-10">
                <ScoreRing score={score} size={200} label="Score global" />
              </div>
              <div className={`relative mt-6 flex items-center gap-2 text-[13px] ${isLight ? "text-black/60" : "text-white/40"}`}>
                <TrendingUp size={14} className="text-green-500" />
                <span>Basé sur votre activité et votre profil</span>
              </div>
            </div>

            {/* Dimensions */}
            <div
              className={`${themedCardClass} p-6 transition-all duration-300 hover:-translate-y-0.5 sm:p-8 ${
                isLight
                  ? "hover:shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
                  : "hover:brightness-105 hover:shadow-[0_18px_45px_rgba(0,0,0,0.35)]"
              } ${isLight ? "card-luxury-light" : ""}`}
            >
              {!isLight && (
                <div className="pointer-events-none absolute inset-0 opacity-100 transition-opacity duration-500 group-hover:opacity-0">
                  <div className="absolute -top-24 -right-28 h-72 w-72 rounded-full bg-white/5 blur-2xl" />
                  <div className="absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-emerald-500/10 opacity-60 blur-2xl" />
                </div>
              )}
              <h3 className={`relative mb-6 text-[13px] font-semibold uppercase tracking-[2px] ${isLight ? "text-black" : "text-white/50"}`}>
                Dimensions évaluées
              </h3>
              <div className="relative space-y-5">
                {dimensions.map((dim) => (
                  <div key={dim.label}>
                    <div className="flex justify-between text-[13px] mb-2">
                      <span className={isLight ? "text-black/70" : "text-white/60"}>{dim.label}</span>
                      <span className={isLight ? "text-black font-medium" : "text-white/80 font-medium"}>{dim.value}/100</span>
                    </div>
                    <div className={`h-2.5 rounded-full overflow-hidden ${isLight ? "bg-black/10" : "bg-white/10"}`}>
                      <div
                        className={`h-full ${dim.color} rounded-full transition-all duration-1000 ease-out`}
                        style={{ width: `${dim.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tips */}
          <div
            className={`${themedCardClass} p-6 transition-all duration-300 hover:-translate-y-0.5 ${
              isLight
                ? "hover:shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
                : "hover:brightness-105 hover:shadow-[0_18px_45px_rgba(0,0,0,0.35)]"
            } ${isLight ? "card-luxury-light" : ""}`}
          >
            {!isLight && (
              <div className="pointer-events-none absolute inset-0 opacity-100 transition-opacity duration-500 group-hover:opacity-0">
                <div className="absolute -top-24 -right-28 h-72 w-72 rounded-full bg-white/5 blur-2xl" />
                <div className="absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-tap-red/10 opacity-40 blur-2xl" />
              </div>
            )}
            <h3 className={`relative mb-4 text-[13px] font-semibold uppercase tracking-[2px] ${isLight ? "text-black" : "text-white/50"}`}>
              Conseils pour améliorer votre score
            </h3>
            <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { text: "Complétez votre profil en uploadant un CV détaillé", href: "/app/analyse-cv" },
                { text: "Postulez à des offres qui correspondent à votre profil", href: "/app/matching" },
                { text: "Suivez les formations recommandées par l'IA", href: "/app/formation" },
              ].map((tip, i) => (
                <Link
                  key={i}
                  href={tip.href}
                  className={`flex items-start gap-3 p-4 rounded-xl transition group ${
                    isLight
                      ? "bg-white border border-tap-red/30 hover:border-tap-red/60"
                      : "bg-[#020001] border border-white/[0.08] hover:border-tap-red/15"
                  }`}
                >
                  <span className="w-6 h-6 rounded-full bg-tap-red/10 text-tap-red text-[11px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <p className={`text-[12px] transition-colors leading-relaxed ${isLight ? "text-black/70 group-hover:text-black" : "text-white/50 group-hover:text-white/70"}`}>{tip.text}</p>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
