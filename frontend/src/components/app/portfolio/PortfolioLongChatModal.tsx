"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Briefcase, Check, Loader2, Send, X } from "lucide-react";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";
import {
  useCandidatScore,
  useRunPortfolioLongPipeline,
  useSendPortfolioLongChatMessage,
  useStartPortfolioLongChat,
} from "@/hooks/use-candidat";
import { candidatService } from "@/services/candidat.service";

type Props = {
  open: boolean;
  onClose: () => void;
};

const PIPELINE_POLL_MS = 2500;
const PIPELINE_MAX_WAIT_MS = 8 * 60 * 1000;
const PIPELINE_TIME_SKEW_MS = 15000;

/** Aligné sur dashboard.service (fichiers long FR / EN). */
function isPortfolioLongPdfFr(name: string): boolean {
  const n = name.toLowerCase();
  const isShort =
    n.endsWith("_one-page_fr.pdf") ||
    n.endsWith("_one-page_en.pdf") ||
    n.endsWith("_one_page_fr.pdf") ||
    n.endsWith("_one_page_en.pdf");
  return n.endsWith("_long_fr.pdf") || (n.endsWith("_fr.pdf") && !isShort);
}

function isPortfolioLongPdfEn(name: string): boolean {
  const n = name.toLowerCase();
  const isShort =
    n.endsWith("_one-page_fr.pdf") ||
    n.endsWith("_one-page_en.pdf") ||
    n.endsWith("_one_page_fr.pdf") ||
    n.endsWith("_one_page_en.pdf");
  return n.endsWith("_long_en.pdf") || (n.endsWith("_en.pdf") && !isShort);
}

