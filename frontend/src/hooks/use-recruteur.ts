'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recruteurService } from '@/services/recruteur.service';
import { useUiStore } from '@/stores/ui';
import type { JobPayload } from '@/types/recruteur';

export function useRecruteurOverview() {
  return useQuery({
    queryKey: ['recruteur', 'overview'],
    queryFn: recruteurService.getOverview,
  });
}

export function useRecruteurJobs() {
  return useQuery({
    queryKey: ['recruteur', 'jobs'],
    queryFn: recruteurService.getJobs,
  });
}

export function useMatchedCandidatesByOffer(jobId: number | null, enabled = true) {
  return useQuery({
    queryKey: ['recruteur', 'matched-candidates', jobId],
    queryFn: () => recruteurService.getMatchedCandidatesByOffer(jobId as number),
    enabled: Boolean(enabled && jobId),
  });
}

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
    onError: () => {
      addToast({ message: "Erreur lors de la création de l'offre", type: 'error' });
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
        addToast({
          message: `Validation OK, mais génération des questions indisponible: ${data.interviewQuestionsError}`,
          type: 'error',
        });
      }
    },
    onError: () => {
      addToast({ message: 'Impossible de valider ce candidat', type: 'error' });
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
