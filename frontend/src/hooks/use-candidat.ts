'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { candidatService } from '@/services/candidat.service';
import { useUiStore } from '@/stores/ui';
import axios from 'axios';

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

export function useGeneratePortfolioLong() {
  const queryClient = useQueryClient();
  const addToast = useUiStore((s) => s.addToast);

  return useMutation({
    mutationFn: (lang?: 'fr' | 'en') => candidatService.generatePortfolioLong(lang ?? 'fr'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidat', 'portfolio-pdfs'] });
      addToast({ message: 'Génération du portfolio long lancée…', type: 'success' });
    },
    onError: () => {
      addToast({ message: 'Erreur lors de la génération du portfolio long', type: 'error' });
    },
  });
}

export function useStartPortfolioLongChat() {
  const addToast = useUiStore((s) => s.addToast);
  return useMutation({
    mutationFn: (lang?: 'fr' | 'en') => candidatService.startPortfolioLongChat(lang ?? 'fr'),
    onError: () => addToast({ message: 'Impossible de démarrer le chatbot portfolio', type: 'error' }),
  });
}

export function useSendPortfolioLongChatMessage() {
  const addToast = useUiStore((s) => s.addToast);
  return useMutation({
    mutationFn: (vars: { sessionId: string; message: string }) =>
      candidatService.sendPortfolioLongChatMessage(vars.sessionId, vars.message),
    onError: () => addToast({ message: 'Erreur lors de l’envoi du message', type: 'error' }),
  });
}

export function useRunPortfolioLongPipeline() {
  const queryClient = useQueryClient();
  const addToast = useUiStore((s) => s.addToast);
  return useMutation({
    mutationFn: (lang?: 'fr' | 'en') => candidatService.runPortfolioLongPipeline(lang ?? 'fr'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidat', 'portfolio-pdfs'] });
      queryClient.invalidateQueries({ queryKey: ['candidat', 'score'] });
      addToast({ message: 'Scoring + génération du portfolio long lancés…', type: 'success' });
    },
    onError: (error) => {
      const responseData = axios.isAxiosError(error) ? error.response?.data : undefined;
      const responseText = typeof responseData === 'string' ? responseData : '';
      const message = String((error as any)?.message ?? '');

      const looksLikeProxyOrTimeout =
        message.toLowerCase().includes('timeout') ||
        message.toLowerCase().includes('network error') ||
        responseText.includes('Failed to proxy') ||
        responseText.toLowerCase().includes('proxy');

      // In dev, Next can fail proxying long requests even if backend keeps running.
      if (looksLikeProxyOrTimeout) {
        addToast({
          message: 'Scoring lancé — la réponse a expiré. La génération continue, le résultat apparaîtra automatiquement.',
          type: 'success',
        });
      } else {
        addToast({ message: 'Erreur lors du scoring/génération', type: 'error' });
      }

      // Either way, refresh derived UI.
      queryClient.invalidateQueries({ queryKey: ['candidat', 'portfolio-pdfs'] });
      queryClient.invalidateQueries({ queryKey: ['candidat', 'score'] });

      if (typeof window !== 'undefined') {
        window.setTimeout(() => queryClient.invalidateQueries({ queryKey: ['candidat', 'score'] }), 2500);
        window.setTimeout(() => queryClient.invalidateQueries({ queryKey: ['candidat', 'portfolio-pdfs'] }), 5000);
      }
    },
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
