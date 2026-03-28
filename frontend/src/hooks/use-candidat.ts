'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { candidatService } from '@/services/candidat.service';
import { useUiStore } from '@/stores/ui';
import axios from 'axios';
import { useAuthStore } from '@/stores/auth';

function useAuthEnabled() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);
  return Boolean(isHydrated && user);
}

export function useCandidatStats(enabled?: boolean) {
  const authEnabled = useAuthEnabled();
  return useQuery({
    queryKey: ['candidat', 'stats'],
    queryFn: candidatService.getStats,
    enabled: enabled ?? authEnabled,
  });
}

export function useCandidatScore(refetchInterval?: number | false) {
  return useQuery({
    queryKey: ['candidat', 'score'],
    queryFn: candidatService.getScore,
    ...(refetchInterval !== undefined ? { refetchInterval } : {}),
  });
}

export function useCandidatPortfolio() {
  return useQuery({
    queryKey: ['candidat', 'portfolio'],
    queryFn: candidatService.getPortfolio,
  });
}

export function useCandidatApplications(enabled?: boolean) {
  const authEnabled = useAuthEnabled();
  return useQuery({
    queryKey: ['candidat', 'applications'],
    queryFn: candidatService.getApplications,
    enabled: enabled ?? authEnabled,
  });
}

export function useCandidatScheduledInterviews(enabled?: boolean) {
  const authEnabled = useAuthEnabled();
  return useQuery({
    queryKey: ['candidat', 'scheduled-interviews'],
    queryFn: candidatService.getScheduledInterviews,
    enabled: enabled ?? authEnabled,
  });
}

export function useCandidatSavedJobs(enabled?: boolean) {
  const authEnabled = useAuthEnabled();
  return useQuery({
    queryKey: ['candidat', 'saved-jobs'],
    queryFn: candidatService.getSavedJobs,
    enabled: enabled ?? authEnabled,
  });
}

export function useToggleCandidatSavedJob() {
  const queryClient = useQueryClient();
  const addToast = useUiStore((s) => s.addToast);
  return useMutation({
    mutationFn: (jobId: number) => candidatService.toggleSavedJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidat', 'saved-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['candidat', 'stats'] });
    },
    onError: () => {
      addToast({ message: "Impossible d'enregistrer cette offre", type: 'error' });
    },
  });
}

export function useCandidatProfile(enabled?: boolean) {
  const authEnabled = useAuthEnabled();
  return useQuery({
    queryKey: ['candidat', 'profile'],
    queryFn: candidatService.getProfile,
    enabled: enabled ?? authEnabled,
  });
}

export function useUpdateCandidatProfile() {
  const queryClient = useQueryClient();
  const addToast = useUiStore((s) => s.addToast);
  return useMutation({
    mutationFn: candidatService.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidat', 'profile'] });
      queryClient.invalidateQueries({ queryKey: ['candidat', 'stats'] });
      addToast({ message: 'Profil mis à jour avec succès', type: 'success' });
    },
    onError: () => {
      addToast({ message: 'Erreur lors de la mise à jour du profil', type: 'error' });
    },
  });
}

export function useCandidatMatchingJobs(enabled?: boolean) {
  const authEnabled = useAuthEnabled();
  return useQuery({
    queryKey: ['candidat', 'matching-jobs'],
    queryFn: candidatService.getMatchingJobs,
    staleTime: 5 * 60 * 1000, // 5 min — l'embedding ne change pas souvent
    enabled: enabled ?? authEnabled,
  });
}

export function useCandidatPublicJobs(enabled?: boolean) {
  const authEnabled = useAuthEnabled();
  return useQuery({
    queryKey: ['candidat', 'public-jobs'],
    queryFn: candidatService.getPublicJobs,
    staleTime: 5 * 60 * 1000,
    enabled: enabled ?? authEnabled,
  });
}

/**
 * Agrège CV, Talent Card, score JSON et PDFs portfolio (one-pager).
 * Utilisé pour ne pas afficher le tableau de bord tant que l’onboarding n’est pas réellement terminé.
 */
