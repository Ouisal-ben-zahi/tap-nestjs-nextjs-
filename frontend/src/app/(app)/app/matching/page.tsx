"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useCandidatApplications, useCandidatStats, useCandidatPublicJobs } from "@/hooks/use-candidat";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Users, MapPin, Briefcase, Clock, Sparkles } from "lucide-react";
import { formatRelative, statusBg } from "@/lib/utils";

export default function MatchingPage() {
  const router = useRouter();
  const { isCandidat } = useAuth();
  const statsQuery = useCandidatStats();
  const appsQuery = useCandidatApplications();
  const jobsQuery = useCandidatPublicJobs();

  const stats = statsQuery.data;
  const hasProfile = stats?.candidateId !== null && stats?.candidateId !== undefined;
  const apps = appsQuery.data?.applications || [];

  // Rediriger vers la complétion de profil si aucun candidat en BDD
  useEffect(() => {
    if (!isCandidat) return;
    if (statsQuery.isLoading || statsQuery.isError) return;
    if (!hasProfile) {
      router.push("/app/onboarding-candidat");
    }
  }, [isCandidat, hasProfile, statsQuery.isLoading, statsQuery.isError, router]);

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

  // Si pas de profil, on laisse la redirection faire son travail
  if (!hasProfile && !statsQuery.isError) {
    return null;
  }

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className="relative mb-8 pb-8 border-b border-white/[0.04]">
        <div className="absolute top-[-80px] left-[-100px] w-[350px] h-[350px] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.08),transparent_60%)] blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 mb-4 rounded-full bg-emerald-500/[0.08] border border-emerald-500/15">
            <Users size={13} className="text-emerald-500" />
            <span className="text-[10px] uppercase tracking-[2.5px] text-emerald-500/80 font-semibold">
              Matching intelligent
            </span>
          </div>
          <h1 className="text-[28px] sm:text-[36px] font-bold text-white tracking-[-0.04em] font-heading">
            Offres qui vous correspondent
          </h1>
          <p className="text-white/45 text-[14px] mt-2 font-light">
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
            <h3 className="text-[14px] font-semibold text-white mb-1">Matching IA actif</h3>
            <p className="text-[13px] text-white/45 font-light">
              Notre algorithme analyse votre profil en continu et vous propose les offres les plus adaptées.
            </p>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-zinc-900/50 border border-white/[0.06] rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{stats.applications}</p>
              <p className="text-[11px] text-white/40 mt-1">Candidatures</p>
            </div>
            <div className="bg-zinc-900/50 border border-white/[0.06] rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{stats.statusAccepted}</p>
              <p className="text-[11px] text-white/40 mt-1">Acceptées</p>
            </div>
            <div className="bg-zinc-900/50 border border-white/[0.06] rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{stats.interviews}</p>
              <p className="text-[11px] text-white/40 mt-1">Entretiens</p>
            </div>
          </div>
        )}

        {/* Offres publiques actives */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-5 rounded-full bg-emerald-500" />
            <h2 className="text-[13px] uppercase tracking-[2px] text-white/50 font-semibold">
              Offres disponibles
            </h2>
          </div>

          {jobsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : jobsQuery.isError ? (
            <ErrorState onRetry={() => jobsQuery.refetch()} />
          ) : !jobsQuery.data?.jobs?.length ? (
            <EmptyState
              icon={<Briefcase className="w-10 h-10" />}
              title="Aucune offre active"
              description="Revenez bientôt, de nouvelles offres seront publiées."
            />
          ) : (
            <div className="space-y-3">
              {jobsQuery.data.jobs.map((job) => {
                const localisation =
                  typeof job.location_type === "string" && job.location_type.trim()
                    ? job.location_type
                    : null;

                return (
                  <div
                    key={job.id}
                    className="bg-zinc-900/50 border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.1] transition group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[15px] font-semibold text-white truncate">
                          {job.title ?? "Offre sans titre"}
                        </h3>

                        <div className="mt-2 flex items-center gap-3 text-[12px] text-white/50">
                          {localisation && (
                            <span className="flex items-center gap-1">
                              <MapPin size={12} />
                              {localisation}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-end gap-2 text-[11px] text-white/35">
                        <span>{job.created_at && formatRelative(job.created_at)}</span>
                        <button
                          type="button"
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

        {/* Vos candidatures */}
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-5 rounded-full bg-emerald-500" />
            <h2 className="text-[13px] uppercase tracking-[2px] text-white/50 font-semibold">
              Vos candidatures
            </h2>
          </div>

          {appsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : appsQuery.isError ? (
            <ErrorState onRetry={() => appsQuery.refetch()} />
          ) : apps.length === 0 ? (
            <EmptyState
              icon={<Briefcase className="w-10 h-10" />}
              title="Aucune candidature"
              description="Les offres matchées par l'IA apparaîtront ici."
            />
          ) : (
            <div className="space-y-3">
              {apps.map((app) => (
                <div
                  key={app.id}
                  className="bg-zinc-900/50 border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.1] transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-[15px] font-semibold text-white truncate">
                          {app.job_title}
                        </h3>
                        <span
                          className={`text-[11px] px-2.5 py-1 rounded-full border font-medium shrink-0 ${statusBg(
                            app.status,
                          )}`}
                        >
                          {app.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[12px] text-white/40">
                        <span className="flex items-center gap-1">
                          <Briefcase size={12} />
                          {app.company}
                        </span>
                        {app.category && (
                          <span className="flex items-center gap-1">
                            <MapPin size={12} />
                            {app.category}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatRelative(app.applied_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    </div>
  );
}
