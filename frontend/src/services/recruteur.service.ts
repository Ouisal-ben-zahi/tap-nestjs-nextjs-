import api from '@/lib/api';
import type { RecruteurOverview, Job, JobPayload } from '@/types/recruteur';

export type MatchedCandidate = {
  candidate_id: number | null;
  name: string | null;
  global_score: number | null;
  skill_score: number | null;
  experience_score: number | null;
  language_score: number | null;
  seniority_score: number | null;
  missing_skills: string[] | string | null;
  candidate?: {
    id?: number;
    nom?: string | null;
    prenom?: string | null;
    titre_profil?: string | null;
    categorie_profil?: string | null;
    ville?: string | null;
    pays?: string | null;
    niveau_seniorite?: string | null;
    disponibilite?: string | null;
  } | null;
};

export type MatchByOfferResponse = {
  job_id: number;
  job_title: string;
  candidates: MatchedCandidate[];
  message?: string;
};

export const recruteurService = {
  getOverview: () =>
    api.get<RecruteurOverview>('/dashboard/recruteur/overview').then((r) => r.data),

  getJobs: () =>
    api.get<{ jobs: Job[] }>('/dashboard/recruteur/jobs').then((r) => r.data),

  createJob: (payload: JobPayload) =>
    api.post<Job>('/dashboard/recruteur/jobs', payload).then((r) => r.data),

  updateJobStatus: (jobId: number, status: 'ACTIVE' | 'INACTIVE') =>
    api
      .post<{ success: true }>(`/dashboard/recruteur/jobs/${jobId}/status`, {
        status,
      })
      .then((r) => r.data),

  getMatchedCandidatesByOffer: (jobId: number) =>
    api
      .post<MatchByOfferResponse>('/dashboard/recruteur/match-by-offre', {
        job_id: jobId,
        top_n: 20,
        only_postule: true,
      })
      .then((r) => r.data),
};
