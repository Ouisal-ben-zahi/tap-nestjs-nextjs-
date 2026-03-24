"use client";

import { useEffect, useState } from "react";
import { useCandidatStats, useCandidatApplications } from "@/hooks/use-candidat";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { StatCardSkeleton } from "@/components/ui/Skeleton";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  FileText,
  Calendar,
  Clock,
  CheckCircle,
  Bell,
  Bookmark,
  XCircle,
  Activity,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { formatRelative } from "@/lib/utils";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";

export default function CandidatDashboard() {
  const statsQuery = useCandidatStats();
  const appsQuery = useCandidatApplications();
  const [isMounted, setIsMounted] = useState(false);
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const stats = statsQuery.data;
  const allApps = appsQuery.data?.applications || [];
  const apps = [...allApps]
    .sort((a, b) => {
      const aTs = a.validatedAt ? new Date(a.validatedAt).getTime() : 0;
      const bTs = b.validatedAt ? new Date(b.validatedAt).getTime() : 0;
      if (bTs !== aTs) return bTs - aTs;
      return (b.id ?? 0) - (a.id ?? 0);
    })
    .slice(0, 5);
  const theme = useDashboardTheme();
  const isLight = theme === "light";
  const totalStatuses = (stats?.statusPending ?? 0) + (stats?.statusAccepted ?? 0) + (stats?.statusRefused ?? 0);
  const acceptanceRate =
    totalStatuses > 0 ? Math.round(((stats?.statusAccepted ?? 0) / totalStatuses) * 100) : 0;
  const interviewRate =
    (stats?.applications ?? 0) > 0 ? Math.round(((stats?.interviews ?? 0) / (stats?.applications ?? 1)) * 100) : 0;
  const statusBars = [
    { key: "pending", label: "En attente", value: stats?.statusPending ?? 0, color: "bg-yellow-500/60" },
    { key: "accepted", label: "Acceptées", value: stats?.statusAccepted ?? 0, color: "bg-green-500/60" },
    { key: "refused", label: "Refusées", value: stats?.statusRefused ?? 0, color: "bg-rose-500/60" },
  ];
  const maxStatusValue = Math.max(...statusBars.map((s) => s.value), 1);

  const monthNames = ["Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const activitySeries = Array.from({ length: 6 }).map((_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { key, label: monthNames[d.getMonth()], value: 0 };
  });
  allApps.forEach((app) => {
    if (!app.validatedAt) return;
    const d = new Date(app.validatedAt);
    if (Number.isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = activitySeries.find((m) => m.key === key);
    if (bucket) bucket.value += 1;
  });
  const maxActivityValue = Math.max(...activitySeries.map((m) => m.value), 1);
  const sparklinePoints = activitySeries
    .map((m, i) => {
      const x = i * 52 + 8;
      const y = 110 - Math.round((m.value / maxActivityValue) * 96);
      return `${x},${y}`;
    })
    .join(" ");
  const hoveredPoint = hoveredMonth
    ? activitySeries.find((m) => m.key === hoveredMonth) ?? null
    : null;

  const donutCirc = 2 * Math.PI * 44;
  const acceptedRatio = totalStatuses > 0 ? (stats?.statusAccepted ?? 0) / totalStatuses : 0;
  const acceptedDash = Math.round(donutCirc * acceptedRatio);
  const responseRate =
    (stats?.applications ?? 0) > 0
      ? Math.round(
          (((stats?.statusAccepted ?? 0) + (stats?.statusRefused ?? 0)) /
            (stats?.applications ?? 1)) *
            100,
        )
      : 0;
  const performanceTone =
    acceptanceRate >= 40 ? "Excellente dynamique" : acceptanceRate >= 20 ? "Bonne dynamique" : "Dynamique en construction";
  const interviewStageRate =
    (stats?.applications ?? 0) > 0
      ? Math.round(((stats?.interviews ?? 0) / (stats?.applications ?? 1)) * 100)
      : 0;
  const acceptedStageRate =
    (stats?.applications ?? 0) > 0
      ? Math.round(((stats?.statusAccepted ?? 0) / (stats?.applications ?? 1)) * 100)
      : 0;

  const kpiCards = [
    {
      label: "Candidatures",
      value: stats?.applications ?? 0,
      meta: `${stats?.statusPending ?? 0} en attente`,
      icon: FileText,
      iconClass: "text-red-500",
      badgeClass: "bg-red-500/10 border-red-500/20",
    },
    {
      label: "Entretiens",
      value: stats?.interviews ?? 0,
      meta: `${interviewRate}% de conversion`,
      icon: Calendar,
      iconClass: "text-blue-500",
      badgeClass: "bg-blue-500/10 border-blue-500/20",
    },
    {
      label: "Offres sauvegardees",
      value: stats?.savedOffers ?? 0,
      meta: `${stats?.notifications ?? 0} notifications`,
      icon: Bookmark,
      iconClass: "text-cyan-500",
      badgeClass: "bg-cyan-500/10 border-cyan-500/20",
    },
    {
      label: "Taux d'acceptation",
      value: `${acceptanceRate}%`,
      meta: `${stats?.statusAccepted ?? 0} acceptees`,
      icon: TrendingUp,
      iconClass: "text-emerald-500",
      badgeClass: "bg-emerald-500/10 border-emerald-500/20",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className={`text-[13px] uppercase tracking-[2px] font-semibold ${isLight ? "text-black/60" : "text-white/60"}`}>
          Vue d&apos;ensemble
        </h2>
        <div className="mt-4">
          {statsQuery.isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
            </div>
          ) : statsQuery.isError ? (
            <ErrorState onRetry={() => statsQuery.refetch()} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {kpiCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className={`rounded-2xl p-5 relative overflow-hidden ${
                      isLight
                        ? "bg-white border border-tap-red/40"
                        : "bg-zinc-900/60 border border-white/[0.07]"
                    } transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.18)]`}
                    style={{
                      opacity: isMounted ? 1 : 0,
                      transform: isMounted ? "translateY(0px)" : "translateY(8px)",
                      transitionDelay: isMounted ? `${40 * kpiCards.indexOf(card)}ms` : "0ms",
                    }}
                  >
                    <div className="absolute top-[-45px] right-[-45px] w-28 h-28 rounded-full bg-white/5 blur-2xl pointer-events-none" />
                    <div className="absolute bottom-[-40px] left-[-50px] w-28 h-28 rounded-full bg-tap-red/10 blur-2xl pointer-events-none" />
                    <div className="flex items-start justify-between gap-3 relative">
                      <div>
                        <p className={`text-[11px] uppercase tracking-[1.5px] ${isLight ? "text-black/55" : "text-white/45"}`}>
                          {card.label}
                        </p>
                        <p className={`mt-2 text-[30px] font-bold tracking-[-0.03em] ${isLight ? "text-black" : "text-white"}`}>
                          {card.value}
                        </p>
                        <p className={`mt-1 text-[12px] ${isLight ? "text-black/55" : "text-white/40"}`}>{card.meta}</p>
                      </div>
                      <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${card.badgeClass}`}>
                        <Icon size={18} className={card.iconClass} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {!statsQuery.isLoading && !statsQuery.isError && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div
            className={`xl:col-span-2 rounded-2xl p-6 ${
              isLight
                ? "bg-white border border-tap-red/40"
                : "bg-zinc-900/60 border border-white/[0.07]"
            }`}
          >
            <div className="flex items-center gap-2 mb-5">
              <Activity size={15} className="text-blue-500" />
              <h3 className={`text-[13px] uppercase tracking-[2px] font-semibold ${isLight ? "text-black" : "text-white/50"}`}>
                Activite sur 6 mois
              </h3>
            </div>
            <div className="w-full overflow-x-auto">
              <svg width="320" height="120" viewBox="0 0 320 120" className="w-full min-w-[320px]">
                <defs>
                  <linearGradient id="candLine" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(59 130 246 / 0.8)" />
                    <stop offset="100%" stopColor="rgb(59 130 246 / 0.08)" />
                  </linearGradient>
                </defs>
                <polyline fill="none" stroke="rgb(96 165 250)" strokeWidth="2.5" points={sparklinePoints} />
                {activitySeries.map((item, i) => {
                  const x = i * 52 + 8;
                  const y = 110 - Math.round((item.value / maxActivityValue) * 96);
                  const isHovered = hoveredMonth === item.key;
                  return (
                    <g
                      key={item.key}
                      onMouseEnter={() => setHoveredMonth(item.key)}
                      onMouseLeave={() => setHoveredMonth(null)}
                    >
                      <circle cx={x} cy={y} r={isHovered ? "5.5" : "3.4"} fill="rgb(147 197 253)" />
                      <circle cx={x} cy={y} r="12" fill="transparent" />
                    </g>
                  );
                })}
              </svg>
            </div>
            {hoveredPoint && (
              <div className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] border ${
                isLight ? "bg-black/[0.03] border-black/15 text-black/70" : "bg-white/[0.03] border-white/15 text-white/70"
              }`}>
                <span>{hoveredPoint.label}</span>
                <span className="font-semibold">{hoveredPoint.value} candidatures</span>
              </div>
            )}
            <div className="mt-3 grid grid-cols-6 gap-2">
              {activitySeries.map((m) => (
                <div key={m.key} className="text-center">
                  <p className={`text-[10px] ${isLight ? "text-black/55" : "text-white/38"}`}>{m.label}</p>
                  <p className={`text-[12px] font-semibold ${isLight ? "text-black/80" : "text-white/65"}`}>{m.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div
            className={`rounded-2xl p-6 ${
              isLight
                ? "bg-white border border-tap-red/40"
                : "bg-zinc-900/60 border border-white/[0.07]"
            }`}
          >
            <div className="flex items-center gap-2 mb-5">
              <Sparkles size={15} className="text-emerald-500" />
              <h3 className={`text-[13px] uppercase tracking-[2px] font-semibold ${isLight ? "text-black" : "text-white/50"}`}>
                Qualite candidature
              </h3>
            </div>
            <div className="flex items-center justify-center">
              <svg width="130" height="130" viewBox="0 0 130 130">
                <circle cx="65" cy="65" r="44" fill="none" stroke={isLight ? "rgb(0 0 0 / 0.12)" : "rgb(255 255 255 / 0.12)"} strokeWidth="12" />
                <circle
                  cx="65"
                  cy="65"
                  r="44"
                  fill="none"
                  stroke="rgb(34 197 94 / 0.85)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${acceptedDash} ${donutCirc}`}
                  transform="rotate(-90 65 65)"
                />
              </svg>
            </div>
            <div className="text-center mt-2">
              <p className={`text-[28px] font-bold ${isLight ? "text-black" : "text-white"}`}>{acceptanceRate}%</p>
              <p className={`text-[12px] ${isLight ? "text-black/60" : "text-white/42"}`}>taux d&apos;acceptation global</p>
              <p className={`text-[11px] mt-1 ${isLight ? "text-black/45" : "text-white/32"}`}>{performanceTone}</p>
            </div>
          </div>
        </div>
      )}

      {!statsQuery.isLoading && !statsQuery.isError && (
        <div className={`rounded-2xl p-6 ${isLight ? "bg-white border border-tap-red/40" : "bg-zinc-900/60 border border-white/[0.07]"}`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <h3 className={`text-[13px] uppercase tracking-[2px] font-semibold ${isLight ? "text-black" : "text-white/50"}`}>
              Repartition des statuts
            </h3>
            <div className="flex items-center gap-2 text-[11px]">
              <span className={`px-2 py-1 rounded-full border ${isLight ? "text-black/65 border-black/15" : "text-white/55 border-white/15"}`}>
                <Bell size={11} className="inline mr-1" />
                {stats?.notifications ?? 0} notifications
              </span>
              <span className={`px-2 py-1 rounded-full border ${isLight ? "text-black/65 border-black/15" : "text-white/55 border-white/15"}`}>
                <Clock size={11} className="inline mr-1" />
                {stats?.statusPending ?? 0} en attente
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              {statusBars.map((item) => {
                const width = item.value > 0 ? Math.max(12, (item.value / maxStatusValue) * 100) : 0;
                return (
                  <div key={item.key} className="flex items-center gap-3">
                    <span className={`text-[12px] w-[110px] shrink-0 ${isLight ? "text-black" : "text-white/50"}`}>{item.label}</span>
                    <div className={`flex-1 h-6 rounded-md overflow-hidden ${isLight ? "bg-black/10" : "bg-zinc-800/60"}`}>
                      <div
                        className={`h-full ${item.color} rounded-md transition-all duration-700`}
                        style={{ width: `${isMounted ? width : 0}%` }}
                      />
                    </div>
                    <span className={`text-[12px] w-8 text-right font-medium ${isLight ? "text-black" : "text-white/60"}`}>{item.value}</span>
                  </div>
                );
              })}
            </div>
            <div className={`rounded-xl p-4 ${isLight ? "bg-black/[0.02] border border-black/10" : "bg-white/[0.02] border border-white/[0.06]"}`}>
              <p className={`text-[12px] mb-3 ${isLight ? "text-black/65" : "text-white/45"}`}>Resume rapide</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[12px] ${isLight ? "text-black/65" : "text-white/45"}`}>
                    <CheckCircle size={12} className="inline mr-1 text-green-500" />
                    Acceptees
                  </span>
                  <span className={`text-[12px] font-semibold ${isLight ? "text-black" : "text-white/70"}`}>{stats?.statusAccepted ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-[12px] ${isLight ? "text-black/65" : "text-white/45"}`}>
                    <XCircle size={12} className="inline mr-1 text-rose-500" />
                    Refusees
                  </span>
                  <span className={`text-[12px] font-semibold ${isLight ? "text-black" : "text-white/70"}`}>{stats?.statusRefused ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-[12px] ${isLight ? "text-black/65" : "text-white/45"}`}>
                    <Bookmark size={12} className="inline mr-1 text-cyan-500" />
                    Offres sauvegardees
                  </span>
                  <span className={`text-[12px] font-semibold ${isLight ? "text-black" : "text-white/70"}`}>{stats?.savedOffers ?? 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!statsQuery.isLoading && !statsQuery.isError && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className={`xl:col-span-2 rounded-2xl p-6 ${isLight ? "bg-white border border-tap-red/40" : "bg-zinc-900/60 border border-white/[0.07]"}`}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className={`text-[13px] uppercase tracking-[2px] font-semibold ${isLight ? "text-black" : "text-white/50"}`}>
                Pipeline de conversion
              </h3>
              <span className={`text-[11px] px-2 py-1 rounded-full border ${isLight ? "text-black/65 border-black/15" : "text-white/55 border-white/15"}`}>
                {responseRate}% traitees
              </span>
            </div>
            <p className={`text-[13px] mb-4 ${isLight ? "text-black/65" : "text-white/42"}`}>
              Vue entonnoir de vos candidatures: deposees, traitees, converties en entretien puis en acceptation.
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className={`text-[11px] uppercase ${isLight ? "text-black/55" : "text-white/42"}`}>Reponse recruteur</p>
                  <p className={`text-[12px] font-semibold ${isLight ? "text-black" : "text-white/70"}`}>{responseRate}%</p>
                </div>
                <div className={`h-2.5 rounded-full overflow-hidden ${isLight ? "bg-black/10" : "bg-white/10"}`}>
                  <div className="h-full rounded-full bg-blue-500/70 transition-all duration-700" style={{ width: `${responseRate}%` }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className={`text-[11px] uppercase ${isLight ? "text-black/55" : "text-white/42"}`}>Passage entretien</p>
                  <p className={`text-[12px] font-semibold ${isLight ? "text-black" : "text-white/70"}`}>{interviewStageRate}%</p>
                </div>
                <div className={`h-2.5 rounded-full overflow-hidden ${isLight ? "bg-black/10" : "bg-white/10"}`}>
                  <div className="h-full rounded-full bg-amber-500/75 transition-all duration-700" style={{ width: `${interviewStageRate}%` }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className={`text-[11px] uppercase ${isLight ? "text-black/55" : "text-white/42"}`}>Conversion acceptee</p>
                  <p className={`text-[12px] font-semibold ${isLight ? "text-black" : "text-white/70"}`}>{acceptedStageRate}%</p>
                </div>
                <div className={`h-2.5 rounded-full overflow-hidden ${isLight ? "bg-black/10" : "bg-white/10"}`}>
                  <div className="h-full rounded-full bg-emerald-500/75 transition-all duration-700" style={{ width: `${acceptedStageRate}%` }} />
                </div>
              </div>
            </div>

          </div>

          <div className={`rounded-2xl p-6 ${isLight ? "bg-white border border-tap-red/40" : "bg-zinc-900/60 border border-white/[0.07]"}`}>
            <h3 className={`text-[13px] uppercase tracking-[2px] font-semibold mb-4 ${isLight ? "text-black" : "text-white/50"}`}>
              Insights IA
            </h3>
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <p className={`text-[12px] ${isLight ? "text-black/80" : "text-white/70"}`}>
                  Votre performance est <span className="font-semibold">{performanceTone.toLowerCase()}</span>.
                </p>
              </div>
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
                <p className={`text-[12px] ${isLight ? "text-black/80" : "text-white/70"}`}>
                  Priorite: augmenter les candidatures qualifiees pour faire monter le taux d&apos;entretien.
                </p>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <p className={`text-[12px] ${isLight ? "text-black/80" : "text-white/70"}`}>
                  Conseil: completez votre profil et votre CV pour booster le matching.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!statsQuery.isLoading && !statsQuery.isError && (
        <div className={`rounded-2xl p-6 ${isLight ? "bg-white border border-tap-red/40" : "bg-zinc-900/60 border border-white/[0.07]"}`}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <h4 className={`text-[12px] uppercase tracking-[1.8px] font-semibold ${isLight ? "text-black/70" : "text-white/55"}`}>
              Candidatures recentes
            </h4>
            <span className={`text-[11px] ${isLight ? "text-black/55" : "text-white/40"}`}>Top 5</span>
          </div>

          {appsQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : appsQuery.isError ? (
            <ErrorState onRetry={() => appsQuery.refetch()} />
          ) : apps.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-8 h-8" />}
              title="Aucune candidature"
              description="Vos candidatures apparaîtront ici une fois que vous aurez postulé."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {apps.map((app) => (
                <div
                  key={app.id}
                  className={`rounded-xl px-4 py-3 transition ${
                    isLight
                      ? "bg-black/[0.02] border border-black/10 hover:border-black/20"
                      : "bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.16]"
                  }`}
                >
                  <p className={`text-[13px] font-medium truncate ${isLight ? "text-black" : "text-white"}`}>
                    {app.jobTitle ?? "Offre sans titre"}
                  </p>
                  <p className={`text-[11px] mt-0.5 ${isLight ? "text-black/65" : "text-white/42"}`}>{app.company}</p>
                  <div className="flex items-center justify-between gap-2 mt-3">
                    <StatusBadge status={app.status ?? "Inconnu"} />
                    {app.validatedAt && (
                      <span className={`text-[11px] ${isLight ? "text-black/60" : "text-white/35"}`}>
                        {formatRelative(app.validatedAt)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
