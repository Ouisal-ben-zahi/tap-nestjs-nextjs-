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

export type ValidateCandidateResponse = {
  success: boolean;
  applicationId: number;
  interviewQuestions?: Array<{
    id: string;
    text: string;
    category: string;
  }>;
  interviewQuestionsError?: string | null;
  interviewPdfPath?: string | null;
  interviewPdfUrl?: string | null;
};

export type SaveInterviewPdfResponse = {
  success: boolean;
  file_path?: string;
  file_url?: string | null;
  questions_count?: number;
};

export const recruteurService = {
  getOverview: () =>
    api.get<RecruteurOverview>('/dashboard/recruteur/overview').then((r) => r.data),

  getJobs: () =>
    api.get<{ jobs: Job[] }>('/dashboard/recruteur/jobs').then((r) => r.data),

  createJob: (payload: JobPayload) =>
    api.post<Job>('/dashboard/recruteur/jobs', payload).then((r) => r.data),

  getJob: (jobId: number) =>
    api.get<{ job: Record<string, unknown> }>(`/dashboard/recruteur/jobs/${jobId}`).then((r) => r.data),

  updateJob: (jobId: number, payload: JobPayload) =>
    api.put<{ job: Job }>(`/dashboard/recruteur/jobs/${jobId}`, payload).then((r) => r.data),

  deleteJob: (jobId: number) =>
    api.delete<{ success: true }>(`/dashboard/recruteur/jobs/${jobId}`).then((r) => r.data),

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

  validateCandidateForJob: (jobId: number, candidateId: number) =>
    api
      .post<ValidateCandidateResponse>('/dashboard/recruteur/candidatures/validate', {
        job_id: jobId,
        candidate_id: candidateId,
      })
      .then((r) => r.data),

  saveInterviewQuestionsPdf: (
    jobId: number,
    candidateId: number,
    questions?: Array<{ id: string; text: string; category: string }>,
  ) =>
    api
      .post<SaveInterviewPdfResponse>('/dashboard/recruteur/interview-questions/save-pdf', {
        job_id: jobId,
        candidate_id: candidateId,
        questions,
      })
      .then((r) => r.data),
};
