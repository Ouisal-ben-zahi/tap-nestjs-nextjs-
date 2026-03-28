import type {
  PublicJobItem,
  RecruiterJobPayload,
  RecruiterOverviewStats,
} from '@shared/types/recruteur';

export type RecruteurOverview = RecruiterOverviewStats;

// Mapping simple pour le front : Job correspond au job retourné côté public
export type Job = PublicJobItem & {
  applicationCount?: number;
  /** ACTIVE | INACTIVE — renvoyé par l’API recruteur */
  status?: string | null;
};

export type JobPayload = RecruiterJobPayload;

