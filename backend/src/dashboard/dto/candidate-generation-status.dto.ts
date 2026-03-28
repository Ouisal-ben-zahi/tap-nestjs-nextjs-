export type GenerationStepRuntimeStatus =
  | 'pending'
  | 'in_progress'
  | 'completed';

/** Statut d’une étape de la chaîne CV → Talent Card → scoring → portfolio. */
export interface CandidateGenerationStepStatusDto {
  id: string;
  status: GenerationStepRuntimeStatus;
  label: string;
  /** Message court pour UI / toast (FR). */
  message: string;
}

/** Réponse de GET /dashboard/candidat/generation-status (et événements SSE). */
export interface CandidateGenerationStatusResponseDto {
  candidateId: number | null;
  steps: CandidateGenerationStepStatusDto[];
  /** Première étape non terminée (celle sur laquelle l’IA travaille). */
  currentStepId: string | null;
  progressPercent: number;
  allComplete: boolean;
  serverTime: string;
}
