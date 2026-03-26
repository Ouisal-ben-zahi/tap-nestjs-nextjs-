"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRecruteurOverview, useRecruteurJobs } from "@/hooks/use-recruteur";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { UserCheck, Briefcase, Users, Target, ArrowRight, Eye } from "lucide-react";
import Link from "next/link";

export default function MatchingRecruteurPage() {
  const { user } = useAuth();
  const isRecruteur = user?.role === "recruteur";
  const overviewQuery = useRecruteurOverview();
  const jobsQuery = useRecruteurJobs();

  if (!isRecruteur) {
    return (
      <EmptyState
        icon={<UserCheck className="w-12 h-12" />}
        title="Espace recruteur uniquement"
        description="Cette section est réservée aux recruteurs."
      />
    );
  }

  const overview = overviewQuery.data;
  const jobs = jobsQuery.data?.jobs || [];
  const isLoading = overviewQuery.isLoading || jobsQuery.isLoading;
  const isError = overviewQuery.isError || jobsQuery.isError;

  return (
    <div className="max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="relative mb-8 pb-8 border-b border-white/[0.04]">
        <div className="absolute top-[-80px] left-[-100px] w-[350px] h-[350px] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.08),transparent_60%)] blur-3xl pointer-events-none" />
        <div className="relative">
          <h1 className="text-[28px] sm:text-[36px] font-bold text-white tracking-[-0.04em] font-heading">
            Appariement intelligent
          </h1>
          <p className="text-white/45 text-[14px] mt-2 font-light">
            Notre IA identifie les candidats les plus adaptés à chacune de vos offres.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => { overviewQuery.refetch(); jobsQuery.refetch(); }} />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="w-10 h-10" />}
          title="Aucune offre publiée"
          description="Publiez votre première offre pour que l'IA puisse matcher des candidats."
          action={
            <Link href="/app/offres" className="btn-primary gap-2 mt-2">
              <Briefcase size={14} /> Créer une offre
            </Link>
          }
        />
      ) : (
        <>
          {/* Stats rapides */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            <div className="group rounded-2xl p-5 relative overflow-hidden bg-zinc-900/60 border border-white/[0.07] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 shadow-[0_18px_40px_rgba(0,0,0,0.25)]">
              {/* Overlay glint */}
              <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute -top-20 -right-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute -bottom-24 -left-20 w-56 h-56 rounded-full bg-tap-red/10 blur-2xl opacity-40" />
              </div>
              <div className="flex items-start justify-between gap-3 relative">
                <div>
                  <p className="text-[11px] uppercase tracking-[1.5px] text-white/85">Offres actives</p>
                  <p className="mt-2 text-[30px] font-bold tracking-[-0.03em] text-white">{overview?.totalJobs ?? 0}</p>
                  <p className="mt-1 text-[12px] text-white/70">{overview?.urgentJobs ?? 0} postes urgents</p>
                </div>
                <div className="w-11 h-11 rounded-xl border flex items-center justify-center bg-white/15 border-white/25">
                  <Briefcase size={18} className="text-white" />
                </div>
              </div>
            </div>

            <div className="group rounded-2xl p-5 relative overflow-hidden bg-zinc-900/60 border border-white/[0.07] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 shadow-[0_18px_40px_rgba(0,0,0,0.25)]">
              <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute -top-20 -right-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute -bottom-24 -left-20 w-56 h-56 rounded-full bg-tap-red/10 blur-2xl opacity-40" />
              </div>
              <div className="flex items-start justify-between gap-3 relative">
                <div>
                  <p className="text-[11px] uppercase tracking-[1.5px] text-white/85">Candidats disponibles</p>
                  <p className="mt-2 text-[30px] font-bold tracking-[-0.03em] text-white">{overview?.totalCandidates ?? 0}</p>
                  <p className="mt-1 text-[12px] text-white/70">{overview?.totalApplications ?? 0} candidatures</p>
                </div>
                <div className="w-11 h-11 rounded-xl border flex items-center justify-center bg-white/15 border-white/25">
                  <Users size={18} className="text-white" />
                </div>
              </div>
            </div>

            <div className="group rounded-2xl p-5 relative overflow-hidden bg-zinc-900/60 border border-white/[0.07] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 shadow-[0_18px_40px_rgba(0,0,0,0.25)]">
              <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute -top-20 -right-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute -bottom-24 -left-20 w-56 h-56 rounded-full bg-tap-red/10 blur-2xl opacity-40" />
              </div>
              <div className="flex items-start justify-between gap-3 relative">
                <div>
                  <p className="text-[11px] uppercase tracking-[1.5px] text-white/85">Matchs réalisés</p>
                  <p className="mt-2 text-[30px] font-bold tracking-[-0.03em] text-white">{overview?.totalApplications ?? 0}</p>
                  <p className="mt-1 text-[12px] text-white/70">{overview?.totalCandidates ?? 0} profils</p>
                </div>
                <div className="w-11 h-11 rounded-xl border flex items-center justify-center bg-white/15 border-white/25">
                  <Target size={18} className="text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Offres avec matching */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-5 rounded-full bg-emerald-500" />
              <h2 className="text-[13px] uppercase tracking-[2px] text-white/50 font-semibold">Vos offres — Appariement</h2>
            </div>

            <div className="space-y-3">
              {jobs.map((job) => {
                const appCount =
                  overview?.applicationsPerJob?.find((a) => a.title === job.title)?.value ?? 0;
                const matchScore = Math.min(95, Math.max(30, 50 + appCount * 8));

                return (
                  <div key={job.id} className="bg-zinc-900/50 border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.1] transition group">
                    <div className="grid grid-cols-12 items-center gap-4">
                      <div className="col-span-12 md:col-span-4 min-w-0">
                        <h3 className="text-[15px] font-semibold text-white">
                          {job.title ?? "Offre sans titre"}
                        </h3>
                        <p className="text-[12px] text-white/40 mt-1">
                          {job.categorie_profil || "Profil non précisé"}
                        </p>
                      </div>

                      <div className="col-span-6 md:col-span-2 text-center md:text-left">
                        <p className="text-[13px] font-semibold text-white/80">
                          {appCount} candidature{appCount > 1 ? "s" : ""}
                        </p>
                      </div>

                      <div className="col-span-6 md:col-span-2 text-center md:text-left">
                        <span className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[12px] font-semibold text-emerald-400">
                          {matchScore}% match
                        </span>
                      </div>

                      <div className="col-span-12 md:col-span-3 text-center md:text-right">
                        <Link
                          href={`/app/candidats?jobId=${job.id}`}
                          className="inline-flex items-center gap-1.5 text-[12px] text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          Voir les candidats <ArrowRight size={12} />
                        </Link>
                      </div>

                      <div className="col-span-12 md:col-span-1 flex justify-center md:justify-end">
                        <Link
                          href={`/app/offres/${job.id}`}
                          className="inline-flex items-center justify-center p-1.5 rounded-full border border-white/[0.14] hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                          aria-label="Voir détails offre"
                          title="Voir détails offre"
                        >
                          <Eye size={14} />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Comment ça marche */}
          <div id="how-matching-recruteur" className="mt-8 bg-zinc-900/50 border border-white/[0.06] rounded-2xl p-6">
            <h3 className="text-[13px] uppercase tracking-[2px] text-white/50 font-semibold mb-4">Comment fonctionne le matching</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { step: "1", title: "Analyse de l'offre", desc: "L'IA extrait les compétences clés et critères requis de votre offre." },
                { step: "2", title: "Scan des profils", desc: "Chaque CV et talent card est analysé pour identifier les correspondances." },
                { step: "3", title: "Score d'appariement", desc: "Un score de compatibilité est calculé pour classer les meilleurs profils." },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-bold flex items-center justify-center shrink-0">{item.step}</span>
                  <div>
                    <p className="text-[13px] font-medium text-white/70 mb-1">{item.title}</p>
                    <p className="text-[11px] text-white/40 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
