"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useRecruteurJob,
  useRecruteurJobs,
  useToggleJobStatus,
  useDeleteJob,
} from "@/hooks/use-recruteur";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  MapPin,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  CircleSlash2,
  Share2,
  Trash2,
} from "lucide-react";
import { formatRelative } from "@/lib/utils";
import DropdownSelect from "@/components/app/DropdownSelect";
import type { Job } from "@/types/recruteur";

/* Même base que RecruteurDashboard `themedCardClass` + effets KPI (ombre, léger lift) */
const dashboardCardDarkBase =
  "group card-animated-border relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#020001] shadow-[0_18px_40px_rgba(0,0,0,0.25)] hover:bg-[linear-gradient(180deg,rgba(202,27,40,0.08)_0%,rgba(10,10,10,0.96)_30%,rgba(10,10,10,0.96)_100%)] hover:border-tap-red/15 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(0,0,0,0.35)] hover:brightness-105";

const listCardDarkDefault = `${dashboardCardDarkBase} cursor-pointer p-4 sm:p-5`;

const listCardDarkSelected =
  "group card-animated-border relative cursor-pointer overflow-hidden rounded-2xl border border-tap-red/35 bg-[#020001] p-4 sm:p-5 shadow-[0_12px_40px_rgba(0,0,0,0.45),0_0_24px_rgba(202,27,40,0.14)] transition-all duration-300 hover:-translate-y-0.5 hover:border-tap-red/40 hover:shadow-[0_18px_45px_rgba(0,0,0,0.35)] hover:brightness-105";

const listCardLightDefault =
  "group card-animated-border relative cursor-pointer overflow-hidden rounded-2xl border border-white/[0.08] bg-[#020001] p-4 sm:p-5 card-luxury-light transition-all duration-300 hover:-translate-y-0.5 hover:border-tap-red/25 hover:shadow-[0_12px_30px_rgba(0,0,0,0.18)]";

const listCardLightSelected =
  "group card-animated-border relative cursor-pointer overflow-hidden rounded-2xl border border-tap-red/35 p-4 sm:p-5 card-luxury-light shadow-[0_8px_28px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-0.5";

/* Détail offre (sombre) : fond dégradé / bordure rouge au repos, fond #020001 au survol (inverse des cartes liste) */
const detailCardDarkClass =
  "group card-animated-border relative overflow-hidden rounded-2xl border border-tap-red/15 bg-[linear-gradient(180deg,rgba(202,27,40,0.08)_0%,rgba(10,10,10,0.96)_30%,rgba(10,10,10,0.96)_100%)] shadow-[0_18px_40px_rgba(0,0,0,0.25)] hover:bg-[#020001] hover:border-white/[0.08] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(0,0,0,0.35)]";

function jobIdEquals(a: unknown, b: unknown): boolean {
  if (a == null || b == null) return false;
  return Number(a) === Number(b);
}

function getJobLocalisation(job: {
  localisation?: string | null;
  location_type?: string | null;
}) {
  const raw =
    typeof job.localisation === "string" && job.localisation.trim()
      ? job.localisation.trim()
      : typeof job.location_type === "string" && job.location_type.trim()
        ? job.location_type.trim()
        : "";
  return raw;
}

function parseCountryCity(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) return { city: "", country: "" };
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { city: parts[0] ?? "", country: parts[parts.length - 1] ?? "" };
  }
  return { city: raw, country: "" };
}

function namesFromSkillsOrLanguages(raw: unknown): string[] {
  if (!Array.isArray(raw) || !raw.length) return [];
  return (raw as unknown[])
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object" && "name" in item) {
        return String((item as { name?: unknown }).name ?? "").trim();
      }
      return "";
    })
    .filter(Boolean);
}

function shareJobOfferLink(jobId: number, title: string) {
  const detailsUrl =
    typeof window !== "undefined" ? `${window.location.origin}/app/offres/${jobId}` : `/app/offres/${jobId}`;
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    void navigator.share({ title: title || "Offre", url: detailsUrl });
    return;
  }
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(detailsUrl);
  }
}

