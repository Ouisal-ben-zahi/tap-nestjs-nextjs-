"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MessageSquare, Loader2, Mic, Square, PlayCircle } from "lucide-react";
import { candidatService } from "@/services/candidat.service";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";
import { useUiStore } from "@/stores/ui";

export default function EntretienSimulationPage() {
  const params = useSearchParams();
  const sessionId = (params.get("sessionId") || "").trim();
  const theme = useDashboardTheme();
  const isLight = theme === "light";
  const addToast = useUiStore((s) => s.addToast);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const lastPlayedRef = useRef<string>("");

  const statusQuery = useQuery({
    queryKey: ["interview", "status", sessionId],
    queryFn: () => candidatService.getInterviewSimulationStatus(sessionId),
    enabled: Boolean(sessionId),
    refetchInterval: (q) => {
      const st = (q.state.data as any)?.status;
      return st === "completed" ? 10000 : 2000;
    },
  });

  const audioQuery = useQuery({
    queryKey: ["interview", "audio", sessionId],
    queryFn: () => candidatService.getInterviewSimulationAudio(sessionId),
    enabled: Boolean(sessionId),
    refetchInterval: (q) => {
      const st = statusQuery.data?.status;
      return st === "completed" ? 10000 : 2000;
    },
  });

  const evaluationQuery = useQuery({
    queryKey: ["interview", "evaluation", sessionId],
    queryFn: () => candidatService.getInterviewSimulationEvaluation(sessionId),
    enabled: Boolean(sessionId && statusQuery.data?.status === "completed"),
    refetchInterval: false,
  });

  const evaluation = evaluationQuery.data?.evaluation as Record<string, any> | undefined;
  const evalScore =
    evaluation?.score_global ??
    evaluation?.score ??
    evaluation?.global_score ??
    evaluation?.note_finale;
  const evalDecision =
    evaluation?.decision ??
    evaluation?.recommendation ??
    evaluation?.verdict;
  const evalSummary =
    evaluation?.commentaire_global ??
    evaluation?.summary ??
    evaluation?.resume ??
    evaluation?.commentaire;
  const evalStrengths: string[] = Array.isArray(evaluation?.points_forts)
    ? evaluation?.points_forts
    : Array.isArray(evaluation?.strengths)
      ? evaluation?.strengths
      : [];
  const evalImprovements: string[] = Array.isArray(evaluation?.axes_amelioration)
    ? evaluation?.axes_amelioration
    : Array.isArray(evaluation?.improvements)
      ? evaluation?.improvements
      : [];

  const sendAudioMutation = useMutation({
    mutationFn: (file: File) => candidatService.sendInterviewSimulationAudio(sessionId, file),
    onSuccess: () => {
      addToast({ message: "Réponse envoyée. L'IA prépare la suite...", type: "success" });
      statusQuery.refetch();
      audioQuery.refetch();
    },
    onError: () => {
      addToast({ message: "Erreur lors de l'envoi de votre audio", type: "error" });
    },
  });

  const currentQuestionAudio = useMemo(() => {
    const files = audioQuery.data?.audio_files || [];
    const currentQuestion = statusQuery.data?.current_question ?? 0;
    const questionFiles = files
      .filter((f) => f.type === "question" && f.file_url)
      .filter((f) =>
        typeof f.question_number === "number" ? f.question_number === currentQuestion : true,
      );
    return questionFiles.length ? questionFiles[questionFiles.length - 1] : null;
  }, [audioQuery.data?.audio_files, statusQuery.data?.current_question]);

  const interviewTypeLabel = useMemo(() => {
    const t = String((statusQuery.data as any)?.interview_type || "").trim().toLowerCase();
    switch (t) {
      case "technical":
        return "technique";
      case "behavioral":
        return "comportemental";
      case "presentation":
        return "présentation personnelle";
      case "hr":
        return "RH";
      default:
        return "technique";
    }
  }, [statusQuery.data]);

  useEffect(() => {
    return () => {
      try {
        mediaRecorderRef.current?.stop();
      } catch {
        // noop
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    const url = currentQuestionAudio?.file_url || "";
    if (!url || lastPlayedRef.current === url) return;
    lastPlayedRef.current = url;
    const a = new Audio(url);
    // Retry progressif: certains navigateurs ratent le premier play()
    // quand l'URL vient juste d'être disponible.
    const tryPlay = (attempt: number) => {
      a.play().catch(() => {
        if (attempt < 4) {
          window.setTimeout(() => tryPlay(attempt + 1), 350 * attempt);
        } else {
          addToast({
            message: "Nouvelle question disponible. Clique sur 'Écouter la question'.",
            type: "success",
          });
        }
      });
    };
    tryPlay(1);
  }, [currentQuestionAudio?.file_url]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `response-${Date.now()}.webm`, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (blob.size < 2000) {
          addToast({ message: "Audio trop court. Parlez au moins 2-3 secondes.", type: "error" });
          return;
        }
        sendAudioMutation.mutate(file);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      addToast({ message: "Accès micro refusé ou indisponible", type: "error" });
    }
  }

  function stopRecording() {
    try {
      mediaRecorderRef.current?.stop();
    } catch {
      // noop
    }
    setIsRecording(false);
  }

  return (
    <div className="max-w-[920px] mx-auto">
      <div className={`rounded-2xl p-6 ${isLight ? "card-luxury-light" : "bg-zinc-900/50 border border-white/[0.06]"}`}>
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare className="text-purple-500" size={18} />
          <h1 className={`text-[22px] font-semibold ${isLight ? "text-black" : "text-white"}`}>
            Simulation entretien {interviewTypeLabel}
          </h1>
        </div>

        {!sessionId ? (
          <p className={isLight ? "text-black/70" : "text-white/60"}>
            Session introuvable. Retournez sur la page entretien pour relancer la simulation.
          </p>
        ) : statusQuery.isLoading ? (
          <div className="flex items-center gap-2 text-purple-500">
            <Loader2 className="animate-spin" size={16} />
            <span>Chargement du statut...</span>
          </div>
        ) : statusQuery.isError ? (
          <p className="text-red-500">Impossible de charger le statut de la simulation.</p>
        ) : (
          <div className="space-y-3">
            <p className={isLight ? "text-black/70" : "text-white/70"}>
              <span className="font-semibold">Statut:</span> {statusQuery.data?.status}
            </p>
            <p className={isLight ? "text-black/70" : "text-white/70"}>
              <span className="font-semibold">Progression:</span> {statusQuery.data?.current_question ?? 0}/{statusQuery.data?.total_questions ?? 5}
            </p>
            {statusQuery.data?.status === "generating_audio" ? (
              <p className={isLight ? "text-black/70" : "text-white/70"}>
                L'IA prépare l'audio de la prochaine question...
              </p>
            ) : null}
            {(statusQuery.data?.intro_text || "").trim() ? (
              <p className={isLight ? "text-black/80" : "text-white/80"}>
                <span className="font-semibold">Introduction:</span> {statusQuery.data?.intro_text}
              </p>
            ) : null}
            {(statusQuery.data?.current_question_text || "").trim() ? (
              <p className={isLight ? "text-black/90" : "text-white"}>
                <span className="font-semibold">Question courante:</span> {statusQuery.data?.current_question_text}
              </p>
            ) : null}
            {currentQuestionAudio?.file_url ? (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const a = new Audio(currentQuestionAudio.file_url as string);
                    a.play().catch(() => {});
                  }}
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  <PlayCircle size={14} />
                  Écouter la question
                </button>
              </div>
            ) : null}
            {(statusQuery.data?.error || "").trim() ? (
              <p className="text-red-500">
                <span className="font-semibold">Erreur:</span> {statusQuery.data?.error}
              </p>
            ) : null}
            {statusQuery.data?.status === "completed" ? (
              <div className={`mt-2 p-4 rounded-xl ${isLight ? "bg-black/[0.03] border border-black/10" : "bg-white/[0.03] border border-white/[0.08]"}`}>
                <p className={isLight ? "text-black font-semibold mb-2" : "text-white font-semibold mb-2"}>
                  Évaluation finale
                </p>
                {evaluationQuery.isLoading ? (
                  <p className={isLight ? "text-black/70" : "text-white/70"}>Chargement de l'évaluation...</p>
                ) : evaluationQuery.isError ? (
                  <p className="text-red-500">Impossible de récupérer l'évaluation.</p>
                ) : evaluationQuery.data?.evaluation ? (
                  <div className="space-y-3">
                    {(evalScore !== undefined && evalScore !== null) || evalDecision ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {evalScore !== undefined && evalScore !== null ? (
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isLight ? "bg-black/10 text-black" : "bg-white/10 text-white"}`}>
                            Score: {String(evalScore)}
                          </span>
                        ) : null}
                        {evalDecision ? (
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isLight ? "bg-tap-red/15 text-black" : "bg-tap-red/25 text-white"}`}>
                            Décision: {String(evalDecision)}
                          </span>
                        ) : null}
                      </div>
                    ) : null}

                    {evalSummary ? (
                      <p className={isLight ? "text-black/80 text-sm" : "text-white/80 text-sm"}>
                        {String(evalSummary)}
                      </p>
                    ) : null}

                    {evalStrengths.length ? (
                      <div>
                        <p className={isLight ? "text-black font-medium text-sm mb-1" : "text-white font-medium text-sm mb-1"}>
                          Points forts
                        </p>
                        <ul className={isLight ? "text-black/80 text-sm space-y-1" : "text-white/80 text-sm space-y-1"}>
                          {evalStrengths.map((item, idx) => (
                            <li key={`strength-${idx}`}>- {String(item)}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {evalImprovements.length ? (
                      <div>
                        <p className={isLight ? "text-black font-medium text-sm mb-1" : "text-white font-medium text-sm mb-1"}>
                          Axes d'amélioration
                        </p>
                        <ul className={isLight ? "text-black/80 text-sm space-y-1" : "text-white/80 text-sm space-y-1"}>
                          {evalImprovements.map((item, idx) => (
                            <li key={`improve-${idx}`}>- {String(item)}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {!evalSummary && !evalStrengths.length && !evalImprovements.length ? (
                      <details>
                        <summary className={isLight ? "text-black/70 text-sm cursor-pointer" : "text-white/70 text-sm cursor-pointer"}>
                          Voir les détails techniques
                        </summary>
                        <pre className={`mt-2 text-xs whitespace-pre-wrap ${isLight ? "text-black/80" : "text-white/80"}`}>
                          {JSON.stringify(evaluationQuery.data.evaluation, null, 2)}
                        </pre>
                      </details>
                    ) : null}
                  </div>
                ) : (
                  <p className={isLight ? "text-black/70" : "text-white/70"}>
                    Évaluation non disponible pour le moment.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              disabled={!sessionId || sendAudioMutation.isPending}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Mic size={14} />
              Répondre à l'oral
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Square size={14} />
              Stop et envoyer
            </button>
          )}
          {sendAudioMutation.isPending ? (
            <span className={isLight ? "text-black/60 text-sm" : "text-white/60 text-sm"}>
              Envoi et traitement en cours...
            </span>
          ) : null}
          <Link href="/app/entretien" className="btn-secondary">Retour</Link>
        </div>
      </div>
    </div>
  );
}
