"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  useMatchedCandidatesByOffer,
  useRecruteurOverview,
  useRecruteurJobs,
  useSaveInterviewPdf,
  useUpdateCandidateApplicationStatus,
  useValidateCandidate,
} from "@/hooks/use-recruteur";
import { recruteurService, type ValidateCandidateResponse } from "@/services/recruteur.service";
import { useUiStore } from "@/stores/ui";
import { useRecruiterTalentPanelStore } from "@/stores/recruiter-talent-panel";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Search,
  Users,
  Briefcase,
  FileText,
  Filter,
  CheckCircle2,
  X,
  Download,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { formatRelative, statusBg } from "@/lib/utils";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";

/** Même base que les cartes KPI du dashboard recruteur (`RecruteurDashboard` + halos). */
const RECRUTEUR_DASHBOARD_CARD_BASE =
  "group card-animated-border relative rounded-2xl border border-white/[0.08] bg-[#020001] shadow-[0_10px_28px_rgba(0,0,0,0.45)] hover:bg-[linear-gradient(180deg,rgba(202,27,40,0.08)_0%,rgba(10,10,10,0.96)_30%,rgba(10,10,10,0.96)_100%)] hover:border-tap-red/15 transition-all duration-500 overflow-visible hover:-translate-y-0.5";

type InterviewQuestion = {
  id: string;
  text: string;
  category: string;
};

const REGENERATE_MAX_ATTEMPTS = 6;
const REGENERATE_DELAY_MS = 4500;
const CANDIDATURES_PAR_PAGE = 16;

function normalizeInterviewQuestions(data: ValidateCandidateResponse | undefined): InterviewQuestion[] {
  if (!Array.isArray(data?.interviewQuestions)) return [];
  return data.interviewQuestions
    .filter((q) => q && typeof q.text === "string" && q.text.trim())
    .map((q, idx) => ({
      id: String(q.id ?? `q${idx + 1}`),
      text: String(q.text).trim(),
      category: String(q.category ?? "autre").trim().toLowerCase(),
    }));
}

function getInitials(name: string | null | undefined) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return `${first}${second}`.toUpperCase() || "C";
}

function normalizeRecruiterCandidateStatus(
  status: string | null | undefined,
): 'EN_COURS' | 'ACCEPTEE' | 'REFUSEE' {
  const s = status?.toLowerCase?.() ?? '';
  if (s === 'acceptee' || s === 'accepté' || s === 'accepted' || s === 'active') return 'ACCEPTEE';
  if (s === 'refusee' || s === 'refusé' || s === 'refused' || s === 'rejected') return 'REFUSEE';
  // Default / everything else -> pending.
  return 'EN_COURS';
}

function recruiterCandidateStatusLabel(status: 'EN_COURS' | 'ACCEPTEE' | 'REFUSEE'): string {
  switch (status) {
    case 'ACCEPTEE':
      return 'Acceptée';
    case 'REFUSEE':
      return 'Refusée';
    case 'EN_COURS':
    default:
      return 'En cours';
  }
}

const CANDIDATURE_FILTRE_STATUT_OPTIONS = [
  { value: "all" as const, label: "Tous les statuts" },
  { value: "EN_COURS" as const, label: "En cours" },
  { value: "ACCEPTEE" as const, label: "Acceptée" },
  { value: "REFUSEE" as const, label: "Refusée" },
];

