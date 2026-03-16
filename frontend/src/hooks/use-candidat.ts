'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { candidatService } from '@/services/candidat.service';
import { useUiStore } from '@/stores/ui';

export function useCandidatStats() {
  return useQuery({
    queryKey: ['candidat', 'stats'],
    queryFn: candidatService.getStats,
  });
}

export function useCandidatScore() {
  return useQuery({
    queryKey: ['candidat', 'score'],
    queryFn: candidatService.getScore,
  });
}

export function useCandidatPortfolio() {
  return useQuery({
    queryKey: ['candidat', 'portfolio'],
    queryFn: candidatService.getPortfolio,
  });
}

export function useCandidatApplications() {
  return useQuery({
    queryKey: ['candidat', 'applications'],
    queryFn: candidatService.getApplications,
  });
}

export function useCandidatPublicJobs() {
  return useQuery({
    queryKey: ['candidat', 'public-jobs'],
    queryFn: candidatService.getPublicJobs,
  });
}

export function useCandidatCvFiles() {
  return useQuery({
    queryKey: ['candidat', 'cv-files'],
    queryFn: candidatService.getCvFiles,
  });
}

export function useCandidatTalentcardFiles(refetchInterval?: number | false) {
  return useQuery({
    queryKey: ['candidat', 'talentcard-files'],
    queryFn: candidatService.getTalentcardFiles,
    refetchInterval,
  });
}

export function useCandidatPortfolioPdfs() {
  return useQuery({
    queryKey: ['candidat', 'portfolio-pdfs'],
    queryFn: candidatService.getPortfolioPdfFiles,
  });
}

export function useUploadCv() {
  const queryClient = useQueryClient();
  const addToast = useUiStore((s) => s.addToast);

  return useMutation({
    mutationFn: candidatService.uploadCv,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidat', 'cv-files'] });
      queryClient.invalidateQueries({ queryKey: ['candidat', 'talentcard-files'] });
      addToast({ message: 'CV uploadé avec succès — analyse IA en cours...', type: 'success' });
    },
    onError: () => {
      addToast({ message: 'Erreur lors de l\'upload du CV', type: 'error' });
    },
  });
}

export function useDeleteCvFile() {
  const queryClient = useQueryClient();
  const addToast = useUiStore((s) => s.addToast);

  return useMutation({
    mutationFn: candidatService.deleteCvFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidat', 'cv-files'] });
      addToast({ message: 'CV supprimé', type: 'success' });
    },
    onError: () => {
      addToast({ message: 'Erreur lors de la suppression', type: 'error' });
    },
  });
}
