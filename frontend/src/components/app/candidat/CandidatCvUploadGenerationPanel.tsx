"use client";

import { useEffect, useMemo, useState } from "react";
import {
  hasFreshCorrectedCvTapPdf,
  isFreshGenerationTimestamp,
  listHasFreshTimestamp,
  portfolioOnePageSatisfiedForSession,
  talentcardReadyForSession,
} from "@/lib/candidat-upload-generation";

type GenerationStep = { id: string; label: string };

const generationSteps: GenerationStep[] = [
  { id: "upload", label: "Envoi des fichiers" },
  { id: "cv", label: "Analyse du CV" },
  { id: "talentCard", label: "Génération de la Talent Card" },
  { id: "cvPdf", label: "Génération du CV corrigé (PDF)" },
  { id: "scoring", label: "Calcul du scoring candidat" },
  { id: "portfolio", label: "Génération du Portfolio One Page" },
];

const progressByStep: Record<string, number> = {
  upload: 16,
  cv: 32,
  talentCard: 48,
  cvPdf: 62,
  scoring: 76,
  portfolio: 90,
};

type ScoreShape = {
  scoreGlobal?: number | null;
  dimensions?: unknown[] | null;
  metadataTimestamp?: string | null;
} | null;

type Props = {
  startedAtMs: number;
  isLight: boolean;
  cvFiles: Array<{
    name?: string;
    updatedAt?: string | null;
    createdAt?: string | null;
  }>;
  talentcardFiles: Array<{
    updatedAt?: string | null;
    createdAt?: string | null;
  }>;
  score: ScoreShape;
  portfolioShort: Array<{
    updatedAt?: string | null;
    createdAt?: string | null;
  }>;
  portfolioLong: Array<{
    updatedAt?: string | null;
    createdAt?: string | null;
  }>;
};

/**
 * Même logique que l’étape 4 de l’onboarding : suivi des artefacts après upload CV.
 */
export default function CandidatCvUploadGenerationPanel({
  startedAtMs,
  isLight,
  cvFiles,
  talentcardFiles,
  score,
  portfolioShort,
  portfolioLong,
}: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 2000);
    return () => window.clearInterval(id);
  }, [startedAtMs]);

  const elapsedMs = now - startedAtMs;

  const flags = useMemo(() => {
    const readyTalentCard =
      Array.isArray(talentcardFiles) &&
      talentcardReadyForSession(talentcardFiles, cvFiles, startedAtMs, elapsedMs);
    const readyCvPdf =
      Array.isArray(cvFiles) && hasFreshCorrectedCvTapPdf(cvFiles, startedAtMs);
    const cvTapAndTalentFresh = readyTalentCard && readyCvPdf;
    // Ne pas marquer le scoring « OK » sur un score ancien dès 30 s : attendre preuve de pipeline (TAP + talent) + délai.
    const scoringFallbackOk =
      elapsedMs > 90_000 &&
      cvTapAndTalentFresh &&
      (typeof score?.scoreGlobal === "number" ||
        (Array.isArray(score?.dimensions) && score.dimensions.length > 0));
    const readyScoring =
      isFreshGenerationTimestamp(score?.metadataTimestamp ?? null, startedAtMs) ||
      scoringFallbackOk;
    const readyPortfolio =
      listHasFreshTimestamp(portfolioShort, startedAtMs) ||
      listHasFreshTimestamp(portfolioLong, startedAtMs) ||
      portfolioOnePageSatisfiedForSession({
        portfolioShort,
        portfolioLong,
        startedAtMs,
        elapsedMs,
        prerequisiteStepsDone: readyTalentCard && readyCvPdf && readyScoring,
        cvTapAndTalentFreshForSession: cvTapAndTalentFresh,
      });

    return {
      upload: true,
      cv: true,
      talentCard: readyTalentCard,
      cvPdf: readyCvPdf,
      scoring: readyScoring,
      portfolio: readyPortfolio,
    };
  }, [
    cvFiles,
    talentcardFiles,
    score,
    portfolioShort,
    portfolioLong,
    startedAtMs,
    elapsedMs,
  ]);

  const stepOrder = generationSteps.map((s) => s.id);
  const currentGenerationStep =
    stepOrder.find((id) => !flags[id as keyof typeof flags]) ?? "portfolio";

  const generationProgress = useMemo(() => {
    if (flags.portfolio) return 100;
    const id = currentGenerationStep;
    return progressByStep[id] ?? 32;
  }, [flags.portfolio, currentGenerationStep]);

  const allDone = flags.talentCard && flags.cvPdf && flags.scoring && flags.portfolio;

  return (
    <div
      className={`rounded-2xl border p-5 ${
        isLight
          ? "border-black/10 bg-black/[0.02]"
          : "border-white/[0.08] bg-white/[0.03]"
      }`}
    >
      <div className="mb-2 flex items-center justify-between text-[12px]">
        <span className={isLight ? "text-black/75" : "text-white/80"}>
          Progression de la génération
        </span>
        <span
          className={`font-semibold ${isLight ? "text-black" : "text-white"}`}
        >
          {generationProgress}%
        </span>
      </div>
      <div
        className={`h-2 w-full overflow-hidden rounded-full ${
          isLight ? "bg-black/8" : "bg-white/10"
        }`}
      >
        <div
          className="h-full rounded-full bg-tap-red transition-all duration-500 ease-out"
          style={{ width: `${generationProgress}%` }}
        />
      </div>
      <p
        className={`mt-3 text-[11px] leading-relaxed ${
          isLight ? "text-black/50" : "text-white/40"
        }`}
      >
        L&apos;IA génère vos fichiers (Talent Card, CV corrigé, scoring, portfolio court). Cela peut
        prendre une à plusieurs minutes.
      </p>
      <div className="mt-4 space-y-2">
        {generationSteps.map((step) => {
          const isDone = flags[step.id as keyof typeof flags];
          const isCurrent = currentGenerationStep === step.id && !isDone;
          return (
            <div
              key={step.id}
              className="flex items-center justify-between text-[12px]"
            >
              <span
                className={
                  isDone
                    ? isLight
                      ? "text-emerald-700"
                      : "text-emerald-300"
                    : isCurrent
                      ? isLight
                        ? "text-black"
                        : "text-white"
                      : isLight
                        ? "text-black/40"
                        : "text-white/45"
                }
              >
                {step.label}
              </span>
              <span
                className={
                  isDone
                    ? isLight
                      ? "text-emerald-700"
                      : "text-emerald-300"
                    : isCurrent
                      ? "text-tap-red"
                      : isLight
                        ? "text-black/35"
                        : "text-white/40"
                }
              >
                {isDone ? "Terminé" : isCurrent ? "En cours…" : "En attente"}
              </span>
            </div>
          );
        })}
      </div>
      {allDone ? (
        <p
          className={`mt-4 text-[12px] font-medium ${
            isLight ? "text-emerald-800" : "text-emerald-300/95"
          }`}
        >
          Génération terminée — vos fichiers apparaissent dans les onglets ci-dessus.
        </p>
      ) : null}
    </div>
  );
}
