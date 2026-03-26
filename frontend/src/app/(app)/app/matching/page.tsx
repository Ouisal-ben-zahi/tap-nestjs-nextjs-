"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useCandidatStats, useCandidatMatchingJobs, useCandidatPublicJobs } from "@/hooks/use-candidat";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Users, MapPin, Briefcase, Sparkles, SlidersHorizontal, FileText, CheckCircle2, Calendar } from "lucide-react";
import { formatRelative } from "@/lib/utils";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";

export default function MatchingPage() {
  const router = useRouter();
  const { isCandidat, isHydrated } = useAuth();
  const enabled = Boolean(isCandidat && isHydrated);
  const [showAllOffers, setShowAllOffers] = useState(false);
  const statsQuery = useCandidatStats(enabled);
  const jobsQuery = useCandidatMatchingJobs(enabled);
  const publicJobsQuery = useCandidatPublicJobs(enabled && showAllOffers);
  const theme = useDashboardTheme();
  const isLight = theme === "light";

  const stats = statsQuery.data;
  const hasProfile = stats?.candidateId !== null && stats?.candidateId !== undefined;

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const totalStatuses =
    (stats?.statusPending ?? 0) + (stats?.statusAccepted ?? 0) + (stats?.statusRefused ?? 0);
  const acceptanceRate =
    totalStatuses > 0 ? Math.round(((stats?.statusAccepted ?? 0) / totalStatuses) * 100) : 0;
  const interviewRate =
    (stats?.applications ?? 0) > 0
      ? Math.round(((stats?.interviews ?? 0) / (stats?.applications ?? 1)) * 100)
      : 0;

  // Rediriger vers la complétion de profil si aucun candidat en BDD
  useEffect(() => {
    if (!isCandidat) return;
    if (statsQuery.isLoading || statsQuery.isError || statsQuery.isFetching)
      return;
    if (!hasProfile) {
      router.push("/app/onboarding-candidat");
    }
  }, [
    isCandidat,
    hasProfile,
    statsQuery.isLoading,
    statsQuery.isError,
    statsQuery.isFetching,
    router,
  ]);

  if (!isCandidat) {
    return (
      <EmptyState
        icon={<Users className="w-12 h-12" />}
        title="Espace candidat uniquement"
        description="Cette section est réservée aux candidats."
      />
    );
  }

  // Pendant le chargement initial, afficher un petit skeleton
  if (statsQuery.isLoading) {
    return (
      <div className="max-w-[1100px] mx-auto py-12">
        <Skeleton className="h-24 w-full mb-4" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className={`relative mb-8 pb-8 ${isLight ? "border-b border-black/10" : "border-b border-white/[0.04]"}`}>
        <div className="absolute top-[-80px] left-[-100px] w-[350px] h-[350px] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.08),transparent_60%)] blur-3xl pointer-events-none" />
        <div className="relative">
          <h1 className={`text-[28px] sm:text-[36px] font-bold tracking-[-0.04em] font-heading ${isLight ? "text-black" : "text-white"}`}>
            Offres qui vous correspondent
          </h1>
          <p className={`text-[14px] mt-2 font-light ${isLight ? "text-black/60" : "text-white/45"}`}>
            Notre IA analyse votre profil et vous connecte aux offres les plus pertinentes.
          </p>
        </div>
      </div>

      <>
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            {[
              {
                key: "applications",
                label: "Candidatures",
                value: stats?.applications ?? 0,
                meta: `${stats?.statusPending ?? 0} en attente`,
                icon: FileText,
                iconClass: "text-red-500",
                badgeClass: "bg-red-500/10 border-red-500/20",
              },
              {
                key: "accepted",
                label: "Acceptées",
                value: stats?.statusAccepted ?? 0,
                meta: `${acceptanceRate}% taux acceptation`,
                icon: CheckCircle2,
                iconClass: "text-emerald-500",
                badgeClass: "bg-emerald-500/10 border-emerald-500/20",
              },
              {
                key: "interviews",
                label: "Entretiens",
                value: stats?.interviews ?? 0,
                meta: `${interviewRate}% de conversion`,
                icon: Calendar,
                iconClass: "text-blue-500",
                badgeClass: "bg-blue-500/10 border-blue-500/20",
              },
            ].map((card, idx) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.key}
                  className={`group rounded-2xl p-5 relative overflow-hidden ${
                    isLight
                      ? "card-luxury-light"
                      : "bg-zinc-900/60 border border-white/[0.07]"
                  } transition-all duration-300 hover:-translate-y-0.5 ${
                    isLight
                      ? "hover:shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
                      : "hover:brightness-105 shadow-[0_18px_40px_rgba(0,0,0,0.25)]"
                  }`}
                  style={{
                    opacity: isMounted ? 1 : 0,
                    transform: isMounted ? "translateY(0px)" : "translateY(8px)",
                    transitionDelay: isMounted ? `${40 * idx}ms` : "0ms",
                  }}
                >
                  {/* Overlay glint premium */}
                  <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute -top-20 -right-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
                    <div className="absolute -bottom-24 -left-20 w-56 h-56 rounded-full bg-tap-red/10 blur-2xl opacity-40" />
                  </div>

                  {isLight && (
                    <>
                      <div className="absolute top-[-45px] right-[-45px] w-28 h-28 rounded-full bg-white/5 blur-2xl pointer-events-none" />
                      <div className="absolute bottom-[-40px] left-[-50px] w-28 h-28 rounded-full bg-tap-red/10 blur-2xl pointer-events-none" />
                    </>
                  )}

                  <div className="flex items-start justify-between gap-3 relative">
                    <div>
                      <p
                        className={`text-[11px] uppercase tracking-[1.5px] ${
                          isLight ? "text-black/55" : "text-white/85"
                        }`}
                      >
                        {card.label}
                      </p>
                      <p
                        className={`mt-2 text-[30px] font-bold tracking-[-0.03em] ${
                          isLight ? "text-black" : "text-white"
                        }`}
                      >
                        {card.value}
                      </p>
                      <p className={`mt-1 text-[12px] ${isLight ? "text-black/55" : "text-white/70"}`}>
                        {card.meta}
                      </p>
                    </div>

                    <div
                      className={`w-11 h-11 rounded-xl border flex items-center justify-center ${
                        isLight ? card.badgeClass : "bg-white/15 border-white/25"
                      }`}
                    >
                      <Icon size={18} className={isLight ? card.iconClass : "text-white"} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Offres matchées par IA */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 rounded-full bg-emerald-500" />
              <h2 className={`text-[13px] uppercase tracking-[2px] font-semibold ${isLight ? "text-black" : "text-white/50"}`}>
                {showAllOffers ? "Toutes les offres" : "Offres recommandées par l'IA"}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAllOffers((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] transition ${
                  showAllOffers
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                    : isLight
                      ? "border-black/15 text-black/60 hover:bg-black/5"
                      : "border-white/[0.12] text-white/50 hover:bg-white/[0.05]"
                }`}
                title={showAllOffers ? "Afficher le matching IA" : "Afficher toutes les offres"}
              >
                <SlidersHorizontal size={13} />
                {showAllOffers ? "Toutes" : "Matching"}
              </button>
              {(showAllOffers ? publicJobsQuery.data?.jobs?.length : jobsQuery.data?.jobs?.length) ? (
                <span className="text-[11px] text-emerald-500/70 font-medium">
                  {showAllOffers
                    ? `${publicJobsQuery.data?.jobs?.length ?? 0} offre${(publicJobsQuery.data?.jobs?.length ?? 0) > 1 ? "s" : ""}`
                    : `${jobsQuery.data?.jobs?.length ?? 0} offre${(jobsQuery.data?.jobs?.length ?? 0) > 1 ? "s" : ""} matchée${(jobsQuery.data?.jobs?.length ?? 0) > 1 ? "s" : ""}`}
                </span>
              ) : null}
            </div>
          </div>

          {(showAllOffers ? publicJobsQuery.isLoading : jobsQuery.isLoading) ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (showAllOffers ? publicJobsQuery.isError : jobsQuery.isError) ? (
            <ErrorState
              onRetry={() => (showAllOffers ? publicJobsQuery.refetch() : jobsQuery.refetch())}
              message={String(
                ((showAllOffers ? publicJobsQuery.error : jobsQuery.error) as any)?.response?.data?.message ??
                  ((showAllOffers ? publicJobsQuery.error : jobsQuery.error) as any)?.message ??
                  "Une erreur est survenue",
              )}
            />
          ) : !(showAllOffers ? publicJobsQuery.data?.jobs?.length : jobsQuery.data?.jobs?.length) ? (
            <EmptyState
              icon={<Sparkles className="w-10 h-10" />}
              title={showAllOffers ? "Aucune offre pour l'instant" : "Aucune offre matchée pour l'instant"}
              description={
                showAllOffers
                  ? "Aucune offre active n'est disponible pour le moment."
                  : "L'IA n'a pas encore trouvé d'offres suffisamment proches de votre profil. Revenez bientôt."
              }
            />
          ) : (
            <div className="space-y-3">
              {(showAllOffers ? publicJobsQuery.data?.jobs ?? [] : jobsQuery.data?.jobs ?? []).map((job) => {
                const localisation =
                  typeof job.location_type === "string" && job.location_type.trim()
                    ? job.location_type
                    : null;
                const scorePct = Math.round((job.score ?? 0) * 100);
                const scoreColor =
                  scorePct >= 85
                    ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                    : scorePct >= 70
                    ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
                    : "text-white/50 border-white/10 bg-white/5";

                return (
                  <div
                    key={job.id}
                    onClick={() => router.push(`/app/matching/offres/${job.id}`)}
                    className={`rounded-xl p-5 transition group cursor-pointer ${
                      isLight
                      ? "card-luxury-light hover:border-tap-red/70"
                        : "bg-zinc-900/50 border border-white/[0.06] hover:border-white/[0.1]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                          <h3 className="text-[15px] font-semibold text-white truncate">
                            {job.title ?? "Offre sans titre"}
                          </h3>
                          {job.categorie_profil && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-white/45 shrink-0">
                              {job.categorie_profil}
                            </span>
                          )}
                          {job.urgent && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 shrink-0">
                              Urgent
                            </span>
                          )}
                        </div>
                        <div className={`mt-1 flex items-center gap-3 text-[12px] ${isLight ? "text-black/70" : "text-white/45"}`}>
                          {localisation && (
                            <span className="flex items-center gap-1">
                              <MapPin size={12} />
                              {localisation}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-2">
                        {!showAllOffers && (
                          <span className={`text-[12px] font-semibold px-2.5 py-1 rounded-full border ${scoreColor}`}>
                            {scorePct}% match
                          </span>
                        )}
                        <span className={`text-[11px] ${isLight ? "text-black/50" : "text-white/30"}`}>
                          {job.created_at && formatRelative(job.created_at)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/app/matching/offres/${job.id}`);
                          }}
                          className="btn-primary !py-1.5 !px-3 text-[12px] gap-1"
                        >
                          <Briefcase size={12} />
                          Postuler
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </>
    </div>
  );
}
