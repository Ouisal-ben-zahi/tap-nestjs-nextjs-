import api from '@/lib/api';
import type { RecruteurOverview, Job, JobPayload } from '@/types/recruteur';

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
};
