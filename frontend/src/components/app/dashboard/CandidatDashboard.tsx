"use client";

import { useCandidatStats, useCandidatApplications } from "@/hooks/use-candidat";
import StatCard from "@/components/ui/StatCard";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { StatCardSkeleton } from "@/components/ui/Skeleton";
import { Skeleton } from "@/components/ui/Skeleton";
import { FileText, Calendar, Clock, CheckCircle } from "lucide-react";
import { formatRelative } from "@/lib/utils";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";

export default function CandidatDashboard() {
  const statsQuery = useCandidatStats();
  const appsQuery = useCandidatApplications();

  const stats = statsQuery.data;
  const apps = appsQuery.data?.applications?.slice(0, 5) || [];
  const theme = useDashboardTheme();
  const isLight = theme === "light";

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div>
        <h2 className={`text-[13px] uppercase tracking-[2px] font-semibold ${isLight ? "text-black/60" : "text-white/60"}`}>Vue d&apos;ensemble</h2>
        <div className="mt-4">
          {statsQuery.isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
            </div>
          ) : statsQuery.isError ? (
            <ErrorState onRetry={() => statsQuery.refetch()} />
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Candidatures" value={stats?.applications ?? 0} icon={FileText} color="text-red-500" />
              <StatCard label="Entretiens" value={stats?.interviews ?? 0} icon={Calendar} color="text-blue-500" />
              <StatCard label="En attente" value={stats?.statusPending ?? 0} icon={Clock} color="text-yellow-500" />
              <StatCard label="Acceptées" value={stats?.statusAccepted ?? 0} icon={CheckCircle} color="text-green-500" />
            </div>
          )}
        </div>
      </div>

      {/* Candidatures récentes */}
      <div>
        <h2 className={`text-[13px] uppercase tracking-[2px] font-semibold ${isLight ? "text-black/60" : "text-white/60"}`}>Candidatures récentes</h2>
        <div className="mt-4">
          {appsQuery.isLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : appsQuery.isError ? (
            <ErrorState onRetry={() => appsQuery.refetch()} />
          ) : apps.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-10 h-10" />}
              title="Aucune candidature"
              description="Vos candidatures apparaîtront ici une fois que vous aurez postulé."
            />
          ) : (
            <div className="space-y-2">
              {apps.map((app) => (
                <div
                  key={app.id}
                  className={`flex items-center justify-between gap-4 rounded-xl px-5 py-4 transition ${
                    isLight
                      ? "bg-white border border-tap-red/40 hover:border-tap-red/70"
                      : "bg-zinc-900/50 border border-white/[0.06] hover:border-white/[0.1]"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-[14px] font-medium truncate ${isLight ? "text-black" : "text-white"}`}>
                      {app.jobTitle ?? "Offre sans titre"}
                    </p>
                    <p className={`text-[12px] ${isLight ? "text-black/70" : "text-white/40"}`}>{app.company}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={app.status ?? "Inconnu"} />
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
    </div>
  );
}