export default function RecruiterMesOffresSection({
  onEditJob,
}: {
  /** Ouvre le formulaire « Modifier l’offre » sur la page parente (/app/offres) */
  onEditJob?: (jobId: number) => void;
} = {}) {
  const router = useRouter();
  const theme = useDashboardTheme();
  const isLight = theme === "light";
  const jobsQuery = useRecruteurJobs();
  const toggleJobStatus = useToggleJobStatus();
  const deleteJob = useDeleteJob();
  const [nameQuery, setNameQuery] = useState("");
  const [countryQuery, setCountryQuery] = useState("all");
  const [cityQuery, setCityQuery] = useState("all");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [deleteConfirmJobId, setDeleteConfirmJobId] = useState<number | null>(null);

  const allJobs = jobsQuery.data?.jobs ?? [];

  const countries = useMemo(
    () =>
      Array.from(
        new Set(
          allJobs
            .map((j) => parseCountryCity(getJobLocalisation(j)).country)
            .filter((v): v is string => typeof v === "string" && v.length > 0),
        ),
      ),
    [allJobs],
  );

  const cities = useMemo(
    () =>
      Array.from(
        new Set(
          allJobs
            .map((j) => parseCountryCity(getJobLocalisation(j)))
            .filter((loc) => (countryQuery === "all" ? true : loc.country === countryQuery))
            .map((loc) => loc.city)
            .filter((v): v is string => typeof v === "string" && v.length > 0),
        ),
      ),
    [allJobs, countryQuery],
  );

  const filteredJobs = useMemo(() => {
    return allJobs.filter((job) => {
      const q = nameQuery.trim().toLowerCase();
      if (q) {
        const title = String(job.title ?? "").toLowerCase();
        if (!title.includes(q)) return false;
      }
      const { city, country } = parseCountryCity(getJobLocalisation(job));
      if (countryQuery !== "all" && country !== countryQuery) return false;
      if (cityQuery !== "all" && city !== cityQuery) return false;
      return true;
    });
  }, [allJobs, nameQuery, countryQuery, cityQuery]);

  const selectedJob = useMemo(() => {
    if (!filteredJobs.length) return null;
    if (selectedJobId != null) {
      const found = filteredJobs.find((job) => jobIdEquals(job.id, selectedJobId));
      if (found) return found;
    }
    return filteredJobs[0] ?? null;
  }, [filteredJobs, selectedJobId]);

  const jobDetailQuery = useRecruteurJob(
    selectedJob?.id ?? null,
    Boolean(selectedJob && selectedJob.id != null && !Number.isNaN(Number(selectedJob.id))),
  );

  useEffect(() => {
    if (!filteredJobs.length) {
      setSelectedJobId(null);
      return;
    }
    if (selectedJobId == null) return;
    const selectedStillExists = filteredJobs.some((job) => jobIdEquals(job.id, selectedJobId));
    if (!selectedStillExists) {
      setSelectedJobId(Number(filteredJobs[0]?.id) || null);
    }
  }, [filteredJobs, selectedJobId]);
  const isDetailInactive =
    selectedJob != null &&
    String(selectedJob.status ?? "ACTIVE").toUpperCase() === "INACTIVE";

  const detailJob = jobDetailQuery.data?.job as Record<string, unknown> | undefined;
  const selectedSkillNames = detailJob ? namesFromSkillsOrLanguages(detailJob.skills) : [];
  const selectedLanguageNames = detailJob ? namesFromSkillsOrLanguages(detailJob.languages) : [];

  const selectedJobSalaryMin = detailJob ? Number(detailJob.salary_min ?? NaN) : NaN;
  const selectedJobSalaryMax = detailJob ? Number(detailJob.salary_max ?? NaN) : NaN;
  const selectedJobSalaryLabel =
    Number.isFinite(selectedJobSalaryMin) && Number.isFinite(selectedJobSalaryMax)
      ? `${selectedJobSalaryMin} - ${selectedJobSalaryMax} MAD`
      : Number.isFinite(selectedJobSalaryMin)
        ? `${selectedJobSalaryMin} MAD`
        : Number.isFinite(selectedJobSalaryMax)
          ? `${selectedJobSalaryMax} MAD`
          : "Non précisé";

  const reasonText =
    detailJob && typeof detailJob.reason === "string" ? detailJob.reason.trim() : "";
  const missionText =
    detailJob && typeof detailJob.main_mission === "string" ? detailJob.main_mission.trim() : "";
  const tasksText =
    detailJob && typeof detailJob.tasks_other === "string" ? detailJob.tasks_other.trim() : "";

  const displayTitle = (detailJob?.title as string | undefined) ?? selectedJob?.title ?? "Offre sans titre";
  const displayCategory =
    (detailJob?.categorie_profil as string | undefined) ?? selectedJob?.categorie_profil ?? "Catégorie non précisée";

  const sectionHeaderClass = "mb-2 text-[11px] font-semibold uppercase tracking-[2px] text-[#CA1B28]";

  return (
    <div className="mb-10">
      <div className="mb-5 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="flex flex-col gap-1 md:col-span-1">
            <label
              className={`mb-1 block text-[10px] font-semibold uppercase tracking-[2px] ${isLight ? "text-black/45" : "text-white/40"}`}
            >
              Recherche par nom
            </label>
            <input
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              className={`input-premium rounded-xl border px-3 text-[12px] outline-none ${
                isLight
                  ? "border-black/10 bg-white text-black/80 hover:bg-black/5 focus:border-black/20"
                  : "border-white/[0.08] bg-black/40 text-white/80 hover:bg-white/[0.06] focus:border-white/[0.18]"
              }`}
              placeholder="Ex: Développeur"
            />
          </div>
          <div className="flex flex-col gap-1 md:col-span-1">
            <label
              className={`mb-1 block text-[10px] font-semibold uppercase tracking-[2px] ${isLight ? "text-black/45" : "text-white/40"}`}
            >
              Pays
            </label>
            <DropdownSelect
              value={countryQuery}
              onChange={(value) => {
                setCountryQuery(value);
                setCityQuery("all");
              }}
              placeholder="Tous"
              groups={[
                {
                  options: [{ value: "all", label: "Tous" }, ...countries.map((c) => ({ value: c, label: c }))],
                },
              ]}
              isLight={isLight}
            />
          </div>
          <div className="md:col-span-1">
            <div className="flex items-end gap-2">
              <div className="flex flex-1 flex-col gap-1">
                <label
                  className={`mb-1 block text-[10px] font-semibold uppercase tracking-[2px] ${isLight ? "text-black/45" : "text-white/40"}`}
                >
                  Ville
                </label>
                <DropdownSelect
                  value={cityQuery}
                  onChange={(value) => setCityQuery(value)}
                  placeholder="Toutes"
                  groups={[
                    {
                      options: [{ value: "all", label: "Toutes" }, ...cities.map((c) => ({ value: c, label: c }))],
                    },
                  ]}
                  disabled={countryQuery === "all"}
                  isLight={isLight}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setNameQuery("");
                  setCountryQuery("all");
                  setCityQuery("all");
                }}
                className={`inline-flex h-[50px] items-center justify-center whitespace-nowrap rounded-full px-4 text-[12px] font-medium transition ${
                  isLight
                    ? "border border-tap-red/20 bg-[#E6E6E6] text-tap-red hover:bg-[#E6E6E6]/85"
                    : "border border-tap-red/40 bg-tap-red text-white hover:bg-[#b71724]"
                }`}
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
      </div>

      {jobsQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : jobsQuery.isError ? (
        <ErrorState onRetry={() => jobsQuery.refetch()} />
      ) : !filteredJobs.length ? (
        <EmptyState
          icon={<Sparkles className="w-10 h-10" />}
          title="Aucune offre"
          description={
            allJobs.length > 0
              ? "Aucune offre ne correspond aux filtres."
              : "Créez une offre avec le bouton « Nouvelle offre » en haut de cette page."
          }
        />
      ) : (
        <div
          className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-start lg:gap-8"
          aria-label="Liste des offres et détail"
        >
          {/* Colonne gauche — liste des offres (style maquette) */}
          <div
            className={`flex max-h-[min(560px,72vh)] min-w-0 flex-col gap-3 overflow-y-auto pr-1 lg:max-w-[320px] ${
              isLight ? "" : "[scrollbar-color:rgba(255,255,255,0.12)_transparent]"
            }`}
          >
            {filteredJobs.map((job: Job) => {
              const loc =
                typeof job.localisation === "string" && job.localisation.trim()
                  ? job.localisation.trim()
                  : typeof job.location_type === "string" && job.location_type.trim()
                    ? job.location_type.trim()
                    : null;
              const locationLabel = loc ?? "—";
              const isSelected = selectedJob != null && jobIdEquals(selectedJob.id, job.id);

              return (
                <div
                  key={job.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedJobId(Number(job.id))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedJobId(Number(job.id));
                    }
                  }}
                  className={
                    isLight
                      ? isSelected
                        ? listCardLightSelected
                        : listCardLightDefault
                      : isSelected
                        ? listCardDarkSelected
                        : listCardDarkDefault
                  }
                >
                  {!isLight ? (
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl opacity-100 transition-opacity duration-500 group-hover:opacity-0">
                      <div className="absolute -top-16 -right-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                      <div className="absolute -bottom-12 -left-8 h-44 w-44 rounded-full bg-tap-red/10 opacity-40 blur-2xl" />
                    </div>
                  ) : (
                    <>
                      <div className="pointer-events-none absolute top-[-36px] right-[-36px] h-24 w-24 rounded-full bg-white/5 blur-2xl" />
                      <div className="pointer-events-none absolute bottom-[-32px] left-[-40px] h-24 w-24 rounded-full bg-tap-red/10 blur-2xl opacity-50" />
                    </>
                  )}
                  <div className="relative z-[1] flex flex-col gap-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3
                        className={`text-[12px] font-bold uppercase leading-tight sm:text-[13px] ${isLight ? "text-black" : "text-white"}`}
                      >
                        {job.title ?? "Offre sans titre"}
                      </h3>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`whitespace-nowrap text-[10px] sm:text-[11px] ${isLight ? "text-black/50" : "text-white/40"}`}
                      >
                        {job.created_at ? formatRelative(job.created_at) : "—"}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          shareJobOfferLink(job.id, String(job.title ?? "Offre"));
                        }}
                        className={`inline-flex size-10 items-center justify-center rounded-full border transition ${
                          isLight
                            ? "border-black/10 bg-black/[0.03] text-black/70 hover:bg-black/[0.06]"
                            : "border-white/[0.14] bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                        }`}
                        aria-label="Partager le lien de l’offre"
                        title="Partager"
                      >
                        <Share2 size={16} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                  <p className={`mt-1 text-[11px] sm:text-[12px] ${isLight ? "text-black/55" : "text-white/45"}`}>
                    {job.categorie_profil ?? "Catégorie non précisée"}
                  </p>
                  <div className="mt-4 flex items-end justify-between gap-2">
                    <p
                      className={`inline-flex min-w-0 items-center gap-1 text-[11px] sm:text-[12px] ${isLight ? "text-black/70" : "text-white/50"}`}
                    >
                      <MapPin size={12} className="shrink-0 opacity-80" />
                      <span className="truncate">{locationLabel}</span>
                    </p>
                    <span className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[11px] font-medium text-[#CA1B28]">
                      Voir le détail
                      <ArrowRight size={12} />
                    </span>
                  </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Colonne droite — détail */}
          <div className="min-w-0 flex-1">
            <div
              className={
                selectedJob
                  ? isLight
                    ? "group card-animated-border relative overflow-hidden rounded-2xl border border-tap-red/30 bg-white p-5 sm:p-6 lg:p-7 shadow-[0_18px_34px_rgba(0,0,0,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:border-tap-red/15 hover:bg-[#fafafa] hover:shadow-[0_10px_28px_rgba(0,0,0,0.06)]"
                    : `${detailCardDarkClass} p-5 sm:p-6 lg:p-7`
                  : isLight
                    ? "relative overflow-hidden rounded-2xl border border-black/10 bg-white/80 p-5 sm:p-6 lg:p-7 card-luxury-light"
                    : "relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#020001] p-5 sm:p-6 lg:p-7 shadow-[0_18px_40px_rgba(0,0,0,0.25)]"
              }
            >
              {selectedJob && !isLight ? (
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <div className="absolute -top-24 -right-28 h-72 w-72 rounded-full bg-white/5 blur-2xl" />
                  <div className="absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-tap-red/10 blur-2xl opacity-40" />
                </div>
              ) : null}

              {selectedJob ? (
                <div className="relative z-[1]">
                  <div className="flex flex-col gap-3">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 text-left">
                        <h3
                          className={`text-[22px] font-bold uppercase leading-[1.1] tracking-tight sm:text-[26px] lg:text-[30px] ${isLight ? "text-black" : "text-white"}`}
                        >
                          {jobDetailQuery.isLoading ? <Skeleton className="h-9 w-[min(100%,24rem)] max-w-full" /> : displayTitle}
                        </h3>
                        <p className={`mt-1.5 text-[13px] lg:text-[14px] ${isLight ? "text-black/60" : "text-white/45"}`}>
                          {displayCategory}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2 self-start pt-0.5">
                        <div className="flex items-center gap-2">
                        {(() => {
                          const pending = toggleJobStatus.isPending;

                          const ringActive = isLight
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                            : "border-emerald-500/35 bg-emerald-500/10 text-emerald-400";
                          const ringInactive = isLight
                            ? "border-zinc-400/45 bg-zinc-500/10 text-zinc-600"
                            : "border-white/20 bg-white/[0.06] text-white/55";
                          const shareClass = isLight
                            ? "border-black/10 bg-black/[0.03] text-black/70 hover:bg-black/[0.08]"
                            : "border-white/[0.14] bg-transparent text-zinc-200 hover:bg-white/[0.08]";
                          const trashClass = isLight
                            ? "border-red-500/25 bg-red-500/[0.06] text-red-600 hover:bg-red-500/10"
                            : "border-red-400/30 bg-red-500/10 text-red-400 hover:bg-red-500/20";

                          return (
                            <>
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() =>
                                  toggleJobStatus.mutate({
                                    jobId: selectedJob.id,
                                    nextStatus: isDetailInactive ? "ACTIVE" : "INACTIVE",
                                  })
                                }
                                className={`inline-flex size-10 items-center justify-center rounded-full border transition ${
                                  isDetailInactive ? ringInactive : ringActive
                                } ${pending ? "cursor-wait opacity-75" : ""}`}
                                title={isDetailInactive ? "Activer l’offre" : "Désactiver l’offre"}
                                aria-label={isDetailInactive ? "Activer l’offre" : "Désactiver l’offre"}
                                aria-pressed={!isDetailInactive}
                              >
                                {isDetailInactive ? (
                                  <CircleSlash2 size={16} strokeWidth={1.75} />
                                ) : (
                                  <CheckCircle2 size={16} strokeWidth={1.75} />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => shareJobOfferLink(selectedJob.id, displayTitle)}
                                className={`inline-flex size-10 items-center justify-center rounded-full border transition ${shareClass}`}
                                aria-label="Partager le lien de l’offre"
                                title="Partager"
                              >
                                <Share2 size={16} strokeWidth={1.75} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmJobId(selectedJob.id)}
                                disabled={deleteJob.isPending}
                                className={`inline-flex size-10 items-center justify-center rounded-full border transition ${trashClass} disabled:opacity-50`}
                                aria-label="Supprimer l’offre"
                                title="Supprimer l’offre"
                              >
                                <Trash2 size={16} strokeWidth={1.75} />
                              </button>
                            </>
                          );
                        })()}
                        </div>
                        <div className="flex max-w-[220px] flex-wrap justify-end gap-1.5">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                              isDetailInactive
                                ? isLight
                                  ? "border-black/15 bg-black/[0.04] text-black/60"
                                  : "border-white/15 bg-white/[0.06] text-white/55"
                                : isLight
                                  ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-700"
                                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            }`}
                          >
                            {isDetailInactive ? "Inactive" : "Active"}
                          </span>
                          {selectedJob.urgent ? (
                            <span className="rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-red-400">
                              Urgent
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  {jobDetailQuery.isLoading ? (
                    <div className="mt-6 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  ) : (
                    <>
                      {reasonText || missionText || tasksText ? (
                        <div className="mt-6">
                          <p className={sectionHeaderClass}>Description</p>
                          <div
                            className={`whitespace-pre-line text-[13px] leading-relaxed ${isLight ? "text-black/80" : "text-white/85"}`}
                          >
                            {[reasonText, missionText, tasksText].filter(Boolean).join("\n\n")}
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-6">
                        <p className={sectionHeaderClass}>Compétences demandées</p>
                        {selectedSkillNames.length ? (
                          <p className={`text-[13px] ${isLight ? "text-black/80" : "text-white/85"}`}>
                            {selectedSkillNames.join(", ")}
                          </p>
                        ) : (
                          <p className={`text-[13px] ${isLight ? "text-black/60" : "text-white/55"}`}>Non précisé</p>
                        )}
                      </div>

                      <div className="mt-6">
                        <p className={sectionHeaderClass}>Langues</p>
                        {selectedLanguageNames.length ? (
                          <p className={`text-[13px] ${isLight ? "text-black/80" : "text-white/85"}`}>
                            {selectedLanguageNames.join(", ")}
                          </p>
                        ) : (
                          <p className={`text-[13px] ${isLight ? "text-black/60" : "text-white/55"}`}>Non précisé</p>
                        )}
                      </div>

                      <div className="mt-6">
                        <p className={sectionHeaderClass}>Détails du poste</p>
                        <div
                          className={`grid grid-cols-1 gap-x-10 gap-y-2 text-[13px] sm:grid-cols-2 ${isLight ? "text-black/80" : "text-white/85"}`}
                        >
                          <div className="space-y-2">
                            <p>Contrat : {(detailJob?.contrat as string | undefined) ?? selectedJob.contrat ?? "Non précisé"}</p>
                            <p>
                              Niveau de séniorité :{" "}
                              {(detailJob?.niveau_seniorite as string | undefined) ?? selectedJob.niveau_seniorite ?? "Non précisé"}
                            </p>
                            <p>
                              Niveau attendu :{" "}
                              {(detailJob?.niveau_attendu as string | undefined) ?? selectedJob.niveau_attendu ?? "Non précisé"}
                            </p>
                            <p>
                              Expérience minimum :{" "}
                              {(detailJob?.experience_min as string | undefined) ?? selectedJob.experience_min ?? "Non précisé"}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p>
                              Présence sur site :{" "}
                              {(detailJob?.presence_sur_site as string | undefined) ?? "Non précisé"}
                            </p>
                            <p>
                              Disponibilité :{" "}
                              {(detailJob?.disponibilite as string | undefined) ?? "Non précisé"}
                            </p>
                            <p>Salaire : {selectedJobSalaryLabel}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div
                    className={`mt-8 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-end ${
                      isLight ? "border-black/10" : "border-white/[0.08]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (onEditJob) {
                          onEditJob(selectedJob.id);
                          return;
                        }
                        router.push(`/app/offres/${selectedJob.id}`);
                      }}
                      className="btn-primary w-full !px-6 !py-3 text-[12px] sm:w-auto sm:!py-2.5"
                    >
                      Modifier l'offre
                    </button>
                  </div>
                </div>
              ) : (
                <p className={`relative z-[1] text-[13px] lg:text-[14px] ${isLight ? "text-black/60" : "text-white/55"}`}>
                  Sélectionnez une offre à gauche pour afficher ses détails.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {deleteConfirmJobId != null ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Fermer"
            onClick={() => setDeleteConfirmJobId(null)}
          />
          <div
            className={`relative w-full max-w-[400px] rounded-2xl border p-6 shadow-2xl ${
              isLight ? "bg-white border-black/10" : "bg-[#0a0a0a] border-white/[0.08]"
            }`}
          >
            <p className={`text-[15px] font-semibold mb-2 ${isLight ? "text-black" : "text-white"}`}>
              Supprimer cette offre ?
            </p>
            <p className={`text-[13px] mb-6 ${isLight ? "text-black/60" : "text-white/50"}`}>
              Cette action est définitive. Les candidatures liées seront supprimées.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmJobId(null)}
                className={`h-9 px-4 rounded-lg border text-[13px] ${
                  isLight ? "border-black/15 text-black/80" : "border-white/[0.16] text-white/75"
                }`}
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={deleteJob.isPending}
                onClick={() => {
                  const id = deleteConfirmJobId;
                  if (id == null) return;
                  deleteJob.mutate(id, {
                    onSuccess: () => {
                      setDeleteConfirmJobId(null);
                      if (jobIdEquals(selectedJobId, id)) setSelectedJobId(null);
                    },
                  });
                }}
                className="h-9 px-4 rounded-lg border border-red-500/40 bg-red-500/15 text-red-300 hover:bg-red-500/25 text-[13px] disabled:opacity-50"
              >
                {deleteJob.isPending ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