export function useCandidatGenerationComplete(enabled?: boolean) {
  const authEnabled = useAuthEnabled();
  return useQuery({
    queryKey: ['candidat', 'generation-complete'],
    queryFn: () => candidatService.checkGenerationCompleteSnapshot(),
    enabled: enabled ?? authEnabled,
    // Toujours reprendre l’état réel au montage (évite d’afficher le dashboard sur un cache « true » obsolète).
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCandidatCvFiles(refetchInterval?: number | false) {
  return useQuery({
    queryKey: ['candidat', 'cv-files'],
    queryFn: candidatService.getCvFiles,
    refetchInterval,
  });
}

export function useCandidatTalentcardFiles(refetchInterval?: number | false) {
  return useQuery({
    queryKey: ['candidat', 'talentcard-files'],
    queryFn: candidatService.getTalentcardFiles,
    refetchInterval,
  });
}

export function useCandidatPortfolioPdfs(refetchInterval?: number | false) {
  return useQuery({
    queryKey: ['candidat', 'portfolio-pdfs'],
    queryFn: candidatService.getPortfolioPdfFiles,
    refetchInterval,
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

/**
 * Upload CV hook.
 * Exposes `isRegeneration` (true when the candidate already had files before
 * the upload) so the page can show the right status banner.
 * Also exposes `setRegeneration` so the page can clear the flag once polling
 * detects that all files have been refreshed.
 */
export function useUploadCv() {
  const queryClient = useQueryClient();
  const addToast = useUiStore((s) => s.addToast);
  const [isRegeneration, setRegeneration] = useState(false);
  // Ref to read the flag synchronously inside mutation callbacks
  const isRegenerationRef = useRef(false);

  const mutation = useMutation({
    mutationFn: (payload: { file: File; imgFile?: File | null }) =>
      candidatService.uploadCv(payload),
    onMutate: () => {
      // Snapshot whether the candidate already had talent-card files before upload
      const existing = queryClient.getQueryData<{ talentcardFiles?: unknown[] }>([
        'candidat',
        'talentcard-files',
      ]);
      const hadFiles = (existing?.talentcardFiles?.length ?? 0) > 0;
      isRegenerationRef.current = hadFiles;
      if (hadFiles) setRegeneration(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidat', 'cv-files'] });
      queryClient.invalidateQueries({ queryKey: ['candidat', 'talentcard-files'] });
      queryClient.invalidateQueries({ queryKey: ['candidat', 'portfolio-pdfs'] });
      queryClient.invalidateQueries({ queryKey: ['candidat', 'score'] });
      queryClient.invalidateQueries({ queryKey: ['candidat', 'generation-complete'] });
      const msg = isRegenerationRef.current
        ? 'CV importé — régénération de tous les fichiers en cours…'
        : 'CV uploadé avec succès';
      addToast({ message: msg, type: 'success' });
    },
    onError: () => {
      isRegenerationRef.current = false;
      setRegeneration(false);
      addToast({ message: "Erreur lors de l'upload du CV", type: 'error' });
    },
  });

  return { ...mutation, isRegeneration, setRegeneration };
}

export function useCheckCvHasPhoto() {
  const addToast = useUiStore((s) => s.addToast);
  return useMutation({
    mutationFn: (file: File) => candidatService.checkCvHasPhoto(file),
    onError: () => addToast({ message: "Impossible de vérifier la photo dans le CV", type: "error" }),
  });
}

export function useDeleteCandidateAvatar() {
  const queryClient = useQueryClient();
  const addToast = useUiStore((s) => s.addToast);
  return useMutation({
    mutationFn: () => candidatService.deleteAvatar(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidat", "stats"] });
      addToast({ message: "Ancienne image supprimée", type: "success" });
    },
    onError: () => addToast({ message: "Erreur lors de la suppression de l'image", type: "error" }),
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
    onError: (error: unknown) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.message ??
            error.response?.data?.error ??
            error.message) 
        : (error as any)?.message ?? 'Erreur lors de la suppression';
      addToast({ message: String(message), type: 'error' });
    },
  });
}

export function useDeleteTalentcardFile() {
  const queryClient = useQueryClient();
  const addToast = useUiStore((s) => s.addToast);

  return useMutation({
    mutationFn: candidatService.deleteTalentcardFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidat', 'talentcard-files'] });
      addToast({ message: 'Talent Card supprimée', type: 'success' });
    },
    onError: (error: unknown) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.message ??
            error.response?.data?.error ??
            error.message)
        : (error as any)?.message ?? 'Erreur lors de la suppression';
      addToast({ message: String(message), type: 'error' });
    },
  });
}

export function useDeletePortfolioPdfFile() {
  const queryClient = useQueryClient();
  const addToast = useUiStore((s) => s.addToast);

  return useMutation({
    mutationFn: candidatService.deletePortfolioPdfFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidat', 'portfolio-pdfs'] });
      addToast({ message: 'Portfolio supprimé', type: 'success' });
    },
    onError: (error: unknown) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.message ??
            error.response?.data?.error ??
            error.message)
        : (error as any)?.message ?? 'Erreur lors de la suppression';
      addToast({ message: String(message), type: 'error' });
    },
  });
}

export function useApplyToJob() {
  const queryClient = useQueryClient();
  const addToast = useUiStore((s) => s.addToast);

  return useMutation({
    mutationFn: (payload: {
      jobId: number;
      cvPath?: string | null;
      portfolioPath?: string | null;
      talentCardPath?: string | null;
      lien?: string | null;
    }) => candidatService.applyToJob(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidat', 'applications'] });
      addToast({ message: 'Candidature envoyée avec succès.', type: 'success' });
    },
    onError: () => {
      addToast({ message: "Erreur lors de l'envoi de la candidature.", type: 'error' });
    },
  });
}
