"use client";

import { useRecruteurOverview } from "@/hooks/use-recruteur";
import StatCard from "@/components/ui/StatCard";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { StatCardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { Briefcase, Users, FileText, AlertTriangle, Bell } from "lucide-react";
import { formatRelative, statusBg } from "@/lib/utils";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";

export default function RecruteurDashboard() {
  const overviewQuery = useRecruteurOverview();
  const overview = overviewQuery.data;
  const theme = useDashboardTheme();
  const isLight = theme === "light";

  if (overviewQuery.isError) return <ErrorState onRetry={() => overviewQuery.refetch()} />;

  const maxAppCount = Math.max(...(overview?.applicationsPerJob?.map((a) => a.value) || [1]), 1);
  const maxCatCount = Math.max(...(overview?.jobsPerCategory?.map((c) => c.value) || [1]), 1);

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div>
        <h2 className={`text-[13px] uppercase tracking-[2px] font-semibold ${isLight ? "text-black/60" : "text-white/60"}`}>Vue d&apos;ensemble</h2>
        <div className="mt-4">
          {overviewQuery.isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Offres publiées" value={overview?.totalJobs ?? 0} icon={Briefcase} color="text-red-500" />
              <StatCard label="Candidats" value={overview?.totalCandidates ?? 0} icon={Users} color="text-blue-500" />
              <StatCard label="Candidatures" value={overview?.totalApplications ?? 0} icon={FileText} color="text-green-500" />
              <StatCard label="Postes urgents" value={overview?.urgentJobs ?? 0} icon={AlertTriangle} color="text-yellow-500" />
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      {!overviewQuery.isLoading && overview && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Candidatures par offre */}
          <div className={`rounded-2xl p-6 ${isLight ? "bg-white border border-tap-red/40" : "bg-zinc-900/50 border border-white/[0.06]"}`}>
            <h3 className={`text-[13px] uppercase tracking-[2px] font-semibold mb-5 ${isLight ? "text-black" : "text-white/50"}`}>Candidatures par offre</h3>
            {!overview.applicationsPerJob?.length ? (
              <p className={`text-[13px] ${isLight ? "text-black/70" : "text-white/30"}`}>Aucune donnée</p>
            ) : (
              <div className="space-y-3">
                {overview.applicationsPerJob.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className={`text-[12px] w-[130px] truncate shrink-0 ${isLight ? "text-black" : "text-white/50"}`}>{item.title}</span>
                    <div className={`flex-1 h-6 rounded-md overflow-hidden ${isLight ? "bg-black/10" : "bg-zinc-800/60"}`}>
                      <div
                        className="h-full bg-tap-red/60 rounded-md transition-all duration-700"
                        style={{ width: `${(item.value / maxAppCount) * 100}%` }}
                      />
                    </div>
                    <span className={`text-[12px] w-8 text-right font-medium ${isLight ? "text-black" : "text-white/60"}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Offres par catégorie */}
          <div className={`rounded-2xl p-6 ${isLight ? "bg-white border border-tap-red/40" : "bg-zinc-900/50 border border-white/[0.06]"}`}>
            <h3 className={`text-[13px] uppercase tracking-[2px] font-semibold mb-5 ${isLight ? "text-black" : "text-white/50"}`}>Offres par catégorie</h3>
            {!overview.jobsPerCategory?.length ? (
              <p className={`text-[13px] ${isLight ? "text-black/70" : "text-white/30"}`}>Aucune donnée</p>
            ) : (
              <div className="space-y-3">
                {overview.jobsPerCategory.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className={`text-[12px] w-[130px] truncate shrink-0 ${isLight ? "text-black" : "text-white/50"}`}>{item.label}</span>
                    <div className={`flex-1 h-6 rounded-md overflow-hidden ${isLight ? "bg-black/10" : "bg-zinc-800/60"}`}>
                      <div
                        className="h-full bg-blue-500/60 rounded-md transition-all duration-700"
                        style={{ width: `${(item.value / maxCatCount) * 100}%` }}
                      />
                    </div>
                    <span className={`text-[12px] w-8 text-right font-medium ${isLight ? "text-black" : "text-white/60"}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Candidatures récentes */}
      <div>
        <h2 className={`text-[13px] uppercase tracking-[2px] font-semibold ${isLight ? "text-black/60" : "text-white/60"}`}>Candidatures récentes</h2>
        <div className="mt-4">

        {overviewQuery.isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : !overview?.recentApplications?.length ? (
          <EmptyState
            icon={<FileText className="w-10 h-10" />}
            title="Aucune candidature"
            description="Les candidatures pour vos offres apparaîtront ici."
          />
        ) : (
          <div className="space-y-2">
            {overview.recentApplications.slice(0, 5).map((app) => (
              <div
                key={app.id}
                className={`flex items-center justify-between gap-4 rounded-xl px-5 py-4 transition ${
                  isLight
                    ? "bg-white border border-tap-red/40 hover:border-tap-red/70"
                    : "bg-zinc-900/50 border border-white/[0.06] hover:border-white/[0.1]"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className={`text-[14px] font-medium truncate ${isLight ? "text-black" : "text-white"}`}>{app.candidateName}</p>
                  <p className={`text-[12px] ${isLight ? "text-black/70" : "text-white/40"}`}>{app.jobTitle}</p>
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
                    <span className={`text-[11px] ${isLight ? "text-black/70" : "text-white/30"}`}>
                      {formatRelative(app.validatedAt)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Alertes */}
      {overview?.alerts && overview.alerts.length > 0 && (
        <div>
          <h2 className={`text-[13px] uppercase tracking-[2px] font-semibold flex items-center gap-2 ${isLight ? "text-black" : "text-white/60"}`}>
            <Bell size={13} className="text-yellow-500" /> Alertes
          </h2>
          <div className="mt-4 space-y-2">
            {overview.alerts.map((alert, i) => (
              <div key={i} className="flex items-start gap-3 bg-yellow-500/[0.05] border border-yellow-500/15 rounded-xl px-5 py-4">
                <AlertTriangle size={14} className="text-yellow-500 mt-0.5 shrink-0" />
                <p className={`text-[13px] ${isLight ? "text-black" : "text-white/60"}`}>{alert.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
