"use client";

import { useEffect, useMemo, useState } from "react";
import { Briefcase, Loader2, Send, X } from "lucide-react";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";
import {
  useCandidatScore,
  useRunPortfolioLongPipeline,
  useSendPortfolioLongChatMessage,
  useStartPortfolioLongChat,
} from "@/hooks/use-candidat";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function PortfolioLongChatModal({ open, onClose }: Props) {
  const startChat = useStartPortfolioLongChat();
  const sendMessage = useSendPortfolioLongChatMessage();
  const runPipeline = useRunPortfolioLongPipeline();
  const candidatScore = useCandidatScore();
  const theme = useDashboardTheme();
  const isLight = theme === "light";

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
                setPipelineResult(res ?? null);
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
        setPipelineResult(res ?? null);
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
    pipelineResult?.generation?.success
      ? "Génération du portfolio long lancée. Le PDF apparaîtra dans la liste dans quelques instants."
      : null;

  const generationDone = Boolean(pipelineResult?.generation?.success);
  const pipelineLaunched = Boolean(pipelineStartedAt) || autoRunTriggered;
  const pipelineInProgress = isComplete && pipelineLaunched && !generationDone && (runPipeline.isPending || pipelineSoftTimeout);

  const progressLabel = useMemo(() => {
    if (pipelineResult) return "Terminé";
    if (pipelineSoftTimeout) return "Génération en cours…";
    if (runPipeline.isPending) return "Scoring + génération…";
    if (sendMessage.isPending) return "Envoi…";
    if (startChat.isPending) return "Initialisation…";
    if (isComplete) return "Prêt";
    return "Collecte…";
  }, [pipelineResult, pipelineSoftTimeout, runPipeline.isPending, sendMessage.isPending, startChat.isPending, isComplete]);

  
  useEffect(() => {
   
    if (typeof missingCount === "number" && missingCount >= 0 && !runPipeline.isPending && !pipelineResult) {
      if (initialMissingTotal === null) {
        setInitialMissingTotal(Math.max(missingCount, 1));
      }
      const total = Math.max(initialMissingTotal ?? missingCount, 1);
      const doneRatio = 1 - Math.min(missingCount / total, 1);
      const next = Math.max(0, Math.min(70, Math.round(doneRatio * 70)));
      setProgress((p) => (pipelineResult ? 100 : Math.max(p, next)));
    }

   
    if (runPipeline.isPending && !pipelineResult) {
      const id = window.setInterval(() => {
        setProgress((p) => {
          const base = Math.max(p, 70);
          const next = Math.min(95, base + Math.max(1, Math.round((95 - base) * 0.08)));
          return next;
        });
      }, 250);
      return () => window.clearInterval(id);
    }

    // 3) Done (100)
    if (pipelineResult) {
      setProgress(100);
    }
  }, [missingCount, runPipeline.isPending, pipelineResult, initialMissingTotal]); 

  useEffect(() => {
    if (!pipelineStartedAt) return;
    if (pipelineResult) return;
    if (!runPipeline.isPending) return;

    const id = window.setInterval(() => {
      const elapsedMs = Date.now() - pipelineStartedAt;
      if (elapsedMs >= 12000) {
        setPipelineSoftTimeout(true);
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [pipelineStartedAt, runPipeline.isPending, pipelineResult]);

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
            {pipelineInProgress ? (
              <div
                className={`rounded-xl border p-6 ${
                  isLight
                    ? "border-black/10 bg-black/[0.02]"
                    : "border-white/[0.06] bg-white/[0.03]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Loader2
                    size={18}
                    className={`animate-spin ${
                      isLight ? "text-black/70" : "text-white/70"
                    }`}
                  />
                  <div>
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
              {pipelineResult
                ? "Scoring terminé, génération lancée."
                : isComplete
                  ? "Prêt à lancer le scoring et la génération."
                  : "Terminez le questionnaire pour continuer."}
            </div>
            <button
              onClick={handleRun}
              disabled={!isComplete || busy || Boolean(pipelineResult)}
              className="h-10 px-4 rounded-xl bg-tap-red text-white text-[13px] font-semibold hover:bg-tap-red-hover transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {runPipeline.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
              {pipelineResult ? "Terminé" : "Lancer scoring + génération"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

