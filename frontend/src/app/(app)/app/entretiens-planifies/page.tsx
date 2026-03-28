"use client";

import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRecruteurOverview } from "@/hooks/use-recruteur";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton, StatCardSkeleton } from "@/components/ui/Skeleton";
import {
  MessageSquare,
  Calendar,
  Clock,
  Video,
  MapPin,
  Phone,
  CheckCircle,
  Briefcase,
  FileText,
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { formatRelative } from "@/lib/utils";
import Link from "next/link";

const INTERVIEW_TYPES = [
  { label: "Visio", icon: Video, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  { label: "Présentiel", icon: MapPin, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
  { label: "Téléphone", icon: Phone, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
];

const ENTRETIENS_ACCEPTES_PAR_PAGE = 16;

const RECRUTEUR_DASHBOARD_CARD_BASE =
  "group card-animated-border relative rounded-2xl border border-white/[0.08] bg-[#020001] shadow-[0_10px_28px_rgba(0,0,0,0.45)] hover:bg-[linear-gradient(180deg,rgba(202,27,40,0.08)_0%,rgba(10,10,10,0.96)_30%,rgba(10,10,10,0.96)_100%)] hover:border-tap-red/15 transition-all duration-500 overflow-visible hover:-translate-y-0.5";

/** Même base que les KPI du tableau de bord recruteur (`RecruteurDashboard`). */
const RECRUTEUR_DASHBOARD_KPI_CARD_BASE =
  "group card-animated-border relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#020001] shadow-[0_10px_28px_rgba(0,0,0,0.45)] hover:bg-[linear-gradient(180deg,rgba(202,27,40,0.08)_0%,rgba(10,10,10,0.96)_30%,rgba(10,10,10,0.96)_100%)] hover:border-tap-red/15 transition-all duration-500";

function getInitials(name: string | null | undefined) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return `${first}${second}`.toUpperCase() || "C";
}

export default function EntretiensPlanifiesPage() {
  const { user } = useAuth();
  const isRecruteur = user?.role === "recruteur";
  const overviewQuery = useRecruteurOverview();
  const theme = useDashboardTheme();
  const isLight = theme === "light";

  const [nameQuery, setNameQuery] = useState("");
  const [jobTitleQuery, setJobTitleQuery] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [entretienJobFilterOpen, setEntretienJobFilterOpen] = useState(false);
  const [entretienPage, setEntretienPage] = useState(1);

  const overview = overviewQuery.data;
  const recentApps = overview?.recentApplications || [];
  const interviewCandidates = overview?.acceptedApplications || [];

  const jobTitles = useMemo(
    () =>
      Array.from(
        new Set(
          interviewCandidates
            .map((c) => c.jobTitle)
            .filter((v): v is string => typeof v === "string" && v.trim().length > 0),
        ),
      ).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" })),
    [interviewCandidates],
  );

  useEffect(() => {
    if (!entretienJobFilterOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const el = e.target;
      if (!(el instanceof Node)) return;
      const root = document.querySelector("[data-entretien-filtre-dropdowns]");
      if (root && !root.contains(el)) setEntretienJobFilterOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [entretienJobFilterOpen]);

  const hasActiveEntretienFilters =
    Boolean(nameQuery.trim()) || jobTitleQuery !== "all" || Boolean(dateFrom) || Boolean(dateTo);

  const dateInputClass = `h-[42px] flex-1 min-w-0 rounded-xl border px-2.5 text-[13px] outline-none transition focus:ring-2 focus:ring-tap-red/30 ${
    isLight
      ? "border-black/10 bg-white text-black [color-scheme:light]"
      : "border-white/[0.08] bg-white/[0.03] text-white/90 [color-scheme:dark]"
  }`;

  const filteredInterviewCandidates = interviewCandidates.filter((c) => {
    const q = nameQuery.trim().toLowerCase();
    if (q) {
      const cn = String(c.candidateName ?? "").toLowerCase();
      if (!cn.includes(q)) return false;
    }

    if (jobTitleQuery !== "all") {
      if ((c.jobTitle ?? "") !== jobTitleQuery) return false;
    }

    const hasDateFilter = Boolean(dateFrom || dateTo);
    if (hasDateFilter) {
      if (!c.validatedAt) return false;
      const ts = new Date(c.validatedAt).getTime();
      if (dateFrom) {
        const fromTs = new Date(`${dateFrom}T00:00:00`).getTime();
        if (ts < fromTs) return false;
      }
      if (dateTo) {
        const toTs = new Date(`${dateTo}T23:59:59`).getTime();
        if (ts > toTs) return false;
      }
    }

    return true;
  });

  const entretienTotal = filteredInterviewCandidates.length;
  const entretienTotalPages = Math.max(1, Math.ceil(entretienTotal / ENTRETIENS_ACCEPTES_PAR_PAGE));

  const paginatedEntretiens = useMemo(() => {
    const start = (entretienPage - 1) * ENTRETIENS_ACCEPTES_PAR_PAGE;
    return filteredInterviewCandidates.slice(start, start + ENTRETIENS_ACCEPTES_PAR_PAGE);
  }, [filteredInterviewCandidates, entretienPage]);

  useEffect(() => {
    setEntretienPage(1);
  }, [nameQuery, jobTitleQuery, dateFrom, dateTo]);

  useEffect(() => {
    setEntretienPage((p) => (p > entretienTotalPages ? entretienTotalPages : p < 1 ? 1 : p));
  }, [entretienTotalPages]);

  if (!isRecruteur) {
    return (
      <EmptyState
        icon={<MessageSquare className="w-12 h-12" />}
        title="Espace recruteur uniquement"
        description="Cette section est réservée aux recruteurs."
      />
    );
  }

  return (
    <div className="max-w-[min(100%,1440px)] mx-auto px-1 sm:px-0">
      {/* Header */}
      <div className="relative mb-8 pb-8 border-b border-white/[0.04]">
        <div className="absolute top-[-80px] left-[-100px] w-[350px] h-[350px] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.08),transparent_60%)] blur-3xl pointer-events-none" />
        <div className="relative">
          <h1 className="text-[28px] sm:text-[36px] font-bold text-white tracking-[-0.04em] font-heading">
            Entretiens planifiés
          </h1>
          <p className="text-white/45 text-[14px] mt-2 font-light">
            Gérez et suivez vos entretiens avec les candidats sélectionnés.
          </p>
        </div>
      </div>

      {overviewQuery.isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <Skeleton className="h-40 w-full" />
        </div>
      ) : overviewQuery.isError ? (
        <ErrorState onRetry={() => overviewQuery.refetch()} />
      ) : (
        <>
          {/* Stats rapides */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              {
                label: "Candidatures",
                value: recentApps.length,
                meta: "candidatures",
                icon: FileText,
              },
              {
                label: "À interviewer",
                value: interviewCandidates.length,
                meta: "prêts pour entretien",
                icon: Clock,
              },
              {
                label: "Postes ouverts",
                value: overview?.totalJobs ?? 0,
                meta: "offres actives",
                icon: Briefcase,
              },
              {
                label: "Urgents",
                value: overview?.urgentJobs ?? 0,
                meta: "priorité recrutement",
                icon: AlertTriangle,
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="group rounded-2xl p-5 relative overflow-hidden bg-zinc-900/60 border border-white/[0.07] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 shadow-[0_18px_40px_rgba(0,0,0,0.25)]"
                >
                  <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute -top-20 -right-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
                    <div className="absolute -bottom-24 -left-20 w-56 h-56 rounded-full bg-tap-red/10 blur-2xl opacity-40" />
                  </div>

                  <div className="flex items-start justify-between gap-3 relative">
                    <div>
                      <p className="text-[11px] uppercase tracking-[1.5px] text-white/85">{card.label}</p>
                      <p className="mt-2 text-[30px] font-bold tracking-[-0.03em] text-white">{card.value}</p>
                      <p className="mt-1 text-[12px] text-white/70">{card.meta}</p>
                    </div>
                    <div className="w-11 h-11 rounded-xl border flex items-center justify-center bg-white/15 border-white/25">
                      <Icon size={18} className="text-white" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Candidats à interviewer */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-5 rounded-full bg-purple-500" />
              <h2 className="text-[13px] uppercase tracking-[2px] text-white/50 font-semibold">
                Candidats acceptés — Prêts pour entretien
              </h2>
            </div>

            <div
              className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3 mb-5"
              data-entretien-filtre-dropdowns
            >
              <div className="flex-1 min-w-[min(100%,220px)]">
                <label
                  htmlFor="entretien-filtre-recherche"
                  className={`block text-[10px] font-semibold uppercase tracking-[2px] mb-2 ${
                    isLight ? "text-black/70" : "text-white/40"
                  }`}
                >
                  Recherche
                </label>
                <div className="relative">
                  <Search
                    className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                      isLight ? "text-black/35" : "text-white/35"
                    }`}
                    aria-hidden
                  />
                  <input
                    id="entretien-filtre-recherche"
                    type="search"
                    value={nameQuery}
                    onChange={(e) => setNameQuery(e.target.value)}
                    placeholder="Nom du candidat…"
                    className={`input-premium w-full rounded-xl border pl-10 pr-3 py-2.5 text-[13px] outline-none transition focus:ring-2 focus:ring-tap-red/30 ${
                      isLight
                        ? "!bg-white !border-black/10 !text-black placeholder:!text-black/40"
                        : ""
                    }`}
                    aria-label="Rechercher par nom de candidat"
                  />
                </div>
              </div>

              <div className="relative min-w-[min(100%,220px)] sm:min-w-[200px]">
                <label
                  className={`block text-[10px] font-semibold uppercase tracking-[2px] mb-2 ${
                    isLight ? "text-black/70" : "text-white/40"
                  }`}
                >
                  Offre
                </label>
                <button
                  type="button"
                  onClick={() => setEntretienJobFilterOpen((v) => !v)}
                  className={`input-premium w-full flex items-center justify-between cursor-pointer text-left rounded-xl min-h-[42px] px-3 py-2 ${
                    isLight
                      ? "bg-white border border-black/10 hover:border-tap-red/40"
                      : "bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08]"
                  }`}
                  aria-expanded={entretienJobFilterOpen}
                  aria-haspopup="listbox"
                >
                  <span className={`text-[13px] truncate pr-2 ${isLight ? "text-black" : "text-white/80"}`}>
                    {jobTitleQuery === "all" ? "Toutes les offres" : jobTitleQuery}
                  </span>
                  <ChevronDown
                    size={14}
                    className={isLight ? "text-black/60 shrink-0" : "text-white/45 shrink-0"}
                  />
                </button>
                {entretienJobFilterOpen ? (
                  <div
                    className="absolute left-0 top-full mt-2 w-full min-w-[220px] max-h-[min(280px,50vh)] overflow-y-auto bg-[#050505]/95 border border-white/[0.08] rounded-2xl shadow-lg backdrop-blur-xl z-[80]"
                    role="listbox"
                  >
                    <div>
                      <button
                        type="button"
                        role="option"
                        aria-selected={jobTitleQuery === "all"}
                        onClick={() => {
                          setJobTitleQuery("all");
                          setEntretienJobFilterOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-4 py-3 text-left text-[13px] transition-colors focus:outline-none focus-visible:outline-none ${
                          jobTitleQuery === "all"
                            ? "text-white bg-red-500/15"
                            : "text-white/80 hover:text-white hover:bg-red-500/8"
                        }`}
                      >
                        <span className="flex-1 truncate">Toutes les offres</span>
                      </button>
                      {jobTitles.map((t) => {
                        const active = jobTitleQuery === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            role="option"
                            aria-selected={active}
                            onClick={() => {
                              setJobTitleQuery(t);
                              setEntretienJobFilterOpen(false);
                            }}
                            className={`w-full flex items-center gap-2.5 px-4 py-3 text-left text-[13px] transition-colors focus:outline-none focus-visible:outline-none ${
                              active
                                ? "text-white bg-red-500/15"
                                : "text-white/80 hover:text-white hover:bg-red-500/8"
                            }`}
                          >
                            <span className="flex-1 truncate">{t}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="w-full min-w-[min(100%,280px)] sm:min-w-[260px] sm:max-w-md sm:flex-1">
                <label
                  className={`block text-[10px] font-semibold uppercase tracking-[2px] mb-2 ${
                    isLight ? "text-black/70" : "text-white/40"
                  }`}
                >
                  Période (acceptation)
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className={dateInputClass}
                    aria-label="Date de début"
                  />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className={dateInputClass}
                    aria-label="Date de fin"
                  />
                </div>
              </div>

              {hasActiveEntretienFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setNameQuery("");
                    setJobTitleQuery("all");
                    setDateFrom("");
                    setDateTo("");
                    setEntretienJobFilterOpen(false);
                  }}
                  className={`shrink-0 min-h-[42px] self-end px-3 rounded-xl border text-[12px] font-medium transition ${
                    isLight
                      ? "border-black/15 text-black/70 hover:bg-black/[0.04]"
                      : "border-white/[0.14] text-white/70 hover:bg-white/[0.06]"
                  }`}
                >
                  Réinitialiser
                </button>
              ) : null}
            </div>

            {interviewCandidates.length === 0 ? (
              <EmptyState
                icon={<Calendar className="w-10 h-10" />}
                title="Aucun candidat accepté"
                description="Acceptez des candidatures pour planifier des entretiens avec les meilleurs profils."
              />
            ) : filteredInterviewCandidates.length === 0 ? (
              <EmptyState
                icon={<Filter className="w-10 h-10" />}
                title="Aucun résultat"
                description="Aucun candidat ne correspond à votre recherche ou aux filtres sélectionnés."
              />
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedEntretiens.map((app) => {
                    const durationLabel = app.validatedAt ? formatRelative(app.validatedAt) : "—";
                    return (
                      <div
                        key={app.id}
                        className={`${RECRUTEUR_DASHBOARD_CARD_BASE} p-4 sm:p-5 h-full min-h-0 min-w-0 flex flex-col ${
                          isLight
                            ? "card-luxury-light hover:shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
                            : "hover:brightness-105 shadow-[0_18px_40px_rgba(0,0,0,0.25)]"
                        }`}
                      >
                        <div className="pointer-events-none absolute inset-0 opacity-100 group-hover:opacity-0 transition-opacity duration-500 rounded-2xl overflow-hidden">
                          <div className="absolute -top-20 -right-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
                          <div className="absolute -bottom-24 -left-20 w-56 h-56 rounded-full bg-tap-red/10 blur-2xl opacity-40" />
                        </div>

                        <div className="relative z-[1] flex flex-col gap-3 flex-1 min-h-0 min-w-0">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-full overflow-hidden border border-white/[0.10] bg-white/[0.04] flex items-center justify-center shrink-0">
                              {app.candidateAvatarUrl ? (
                                <img
                                  src={app.candidateAvatarUrl}
                                  alt={app.candidateName ?? "Avatar candidat"}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span
                                  className={`text-[13px] font-semibold ${
                                    isLight ? "text-black/60" : "text-white/70"
                                  }`}
                                >
                                  {getInitials(app.candidateName)}
                                </span>
                              )}
                            </div>
                            <p
                              className={`text-[14px] font-semibold leading-snug line-clamp-2 min-w-0 flex-1 ${
                                isLight ? "text-black" : "text-white"
                              }`}
                            >
                              {app.candidateName}
                            </p>
                          </div>

                          <div
                            className={`flex items-start justify-between gap-3 border-t pt-3 ${
                              isLight ? "border-black/10" : "border-white/[0.08]"
                            }`}
                          >
                            <p
                              className={`text-[12px] leading-snug line-clamp-2 min-w-0 flex-1 ${
                                isLight ? "text-black/65" : "text-white/55"
                              }`}
                            >
                              {app.jobTitle ?? "—"}
                            </p>
                            <p
                              className={`text-[11px] shrink-0 text-right leading-tight max-w-[42%] pt-0.5 ${
                                isLight ? "text-black/45" : "text-white/40"
                              }`}
                              title={durationLabel}
                            >
                              {durationLabel}
                            </p>
                          </div>

                          <div className="mt-auto flex justify-end pt-1">
                            <Link
                              href={`/app/entretiens-planifies/planifier?jobId=${app.jobId ?? ""}&candidateId=${app.candidateId ?? ""}&candidateName=${encodeURIComponent(app.candidateName ?? "")}&jobTitle=${encodeURIComponent(app.jobTitle ?? "")}`}
                              className="btn-primary btn-sm inline-flex shrink-0 justify-center whitespace-nowrap"
                              aria-label="Planifier un entretien"
                              title="Planifier un entretien"
                            >
                              Planifier un entretien
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {entretienTotalPages > 1 ? (
                  <div
                    className={`mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 ${
                      isLight ? "border-t border-black/10" : "border-t border-white/[0.06]"
                    }`}
                  >
                    <p className={`text-[12px] ${isLight ? "text-black/50" : "text-white/45"}`}>
                      Affichage de {(entretienPage - 1) * ENTRETIENS_ACCEPTES_PAR_PAGE + 1} —{" "}
                      {Math.min(entretienPage * ENTRETIENS_ACCEPTES_PAR_PAGE, entretienTotal)} sur{" "}
                      {entretienTotal}
                    </p>
                    <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
                      <button
                        type="button"
                        disabled={entretienPage <= 1}
                        onClick={() => setEntretienPage((p) => Math.max(1, p - 1))}
                        className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[12px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                          isLight
                            ? "border-black/15 text-black/80 hover:bg-black/[0.04]"
                            : "border-white/[0.14] text-white/80 hover:bg-white/[0.06]"
                        }`}
                      >
                        <ChevronLeft size={16} strokeWidth={2} />
                        Précédent
                      </button>
                      <span
                        className={`text-[12px] tabular-nums px-2 ${isLight ? "text-black/55" : "text-white/50"}`}
                      >
                        Page {entretienPage} / {entretienTotalPages}
                      </span>
                      <button
                        type="button"
                        disabled={entretienPage >= entretienTotalPages}
                        onClick={() =>
                          setEntretienPage((p) => Math.min(entretienTotalPages, p + 1))
                        }
                        className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[12px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
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
              </>
            )}
          </div>

        </>
      )}
    </div>
  );
}
