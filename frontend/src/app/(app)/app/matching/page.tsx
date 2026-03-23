"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useCandidatStats, useCandidatMatchingJobs } from "@/hooks/use-candidat";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Users, MapPin, Briefcase, Sparkles } from "lucide-react";
import { formatRelative } from "@/lib/utils";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";

export default function MatchingPage() {
  const router = useRouter();
  const { isCandidat, isHydrated } = useAuth();
  const enabled = Boolean(isCandidat && isHydrated);
  const statsQuery = useCandidatStats(enabled);
  const jobsQuery = useCandidatMatchingJobs(enabled);
  const theme = useDashboardTheme();
  const isLight = theme === "light";

  const stats = statsQuery.data;
  const hasProfile = stats?.candidateId !== null && stats?.candidateId !== undefined;

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
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 mb-4 rounded-full bg-emerald-500/[0.08] border border-emerald-500/15">
            <Users size={13} className="text-emerald-500" />
            <span className="text-[10px] uppercase tracking-[2.5px] text-emerald-500/80 font-semibold">
              Matching intelligent
            </span>
          </div>
          <h1 className={`text-[28px] sm:text-[36px] font-bold tracking-[-0.04em] font-heading ${isLight ? "text-black" : "text-white"}`}>
            Offres qui vous correspondent
          </h1>
          <p className={`text-[14px] mt-2 font-light ${isLight ? "text-black/60" : "text-white/45"}`}>
            Notre IA analyse votre profil et vous connecte aux offres les plus pertinentes.
          </p>
        </div>
      </div>

      <>
        <div className="bg-emerald-500/[0.06] border border-emerald-500/15 rounded-2xl p-6 mb-8 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Sparkles size={18} className="text-emerald-500" />
          </div>
          <div>
            <h3 className={`text-[14px] font-semibold mb-1 ${isLight ? "text-black" : "text-white"}`}>Matching IA actif</h3>
            <p className={`text-[13px] font-light ${isLight ? "text-black/70" : "text-white/45"}`}>
              Notre algorithme analyse votre profil en continu et vous propose les offres les plus adaptées.
            </p>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className={`rounded-xl p-4 text-center ${isLight ? "bg-white border border-tap-red/40" : "bg-zinc-900/50 border border-white/[0.06]"}`}>
              <p className={`text-2xl font-bold ${isLight ? "text-black" : "text-white"}`}>{stats.applications}</p>
              <p className={`text-[11px] mt-1 ${isLight ? "text-black/60" : "text-white/40"}`}>Candidatures</p>
            </div>
            <div className={`rounded-xl p-4 text-center ${isLight ? "bg-white border border-tap-red/40" : "bg-zinc-900/50 border border-white/[0.06]"}`}>
              <p className={`text-2xl font-bold ${isLight ? "text-black" : "text-white"}`}>{stats.statusAccepted}</p>
              <p className={`text-[11px] mt-1 ${isLight ? "text-black/60" : "text-white/40"}`}>Acceptées</p>
            </div>
            <div className={`rounded-xl p-4 text-center ${isLight ? "bg-white border border-tap-red/40" : "bg-zinc-900/50 border border-white/[0.06]"}`}>
              <p className={`text-2xl font-bold ${isLight ? "text-black" : "text-white"}`}>{stats.interviews}</p>
              <p className={`text-[11px] mt-1 ${isLight ? "text-black/60" : "text-white/40"}`}>Entretiens</p>
            </div>
          </div>
        )}

        {/* Offres matchées par IA */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 rounded-full bg-emerald-500" />
              <h2 className={`text-[13px] uppercase tracking-[2px] font-semibold ${isLight ? "text-black" : "text-white/50"}`}>
                Offres recommandées par l'IA
              </h2>
            </div>
            {jobsQuery.data?.jobs?.length ? (
              <span className="text-[11px] text-emerald-500/70 font-medium">
                {jobsQuery.data.jobs.length} offre{jobsQuery.data.jobs.length > 1 ? "s" : ""} matchée{jobsQuery.data.jobs.length > 1 ? "s" : ""}
              </span>
            ) : null}
          </div>

          {jobsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : jobsQuery.isError ? (
            <ErrorState
              onRetry={() => jobsQuery.refetch()}
              message={String(
                (jobsQuery.error as any)?.response?.data?.message ??
                  (jobsQuery.error as any)?.message ??
                  "Une erreur est survenue",
              )}
            />
          ) : !jobsQuery.data?.jobs?.length ? (
            <EmptyState
              icon={<Sparkles className="w-10 h-10" />}
              title="Aucune offre matchée pour l'instant"
              description="L'IA n'a pas encore trouvé d'offres suffisamment proches de votre profil. Revenez bientôt."
            />
          ) : (
            <div className="space-y-3">
              {jobsQuery.data.jobs.map((job) => {
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
<<<<<<< Updated upstream
                    className="bg-zinc-900/50 border border-white/[0.06] rounded-xl p-5 hover:border-emerald-500/20 transition group"
=======
                    onClick={() => router.push(`/app/matching/offres/${job.id}`)}
                    className={`rounded-xl p-5 transition group cursor-pointer ${
                      isLight
                        ? "bg-white border border-tap-red/40 hover:border-tap-red/70"
                        : "bg-zinc-900/50 border border-white/[0.06] hover:border-white/[0.1]"
                    }`}
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
                        <div className="mt-1 flex items-center gap-3 text-[12px] text-white/45">
=======
                        <div className={`mt-1 flex items-center gap-3 text-[12px] ${isLight ? "text-black/70" : "text-white/45"}`}>
>>>>>>> Stashed changes
                          {localisation && (
                            <span className="flex items-center gap-1">
                              <MapPin size={12} />
                              {localisation}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-2">
                        {/* Score IA */}
                        <span className={`text-[12px] font-semibold px-2.5 py-1 rounded-full border ${scoreColor}`}>
                          {scorePct}% match
                        </span>
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
