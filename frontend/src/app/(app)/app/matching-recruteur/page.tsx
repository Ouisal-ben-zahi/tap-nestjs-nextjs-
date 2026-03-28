"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRecruteurOverview, useRecruteurJobs } from "@/hooks/use-recruteur";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  UserCheck,
  Briefcase,
  Users,
  Target,
  ArrowRight,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

const RECRUTEUR_DASHBOARD_CARD_BASE =
  "group card-animated-border relative rounded-2xl border border-white/[0.08] bg-[#020001] shadow-[0_10px_28px_rgba(0,0,0,0.45)] hover:bg-[linear-gradient(180deg,rgba(202,27,40,0.08)_0%,rgba(10,10,10,0.96)_30%,rgba(10,10,10,0.96)_100%)] hover:border-tap-red/15 transition-all duration-500 overflow-visible hover:-translate-y-0.5";

const OFFRES_MATCHING_PAR_PAGE = 8;

export default function MatchingRecruteurPage() {
  const { user } = useAuth();
  const isRecruteur = user?.role === "recruteur";
  const overviewQuery = useRecruteurOverview();
  const jobsQuery = useRecruteurJobs();
  const theme = useDashboardTheme();
  const isLight = theme === "light";
  const [jobsPage, setJobsPage] = useState(1);

  const overview = overviewQuery.data;
  const jobs = jobsQuery.data?.jobs || [];
  const jobsTotalPages = Math.max(1, Math.ceil(jobs.length / OFFRES_MATCHING_PAR_PAGE));
  const paginatedJobs = useMemo(() => {
    const start = (jobsPage - 1) * OFFRES_MATCHING_PAR_PAGE;
    return jobs.slice(start, start + OFFRES_MATCHING_PAR_PAGE);
  }, [jobs, jobsPage]);

  useEffect(() => {
    setJobsPage((p) => {
      const max = Math.max(1, Math.ceil(jobs.length / OFFRES_MATCHING_PAR_PAGE));
      return p > max ? max : p < 1 ? 1 : p;
    });
  }, [jobs.length]);

  if (!isRecruteur) {
    return (
      <EmptyState
        icon={<UserCheck className="w-12 h-12" />}
        title="Espace recruteur uniquement"
        description="Cette section est réservée aux recruteurs."
      />
    );
  }

  const isLoading = overviewQuery.isLoading || jobsQuery.isLoading;
  const isError = overviewQuery.isError || jobsQuery.isError;

  return (
    <div className="max-w-[min(100%,1200px)] mx-auto px-1 sm:px-0">
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-2xl" />
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
          {/* Stats rapides — même base que les KPI dashboard recruteur */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            {(
              [
                {
                  label: "Offres actives",
                  value: overview?.totalJobs ?? 0,
                  meta: `${overview?.urgentJobs ?? 0} postes urgents`,
                  Icon: Briefcase,
                  iconClass: "text-red-500",
                  badgeClass: "bg-red-500/10 border-red-500/20",
                },
                {
                  label: "Candidats disponibles",
                  value: overview?.totalCandidates ?? 0,
                  meta: `${overview?.totalApplications ?? 0} candidatures`,
                  Icon: Users,
                  iconClass: "text-blue-500",
                  badgeClass: "bg-blue-500/10 border-blue-500/20",
                },
                {
                  label: "Matchs réalisés",
                  value: overview?.totalApplications ?? 0,
                  meta: `${overview?.totalCandidates ?? 0} profils`,
                  Icon: Target,
                  iconClass: "text-green-500",
                  badgeClass: "bg-green-500/10 border-green-500/20",
                },
              ] as const
            ).map((card) => {
              const Icon = card.Icon;
              return (
                <div
                  key={card.label}
                  className={`${RECRUTEUR_DASHBOARD_CARD_BASE} p-5 ${
                    isLight
                      ? "card-luxury-light hover:shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
                      : "hover:brightness-105 shadow-[0_18px_40px_rgba(0,0,0,0.25)]"
                  }`}
                >
                  <div className="pointer-events-none absolute inset-0 opacity-100 group-hover:opacity-0 transition-opacity duration-500 rounded-2xl overflow-hidden">
                    <div className="absolute -top-20 -right-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
                    <div className="absolute -bottom-24 -left-20 w-56 h-56 rounded-full bg-tap-red/10 blur-2xl opacity-40" />
                  </div>
                  {isLight ? (
                    <>
                      <div className="pointer-events-none absolute top-[-45px] right-[-45px] h-28 w-28 rounded-full bg-white/5 blur-2xl" />
                      <div className="pointer-events-none absolute bottom-[-40px] left-[-50px] h-28 w-28 rounded-full bg-tap-red/10 blur-2xl" />
                    </>
                  ) : null}

                  <div className="relative z-[1] flex items-start justify-between gap-3">
                    <div className="min-w-0">
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
                      <p className={`mt-1 text-[12px] ${isLight ? "text-black/60" : "text-white/60"}`}>
                        {card.meta}
                      </p>
                    </div>
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                        isLight ? card.badgeClass : "border-tap-red/20 bg-tap-red/[0.08]"
                      }`}
                    >
                      <Icon size={18} className={isLight ? card.iconClass : "text-tap-red"} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Offres avec matching */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-5 rounded-full bg-emerald-500" />
              <h2 className="text-[13px] uppercase tracking-[2px] text-white/50 font-semibold">Vos offres — Appariement</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paginatedJobs.map((job) => {
                const appCount =
                  overview?.applicationsPerJob?.find((a) => a.jobId === job.id)?.value ?? 0;

                const iconBtnLight =
                  "border-black/10 bg-black/[0.03] text-black/70 hover:bg-black/[0.08]";
                const iconBtnDark =
                  "border-white/[0.14] bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08]";

                return (
                  <div
                    key={job.id}
                    className={`${RECRUTEUR_DASHBOARD_CARD_BASE} p-5 sm:p-6 ${
                      isLight
                        ? "card-luxury-light hover:shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
                        : "hover:brightness-105 shadow-[0_18px_40px_rgba(0,0,0,0.25)]"
                    }`}
                  >
                    <div className="pointer-events-none absolute inset-0 opacity-100 group-hover:opacity-0 transition-opacity duration-500 rounded-2xl overflow-hidden">
                      <div className="absolute -top-20 -right-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
                      <div className="absolute -bottom-24 -left-20 w-56 h-56 rounded-full bg-tap-red/10 blur-2xl opacity-40" />
                    </div>

                    <div className="relative z-[1] flex flex-col gap-4 min-w-0">
                      <div className="flex items-start justify-between gap-3 min-w-0">
                        <h3
                          className={`min-w-0 flex-1 text-[16px] sm:text-[17px] font-semibold leading-snug line-clamp-2 pr-1 ${
                            isLight ? "text-black" : "text-white"
                          }`}
                        >
                          {job.title ?? "Offre sans titre"}
                        </h3>
                        <div className="flex shrink-0 items-center gap-2 self-start pt-0.5">
                          <Link
                            href={`/app/offres/${job.id}`}
                            className={`inline-flex size-10 items-center justify-center rounded-full border transition ${
                              isLight ? iconBtnLight : iconBtnDark
                            }`}
                            aria-label="Voir l'offre"
                            title="Voir l'offre"
                          >
                            <Eye size={16} strokeWidth={1.75} />
                          </Link>
                          <Link
                            href={`/app/candidats?jobId=${job.id}`}
                            className={`inline-flex size-10 items-center justify-center rounded-full border transition ${
                              isLight ? iconBtnLight : iconBtnDark
                            }`}
                            aria-label="Voir les candidats matchés pour cette offre"
                            title="Candidats matchés (IA)"
                          >
                            <UserCheck size={16} strokeWidth={1.75} />
                          </Link>
                        </div>
                      </div>
                      <p
                        className={`text-[12px] sm:text-[13px] leading-snug line-clamp-2 ${
                          isLight ? "text-black/55" : "text-white/45"
                        }`}
                      >
                        {job.categorie_profil || "Catégorie non précisée"}
                      </p>

                      <div
                        className={`flex flex-wrap items-center justify-between gap-2 pt-3 border-t ${
                          isLight ? "border-black/10" : "border-white/[0.08]"
                        }`}
                      >
                        <p
                          className={`text-[13px] font-medium ${isLight ? "text-black/75" : "text-white/80"}`}
                        >
                          {appCount} candidature{appCount > 1 ? "s" : ""}
                        </p>
                        <Link
                          href={`/app/candidats?jobId=${job.id}`}
                          className={`inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors shrink-0 ${
                            isLight
                              ? "text-emerald-700 hover:text-emerald-600"
                              : "text-emerald-400 hover:text-emerald-300"
                          }`}
                        >
                          Voir les candidatures
                          <ArrowRight size={14} strokeWidth={2} />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {jobsTotalPages > 1 ? (
              <div
                className={`mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 ${
                  isLight ? "border-t border-black/10" : "border-t border-white/[0.06]"
                }`}
              >
                <p className={`text-[12px] ${isLight ? "text-black/50" : "text-white/45"}`}>
                  Affichage de{" "}
                  {(jobsPage - 1) * OFFRES_MATCHING_PAR_PAGE + 1}
                  {" — "}
                  {Math.min(jobsPage * OFFRES_MATCHING_PAR_PAGE, jobs.length)} sur {jobs.length}
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
                  <button
                    type="button"
                    disabled={jobsPage <= 1}
                    onClick={() => setJobsPage((p) => Math.max(1, p - 1))}
                    className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border text-[12px] font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${
                      isLight
                        ? "border-black/15 text-black/80 hover:bg-black/[0.04]"
                        : "border-white/[0.14] text-white/80 hover:bg-white/[0.06]"
                    }`}
                  >
                    <ChevronLeft size={16} strokeWidth={2} />
                    Précédent
                  </button>
                  <span className={`text-[12px] tabular-nums px-2 ${isLight ? "text-black/55" : "text-white/50"}`}>
                    Page {jobsPage} / {jobsTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={jobsPage >= jobsTotalPages}
                    onClick={() => setJobsPage((p) => Math.min(jobsTotalPages, p + 1))}
                    className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border text-[12px] font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${
                      isLight
                        ? "border-black/15 text-black/80 hover:bg-black/[0.04]"
                        : "border-white/[0.14] text-white/80 hover:bg-white/[0.06]"
                    }`}
                  >
                    Suivant
                    <ChevronRight size={16} strokeWidth={2} />
                  </button>
                </div>
              </div>
            ) : null}
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
