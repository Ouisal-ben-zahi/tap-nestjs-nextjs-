"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRecruteurOverview, useRecruiterPlannedInterviews } from "@/hooks/use-recruteur";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { StatCardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { InterviewAgendaCalendarPanel } from "@/components/app/entretien/PlannedInterviewsAgendaSection";
import {
  Briefcase,
  Users,
  FileText,
  AlertTriangle,
  Bell,
  Activity,
  Calendar,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { formatRelative } from "@/lib/utils";

function getInitials(name: string | null | undefined) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return `${first}${second}`.toUpperCase() || "C";
}

function normalizeStatusBucket(status: string | null | undefined): "acceptee" | "attente" | "refusee" | "autre" {
  const s = String(status ?? "").toLowerCase();
  if (["accepted", "accepté", "acceptee", "active"].some((x) => s.includes(x))) return "acceptee";
  if (["refused", "refusé", "refusee", "rejected"].some((x) => s.includes(x))) return "refusee";
  if (["pending", "en cours", "en_attente"].some((x) => s.includes(x))) return "attente";
  return "autre";
}

/** Palette dégradée autour du rouge TAP (#CA1B28) + accents proches du thème. */
const APPLICATIONS_PIE_PALETTE = {
  light: [
    { face: "#CA1B28", depth: "#7a1018" },
    { face: "#E01F26", depth: "#90131c" },
    { face: "#ef4444", depth: "#991b1b" },
    { face: "#f87171", depth: "#b91c1c" },
    { face: "#9f1239", depth: "#4c0519" },
    { face: "#b45309", depth: "#713f12" },
  ],
  dark: [
    { face: "rgba(224,31,38,0.98)", depth: "rgba(90,14,22,0.98)" },
    { face: "rgba(248,113,113,0.95)", depth: "rgba(127,29,29,0.95)" },
    { face: "rgba(202,27,40,0.92)", depth: "rgba(60,10,16,0.95)" },
    { face: "rgba(252,165,165,0.88)", depth: "rgba(153,27,27,0.9)" },
    { face: "rgba(244,63,94,0.9)", depth: "rgba(88,28,46,0.95)" },
    { face: "rgba(251,191,36,0.85)", depth: "rgba(120,74,12,0.92)" },
  ],
} as const;