export default function CandidatsPage() {
  const searchParams = useSearchParams();
  const jobIdParam = searchParams.get("jobId");
  const parsedJobId = jobIdParam ? Number(jobIdParam) : Number.NaN;
  const selectedJobId = Number.isFinite(parsedJobId) && parsedJobId > 0 ? parsedJobId : null;

  const { user } = useAuth();
  const isRecruteur = user?.role === "recruteur";
  const overviewQuery = useRecruteurOverview();
  const jobsQuery = useRecruteurJobs();
  const matchedCandidatesQuery = useMatchedCandidatesByOffer(selectedJobId, isRecruteur);
  const queryClient = useQueryClient();
  const addToast = useUiStore((s) => s.addToast);
  const validateCandidateMutation = useValidateCandidate();
  const saveInterviewPdfMutation = useSaveInterviewPdf();
  const updateCandidateStatusMutation = useUpdateCandidateApplicationStatus();
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [interviewQuestions, setInterviewQuestions] = useState<InterviewQuestion[]>([]);
  const [interviewCandidateName, setInterviewCandidateName] = useState<string>("Candidat");
  const [interviewCandidateId, setInterviewCandidateId] = useState<number | null>(null);
  const [interviewPdfUrlsByCandidate, setInterviewPdfUrlsByCandidate] = useState<Record<number, string>>({});
  const [validatedCandidates, setValidatedCandidates] = useState<Record<number, boolean>>({});
  const [statusSelectAppId, setStatusSelectAppId] = useState<number | null>(null);
  /** Message si la modale s’ouvre sans liste de questions (ex. timeout IA). */
  const [interviewQuestionsNotice, setInterviewQuestionsNotice] = useState<string | null>(null);
  const [regeneratingCandidateId, setRegeneratingCandidateId] = useState<number | null>(null);
  const [candidatureSearch, setCandidatureSearch] = useState("");
  const [candidatureJobId, setCandidatureJobId] = useState<number | "all">("all");
  const [candidatureStatus, setCandidatureStatus] = useState<
    "all" | "EN_COURS" | "ACCEPTEE" | "REFUSEE"
  >("all");
  const [candidaturePage, setCandidaturePage] = useState(1);
  const [candidatureJobFilterOpen, setCandidatureJobFilterOpen] = useState(false);
  const [candidatureStatusFilterOpen, setCandidatureStatusFilterOpen] = useState(false);

  const candidatureJobOptions = useMemo(() => {
    const list = overviewQuery.data?.recentApplications ?? [];
    const m = new Map<number, string>();
    for (const a of list) {
      if (typeof a.jobId === "number" && Number.isFinite(a.jobId)) {
        const title = (a.jobTitle ?? "").trim() || `Offre #${a.jobId}`;
        if (!m.has(a.jobId)) m.set(a.jobId, title);
      }
    }
    return Array.from(m.entries()).sort((x, y) =>
      x[1].localeCompare(y[1], "fr", { sensitivity: "base" }),
    );
  }, [overviewQuery.data?.recentApplications]);

  const filteredCandidatures = useMemo(() => {
    const list = overviewQuery.data?.recentApplications ?? [];
    const q = candidatureSearch.trim().toLowerCase();
    return list.filter((app) => {
      if (q) {
        const name = String(app.candidateName ?? "").toLowerCase();
        if (!name.includes(q)) return false;
      }
      if (candidatureJobId !== "all" && app.jobId !== candidatureJobId) return false;
      if (candidatureStatus !== "all") {
        const n = normalizeRecruiterCandidateStatus(app.status ?? null);
        if (n !== candidatureStatus) return false;
      }
      return true;
    });
  }, [
    overviewQuery.data?.recentApplications,
    candidatureSearch,
    candidatureJobId,
    candidatureStatus,
  ]);

  const hasActiveCandidatureFilters =
    Boolean(candidatureSearch.trim()) ||
    candidatureJobId !== "all" ||
    candidatureStatus !== "all";

  const candidatureTotal = filteredCandidatures.length;
  const candidatureTotalPages = Math.max(1, Math.ceil(candidatureTotal / CANDIDATURES_PAR_PAGE));

  const paginatedCandidatures = useMemo(() => {
    const start = (candidaturePage - 1) * CANDIDATURES_PAR_PAGE;
    return filteredCandidatures.slice(start, start + CANDIDATURES_PAR_PAGE);
  }, [filteredCandidatures, candidaturePage]);

  useEffect(() => {
    setCandidaturePage(1);
  }, [candidatureSearch, candidatureJobId, candidatureStatus]);

  useEffect(() => {
    setCandidaturePage((p) => (p > candidatureTotalPages ? candidatureTotalPages : p < 1 ? 1 : p));
  }, [candidatureTotalPages]);

  useEffect(() => {
    if (!candidatureJobFilterOpen && !candidatureStatusFilterOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const el = e.target;
      if (!(el instanceof Node)) return;
      const root = document.querySelector("[data-candidature-filtre-dropdowns]");
      if (root && !root.contains(el)) {
        setCandidatureJobFilterOpen(false);
        setCandidatureStatusFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [candidatureJobFilterOpen, candidatureStatusFilterOpen]);

  const talentPanel = useRecruiterTalentPanelStore((s) => s.talentPanel);
  const openTalentPanel = useRecruiterTalentPanelStore((s) => s.openTalentPanel);
  const theme = useDashboardTheme();
  const isLight = theme === "light";

  const openModalFromValidateResponse = (
    data: ValidateCandidateResponse,
    candidateName: string,
    candidateId: number,
    options?: { emptyNoticeOverride?: string | null },
  ) => {
    const existingPdfUrl =
      typeof data?.interviewPdfUrl === "string" && data.interviewPdfUrl.trim()
        ? data.interviewPdfUrl.trim()
        : null;
    if (existingPdfUrl) {
      setInterviewPdfUrlsByCandidate((prev) => ({
        ...prev,
        [candidateId]: existingPdfUrl,
      }));
    }
    setValidatedCandidates((prev) => ({
      ...prev,
      [candidateId]: true,
    }));
    const questions = normalizeInterviewQuestions(data);
    const errRaw =
      typeof data?.interviewQuestionsError === "string" ? data.interviewQuestionsError.trim() : "";
    const isTimeout = errRaw.toLowerCase().includes("timeout");
    setInterviewQuestions(questions);
    setInterviewCandidateName(candidateName);
    setInterviewCandidateId(candidateId || null);
    setInterviewQuestionsNotice(
      questions.length
        ? null
        : options?.emptyNoticeOverride !== undefined
          ? options.emptyNoticeOverride
          : isTimeout
            ? "La génération des questions a dépassé le délai. Réessayez ou utilisez « Générer le PDF (questions IA) »."
            : errRaw
              ? `Génération des questions indisponible : ${errRaw}`
              : "Aucune question n’a été renvoyée pour le moment. Réessayez dans un instant.",
    );
    setInterviewModalOpen(true);
  };

  if (!isRecruteur) {
    return (
      <EmptyState
        icon={<Search className="w-12 h-12" />}
        title="Espace recruteur uniquement"
        description="Cette section est réservée aux recruteurs."
      />
    );
  }

  const overview = overviewQuery.data;

  const jobsById = new Map((jobsQuery.data?.jobs ?? []).map((j: any) => [j.id, j]));
  const selectedJobTitle =
    selectedJobId != null
      ? ((jobsById.get(selectedJobId) as any)?.title as string | null) ?? null
      : null;

  return (
    <div className="max-w-[min(100%,1440px)] mx-auto px-1 sm:px-0">
      {/* Header */}
      <div className="relative mb-8 pb-8 border-b border-white/[0.04]">
        <div className="absolute top-[-80px] left-[-100px] w-[350px] h-[350px] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.08),transparent_60%)] blur-3xl pointer-events-none" />
        <div className="relative">
          <h1 className="text-[28px] sm:text-[36px] font-bold text-white tracking-[-0.04em] font-heading">
            Candidats
          </h1>
          <p className="text-white/45 text-[14px] mt-2 font-light">
            Explorez les profils candidats et suivez vos processus de recrutement.
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      {overviewQuery.isLoading ? (
        <div className="grid grid-cols-3 gap-3 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : overviewQuery.isError ? (
        <ErrorState onRetry={() => overviewQuery.refetch()} />
      ) : (
        <>
          {selectedJobId ? (
            <section className="mb-10" aria-labelledby="candidats-matches-heading">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-1 h-5 rounded-full bg-emerald-500 shrink-0" />
                  <h2
                    id="candidats-matches-heading"
                    className="text-[13px] uppercase tracking-[2px] text-white/50 font-semibold min-w-0"
                  >
                    {selectedJobTitle ? (
                      <>
                        Candidats matchés par IA:{" "}
                        <span className="text-tap-red font-bold">{selectedJobTitle}</span>
                      </>
                    ) : (
                      "Candidats matchés par IA"
                    )}
                  </h2>
                </div>
                <Link
                  href="/app/matching-recruteur"
                  className="text-[12px] text-emerald-400 hover:text-emerald-300 transition-colors shrink-0"
                >
                  Retour au matching
                </Link>
              </div>

              {matchedCandidatesQuery.isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-40 w-full rounded-xl" />
                  ))}
                </div>
              ) : matchedCandidatesQuery.isError ? (
                <ErrorState onRetry={() => matchedCandidatesQuery.refetch()} />
              ) : !matchedCandidatesQuery.data?.candidates?.length ? (
                <EmptyState
                  icon={<Users className="w-10 h-10" />}
                  title="Aucun candidat matché"
                  description={
                    matchedCandidatesQuery.data?.message ??
                    "Aucun candidat matché IA n'a été trouvé pour cette offre."
                  }
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {matchedCandidatesQuery.data.candidates.map((item) => {
                    const rawScore = Number(item.global_score ?? 0);
                    const normalizedScore =
                      rawScore <= 1 ? rawScore * 100 : rawScore;
                    const scorePct = Math.max(0, Math.min(100, Math.round(normalizedScore)));
                    const scoreBadgeClass =
                      scorePct >= 85
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                        : scorePct >= 70
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/25"
                          : scorePct >= 50
                            ? "bg-orange-500/10 text-orange-400 border-orange-500/25"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/25";
                    const candidateName =
                      item.name ||
                      [item.candidate?.prenom, item.candidate?.nom]
                        .filter(Boolean)
                        .join(" ")
                        .trim() ||
                      "Candidat sans nom";
                    const candidateId = Number(item.candidate_id ?? 0);
                    const isValidatingThisCandidate =
                      validateCandidateMutation.isPending &&
                      validateCandidateMutation.variables?.candidateId === candidateId;
                    const existingInterviewPdfUrl = interviewPdfUrlsByCandidate[candidateId] || null;
                    const alreadyValidated = Boolean(validatedCandidates[candidateId]);

                    return (
                      <div
                        key={`${item.candidate_id ?? candidateName}-${scorePct}`}
                        className="flex flex-col gap-4 bg-zinc-900/50 border border-white/[0.06] rounded-xl px-5 py-4 hover:border-white/[0.1] transition h-full min-h-0 min-w-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-semibold text-white line-clamp-2">{candidateName}</p>
                          <p className="text-[12px] text-white/45 mt-1 line-clamp-2">
                            {item.candidate?.titre_profil || "Profil non renseigné"}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] font-semibold ${scoreBadgeClass}`}
                          >
                            {scorePct}% match
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-auto pt-1">
                          <button
                            type="button"
                            onClick={async () => {
                              if (!selectedJobId || !candidateId) return;
                              const isRegenerate =
                                alreadyValidated || Boolean(existingInterviewPdfUrl);

                              if (!isRegenerate) {
                                validateCandidateMutation.mutate(
                                  { jobId: selectedJobId, candidateId },
                                  {
                                    onSuccess: (data) =>
                                      openModalFromValidateResponse(data, candidateName, candidateId),
                                  },
                                );
                                return;
                              }

                              setRegeneratingCandidateId(candidateId);
                              try {
                                let last: ValidateCandidateResponse | null = null;
                                for (let attempt = 0; attempt < REGENERATE_MAX_ATTEMPTS; attempt++) {
                                  if (attempt > 0) {
                                    await new Promise((r) => setTimeout(r, REGENERATE_DELAY_MS));
                                  }
                                  last = await recruteurService.validateCandidateForJob(
                                    selectedJobId,
                                    candidateId,
                                  );
                                  const qs = normalizeInterviewQuestions(last);
                                  if (qs.length > 0) {
                                    await queryClient.invalidateQueries({
                                      queryKey: ["recruteur", "matched-candidates", selectedJobId],
                                    });
                                    await queryClient.invalidateQueries({
                                      queryKey: ["recruteur", "overview"],
                                    });
                                    openModalFromValidateResponse(last, candidateName, candidateId);
                                    addToast({
                                      message: `${qs.length} question(s) d’entretien générée(s).`,
                                      type: "success",
                                    });
                                    return;
                                  }
                                }
                                await queryClient.invalidateQueries({
                                  queryKey: ["recruteur", "matched-candidates", selectedJobId],
                                });
                                await queryClient.invalidateQueries({
                                  queryKey: ["recruteur", "overview"],
                                });
                                if (last) {
                                  openModalFromValidateResponse(last, candidateName, candidateId, {
                                    emptyNoticeOverride:
                                      "Après plusieurs tentatives automatiques, aucune question n’a été reçue. Utilisez « Générer le PDF (questions IA) » dans la modale ou réessayez plus tard.",
                                  });
                                  addToast({
                                    message:
                                      "Aucune question reçue après plusieurs tentatives. Voir la modale.",
                                    type: "error",
                                  });
                                }
                              } catch {
                                addToast({
                                  message: "Impossible de régénérer les questions pour le moment.",
                                  type: "error",
                                });
                              } finally {
                                setRegeneratingCandidateId(null);
                              }
                            }}
                            disabled={
                              !selectedJobId ||
                              !candidateId ||
                              isValidatingThisCandidate ||
                              regeneratingCandidateId === candidateId
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-md border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <CheckCircle2 size={13} />
                            {regeneratingCandidateId === candidateId
                              ? "Régénération en cours..."
                              : isValidatingThisCandidate
                                ? "Validation..."
                                : alreadyValidated || existingInterviewPdfUrl
                                  ? "Régénérer d'autres questions"
                                  : "Valider"}
                          </button>
                          {existingInterviewPdfUrl ? (
                            <a
                              href={existingInterviewPdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-full border border-white/[0.14] hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                              title="Télécharger les questions d'entretien"
                              aria-label="Télécharger les questions d'entretien"
                            >
                              <Download size={14} />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ) : null}

          <section aria-labelledby="candidatures-heading">
            <div className="flex flex-col gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-1 h-5 rounded-full bg-blue-500" />
                <h2 id="candidatures-heading" className="text-[13px] uppercase tracking-[2px] text-white/50 font-semibold">
                  Candidatures
                </h2>
              </div>

              {!overview?.recentApplications?.length ? null : (
                <div
                  className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3"
                  data-candidature-filtre-dropdowns
                >
                  <div className="flex-1 min-w-[min(100%,220px)]">
                    <label
                      htmlFor="candidature-filtre-recherche"
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
                        id="candidature-filtre-recherche"
                        type="search"
                        value={candidatureSearch}
                        onChange={(e) => setCandidatureSearch(e.target.value)}
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
                      onClick={() => {
                        setCandidatureJobFilterOpen((v) => !v);
                        setCandidatureStatusFilterOpen(false);
                      }}
                      className={`input-premium w-full flex items-center justify-between cursor-pointer text-left rounded-xl min-h-[42px] px-3 py-2 ${
                        isLight
                          ? "bg-white border border-black/10 hover:border-tap-red/40"
                          : "bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08]"
                      }`}
                      aria-expanded={candidatureJobFilterOpen}
                      aria-haspopup="listbox"
                    >
                      <span className={`text-[13px] truncate pr-2 ${isLight ? "text-black" : "text-white/80"}`}>
                        {candidatureJobId === "all"
                          ? "Toutes les offres"
                          : candidatureJobOptions.find(([id]) => id === candidatureJobId)?.[1] ??
                            `Offre #${candidatureJobId}`}
                      </span>
                      <ChevronDown size={14} className={isLight ? "text-black/60 shrink-0" : "text-white/45 shrink-0"} />
                    </button>
                    {candidatureJobFilterOpen ? (
                      <div
                        className="absolute left-0 top-full mt-2 w-full min-w-[220px] max-h-[min(280px,50vh)] overflow-y-auto bg-[#050505]/95 border border-white/[0.08] rounded-2xl shadow-lg backdrop-blur-xl z-[80]"
                        role="listbox"
                      >
                        <div>
                          <button
                            type="button"
                            role="option"
                            aria-selected={candidatureJobId === "all"}
                            onClick={() => {
                              setCandidatureJobId("all");
                              setCandidatureJobFilterOpen(false);
                            }}
                            className={`w-full flex items-center gap-2.5 px-4 py-3 text-left text-[13px] transition-colors focus:outline-none focus-visible:outline-none ${
                              candidatureJobId === "all"
                                ? "text-white bg-red-500/15"
                                : "text-white/80 hover:text-white hover:bg-red-500/8"
                            }`}
                          >
                            <span className="flex-1 truncate">Toutes les offres</span>
                          </button>
                          {candidatureJobOptions.map(([id, title]) => {
                            const active = candidatureJobId === id;
                            return (
                              <button
                                key={id}
                                type="button"
                                role="option"
                                aria-selected={active}
                                onClick={() => {
                                  setCandidatureJobId(id);
                                  setCandidatureJobFilterOpen(false);
                                }}
                                className={`w-full flex items-center gap-2.5 px-4 py-3 text-left text-[13px] transition-colors focus:outline-none focus-visible:outline-none ${
                                  active
                                    ? "text-white bg-red-500/15"
                                    : "text-white/80 hover:text-white hover:bg-red-500/8"
                                }`}
                              >
                                <span className="flex-1 truncate">{title}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="relative min-w-[min(100%,200px)] sm:min-w-[180px]">
                    <label
                      className={`block text-[10px] font-semibold uppercase tracking-[2px] mb-2 ${
                        isLight ? "text-black/70" : "text-white/40"
                      }`}
                    >
                      Statut
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setCandidatureStatusFilterOpen((v) => !v);
                        setCandidatureJobFilterOpen(false);
                      }}
                      className={`input-premium w-full flex items-center justify-between cursor-pointer text-left rounded-xl min-h-[42px] px-3 py-2 ${
                        isLight
                          ? "bg-white border border-black/10 hover:border-tap-red/40"
                          : "bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08]"
                      }`}
                      aria-expanded={candidatureStatusFilterOpen}
                      aria-haspopup="listbox"
                    >
                      <span className={`text-[13px] truncate pr-2 ${isLight ? "text-black" : "text-white/80"}`}>
                        {CANDIDATURE_FILTRE_STATUT_OPTIONS.find((o) => o.value === candidatureStatus)?.label ??
                          "Tous les statuts"}
                      </span>
                      <ChevronDown size={14} className={isLight ? "text-black/60 shrink-0" : "text-white/45 shrink-0"} />
                    </button>
                    {candidatureStatusFilterOpen ? (
                      <div
                        className="absolute left-0 top-full mt-2 w-full min-w-[180px] bg-[#050505]/95 border border-white/[0.08] rounded-2xl shadow-lg backdrop-blur-xl overflow-hidden z-[80]"
                        role="listbox"
                      >
                        <div>
                          {CANDIDATURE_FILTRE_STATUT_OPTIONS.map((opt) => {
                            const active = candidatureStatus === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                role="option"
                                aria-selected={active}
                                onClick={() => {
                                  setCandidatureStatus(opt.value);
                                  setCandidatureStatusFilterOpen(false);
                                }}
                                className={`w-full flex items-center gap-2.5 px-4 py-3 text-left text-[13px] transition-colors focus:outline-none focus-visible:outline-none ${
                                  active
                                    ? "text-white bg-red-500/15"
                                    : "text-white/80 hover:text-white hover:bg-red-500/8"
                                }`}
                              >
                                <span className="flex-1 truncate">{opt.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  {hasActiveCandidatureFilters ? (
                    <button
                      type="button"
                      onClick={() => {
                        setCandidatureSearch("");
                        setCandidatureJobId("all");
                        setCandidatureStatus("all");
                        setCandidatureJobFilterOpen(false);
                        setCandidatureStatusFilterOpen(false);
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
              )}
            </div>

            {!overview?.recentApplications?.length ? (
              <EmptyState
                icon={<FileText className="w-10 h-10" />}
                title="Aucune candidature"
                description="Les candidatures pour vos offres apparaîtront ici."
              />
            ) : !filteredCandidatures.length ? (
              <EmptyState
                icon={<Filter className="w-10 h-10" />}
                title="Aucun résultat"
                description="Aucune candidature ne correspond à votre recherche ou aux filtres sélectionnés."
              />
            ) : (
              <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedCandidatures.map((app) => {
                  const cid = app.candidateId;
                  const canOpenTalent =
                    typeof cid === "number" && Number.isFinite(cid) && cid > 0;
                  const isTalentSelected = talentPanel?.candidateId === cid;
                  const normalizedStatus = normalizeRecruiterCandidateStatus(app.status ?? null);
                  const canChangeStatus =
                    typeof app.candidateId === "number" &&
                    Number.isFinite(app.candidateId) &&
                    app.candidateId > 0 &&
                    typeof app.jobId === "number" &&
                    Number.isFinite(app.jobId) &&
                    app.jobId > 0;
                  const durationLabel = app.validatedAt ? formatRelative(app.validatedAt) : "—";
                  const statusMenuOpen = statusSelectAppId === app.id;
                  return (
                  <div
                    key={app.id}
                    className={`${RECRUTEUR_DASHBOARD_CARD_BASE} p-4 sm:p-5 h-full min-h-0 min-w-0 flex flex-col ${
                      isLight
                        ? "card-luxury-light hover:shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
                        : "hover:brightness-105 shadow-[0_18px_40px_rgba(0,0,0,0.25)]"
                    } ${
                      isTalentSelected
                        ? "border-2 border-[#CA1B28] shadow-[0_0_24px_rgba(202,27,40,0.25)]"
                        : ""
                    } ${
                      statusMenuOpen
                        ? "z-[100]"
                        : isTalentSelected
                          ? "z-10"
                          : ""
                    }`}
                  >
                    <div className="pointer-events-none absolute inset-0 opacity-100 group-hover:opacity-0 transition-opacity duration-500 rounded-2xl overflow-hidden">
                      <div className="absolute -top-20 -right-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
                      <div className="absolute -bottom-24 -left-20 w-56 h-56 rounded-full bg-tap-red/10 blur-2xl opacity-40" />
                    </div>

                    <div className="relative z-[2] flex flex-col gap-3 flex-1 min-h-0 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          disabled={!canOpenTalent}
                          onClick={() => {
                            if (!canOpenTalent) return;
                            openTalentPanel({
                              candidateId: cid,
                              candidateName: app.candidateName?.trim() || "Candidat",
                            });
                          }}
                          className="min-w-0 flex-1 flex items-center gap-3 text-left rounded-lg cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-tap-red/50"
                          aria-label={app.candidateName ? `Voir le portfolio de ${app.candidateName}` : "Voir le portfolio du candidat"}
                          title={app.candidateName ? `Voir le portfolio de ${app.candidateName}` : "Voir le portfolio du candidat"}
                        >
                          <div className="w-12 h-12 rounded-full overflow-hidden border border-white/[0.10] bg-white/[0.04] flex items-center justify-center shrink-0">
                            {app.candidateAvatarUrl ? (
                              <img
                                src={app.candidateAvatarUrl}
                                alt={app.candidateName ?? "Avatar candidat"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className={`text-[13px] font-semibold ${isLight ? "text-black/60" : "text-white/70"}`}>
                                {getInitials(app.candidateName)}
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-[14px] font-semibold leading-snug line-clamp-2 ${
                              isLight ? "text-black" : "text-white"
                            }`}
                          >
                            {app.candidateName}
                          </p>
                        </button>
                        <p
                          className={`text-[11px] shrink-0 text-right leading-tight pt-0.5 max-w-[38%] ${
                            isLight ? "text-black/45" : "text-white/40"
                          }`}
                          title={durationLabel}
                        >
                          {durationLabel}
                        </p>
                      </div>

                      <p
                        className={`text-[12px] leading-snug line-clamp-2 border-t pt-3 ${
                          isLight ? "text-black/65 border-black/10" : "text-white/55 border-white/[0.08]"
                        }`}
                      >
                        {app.jobTitle ?? "—"}
                      </p>

                      <div className="relative z-[5] mt-auto pt-1 min-w-0">
                        <button
                          type="button"
                          disabled={!canChangeStatus}
                          onClick={() => {
                            if (!canChangeStatus) return;
                            setStatusSelectAppId((current) => (current === app.id ? null : app.id));
                          }}
                          className={`relative z-[1] w-full max-w-[200px] text-[11px] px-2.5 py-1.5 rounded-full border font-medium inline-flex justify-center ${statusBg(
                            normalizedStatus,
                          )} disabled:cursor-not-allowed disabled:opacity-60 hover:opacity-95 transition`}
                          aria-label="Modifier le statut de la candidature"
                          title="Cliquer pour modifier"
                        >
                          {recruiterCandidateStatusLabel(normalizedStatus)}
                        </button>

                        {statusMenuOpen && (
                          <div className="absolute left-0 top-full mt-2 w-full min-w-[180px] max-w-[240px] bg-[#050505]/95 border border-white/[0.08] rounded-2xl shadow-xl shadow-black/40 backdrop-blur-xl overflow-hidden z-[20]">
                            <div>
                              {(
                                [
                                  { status: 'EN_COURS', label: 'En cours' },
                                  { status: 'ACCEPTEE', label: 'Acceptée' },
                                  { status: 'REFUSEE', label: 'Refusée' },
                                ] as const
                              ).map((opt) => {
                                const active = opt.status === normalizedStatus;
                                return (
                                  <button
                                    key={opt.status}
                                    type="button"
                                    onClick={() => {
                                      if (!canChangeStatus) return;
                                      if (!app.jobId || app.candidateId == null) return;
                                      updateCandidateStatusMutation.mutate(
                                        {
                                          jobId: app.jobId,
                                          candidateId: app.candidateId,
                                          status: opt.status,
                                        },
                                        {
                                          onSuccess: () => {
                                            setStatusSelectAppId(null);
                                          },
                                        },
                                      );
                                    }}
                                    disabled={!canChangeStatus || updateCandidateStatusMutation.isPending}
                                    className={`w-full flex items-center justify-center px-4 py-3 text-[13px] transition-colors focus:outline-none focus-visible:outline-none border border-white/[0.08] rounded-none ${
                                      active
                                        ? statusBg(opt.status)
                                        : "text-white/80 hover:text-white hover:bg-white/[0.06] bg-white/[0.02]"
                                    } ${!canChangeStatus ? "opacity-50 cursor-not-allowed" : ""}`}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>

              {candidatureTotalPages > 1 ? (
                <div
                  className={`mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 ${
                    isLight ? "border-t border-black/10" : "border-t border-white/[0.06]"
                  }`}
                >
                  <p className={`text-[12px] ${isLight ? "text-black/50" : "text-white/45"}`}>
                    Affichage de{" "}
                    {(candidaturePage - 1) * CANDIDATURES_PAR_PAGE + 1}
                    {" — "}
                    {Math.min(candidaturePage * CANDIDATURES_PAR_PAGE, candidatureTotal)} sur{" "}
                    {candidatureTotal}
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
                    <button
                      type="button"
                      disabled={candidaturePage <= 1}
                      onClick={() => {
                        setCandidaturePage((p) => Math.max(1, p - 1));
                        setStatusSelectAppId(null);
                      }}
                      className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border text-[12px] font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${
                        isLight
                          ? "border-black/15 text-black/80 hover:bg-black/[0.04]"
                          : "border-white/[0.14] text-white/80 hover:bg-white/[0.06]"
                      }`}
                    >
                      <ChevronLeft size={16} strokeWidth={2} />
                      Précédent
                    </button>
                    <span className={`text-[12px] tabular-nums px-2 ${isLight ? "text-black/55" : "text-white/50"}`}>
                      Page {candidaturePage} / {candidatureTotalPages}
                    </span>
                    <button
                      type="button"
                      disabled={candidaturePage >= candidatureTotalPages}
                      onClick={() => {
                        setCandidaturePage((p) => Math.min(candidatureTotalPages, p + 1));
                        setStatusSelectAppId(null);
                      }}
                      className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border text-[12px] font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${
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
          </section>
        </>
      )}

      {interviewModalOpen ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setInterviewModalOpen(false);
              setInterviewQuestionsNotice(null);
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-[760px] max-h-[80vh] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0a0a] shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
                <div>
                  <p className="text-[14px] font-semibold text-white">
                    Questions d'entretien - {interviewCandidateName}
                  </p>
                  <p className="text-[12px] text-white/45 mt-0.5">
                    {interviewQuestions.length} question{interviewQuestions.length > 1 ? "s" : ""} proposee{interviewQuestions.length > 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setInterviewModalOpen(false);
                    setInterviewQuestionsNotice(null);
                  }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] transition"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-5 overflow-y-auto max-h-[calc(80vh-76px)] space-y-3">
                {interviewQuestionsNotice ? (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13px] text-amber-100/90 leading-relaxed">
                    {interviewQuestionsNotice}
                  </div>
                ) : null}
                {interviewCandidateId && interviewPdfUrlsByCandidate[interviewCandidateId] ? (
                  <a
                    href={interviewPdfUrlsByCandidate[interviewCandidateId]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-blue-500/35 bg-blue-500/10 px-4 py-2.5 text-[13px] text-blue-200 hover:bg-blue-500/15 transition"
                  >
                    <Download size={16} />
                    Télécharger le PDF des questions (déjà enregistré)
                  </a>
                ) : null}
                {interviewQuestions.map((q) => (
                  <div
                    key={q.id}
                    className="rounded-xl border border-white/[0.08] bg-zinc-900/50 p-4"
                  >
                    <p className="text-[11px] uppercase tracking-[1.5px] text-emerald-400/80 mb-2">
                      {q.category || "autre"}
                    </p>
                    <p className="text-[13px] text-white/85 leading-relaxed">{q.text}</p>
                  </div>
                ))}
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setInterviewModalOpen(false);
                      setInterviewQuestionsNotice(null);
                    }}
                    className="h-9 px-3 rounded-lg border border-white/[0.16] text-white/75 hover:text-white hover:bg-white/[0.06] text-[12px] transition"
                  >
                    Fermer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedJobId || !interviewCandidateId) return;
                      saveInterviewPdfMutation.mutate(
                        {
                          jobId: selectedJobId,
                          candidateId: interviewCandidateId,
                          questions:
                            interviewQuestions.length > 0 ? interviewQuestions : undefined,
                        },
                        {
                          onSuccess: (data) => {
                            const fileUrl =
                              typeof data?.file_url === "string" && data.file_url.trim()
                                ? data.file_url.trim()
                                : null;
                            if (interviewCandidateId && fileUrl) {
                              setInterviewPdfUrlsByCandidate((prev) => ({
                                ...prev,
                                [interviewCandidateId]: fileUrl,
                              }));
                            }
                          },
                        },
                      );
                    }}
                    disabled={!selectedJobId || !interviewCandidateId || saveInterviewPdfMutation.isPending}
                    className="h-9 px-3 rounded-lg border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 text-[12px] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saveInterviewPdfMutation.isPending
                      ? "Enregistrement..."
                      : interviewQuestions.length > 0
                        ? "Enregistrer PDF entretien TAP"
                        : "Générer le PDF (questions IA)"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
