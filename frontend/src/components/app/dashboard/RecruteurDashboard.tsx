 "use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
 import { useRecruteurOverview } from "@/hooks/use-recruteur";
 import EmptyState from "@/components/ui/EmptyState";
 import ErrorState from "@/components/ui/ErrorState";
 import { StatCardSkeleton, Skeleton } from "@/components/ui/Skeleton";
 import {
  Briefcase,
  Users,
  FileText,
  AlertTriangle,
  Bell,
  Activity,
 } from "lucide-react";
import { formatDateShort, formatRelative, statusBg } from "@/lib/utils";
 import { useDashboardTheme } from "@/hooks/use-dashboard-theme";

function getInitials(name: string | null | undefined) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return `${first}${second}`.toUpperCase() || "C";
}

export default function RecruteurDashboard() {
  const overviewQuery = useRecruteurOverview();
  const overview = overviewQuery.data;
  const theme = useDashboardTheme();
  const isLight = theme === "light";
  const router = useRouter();

  if (overviewQuery.isError) return <ErrorState onRetry={() => overviewQuery.refetch()} />;

  const maxAppCount = Math.max(...(overview?.applicationsPerJob?.map((a) => a.value) || [1]), 1);
  const maxCatCount = Math.max(...(overview?.jobsPerCategory?.map((c) => c.value) || [1]), 1);
  const hasAlerts = Boolean(overview?.alerts?.length);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const kpiCards = [
    {
      label: "Offres publiées",
      value: overview?.totalJobs ?? 0,
      meta: `${overview?.urgentJobs ?? 0} postes urgents`,
      icon: Briefcase,
      iconClass: "text-red-500",
      badgeClass: "bg-red-500/10 border-red-500/20",
      bgClassDark: "bg-[#CA1B28]/90",
    },
    {
      label: "Candidats",
      value: overview?.totalCandidates ?? 0,
      meta: `${overview?.totalApplications ?? 0} candidatures`,
      icon: Users,
      iconClass: "text-blue-500",
      badgeClass: "bg-blue-500/10 border-blue-500/20",
      bgClassDark: "bg-[#3b82f6]/85",
    },
    {
      label: "Candidatures",
      value: overview?.totalApplications ?? 0,
      meta: `${overview?.totalCandidates ?? 0} profils`,
      icon: FileText,
      iconClass: "text-green-500",
      badgeClass: "bg-green-500/10 border-green-500/20",
      bgClassDark: "bg-[#10b981]/85",
    },
    {
      label: "Postes urgents",
      value: overview?.urgentJobs ?? 0,
      meta: "priorité recrutement",
      icon: AlertTriangle,
      iconClass: "text-yellow-500",
      badgeClass: "bg-yellow-500/10 border-yellow-500/20",
      bgClassDark: "bg-[#f59e0b]/85",
    },
  ];

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div>
        <div className="mt-4">
          {overviewQuery.isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <StatCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {kpiCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className={`group rounded-2xl p-5 relative overflow-hidden ${
                      isLight ? "card-luxury-light" : `${card.bgClassDark} border border-white/10`
                    } transition-all duration-300 hover:-translate-y-0.5 ${
                      isLight
                        ? "hover:shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
                        : "hover:brightness-105 shadow-[0_18px_40px_rgba(0,0,0,0.25)]"
                    }`}
                    style={{
                      opacity: isMounted ? 1 : 0,
                      transform: isMounted ? "translateY(0px)" : "translateY(8px)",
                      transitionDelay: isMounted ? `${40 * kpiCards.indexOf(card)}ms` : "0ms",
                    }}
                  >
                    {/* Overlay glint premium */}
                    <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="absolute -top-20 -right-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
                      <div className="absolute -bottom-24 -left-20 w-56 h-56 rounded-full bg-tap-red/10 blur-2xl opacity-40" />
                    </div>

                    {isLight && (
                      <>
                        <div className="absolute top-[-45px] right-[-45px] w-28 h-28 rounded-full bg-white/5 blur-2xl pointer-events-none" />
                        <div className="absolute bottom-[-40px] left-[-50px] w-28 h-28 rounded-full bg-tap-red/10 blur-2xl pointer-events-none" />
                      </>
                    )}

                    <div className="flex items-start justify-between gap-3 relative">
                      <div>
                        <p className={`text-[11px] uppercase tracking-[1.5px] ${isLight ? "text-black/55" : "text-white/85"}`}>
                          {card.label}
                        </p>
                        <p className={`mt-2 text-[30px] font-bold tracking-[-0.03em] ${isLight ? "text-black" : "text-white"}`}>
                          {card.value}
                        </p>
                        <p className={`mt-1 text-[12px] ${isLight ? "text-black/55" : "text-white/70"}`}>
                          {card.meta}
                        </p>
                      </div>
                      <div
                        className={`w-11 h-11 rounded-xl border flex items-center justify-center ${
                          isLight ? card.badgeClass : "bg-white/15 border-white/25"
                        }`}
                      >
                        <Icon size={18} className={isLight ? card.iconClass : "text-white"} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      {!overviewQuery.isLoading && overview && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Candidatures par offre */}
          <div className={`rounded-2xl p-6 ${isLight ? "card-luxury-light" : "bg-zinc-900/50 border border-white/[0.06]"}`}>
            <h3 className={`text-[13px] uppercase tracking-[2px] font-semibold mb-5 ${isLight ? "text-black" : "text-white/50"}`}>Candidatures par offre</h3>
            {!overview.applicationsPerJob?.length ? (
              <p className={`text-[13px] ${isLight ? "text-black/70" : "text-white/30"}`}>Aucune donnée</p>
            ) : (
              (() => {
                const items = (overview.applicationsPerJob ?? []).slice(0, 6);
                const max = maxAppCount || 1;

                return (
                  <div className="space-y-4">
                    <div className={`flex items-end gap-3 h-32 ${isLight ? "bg-black/0" : "bg-black/0"}`}>
                      {items.map((item, i) => {
                        const heightPct = Math.max(6, (item.value / max) * 100);
                        return (
                          <div
                            key={`${item.title}-${i}`}
                            className="flex flex-col items-center justify-end gap-2 min-w-[78px]"
                            title={`${item.title}: ${item.value}`}
                          >
                            <div className="w-3 sm:w-4 rounded-md overflow-hidden">
                              <div
                                className={`w-full h-full rounded-md transition-all duration-700 ${
                                  isLight
                                    ? "bg-gradient-to-b from-tap-red/70 to-tap-red/35"
                                    : "bg-gradient-to-b from-tap-red/70 to-tap-red/30"
                                }`}
                                style={{ height: `${heightPct}%` }}
                              />
                            </div>
                            <div className={`text-[11px] text-center ${isLight ? "text-black/65" : "text-white/55"} truncate max-w-[84px]`}>
                              {item.title}
                            </div>
                            <div className={`text-[12px] font-semibold ${isLight ? "text-black/85" : "text-white/70"}`}>
                              {item.value}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className={`text-[11px] ${isLight ? "text-black/55" : "text-white/40"}`}>
                      Affichage des {items.length} meilleures offres (sur vos données).
                    </div>
                  </div>
                );
              })()
            )}
          </div>

          {/* Offres par catégorie */}
          <div className={`rounded-2xl p-6 ${isLight ? "card-luxury-light" : "bg-zinc-900/50 border border-white/[0.06]"}`}>
            <h3 className={`text-[13px] uppercase tracking-[2px] font-semibold mb-5 ${isLight ? "text-black" : "text-white/50"}`}>Offres par catégorie</h3>
            {!overview.jobsPerCategory?.length ? (
              <p className={`text-[13px] ${isLight ? "text-black/70" : "text-white/30"}`}>Aucune donnée</p>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const data = overview.jobsPerCategory ?? [];
                  const total = data.reduce((sum, d) => sum + (d.value ?? 0), 0) || 1;
                  const palette = [
                    { fillLight: "rgba(59,130,246,0.85)", fillDark: "rgba(59,130,246,0.55)" }, // blue
                    { fillLight: "rgba(16,185,129,0.85)", fillDark: "rgba(16,185,129,0.55)" }, // emerald
                    { fillLight: "rgba(168,85,247,0.85)", fillDark: "rgba(168,85,247,0.55)" }, // purple
                    { fillLight: "rgba(245,158,11,0.85)", fillDark: "rgba(245,158,11,0.55)" }, // amber
                    { fillLight: "rgba(6,182,212,0.85)", fillDark: "rgba(6,182,212,0.55)" }, // cyan
                    { fillLight: "rgba(244,63,94,0.85)", fillDark: "rgba(244,63,94,0.55)" }, // rose
                  ];

                  const cx = 90;
                  const cy = 65;
                  const r = 44;
                  const stroke = isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.12)";

                  const polarToCartesian = (angleDeg: number) => {
                    const angleRad = (angleDeg - 90) * (Math.PI / 180);
                    return {
                      x: cx + r * Math.cos(angleRad),
                      y: cy + r * Math.sin(angleRad),
                    };
                  };

                  let startAngle = 0;

                  const slices = data.map((d, i) => {
                    const fraction = (d.value ?? 0) / total;
                    const angle = fraction * 360;

                    const endAngle = startAngle + angle;
                    const p1 = polarToCartesian(startAngle);
                    const p2 = polarToCartesian(endAngle);
                    const largeArcFlag = angle > 180 ? 1 : 0;

                    const path = [
                      `M ${cx} ${cy}`,
                      `L ${p1.x} ${p1.y}`,
                      `A ${r} ${r} 0 ${largeArcFlag} 1 ${p2.x} ${p2.y}`,
                      "Z",
                    ].join(" ");

                    const color = palette[i % palette.length];

                    startAngle = endAngle;

                    return { label: d.label, value: d.value ?? 0, path, color };
                  });

                  return (
                    <>
                      <div className="flex items-center justify-center">
                        <svg viewBox="0 0 180 130" className="w-[170px] h-[120px]">
                          {slices.map((s, i) => (
                            <path
                              key={`${s.label}-${i}`}
                              d={s.path}
                              fill={isLight ? s.color.fillLight : s.color.fillDark}
                              stroke={stroke}
                              strokeWidth={1}
                            />
                          ))}
                        </svg>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        {slices.map((s, i) => (
                          <div key={`${s.label}-${i}`} className="flex items-center gap-2 text-[11px]">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{
                                background: isLight ? s.color.fillLight : s.color.fillDark,
                              }}
                            />
                            <span className={`${isLight ? "text-black/70" : "text-white/60"} truncate max-w-[110px]`}>
                              {s.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Répartition des candidatures */}
      {!overviewQuery.isLoading && overview && (
        <div className="rounded-2xl p-6">
          <div
            className={`${
              isLight ? "card-luxury-light" : "bg-zinc-900/50 border border-white/[0.06]"
            } rounded-2xl p-6`}
          >
            <div className="flex items-center gap-2 mb-5">
              <Activity size={14} className="text-amber-500" />
              <h3 className={`text-[13px] uppercase tracking-[2px] font-semibold ${isLight ? "text-black" : "text-white/50"}`}>
                Répartition des candidatures
              </h3>
            </div>

            {!overview?.recentApplications?.length ? (
              <p className={`text-[13px] py-4 text-center ${isLight ? "text-black/60" : "text-white/30"}`}>
                Aucune candidature
              </p>
            ) : (
              (() => {
                const statusCounts: Record<string, number> = {};
                overview.recentApplications.forEach((app) => {
                  const s = app.status || "inconnu";
                  statusCounts[s] = (statusCounts[s] || 0) + 1;
                });
                const total = overview.recentApplications.length;

                const toStatusKey = (status: string) => status?.toLowerCase?.() ?? "";
                const dotClass = (status: string) => {
                  const s = toStatusKey(status);
                  switch (s) {
                    case "accepted":
                    case "accepté":
                    case "active":
                      return isLight ? "bg-green-500" : "bg-green-400";
                    case "refused":
                    case "refusé":
                    case "rejected":
                      return isLight ? "bg-red-500" : "bg-red-400";
                    case "pending":
                    case "en attente":
                      return isLight ? "bg-yellow-500" : "bg-yellow-400";
                    default:
                      return isLight ? "bg-zinc-400" : "bg-zinc-500";
                  }
                };

                const entries = Object.entries(statusCounts)
                  .map(([status, count]) => ({ status, count }))
                  .sort((a, b) => {
                    const prio = (s: string) => {
                      const k = toStatusKey(s);
                      switch (k) {
                        case "accepted":
                        case "accepté":
                        case "active":
                          return 0;
                        case "pending":
                        case "en attente":
                          return 1;
                        case "refused":
                        case "refusé":
                        case "rejected":
                          return 2;
                        default:
                          return 3;
                      }
                    };
                    const pa = prio(a.status);
                    const pb = prio(b.status);
                    if (pa !== pb) return pa - pb;
                    return b.count - a.count;
                  });

                const statusColors = (status: string) => {
                  const k = toStatusKey(status);
                  switch (k) {
                    case "accepted":
                    case "accepté":
                    case "active":
                      return {
                        fill: isLight ? "#22c55e" : "#4ade80",
                        stroke: isLight ? "#16a34a" : "#22c55e",
                      };
                    case "refused":
                    case "refusé":
                    case "rejected":
                      return {
                        fill: isLight ? "#ef4444" : "#fb7185",
                        stroke: isLight ? "#dc2626" : "#f43f5e",
                      };
                    case "pending":
                    case "en attente":
                      return {
                        fill: isLight ? "#f59e0b" : "#fbbf24",
                        stroke: isLight ? "#d97706" : "#f59e0b",
                      };
                    default:
                      return {
                        fill: isLight ? "#a1a1aa" : "#71717a",
                        stroke: isLight ? "#737373" : "#525252",
                      };
                  }
                };

                return (
                  <div className="space-y-4">
                    {/* Legend */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      {entries.map(({ status }) => (
                        <div key={status} className="flex items-center gap-2 text-[11px]">
                          <span className={`w-2.5 h-2.5 rounded-full ${dotClass(status)}`} />
                          <span className={`${isLight ? "text-black/70" : "text-white/60"}`}>{status}</span>
                        </div>
                      ))}
                    </div>

                    {/* Line chart (points colorés par status) */}
                    <div className="w-full">
                      {entries.length <= 1 ? (
                        <div className={`text-[12px] ${isLight ? "text-black/60" : "text-white/40"} text-center py-6`}>
                          Pas assez de données pour tracer la courbe.
                        </div>
                      ) : (
                        (() => {
                          const W = 360;
                          const H = 120;
                          const padX = 18;
                          const padY = 16;
                          const n = entries.length;
                          const points = entries.map((e, i) => {
                            const frac = total > 0 ? e.count / total : 0;
                            const x = n === 1 ? W / 2 : padX + (i * (W - padX * 2)) / (n - 1);
                            const y = padY + (H - padY * 2) * (1 - frac);
                            return { x, y };
                          });

                          return (
                            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28">
                              {/* grid */}
                              <g opacity={isLight ? 0.35 : 0.35} stroke={isLight ? "#000000" : "#FFFFFF"}>
                                <line x1={padX} y1={padY} x2={W - padX} y2={padY} strokeWidth={1} />
                                <line
                                  x1={padX}
                                  y1={padY + (H - padY * 2) * 0.5}
                                  x2={W - padX}
                                  y2={padY + (H - padY * 2) * 0.5}
                                  strokeWidth={1}
                                />
                                <line x1={padX} y1={H - padY} x2={W - padX} y2={H - padY} strokeWidth={1} />
                              </g>

                              {/* colored segments */}
                              {entries.slice(0, -1).map((e, i) => {
                                const a = points[i]!;
                                const b = points[i + 1]!;
                                const c = statusColors(e.status);
                                return (
                                  <line
                                    key={`${e.status}-${i}`}
                                    x1={a.x}
                                    y1={a.y}
                                    x2={b.x}
                                    y2={b.y}
                                    stroke={c.stroke}
                                    strokeWidth={3}
                                    strokeLinecap="round"
                                  />
                                );
                              })}

                              {/* markers */}
                              {entries.map((e, i) => {
                                const p = points[i]!;
                                const c = statusColors(e.status);
                                return (
                                  <g key={e.status}>
                                    <circle cx={p.x} cy={p.y} r={5} fill={c.fill} stroke={c.stroke} strokeWidth={2} />
                                    <circle cx={p.x} cy={p.y} r={10} fill={c.fill} opacity={0.12} />
                                  </g>
                                );
                              })}
                            </svg>
                          );
                        })()
                      )}
                    </div>

                    {/* Breakdown */}
                    <div className="space-y-2">
                      {entries.map(({ status, count }) => (
                        <div key={status} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2 h-2 rounded-full ${dotClass(status)}`} />
                            <span className={`text-[12px] truncate ${isLight ? "text-black/70" : "text-white/55"}`}>
                              {status}
                            </span>
                          </div>
                          <span className={`text-[12px] font-medium ${isLight ? "text-black/80" : "text-white/70"}`}>
                            {count} ({total > 0 ? Math.round((count / total) * 100) : 0}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/* Candidatures récentes + Alertes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={hasAlerts ? "" : "lg:col-span-2"}>
          <div className={`rounded-2xl p-6 ${isLight ? "card-luxury-light" : "bg-zinc-900/50 border border-white/[0.06]"}`}>
            <h2 className={`text-[13px] uppercase tracking-[2px] font-semibold ${isLight ? "text-black/60" : "text-white/60"}`}>
              Candidatures récentes
            </h2>
            <div className="mt-4">
              {overviewQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
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
                      className={`flex items-center justify-between gap-4 rounded-xl px-5 py-4 transition cursor-pointer ${
                        isLight
                          ? "card-luxury-light hover:border-tap-red/70"
                          : "bg-zinc-900/50 border border-white/[0.06] hover:border-white/[0.1]"
                      }`}
                      role="button"
                      tabIndex={0}
                      onClick={() => router.push(`/app/offres/${app.jobId}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(`/app/offres/${app.jobId}`);
                        }
                      }}
                    >
                      <div className="grid grid-cols-12 items-center gap-4 w-full">
                        {/* Gauche : candidat + offre */}
                        <div className="col-span-12 sm:col-span-5 min-w-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full overflow-hidden border border-white/[0.10] bg-white/[0.04] flex items-center justify-center shrink-0">
                            {app.candidateAvatarUrl ? (
                              <img
                                src={app.candidateAvatarUrl}
                                alt={app.candidateName ?? "Avatar candidat"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[12px] font-semibold text-white/70">
                                {getInitials(app.candidateName)}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className={`text-[14px] font-medium truncate ${isLight ? "text-black" : "text-white"}`}>
                              {app.candidateName}
                            </p>

                            <div className="mt-1 flex items-center gap-2 flex-wrap">
                              <span className="text-[12px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/45 truncate inline-block">
                                {typeof app.candidateCategory === "string" && app.candidateCategory.trim()
                                  ? app.candidateCategory
                                  : "—"}
                              </span>
                              <span className={`text-[12px] ${isLight ? "text-black/70" : "text-white/40"} truncate`}>
                                {app.jobTitle}
                              </span>
                            </div>
                          </div>
                        </div>
                        </div>

                        {/* Centre : date + status (aligné au centre) */}
                        <div className="col-span-12 sm:col-span-4 text-center">
                          <div className={`text-[11px] ${isLight ? "text-black/55" : "text-white/40"} truncate`}>
                            {app.validatedAt ? formatDateShort(app.validatedAt) : "—"}
                          </div>
                          <div className="mt-2 inline-flex justify-center">
                            <span
                              className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${
                                statusBg(app.status ?? "Inconnu")
                              }`}
                            >
                              {app.status ?? "Inconnu"}
                            </span>
                          </div>
                        </div>

                        {/* Droite : CTA */}
                        <div className="col-span-12 sm:col-span-3 flex justify-end">
                          <span className={`text-[11px] ${isLight ? "text-black/55" : "text-white/40"}`}>Voir l'offre</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {hasAlerts && (
          <div>
            <div className={`rounded-2xl p-6 ${isLight ? "card-luxury-light" : "bg-zinc-900/50 border border-white/[0.06]"}`}>
              <h2 className={`text-[13px] uppercase tracking-[2px] font-semibold flex items-center gap-2 ${isLight ? "text-black" : "text-white/60"}`}>
                <Bell size={13} className="text-yellow-500" /> Alertes
              </h2>
              <div className="mt-4 space-y-2">
                {overview.alerts.map((alert, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 bg-yellow-500/[0.05] border border-yellow-500/15 rounded-xl px-5 py-4"
                  >
                    <AlertTriangle size={14} className="text-yellow-500 mt-0.5 shrink-0" />
                    <p className={`text-[13px] ${isLight ? "text-black" : "text-white/60"}`}>{alert.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
