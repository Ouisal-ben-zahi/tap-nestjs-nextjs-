"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRecruteurOverview } from "@/hooks/use-recruteur";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { MessageSquare, Calendar, Clock, Video, MapPin, Phone, CheckCircle, SlidersHorizontal, Briefcase, Users, FileText, AlertTriangle } from "lucide-react";
import { formatRelative } from "@/lib/utils";
import Link from "next/link";

const INTERVIEW_TYPES = [
  { label: "Visio", icon: Video, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  { label: "Présentiel", icon: MapPin, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
  { label: "Téléphone", icon: Phone, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
];

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

  if (!isRecruteur) {
    return (
      <EmptyState
        icon={<MessageSquare className="w-12 h-12" />}
        title="Espace recruteur uniquement"
        description="Cette section est réservée aux recruteurs."
      />
    );
  }

  const overview = overviewQuery.data;
  const recentApps = overview?.recentApplications || [];
  const interviewCandidates = overview?.acceptedApplications || [];

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [nameQuery, setNameQuery] = useState("");
  const [jobTitleQuery, setJobTitleQuery] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const jobTitles = Array.from(
    new Set(
      interviewCandidates
        .map((c) => c.jobTitle)
        .filter((v): v is string => typeof v === "string" && v.trim().length > 0),
    ),
  );

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

  return (
    <div className="max-w-[1100px] mx-auto">
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
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
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
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-1 h-5 rounded-full bg-purple-500" />
                <h2 className="text-[13px] uppercase tracking-[2px] text-white/50 font-semibold">Candidats acceptés — Prêts pour entretien</h2>
              </div>

              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-white/[0.10] bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white transition"
                aria-label="Ouvrir les filtres"
                title="Filtres"
              >
                <SlidersHorizontal size={18} />
              </button>
            </div>

            {filtersOpen && (
              <div className="mb-5 rounded-2xl border border-white/[0.06] bg-zinc-900/50 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-white/40">Recherche nom</label>
                    <input
                      value={nameQuery}
                      onChange={(e) => setNameQuery(e.target.value)}
                      className="h-9 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-[12px] text-white/80 outline-none focus:border-white/[0.18]"
                      placeholder="Ex: Karim"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-white/40">Offre</label>
                    <select
                      value={jobTitleQuery}
                      onChange={(e) => setJobTitleQuery(e.target.value)}
                      className="h-9 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-[12px] text-white/80 outline-none focus:border-white/[0.18]"
                    >
                      <option value="all">Toutes</option>
                      {jobTitles.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-white/40">Date</label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="h-9 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 text-[12px] text-white/80 outline-none focus:border-white/[0.18]"
                        aria-label="Date début"
                      />
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="h-9 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 text-[12px] text-white/80 outline-none focus:border-white/[0.18]"
                        aria-label="Date fin"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setNameQuery("");
                      setJobTitleQuery("all");
                      setDateFrom("");
                      setDateTo("");
                    }}
                    className="text-[12px] text-white/60 hover:text-white underline underline-offset-2"
                  >
                    Réinitialiser
                  </button>
                </div>
              </div>
            )}

            {filteredInterviewCandidates.length === 0 ? (
              <EmptyState
                icon={<Calendar className="w-10 h-10" />}
                title="Aucun entretien planifié"
                description="Acceptez des candidatures pour planifier des entretiens avec les meilleurs profils."
              />
            ) : (
              <div className="space-y-2">
                {filteredInterviewCandidates.map((app) => (
                  <div
                    key={app.id}
                    className="grid grid-cols-12 items-center gap-4 bg-zinc-900/50 border border-white/[0.06] rounded-xl px-5 py-4 transition hover:border-white/[0.1]"
                  >
                    {/* Col avatar + nom */}
                    <div className="col-span-12 sm:col-span-5 min-w-0 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-white/[0.10] bg-white/[0.04] flex items-center justify-center shrink-0">
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
                        <p className="text-[14px] font-medium text-white whitespace-normal break-words leading-tight">
                          {app.candidateName}
                        </p>
                      {typeof app.candidateCategory === "string" && app.candidateCategory.trim() ? (
                        <div className="mt-1">
                          <span className="text-[12px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/45 truncate inline-block max-w-full">
                            {app.candidateCategory}
                          </span>
                        </div>
                      ) : null}
                      </div>
                    </div>

                    {/* Col job */}
                    <div className="col-span-6 sm:col-span-3 text-center flex justify-center">
                      <span className="text-[12px] text-white/45 truncate inline-block whitespace-nowrap">{app.jobTitle ?? "—"}</span>
                    </div>

                    {/* Col durée */}
                    <div className="col-span-12 sm:col-span-1 text-center sm:text-right flex justify-center sm:justify-end">
                      <p className="text-[11px] text-white/30 whitespace-nowrap">
                        {app.validatedAt ? formatRelative(app.validatedAt) : "—"}
                      </p>
                    </div>

                    {/* Col action */}
                    <div className="col-span-12 sm:col-span-3 text-center sm:text-right flex justify-center sm:justify-end">
                      <Link
                        href={`/app/candidats?jobId=${app.jobId ?? ""}`}
                        className="btn-primary btn-sm w-full justify-center whitespace-nowrap"
                        aria-label="Planifier un entretien"
                        title="Planifier un entretien"
                      >
                        Planifier un entretien
                      </Link>
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
