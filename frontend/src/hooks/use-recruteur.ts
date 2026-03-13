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
