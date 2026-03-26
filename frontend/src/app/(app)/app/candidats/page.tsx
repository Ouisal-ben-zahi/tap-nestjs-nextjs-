"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
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
import { Search, Users, Briefcase, FileText, Filter, CheckCircle2, X, Download, ArrowRight } from "lucide-react";
import { formatRelative, statusBg } from "@/lib/utils";

type InterviewQuestion = {
  id: string;
  text: string;
  category: string;
};

const REGENERATE_MAX_ATTEMPTS = 6;
const REGENERATE_DELAY_MS = 4500;

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
  const talentPanel = useRecruiterTalentPanelStore((s) => s.talentPanel);
  const openTalentPanel = useRecruiterTalentPanelStore((s) => s.openTalentPanel);

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

  return (
    <div className="max-w-[1100px] mx-auto">
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
            <div className="mb-8">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-5 rounded-full bg-emerald-500" />
                  <h2 className="text-[13px] uppercase tracking-[2px] text-white/50 font-semibold">
                    Candidats matchés par IA
                  </h2>
                </div>
                <Link
                  href="/app/matching-recruteur"
                  className="text-[12px] text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Retour au matching
                </Link>
              </div>

              {matchedCandidatesQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
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
                <div className="space-y-3">
                  {matchedCandidatesQuery.data.candidates.map((item) => {
                    const rawScore = Number(item.global_score ?? 0);
                    const normalizedScore =
                      rawScore <= 1 ? rawScore * 100 : rawScore;
                    const scorePct = Math.max(0, Math.min(100, Math.round(normalizedScore)));
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
                        className="grid grid-cols-12 items-center gap-4 bg-zinc-900/50 border border-white/[0.06] rounded-xl px-5 py-4 hover:border-white/[0.1] transition"
                      >
                        {/* Col 1: nom + titre profil */}
                        <div className="col-span-12 sm:col-span-7 min-w-0">
                          <p className="text-[15px] font-semibold text-white truncate">{candidateName}</p>
                          <p className="text-[12px] text-white/45 mt-1">
                            {item.candidate?.titre_profil || "Profil non renseigné"}
                          </p>
                        </div>

                        {/* Col 2: % matching */}
                        <div className="col-span-6 sm:col-span-2 text-center sm:text-right">
                          <p className="text-[20px] font-bold text-emerald-400">{scorePct}%</p>
                        </div>

                        {/* Col 3: bouton valider */}
                        <div className="col-span-6 sm:col-span-3 flex justify-center sm:justify-end items-center gap-2">
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
            </div>
          ) : null}

          {/* Candidatures par offre */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-5 rounded-full bg-blue-500" />
              <h2 className="text-[13px] uppercase tracking-[2px] text-white/50 font-semibold">2 dernier candidatures</h2>
            </div>

            {!overview?.applicationsPerJob?.length ? (
              <EmptyState
                icon={<Users className="w-10 h-10" />}
                title="Aucun candidat"
                description="Les candidats apparaîtront ici lorsqu'ils postuleront à vos offres."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {overview.applicationsPerJob.map((item, i) => {
                  const job = jobsById.get((item as any).jobId) as any | undefined;
                  const status = (job?.status as string) ?? "ACTIVE";
                  const isInactive = status === "INACTIVE";
                  const categorie = (job?.categorie_profil as string | null) ?? "—";
                  const applicationsCount = item.value ?? 0;
                  const jobId = (item as any).jobId as number | undefined;

                  return (
                    <div key={i} className="bg-zinc-900/50 border border-white/[0.06] rounded-xl px-5 py-4 hover:border-white/[0.1] transition">
                      {/* Top: title + status */}
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-[14px] font-medium text-white truncate">
                          {item.title ?? "Offre"}
                        </span>
                        <span
                          className={`text-[11px] px-2.5 py-1 rounded-full border font-medium shrink-0 ${
                            isInactive
                              ? "border-red-500/25 bg-red-500/15 text-red-400"
                              : "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                          }`}
                        >
                          {isInactive ? "Inactive" : "Active"}
                        </span>
                      </div>

                      {/* Category */}
                      <div className="mt-3 text-[12px] text-white/45 truncate">{categorie}</div>

                      {/* Bottom: count + arrow */}
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="text-[12px] text-white/70 font-semibold">
                          {applicationsCount} candidature{applicationsCount > 1 ? "s" : ""}
                        </span>

                        {typeof jobId === "number" ? (
                          <Link
                            href={`/app/candidats?jobId=${jobId}`}
                            className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl border transition ${
                              "border-white/[0.14] hover:bg-zinc-800 text-zinc-200 hover:text-white"
                            }`}
                            aria-label="Voir les candidatures"
                            title="Voir les candidatures"
                          >
                            <ArrowRight size={14} />
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Liste de candidatures */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-5 rounded-full bg-blue-500" />
              <h2 className="text-[13px] uppercase tracking-[2px] text-white/50 font-semibold">Candidatures</h2>
            </div>

            {!overview?.recentApplications?.length ? (
              <EmptyState
                icon={<FileText className="w-10 h-10" />}
                title="Aucune candidature"
                description="Les candidatures pour vos offres apparaîtront ici."
              />
            ) : (
              <div className="space-y-2">
                {overview.recentApplications.map((app) => {
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
                  return (
                  <div
                    key={app.id}
                    className={`grid grid-cols-12 items-center gap-4 bg-zinc-900/50 border rounded-xl px-5 py-4 transition ${
                      isTalentSelected
                        ? "border-2 border-[#CA1B28] shadow-[0_0_24px_rgba(202,27,40,0.2)]"
                        : "border-white/[0.06] hover:border-white/[0.1]"
                    }`}
                  >
                    {/* Col 1: avatar + nom (seul endroit cliquable) */}
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
                      className="col-span-12 sm:col-span-5 min-w-0 flex items-center gap-4 text-left rounded-lg px-1 py-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-tap-red/50"
                      aria-label={app.candidateName ? `Voir le portfolio de ${app.candidateName}` : "Voir le portfolio du candidat"}
                      title={app.candidateName ? `Voir le portfolio de ${app.candidateName}` : "Voir le portfolio du candidat"}
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-white/[0.10] bg-white/[0.04] flex items-center justify-center shrink-0">
                        {app.candidateAvatarUrl ? (
                          <img
                            src={app.candidateAvatarUrl}
                            alt={app.candidateName ?? "Avatar candidat"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[12px] font-semibold text-white/70">{getInitials(app.candidateName)}</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-[14px] font-medium text-white truncate">{app.candidateName}</p>
                      </div>
                    </button>

                    {/* Col 2: catégorie */}
                    <div className="col-span-6 sm:col-span-2 text-center">
                      <span className="text-[12px] text-white/45 truncate inline-block">
                        {app.jobTitle ?? "—"}
                      </span>
                    </div>

                    {/* Col 3: statut */}
                    <div className="col-span-6 sm:col-span-2 text-center">
                      <div className="relative inline-block w-full max-w-[140px]">
                        <button
                          type="button"
                          disabled={!canChangeStatus}
                          onClick={() => {
                            if (!canChangeStatus) return;
                            setStatusSelectAppId((current) => (current === app.id ? null : app.id));
                          }}
                          className={`w-full text-[11px] px-2.5 py-1 rounded-full border font-medium shrink-0 inline-flex justify-center ${statusBg(
                            normalizedStatus,
                          )} disabled:cursor-not-allowed disabled:opacity-60 hover:opacity-95 transition`}
                          aria-label="Modifier le statut de la candidature"
                          title="Cliquer pour modifier"
                        >
                          {recruiterCandidateStatusLabel(normalizedStatus)}
                        </button>

                        {statusSelectAppId === app.id && (
                          <div className="absolute left-0 top-full mt-2 w-full bg-[#050505]/95 border border-white/[0.08] rounded-2xl shadow-lg backdrop-blur-xl overflow-hidden z-50">
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

                    {/* Col 4: durée */}
                    <div className="col-span-12 sm:col-span-3 text-center sm:text-right">
                      <p className="text-[11px] text-white/30">
                        {app.validatedAt ? formatRelative(app.validatedAt) : "—"}
                      </p>
                    </div>
                  </div>
                );
                })}
              </div>
            )}
          </div>
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
