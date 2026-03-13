"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRecruteurOverview } from "@/hooks/use-recruteur";
import StatCard from "@/components/ui/StatCard";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { StatCardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import {
  LayoutList, Briefcase, Users, FileText, AlertTriangle,
  TrendingUp, BarChart3, PieChart, Activity
} from "lucide-react";

export default function StatistiquesPage() {
  const { user } = useAuth();
  const isRecruteur = user?.role === "recruteur";
  const overviewQuery = useRecruteurOverview();

  if (!isRecruteur) {
    return (
      <EmptyState
        icon={<LayoutList className="w-12 h-12" />}
        title="Espace recruteur uniquement"
        description="Cette section est réservée aux recruteurs."
      />
    );
  }

  const overview = overviewQuery.data;
  const maxAppCount = Math.max(...(overview?.applicationsByJob?.map((a) => a.count) || [1]), 1);
  const maxCatCount = Math.max(...(overview?.jobsByCategory?.map((c) => c.count) || [1]), 1);
  const totalApps = overview?.totalApplications ?? 0;
  const totalJobs = overview?.totalJobs ?? 0;
  const avgPerJob = totalJobs > 0 ? Math.round(totalApps / totalJobs) : 0;

  return (
    <div className="max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="relative mb-8 pb-8 border-b border-white/[0.04]">
        <div className="absolute top-[-80px] left-[-100px] w-[350px] h-[350px] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.08),transparent_60%)] blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 mb-4 rounded-full bg-amber-500/[0.08] border border-amber-500/15">
            <LayoutList size={13} className="text-amber-500" />
            <span className="text-[10px] uppercase tracking-[2.5px] text-amber-500/80 font-semibold">
              Statistiques
            </span>
          </div>
          <h1 className="text-[28px] sm:text-[36px] font-bold text-white tracking-[-0.04em] font-heading">
            Statistiques & KPIs
          </h1>
          <p className="text-white/45 text-[14px] mt-2 font-light">
            Vue complète des performances de vos recrutements.
          </p>
        </div>
      </div>

      {overviewQuery.isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      ) : overviewQuery.isError ? (
        <ErrorState onRetry={() => overviewQuery.refetch()} />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-5 rounded-full bg-amber-500" />
              <h2 className="text-[13px] uppercase tracking-[2px] text-white/50 font-semibold">Indicateurs clés</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Offres publiées" value={overview?.totalJobs ?? 0} icon={Briefcase} color="text-red-500" />
              <StatCard label="Candidats" value={overview?.totalCandidates ?? 0} icon={Users} color="text-blue-500" />
              <StatCard label="Candidatures" value={totalApps} icon={FileText} color="text-green-500" />
              <StatCard label="Postes urgents" value={overview?.urgentJobs ?? 0} icon={AlertTriangle} color="text-yellow-500" />
            </div>
          </div>

          {/* Metrics secondaires */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            <div className="bg-zinc-900/50 border border-white/[0.06] rounded-xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Activity size={18} className="text-amber-500" />
              </div>
              <div>
                <p className="text-[22px] font-bold text-white">{avgPerJob}</p>
                <p className="text-[11px] text-white/40">Moy. candidatures/offre</p>
              </div>
            </div>
            <div className="bg-zinc-900/50 border border-white/[0.06] rounded-xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <TrendingUp size={18} className="text-emerald-500" />
              </div>
              <div>
                <p className="text-[22px] font-bold text-white">{overview?.applicationsByJob?.length ?? 0}</p>
                <p className="text-[11px] text-white/40">Offres avec candidatures</p>
              </div>
            </div>
            <div className="bg-zinc-900/50 border border-white/[0.06] rounded-xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <PieChart size={18} className="text-purple-500" />
              </div>
              <div>
                <p className="text-[22px] font-bold text-white">{overview?.jobsByCategory?.length ?? 0}</p>
                <p className="text-[11px] text-white/40">Catégories actives</p>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Candidatures par offre */}
            <div className="bg-zinc-900/50 border border-white/[0.06] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 size={14} className="text-tap-red" />
                <h3 className="text-[13px] uppercase tracking-[2px] text-white/50 font-semibold">Candidatures par offre</h3>
              </div>
              {!overview?.applicationsByJob?.length ? (
                <p className="text-[13px] text-white/30 py-8 text-center">Aucune donnée disponible</p>
              ) : (
                <div className="space-y-3">
                  {overview.applicationsByJob.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[12px] text-white/50 w-[140px] truncate shrink-0">{item.jobTitle}</span>
                      <div className="flex-1 h-7 bg-zinc-800/60 rounded-md overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-tap-red/70 to-tap-red/40 rounded-md transition-all duration-700 flex items-center justify-end pr-2"
                          style={{ width: `${Math.max(15, (item.count / maxAppCount) * 100)}%` }}
                        >
                          <span className="text-[10px] text-white/80 font-medium">{item.count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Offres par catégorie */}
            <div className="bg-zinc-900/50 border border-white/[0.06] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <PieChart size={14} className="text-blue-500" />
                <h3 className="text-[13px] uppercase tracking-[2px] text-white/50 font-semibold">Offres par catégorie</h3>
              </div>
              {!overview?.jobsByCategory?.length ? (
                <p className="text-[13px] text-white/30 py-8 text-center">Aucune donnée disponible</p>
              ) : (
                <div className="space-y-3">
                  {overview.jobsByCategory.map((item, i) => {
                    const colors = ["bg-blue-500/60", "bg-emerald-500/60", "bg-purple-500/60", "bg-amber-500/60", "bg-cyan-500/60", "bg-rose-500/60"];
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-[12px] text-white/50 w-[140px] truncate shrink-0">{item.category}</span>
                        <div className="flex-1 h-7 bg-zinc-800/60 rounded-md overflow-hidden">
                          <div
                            className={`h-full ${colors[i % colors.length]} rounded-md transition-all duration-700 flex items-center justify-end pr-2`}
                            style={{ width: `${Math.max(15, (item.count / maxCatCount) * 100)}%` }}
                          >
                            <span className="text-[10px] text-white/80 font-medium">{item.count}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Répartition des statuts */}
          <div className="bg-zinc-900/50 border border-white/[0.06] rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-2 mb-5">
              <Activity size={14} className="text-amber-500" />
              <h3 className="text-[13px] uppercase tracking-[2px] text-white/50 font-semibold">Répartition des candidatures</h3>
            </div>
            {!overview?.recentApplications?.length ? (
              <p className="text-[13px] text-white/30 py-4 text-center">Aucune candidature</p>
            ) : (() => {
              const statusCounts: Record<string, number> = {};
              overview.recentApplications.forEach((app) => {
                const s = app.status || "inconnu";
                statusCounts[s] = (statusCounts[s] || 0) + 1;
              });
              const total = overview.recentApplications.length;
              return (
                <div className="space-y-3">
                  {Object.entries(statusCounts).map(([status, count]) => (
                    <div key={status} className="flex items-center gap-3">
                      <span className="text-[12px] text-white/50 w-[120px] capitalize shrink-0">{status}</span>
                      <div className="flex-1 h-7 bg-zinc-800/60 rounded-md overflow-hidden">
                        <div
                          className="h-full bg-amber-500/50 rounded-md transition-all duration-700 flex items-center justify-end pr-2"
                          style={{ width: `${Math.max(15, (count / total) * 100)}%` }}
                        >
                          <span className="text-[10px] text-white/80 font-medium">{count}</span>
                        </div>
                      </div>
                      <span className="text-[11px] text-white/40 w-10 text-right">{Math.round((count / total) * 100)}%</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Alertes */}
          {overview?.alerts && overview.alerts.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-1 h-5 rounded-full bg-yellow-500" />
                <h2 className="text-[13px] uppercase tracking-[2px] text-white/50 font-semibold">Alertes actives</h2>
              </div>
              <div className="space-y-2">
                {overview.alerts.map((alert, i) => (
                  <div key={i} className="flex items-start gap-3 bg-yellow-500/[0.05] border border-yellow-500/15 rounded-xl px-5 py-4">
                    <AlertTriangle size={14} className="text-yellow-500 mt-0.5 shrink-0" />
                    <p className="text-[13px] text-white/60">{alert.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
