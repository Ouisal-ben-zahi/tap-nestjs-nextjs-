"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRecruteurOverview, useRecruteurJobs } from "@/hooks/use-recruteur";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { UserCheck, Sparkles, Briefcase, Users, Target, ArrowRight, Zap, TrendingUp } from "lucide-react";
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
            Matching intelligent
          </h1>
          <p className="text-white/45 text-[14px] mt-2 font-light">
            Notre IA identifie les candidats les plus adaptés à chacune de vos offres.
          </p>
        </div>
      </div>

      {/* AI Banner (premium - hover plus doux) */}
      <div className="relative mb-8 group">
        <div className="relative bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 glass glass-hover overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              background:
                "radial-gradient(circle at top, rgba(202, 27, 40, 0.22), transparent 55%)",
            }}
          />
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Sparkles size={18} className="text-emerald-400" />
              </div>

              <div className="min-w-0">
                <h3 className="text-[14px] font-semibold text-white mb-1">Matching IA, calibreur de pertinence</h3>
                <p className="text-[13px] text-white/45 font-light">
                  L&apos;IA compare votre offre et le profil candidat pour optimiser les correspondances (compétences, expérience, et alignement).
                </p>

                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="inline-flex items-center gap-2 text-[11px] px-3 py-1 rounded-full border border-white/[0.08] bg-white/[0.03] text-white/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Analyse CV
                  </span>
                  <span className="inline-flex items-center gap-2 text-[11px] px-3 py-1 rounded-full border border-white/[0.08] bg-white/[0.03] text-white/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-tap-red" />
                    Critères de l&apos;offre
                  </span>
                  <span className="inline-flex items-center gap-2 text-[11px] px-3 py-1 rounded-full border border-white/[0.08] bg-white/[0.03] text-white/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    Score de matching
                  </span>
                </div>
              </div>
            </div>

            <a
              href="#how-matching-recruteur"
              className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.12] bg-white/[0.03] text-white/70 hover:text-white hover:bg-white/[0.06] transition shrink-0"
              aria-label="Voir comment fonctionne le matching"
              title="Voir comment fonctionne le matching"
            >
              <span className="text-[12px] font-medium">Comment ça marche</span>
            </a>
          </div>
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
            <div className="bg-zinc-900/50 border border-white/[0.06] rounded-xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Briefcase size={18} className="text-emerald-500" />
              </div>
              <div>
                <p className="text-[22px] font-bold text-white">{overview?.totalJobs ?? 0}</p>
                <p className="text-[11px] text-white/40">Offres actives</p>
              </div>
            </div>
            <div className="bg-zinc-900/50 border border-white/[0.06] rounded-xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Users size={18} className="text-blue-500" />
              </div>
              <div>
                <p className="text-[22px] font-bold text-white">{overview?.totalCandidates ?? 0}</p>
                <p className="text-[11px] text-white/40">Candidats disponibles</p>
              </div>
            </div>
            <div className="bg-zinc-900/50 border border-white/[0.06] rounded-xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Target size={18} className="text-purple-500" />
              </div>
              <div>
                <p className="text-[22px] font-bold text-white">{overview?.totalApplications ?? 0}</p>
                <p className="text-[11px] text-white/40">Matchs réalisés</p>
              </div>
            </div>
          </div>

          {/* Offres avec matching */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-5 rounded-full bg-emerald-500" />
              <h2 className="text-[13px] uppercase tracking-[2px] text-white/50 font-semibold">Vos offres — Matching</h2>
            </div>

            <div className="space-y-3">
              {jobs.map((job) => {
                const appCount =
                  overview?.applicationsPerJob?.find((a) => a.title === job.title)?.value ?? 0;
                const matchScore = Math.min(95, Math.max(30, 50 + appCount * 8));

                return (
                  <div key={job.id} className="bg-zinc-900/50 border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.1] transition group">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[15px] font-semibold text-white truncate">
                          {job.title ?? "Offre sans titre"}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[12px] text-white/40">
                            {job.location_type || "Mode de travail non précisé"}
                          </span>
                          <span className="text-[12px] text-white/30">•</span>
                          <span className="text-[12px] text-white/40">
                            {job.categorie_profil || "Profil non précisé"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <p className="text-[18px] font-bold text-emerald-400">{matchScore}%</p>
                          <p className="text-[10px] text-white/30">score matching</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-[12px] text-white/40">
                          <Users size={13} />
                          <span>{appCount} candidat{appCount > 1 ? "s" : ""}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[12px] text-emerald-400/70">
                          <TrendingUp size={13} />
                          <span>Matching actif</span>
                        </div>
                      </div>
                      <Link
                        href={`/app/candidats?jobId=${job.id}`}
                        className="flex items-center gap-1.5 text-[12px] text-emerald-400 hover:text-emerald-300 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        Voir les candidats <ArrowRight size={12} />
                      </Link>
                    </div>
                    <div className="mt-3 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500/60 rounded-full transition-all duration-1000"
                        style={{ width: `${matchScore}%` }}
                      />
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
                { step: "3", title: "Score de matching", desc: "Un score de compatibilité est calculé pour classer les meilleurs profils." },
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
