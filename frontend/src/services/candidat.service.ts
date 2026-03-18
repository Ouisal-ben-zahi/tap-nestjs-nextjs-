import api from '@/lib/api';
import type {
  CandidatStats,
  Application,
  CvFile,
  TalentCardFile,
  PortfolioPdfFile,
  PortfolioProject,
  CandidatScore,
} from '@/types/candidat';

export const candidatService = {
  getStats: () =>
    api.get<CandidatStats>('/dashboard/candidat/stats').then((r) => r.data),

  getScore: () =>
    api.get<CandidatScore>('/dashboard/candidat/score-json').then((r) => r.data),

  getPortfolio: () =>
    api.get<{ portfolio: PortfolioProject[] }>('/dashboard/candidat/portfolio').then((r) => r.data),

  getApplications: () =>
    api.get<{ applications: Application[] }>('/dashboard/candidat/applications').then((r) => r.data),

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
    api.get<{ jobs: { id: number; title: string | null; categorie_profil: string | null; created_at: string | null; urgent: boolean; location_type: string | null; }[] }>('/dashboard/jobs').then((r) => r.data),

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

  deleteCvFile: (path: string) =>
    api.delete('/dashboard/candidat/cv-file', { params: { path } }).then((r) => r.data),
};
