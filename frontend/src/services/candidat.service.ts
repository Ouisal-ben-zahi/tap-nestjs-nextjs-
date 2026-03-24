import api from '@/lib/api';
import type {
  CandidatStats,
  Application,
  CvFile,
  TalentCardFile,
  PortfolioPdfFile,
  PortfolioProject,
  CandidatScore,
  CandidatProfile,
} from '@/types/candidat';

/** Jobs listés côté dashboard (et scoring optionnel pour le matching IA). */
type DashboardJobsResponse = {
  jobs: Array<{
    id: number;
    title: string | null;
    categorie_profil: string | null;
    created_at: string | null;
    urgent: boolean;
    location_type: string | null;
    score?: number | null;
  }>;
};

const fetchDashboardJobs = () =>
  api.get<DashboardJobsResponse>('/dashboard/jobs').then((r) => r.data);

const fetchMatchingJobs = () =>
  api
    .get<DashboardJobsResponse>('/dashboard/candidat/matching-jobs')
    .then((r) => r.data)
    .catch((error) => {
      if (typeof window !== 'undefined') {
        // Keep UI resilient while backend identity/matching stabilizes.
        // We still log for debugging without breaking the page.
        // eslint-disable-next-line no-console
        console.warn('[matching-jobs] fallback to empty list:', {
          status: error?.response?.status ?? null,
          message: error?.response?.data?.message ?? error?.message ?? 'unknown',
        });
      }
      return { jobs: [] } as DashboardJobsResponse;
    });

