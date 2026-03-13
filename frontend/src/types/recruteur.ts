import type {
  PublicJobItem,
  RecruiterJobPayload,
  RecruiterOverviewStats,
} from '@shared/types/recruteur';

export type RecruteurOverview = RecruiterOverviewStats;

// Mapping simple pour le front : Job correspond au job retourné côté public
export type Job = PublicJobItem & {
  applicationCount?: number;
};

export type JobPayload = RecruiterJobPayload;