function pieSlicePath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const sweep = endDeg - startDeg;
  if (sweep >= 359.99) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`;
  }
  const s = ((startDeg - 90) * Math.PI) / 180;
  const e = ((endDeg - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(s);
  const y1 = cy + r * Math.sin(s);
  const x2 = cx + r * Math.cos(e);
  const y2 = cy + r * Math.sin(e);
  const large = sweep > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

/** Barre 3D isométrique (faces avant, droite, dessus). */
function isoBar3DPaths(x: number, yBottom: number, w: number, h: number, depth: number) {
  const yTop = yBottom - h;
  const skew = depth * 0.55;
  return {
    front: `M ${x} ${yTop} L ${x + w} ${yTop} L ${x + w} ${yBottom} L ${x} ${yBottom} Z`,
    right: `M ${x + w} ${yTop} L ${x + w + depth} ${yTop - skew} L ${x + w + depth} ${yBottom - skew} L ${x + w} ${yBottom} Z`,
    top: `M ${x} ${yTop} L ${x + w} ${yTop} L ${x + w + depth} ${yTop - skew} L ${x + depth} ${yTop - skew} Z`,
  };
}

const CATEGORY_CLUSTER_PALETTE = {
  light: {
    primary: [
      { front: "#CA1B28", right: "#7a1018", top: "#E01F26" },
      { front: "#4f46e5", right: "#312e81", top: "#6366f1" },
      { front: "#0d9488", right: "#115e59", top: "#14b8a6" },
      { front: "#c026d3", right: "#86198f", top: "#d946ef" },
      { front: "#d97706", right: "#92400e", top: "#f59e0b" },
      { front: "#0284c7", right: "#075985", top: "#0ea5e9" },
      { front: "#db2777", right: "#9d174d", top: "#ec4899" },
    ],
    secondary: [
      { front: "#fca5a5", right: "#b91c1c", top: "#fecaca" },
      { front: "#a5b4fc", right: "#4338ca", top: "#c7d2fe" },
      { front: "#5eead4", right: "#0f766e", top: "#99f6e4" },
      { front: "#f0abfc", right: "#a21caf", top: "#f5d0fe" },
      { front: "#fcd34d", right: "#b45309", top: "#fde68a" },
      { front: "#7dd3fc", right: "#0369a1", top: "#bae6fd" },
      { front: "#f9a8d4", right: "#be185d", top: "#fbcfe8" },
    ],
  },
  dark: {
    primary: [
      { front: "rgba(224,31,38,0.95)", right: "rgba(90,14,22,0.98)", top: "rgba(248,113,113,0.9)" },
      { front: "rgba(129,140,248,0.92)", right: "rgba(49,46,120,0.95)", top: "rgba(165,180,252,0.85)" },
      { front: "rgba(45,212,191,0.9)", right: "rgba(15,118,110,0.95)", top: "rgba(94,234,212,0.8)" },
      { front: "rgba(217,70,239,0.88)", right: "rgba(112,26,117,0.95)", top: "rgba(240,171,252,0.75)" },
      { front: "rgba(251,191,36,0.9)", right: "rgba(146,64,14,0.95)", top: "rgba(253,224,71,0.75)" },
      { front: "rgba(56,189,248,0.9)", right: "rgba(7,89,133,0.95)", top: "rgba(125,211,252,0.8)" },
      { front: "rgba(244,114,182,0.9)", right: "rgba(131,24,67,0.95)", top: "rgba(251,207,232,0.75)" },
    ],
    secondary: [
      { front: "rgba(248,113,113,0.75)", right: "rgba(127,29,29,0.9)", top: "rgba(254,202,202,0.55)" },
      { front: "rgba(165,180,252,0.7)", right: "rgba(55,48,163,0.9)", top: "rgba(199,210,254,0.5)" },
      { front: "rgba(94,234,212,0.7)", right: "rgba(17,94,89,0.9)", top: "rgba(153,246,228,0.5)" },
      { front: "rgba(240,171,252,0.68)", right: "rgba(134,25,143,0.9)", top: "rgba(245,208,254,0.48)" },
      { front: "rgba(253,224,71,0.72)", right: "rgba(161,98,7,0.9)", top: "rgba(254,240,138,0.5)" },
      { front: "rgba(125,211,252,0.72)", right: "rgba(3,105,161,0.9)", top: "rgba(186,230,253,0.5)" },
      { front: "rgba(251,207,232,0.7)", right: "rgba(157,23,77,0.9)", top: "rgba(252,231,243,0.5)" },
    ],
  },
} as const;

export default function RecruteurDashboard() {
  const overviewQuery = useRecruteurOverview();
  const plannedQuery = useRecruiterPlannedInterviews(!overviewQuery.isError);
  const overview = overviewQuery.data;
  const theme = useDashboardTheme();
  const isLight = theme === "light";
  const router = useRouter();

  const hasAlerts = Boolean(overview?.alerts?.length);

  const plannedCalendarItems = useMemo(
    () =>
      (plannedQuery.data?.plannedInterviews ?? []).map((it) => ({
        id: it.id,
        jobTitle: it.jobTitle,
        interviewType: it.interviewType,
        interviewDate: it.interviewDate,
        interviewTime: it.interviewTime,
        candidateName: it.candidateName,
        candidateAvatarUrl: it.candidateAvatarUrl,
        jobId: it.jobId,
        candidateId: it.candidateId,
      })),
    [plannedQuery.data?.plannedInterviews],
  );

  const upcomingInterviews = useMemo(() => {
    const copy = [...plannedCalendarItems];
    copy.sort((a, b) => {
      const da = a.interviewDate ? new Date(`${a.interviewDate}T12:00:00`).getTime() : Infinity;
      const db = b.interviewDate ? new Date(`${b.interviewDate}T12:00:00`).getTime() : Infinity;
      if (da !== db) return da - db;
      return String(a.interviewTime ?? "").localeCompare(String(b.interviewTime ?? ""));
    });
    return copy;
  }, [plannedCalendarItems]);

  const activityLast14Days = useMemo(() => {
    const apps = overview?.recentApplications ?? [];
    const days: { key: string; shortLabel: string; count: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      days.push({
        key,
        shortLabel: d.toLocaleDateString("fr-FR", { weekday: "narrow", day: "numeric" }),
        count: 0,
      });
    }
    for (const a of apps) {
      if (!a.validatedAt) continue;
      const t = new Date(a.validatedAt);
      if (Number.isNaN(t.getTime())) continue;
      const key = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
      const row = days.find((x) => x.key === key);
      if (row) row.count += 1;
    }
    return days;
  }, [overview?.recentApplications]);

  const pipelineBuckets = useMemo(() => {
    const apps = overview?.recentApplications ?? [];
    let acceptee = 0;
    let attente = 0;
    let refusee = 0;
    let autre = 0;
    for (const a of apps) {
      const b = normalizeStatusBucket(a.status);
      if (b === "acceptee") acceptee++;
      else if (b === "attente") attente++;
      else if (b === "refusee") refusee++;
      else autre++;
    }
    const total = apps.length || 1;
    return { acceptee, attente, refusee, autre, total };
  }, [overview?.recentApplications]);

  const activityChartGeometry = useMemo(() => {
    const n = activityLast14Days.length;
    if (n < 2) return null;
    const W = 400;
    const H = 128;
    const padL = 20;
    const padR = 16;
    const padT = 14;
    const padB = 26;
    const maxC = Math.max(1, ...activityLast14Days.map((d) => d.count));
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;
    const pts = activityLast14Days.map((d, i) => {
      const x = padL + (i / (n - 1)) * innerW;
      const y = padT + innerH * (1 - d.count / maxC);
      return { x, y, label: d.shortLabel, c: d.count };
    });
    const lineD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    const areaD = `M ${pts[0].x.toFixed(1)} ${(padT + innerH).toFixed(1)} ${pts
      .map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ")} L ${pts[pts.length - 1].x.toFixed(1)} ${(padT + innerH).toFixed(1)} Z`;
    return { W, H, pts, lineD, areaD, maxC, padT, innerH };
  }, [activityLast14Days]);

  /** Rose polaire (Nightingale) : même angle par statut, rayon ∝ volume — alternative au donut. */
  const pipelineRose = useMemo(() => {
    const { acceptee, attente, refusee, autre } = pipelineBuckets;
    const parts = [
      { key: "acceptee", label: "Acceptées", value: acceptee, fillL: "#16a34a", fillD: "#4ade80" },
      { key: "attente", label: "En cours", value: attente, fillL: "#d97706", fillD: "#fbbf24" },
      { key: "refusee", label: "Refusées", value: refusee, fillL: "#dc2626", fillD: "#fb7185" },
      { key: "autre", label: "Autre", value: autre, fillL: "#52525b", fillD: "#a1a1aa" },
    ].filter((p) => p.value > 0);
    const appsTotal = acceptee + attente + refusee + autre;
    if (parts.length === 0) return { petals: [] as { key: string; label: string; value: number; path: string; fill: string }[], appsTotal, cx: 100, cy: 100 };

    const maxV = Math.max(...parts.map((p) => p.value), 1);
    const cx = 100;
    const cy = 100;
    const rInner = 22;
    const rSpan = 68;
    const strokeOuter = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.1)";
    const n = parts.length;
    const gapRad = 0.08;
    const sweep = (2 * Math.PI - n * gapRad) / n;
    const start0 = -Math.PI / 2 + gapRad / 2;

    const petals = parts.map((p, i) => {
      const t = p.value / maxV;
      const rOut = rInner + t * rSpan;
      const a0 = start0 + i * (sweep + gapRad);
      const a1 = a0 + sweep;
      const xir = cx + rInner * Math.cos(a0);
      const yir = cy + rInner * Math.sin(a0);
      const xor = cx + rOut * Math.cos(a0);
      const yor = cy + rOut * Math.sin(a0);
      const xir1 = cx + rInner * Math.cos(a1);
      const yir1 = cy + rInner * Math.sin(a1);
      const xor1 = cx + rOut * Math.cos(a1);
      const yor1 = cy + rOut * Math.sin(a1);
      const large = sweep > Math.PI ? 1 : 0;
      const path = [
        `M ${xir.toFixed(2)} ${yir.toFixed(2)}`,
        `L ${xor.toFixed(2)} ${yor.toFixed(2)}`,
        `A ${rOut} ${rOut} 0 ${large} 1 ${xor1.toFixed(2)} ${yor1.toFixed(2)}`,
        `L ${xir1.toFixed(2)} ${yir1.toFixed(2)}`,
        `A ${rInner} ${rInner} 0 ${large} 0 ${xir.toFixed(2)} ${yir.toFixed(2)}`,
        "Z",
      ].join(" ");
      const fill = isLight ? p.fillL : p.fillD;
      return { key: p.key, label: p.label, value: p.value, path, fill };
    });

    return { petals, appsTotal, cx, cy, strokeOuter };
  }, [pipelineBuckets, isLight]);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (overviewQuery.isError) {
    return <ErrorState onRetry={() => overviewQuery.refetch()} />;
  }

  const kpiCards = [
    {
      label: "Offres publiées",
      value: overview?.totalJobs ?? 0,
      meta: `${overview?.urgentJobs ?? 0} postes urgents`,
      icon: Briefcase,
      iconClass: "text-red-500",
      badgeClass: "bg-red-500/10 border-red-500/20",
    },
    {
      label: "Candidats",
      value: overview?.totalCandidates ?? 0,
      meta: `${overview?.totalApplications ?? 0} candidatures`,
      icon: Users,
      iconClass: "text-blue-500",
      badgeClass: "bg-blue-500/10 border-blue-500/20",
    },
    {
      label: "Candidatures",
      value: overview?.totalApplications ?? 0,
      meta: `${overview?.totalCandidates ?? 0} profils`,
      icon: FileText,
      iconClass: "text-green-500",
      badgeClass: "bg-green-500/10 border-green-500/20",
    },
    {
      label: "Postes urgents",
      value: overview?.urgentJobs ?? 0,
      meta: "priorité recrutement",
      icon: AlertTriangle,
      iconClass: "text-yellow-500",
      badgeClass: "bg-yellow-500/10 border-yellow-500/20",
    },
  ];
  const themedCardClass =
    "group card-animated-border relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#020001] shadow-[0_10px_28px_rgba(0,0,0,0.45)] hover:bg-[linear-gradient(180deg,rgba(202,27,40,0.08)_0%,rgba(10,10,10,0.96)_30%,rgba(10,10,10,0.96)_100%)] hover:border-tap-red/15 transition-all duration-500";
  const themedParagraphClass = isLight ? "text-black/60" : "text-white/60";

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
                    className={`${themedCardClass} p-5 ${
                      isLight ? "card-luxury-light" : ""
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
                        <p className={`text-[11px] uppercase tracking-[1.5px] ${isLight ? "text-black/55" : "text-white/85"}`}>
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

      {/* Agenda entretiens (si planifiés) + synthèse analytique */}
      {!overviewQuery.isLoading && overview && (
        <>
          {plannedQuery.isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-3">
                <Skeleton className="h-5 w-56 rounded-lg" />
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-24 w-full rounded-2xl" />
              </div>
              <div className="lg:col-span-5">
                <Skeleton className="min-h-[280px] w-full rounded-2xl" />
              </div>
            </div>
          ) : plannedCalendarItems.length > 0 ? (
            <div
              className={`${themedCardClass} p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(0,0,0,0.35)] ${
                isLight ? "card-luxury-light" : ""
              }`}
            >
              {!isLight && (
                <div className="pointer-events-none absolute inset-0 opacity-100 group-hover:opacity-0 transition-opacity duration-500">
                  <div className="absolute -top-24 -right-28 w-72 h-72 rounded-full bg-white/5 blur-2xl" />
                  <div className="absolute -bottom-28 -left-24 w-72 h-72 rounded-full bg-emerald-500/10 blur-2xl opacity-45" />
                </div>
              )}
              <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 lg:items-start">
                <div className="lg:col-span-7 space-y-4 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 bg-tap-red/[0.08] border-tap-red/20">
                        <Calendar size={18} className="text-tap-red" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0">
                        <h3 className={`text-[13px] uppercase tracking-[2px] font-semibold ${isLight ? "text-black" : "text-white/50"}`}>
                          Agenda des entretiens
                        </h3>
                        <p className={`text-[12px] mt-0.5 ${themedParagraphClass}`}>
                          {plannedCalendarItems.length === 1
                            ? "1 créneau planifié"
                            : `${plannedCalendarItems.length} créneaux planifiés`}
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/app/entretiens-planifies"
                      className={`text-[12px] font-semibold shrink-0 ${isLight ? "text-tap-red hover:text-tap-red/80" : "text-tap-red hover:text-red-300"}`}
                    >
                      Gérer les entretiens
                    </Link>
                  </div>
                  <ul className="space-y-2">
                    {upcomingInterviews.slice(0, 5).map((it) => (
                      <li
                        key={it.id}
                        className={`rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${
                          isLight ? "border-black/[0.08] bg-black/[0.02]" : "border-white/[0.08] bg-white/[0.03]"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full overflow-hidden border border-white/[0.10] bg-white/[0.04] flex items-center justify-center shrink-0">
                            {it.candidateAvatarUrl ? (
                              <img
                                src={it.candidateAvatarUrl}
                                alt={it.candidateName ?? "Candidat"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className={`text-[11px] font-semibold ${isLight ? "text-black/60" : "text-white/70"}`}>
                                {getInitials(it.candidateName)}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-[13px] font-semibold truncate ${isLight ? "text-black" : "text-white"}`}>
                              {it.candidateName ?? "Candidat"}
                            </p>
                            <p className={`text-[11px] truncate ${themedParagraphClass}`}>{it.jobTitle ?? "—"}</p>
                          </div>
                        </div>
                        <p className={`text-[11px] tabular-nums sm:text-right shrink-0 ${isLight ? "text-black/65" : "text-white/55"}`}>
                          {it.interviewDate
                            ? new Date(it.interviewDate).toLocaleDateString("fr-FR", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                              })
                            : "—"}{" "}
                          <span className={isLight ? "text-black/35" : "text-white/30"}>·</span>{" "}
                          {it.interviewTime ? it.interviewTime.slice(0, 5) : "—"}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
                <InterviewAgendaCalendarPanel
                  items={plannedCalendarItems}
                  isLight={isLight}
                  variant="recruiter"
                  gridClassName="lg:col-span-5 lg:sticky lg:top-28 self-start w-full"
                />
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activité candidatures (14 jours) */}
            <div
              className={`${themedCardClass} p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(0,0,0,0.35)] ${
                isLight ? "card-luxury-light" : ""
              }`}
            >
              {!isLight && (
                <div className="pointer-events-none absolute inset-0 opacity-100 group-hover:opacity-0 transition-opacity duration-500">
                  <div className="absolute -top-24 -right-28 w-72 h-72 rounded-full bg-white/5 blur-2xl" />
                  <div className="absolute -bottom-28 -left-24 w-72 h-72 rounded-full bg-blue-500/10 blur-2xl opacity-55" />
                </div>
              )}
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={14} className="text-blue-400" />
                  <h3 className={`text-[13px] uppercase tracking-[2px] font-semibold ${isLight ? "text-black" : "text-white/50"}`}>
                    Activité (14 jours)
                  </h3>
                </div>
                <p className={`text-[12px] mb-4 ${themedParagraphClass}`}>
                  Candidatures validées par jour sur les deux dernières semaines.
                </p>
                {activityChartGeometry ? (
                  <svg
                    viewBox={`0 0 ${activityChartGeometry.W} ${activityChartGeometry.H}`}
                    className="w-full h-36"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="recDashActivityFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isLight ? "rgba(59,130,246,0.35)" : "rgba(59,130,246,0.45)"} />
                        <stop offset="100%" stopColor={isLight ? "rgba(59,130,246,0.02)" : "rgba(59,130,246,0.05)"} />
                      </linearGradient>
                    </defs>
                    <g opacity={isLight ? 0.2 : 0.22} stroke={isLight ? "#000" : "#fff"} strokeWidth={0.6}>
                      {[0, 0.5, 1].map((t) => (
                        <line
                          key={t}
                          x1={20}
                          y1={activityChartGeometry.padT + activityChartGeometry.innerH * t}
                          x2={activityChartGeometry.W - 16}
                          y2={activityChartGeometry.padT + activityChartGeometry.innerH * t}
                        />
                      ))}
                    </g>
                    <path d={activityChartGeometry.areaD} fill="url(#recDashActivityFill)" />
                    <path
                      d={activityChartGeometry.lineD}
                      fill="none"
                      stroke={isLight ? "rgba(37,99,235,0.95)" : "rgba(96,165,250,0.95)"}
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    {activityChartGeometry.pts.map((p, i) => (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r={3} fill={isLight ? "#2563eb" : "#60a5fa"} />
                      </g>
                    ))}
                  </svg>
                ) : (
                  <p className={`text-[13px] ${themedParagraphClass}`}>Pas assez de données.</p>
                )}
                <div className="flex flex-wrap gap-x-1 gap-y-1 mt-2 justify-between">
                  {activityLast14Days.map((d, i) => (
                    <span
                      key={d.key}
                      className={`text-[9px] sm:text-[10px] tabular-nums ${isLight ? "text-black/45" : "text-white/40"}`}
                      style={{ width: `${100 / Math.max(activityLast14Days.length, 1)}%`, textAlign: "center" }}
                    >
                      {d.shortLabel}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Pipeline candidatures (rose polaire) */}
            <div
              className={`${themedCardClass} p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(0,0,0,0.35)] ${
                isLight ? "card-luxury-light" : ""
              }`}
            >
              {!isLight && (
                <div className="pointer-events-none absolute inset-0 opacity-100 group-hover:opacity-0 transition-opacity duration-500">
                  <div className="absolute -top-24 -right-28 w-72 h-72 rounded-full bg-white/5 blur-2xl" />
                  <div className="absolute -bottom-28 -left-24 w-72 h-72 rounded-full bg-amber-500/10 blur-2xl opacity-45" />
                </div>
              )}
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 size={14} className="text-amber-400" />
                  <h3 className={`text-[13px] uppercase tracking-[2px] font-semibold ${isLight ? "text-black" : "text-white/50"}`}>
                    Pipeline des candidatures
                  </h3>
                </div>
                <p className={`text-[12px] mb-4 ${themedParagraphClass}`}>
                  Rose polaire : chaque statut occupe le même angle ; la longueur du pétale suit le volume (candidatures récentes).
                </p>
                {pipelineRose.petals.length === 0 ? (
                  <p className={`text-[13px] ${themedParagraphClass}`}>Aucune candidature récente.</p>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                    <div className="relative shrink-0 mx-auto sm:mx-0 w-full max-w-[220px] aspect-square">
                      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
                        <defs>
                          <radialGradient id="recPipelineRoseHub" cx="45%" cy="40%" r="55%">
                            <stop offset="0%" stopColor={isLight ? "rgba(255,255,255,0.95)" : "rgba(30,30,30,0.92)"} />
                            <stop offset="100%" stopColor={isLight ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.45)"} />
                          </radialGradient>
                        </defs>
                        {pipelineRose.petals.map((s) => (
                          <path
                            key={s.key}
                            d={s.path}
                            fill={s.fill}
                            stroke={pipelineRose.strokeOuter}
                            strokeWidth={0.85}
                            opacity={0.96}
                          />
                        ))}
                        <circle
                          cx={pipelineRose.cx}
                          cy={pipelineRose.cy}
                          r={20}
                          fill="url(#recPipelineRoseHub)"
                          stroke={isLight ? "rgba(202,27,40,0.15)" : "rgba(255,255,255,0.12)"}
                          strokeWidth={0.8}
                        />
                        <text
                          x={pipelineRose.cx}
                          y={pipelineRose.cy - 2}
                          textAnchor="middle"
                          className={isLight ? "fill-black/85" : "fill-white"}
                          style={{ fontSize: 17, fontWeight: 700 }}
                        >
                          {pipelineRose.appsTotal}
                        </text>
                        <text
                          x={pipelineRose.cx}
                          y={pipelineRose.cy + 12}
                          textAnchor="middle"
                          className={isLight ? "fill-black/45" : "fill-white/45"}
                          style={{ fontSize: 7.5, fontWeight: 600, letterSpacing: "0.14em" }}
                        >
                          TOTAL
                        </text>
                      </svg>
                    </div>
                    <div className="flex-1 space-y-2 min-w-0">
                      {pipelineRose.petals.map((s) => (
                        <div key={s.key} className="flex items-center justify-between gap-2 text-[12px]">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-sm shrink-0 ring-1 ring-black/10 dark:ring-white/15"
                              style={{ background: s.fill }}
                            />
                            <span className={`truncate ${isLight ? "text-black/75" : "text-white/65"}`}>{s.label}</span>
                          </div>
                          <span className={`font-semibold tabular-nums shrink-0 ${isLight ? "text-black" : "text-white/80"}`}>
                            {s.value}
                            <span className={`font-normal text-[11px] ml-1 ${themedParagraphClass}`}>
                              (
                              {pipelineRose.appsTotal > 0
                                ? Math.round((s.value / pipelineRose.appsTotal) * 100)
                                : 0}
                              %)
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Charts */}
      {!overviewQuery.isLoading && overview && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Candidatures par offre */}
          <div
            className={`${themedCardClass} p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(0,0,0,0.35)] ${
              isLight ? "card-luxury-light" : ""
            }`}
          >
            {!isLight && (
              <div className="pointer-events-none absolute inset-0 opacity-100 group-hover:opacity-0 transition-opacity duration-500">
                <div className="absolute -top-24 -right-28 w-72 h-72 rounded-full bg-white/5 blur-2xl" />
                <div className="absolute -bottom-28 -left-24 w-72 h-72 rounded-full bg-blue-500/10 blur-2xl opacity-60" />
              </div>
            )}
            <div className="relative">
            <h3 className={`text-[13px] uppercase tracking-[2px] font-semibold mb-5 ${isLight ? "text-black" : "text-white/50"}`}>
              Candidatures par offre
            </h3>
            {!overview.applicationsPerJob?.length ? (
              <p className={`text-[13px] ${themedParagraphClass}`}>Aucune donnée</p>
            ) : (
              (() => {
                const items = (overview.applicationsPerJob ?? []).slice(0, 6);
                const palette = isLight ? APPLICATIONS_PIE_PALETTE.light : APPLICATIONS_PIE_PALETTE.dark;
                const totalPie = items.reduce((s, it) => s + it.value, 0) || 1;
                const cx = 100;
                const cy = 100;
                const r = 82;
                let startDeg = 0;
                const slices = items.map((item, i) => {
                  const sweep = (item.value / totalPie) * 360;
                  const endDeg = startDeg + sweep;
                  const path = pieSlicePath(cx, cy, r, startDeg, endDeg);
                  const { face, depth } = palette[i % palette.length]!;
                  const pct = Math.round((item.value / totalPie) * 100);
                  startDeg = endDeg;
                  return { ...item, path, face, depth, pct };
                });
                const pieUid = `rec-apps-pie-${items.map((x) => x.value).join("-")}-${isLight ? "L" : "D"}`;

                return (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                      <div className="relative w-full max-w-[min(100%,260px)] mx-auto sm:mx-0 shrink-0">
                        <svg viewBox="0 0 220 200" className="w-full h-auto drop-shadow-[0_12px_28px_rgba(202,27,40,0.22)]" aria-hidden>
                          <defs>
                            <linearGradient id={`${pieUid}-plate`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={isLight ? "rgba(202,27,40,0.2)" : "rgba(202,27,40,0.35)"} />
                              <stop offset="100%" stopColor={isLight ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.55)"} />
                            </linearGradient>
                            <filter id={`${pieUid}-glow`} x="-20%" y="-20%" width="140%" height="140%">
                              <feGaussianBlur stdDeviation="1.2" result="b" />
                              <feMerge>
                                <feMergeNode in="b" />
                                <feMergeNode in="SourceGraphic" />
                              </feMerge>
                            </filter>
                          </defs>
                          <ellipse
                            cx="110"
                            cy="168"
                            rx="86"
                            ry="20"
                            fill={`url(#${pieUid}-plate)`}
                            opacity={isLight ? 0.85 : 0.9}
                          />
                          <g transform="translate(110, 108) scale(1, 0.56) translate(-100,-100)">
                            {slices.map((s, i) => (
                              <path
                                key={`d-${s.title}-${i}`}
                                d={s.path}
                                fill={s.depth}
                                stroke={isLight ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.45)"}
                                strokeWidth={0.75}
                              />
                            ))}
                          </g>
                          <g
                            transform="translate(110, 100) scale(1, 0.56) translate(-100,-100)"
                            filter={`url(#${pieUid}-glow)`}
                          >
                            {slices.map((s, i) => (
                              <path
                                key={`f-${s.title}-${i}`}
                                d={s.path}
                                fill={s.face}
                                stroke={isLight ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)"}
                                strokeWidth={0.65}
                              />
                            ))}
                          </g>
                          <g transform="translate(0, 4)">
                            <text
                              x="110"
                              y="96"
                              textAnchor="middle"
                              fill={isLight ? "#0a0a0a" : "#fafafa"}
                              stroke={isLight ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.55)"}
                              strokeWidth={isLight ? 1.25 : 1}
                              paintOrder="stroke fill"
                              style={{ fontSize: 20, fontWeight: 700 }}
                            >
                              {totalPie}
                            </text>
                            <text
                              x="110"
                              y="112"
                              textAnchor="middle"
                              fill={isLight ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.75)"}
                              stroke={isLight ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.4)"}
                              strokeWidth={0.6}
                              paintOrder="stroke fill"
                              style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: "0.14em" }}
                            >
                              CANDIDATURES
                            </text>
                          </g>
                        </svg>
                      </div>
                      <ul className="flex-1 space-y-2.5 min-w-0">
                        {slices.map((s, i) => (
                          <li
                            key={`${s.title}-${i}`}
                            className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${
                              isLight ? "border-black/[0.06] bg-black/[0.02]" : "border-white/[0.08] bg-white/[0.03]"
                            }`}
                            title={`${s.title}: ${s.value} (${s.pct}%)`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className="w-3 h-3 rounded-md shrink-0 shadow-sm ring-1 ring-black/10 dark:ring-white/15"
                                style={{ background: s.face }}
                              />
                              <span className={`text-[12px] font-medium truncate ${isLight ? "text-black/80" : "text-white/78"}`}>
                                {s.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 tabular-nums">
                              <span className={`text-[11px] font-semibold ${isLight ? "text-black/50" : "text-white/45"}`}>
                                {s.pct}%
                              </span>
                              <span className={`text-[12px] font-bold ${isLight ? "text-black" : "text-white/90"}`}>{s.value}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <p className={`text-[11px] ${themedParagraphClass}`}>
                      Vue en secteurs (perspective) — top {items.length} offres par volume de candidatures.
                    </p>
                  </div>
                );
              })()
            )}
            </div>
          </div>

          {/* Offres par catégorie */}
          <div
            className={`${themedCardClass} p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(0,0,0,0.35)] ${
              isLight ? "card-luxury-light" : ""
            }`}
          >
            {!isLight && (
              <div className="pointer-events-none absolute inset-0 opacity-100 group-hover:opacity-0 transition-opacity duration-500">
                <div className="absolute -top-24 -right-28 w-72 h-72 rounded-full bg-white/5 blur-2xl" />
                <div className="absolute -bottom-28 -left-24 w-72 h-72 rounded-full bg-violet-500/10 blur-2xl opacity-50" />
              </div>
            )}
            <div className="relative">
            <h3 className={`text-[13px] uppercase tracking-[2px] font-semibold mb-2 ${isLight ? "text-black" : "text-white/50"}`}>
              Offres par catégorie
            </h3>
            <p className={`text-[11px] mb-4 ${themedParagraphClass}`}>
              Barres groupées 3D : volume d&apos;offres et part du total par catégorie.
            </p>
            {!overview.jobsPerCategory?.length ? (
              <p className={`text-[13px] ${themedParagraphClass}`}>Aucune donnée</p>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const raw = overview.jobsPerCategory ?? [];
                  const data = raw.slice(0, 7);
                  const totalAll = raw.reduce((sum, d) => sum + (d.value ?? 0), 0) || 1;
                  const maxV = Math.max(...raw.map((d) => d.value ?? 0), 1);
                  const chartH = 118;
                  const yBase = 172;
                  const barW = 15;
                  const depth = 6;
                  const innerGap = 7;
                  const padL = 26;
                  const padR = 34;
                  const vbW = 400;
                  const innerW = vbW - padL - padR;
                  const n = data.length;
                  const stroke = isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.1)";
                  const prim = isLight ? CATEGORY_CLUSTER_PALETTE.light.primary : CATEGORY_CLUSTER_PALETTE.dark.primary;
                  const sec = isLight ? CATEGORY_CLUSTER_PALETTE.light.secondary : CATEGORY_CLUSTER_PALETTE.dark.secondary;

                  const renderBar3D = (x: number, h: number, colors: { front: string; right: string; top: string }) => {
                    const hh = Math.max(h, 1.5);
                    const p = isoBar3DPaths(x, yBase, barW, hh, depth);
                    return (
                      <g>
                        <path d={p.right} fill={colors.right} />
                        <path d={p.top} fill={colors.top} />
                        <path d={p.front} fill={colors.front} stroke={stroke} strokeWidth={0.4} />
                      </g>
                    );
                  };

                  return (
                    <>
                      <div className="w-full overflow-x-auto">
                        <svg
                          viewBox={`0 0 ${vbW} 198`}
                          className="w-full min-w-[300px] h-[200px]"
                          role="img"
                          aria-label="Histogramme 3D des offres par catégorie"
                        >
                          <line
                            x1={padL - 4}
                            y1={yBase}
                            x2={vbW - padR + depth}
                            y2={yBase}
                            stroke={isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.14)"}
                            strokeWidth={1}
                          />
                          {data.map((d, i) => {
                            const v = d.value ?? 0;
                            const hVol = (v / maxV) * chartH;
                            const hShare = (v / totalAll) * chartH;
                            const cx = padL + ((i + 0.5) / n) * innerW;
                            const xLeft = cx - barW - innerGap / 2;
                            const xRight = cx + innerGap / 2;
                            const c1 = prim[i % prim.length]!;
                            const c2 = sec[i % sec.length]!;
                            return (
                              <g key={`${d.label}-${i}`}>
                                {renderBar3D(xLeft, hVol, c1)}
                                {renderBar3D(xRight, hShare, c2)}
                              </g>
                            );
                          })}
                        </svg>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex gap-0.5" aria-hidden>
                            <span className="w-2 h-2.5 rounded-[2px] bg-tap-red/80" />
                            <span className="w-1 h-2.5 rounded-[1px] bg-tap-red/40 -ml-0.5 opacity-90" />
                          </span>
                          <span className={isLight ? "text-black/65" : "text-white/55"}>Offres (échelle max.)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex gap-0.5" aria-hidden>
                            <span className="w-2 h-2.5 rounded-[2px] bg-indigo-400/70" />
                            <span className="w-1 h-2.5 rounded-[1px] bg-indigo-600/50 -ml-0.5 opacity-90" />
                          </span>
                          <span className={isLight ? "text-black/65" : "text-white/55"}>Part du total</span>
                        </div>
                      </div>

                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                        {data.map((d, i) => (
                          <li
                            key={`leg-${d.label}-${i}`}
                            className={`flex items-center justify-between gap-2 ${isLight ? "text-black/70" : "text-white/60"}`}
                          >
                            <span className="truncate min-w-0" title={d.label}>
                              {d.label}
                            </span>
                            <span className="tabular-nums shrink-0 font-semibold">
                              {d.value ?? 0}{" "}
                              <span className={`font-normal ${themedParagraphClass}`}>
                                ({Math.round(((d.value ?? 0) / totalAll) * 100)}%)
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                      {raw.length > 7 ? (
                        <p className={`text-[10px] ${themedParagraphClass}`}>
                          Affichage des 7 premières catégories ({raw.length} au total).
                        </p>
                      ) : null}
                    </>
                  );
                })()}
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* Répartition des candidatures */}
      {!overviewQuery.isLoading && overview && (
        <div
          className={`${themedCardClass} p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(0,0,0,0.35)] ${
            isLight ? "card-luxury-light" : ""
          }`}
        >
          {!isLight && (
            <div className="pointer-events-none absolute inset-0 opacity-100 group-hover:opacity-0 transition-opacity duration-500">
              <div className="absolute -top-24 -right-28 w-72 h-72 rounded-full bg-white/5 blur-2xl" />
              <div className="absolute -bottom-28 -left-24 w-72 h-72 rounded-full bg-amber-500/10 blur-2xl opacity-50" />
            </div>
          )}
          <div className="relative">
            <div className="flex items-center gap-2 mb-5">
              <Activity size={14} className="text-amber-500" />
              <h3 className={`text-[13px] uppercase tracking-[2px] font-semibold ${isLight ? "text-black" : "text-white/50"}`}>
                Répartition des candidatures
              </h3>
            </div>

            {!overview?.recentApplications?.length ? (
              <p className={`text-[13px] py-4 text-center ${themedParagraphClass}`}>
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

                const toStatusKey = (status: string) => String(status ?? "").toLowerCase().trim();
                const dotClass = (status: string) => {
                  const s = toStatusKey(status);
                  switch (s) {
                    case "accepted":
                    case "accepté":
                    case "acceptée":
                    case "acceptee":
                    case "active":
                      return isLight ? "bg-green-500" : "bg-green-400";
                    case "refused":
                    case "refusé":
                    case "refusee":
                    case "rejected":
                      return isLight ? "bg-red-500" : "bg-red-400";
                    case "pending":
                    case "en attente":
                    case "en_attente":
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
                        case "acceptée":
                        case "acceptee":
                        case "active":
                          return 0;
                        case "pending":
                        case "en attente":
                        case "en_attente":
                          return 1;
                        case "refused":
                        case "refusé":
                        case "refusee":
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
                    case "acceptée":
                    case "acceptee":
                    case "active":
                      return {
                        fill: isLight ? "#22c55e" : "#4ade80",
                        stroke: isLight ? "#16a34a" : "#22c55e",
                      };
                    case "refused":
                    case "refusé":
                    case "refusee":
                    case "rejected":
                      return {
                        fill: isLight ? "#ef4444" : "#fb7185",
                        stroke: isLight ? "#dc2626" : "#f43f5e",
                      };
                    case "pending":
                    case "en attente":
                    case "en_attente":
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

                    {/* Courbe / ligne : un seul statut → plateau horizontal lisible (100 % du volume) */}
                    <div className="w-full">
                      {(() => {
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

                            {n === 1 && points[0] ? (
                              <g>
                                <line
                                  x1={padX}
                                  y1={points[0].y}
                                  x2={W - padX}
                                  y2={points[0].y}
                                  stroke={statusColors(entries[0]!.status).stroke}
                                  strokeWidth={3.5}
                                  strokeLinecap="round"
                                  opacity={0.85}
                                />
                                <circle
                                  cx={points[0].x}
                                  cy={points[0].y}
                                  r={6}
                                  fill={statusColors(entries[0]!.status).fill}
                                  stroke={statusColors(entries[0]!.status).stroke}
                                  strokeWidth={2}
                                />
                                <circle cx={points[0].x} cy={points[0].y} r={12} fill={statusColors(entries[0]!.status).fill} opacity={0.14} />
                              </g>
                            ) : (
                              <>
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
                              </>
                            )}
                          </svg>
                        );
                      })()}
                      {entries.length === 1 ? (
                        <p className={`text-[11px] text-center mt-1 ${themedParagraphClass}`}>
                          Toutes les candidatures récentes partagent ce statut (part = 100 %).
                        </p>
                      ) : null}
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
          <div
            className={`${themedCardClass} p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(0,0,0,0.35)] ${
              isLight ? "card-luxury-light" : ""
            }`}
          >
            {!isLight && (
              <div className="pointer-events-none absolute inset-0 opacity-100 group-hover:opacity-0 transition-opacity duration-500">
                <div className="absolute -top-24 -right-28 w-72 h-72 rounded-full bg-white/5 blur-2xl" />
                <div className="absolute -bottom-28 -left-24 w-72 h-72 rounded-full bg-tap-red/10 blur-2xl opacity-40" />
              </div>
            )}
            <div className="relative">
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
                      className={`rounded-xl px-5 py-4 transition cursor-pointer ${
                        isLight
                          ? "card-luxury-light hover:border-tap-red/70"
                          : "border border-white/[0.06] bg-white/[0.02] hover:border-tap-red/15"
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
                        <div className="col-span-12 sm:col-span-5 min-w-0 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-white/[0.10] bg-white/[0.04] flex items-center justify-center shrink-0">
                            {app.candidateAvatarUrl ? (
                              <img
                                src={app.candidateAvatarUrl}
                                alt={app.candidateName ?? "Avatar candidat"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className={`text-[12px] font-semibold ${isLight ? "text-black/70" : "text-white/70"}`}>
                                {getInitials(app.candidateName)}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className={`text-[14px] font-medium truncate ${isLight ? "text-black" : "text-white"}`}>
                              {app.candidateName}
                            </p>
                          </div>
                        </div>

                        <div className="col-span-12 sm:col-span-5 text-center sm:text-left">
                          <span className={`text-[12px] ${isLight ? "text-black/70" : "text-white/45"} truncate inline-block`}>
                            {app.jobTitle ?? "—"}
                          </span>
                        </div>

                        <div className="col-span-12 sm:col-span-2">
                          <div className="flex items-center sm:justify-end justify-between gap-2">
                            <p className={`text-[11px] ${isLight ? "text-black/55" : "text-white/35"} whitespace-nowrap`}>
                              {app.validatedAt ? formatRelative(app.validatedAt) : "—"}
                            </p>
                            <span
                              className={`text-[11px] whitespace-nowrap underline underline-offset-2 ${
                                isLight ? "text-tap-red" : "text-tap-red"
                              } hover:opacity-90 transition-opacity`}
                            >
                              Voir l&apos;offre
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </div>
          </div>
        </div>

        {hasAlerts && (
          <div>
            <div
              className={`${themedCardClass} p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(0,0,0,0.35)] ${
                isLight ? "card-luxury-light" : ""
              }`}
            >
              {!isLight && (
                <div className="pointer-events-none absolute inset-0 opacity-100 group-hover:opacity-0 transition-opacity duration-500">
                  <div className="absolute -top-24 -right-28 w-72 h-72 rounded-full bg-white/5 blur-2xl" />
                  <div className="absolute -bottom-28 -left-24 w-72 h-72 rounded-full bg-amber-500/10 blur-2xl opacity-50" />
                </div>
              )}
              <div className="relative">
              <h2 className={`text-[13px] uppercase tracking-[2px] font-semibold flex items-center gap-2 ${isLight ? "text-black" : "text-white/60"}`}>
                <Bell size={13} className="text-yellow-500" /> Alertes
              </h2>
              <div className="mt-4 space-y-2">
                {(overview?.alerts ?? []).map((alert, i) => (
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
          </div>
        )}
      </div>
    </div>
  );
}