export const candidatService = {
  getStats: () =>
    api.get<CandidatStats>('/dashboard/candidat/stats').then((r) => r.data),

  getScore: () =>
    api.get<CandidatScore>('/dashboard/candidat/score-json').then((r) => r.data),

  getPortfolio: () =>
    api.get<{ portfolio: PortfolioProject[] }>('/dashboard/candidat/portfolio').then((r) => r.data),

  getApplications: () =>
    api.get<{ applications: Application[] }>('/dashboard/candidat/applications').then((r) => r.data),

  getProfile: () =>
    api.get<CandidatProfile>('/dashboard/candidat/profile').then((r) => r.data),

  updateProfile: (payload: Partial<CandidatProfile>) =>
    api.put<CandidatProfile>('/dashboard/candidat/profile', payload).then((r) => r.data),

  getCvFiles: () =>
    api.get<{ cvFiles: CvFile[] }>('/dashboard/candidat/cv-files').then((r) => r.data),

  getTalentcardFiles: () =>
    api.get<{ talentcardFiles: TalentCardFile[] }>('/dashboard/candidat/talentcard-files').then((r) => r.data),

  getPortfolioPdfFiles: () =>
    api.get<{ portfolioShort: any[]; portfolioLong: any[] }>('/dashboard/candidat/portfolio-pdf-files').then((r) => {
      const short = (r.data.portfolioShort || []).map((f: any) => ({ ...f, type: 'short' as const }));
      const long = (r.data.portfolioLong || []).map((f: any) => ({ ...f, type: 'long' as const }));
      return { portfolioPdfFiles: [...short, ...long] };
    }),

  getPublicJobs: () =>
    api.get<{
      jobs: {
        id: number;
        title: string | null;
        categorie_profil: string | null;
        created_at: string | null;
        urgent: boolean;
        location_type: string | null;
        niveau_attendu: string | null;
        experience_min: string | null;
        presence_sur_site: string | null;
        localisation: string | null;
        reason: string | null;
        main_mission: string | null;
        tasks_other: string | null;
        disponibilite: string | null;
        salary_min: number | null;
        salary_max: number | null;
        contrat: string | null;
        niveau_seniorite: string | null;
        entreprise: string | null;
        phone: string | null;
        tasks: any[] | null;
        skills: any[] | null;
        languages: any[] | null;
      }[];
    }>('/dashboard/jobs').then((r) => r.data),

  applyToJob: (payload: {
    jobId: number;
    cvPath?: string | null;
    portfolioPath?: string | null;
    talentCardPath?: string | null;
    lien?: string | null;
  }) =>
    api
      .post('/dashboard/candidat/apply-job', payload)
      .then((r) => r.data as { success: boolean; applicationId: number; status: string }),

  /** Endpoint dédié au matching IA avec fallback défensif côté client. */
  getMatchingJobs: () => fetchMatchingJobs(),

  uploadCv: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/dashboard/candidat/upload-cv', formData).then((r) => r.data);
  },

  generatePortfolioLong: (lang: 'fr' | 'en' = 'fr') =>
    api
      .post('/dashboard/candidat/generate-portfolio-long', { lang })
      .then((r) => r.data as { success: boolean; message?: string }),

  startPortfolioLongChat: (lang: 'fr' | 'en' = 'fr') =>
    api
      .post('/dashboard/candidat/portfolio-long/start', { lang })
      .then((r) => r.data as { success: boolean; session_id?: string; question?: string | null; is_complete?: boolean; profile?: any; missing_fields?: any }),

  sendPortfolioLongChatMessage: (sessionId: string, message: string) =>
    api
      .post(`/dashboard/candidat/portfolio-long/${encodeURIComponent(sessionId)}/message`, { message })
      .then((r) => r.data as { success: boolean; session_id?: string; question?: string | null; is_complete?: boolean; profile?: any; missing_fields?: any; filled_field?: string | null; message?: string }),

  getPortfolioLongChatState: (sessionId: string) =>
    api
      .get(`/dashboard/candidat/portfolio-long/${encodeURIComponent(sessionId)}/state`)
      .then((r) => r.data as { success: boolean; session_id?: string; state?: any }),

  runPortfolioLongPipeline: (lang: 'fr' | 'en' = 'fr') =>
    api
      .post('/dashboard/candidat/portfolio-long/run', { lang })
      .then((r) => r.data as { success: boolean; scoring?: any; generation?: { success: boolean; message?: string } }),

  startInterviewSimulation: () =>
    api
      .post('/dashboard/candidat/interview/start')
      .then((r) => r.data as {
        success: boolean;
        session_id?: string;
        message?: string;
        status_url?: string;
        events_url?: string;
        audio_url?: string;
        evaluation_url?: string;
      }),

  getInterviewSimulationStatus: (sessionId: string) =>
    api
      .get(`/dashboard/candidat/interview/${encodeURIComponent(sessionId)}/status`)
      .then((r) => r.data as {
        session_id: string;
        status: string;
        current_question: number;
        total_questions: number;
        current_question_text: string;
        intro_text: string;
        error?: string | null;
      }),

  getInterviewSimulationAudio: (sessionId: string) =>
    api
      .get(`/dashboard/candidat/interview/${encodeURIComponent(sessionId)}/audio`)
      .then((r) => r.data as {
        session_id: string;
        audio_files: Array<{
          type: string;
          filename: string;
          text?: string;
          question_number?: number;
          file_url?: string;
        }>;
      }),

  sendInterviewSimulationAudio: (sessionId: string, file: File) => {
    const formData = new FormData();
    formData.append("audio", file);
    return api
      .post(`/dashboard/candidat/interview/${encodeURIComponent(sessionId)}/record`, formData)
      .then((r) => r.data);
  },

  getInterviewSimulationEvaluation: (sessionId: string) =>
    api
      .get(`/dashboard/candidat/interview/${encodeURIComponent(sessionId)}/evaluation`)
      .then((r) => r.data as { success: boolean; evaluation?: any; error?: string }),

  deleteCvFile: (path: string) =>
    api.delete('/dashboard/candidat/cv-file', { params: { path } }).then((r) => r.data),

  deleteTalentcardFile: (path: string) =>
    api
      .delete('/dashboard/candidat/talentcard-file', { params: { path } })
      .then((r) => r.data),

  deletePortfolioPdfFile: (path: string) =>
    api
      .delete('/dashboard/candidat/portfolio-pdf-file', { params: { path } })
      .then((r) => r.data),
};
