import api from '@/lib/api';
import type { RecruteurOverview, Job, JobPayload } from '@/types/recruteur';
import type { CvFile, PortfolioPdfFile } from '@/types/candidat';

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

export type RecruiterTalentcardFile = {
  name: string;
  path: string;
  publicUrl: string;
  updatedAt: string | null;
  size: number | null;
};

export type RecruiterCandidateBasicProfile = {
  candidateId: number;
  nom: string | null;
  prenom: string | null;
  pays: string | null;
  ville: string | null;
};

export type ScheduleRecruiterInterviewPayload = {
  job_id: number;
  candidate_id: number;
  interview_type: 'EN_LIGNE' | 'PRESENTIEL' | 'TELEPHONIQUE' | string;
  interview_date: string; // YYYY-MM-DD
  interview_time: string; // HH:MM
};

export type ScheduleRecruiterInterviewResponse = {
  success: boolean;
  interviewId: number;
  mailSent: boolean;
  mailError?: string | null;
  /** true si une ligne PLANIFIE existait déjà pour cette candidature (mise à jour) */
  updated?: boolean;
};

export type RecruiterScheduledInterviewDto = {
  id: number;
  interview_type: string;
  interview_date: string;
  interview_time: string;
};

export type RecruiterPlannedInterviewItem = {
  id: number;
  jobId: number;
  candidateId: number;
  candidateName: string | null;
  candidateAvatarUrl: string | null;
  jobTitle: string | null;
  interviewType: string;
  interviewDate: string | null;
  interviewTime: string | null;
};

export const recruteurService = {
  getOverview: () =>
    api.get<RecruteurOverview>('/dashboard/recruteur/overview').then((r) => r.data),

  getPlannedInterviews: () =>
    api
      .get<{ plannedInterviews: RecruiterPlannedInterviewItem[] }>(
        '/dashboard/recruteur/planned-interviews',
      )
      .then((r) => r.data),

  getCandidateTalentcardFiles: (candidateId: number) =>
    api
      .get<{ talentcardFiles: RecruiterTalentcardFile[] }>(
        `/dashboard/recruteur/candidats/${candidateId}/talentcard-files`,
      )
      .then((r) => r.data),

  getCandidatePortfolioPdfFiles: (candidateId: number) =>
    api
      .get<{ portfolioShort: CvFile[]; portfolioLong: CvFile[] }>(
        `/dashboard/candidat-id/${candidateId}/portfolio-pdf-files`,
      )
      .then((r) => {
        const short: PortfolioPdfFile[] = (r.data.portfolioShort || []).map((f) => ({
          ...f,
          type: 'short',
        }));
        const long: PortfolioPdfFile[] = (r.data.portfolioLong || []).map((f) => ({
          ...f,
          type: 'long',
        }));
        return { portfolioPdfFiles: [...short, ...long] };
      }),

  getCandidateBasicProfile: (candidateId: number) =>
    api
      .get<RecruiterCandidateBasicProfile>(
        `/dashboard/recruteur/candidats/${candidateId}/basic-profile`,
      )
      .then((r) => r.data),

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

  updateCandidateApplicationStatus: (params: {
    jobId: number;
    candidateId: number;
    status: 'EN_COURS' | 'ACCEPTEE' | 'REFUSEE';
  }) =>
    api
      .post<{
        success: boolean;
        applicationId: number;
        status: 'EN_COURS' | 'ACCEPTEE' | 'REFUSEE';
        validate: boolean;
        validatedAt: string | null;
      }>('/dashboard/recruteur/candidatures/status', {
        job_id: params.jobId,
        candidate_id: params.candidateId,
        status: params.status,
      })
      .then((r) => r.data),

  getScheduledInterviewForApplication: (jobId: number, candidateId: number) =>
    api
      .get<{ interview: RecruiterScheduledInterviewDto | null }>(
        '/dashboard/recruteur/scheduled-interviews',
        { params: { job_id: jobId, candidate_id: candidateId } },
      )
      .then((r) => r.data),

  scheduleRecruiterInterview: (payload: ScheduleRecruiterInterviewPayload) =>
    api
      .post<ScheduleRecruiterInterviewResponse>(
        '/dashboard/recruteur/scheduled-interviews',
        payload,
      )
      .then((r) => r.data),
};
