"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  useCandidatStats,
  useCandidatCvFiles,
  useCandidatMatchingJobs,
  useCandidatPublicJobs,
  useCandidatApplications,
  useCandidatSavedJobs,
  useToggleCandidatSavedJob,
} from "@/hooks/use-candidat";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Users, MapPin, Briefcase, Sparkles, SlidersHorizontal, FileText, CheckCircle2, Calendar, Eye, Bookmark, ArrowRight, Share2, Clock3 } from "lucide-react";
import { formatRelative } from "@/lib/utils";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";
import DropdownSelect from "@/components/app/DropdownSelect";

export default function MatchingPage() {
  const router = useRouter();
  const { isCandidat, isHydrated } = useAuth();
  const enabled = Boolean(isCandidat && isHydrated);
  const [viewMode, setViewMode] = useState<"all" | "match" | "recent">("match");
  const filtersOpen = true;
  const [nameQuery, setNameQuery] = useState("");
  const [countryQuery, setCountryQuery] = useState("all");
  const [cityQuery, setCityQuery] = useState("all");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const statsQuery = useCandidatStats(enabled);
  const cvFilesQuery = useCandidatCvFiles();
  const jobsQuery = useCandidatMatchingJobs(enabled);
  const publicJobsQuery = useCandidatPublicJobs(enabled);
  const applicationsQuery = useCandidatApplications();
  const savedJobsQuery = useCandidatSavedJobs(enabled);
  const toggleSavedJobMutation = useToggleCandidatSavedJob();
  const theme = useDashboardTheme();
  const isLight = theme === "light";

  const stats = statsQuery.data;
  const hasCvs = (cvFilesQuery.data?.cvFiles?.length ?? 0) > 0;
  const hasProfile = stats?.candidateId !== null && stats?.candidateId !== undefined;
  const matchingJobs = jobsQuery.data?.jobs ?? [];
  const allJobs = publicJobsQuery.data?.jobs ?? [];
  const effectiveViewMode = !hasCvs && viewMode === "match" ? "all" : viewMode;
  const sortedRecentJobs = useMemo(
    () =>
      [...allJobs].sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      }),
    [allJobs],
  );
  const usingFallbackAllJobs = effectiveViewMode === "match" && matchingJobs.length === 0 && allJobs.length > 0;
  const displayedJobs =
    effectiveViewMode === "recent"
      ? sortedRecentJobs
      : effectiveViewMode === "all"
        ? allJobs
        : matchingJobs.length > 0
          ? matchingJobs
          : allJobs;
  const appliedJobIds = new Set(
    (applicationsQuery.data?.applications ?? [])
      .map((a) => a.jobId)
      .filter((id): id is number => typeof id === "number" && Number.isFinite(id)),
  );

  const parseCountryCity = (value: string | null | undefined) => {
    const raw = String(value ?? "").trim();
    if (!raw) return { city: "", country: "" };
    const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return { city: parts[0] ?? "", country: parts[parts.length - 1] ?? "" };
    }
    return { city: raw, country: "" };
  };

  const getJobLocalisation = (job: { localisation?: string | null; location_type?: string | null }) => {
    const raw = typeof job.localisation === "string" && job.localisation.trim()
      ? job.localisation.trim()
      : typeof job.location_type === "string" && job.location_type.trim()
        ? job.location_type.trim()
        : "";
    return raw;
  };

  const countries = Array.from(
    new Set(
      displayedJobs
        .map((j) => parseCountryCity(getJobLocalisation(j as { localisation?: string | null; location_type?: string | null })).country)
        .filter((v): v is string => typeof v === "string" && v.length > 0),
    ),
  );

  const cities = Array.from(
    new Set(
      displayedJobs
        .map((j) => parseCountryCity(getJobLocalisation(j as { localisation?: string | null; location_type?: string | null })))
        .filter((loc) => (countryQuery === "all" ? true : loc.country === countryQuery))
        .map((loc) => loc.city)
        .filter((v): v is string => typeof v === "string" && v.length > 0),
    ),
  );

  const filteredJobs = displayedJobs.filter((job) => {
    const q = nameQuery.trim().toLowerCase();
    if (q) {
      const title = String(job.title ?? "").toLowerCase();
      if (!title.includes(q)) return false;
    }

    const { city, country } = parseCountryCity(
      getJobLocalisation(job as { localisation?: string | null; location_type?: string | null }),
    );
    if (countryQuery !== "all" && country !== countryQuery) return false;
    if (cityQuery !== "all" && city !== cityQuery) return false;

    return true;
  });

  useEffect(() => {
    if (!filteredJobs.length) {
      setSelectedJobId(null);
      return;
    }
    const selectedStillExists = filteredJobs.some((job) => job.id === selectedJobId);
    if (!selectedStillExists) {
      setSelectedJobId(filteredJobs[filteredJobs.length - 1]?.id ?? null);
    }
  }, [filteredJobs, selectedJobId]);

  const selectedJob =
    filteredJobs.find((job) => job.id === selectedJobId) ??
    (filteredJobs.length ? filteredJobs[filteredJobs.length - 1] : null);
  const selectedJobIsSaved = selectedJob ? (savedJobsQuery.data?.jobIds ?? []).includes(selectedJob.id) : false;
  const selectedJobSkillNames = selectedJob
    ? Array.isArray((selectedJob as { skills?: unknown }).skills)
      ? ((selectedJob as { skills?: unknown }).skills as unknown[])
          .map((item) => {
            if (typeof item === "string") return item.trim();
            if (item && typeof item === "object" && "name" in item) {
              return String((item as { name?: unknown }).name ?? "").trim();
            }
            return "";
          })
          .filter(Boolean)
      : []
    : [];
  const selectedJobLanguageNames = selectedJob
    ? Array.isArray((selectedJob as { languages?: unknown }).languages)
      ? ((selectedJob as { languages?: unknown }).languages as unknown[])
          .map((item) => {
            if (typeof item === "string") return item.trim();
            if (item && typeof item === "object" && "name" in item) {
              return String((item as { name?: unknown }).name ?? "").trim();
            }
            return "";
          })
          .filter(Boolean)
      : []
    : [];
  const selectedJobSalaryMin = selectedJob ? Number((selectedJob as { salary_min?: unknown }).salary_min ?? NaN) : NaN;
  const selectedJobSalaryMax = selectedJob ? Number((selectedJob as { salary_max?: unknown }).salary_max ?? NaN) : NaN;
  const selectedJobSalaryLabel =
    Number.isFinite(selectedJobSalaryMin) && Number.isFinite(selectedJobSalaryMax)
      ? `${selectedJobSalaryMin} - ${selectedJobSalaryMax} MAD`
      : Number.isFinite(selectedJobSalaryMin)
        ? `${selectedJobSalaryMin} MAD`
        : Number.isFinite(selectedJobSalaryMax)
          ? `${selectedJobSalaryMax} MAD`
          : "Non précisé";
  const selectedJobScorePct = selectedJob
    ? Math.max(0, Math.min(100, Math.round((Number((selectedJob as { score?: unknown }).score ?? 0) || 0) * 100)))
    : 0;
  const selectedJobScoreColor =
    selectedJobScorePct <= 50 ? "#ef4444" : selectedJobScorePct <= 75 ? "#f59e0b" : "#10b981";

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const totalStatuses =
    (stats?.statusPending ?? 0) + (stats?.statusAccepted ?? 0) + (stats?.statusRefused ?? 0);
  const acceptanceRate =
    totalStatuses > 0 ? Math.round(((stats?.statusAccepted ?? 0) / totalStatuses) * 100) : 0;
  const interviewRate =
    (stats?.applications ?? 0) > 0
      ? Math.round(((stats?.interviews ?? 0) / (stats?.applications ?? 1)) * 100)
      : 0;

  // Rediriger vers la complétion de profil si aucun candidat en BDD
  useEffect(() => {
    if (!isCandidat) return;
    if (statsQuery.isLoading || statsQuery.isError || statsQuery.isFetching)
      return;
    if (!hasProfile) {
      router.push("/app/onboarding-candidat");
    }
  }, [
    isCandidat,
    hasProfile,
    statsQuery.isLoading,
    statsQuery.isError,
    statsQuery.isFetching,
    router,
  ]);

  if (!isCandidat) {
    return (
      <EmptyState
        icon={<Users className="w-12 h-12" />}
        title="Espace candidat uniquement"
        description="Cette section est réservée aux candidats."
      />
    );
  }

  // Pendant le chargement initial, afficher un petit skeleton
  if (statsQuery.isLoading) {
    return (
      <div className="max-w-[1100px] mx-auto py-12">
        <Skeleton className="h-24 w-full mb-4" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className={`relative mb-8 pb-8 ${isLight ? "border-b border-black/10" : "border-b border-white/[0.04]"}`}>
        <div className="absolute top-[-80px] left-[-100px] w-[350px] h-[350px] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.08),transparent_60%)] blur-3xl pointer-events-none" />
        <div className="relative">
          <h1 className={`text-[28px] sm:text-[36px] font-bold tracking-[-0.04em] font-heading ${isLight ? "text-black" : "text-white"}`}>
            Offres intéressantes pour vous
          </h1>
          <p className={`text-[14px] mt-2 font-light ${isLight ? "text-black/60" : "text-white/45"}`}>
            Notre IA analyse votre profil et vous connecte aux offres les plus pertinentes.
          </p>
        </div>
      </div>

      <>
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            {[
              {
                key: "applications",
                label: "Candidatures",
                value: stats?.applications ?? 0,
                meta: `${stats?.statusPending ?? 0} en attente`,
                icon: FileText,
                iconClass: "text-red-500",
                badgeClass: "bg-red-500/10 border-red-500/20",
              },
              {
                key: "accepted",
                label: "Acceptées",
                value: stats?.statusAccepted ?? 0,
                meta: `${acceptanceRate}% taux acceptation`,
                icon: CheckCircle2,
                iconClass: "text-emerald-500",
                badgeClass: "bg-emerald-500/10 border-emerald-500/20",
              },
              {
                key: "interviews",
                label: "Entretiens",
                value: stats?.interviews ?? 0,
                meta: `${interviewRate}% de conversion`,
                icon: Calendar,
                iconClass: "text-blue-500",
                badgeClass: "bg-blue-500/10 border-blue-500/20",
              },
            ].map((card, idx) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.key}
                  className="group relative card-animated-border rounded-2xl overflow-hidden p-5 bg-[#0A0A0A] border border-white/[0.06] hover:border-tap-red/15 transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)] cursor-default transform-gpu will-change-transform hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_18px_60px_rgba(0,0,0,0.55),0_0_40px_rgba(202,27,40,0.10)]"
                  style={{
                    opacity: isMounted ? 1 : 0,
                    transform: isMounted ? "translateY(0px)" : "translateY(8px)",
                    transitionDelay: isMounted ? `${40 * idx}ms` : "0ms",
                  }}
                >
                  <div className={`absolute top-0 left-0 right-0 h-[120px] bg-gradient-to-b ${card.gradient ?? "from-tap-red/14 via-tap-red/4 to-transparent"} pointer-events-none`} />
                  {/* Hover premium (comme accueil) */}
                  <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_0%,rgba(202,27,40,0.28),transparent_55%)] blur-[2px] mix-blend-screen" />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(202,27,40,0.10),transparent_55%)]" />
                  </div>

                  <div className="flex items-start justify-between gap-3 relative">
                    <div>
                      <p className="text-[13px] uppercase tracking-[1.5px] text-white/85">
                        {card.label}
                      </p>
                      <p className="mt-2 text-[30px] font-bold tracking-[-0.03em] text-white">
                        {card.value}
                      </p>
                      <p className="mt-1 text-[12px] text-white/70">{card.meta}</p>
                    </div>

                    <div
                      className="w-11 h-11 rounded-xl border flex items-center justify-center bg-tap-red/[0.08] border-tap-red/20"
                    >
                      <Icon size={18} className="text-tap-red" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Offres matchées par IA */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 rounded-full bg-emerald-500" />
              <h2 className={`text-[13px] uppercase tracking-[2px] font-semibold ${isLight ? "text-black" : "text-white/50"}`}>
                {effectiveViewMode === "all"
                  ? "Toutes les offres"
                  : effectiveViewMode === "recent"
                    ? "Offres récentes"
                    : "Offres recommandées par l'IA"}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {displayedJobs.length ? (
                <span className="text-[11px] text-emerald-500/70 font-medium">
                  {effectiveViewMode !== "match"
                    ? `${displayedJobs.length} offre${displayedJobs.length > 1 ? "s" : ""}`
                    : usingFallbackAllJobs
                      ? `${displayedJobs.length} offre${displayedJobs.length > 1 ? "s" : ""} (fallback)`
                      : `${displayedJobs.length} offre${displayedJobs.length > 1 ? "s" : ""} matchée${displayedJobs.length > 1 ? "s" : ""}`}
                </span>
              ) : null}
            </div>
          </div>

          {filtersOpen && (
            <div className="mb-5 p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1 md:col-span-1">
                  <label className="block text-[10px] font-semibold uppercase tracking-[2px] text-white/40 mb-1">
                    Recherche par nom
                  </label>
                  <input
                    value={nameQuery}
                    onChange={(e) => setNameQuery(e.target.value)}
                    className={`input-premium rounded-xl border px-3 text-[12px] outline-none ${
                      isLight
                        ? "bg-white border-black/10 hover:bg-black/5 text-black/80 focus:border-black/20"
                        : "bg-black/20 border-white/[0.08] hover:bg-white/[0.06] text-white/80 focus:border-white/[0.18]"
                    }`}
                    placeholder="Ex: Développeur"
                  />
                </div>

                <div className="flex flex-col gap-1 md:col-span-1">
                  <label className="block text-[10px] font-semibold uppercase tracking-[2px] text-white/40 mb-1">
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
                        options: [
                          { value: "all", label: "Tous" },
                          ...countries.map((c) => ({ value: c, label: c })),
                        ],
                      },
                    ]}
                    isLight={isLight}
                  />
                </div>

                <div className="md:col-span-1">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="block text-[10px] font-semibold uppercase tracking-[2px] text-white/40 mb-1">
                        Ville
                      </label>
                      <DropdownSelect
                        value={cityQuery}
                        onChange={(value) => setCityQuery(value)}
                        placeholder="Toutes"
                        groups={[
                          {
                            options: [
                              { value: "all", label: "Toutes" },
                              ...cities.map((c) => ({ value: c, label: c })),
                            ],
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
                      className={`h-[50px] px-4 rounded-full inline-flex items-center justify-center text-[12px] font-medium transition whitespace-nowrap ${
                        isLight
                          ? "bg-[#E6E6E6] text-tap-red border border-tap-red/20 hover:bg-[#E6E6E6]/85"
                          : "bg-tap-red text-white border border-tap-red/40 hover:bg-[#b71724]"
                      }`}
                    >
                      Réinitialiser
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-end gap-3">
                <div
                  className={`rounded-2xl border p-1.5 ${
                    isLight ? "border-black/15 bg-black/[0.02]" : "border-white/[0.12] bg-white/[0.02]"
                  }`}
                >
                  <p className={`px-2 py-1 text-[10px] uppercase tracking-[1.5px] ${isLight ? "text-black/45" : "text-white/45"}`}>
                    Mode d&apos;affichage
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setViewMode("all")}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] transition ${
                        effectiveViewMode === "all"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : isLight
                            ? "text-black/60 hover:bg-black/5"
                            : "text-white/55 hover:bg-white/[0.05]"
                      }`}
                      title="Afficher toutes les offres"
                    >
                      <Briefcase size={12} />
                      Toutes
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("match")}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] transition ${
                        effectiveViewMode === "match"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : isLight
                            ? "text-black/60 hover:bg-black/5"
                            : "text-white/55 hover:bg-white/[0.05]"
                      }`}
                      title="Afficher les offres matchées par IA"
                    >
                      <Sparkles size={12} />
                      Match IA
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("recent")}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] transition ${
                        effectiveViewMode === "recent"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : isLight
                            ? "text-black/60 hover:bg-black/5"
                            : "text-white/55 hover:bg-white/[0.05]"
                      }`}
                      title="Afficher les offres les plus récentes"
                    >
                      <Clock3 size={12} />
                      Récentes
                    </button>
                  </div>
                </div>
                {displayedJobs.length ? (
                  <span className="text-[11px] text-emerald-500/70 font-medium">
                    {effectiveViewMode !== "match"
                      ? `${displayedJobs.length} offre${displayedJobs.length > 1 ? "s" : ""}`
                      : usingFallbackAllJobs
                        ? `${displayedJobs.length} offre${displayedJobs.length > 1 ? "s" : ""} (fallback)`
                        : `${displayedJobs.length} offre${displayedJobs.length > 1 ? "s" : ""} matchée${displayedJobs.length > 1 ? "s" : ""}`}
                  </span>
                ) : null}
              </div>
            </div>
          )}

          {(effectiveViewMode !== "match"
            ? publicJobsQuery.isLoading
            : jobsQuery.isLoading || (matchingJobs.length === 0 && publicJobsQuery.isLoading)) ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (effectiveViewMode !== "match"
            ? publicJobsQuery.isError
            : jobsQuery.isError && publicJobsQuery.isError) ? (
            <ErrorState
              onRetry={() => {
                if (effectiveViewMode !== "match") {
                  publicJobsQuery.refetch();
                  return;
                }
                jobsQuery.refetch();
                publicJobsQuery.refetch();
              }}
              message={String(
                ((effectiveViewMode !== "match" ? publicJobsQuery.error : jobsQuery.error) as any)?.response?.data?.message ??
                  ((effectiveViewMode !== "match" ? publicJobsQuery.error : jobsQuery.error) as any)?.message ??
                  "Une erreur est survenue",
              )}
            />
          ) : !filteredJobs.length ? (
            <EmptyState
              icon={<Sparkles className="w-10 h-10" />}
              title={effectiveViewMode === "match" ? "Aucune offre matchée pour l'instant" : "Aucune offre pour l'instant"}
              description={
                displayedJobs.length > 0
                  ? "Aucune offre ne correspond aux filtres sélectionnés."
                  : effectiveViewMode !== "match"
                    ? "Aucune offre n'est disponible pour le moment."
                    : "L'IA n'a pas encore trouvé d'offres suffisamment proches de votre profil. Revenez bientôt."
              }
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
              <div className="lg:col-span-4 space-y-3">
                {filteredJobs.map((job) => {
                const alreadyApplied = appliedJobIds.has(job.id);
                const isSaved = (savedJobsQuery.data?.jobIds ?? []).includes(job.id);
                const locationType =
                  typeof job.location_type === "string" && job.location_type.trim()
                    ? job.location_type.trim()
                    : null;
                const localisation =
                  typeof (job as { localisation?: string | null }).localisation === "string" &&
                  (job as { localisation?: string | null }).localisation?.trim()
                    ? (job as { localisation?: string | null }).localisation!.trim()
                    : null;
                const locationLabel =
                  locationType && localisation
                    ? `${locationType} - ${localisation}`
                    : locationType ?? localisation;
                const isSelected = selectedJob?.id === job.id;

                return (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJobId(job.id)}
                    className={`group relative card-animated-border rounded-2xl overflow-hidden p-5 border cursor-pointer transform-gpu will-change-transform transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)] hover:-translate-y-1 hover:scale-[1.02] ${
                      isSelected
                        ? isLight
                          ? "bg-[#0A0A0A] border-tap-red/35 shadow-[0_18px_60px_rgba(0,0,0,0.55),0_0_30px_rgba(202,27,40,0.14)]"
                          : "bg-[#0A0A0A] border-tap-red/30 shadow-[0_18px_60px_rgba(0,0,0,0.55),0_0_30px_rgba(202,27,40,0.14)]"
                        : isLight
                          ? "bg-[#0A0A0A] border-white/[0.08] hover:border-tap-red/20 hover:shadow-[0_18px_60px_rgba(0,0,0,0.55),0_0_24px_rgba(202,27,40,0.10)]"
                          : "bg-[#0A0A0A] border-white/[0.06] hover:border-tap-red/15 hover:shadow-[0_18px_60px_rgba(0,0,0,0.55),0_0_24px_rgba(202,27,40,0.10)]"
                    }`}
                  >
                    <div className="absolute top-0 left-0 right-0 h-[110px] bg-gradient-to-b from-tap-red/14 via-tap-red/4 to-transparent pointer-events-none" />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(202,27,40,0.20),transparent_55%)]" />
                    </div>
                    <div className="flex items-stretch justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className={`text-[20px] font-semibold truncate uppercase ${isLight ? "text-black" : "text-white"}`}>
                          {job.title ?? "Offre sans titre"}
                        </h3>
                        <p className={`text-[12px] mt-1 ${isLight ? "text-black/65" : "text-white/50"}`}>
                          {job.categorie_profil ?? "Catégorie non précisée"}
                        </p>
                        <p className={`text-[12px] mt-1 inline-flex items-center gap-1 ${isLight ? "text-black/70" : "text-white/55"}`}>
                          <MapPin size={12} />
                          {locationLabel ?? "Localisation non précisée"}
                        </p>
                      </div>
                      <div className="flex flex-col justify-between items-end shrink-0 min-h-[84px]">
                        <div className="inline-flex items-center gap-2">
                          <span className={`text-[11px] ${isLight ? "text-black/50" : "text-white/35"}`}>
                            {job.created_at ? formatRelative(job.created_at) : "—"}
                          </span>
                          <button
                            type="button"
                            disabled={toggleSavedJobMutation.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (toggleSavedJobMutation.isPending) return;
                              toggleSavedJobMutation.mutate(job.id);
                            }}
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-full border transition ${
                              isSaved
                                ? "border-emerald-500/35 bg-emerald-500/12 text-emerald-300 hover:bg-emerald-500/20"
                                : isLight
                                  ? "border-black/10 hover:bg-black/5 text-black/60 hover:text-black"
                                  : "border-white/[0.14] hover:bg-zinc-800 text-zinc-300 hover:text-white"
                            } ${toggleSavedJobMutation.isPending ? "opacity-60 cursor-not-allowed" : ""}`}
                            aria-label={isSaved ? "Offre enregistrée" : "Enregistrer l’offre"}
                            title={isSaved ? "Offre enregistrée" : "Enregistrer l’offre"}
                          >
                            <Bookmark size={13} fill={isSaved ? "currentColor" : "none"} />
                          </button>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium underline underline-offset-2 text-[#CA1B28]">
                          Voir le détail
                          <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>

              <div
                className={`lg:col-span-6 relative rounded-2xl p-5 sm:p-6 h-fit ${
                  isLight
                    ? "card-luxury-light"
                    : "bg-zinc-900/50 border border-white/[0.08]"
                }`}
              >
                {selectedJob ? (
                  <>
                    <div className="absolute top-[-18px] right-[-18px] z-10">
                      <div
                        className="w-16 h-16 rounded-full p-[2px] shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
                        style={{
                          background: `conic-gradient(${selectedJobScoreColor} ${selectedJobScorePct}%, rgba(255,255,255,0.14) ${selectedJobScorePct}% 100%)`,
                        }}
                      >
                        <div className="w-full h-full rounded-full bg-zinc-900/50 backdrop-blur-md flex items-center justify-center">
                          <span className="text-[13px] font-bold text-white">{selectedJobScorePct}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className={`text-[26px] font-semibold leading-tight uppercase ${isLight ? "text-black" : "text-white"}`}>
                          {selectedJob.title ?? "Offre sans titre"}
                        </h3>
                        <p className={`mt-1 text-[13px] ${isLight ? "text-black/60" : "text-white/55"}`}>
                          {selectedJob.categorie_profil ?? "Catégorie non précisée"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="flex items-center gap-2">
                          {selectedJob.urgent ? (
                            <span className="text-[11px] px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 shrink-0">
                              Urgent
                            </span>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => {
                              const detailsUrl =
                                typeof window !== "undefined"
                                  ? `${window.location.origin}/app/matching/offres/${selectedJob.id}`
                                  : `/app/matching/offres/${selectedJob.id}`;
                              if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
                                void navigator.share({
                                  title: selectedJob.title ?? "Offre",
                                  url: detailsUrl,
                                });
                                return;
                              }
                              if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
                                void navigator.clipboard.writeText(detailsUrl);
                              }
                            }}
                            className={`inline-flex items-center justify-center w-9 h-9 rounded-full border transition ${
                              isLight
                                ? "border-black/10 hover:bg-black/5 text-black/60 hover:text-black"
                                : "border-white/[0.14] hover:bg-zinc-800 text-zinc-300 hover:text-white"
                            }`}
                            aria-label="Partager l’offre"
                            title="Partager"
                          >
                            <Share2 size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={toggleSavedJobMutation.isPending}
                            onClick={() => {
                              if (toggleSavedJobMutation.isPending) return;
                              toggleSavedJobMutation.mutate(selectedJob.id);
                            }}
                            className={`inline-flex items-center justify-center w-9 h-9 rounded-full border transition ${
                              selectedJobIsSaved
                                ? "border-emerald-500/35 bg-emerald-500/12 text-emerald-300 hover:bg-emerald-500/20"
                                : isLight
                                  ? "border-black/10 hover:bg-black/5 text-black/60 hover:text-black"
                                  : "border-white/[0.14] hover:bg-zinc-800 text-zinc-300 hover:text-white"
                            } ${toggleSavedJobMutation.isPending ? "opacity-60 cursor-not-allowed" : ""}`}
                            aria-label={selectedJobIsSaved ? "Offre enregistrée" : "Enregistrer l’offre"}
                            title={selectedJobIsSaved ? "Offre enregistrée" : "Enregistrer l’offre"}
                          >
                            <Bookmark size={14} fill={selectedJobIsSaved ? "currentColor" : "none"} />
                          </button>
                        </div>
                        <button
                          type="button"
                          disabled={appliedJobIds.has(selectedJob.id)}
                          onClick={() => router.push(`/app/matching/offres/${selectedJob.id}`)}
                          className="btn-primary !py-1.5 !px-3 text-[12px] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {appliedJobIds.has(selectedJob.id) ? "Déjà postulé" : "Postuler"}
                        </button>
                      </div>
                    </div>

                    {(typeof selectedJob.reason === "string" && selectedJob.reason.trim()) ||
                    (typeof selectedJob.main_mission === "string" && selectedJob.main_mission.trim()) ||
                    (typeof selectedJob.tasks_other === "string" && selectedJob.tasks_other.trim()) ? (
                      <div className="mt-5">
                        <p className="text-[11px] uppercase tracking-[1.5px] mb-1.5 text-[#CA1B28]">
                          Description
                        </p>
                        <div className={`text-[13px] leading-relaxed whitespace-pre-line ${isLight ? "text-black/80" : "text-white/80"}`}>
                          {[
                            typeof selectedJob.reason === "string" ? selectedJob.reason.trim() : "",
                            typeof selectedJob.main_mission === "string" ? selectedJob.main_mission.trim() : "",
                            typeof selectedJob.tasks_other === "string" ? selectedJob.tasks_other.trim() : "",
                          ]
                            .filter(Boolean)
                            .join("\n\n")}
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-5">
                      <p className="text-[11px] uppercase tracking-[1.5px] mb-2 text-[#CA1B28]">
                        Compétences demandées
                      </p>
                      {selectedJobSkillNames.length ? (
                        <p className={`text-[13px] ${isLight ? "text-black/80" : "text-white/80"}`}>
                          {selectedJobSkillNames.join(", ")}
                        </p>
                      ) : (
                        <p className={`text-[13px] ${isLight ? "text-black/60" : "text-white/60"}`}>Non précisé</p>
                      )}
                    </div>

                    <div className="mt-5">
                      <p className="text-[11px] uppercase tracking-[1.5px] mb-2 text-[#CA1B28]">
                        Langues
                      </p>
                      {selectedJobLanguageNames.length ? (
                        <p className={`text-[13px] ${isLight ? "text-black/80" : "text-white/80"}`}>
                          {selectedJobLanguageNames.join(", ")}
                        </p>
                      ) : (
                        <p className={`text-[13px] ${isLight ? "text-black/60" : "text-white/60"}`}>Non précisé</p>
                      )}
                    </div>

                    <div className="mt-5">
                      <p className="text-[11px] uppercase tracking-[1.5px] mb-2 text-[#CA1B28]">
                        Détails du poste
                      </p>
                      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[13px] ${isLight ? "text-black/80" : "text-white/80"}`}>
                        <div className="space-y-1.5">
                          <p>Contrat : {selectedJob.contrat ?? "Non précisé"}</p>
                          <p>Niveau de séniorité : {selectedJob.niveau_seniorite ?? "Non précisé"}</p>
                          <p>Niveau attendu : {selectedJob.niveau_attendu ?? "Non précisé"}</p>
                          <p>Expérience minimum : {selectedJob.experience_min ?? "Non précisé"}</p>
                        </div>
                        <div className="space-y-1.5">
                          <p>Présence sur site : {selectedJob.presence_sur_site ?? "Non précisé"}</p>
                          <p>Disponibilité : {selectedJob.disponibilite ?? "Non précisé"}</p>
                          <p>Salaire : {selectedJobSalaryLabel}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={appliedJobIds.has(selectedJob.id)}
                        onClick={() => router.push(`/app/matching/offres/${selectedJob.id}`)}
                        className="btn-primary !py-2 !px-4 text-[12px] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {appliedJobIds.has(selectedJob.id) ? "Déjà postulé" : "Postuler"}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className={`text-[13px] ${isLight ? "text-black/60" : "text-white/55"}`}>
                    Sélectionnez une offre à gauche pour afficher ses détails.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </>
    </div>
  );
}
