'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiErrorMessage } from '@/lib/api-error';
import { recruteurService } from '@/services/recruteur.service';
import { useUiStore } from '@/stores/ui';
import type { JobPayload, RecruiterCompanyProfilePayload } from '@/types/recruteur';
import type { PortfolioPdfFile } from '@/types/candidat';
import { useAuthStore } from '@/stores/auth';

function useRecruiterAuthEnabled(enabled?: boolean) {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);
  const isRecruteur = user?.role === 'recruteur';
  return Boolean((enabled ?? true) && isHydrated && isRecruteur);
}

export function useRecruiterCompanyProfile(enabled?: boolean) {
  const authOk = useRecruiterAuthEnabled(enabled);
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    // Inclure l’utilisateur : évite un cache « profil OK » réutilisé par erreur entre comptes
    queryKey: ['recruteur', 'company-profile', userId ?? 'none'],
    queryFn: recruteurService.getCompanyProfile,
    enabled: authOk && userId != null,
    staleTime: 0,
    retry: 1,
  });
}

export function useUpsertRecruiterCompanyProfile() {
  const queryClient = useQueryClient();
  const addToast = useUiStore((s) => s.addToast);
  return useMutation({
    mutationFn: (payload: RecruiterCompanyProfilePayload) =>
      recruteurService.upsertCompanyProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruteur', 'company-profile'] });
      queryClient.invalidateQueries({ queryKey: ['recruteur', 'overview'] });
      addToast({ message: 'Profil entreprise enregistré', type: 'success' });
    },
    onError: (error) => {
      addToast({
        message: getApiErrorMessage(error, "Impossible d'enregistrer le profil entreprise"),
        type: 'error',
      });
    },
  });
}

export function useRecruteurOverview() {
  return useQuery({
    queryKey: ['recruteur', 'overview'],
    queryFn: recruteurService.getOverview,
  });
}

export function useRecruiterPlannedInterviews(enabled = true) {
  return useQuery({
    queryKey: ['recruteur', 'planned-interviews'],
    queryFn: recruteurService.getPlannedInterviews,
    enabled,
  });
}

export function useRecruiterCandidateTalentcardFiles(
  candidateId: number | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ['recruteur', 'candidate-talentcard-files', candidateId],
    queryFn: () => recruteurService.getCandidateTalentcardFiles(candidateId as number),
    enabled: Boolean(enabled && candidateId != null && candidateId > 0),
  });
}

export function useRecruiterCandidateCvFiles(
  candidateId: number | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ['recruteur', 'candidate-cv-files', candidateId],
    queryFn: () => recruteurService.getCandidateCvFiles(candidateId as number),
    enabled: Boolean(enabled && candidateId != null && candidateId > 0),
  });
}

export function useRecruiterCandidatePortfolioPdfFiles(
  candidateId: number | null,
  enabled = true,
) {
  return useQuery<{ portfolioPdfFiles: PortfolioPdfFile[] }>({
    queryKey: ['recruteur', 'candidate-portfolio-pdf-files', candidateId],
    queryFn: () => recruteurService.getCandidatePortfolioPdfFiles(candidateId as number),
    enabled: Boolean(enabled && candidateId != null && candidateId > 0),
  });
}

export function useRecruiterCandidateBasicProfile(
  candidateId: number | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ['recruteur', 'candidate-basic-profile', candidateId],
    queryFn: () => recruteurService.getCandidateBasicProfile(candidateId as number),
    enabled: Boolean(enabled && candidateId != null && candidateId > 0),
  });
}

export function useRecruteurJobs() {
  return useQuery({
    queryKey: ['recruteur', 'jobs'],
    queryFn: recruteurService.getJobs,
  });
}

<<<<<<< Updated upstream
export function useRecruteurJob(jobId: number | null, enabled = true) {
  return useQuery({
    queryKey: ['recruteur', 'job', jobId],
    queryFn: () => recruteurService.getJob(jobId as number),
    enabled: Boolean(enabled && jobId),
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();
  const addToast = useUiStore((s) => s.addToast);

  return useMutation({
    mutationFn: (params: { jobId: number; payload: JobPayload }) =>
      recruteurService.updateJob(params.jobId, params.payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recruteur', 'jobs'] });
      queryClient.invalidateQueries({ queryKey: ['recruteur', 'overview'] });
      queryClient.invalidateQueries({ queryKey: ['recruteur', 'job', variables.jobId] });
      addToast({ message: 'Offre mise à jour avec succès', type: 'success' });
    },
    onError: (error) => {
      addToast({
        message: getApiErrorMessage(error, "Erreur lors de la mise à jour de l'offre"),
        type: 'error',
      });
    },
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  const addToast = useUiStore((s) => s.addToast);

  return useMutation({
    mutationFn: (jobId: number) => recruteurService.deleteJob(jobId),
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ['recruteur', 'jobs'] });
      queryClient.invalidateQueries({ queryKey: ['recruteur', 'overview'] });
      queryClient.removeQueries({ queryKey: ['recruteur', 'job', jobId] });
      addToast({ message: 'Offre supprimée', type: 'success' });
    },
    onError: () => {
      addToast({ message: "Impossible de supprimer l'offre", type: 'error' });
    },
  });
}

=======
>>>>>>> Stashed changes
export function useMatchedCandidatesByOffer(jobId: number | null, enabled = true) {
  return useQuery({
    queryKey: ['recruteur', 'matched-candidates', jobId],
    queryFn: () => recruteurService.getMatchedCandidatesByOffer(jobId as number),
    enabled: Boolean(enabled && jobId),
  });
}

<<<<<<< Updated upstream
export function useRecruiterScheduledInterviewForApplication(
  jobId: number | null,
  candidateId: number | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ['recruteur', 'scheduled-interview', jobId, candidateId],
    queryFn: () =>
      recruteurService.getScheduledInterviewForApplication(
        jobId as number,
        candidateId as number,
      ),
    enabled: Boolean(
      enabled && jobId != null && candidateId != null && jobId > 0 && candidateId > 0,
    ),
  });
}