export default function PortfolioLongChatModal({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const startChat = useStartPortfolioLongChat();
  const sendMessage = useSendPortfolioLongChatMessage();
  const runPipeline = useRunPortfolioLongPipeline();
  const candidatScore = useCandidatScore();
  const theme = useDashboardTheme();
  const isLight = theme === "light";

  const pipelineRunStartedAtRef = useRef<number | null>(null);
  const lastRunResponseRef = useRef<any>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [missingFields, setMissingFields] = useState<any>(null);
  const [input, setInput] = useState("");
  const [autoRunTriggered, setAutoRunTriggered] = useState(false);
  const [pipelineResult, setPipelineResult] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [initialMissingTotal, setInitialMissingTotal] = useState<number | null>(null);
  const [pipelineStartedAt, setPipelineStartedAt] = useState<number | null>(null);
  const [pipelineSoftTimeout, setPipelineSoftTimeout] = useState(false);
  const [awaitingBackgroundArtifacts, setAwaitingBackgroundArtifacts] = useState(false);
  const [bgScoringDone, setBgScoringDone] = useState(false);
  const [bgLongPdfFrDone, setBgLongPdfFrDone] = useState(false);
  const [bgLongPdfEnDone, setBgLongPdfEnDone] = useState(false);
  const [bgPollTimedOut, setBgPollTimedOut] = useState(false);

  const busy = startChat.isPending || sendMessage.isPending || runPipeline.isPending;

  const missingCount = useMemo(() => {
    if (!missingFields) return null;
    if (Array.isArray(missingFields)) return missingFields.length;
    if (typeof missingFields === "object") return Object.keys(missingFields).length;
    return null;
  }, [missingFields]);

  useEffect(() => {
    if (!open) return;

    
    setSessionId(null);
    setQuestion(null);
    setIsComplete(false);
    setMissingFields(null);
    setInput("");
    setAutoRunTriggered(false);
    setPipelineResult(null);
    setProgress(0);
    setInitialMissingTotal(null);
    setPipelineStartedAt(null);
    setPipelineSoftTimeout(false);
    setAwaitingBackgroundArtifacts(false);
    setBgScoringDone(false);
    setBgLongPdfFrDone(false);
    setBgLongPdfEnDone(false);
    setBgPollTimedOut(false);
    pipelineRunStartedAtRef.current = null;
    lastRunResponseRef.current = null;

    startChat.mutate("fr", {
      onSuccess: (data) => {
        if (!data?.success) return;
        setSessionId(data.session_id ?? null);
        setQuestion((data.question ?? null) as any);
        setIsComplete(Boolean(data.is_complete));
        setMissingFields(data.missing_fields ?? null);
      },
    });
    
  }, [open]);

  function applyPipelineRunSuccess(res: any) {
    lastRunResponseRef.current = res ?? null;
    setPipelineResult(res ?? null);
    if (!res?.success) {
      setAwaitingBackgroundArtifacts(false);
      return;
    }
    pipelineRunStartedAtRef.current = Date.now();
    const inlineScoring = Boolean(
      res?.scoring?.scores ?? res?.scoring?.score_global ?? res?.scoring?.decision ?? res?.scoring,
    );
    setAwaitingBackgroundArtifacts(true);
    setBgPollTimedOut(false);
    setBgScoringDone(inlineScoring);
    setBgLongPdfFrDone(false);
    setBgLongPdfEnDone(false);
  }

  const pipelineArtifactsDone = bgScoringDone && bgLongPdfFrDone && bgLongPdfEnDone;

  const handleSend = () => {
    const msg = input.trim();
    if (!msg || !sessionId || busy) return;
    setInput("");

    sendMessage.mutate(
      { sessionId, message: msg },
      {
        onSuccess: (data) => {
          if (!data?.success) return;
          setQuestion((data.question ?? null) as any);
          const done = Boolean(data.is_complete);
          setIsComplete(done);
          setMissingFields(data.missing_fields ?? null);

          
          if (done && !autoRunTriggered) {
            setAutoRunTriggered(true);
            setPipelineStartedAt(Date.now());
            setPipelineSoftTimeout(false);
            runPipeline.mutate("fr", {
              onSuccess: (res) => {
                applyPipelineRunSuccess(res);
              },
            });
          }
        },
      },
    );
  };

  const handleRun = () => {
    if (busy) return;
    setPipelineStartedAt(Date.now());
    setPipelineSoftTimeout(false);
    runPipeline.mutate("fr", {
      onSuccess: (res) => {
        applyPipelineRunSuccess(res);
      },
    });
  };

  const scoreGlobal =
    pipelineResult?.scoring?.scores?.score_global ??
    pipelineResult?.scoring?.score_global ??
    pipelineResult?.scoring?.scores?.scoreGlobal ??
    candidatScore.data?.scoreGlobal ??
    null;
  const decision =
    pipelineResult?.scoring?.scores?.decision ??
    pipelineResult?.scoring?.decision ??
    candidatScore.data?.decision ??
    null;
  const generationMessage =
    pipelineResult?.generation?.message ??
    (pipelineResult?.generation?.success
      ? "Génération du portfolio long lancée. Le PDF apparaîtra dans la liste dans quelques instants."
      : null);

  const pipelineLaunched = Boolean(pipelineStartedAt) || autoRunTriggered;
  const showPipelineWorking =
    isComplete &&
    pipelineLaunched &&
    !bgPollTimedOut &&
    (runPipeline.isPending || (awaitingBackgroundArtifacts && !pipelineArtifactsDone));

  const progressLabel = useMemo(() => {
    if (pipelineArtifactsDone && pipelineResult?.success) return "Terminé";
    if (bgPollTimedOut && !pipelineArtifactsDone) return "Génération en arrière-plan…";
    if (pipelineSoftTimeout || awaitingBackgroundArtifacts || runPipeline.isPending) return "Scoring + génération…";
    if (sendMessage.isPending) return "Envoi…";
    if (startChat.isPending) return "Initialisation…";
    if (isComplete) return "Prêt";
    return "Collecte…";
  }, [
    pipelineArtifactsDone,
    pipelineResult?.success,
    bgPollTimedOut,
    pipelineSoftTimeout,
    awaitingBackgroundArtifacts,
    runPipeline.isPending,
    sendMessage.isPending,
    startChat.isPending,
    isComplete,
  ]);

  useEffect(() => {
    if (typeof missingCount === "number" && missingCount >= 0 && !runPipeline.isPending && !pipelineResult) {
      if (initialMissingTotal === null) {
        setInitialMissingTotal(Math.max(missingCount, 1));
      }
      const total = Math.max(initialMissingTotal ?? missingCount, 1);
      const doneRatio = 1 - Math.min(missingCount / total, 1);
      const next = Math.max(0, Math.min(70, Math.round(doneRatio * 70)));
      setProgress((p) => (pipelineResult ? p : Math.max(p, next)));
    }

    const pipelineBusy =
      runPipeline.isPending ||
      Boolean(pipelineResult && awaitingBackgroundArtifacts && !pipelineArtifactsDone);

    if (pipelineBusy) {
      const id = window.setInterval(() => {
        setProgress((p) => {
          const base = Math.max(p, 70);
          const next = Math.min(95, base + Math.max(1, Math.round((95 - base) * 0.08)));
          return next;
        });
      }, 250);
      return () => window.clearInterval(id);
    }

    if (pipelineArtifactsDone && pipelineResult?.success) {
      setProgress(100);
    }
  }, [
    missingCount,
    runPipeline.isPending,
    pipelineResult,
    initialMissingTotal,
    awaitingBackgroundArtifacts,
    pipelineArtifactsDone,
  ]);

  useEffect(() => {
    if (!open || !awaitingBackgroundArtifacts) return;
    const started = pipelineRunStartedAtRef.current;
    if (started == null) return;

    let cancelled = false;

    const isFresh = (iso: string | null | undefined) => {
      if (!iso) return false;
      const t = new Date(iso).getTime();
      return Number.isFinite(t) && t >= started - PIPELINE_TIME_SKEW_MS;
    };

    const tick = async () => {
      if (cancelled) return;
      if (Date.now() - started > PIPELINE_MAX_WAIT_MS) {
        setBgPollTimedOut(true);
        setAwaitingBackgroundArtifacts(false);
        return;
      }

      try {
        const [pdfsRes, scoreRes] = await Promise.all([
          candidatService.getPortfolioPdfFiles(),
          candidatService.getScore(),
        ]);
        if (cancelled) return;

        const resSnap = lastRunResponseRef.current;
        const hasInlineScoring = Boolean(
          resSnap?.scoring?.scores ??
            resSnap?.scoring?.score_global ??
            resSnap?.scoring?.decision ??
            resSnap?.scoring,
        );
        const scoringReady = hasInlineScoring || isFresh(scoreRes.metadataTimestamp);
        const longs = pdfsRes.portfolioPdfFiles.filter((p) => p.type === "long");
        const longFrReady = longs.some(
          (p) => isFresh(p.updatedAt) && isPortfolioLongPdfFr(p.name),
        );
        const longEnReady = longs.some(
          (p) => isFresh(p.updatedAt) && isPortfolioLongPdfEn(p.name),
        );

        setBgScoringDone((p) => scoringReady || p);
        setBgLongPdfFrDone((p) => longFrReady || p);
        setBgLongPdfEnDone((p) => longEnReady || p);

        if (scoringReady && longFrReady && longEnReady) {
          setAwaitingBackgroundArtifacts(false);
          queryClient.invalidateQueries({ queryKey: ["candidat", "portfolio-pdfs"] });
          queryClient.invalidateQueries({ queryKey: ["candidat", "score"] });
          void candidatScore.refetch();
        }
      } catch {
        /* retry next tick */
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), PIPELINE_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [open, awaitingBackgroundArtifacts, queryClient, candidatScore]);

  useEffect(() => {
    if (!pipelineStartedAt) return;
    if (pipelineArtifactsDone) return;
    if (!runPipeline.isPending && !awaitingBackgroundArtifacts) return;

    const id = window.setInterval(() => {
      const elapsedMs = Date.now() - pipelineStartedAt;
      if (elapsedMs >= 12000) {
        setPipelineSoftTimeout(true);
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [pipelineStartedAt, runPipeline.isPending, awaitingBackgroundArtifacts, pipelineArtifactsDone]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`absolute inset-0 backdrop-blur-sm ${
          isLight ? "bg-black/40" : "bg-black/70"
        }`}
        onClick={busy ? undefined : onClose}
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={`w-full max-w-[680px] rounded-2xl overflow-hidden shadow-2xl ${
            isLight
              ? "border border-black/10 bg-white"
              : "border border-white/[0.08] bg-[#070707]/95 shadow-black/60 backdrop-blur-2xl"
          }`}
        >
          <div
            className={`flex items-center justify-between px-5 py-4 border-b ${
              isLight ? "border-black/10" : "border-white/[0.06]"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-tap-red/10 border border-tap-red/20 flex items-center justify-center">
                <Briefcase size={16} className="text-tap-red" />
              </div>
              <div>
                <div
                  className={`font-semibold text-[14px] ${
                    isLight ? "text-black" : "text-white"
                  }`}
                >
                  Portfolio long
                </div>
                <div
                  className={`text-[12px] ${
                    isLight ? "text-black/60" : "text-white/40"
                  }`}
                >
                  Répondez aux questions, puis on lance scoring + génération.
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={busy}
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed ${
                isLight
                  ? "text-black/40 hover:text-black hover:bg-black/5"
                  : "text-white/30 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              <X size={16} />
            </button>
          </div>

          <div
            className={`px-5 py-3 border-b ${
              isLight ? "border-black/10" : "border-white/[0.06]"
            }`}
          >
            <div
              className={`flex items-center justify-between text-[11px] mb-2 ${
                isLight ? "text-black/45" : "text-white/35"
              }`}
            >
              <span>Progression</span>
              <span className={isLight ? "text-black/60" : "text-white/45"}>
                {progressLabel} • {progress}%
              </span>
            </div>
            <div
              className={`h-2 rounded-full overflow-hidden ${
                isLight ? "bg-black/5" : "bg-white/[0.06]"
              }`}
            >
              <div
                className="h-full bg-tap-red transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="px-5 py-5 space-y-4">
            {showPipelineWorking ? (
              <div
                className={`rounded-xl border p-6 ${
                  isLight
                    ? "border-black/10 bg-black/[0.02]"
                    : "border-white/[0.06] bg-white/[0.03]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Loader2
                    size={18}
                    className={`animate-spin shrink-0 mt-0.5 ${
                      isLight ? "text-black/70" : "text-white/70"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-[13px] font-medium ${
                        isLight ? "text-black/80" : "text-white/85"
                      }`}
                    >
                      Scoring + portfolio long en cours de génération…
                    </div>
                    <div
                      className={`text-[12px] mt-1 ${
                        isLight ? "text-black/50" : "text-white/40"
                      }`}
                    >
                      Vous pouvez fermer cette fenêtre, ça continue en arrière-plan.
                    </div>
                    <div className="mt-4 space-y-2">
                      <div
                        className={`flex items-center gap-2 text-[12px] ${
                          isLight ? "text-black/70" : "text-white/65"
                        }`}
                      >
                        {bgScoringDone ? (
                          <Check size={14} className="shrink-0 text-emerald-600" />
                        ) : (
                          <Loader2 size={14} className="shrink-0 animate-spin opacity-70" />
                        )}
                        <span>Scoring — {bgScoringDone ? "terminé" : "en cours…"}</span>
                      </div>
                      <div
                        className={`flex items-center gap-2 text-[12px] ${
                          isLight ? "text-black/70" : "text-white/65"
                        }`}
                      >
                        {bgLongPdfFrDone ? (
                          <Check size={14} className="shrink-0 text-emerald-600" />
                        ) : (
                          <Loader2 size={14} className="shrink-0 animate-spin opacity-70" />
                        )}
                        <span>
                          PDF portfolio long français — {bgLongPdfFrDone ? "prêt" : "en cours…"}
                        </span>
                      </div>
                      <div
                        className={`flex items-center gap-2 text-[12px] ${
                          isLight ? "text-black/70" : "text-white/65"
                        }`}
                      >
                        {bgLongPdfEnDone ? (
                          <Check size={14} className="shrink-0 text-emerald-600" />
                        ) : (
                          <Loader2 size={14} className="shrink-0 animate-spin opacity-70" />
                        )}
                        <span>
                          PDF portfolio long anglais — {bgLongPdfEnDone ? "prêt" : "en cours…"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : bgPollTimedOut && !pipelineArtifactsDone ? (
              <div
                className={`rounded-xl border p-6 ${
                  isLight
                    ? "border-amber-200/80 bg-amber-50/60"
                    : "border-amber-500/25 bg-amber-500/[0.07]"
                }`}
              >
                <div
                  className={`text-[13px] font-medium ${
                    isLight ? "text-black/85" : "text-white/90"
                  }`}
                >
                  Génération toujours en cours
                </div>
                <div
                  className={`text-[12px] mt-2 leading-relaxed ${
                    isLight ? "text-black/55" : "text-white/45"
                  }`}
                >
                  Le délai d’attente dans cette fenêtre est dépassé, mais le traitement peut encore
                  tourner côté serveur. Vérifiez bientôt la liste des PDF portfolio long dans vos
                  fichiers.
                </div>
                <div className="mt-3 space-y-2">
                  <div
                    className={`flex items-center gap-2 text-[12px] ${
                      isLight ? "text-black/65" : "text-white/55"
                    }`}
                  >
                    {bgScoringDone ? (
                      <Check size={14} className="shrink-0 text-emerald-600" />
                    ) : (
                      <span className="w-[14px] shrink-0 rounded-full h-1.5 bg-black/15 dark:bg-white/20" />
                    )}
                    <span>Scoring — {bgScoringDone ? "terminé" : "statut inconnu / en cours"}</span>
                  </div>
                  <div
                    className={`flex items-center gap-2 text-[12px] ${
                      isLight ? "text-black/65" : "text-white/55"
                    }`}
                  >
                    {bgLongPdfFrDone ? (
                      <Check size={14} className="shrink-0 text-emerald-600" />
                    ) : (
                      <span className="w-[14px] shrink-0 rounded-full h-1.5 bg-black/15 dark:bg-white/20" />
                    )}
                    <span>
                      PDF portfolio long français —{" "}
                      {bgLongPdfFrDone ? "prêt" : "pas encore détecté"}
                    </span>
                  </div>
                  <div
                    className={`flex items-center gap-2 text-[12px] ${
                      isLight ? "text-black/65" : "text-white/55"
                    }`}
                  >
                    {bgLongPdfEnDone ? (
                      <Check size={14} className="shrink-0 text-emerald-600" />
                    ) : (
                      <span className="w-[14px] shrink-0 rounded-full h-1.5 bg-black/15 dark:bg-white/20" />
                    )}
                    <span>
                      PDF portfolio long anglais —{" "}
                      {bgLongPdfEnDone ? "prêt" : "pas encore détecté"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div
                  className={`rounded-xl border p-4 ${
                    isLight
                      ? "border-black/10 bg-black/[0.015]"
                      : "border-white/[0.06] bg-white/[0.03]"
                  }`}
                >
                  {startChat.isPending && !sessionId ? (
                    <div
                      className={`flex items-center gap-2 text-[13px] ${
                        isLight ? "text-black/50" : "text-white/50"
                      }`}
                    >
                      <Loader2 size={14} className="animate-spin" />
                      Démarrage du chatbot…
                    </div>
                  ) : question ? (
                    <div
                      className={`text-[13px] leading-relaxed ${
                        isLight ? "text-black/80" : "text-white/80"
                      }`}
                    >
                      {question}
                    </div>
                  ) : isComplete ? (
                    <div
                      className={`text-[13px] ${
                        isLight ? "text-black/70" : "text-white/70"
                      }`}
                    >
                      Toutes les informations ont été collectées.
                    </div>
                  ) : (
                    <div
                      className={`text-[13px] ${
                        isLight ? "text-black/50" : "text-white/50"
                      }`}
                    >
                      Aucune question disponible.
                    </div>
                  )}

                  {missingCount !== null && !isComplete && (
                    <div
                      className={`mt-3 text-[12px] ${
                        isLight ? "text-black/45" : "text-white/35"
                      }`}
                    >
                      Champs restants:{" "}
                      <span
                        className={`font-medium ${
                          isLight ? "text-black/70" : "text-white/55"
                        }`}
                      >
                        {missingCount}
                      </span>
                    </div>
                  )}
                </div>

                {(pipelineResult?.scoring || scoreGlobal !== null || decision) && (
                  <div
                    className={`rounded-xl border p-4 space-y-2 ${
                      isLight
                        ? "border-black/10 bg-black/[0.02]"
                        : "border-white/[0.06] bg-black/30"
                    }`}
                  >
                    <div
                      className={`font-semibold text-[13px] ${
                        isLight ? "text-black" : "text-white"
                      }`}
                    >
                      Résultat du scoring
                    </div>
                    <div
                      className={`text-[13px] ${
                        isLight ? "text-black/70" : "text-white/60"
                      }`}
                    >
                      Score global:{" "}
                      <span
                        className={`font-medium ${
                          isLight ? "text-black" : "text-white"
                        }`}
                      >
                        {scoreGlobal !== null && scoreGlobal !== undefined ? Number(scoreGlobal).toFixed(2) : "—"}
                      </span>
                      {decision ? (
                        <>
                          {" "}
                          • Décision:{" "}
                          <span
                            className={`font-medium ${
                              isLight ? "text-black" : "text-white"
                            }`}
                          >
                            {String(decision)}
                          </span>
                        </>
                      ) : null}
                    </div>
                    {generationMessage ? (
                      <div
                        className={`text-[12px] ${
                          isLight ? "text-black/55" : "text-white/40"
                        }`}
                      >
                        {generationMessage}
                      </div>
                    ) : pipelineResult?.generation?.success ? (
                      <div
                        className={`text-[12px] ${
                          isLight ? "text-black/55" : "text-white/40"
                        }`}
                      >
                        Génération du portfolio long lancée. Le PDF apparaîtra dans la liste dans quelques instants.
                      </div>
                    ) : null}
                  </div>
                )}
              </>
            )}

            {!isComplete && (
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSend();
                  }}
                  disabled={busy || !sessionId}
                  placeholder="Votre réponse…"
                  className={`flex-1 h-11 px-4 rounded-xl text-[13px] outline-none transition disabled:opacity-50 ${
                    isLight
                      ? "bg-black/5 border border-black/15 text-black placeholder:text-black/30 focus:border-black/30"
                      : "bg-black/40 border border-white/[0.08] text-white/80 placeholder:text-white/25 focus:border-white/[0.18]"
                  }`}
                />
                <button
                  onClick={handleSend}
                  disabled={busy || !sessionId || !input.trim()}
                  className="h-11 px-4 rounded-xl bg-tap-red/10 hover:bg-tap-red/20 border border-tap-red/20 text-tap-red text-[13px] font-medium inline-flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendMessage.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Envoyer
                </button>
              </div>
            )}
          </div>

          <div
            className={`px-5 py-4 border-t flex items-center justify-between gap-3 ${
              isLight ? "border-black/10" : "border-white/[0.06]"
            }`}
          >
            <div
              className={`text-[12px] ${
                isLight ? "text-black/55" : "text-white/35"
              }`}
            >
              {pipelineArtifactsDone
                ? "Scoring et PDF portfolio long (FR + EN) à jour."
                : bgPollTimedOut && !pipelineArtifactsDone
                  ? "Délai dépassé : vérifiez vos fichiers dans quelques instants."
                  : pipelineResult?.success
                    ? "Traitement lancé — l’état ci-dessus indique quand tout est prêt."
                    : isComplete
                      ? "Prêt à lancer le scoring et la génération."
                      : "Terminez le questionnaire pour continuer."}
            </div>
            <button
              onClick={handleRun}
              disabled={!isComplete || busy || Boolean(pipelineResult)}
              className="h-10 px-4 rounded-xl bg-tap-red text-white text-[13px] font-semibold hover:bg-tap-red-hover transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {runPipeline.isPending || awaitingBackgroundArtifacts ? (
                <Loader2 size={14} className="animate-spin" />
              ) : null}
              {pipelineResult ? "Terminé" : "Lancer scoring + génération"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

