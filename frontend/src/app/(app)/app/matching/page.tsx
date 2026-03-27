"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { Users, MapPin, Sparkles, FileText, CheckCircle2, Calendar, Bookmark, ArrowRight, Share2, ChevronLeft, ChevronRight } from "lucide-react";
import { formatRelative } from "@/lib/utils";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";
import DropdownSelect from "@/components/app/DropdownSelect";

export default function MatchingPage() {
  const router = useRouter();
  const { isCandidat, isHydrated } = useAuth();
  const enabled = Boolean(isCandidat && isHydrated);
  const [viewMode, setViewMode] = useState<"all" | "match">("match");
  const filtersOpen = true;
  const [nameQuery, setNameQuery] = useState("");
  const [countryQuery, setCountryQuery] = useState("all");
  const [cityQuery, setCityQuery] = useState("all");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  /** Hors lg : pagination fixe. Sur lg : calculée pour épouser la hauteur de la carte détail. */
  const FALLBACK_LIST_PAGE_SIZE = 9;
  const LIST_GAP_PX = 12;
  const LEFT_CARD_FALLBACK_PX = 118;
  const MAX_LIST_PAGE_SIZE = 28;
  const [listPage, setListPage] = useState(1);
  const detailCardRef = useRef<HTMLDivElement>(null);
  const leftListFooterRef = useRef<HTMLDivElement>(null);
  const firstLeftCardRef = useRef<HTMLDivElement>(null);
  const [matchLg, setMatchLg] = useState(false);
  const [detailHeightPx, setDetailHeightPx] = useState(0);
  const [leftFooterHeightPx, setLeftFooterHeightPx] = useState(0);
  const [leftCardHeightPx, setLeftCardHeightPx] = useState(0);
  const statsQuery = useCandidatStats(enabled);
  const cvFilesQuery = useCandidatCvFiles();
  const jobsQuery = useCandidatMatchingJobs(enabled);
  const publicJobsQuery = useCandidatPublicJobs(enabled);
  const applicationsQuery = useCandidatApplications();
  const savedJobsQuery = useCandidatSavedJobs(enabled);
  const toggleSavedJobMutation = useToggleCandidatSavedJob();
  const theme = useDashboardTheme();
  const isLight = theme === "light";
  /** Même logique que CandidatDashboard (fond plat au repos, dégradé au survol, halos inversés). */
  const matchingThemedCardClass =
    "group card-animated-border relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#020001] shadow-[0_10px_28px_rgba(0,0,0,0.45)] hover:bg-[linear-gradient(180deg,rgba(202,27,40,0.08)_0%,rgba(10,10,10,0.96)_30%,rgba(10,10,10,0.96)_100%)] hover:border-tap-red/15 transition-all duration-500";
  /** Carte détail : inverse de la liste (dégradé au repos → plat au survol ; halos cachés au repos → visibles au survol). */
  const matchingDetailCardInvertedDarkClass =
    "group relative card-animated-border border border-tap-red/15 bg-[linear-gradient(180deg,rgba(202,27,40,0.08)_0%,rgba(10,10,10,0.96)_30%,rgba(10,10,10,0.96)_100%)] shadow-[0_12px_40px_rgba(0,0,0,0.45),0_0_18px_rgba(202,27,40,0.10)] hover:bg-[#020001] hover:border-white/[0.08] hover:shadow-[0_10px_28px_rgba(0,0,0,0.45)] transition-all duration-500";

  const stats = statsQuery.data;
  const hasCvs = (cvFilesQuery.data?.cvFiles?.length ?? 0) > 0;
  const hasProfile = stats?.candidateId !== null && stats?.candidateId !== undefined;
  const matchingJobs = jobsQuery.data?.jobs ?? [];
  const allJobs = publicJobsQuery.data?.jobs ?? [];
  const effectiveViewMode = !hasCvs && viewMode === "match" ? "all" : viewMode;
  /** Match IA : offres du matching ; si l’IA ne renvoie rien mais des offres publiques existent → fallback (toutes les offres). */
  const usingFallbackAllJobs =
    effectiveViewMode === "match" && matchingJobs.length === 0 && allJobs.length > 0;
  const jobsSectionLoading =
    effectiveViewMode !== "match"
      ? publicJobsQuery.isLoading
      : jobsQuery.isLoading || (matchingJobs.length === 0 && publicJobsQuery.isLoading);
  const jobsSectionError =
    effectiveViewMode !== "match"
      ? publicJobsQuery.isError
      : jobsQuery.isError && publicJobsQuery.isError;
  const displayedJobs =
    effectiveViewMode === "all"
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

  /** Même condition que le rendu de la grille liste + détail (refs mesurables). */
  const offersGridMounted =
    !statsQuery.isLoading &&
    !jobsSectionLoading &&
    !jobsSectionError &&
    filteredJobs.length > 0;

  const effectivePageSize = useMemo(() => {
    if (!matchLg) return FALLBACK_LIST_PAGE_SIZE;
    const footer = leftFooterHeightPx > 0 ? leftFooterHeightPx : 92;
    const cardH = Math.max(leftCardHeightPx || LEFT_CARD_FALLBACK_PX, 72);
    const detailH = detailHeightPx;
    if (detailH < 64) return FALLBACK_LIST_PAGE_SIZE;
    const avail = Math.max(0, detailH - footer);
    const n = Math.floor((avail + LIST_GAP_PX) / (cardH + LIST_GAP_PX));
    return Math.max(1, Math.min(MAX_LIST_PAGE_SIZE, n));
  }, [matchLg, detailHeightPx, leftFooterHeightPx, leftCardHeightPx]);

  const totalListPages = Math.max(1, Math.ceil(filteredJobs.length / effectivePageSize));
  const paginatedJobs = useMemo(() => {
    const start = (listPage - 1) * effectivePageSize;
    return filteredJobs.slice(start, start + effectivePageSize);
  }, [filteredJobs, listPage, effectivePageSize]);
  const firstListJobId = paginatedJobs[0]?.id;

  useEffect(() => {
    setListPage(1);
  }, [nameQuery, countryQuery, cityQuery, effectiveViewMode]);

  useEffect(() => {
    setListPage((p) => Math.min(p, totalListPages));
  }, [totalListPages, filteredJobs.length]);

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

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setMatchLg(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useLayoutEffect(() => {
    const el = detailCardRef.current;
    if (!el) {
      if (offersGridMounted) {
        setDetailHeightPx(0);
      }
      return;
    }
    const ro = new ResizeObserver(() => {
      setDetailHeightPx(el.getBoundingClientRect().height);
    });
    ro.observe(el);
    setDetailHeightPx(el.getBoundingClientRect().height);
    return () => ro.disconnect();
  }, [selectedJob?.id, isMounted, offersGridMounted]);

  useLayoutEffect(() => {
    const el = leftListFooterRef.current;
    if (!el) {
      return;
    }
    const ro = new ResizeObserver(() => {
      setLeftFooterHeightPx(el.getBoundingClientRect().height);
    });
    ro.observe(el);
    setLeftFooterHeightPx(el.getBoundingClientRect().height);
    return () => ro.disconnect();
  }, [filteredJobs.length, listPage, effectivePageSize, isMounted, offersGridMounted]);

  useLayoutEffect(() => {
    const el = firstLeftCardRef.current;
    if (!el) {
      setLeftCardHeightPx(0);
      return;
    }
    const ro = new ResizeObserver(() => {
      setLeftCardHeightPx(el.getBoundingClientRect().height);
    });
    ro.observe(el);
    setLeftCardHeightPx(el.getBoundingClientRect().height);
    return () => ro.disconnect();
  }, [firstListJobId, isMounted, offersGridMounted, effectivePageSize]);

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
    <div className="max-w-[1320px] mx-auto">
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
                  className={`${matchingThemedCardClass} p-5 ${
                    isLight ? "card-luxury-light" : ""
                  } cursor-default transform-gpu will-change-transform transition-all duration-300 hover:-translate-y-0.5 ${
                    isLight
                      ? "hover:shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
                      : "hover:brightness-105 shadow-[0_18px_40px_rgba(0,0,0,0.25)]"
                  }`}
                  style={{
                    opacity: isMounted ? 1 : 0,
                    transform: isMounted ? "translateY(0px)" : "translateY(8px)",
                    transitionDelay: isMounted ? `${40 * idx}ms` : "0ms",
                  }}
                >
                  {!isLight && (
                    <div className="pointer-events-none absolute inset-0 opacity-100 group-hover:opacity-0 transition-opacity duration-500">
                      <div className="absolute -top-20 -right-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
                      <div className="absolute -bottom-24 -left-20 w-56 h-56 rounded-full bg-tap-red/10 blur-2xl opacity-40" />
                    </div>
                  )}
                  {isLight && (
                    <>
                      <div className="absolute top-[-45px] right-[-45px] w-28 h-28 rounded-full bg-white/5 blur-2xl pointer-events-none" />
                      <div className="absolute bottom-[-40px] left-[-50px] w-28 h-28 rounded-full bg-tap-red/10 blur-2xl pointer-events-none" />
                    </>
                  )}
                  <div className="flex items-start justify-between gap-3 relative">
                    <div>
                      <p
                        className={`text-[13px] uppercase tracking-[1.5px] ${
                          isLight ? "text-black/55" : "text-white/85"
                        }`}
                      >
                        {card.label}
                      </p>
                      <p
                        className={`mt-2 text-[30px] font-bold tracking-[-0.03em] ${
                          isLight ? "text-black" : "text-white"
                        }`}
                      >
                        {card.value}
                      </p>
                      <p className={`mt-1 text-[12px] ${isLight ? "text-black/60" : "text-white/70"}`}>{card.meta}</p>
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

        {/* Offres matchées par IA */}
        <div className="mb-10">
          <div className="mb-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 min-w-0">
                <div className="w-1 h-5 rounded-full shrink-0 bg-tap-red" />
                <h2 className={`text-[13px] uppercase tracking-[2px] font-semibold ${isLight ? "text-black" : "text-white/50"}`}>
                  {effectiveViewMode === "all"
                    ? "Toutes les offres"
                    : usingFallbackAllJobs
                      ? "Toutes les offres"
                      : "Offres matchées par l'IA"}
                </h2>
                {usingFallbackAllJobs ? (
                  <span
                    className={`text-[10px] uppercase tracking-[1.2px] px-2 py-0.5 rounded-full border shrink-0 ${
                      isLight
                        ? "border-tap-red/30 bg-tap-red/10 text-tap-red"
                        : "border-tap-red/35 bg-tap-red/15 text-[#f87171]"
                    }`}
                  >
                    Mode fallback
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {displayedJobs.length ? (
                  <span className="text-[11px] text-emerald-500/70 font-medium">
                    {effectiveViewMode !== "match"
                      ? `${displayedJobs.length} offre${displayedJobs.length > 1 ? "s" : ""}`
                      : usingFallbackAllJobs
                        ? `${displayedJobs.length} offre${displayedJobs.length > 1 ? "s" : ""}`
                        : `${displayedJobs.length} offre${displayedJobs.length > 1 ? "s" : ""} matchée${displayedJobs.length > 1 ? "s" : ""}`}
                  </span>
                ) : null}
              </div>
            </div>
            {effectiveViewMode === "match" && usingFallbackAllJobs ? (
              <p className={`mt-2 text-[12px] leading-snug max-w-2xl ${isLight ? "text-black/55" : "text-white/45"}`}>
                Aucune offre ne correspond encore à votre profil via l’IA : affichage de toutes les offres disponibles.
              </p>
            ) : null}
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
            </div>
          )}

          {/* Mode d’affichage : aligné sur la colonne gauche des cartes (lg), style segmented arrondi */}
          <div className="mb-4 lg:grid lg:grid-cols-12 lg:gap-8">
            <div className="w-full min-w-0 lg:col-span-4">
              <p
                className={`mb-2 text-[10px] uppercase tracking-[1.5px] font-semibold ${
                  isLight ? "text-black/45" : "text-white/40"
                }`}
              >
                Mode d&apos;affichage
              </p>
              <div
                className={`flex w-full items-center gap-1 rounded-full border p-1 ${
                  isLight
                    ? "border-black/12 bg-black/[0.03]"
                    : "border-white/[0.12] bg-[#0C0C0C]/90 backdrop-blur-sm"
                }`}
                role="group"
                aria-label="Mode d'affichage des offres"
              >
                <button
                  type="button"
                  onClick={() => setViewMode("all")}
                  className={`min-w-0 flex-1 rounded-full px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                    viewMode === "all"
                      ? isLight
                        ? "bg-[#CA1B28] text-white shadow-[0_4px_14px_rgba(202,27,40,0.4)]"
                        : "bg-[#CA1B28] text-white shadow-[0_4px_18px_rgba(202,27,40,0.45)] ring-1 ring-white/15"
                      : isLight
                        ? "text-black/60 hover:bg-black/[0.06]"
                        : "text-white/55 hover:bg-white/[0.07]"
                  }`}
                  title="Afficher toutes les offres"
                >
                  Toutes
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("match")}
                  className={`min-w-0 flex-1 rounded-full px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                    viewMode === "match"
                      ? isLight
                        ? "bg-[#CA1B28] text-white shadow-[0_4px_14px_rgba(202,27,40,0.4)]"
                        : "bg-[#CA1B28] text-white shadow-[0_4px_18px_rgba(202,27,40,0.45)] ring-1 ring-white/15"
                      : isLight
                        ? "text-black/60 hover:bg-black/[0.06]"
                        : "text-white/55 hover:bg-white/[0.07]"
                  }`}
                  title="Afficher les offres matchées par IA"
                >
                  Match IA
                </button>
              </div>
            </div>
          </div>

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
            <div
              className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 lg:items-stretch"
              aria-label="Liste des offres et détail"
            >
              {/* Gauche : nombre de cartes calé sur la hauteur de la carte détail (lg) ; scroll = page principale */}
              <div className="flex w-full min-w-0 flex-col lg:col-span-4 lg:h-full lg:min-h-0">
                <div className="flex w-full flex-col gap-3 lg:flex-1 lg:min-h-0">
                {paginatedJobs.map((job, index) => {
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
                    ref={index === 0 ? firstLeftCardRef : undefined}
                    onClick={() => setSelectedJobId(job.id)}
                    className={`group relative card-animated-border rounded-2xl overflow-hidden border p-4 sm:p-5 lg:p-6 cursor-pointer transform-gpu will-change-transform transition-all duration-300 hover:-translate-y-0.5 w-full ${
                      isSelected
                        ? isLight
                          ? "bg-[#020001] border-tap-red/35 shadow-[0_12px_40px_rgba(0,0,0,0.45),0_0_24px_rgba(202,27,40,0.14)]"
                          : "bg-[#020001] border-tap-red/30 shadow-[0_12px_40px_rgba(0,0,0,0.45),0_0_24px_rgba(202,27,40,0.14)]"
                        : isLight
                          ? "bg-[#020001] border-white/[0.08] hover:border-tap-red/20 hover:shadow-[0_12px_40px_rgba(0,0,0,0.45),0_0_18px_rgba(202,27,40,0.10)]"
                          : "bg-[#020001] border-white/[0.08] shadow-[0_10px_28px_rgba(0,0,0,0.45)] hover:bg-[linear-gradient(180deg,rgba(202,27,40,0.08)_0%,rgba(10,10,10,0.96)_30%,rgba(10,10,10,0.96)_100%)] hover:border-tap-red/15 hover:shadow-[0_12px_40px_rgba(0,0,0,0.45),0_0_18px_rgba(202,27,40,0.10)]"
                    }`}
                  >
                    {!isLight && (
                      <div className="pointer-events-none absolute inset-0 opacity-100 group-hover:opacity-0 transition-opacity duration-500">
                        <div className="absolute -top-16 -right-8 w-48 h-48 rounded-full bg-white/5 blur-2xl" />
                        <div className="absolute -bottom-12 -left-8 w-56 h-56 rounded-full bg-tap-red/10 blur-2xl opacity-40" />
                      </div>
                    )}
                    <div className="relative flex flex-row items-stretch justify-between gap-3 sm:gap-4 min-w-0">
                      <div className="min-w-0 flex-1">
                        <h3 className={`text-[15px] sm:text-[17px] font-semibold uppercase truncate ${isLight ? "text-black" : "text-white"}`}>
                          {job.title ?? "Offre sans titre"}
                        </h3>
                        <p className={`text-[11px] sm:text-[12px] mt-0.5 truncate ${isLight ? "text-black/65" : "text-white/50"}`}>
                          {job.categorie_profil ?? "Catégorie non précisée"}
                        </p>
                        <p className={`text-[11px] sm:text-[12px] mt-0.5 inline-flex items-center gap-1 min-w-0 ${isLight ? "text-black/70" : "text-white/55"}`}>
                          <MapPin size={12} className="shrink-0" />
                          <span className="truncate">{locationLabel ?? "Localisation non précisée"}</span>
                        </p>
                      </div>
                      <div className="flex flex-col justify-between items-end shrink-0 gap-0.5 min-h-[72px] sm:min-h-[76px]">
                        <div className="inline-flex items-center gap-2">
                          <span className={`text-[10px] sm:text-[11px] whitespace-nowrap ${isLight ? "text-black/50" : "text-white/35"}`}>
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
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium underline underline-offset-2 text-[#CA1B28] whitespace-nowrap">
                          Voir le détail
                          <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  </div>
                );
                })}
                </div>
                {filteredJobs.length > 0 ? (
                  <div
                    ref={leftListFooterRef}
                    className={`mt-auto pt-3 shrink-0 flex items-center justify-center border-t ${
                      isLight ? "border-black/10" : "border-white/[0.08]"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        disabled={listPage <= 1}
                        onClick={() => setListPage((p) => Math.max(1, p - 1))}
                        className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border transition disabled:opacity-35 disabled:cursor-not-allowed ${
                          isLight
                            ? "border-black/15 hover:bg-black/5 text-black/70"
                            : "border-white/[0.12] hover:bg-white/[0.06] text-white/80"
                        }`}
                        aria-label="Page précédente"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <span className={`text-[12px] tabular-nums min-w-[7rem] text-center ${isLight ? "text-black/70" : "text-white/70"}`}>
                        Page {listPage} / {totalListPages}
                      </span>
                      <button
                        type="button"
                        disabled={listPage >= totalListPages}
                        onClick={() => setListPage((p) => Math.min(totalListPages, p + 1))}
                        className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border transition disabled:opacity-35 disabled:cursor-not-allowed ${
                          isLight
                            ? "border-black/15 hover:bg-black/5 text-black/70"
                            : "border-white/[0.12] hover:bg-white/[0.06] text-white/80"
                        }`}
                        aria-label="Page suivante"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Droite : carte détail naturelle (sans scroll interne) — sert de référence de hauteur pour la liste (lg) */}
              <div className="min-w-0 flex flex-col lg:col-span-8 lg:min-h-0">
                <div
                  ref={detailCardRef}
                  className={`relative h-fit overflow-visible rounded-2xl p-5 sm:p-6 lg:p-6 ${
                    selectedJob
                      ? isLight
                        ? "group card-luxury-light border border-tap-red/25 shadow-[0_12px_40px_rgba(0,0,0,0.12)] hover:border-black/10 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-500"
                        : matchingDetailCardInvertedDarkClass
                      : isLight
                        ? "card-luxury-light"
                        : "border border-white/[0.08] bg-zinc-900/50"
                  }`}
                >
                {selectedJob && !isLight ? (
                  <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl">
                    <div className="absolute -top-16 -right-8 w-48 h-48 rounded-full bg-white/5 blur-2xl" />
                    <div className="absolute -bottom-12 -left-8 w-56 h-56 rounded-full bg-tap-red/10 blur-2xl opacity-40" />
                  </div>
                ) : null}
                {selectedJob ? (
                  <>
                    {/* Badge score matching — position absolue coin supérieur droit de la carte */}
                    <div
                      className="pointer-events-none absolute -top-2 -right-2 z-20 size-[3.75rem] rounded-full p-[2px] shadow-[0_8px_28px_rgba(0,0,0,0.45)] ring-2 ring-white/10 sm:-top-2.5 sm:-right-2.5 sm:size-16 lg:size-[4.25rem]"
                      style={{
                        background: `conic-gradient(${selectedJobScoreColor} ${selectedJobScorePct}%, rgba(255,255,255,0.14) ${selectedJobScorePct}% 100%)`,
                      }}
                    >
                      <div
                        className={`pointer-events-auto flex size-full items-center justify-center rounded-full ${
                          isLight ? "bg-white shadow-inner" : "bg-zinc-900/90"
                        }`}
                        role="img"
                        aria-label={`Score de correspondance ${selectedJobScorePct} pour cent`}
                      >
                        <span
                          className={`text-[12px] font-bold tabular-nums sm:text-[13px] lg:text-[14px] ${isLight ? "text-zinc-900" : "text-white"}`}
                        >
                          {selectedJobScorePct}%
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 pr-14 sm:pr-16 lg:pr-[4.75rem]">
                      {selectedJob.urgent ? (
                        <span className="w-fit text-[11px] px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                          Urgent
                        </span>
                      ) : null}

                      {/* Titre à gauche, actions à droite */}
                      <div className="flex min-w-0 items-start justify-between gap-3 sm:gap-6">
                        <div className="min-w-0 flex-1 text-left">
                          <h3 className={`text-[22px] sm:text-[24px] lg:text-[28px] font-semibold leading-tight uppercase ${isLight ? "text-black" : "text-white"}`}>
                            {selectedJob.title ?? "Offre sans titre"}
                          </h3>
                          <p className={`mt-1 text-[13px] lg:text-[14px] ${isLight ? "text-black/60" : "text-white/55"}`}>
                            {selectedJob.categorie_profil ?? "Catégorie non précisée"}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 self-start pt-0.5 sm:pt-1">
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
                            className={`inline-flex items-center justify-center size-10 rounded-full border transition ${
                              isLight
                                ? "border-black/10 bg-black/[0.03] hover:bg-black/[0.08] text-black/70"
                                : "border-white/[0.14] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200"
                            }`}
                            aria-label="Partager l’offre"
                            title="Partager"
                          >
                            <Share2 size={16} strokeWidth={1.75} />
                          </button>
                          <button
                            type="button"
                            disabled={toggleSavedJobMutation.isPending}
                            onClick={() => {
                              if (toggleSavedJobMutation.isPending) return;
                              toggleSavedJobMutation.mutate(selectedJob.id);
                            }}
                            className={`inline-flex items-center justify-center size-10 rounded-full border transition ${
                              selectedJobIsSaved
                                ? "border-emerald-500/40 bg-emerald-500/12 text-emerald-300 hover:bg-emerald-500/18"
                                : isLight
                                  ? "border-black/10 bg-black/[0.03] hover:bg-black/[0.08] text-black/70"
                                  : "border-white/[0.14] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200"
                            } ${toggleSavedJobMutation.isPending ? "opacity-60 cursor-not-allowed" : ""}`}
                            aria-label={selectedJobIsSaved ? "Offre enregistrée" : "Enregistrer l’offre"}
                            title={selectedJobIsSaved ? "Offre enregistrée" : "Enregistrer l’offre"}
                          >
                            <Bookmark size={16} strokeWidth={1.75} fill={selectedJobIsSaved ? "currentColor" : "none"} />
                          </button>
                        </div>
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

                    <div
                      className={`mt-8 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-end ${
                        isLight ? "border-black/10" : "border-white/[0.08]"
                      }`}
                    >
                      <button
                        type="button"
                        disabled={appliedJobIds.has(selectedJob.id)}
                        onClick={() => router.push(`/app/matching/offres/${selectedJob.id}`)}
                        className="btn-primary w-full !py-3 !px-6 text-[12px] sm:w-auto sm:!py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {appliedJobIds.has(selectedJob.id) ? "Déjà postulé" : "Postuler"}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className={`text-[13px] lg:text-[14px] ${isLight ? "text-black/60" : "text-white/55"}`}>
                    Sélectionnez une offre à gauche pour afficher ses détails.
                  </p>
                )}
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    </div>
  );
}