=======
>>>>>>> Stashed changes
export function useCreateJob() {
  const queryClient = useQueryClient();
  const addToast = useUiStore((s) => s.addToast);

  return useMutation({
    mutationFn: (payload: JobPayload) => recruteurService.createJob(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruteur', 'jobs'] });
      queryClient.invalidateQueries({ queryKey: ['recruteur', 'overview'] });
      addToast({ message: 'Offre créée avec succès', type: 'success' });
    },
    onError: (error) => {
      addToast({
        message: getApiErrorMessage(error, "Erreur lors de la création de l'offre"),
        type: 'error',
      });
    },
  });
}

export function useToggleJobStatus() {
  const queryClient = useQueryClient();
  const addToast = useUiStore((s) => s.addToast);

  return useMutation({
    mutationFn: (params: { jobId: number; nextStatus: 'ACTIVE' | 'INACTIVE' }) =>
      recruteurService.updateJobStatus(params.jobId, params.nextStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruteur', 'jobs'] });
      queryClient.invalidateQueries({ queryKey: ['recruteur', 'overview'] });
    },
    onError: () => {
      addToast({ message: "Impossible de changer le statut de l'offre", type: 'error' });
    },
  });
}

export function useValidateCandidate() {
  const queryClient = useQueryClient();
  const addToast = useUiStore((s) => s.addToast);

  return useMutation({
    mutationFn: (params: { jobId: number; candidateId: number }) =>
      recruteurService.validateCandidateForJob(params.jobId, params.candidateId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recruteur', 'matched-candidates', variables.jobId] });
      queryClient.invalidateQueries({ queryKey: ['recruteur', 'overview'] });
      const count = Array.isArray(data?.interviewQuestions) ? data.interviewQuestions.length : 0;
      const msg =
        count > 0
          ? `Candidat validé. ${count} questions d'entretien générées.`
          : 'Candidat validé avec succès';
      addToast({ message: msg, type: 'success' });
      if (data?.interviewQuestionsError) {
        const rawError = String(data.interviewQuestionsError).trim();
        const isTimeout = rawError.toLowerCase().includes('timeout');
        // Timeout : la modale affiche le détail, pas besoin d’un 2e toast.
        if (!isTimeout) {
          addToast({
            message: `Validation OK, mais génération des questions indisponible: ${rawError}`,
            type: 'error',
          });
        }
      }
    },
    onError: () => {
      addToast({ message: 'Impossible de valider ce candidat', type: 'error' });
    },
  });
}

export function useUpdateCandidateApplicationStatus() {
  const queryClient = useQueryClient();
  const addToast = useUiStore((s) => s.addToast);

  return useMutation({
    mutationFn: (params: {
      jobId: number;
      candidateId: number;
      status: 'EN_COURS' | 'ACCEPTEE' | 'REFUSEE';
    }) => recruteurService.updateCandidateApplicationStatus(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruteur', 'overview'] });
    },
    onError: () => {
      addToast({
        message: "Impossible de mettre à jour le statut de la candidature",
        type: 'error',
      });
    },
  });
}

export function useSaveInterviewPdf() {
  const addToast = useUiStore((s) => s.addToast);

  return useMutation({
    mutationFn: (params: {
      jobId: number;
      candidateId: number;
      questions?: Array<{ id: string; text: string; category: string }>;
    }) =>
      recruteurService.saveInterviewQuestionsPdf(
        params.jobId,
        params.candidateId,
        params.questions,
      ),
    onSuccess: () => {
      addToast({ message: 'PDF entretien TAP enregistre avec succes', type: 'success' });
    },
    onError: () => {
      addToast({ message: "Impossible d'enregistrer le PDF d'entretien", type: 'error' });
    },
  });
}
