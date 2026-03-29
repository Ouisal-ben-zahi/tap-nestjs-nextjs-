"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { useCandidatStats, useCandidatApplications } from "@/hooks/use-candidat";
import ErrorState from "@/components/ui/ErrorState";
import { StatCardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { formatRelative, statusBg } from "@/lib/utils";
import {
  FileText,
  Calendar,
  Clock,
  CheckCircle,
  Bell,
  Bookmark,
  XCircle,
  TrendingUp,
  ChevronDown,
  Briefcase,
} from "lucide-react";

function buildSmoothLinePath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const dx = (p1.x - p0.x) * 0.35;
    d += ` C ${p0.x + dx} ${p0.y}, ${p1.x - dx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

function buildAreaPath(pts: { x: number; y: number }[], baseY: number): string {
  if (!pts.length) return "";
  const line = buildSmoothLinePath(pts);
  const last = pts[pts.length - 1];
  const first = pts[0];
  return `${line} L ${last.x} ${baseY} L ${first.x} ${baseY} Z`;
}

function buildYTicks5(maxY: number): number[] {
  if (maxY <= 0) return [0];
  const raw = Array.from({ length: 5 }, (_, i) => Math.round((maxY * i) / 4));
  return [...new Set(raw)].sort((a, b) => a - b);
}

type DualAreaChartGeom = {
  vbW: number;
  vbH: number;
  pl: number;
  pr: number;
  pt: number;
  pb: number;
  iw: number;
  ih: number;
  baseY: number;
  maxY: number;
  ptsA: { x: number; y: number }[];
  ptsB: { x: number; y: number }[];
  pathA: string;
  pathB: string;
  areaA: string;
  areaB: string;
  yTicks: number[];
};

function computeDualAreaChartFromValues(aVals: number[], bVals: number[]): DualAreaChartGeom {
  const vbW = 640;
  const vbH = 268;
  const pl = 48;
  const pr = 20;
  const pt = 28;
  const pb = 52;
  const iw = vbW - pl - pr;
  const ih = vbH - pt - pb;
  const baseY = pt + ih;
  const n = aVals.length;
  const maxY = Math.max(...aVals, ...bVals, 1);
  const yAt = (v: number) => baseY - (v / maxY) * ih;
  const xAt = (i: number) => pl + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const ptsA = aVals.map((v, i) => ({ x: xAt(i), y: yAt(v) }));
  const ptsB = bVals.map((v, i) => ({ x: xAt(i), y: yAt(v) }));
  return {
    vbW,
    vbH,
    pl,
    pr,
    pt,
    pb,
    iw,
    ih,
    baseY,
    maxY,
    ptsA,
    ptsB,
    pathA: buildSmoothLinePath(ptsA),
    pathB: buildSmoothLinePath(ptsB),
    areaA: buildAreaPath(ptsA, baseY),
    areaB: buildAreaPath(ptsB, baseY),
    yTicks: buildYTicks5(maxY),
  };
}

export default function CandidatDashboard() {
  const statsQuery = useCandidatStats();
  const appsQuery = useCandidatApplications();
  const [isMounted, setIsMounted] = useState(false);
  const [hoveredActivityIndex, setHoveredActivityIndex] = useState<number | null>(null);
  const [hoveredChartIndex, setHoveredChartIndex] = useState<number | null>(null);
  const chartUid = useId().replace(/:/g, "");
  const [ageNowMs] = useState(() => Date.now());

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const stats = statsQuery.data;
  const allApps = appsQuery.data?.applications || [];
  const isLight = false;
  const totalStatuses = (stats?.statusPending ?? 0) + (stats?.statusAccepted ?? 0) + (stats?.statusRefused ?? 0);
  const acceptanceRate =
    totalStatuses > 0 ? Math.round(((stats?.statusAccepted ?? 0) / totalStatuses) * 100) : 0;
  const interviewRate =
    (stats?.applications ?? 0) > 0 ? Math.round(((stats?.interviews ?? 0) / (stats?.applications ?? 1)) * 100) : 0;

  const pendingRate =
    totalStatuses > 0 ? Math.round(((stats?.statusPending ?? 0) / totalStatuses) * 100) : 0;
  const refusedRate =
    totalStatuses > 0 ? Math.round(((stats?.statusRefused ?? 0) / totalStatuses) * 100) : 0;

  const profileAgeDays = (() => {
    const raw = stats?.firstProfileDate ?? null;
    if (!raw) return null;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    const diffMs = ageNowMs - d.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Number.isFinite(days) ? Math.max(0, days) : null;
  })();

  const profileAgeLabel = profileAgeDays === null ? "Profil récent" : `Profil: ${profileAgeDays}j`;

  const monthNames = ["Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const activitySeries = Array.from({ length: 6 }).map((_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { key, label: monthNames[d.getMonth()], value: 0, acceptedValue: 0, refusedValue: 0 };
  });
  allApps.forEach((app) => {
    if (!app.validatedAt) return;
    const d = new Date(app.validatedAt);
    if (Number.isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = activitySeries.find((m) => m.key === key);
    if (!bucket) return;

    bucket.value += 1;

    const normalizedStatus = String(app.status ?? "").toLowerCase();
    if (normalizedStatus === "accepted" || normalizedStatus === "accepté" || normalizedStatus === "active") {
      bucket.acceptedValue += 1;
    } else if (
      normalizedStatus === "refused" ||
      normalizedStatus === "refusé" ||
      normalizedStatus === "rejected"
    ) {
      bucket.refusedValue += 1;
    }
  });
  const totalVolume6m = activitySeries.reduce((sum, m) => sum + m.value, 0);

  const acceptedTotal6m = activitySeries.reduce((sum, m) => sum + (m.acceptedValue ?? 0), 0);
  const refusedTotal6m = activitySeries.reduce((sum, m) => sum + (m.refusedValue ?? 0), 0);
  const acceptanceRate6m =
    acceptedTotal6m + refusedTotal6m > 0
      ? Math.round((acceptedTotal6m / (acceptedTotal6m + refusedTotal6m)) * 100)
      : 0;

  const activityChart = useMemo(
    () =>
      computeDualAreaChartFromValues(
        activitySeries.map((m) => m.value),
        activitySeries.map((m) => m.acceptedValue ?? 0),
      ),
    [activitySeries],
  );

  const statusChart = useMemo(
    () =>
      computeDualAreaChartFromValues(
        activitySeries.map((m) => m.acceptedValue ?? 0),
        activitySeries.map((m) => m.refusedValue ?? 0),
      ),
    [activitySeries],
  );

  const donutRadius = 54;
  const donutCirc = 2 * Math.PI * donutRadius;
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

  const recentApplications = useMemo(() => {
    return [...allApps]
      .filter((a) => a.validatedAt)
      .sort((a, b) => new Date(b.validatedAt!).getTime() - new Date(a.validatedAt!).getTime())
      .slice(0, 3);
  }, [allApps]);

  const last3MonthsSeries = useMemo(() => activitySeries.slice(-3), [activitySeries]);

  const engagementChart = useMemo(
    () =>
      computeDualAreaChartFromValues(
        last3MonthsSeries.map((m) => m.value),
        last3MonthsSeries.map((m) => m.refusedValue ?? 0),
      ),
    [last3MonthsSeries],
  );

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
  const themedCardClass =
    "group card-animated-border relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#020001] shadow-[0_10px_28px_rgba(0,0,0,0.45)] hover:bg-[linear-gradient(180deg,rgba(202,27,40,0.08)_0%,rgba(10,10,10,0.96)_30%,rgba(10,10,10,0.96)_100%)] hover:border-tap-red/15 transition-all duration-500";
  const themedParagraphClass = isLight ? "text-black/60" : "text-white/60";

  return (
    <div className="space-y-8">
      <div>
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
                    className={`${themedCardClass} p-5 ${
                      isLight
                        ? "card-luxury-light"
                        : ""
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
                        <div className="pointer-events-none absolute inset-0 opacity-100 group-hover:opacity-0 transition-opacity duration-500">
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
                        <p
                          className={`text-[11px] uppercase tracking-[1.5px] ${
                            isLight ? "text-black/55" : "text-white/85"
                          }`}
                        >
                          {card.label}
                        </p>
                        <p className={`mt-2 text-[30px] font-bold tracking-[-0.03em] ${isLight ? "text-black" : "text-white"}`}>
                          {card.value}
                        </p>
                        <p className={`mt-1 text-[12px] ${themedParagraphClass}`}>
                          {card.meta}
                        </p>
                      </div>
                      <div
                        className={`w-11 h-11 rounded-xl border flex items-center justify-center ${
                          isLight ? card.badgeClass : "bg-tap-red/[0.08] border-tap-red/20"
                        }`}
                      >
                        <Icon size={18} className={isLight ? card.iconClass : "text-tap-red"} />
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
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div
            className={`${themedCardClass} p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(0,0,0,0.35)] ${
              isLight ? "card-luxury-light" : ""
            }`}
          >
            <div className="pointer-events-none absolute inset-0 opacity-100 group-hover:opacity-0 transition-opacity duration-500">
              <div className="absolute -top-24 -right-28 w-72 h-72 rounded-full bg-white/5 blur-2xl" />
              <div className="absolute -bottom-28 -left-24 w-72 h-72 rounded-full bg-blue-500/10 blur-2xl opacity-60" />
            </div>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className={`text-[13px] uppercase tracking-[2px] font-semibold ${isLight ? "text-black" : "text-white/50"}`}>
                  Activité sur 6 mois
                </h3>
                <p className={`mt-1 text-[12px] ${isLight ? "text-black/55" : "text-white/40"}`}>
                  Volume de candidatures traitées et réponses positives
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#CA1B28]" />
                    <span className={isLight ? "text-black/70" : "text-white/60"}>Candidatures</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#F472B6]" />
                    <span className={isLight ? "text-black/70" : "text-white/60"}>Acceptées</span>
                  </span>
                </div>
              </div>
              <button
                type="button"
                className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] ${
                  isLight ? "border-black/15 text-black/70" : "border-white/12 text-white/55"
                }`}
              >
                6 derniers mois
                <ChevronDown size={12} className="opacity-70" aria-hidden />
              </button>
            </div>

            <div className="relative overflow-hidden rounded-xl bg-transparent">
              <svg
                viewBox={`0 0 ${activityChart.vbW} ${activityChart.vbH}`}
                className="block h-auto min-h-[220px] w-full"
                preserveAspectRatio="xMidYMid meet"
                role="img"
                aria-label="Volume de candidatures et acceptations sur six mois"
                onMouseLeave={() => setHoveredActivityIndex(null)}
              >
                <defs>
                  <linearGradient id={`${chartUid}-actFillA`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#CA1B28" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#CA1B28" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id={`${chartUid}-actFillB`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F472B6" stopOpacity="0.38" />
                    <stop offset="100%" stopColor="#F472B6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {activityChart.yTicks.map((tv) => {
                  const y = activityChart.baseY - (tv / activityChart.maxY) * activityChart.ih;
                  return (
                    <g key={`act-grid-${tv}`}>
                      <line
                        x1={activityChart.pl}
                        x2={activityChart.vbW - activityChart.pr}
                        y1={y}
                        y2={y}
                        stroke={isLight ? "rgb(0 0 0 / 0.08)" : "rgb(255 255 255 / 0.06)"}
                        strokeWidth="1"
                      />
                      <text
                        x={activityChart.pl - 8}
                        y={y + 4}
                        textAnchor="end"
                        fill={isLight ? "rgb(0 0 0 / 0.45)" : "rgb(255 255 255 / 0.38)"}
                        style={{ fontSize: 10 }}
                      >
                        {tv}
                      </text>
                    </g>
                  );
                })}
                <path d={activityChart.areaA} fill={`url(#${chartUid}-actFillA)`} />
                <path d={activityChart.areaB} fill={`url(#${chartUid}-actFillB)`} />
                <path
                  d={activityChart.pathB}
                  fill="none"
                  stroke="#F472B6"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={activityChart.pathA}
                  fill="none"
                  stroke="#CA1B28"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {activitySeries.map((m, i) => {
                  const xa = activityChart.ptsA[i];
                  if (!xa) return null;
                  return (
                    <text
                      key={`act-xlab-${m.key}`}
                      x={xa.x}
                      y={activityChart.vbH - 16}
                      textAnchor="middle"
                      fill={isLight ? "rgb(0 0 0 / 0.45)" : "rgb(255 255 255 / 0.38)"}
                      style={{ fontSize: 10 }}
                    >
                      {m.label}
                    </text>
                  );
                })}
                {activitySeries.map((m, i) => {
                  const xa = activityChart.ptsA[i];
                  const xb = activityChart.ptsB[i];
                  if (!xa || !xb) return null;
                  const active = hoveredActivityIndex === i;
                  return (
                    <g key={`act-hit-${m.key}`}>
                      <rect
                        x={xa.x - (activityChart.iw / Math.max(activitySeries.length - 1, 1)) * 0.45}
                        y={activityChart.pt}
                        width={(activityChart.iw / Math.max(activitySeries.length - 1, 1)) * 0.9}
                        height={activityChart.vbH - activityChart.pt - activityChart.pb + 8}
                        fill="transparent"
                        className="cursor-crosshair"
                        onMouseEnter={() => setHoveredActivityIndex(i)}
                      />
                      {active && (
                        <>
                          <line
                            x1={xa.x}
                            x2={xa.x}
                            y1={activityChart.pt}
                            y2={activityChart.baseY}
                            stroke={isLight ? "rgb(0 0 0 / 0.12)" : "rgb(255 255 255 / 0.12)"}
                            strokeDasharray="4 4"
                          />
                          <circle cx={xa.x} cy={xa.y} r="5" fill="#CA1B28" stroke="white" strokeWidth="1.5" />
                          <circle cx={xb.x} cy={xb.y} r="4" fill="#F472B6" stroke="white" strokeWidth="1.25" />
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>
              {hoveredActivityIndex !== null && activitySeries[hoveredActivityIndex] && (
                <div
                  className={`pointer-events-none absolute z-10 rounded-full px-3 py-1.5 text-[11px] shadow-lg ${
                    isLight ? "bg-black text-white" : "bg-[#CA1B28] text-white"
                  }`}
                  style={{
                    left: `calc(${(activityChart.ptsA[hoveredActivityIndex].x / activityChart.vbW) * 100}%)`,
                    top: 10,
                    transform: "translateX(-50%)",
                  }}
                >
                  <span className="font-semibold tabular-nums">
                    {activitySeries[hoveredActivityIndex].value} traitées · {activitySeries[hoveredActivityIndex].acceptedValue ?? 0}{" "}
                    acceptées
                  </span>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px]">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 border ${
                  isLight ? "bg-black/[0.03] border-black/15 text-black/70" : "bg-white/[0.03] border-white/15 text-white/70"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-[#CA1B28]" />
                {totalVolume6m} candidatures (6 mois)
              </span>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 border ${
                  isLight ? "bg-black/[0.03] border-black/15 text-black/70" : "bg-white/[0.03] border-white/15 text-white/70"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-[#F472B6]" />
                {acceptedTotal6m} acceptées
              </span>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 border ${
                  isLight ? "bg-black/[0.03] border-black/15 text-black/70" : "bg-white/[0.03] border-white/15 text-white/70"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                {refusedTotal6m} refusées
              </span>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 border ${
                  isLight ? "bg-black/[0.03] border-black/15 text-black/70" : "bg-white/[0.03] border-white/15 text-white/70"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-tap-red" />
                {acceptanceRate6m}% taux acceptation (6 mois)
              </span>
            </div>
          </div>

          <div
            className={`${themedCardClass} p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(0,0,0,0.35)] ${
              isLight ? "card-luxury-light" : ""
            }`}
          >
            <div className="pointer-events-none absolute inset-0 opacity-100 group-hover:opacity-0 transition-opacity duration-500">
              <div className="absolute -top-24 -right-28 w-72 h-72 rounded-full bg-white/5 blur-2xl" />
              <div className="absolute -bottom-28 -left-24 w-72 h-72 rounded-full bg-fuchsia-500/10 blur-2xl opacity-50" />
            </div>
            <div className="relative mb-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className={`text-[13px] uppercase tracking-[2px] font-semibold ${isLight ? "text-black" : "text-white/50"}`}>
                  Repartition des statuts
                </h3>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#CA1B28]" />
                    <span className={isLight ? "text-black/70" : "text-white/60"}>Acceptées</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#F472B6]" />
                    <span className={isLight ? "text-black/70" : "text-white/60"}>Refusées</span>
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <button
                  type="button"
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 ${
                    isLight ? "border-black/15 text-black/70" : "border-white/12 text-white/55"
                  }`}
                >
                  6 derniers mois
                  <ChevronDown size={12} className="opacity-70" aria-hidden />
                </button>
                <span className={`px-2 py-1 rounded-full border ${isLight ? "text-black/65 border-black/15" : "text-white/55 border-white/15"}`}>
                  <Bell size={11} className="inline mr-1" />
                  {stats?.notifications ?? 0} notifications
                </span>
                <span className={`px-2 py-1 rounded-full border ${isLight ? "text-black/65 border-black/15" : "text-white/55 border-white/15"}`}>
                  <Calendar size={11} className="inline mr-1" />
                  {profileAgeLabel}
                </span>
                <span className={`px-2 py-1 rounded-full border ${isLight ? "text-black/65 border-black/15" : "text-white/55 border-white/15"}`}>
                  <Clock size={11} className="inline mr-1" />
                  {pendingRate}% en attente
                </span>
                <span className={`px-2 py-1 rounded-full border ${isLight ? "text-black/65 border-black/15" : "text-white/55 border-white/15"}`}>
                  <XCircle size={11} className="inline mr-1" />
                  {refusedRate}% refus
                </span>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl bg-transparent">
              <svg
                viewBox={`0 0 ${statusChart.vbW} ${statusChart.vbH}`}
                className="block h-auto min-h-[220px] w-full"
                preserveAspectRatio="xMidYMid meet"
                role="img"
                aria-label="Évolution des candidatures acceptées et refusées sur six mois"
                onMouseLeave={() => setHoveredChartIndex(null)}
              >
                <defs>
                  <linearGradient id={`${chartUid}-statusFillA`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#CA1B28" stopOpacity="0.42" />
                    <stop offset="100%" stopColor="#CA1B28" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id={`${chartUid}-statusFillB`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F472B6" stopOpacity="0.38" />
                    <stop offset="100%" stopColor="#F472B6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {statusChart.yTicks.map((tv) => {
                  const y = statusChart.baseY - (tv / statusChart.maxY) * statusChart.ih;
                  return (
                    <g key={`grid-${tv}`}>
                      <line
                        x1={statusChart.pl}
                        x2={statusChart.vbW - statusChart.pr}
                        y1={y}
                        y2={y}
                        stroke={isLight ? "rgb(0 0 0 / 0.08)" : "rgb(255 255 255 / 0.06)"}
                        strokeWidth="1"
                      />
                      <text
                        x={statusChart.pl - 8}
                        y={y + 4}
                        textAnchor="end"
                        className={isLight ? "fill-black/45" : "fill-white/38"}
                        style={{ fontSize: 10 }}
                      >
                        {tv}
                      </text>
                    </g>
                  );
                })}
                <path d={statusChart.areaB} fill={`url(#${chartUid}-statusFillB)`} />
                <path d={statusChart.areaA} fill={`url(#${chartUid}-statusFillA)`} />
                <path
                  d={statusChart.pathB}
                  fill="none"
                  stroke="#F472B6"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={statusChart.pathA}
                  fill="none"
                  stroke="#CA1B28"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {activitySeries.map((m, i) => {
                  const xa = statusChart.ptsA[i];
                  if (!xa) return null;
                  return (
                    <text
                      key={`xlab-${m.key}`}
                      x={xa.x}
                      y={statusChart.vbH - 16}
                      textAnchor="middle"
                      fill={isLight ? "rgb(0 0 0 / 0.45)" : "rgb(255 255 255 / 0.38)"}
                      style={{ fontSize: 10 }}
                    >
                      {m.label}
                    </text>
                  );
                })}
                {activitySeries.map((m, i) => {
                  const xa = statusChart.ptsA[i];
                  const xr = statusChart.ptsB[i];
                  if (!xa || !xr) return null;
                  const active = hoveredChartIndex === i;
                  return (
                    <g key={m.key}>
                      <rect
                        x={xa.x - (statusChart.iw / Math.max(activitySeries.length - 1, 1)) * 0.45}
                        y={statusChart.pt}
                        width={(statusChart.iw / Math.max(activitySeries.length - 1, 1)) * 0.9}
                        height={statusChart.vbH - statusChart.pt - statusChart.pb + 8}
                        fill="transparent"
                        className="cursor-crosshair"
                        onMouseEnter={() => setHoveredChartIndex(i)}
                      />
                      {active && (
                        <>
                          <line
                            x1={xa.x}
                            x2={xa.x}
                            y1={statusChart.pt}
                            y2={statusChart.baseY}
                            stroke={isLight ? "rgb(0 0 0 / 0.12)" : "rgb(255 255 255 / 0.12)"}
                            strokeDasharray="4 4"
                          />
                          <circle cx={xa.x} cy={xa.y} r="5" fill="#CA1B28" stroke="white" strokeWidth="1.5" />
                          <circle cx={xr.x} cy={xr.y} r="4" fill="#F472B6" stroke="white" strokeWidth="1.25" />
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>
              {hoveredChartIndex !== null && activitySeries[hoveredChartIndex] && (
                <div
                  className={`pointer-events-none absolute z-10 rounded-lg px-3 py-2 text-[11px] shadow-lg ${
                    isLight ? "bg-black text-white" : "bg-[#CA1B28] text-white"
                  }`}
                  style={{
                    left: `calc(${(statusChart.ptsA[hoveredChartIndex].x / statusChart.vbW) * 100}% + 0px)`,
                    top: 12,
                    transform: "translateX(-50%)",
                  }}
                >
                  <div className="font-semibold">{activitySeries[hoveredChartIndex].label}</div>
                  <div className="opacity-90">
                    Acceptées : {activitySeries[hoveredChartIndex].acceptedValue ?? 0} · Refusées :{" "}
                    {activitySeries[hoveredChartIndex].refusedValue ?? 0}
                  </div>
                </div>
              )}
            </div>

            <div className="relative mt-4 grid grid-cols-1 gap-3 rounded-xl bg-transparent p-2 sm:grid-cols-3">
              <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-start sm:justify-start">
                <span className={`flex items-center text-[12px] ${isLight ? "text-black/65" : "text-white/45"}`}>
                  <CheckCircle size={12} className="mr-1 shrink-0 text-green-500" />
                  Acceptées (total)
                </span>
                <span className={`text-[15px] font-semibold tabular-nums ${isLight ? "text-black" : "text-white/85"}`}>
                  {stats?.statusAccepted ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-start sm:justify-start">
                <span className={`flex items-center text-[12px] ${isLight ? "text-black/65" : "text-white/45"}`}>
                  <XCircle size={12} className="mr-1 shrink-0 text-rose-500" />
                  Refusées (total)
                </span>
                <span className={`text-[15px] font-semibold tabular-nums ${isLight ? "text-black" : "text-white/85"}`}>
                  {stats?.statusRefused ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-start sm:justify-start">
                <span className={`flex items-center text-[12px] ${isLight ? "text-black/65" : "text-white/45"}`}>
                  <Bookmark size={12} className="mr-1 shrink-0 text-cyan-500" />
                  Offres sauvegardées
                </span>
                <span className={`text-[15px] font-semibold tabular-nums ${isLight ? "text-black" : "text-white/85"}`}>
                  {stats?.savedOffers ?? 0}
                </span>
              </div>
            </div>
          </div>

          <div
            className={`${themedCardClass} p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(0,0,0,0.35)] ${
              isLight ? "card-luxury-light" : ""
            }`}
          >
            <div className="pointer-events-none absolute inset-0 opacity-100 group-hover:opacity-0 transition-opacity duration-500">
              <div className="absolute -top-24 -right-28 w-72 h-72 rounded-full bg-white/5 blur-2xl" />
              <div className="absolute -bottom-28 -left-24 w-72 h-72 rounded-full bg-emerald-500/10 blur-2xl opacity-60" />
            </div>
            <div className="mb-5">
              <h3 className={`text-[13px] uppercase tracking-[2px] font-semibold ${isLight ? "text-black" : "text-white/50"}`}>
                Qualité candidature
              </h3>
            </div>
            <div className="flex items-center justify-center">
              <svg width="168" height="168" viewBox="0 0 160 160" className="max-w-full">
                <circle
                  cx="80"
                  cy="80"
                  r={donutRadius}
                  fill="none"
                  stroke={isLight ? "rgb(0 0 0 / 0.12)" : "rgb(255 255 255 / 0.12)"}
                  strokeWidth="14"
                />
                <circle
                  cx="80"
                  cy="80"
                  r={donutRadius}
                  fill="none"
                  stroke="#CA1B28"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={`${acceptedDash} ${donutCirc}`}
                  transform="rotate(-90 80 80)"
                />
              </svg>
            </div>
            <div className="text-center mt-2">
              <p className="text-[28px] font-bold text-[#CA1B28]">{acceptanceRate}%</p>
              <p className={`text-[12px] ${isLight ? "text-black/60" : "text-white/42"}`}>taux d&apos;acceptation global</p>
              <p className={`text-[11px] mt-1 ${isLight ? "text-black/45" : "text-white/32"}`}>{performanceTone}</p>
            </div>
          </div>
        </div>
      )}

      {!statsQuery.isLoading && !statsQuery.isError && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div
            className={`${themedCardClass} p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(0,0,0,0.35)] ${
              isLight ? "card-luxury-light" : ""
            }`}
          >
            <div className="pointer-events-none absolute inset-0 opacity-100 group-hover:opacity-0 transition-opacity duration-500">
              <div className="absolute -top-24 -right-28 w-72 h-72 rounded-full bg-white/5 blur-2xl" />
              <div className="absolute -bottom-28 -left-24 w-72 h-72 rounded-full bg-tap-red/10 blur-2xl opacity-40" />
            </div>
            <div className="relative mb-4 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className={`text-[13px] uppercase tracking-[2px] font-semibold ${isLight ? "text-black" : "text-white/50"}`}>
                  Dernières candidatures
                </h3>
                <p className={`mt-1 text-[12px] ${themedParagraphClass}`}>Les 3 dernières candidatures avec un mini graphique d&apos;intensité</p>
              </div>
            </div>

            <div className="relative mb-4 rounded-xl bg-transparent">
              <svg viewBox="0 0 280 88" className="h-[88px] w-full" role="img" aria-label="Intensité des statuts des 3 dernières candidatures">
                {recentApplications.length === 0 ? (
                  <text x="140" y="48" textAnchor="middle" fill="rgb(255 255 255 / 0.35)" style={{ fontSize: 11 }}>
                    Aucune candidature récente
                  </text>
                ) : (
                  recentApplications.map((app, i) => {
                    const s = String(app.status ?? "").toLowerCase();
                    const h =
                      s.includes("accept") || s === "active"
                        ? 100
                        : s.includes("refus") || s.includes("reject")
                          ? 28
                          : 58;
                    const barW = 28;
                    const gap = 12;
                    const totalW = recentApplications.length * barW + (recentApplications.length - 1) * gap;
                    const startX = (280 - totalW) / 2;
                    const x = startX + i * (barW + gap);
                    const barH = (h / 100) * 56;
                    const y = 16 + (56 - barH);
                    const fill =
                      s.includes("accept") || s === "active"
                        ? "#CA1B28"
                        : s.includes("refus") || s.includes("reject")
                          ? "#9ca3af"
                          : "#fbbf24";
                    return (
                      <g key={app.id}>
                        <rect x={x} y={y} width={barW} height={barH} rx="6" fill={fill} opacity="0.9" />
                        <text x={x + barW / 2} y="80" textAnchor="middle" fill="rgb(255 255 255 / 0.35)" style={{ fontSize: 9 }}>
                          {i + 1}
                        </text>
                      </g>
                    );
                  })
                )}
              </svg>
            </div>

            <div className="relative space-y-3">
              {recentApplications.length === 0 ? (
                <p className={`text-[12px] ${themedParagraphClass}`}>Les candidatures validées apparaîtront ici.</p>
              ) : (
                recentApplications.map((app) => {
                  const s = String(app.status ?? "").toLowerCase();
                  const label =
                    s.includes("accept") || s === "active"
                      ? "Acceptée"
                      : s.includes("refus") || s.includes("reject")
                        ? "Refusée"
                        : "En attente";
                  const badgeClass =
                    s.includes("accept") || s === "active"
                      ? "border-[#CA1B28]/40 bg-[#CA1B28]/15 text-[#CA1B28]"
                      : s.includes("refus") || s.includes("reject")
                        ? "border-white/15 bg-white/[0.06] text-white/55"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-200/90";
                  const dateStr = app.validatedAt
                    ? new Date(app.validatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
                    : "";
                  return (
                    <div
                      key={app.id}
                      className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                    >
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                        <Briefcase size={16} className="text-white/60" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-[13px] font-medium ${isLight ? "text-black" : "text-white/90"}`}>
                          {app.jobTitle ?? "Candidature"}
                        </p>
                        <p className={`truncate text-[11px] ${themedParagraphClass}`}>{app.company ?? "—"}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] ${badgeClass}`}>{label}</span>
                          {dateStr ? (
                            <span className={`text-[10px] ${isLight ? "text-black/45" : "text-white/35"}`}>{dateStr}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div
            className={`${themedCardClass} p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(0,0,0,0.35)] ${
              isLight ? "card-luxury-light" : ""
            }`}
          >
            <div className="pointer-events-none absolute inset-0 opacity-100 group-hover:opacity-0 transition-opacity duration-500">
              <div className="absolute -top-24 -right-28 w-72 h-72 rounded-full bg-white/5 blur-2xl" />
              <div className="absolute -bottom-28 -left-24 w-72 h-72 rounded-full bg-fuchsia-500/10 blur-2xl opacity-50" />
            </div>
            <div className="relative mb-3">
              <h3 className={`text-[13px] uppercase tracking-[2px] font-semibold ${isLight ? "text-black" : "text-white/50"}`}>
                Volume vs refus (3 mois)
              </h3>
              <p className={`mt-1 text-[12px] ${themedParagraphClass}`}>
                Autre vue : traitées sur 3 derniers mois (rouge) et refusées (rose), par rapport au graphique mensuel complet.
              </p>
              <div className="mt-2 flex flex-wrap gap-4 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[#CA1B28]" />
                  <span className={isLight ? "text-black/70" : "text-white/60"}>Traitées</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[#F472B6]" />
                  <span className={isLight ? "text-black/70" : "text-white/60"}>Refusées</span>
                </span>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl bg-transparent">
              <svg
                viewBox={`0 0 ${engagementChart.vbW} ${engagementChart.vbH}`}
                className="block h-auto min-h-[200px] w-full"
                preserveAspectRatio="xMidYMid meet"
                role="img"
                aria-label="Volume de candidatures traitées et refusées sur trois mois"
              >
                <defs>
                  <linearGradient id={`${chartUid}-engFillA`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#CA1B28" stopOpacity="0.42" />
                    <stop offset="100%" stopColor="#CA1B28" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id={`${chartUid}-engFillB`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F472B6" stopOpacity="0.38" />
                    <stop offset="100%" stopColor="#F472B6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {engagementChart.yTicks.map((tv) => {
                  const y = engagementChart.baseY - (tv / engagementChart.maxY) * engagementChart.ih;
                  return (
                    <g key={`eng-y-${tv}`}>
                      <line
                        x1={engagementChart.pl}
                        x2={engagementChart.vbW - engagementChart.pr}
                        y1={y}
                        y2={y}
                        stroke={isLight ? "rgb(0 0 0 / 0.08)" : "rgb(255 255 255 / 0.06)"}
                        strokeWidth="1"
                      />
                      <text
                        x={engagementChart.pl - 8}
                        y={y + 4}
                        textAnchor="end"
                        fill={isLight ? "rgb(0 0 0 / 0.45)" : "rgb(255 255 255 / 0.38)"}
                        style={{ fontSize: 10 }}
                      >
                        {tv}
                      </text>
                    </g>
                  );
                })}
                <path d={engagementChart.areaB} fill={`url(#${chartUid}-engFillB)`} />
                <path d={engagementChart.areaA} fill={`url(#${chartUid}-engFillA)`} />
                <path
                  d={engagementChart.pathB}
                  fill="none"
                  stroke="#F472B6"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={engagementChart.pathA}
                  fill="none"
                  stroke="#CA1B28"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {last3MonthsSeries.map((m, i) => {
                  const xa = engagementChart.ptsA[i];
                  if (!xa) return null;
                  return (
                    <text
                      key={`eng-xlab-${m.key}`}
                      x={xa.x}
                      y={engagementChart.vbH - 16}
                      textAnchor="middle"
                      fill={isLight ? "rgb(0 0 0 / 0.45)" : "rgb(255 255 255 / 0.38)"}
                      style={{ fontSize: 10 }}
                    >
                      {m.label}
                    </text>
                  );
                })}
              </svg>
            </div>

            <div className="relative mt-3 flex flex-wrap gap-2 text-[11px]">
              <span className={`rounded-full border px-2 py-1 ${isLight ? "border-black/10 text-black/65" : "border-white/12 text-white/50"}`}>
                Réponses recruteur : {responseRate}%
              </span>
              <span className={`rounded-full border px-2 py-1 ${isLight ? "border-black/10 text-black/65" : "border-white/12 text-white/50"}`}>
                Entretiens : {interviewStageRate}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Dernières candidatures + Volume vs refus (3 mois) : grille 2 colonnes */}

    </div>
  );
}
