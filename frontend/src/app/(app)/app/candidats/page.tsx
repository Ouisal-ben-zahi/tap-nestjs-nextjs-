"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRecruteurOverview } from "@/hooks/use-recruteur";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Search, Users, Briefcase, FileText, Filter } from "lucide-react";
import { formatRelative, statusBg } from "@/lib/utils";

export default function CandidatsPage() {
  const { user } = useAuth();
  const isRecruteur = user?.role === "recruteur";
  const overviewQuery = useRecruteurOverview();

  if (!isRecruteur) {
    return (
      <EmptyState
        icon={<Search className="w-12 h-12" />}
        title="Espace recruteur uniquement"
        description="Cette section est réservée aux recruteurs."
      />
    );
  }

  const overview = overviewQuery.data;

  return (
    <div className="max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="relative mb-8 pb-8 border-b border-white/[0.04]">
        <div className="absolute top-[-80px] left-[-100px] w-[350px] h-[350px] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.08),transparent_60%)] blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 mb-4 rounded-full bg-blue-500/[0.08] border border-blue-500/15">
            <Search size={13} className="text-blue-500" />
            <span className="text-[10px] uppercase tracking-[2.5px] text-blue-500/80 font-semibold">
              Recherche candidats
            </span>
          </div>
          <h1 className="text-[28px] sm:text-[36px] font-bold text-white tracking-[-0.04em] font-heading">
            Candidats
          </h1>
          <p className="text-white/45 text-[14px] mt-2 font-light">
            Explorez les profils candidats et suivez vos processus de recrutement.
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      {overviewQuery.isLoading ? (
        <div className="grid grid-cols-3 gap-3 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : overviewQuery.isError ? (
        <ErrorState onRetry={() => overviewQuery.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            <div className="bg-zinc-900/50 border border-white/[0.06] rounded-xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Users size={18} className="text-blue-500" />
              </div>
              <div>
                <p className="text-[22px] font-bold text-white">{overview?.totalCandidates ?? 0}</p>
                <p className="text-[11px] text-white/40">Candidats totaux</p>
              </div>
            </div>
            <div className="bg-zinc-900/50 border border-white/[0.06] rounded-xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <FileText size={18} className="text-green-500" />
              </div>
              <div>
                <p className="text-[22px] font-bold text-white">{overview?.totalApplications ?? 0}</p>
                <p className="text-[11px] text-white/40">Candidatures reçues</p>
              </div>
            </div>
            <div className="bg-zinc-900/50 border border-white/[0.06] rounded-xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <Briefcase size={18} className="text-red-500" />
              </div>
              <div>
                <p className="text-[22px] font-bold text-white">{overview?.totalJobs ?? 0}</p>
                <p className="text-[11px] text-white/40">Postes ouverts</p>
              </div>
            </div>
          </div>

          {/* Search hint */}
          <div className="bg-blue-500/[0.06] border border-blue-500/15 rounded-2xl p-6 mb-8 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Filter size={18} className="text-blue-500" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-white mb-1">Recherche intelligente</h3>
              <p className="text-[13px] text-white/45 font-light">
                Les candidats ayant postulé à vos offres apparaissent ci-dessous. Utilisez le matching IA pour trouver les profils les plus adaptés.
              </p>
            </div>
          </div>

          {/* Candidatures par offre */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-5 rounded-full bg-blue-500" />
              <h2 className="text-[13px] uppercase tracking-[2px] text-white/50 font-semibold">Candidatures par offre</h2>
            </div>

            {!overview?.applicationsPerJob?.length ? (
              <EmptyState
                icon={<Users className="w-10 h-10" />}
                title="Aucun candidat"
                description="Les candidats apparaîtront ici lorsqu'ils postuleront à vos offres."
              />
            ) : (
              <div className="space-y-3">
                {overview.applicationsPerJob.map((item, i) => {
                  const maxCount = Math.max(...overview.applicationsPerJob.map((a) => a.value), 1);
                  return (
                    <div key={i} className="bg-zinc-900/50 border border-white/[0.06] rounded-xl px-5 py-4 hover:border-white/[0.1] transition">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[14px] font-medium text-white truncate">{item.title}</span>
                        <span className="text-[13px] text-blue-400 font-semibold shrink-0 ml-3">
                          {item.value} candidat{item.value > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500/60 rounded-full transition-all duration-700"
                          style={{ width: `${(item.value / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Candidatures récentes */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-5 rounded-full bg-blue-500" />
              <h2 className="text-[13px] uppercase tracking-[2px] text-white/50 font-semibold">Dernières candidatures</h2>
            </div>

            {!overview?.recentApplications?.length ? (
              <EmptyState
                icon={<FileText className="w-10 h-10" />}
                title="Aucune candidature récente"
                description="Les nouvelles candidatures seront listées ici."
              />
            ) : (
              <div className="space-y-2">
                {overview.recentApplications.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between gap-4 bg-zinc-900/50 border border-white/[0.06] rounded-xl px-5 py-4 hover:border-white/[0.1] transition"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-white truncate">{app.candidateName}</p>
                      <p className="text-[12px] text-white/40">{app.jobTitle}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${statusBg(
                          app.status ?? "Inconnu",
                        )}`}
                      >
                        {app.status ?? "Inconnu"}
                      </span>
                      {app.validatedAt && (
                        <span className="text-[11px] text-white/30">
                          {formatRelative(app.validatedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
