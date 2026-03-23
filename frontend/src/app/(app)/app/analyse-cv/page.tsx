"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  useCandidatCvFiles,
  useCandidatTalentcardFiles,
  useCandidatPortfolioPdfs,
  useUploadCv,
  useDeleteCvFile,
  useDeleteTalentcardFile,
  useDeletePortfolioPdfFile,
} from "@/hooks/use-candidat";
import FileCard from "@/components/ui/FileCard";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { FileText, Upload, Award, Briefcase, Loader2, ArrowRight, RefreshCw, CheckCircle2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";
import { useUiStore } from "@/stores/ui";

export default function AnalyseCvAppPage() {
  const { isCandidat } = useAuth();
  const theme = useDashboardTheme();
  const isLight = theme === "light";
  const cvQuery = useCandidatCvFiles();

  // polling: true during first-time analysis OR regeneration after re-upload
  const [polling, setPolling] = useState(false);
  // regenDone: briefly shown after regeneration completes
  const [regenDone, setRegenDone] = useState(false);
  // analysisDone: briefly shown after first-time analysis completes
  const [analysisDone, setAnalysisDone] = useState(false);

  const talentcardQuery = useCandidatTalentcardFiles(polling ? 10000 : false);
  const portfolioQuery = useCandidatPortfolioPdfs(polling ? 10000 : false);
  const uploadCv = useUploadCv();
  const deleteCv = useDeleteCvFile();
  const deleteTalentcard = useDeleteTalentcardFile();
  const deletePortfolioPdf = useDeletePortfolioPdfFile();
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addToast = useUiStore((s) => s.addToast);
  const updateToast = useUiStore((s) => s.updateToast);
  const removeToast = useUiStore((s) => s.removeToast);
  const [progressToastId, setProgressToastId] = useState<string | null>(null);
  const progressRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const progressToastIdRef = useRef<string | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      uploadCv.mutate(file);
    }
  }, [uploadCv]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadCv.mutate(file);
    e.target.value = "";
  }, [uploadCv]);

  // Start polling as soon as an upload is triggered
  useEffect(() => {
    if (uploadCv.isPending || uploadCv.isSuccess) {
      setPolling(true);
      setRegenDone(false);
      setAnalysisDone(false);
    }
  }, [uploadCv.isPending, uploadCv.isSuccess]);

  const hasCvs = (cvQuery.data?.cvFiles?.length ?? 0) > 0;
  const hasTalentCards = (talentcardQuery.data?.talentcardFiles?.length ?? 0) > 0;
  const portfolioFiles = portfolioQuery.data?.portfolioPdfFiles ?? [];
  const hasPortfolioShort = portfolioFiles.some((f) => f.type === "short");
  const hasPortfolios = hasPortfolioShort;

  const talentFiles = talentcardQuery.data?.talentcardFiles ?? [];
  const talentCount = talentFiles.length;
  const talentMaxUpdatedAtMs = Math.max(
    0,
    ...talentFiles.map((f) => (f.updatedAt ? new Date(f.updatedAt).getTime() : 0)),
  );
  const talentMaxSize = Math.max(
    0,
    ...talentFiles.map((f) => (typeof f.size === "number" ? f.size : 0)),
  );

  const talentSigNow =
    talentCount > 0 ? `${talentCount}|${talentMaxUpdatedAtMs}|${talentMaxSize}` : null;

  const portfolioShortFiles = portfolioFiles.filter((f) => f.type === "short");
  const portfolioShortCount = portfolioShortFiles.length;
  const portfolioShortMaxUpdatedAtMs = Math.max(
    0,
    ...portfolioShortFiles.map((f) => (f.updatedAt ? new Date(f.updatedAt).getTime() : 0)),
  );
  const portfolioShortMaxSize = Math.max(0, ...portfolioShortFiles.map((f) => (typeof f.size === "number" ? f.size : 0)));
  const [portfolioShortReady, setPortfolioShortReady] = useState(false);
  const portfolioShortReadyRef = useRef(portfolioShortReady);
  const portfolioShortSigRef = useRef<string | null>(null);
  const portfolioShortStableSinceRef = useRef<number | null>(null);

  useEffect(() => {
    portfolioShortReadyRef.current = portfolioShortReady;
  }, [portfolioShortReady]);

  // Snapshot “au début” de la génération (pour éviter de considérer des fichiers déjà existants)
  const initialTalentSigRef = useRef<string | null>(null);
  const initialPortfolioSigRef = useRef<string | null>(null);

  // Toast avec barre de progression pour l'analyse/génération (estimation via polling fichiers)
  useEffect(() => {
    if (!uploadCv.isPending) return;
    if (progressToastId) return;

    startedAtRef.current = Date.now();
    initialTalentSigRef.current = talentSigNow;
    initialPortfolioSigRef.current =
      portfolioShortCount > 0
        ? `${portfolioShortCount}|${portfolioShortMaxUpdatedAtMs}|${portfolioShortMaxSize}`
        : null;

    // Réinitialiser l’état de “prêt” à chaque nouvelle génération
    setPortfolioShortReady(false);
    portfolioShortSigRef.current = null;
    portfolioShortStableSinceRef.current = null;
    progressRef.current = 5;
    const id = addToast({
      type: "info",
      // IMPORTANT: on retire manuellement à la fin, mais le store supprime aussi
      // automatiquement après `duration`. On met une durée très longue pour éviter
      // que le toast disparaisse avant la fin de génération du portfolio court.
      duration: 600000, // 10 minutes
      message: "Génération en cours…",
      progress: 5,
      progressLabel: "Upload du CV & analyse IA",
    });
    setProgressToastId(id);
  }, [uploadCv.isPending, addToast, progressToastId]);

  useEffect(() => {
    progressToastIdRef.current = progressToastId;
  }, [progressToastId]);

  useEffect(() => {
    if (!progressToastId) return;

    // Si une erreur arrive, on retire le toast
    if (uploadCv.isError) {
      removeToast(progressToastId);
      setProgressToastId(null);
      return;
    }

    const tick = window.setInterval(() => {
      const startedAt = startedAtRef.current ?? Date.now();
      const elapsedSeconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));

      // “Prêt” = portfolio short existe et sa signature (count + max updatedAt + max size)
      // est stable suffisamment longtemps (pour éviter “terminé” trop tôt).
      const STABLE_MS = 12000;
      const sig =
        portfolioShortCount > 0
          ? `${portfolioShortCount}|${portfolioShortMaxUpdatedAtMs}|${portfolioShortMaxSize}`
          : null;

      const sigInitial = initialPortfolioSigRef.current;
      const isPortfolioSigChanged = sig ? sig !== sigInitial : false;

      let isPortfolioShortStableNow = false;
      if (!sig || !isPortfolioSigChanged) {
        portfolioShortSigRef.current = null;
        portfolioShortStableSinceRef.current = null;
        isPortfolioShortStableNow = false;
      } else if (portfolioShortSigRef.current !== sig) {
        portfolioShortSigRef.current = sig;
        portfolioShortStableSinceRef.current = Date.now();
        isPortfolioShortStableNow = false;
      } else {
        const stableSince = portfolioShortStableSinceRef.current;
        const stableFor = stableSince ? Date.now() - stableSince : 0;
        isPortfolioShortStableNow = stableFor >= STABLE_MS;
      }

      // Sync d'état robuste (évite un "ready" qui reste bloqué grâce au stale closure)
      if (isPortfolioShortStableNow && !portfolioShortReadyRef.current) {
        setPortfolioShortReady(true);
      } else if (!isPortfolioShortStableNow && portfolioShortReadyRef.current) {
        setPortfolioShortReady(false);
      }

      // Détermination “stages” via disponibilité des fichiers
      let target = 10;
      let label = "Upload du CV & analyse IA";

      if (polling) {
        const isTalentSigChanged = talentSigNow ? talentSigNow !== initialTalentSigRef.current : false;
        if (!isTalentSigChanged) {
          target = 60;
          label = uploadCv.isRegeneration ? "Régénération des Talent Cards" : "Génération du CV & des Talent Cards";
        } else if (!hasPortfolioShort || !isPortfolioSigChanged) {
          // On évite d'afficher 85 tant que la one-page n'est pas encore stable.
          target = 75;
          label = uploadCv.isRegeneration
            ? "Régénération du portfolio one-page (court)…"
            : "Génération du portfolio one-page (court)…";
        } else if (!isPortfolioShortStableNow) {
          target = 92;
          label = "One-page en cours de génération…";
        } else {
          target = 100;
          label = uploadCv.isRegeneration ? "Régénération terminée" : "Génération terminée";
        }
      } else if (uploadCv.isSuccess) {
        target = 20;
        label = "Traitement en cours…";
      }

      const current = progressRef.current;
      const next =
        target === 100 ? 100 : Math.max(target < current ? target : current + (target - current) * 0.18);
      progressRef.current = Math.min(100, next);

      const progressLabel = `${label} • ${elapsedSeconds}s`;

      updateToast(progressToastId, {
        type: target === 100 ? "success" : "info",
        message: target === 100 ? "Génération terminée ✓" : "Génération en cours…",
        progress: Math.round(progressRef.current),
        progressLabel,
      });

      if (target === 100 && progressRef.current >= 100) {
        window.clearInterval(tick);
      }
    }, 250);

    return () => window.clearInterval(tick);
  }, [
    progressToastId,
    updateToast,
    removeToast,
    uploadCv.isError,
    uploadCv.isRegeneration,
    uploadCv.isSuccess,
    polling,
    hasTalentCards,
    hasPortfolioShort,
    portfolioShortCount,
    portfolioShortMaxUpdatedAtMs,
  ]);

  if (!isCandidat) {
    return (
      <EmptyState
        icon={<FileText className="w-12 h-12" />}
        title="Espace candidat uniquement"
        description="Cette section est réservée aux candidats."
      />
    );
  }

  // First-time analysis: CV present but talent cards OR portfolios not yet generated
  const isAnalyzing =
    polling &&
    !uploadCv.isRegeneration &&
    hasCvs &&
    !(hasTalentCards && portfolioShortReady) &&
    !talentcardQuery.isLoading;

  // Regeneration: re-upload in progress, files not yet refreshed
  const isRegenerating = uploadCv.isRegeneration && polling;

  // Stop polling once both talent cards AND portfolios are available after a re-upload
  useEffect(() => {
    if (isRegenerating && hasTalentCards && portfolioShortReady) {
      const graceMs = 20000;
      const tStop = window.setTimeout(() => {
        setPolling(false);
        uploadCv.setRegeneration(false);
        setRegenDone(true);

        // On retire le toast seulement une fois la “grâce” passée.
        const toastId = progressToastIdRef.current;
        if (toastId) removeToast(toastId);
        setProgressToastId(null);

        const t = window.setTimeout(() => setRegenDone(false), 5000);
        // pas de retour cleanup ici (timeout interne)
        void t;
      }, graceMs);
      return () => window.clearTimeout(tStop);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRegenerating, hasTalentCards, portfolioShortReady]);

  // Stop polling for first-time analysis once BOTH talent cards AND portfolios appear
  useEffect(() => {
    if (!uploadCv.isRegeneration && polling && hasTalentCards && portfolioShortReady) {
      const graceMs = 20000;
      const tStop = window.setTimeout(() => {
        setPolling(false);
        setAnalysisDone(true);

        const toastId = progressToastIdRef.current;
        if (toastId) removeToast(toastId);
        setProgressToastId(null);

        const t = window.setTimeout(() => setAnalysisDone(false), 5000);
        void t;
      }, graceMs);
      return () => window.clearTimeout(tStop);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTalentCards, portfolioShortReady, polling, uploadCv.isRegeneration]);

  return (
    <div className="max-w-[1100px] mx-auto">
      {/* Header */}
      <div className={`relative mb-8 pb-8 ${isLight ? "border-b border-black/10" : "border-b border-white/[0.04]"}`}>
        <div className="absolute top-[-80px] left-[-100px] w-[350px] h-[350px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.08),transparent_60%)] blur-3xl pointer-events-none" />
        <div className="relative">
          <h1 className={`text-[28px] sm:text-[36px] font-bold tracking-[-0.04em] font-heading ${isLight ? "text-black" : "text-white"}`}>
            Analyse de votre CV
          </h1>
          <p className={`text-[14px] mt-2 font-light ${isLight ? "text-black/60" : "text-white/45"}`}>
            Uploadez votre CV et laissez notre IA extraire compétences, expériences et potentiel.
          </p>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 mb-8 ${
          dragOver
            ? "border-tap-red/60 bg-tap-red/10"
            : isLight
              ? "border-tap-red/40 hover:border-tap-red/70 bg-white"
              : "border-white/[0.08] hover:border-white/[0.15] bg-zinc-900/30"
        }`}
      >
        {uploadCv.isPending ? (
          <div className="flex items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-tap-red border-t-transparent rounded-full animate-spin" />
            <span className={`text-sm ${isLight ? "text-black/70" : "text-white/60"}`}>Upload et analyse en cours...</span>
          </div>
        ) : (
          <>
            <Upload className={`w-8 h-8 mx-auto mb-3 ${isLight ? "text-tap-red" : "text-white/20"}`} />
            <p className={`text-sm mb-1 ${isLight ? "text-black/70" : "text-white/50"}`}>Glissez votre CV ici ou</p>
            <button
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-tap-red/10 hover:bg-tap-red/20 text-tap-red rounded-lg text-sm cursor-pointer transition"
            >
              <Upload size={14} />
              Choisir un fichier
            </button>
            <input ref={fileRef} type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />
            <p className={`text-xs mt-2 ${isLight ? "text-black/50" : "text-white/25"}`}>PDF uniquement</p>
          </>
        )}
      </div>

      {/* First-time analysis — in progress */}
      {isAnalyzing && (
        <>
          <div className="bg-yellow-500/[0.06] border border-yellow-500/15 rounded-2xl p-6 mb-8 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
              <Loader2 size={18} className="text-yellow-500 animate-spin" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-white mb-1">Analyse en cours…</h3>
              <p className="text-[13px] text-white/45 font-light">
                Notre IA analyse votre CV et génère vos Talent Cards et portfolios. Cette opération peut prendre quelques minutes. Vous pouvez revenir plus tard.
              </p>
            </div>
          </div>
          {/* Proposition “luxe” (pendant l'analyse uniquement) */}
          <div className="bg-gradient-to-r from-amber-500/[0.08] via-emerald-500/[0.07] to-sky-500/[0.04] border border-white/[0.08] rounded-2xl p-6 mb-8 flex items-start gap-4 animate-pulse">
            <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.12] flex items-center justify-center shrink-0">
              <Sparkles size={18} className="text-amber-300" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-white mb-1">Proposition de luxe</h3>
              <p className="text-[13px] text-white/45 font-light">
                Pendant l'analyse, notre mode premium prépare une recommandation “best match” plus ciblée pour vos prochaines candidatures.
              </p>
              <p className="text-[12px] text-white/35 font-light mt-2">
                Astuce : quand l’analyse est terminée, cliquez sur “Voir votre score d&apos;employabilité” pour accéder aux recommandations.
              </p>
            </div>
          </div>
        </>
      )}

      {/* First-time analysis — done */}
      {analysisDone && (
        <div className="bg-green-500/[0.06] border border-green-500/15 rounded-2xl p-6 mb-8 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} className="text-green-400" />
          </div>
          <div>
            <h3 className={`text-[14px] font-semibold mb-1 ${isLight ? "text-black" : "text-white"}`}>Analyse terminée ✓</h3>
            <p className={`text-[13px] font-light ${isLight ? "text-black/70" : "text-white/45"}`}>
              Vos Talent Cards et portfolios ont été générés avec succès.
            </p>
          </div>
        </div>
      )}

      {/* Regeneration in-progress banner */}
      {isRegenerating && (
        <div className="bg-blue-500/[0.06] border border-blue-500/15 rounded-2xl p-6 mb-8 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <RefreshCw size={18} className="text-blue-400 animate-spin" />
          </div>
          <div>
            <h3 className={`text-[14px] font-semibold mb-1 ${isLight ? "text-black" : "text-white"}`}>Régénération en cours...</h3>
            <p className={`text-[13px] font-light ${isLight ? "text-black/70" : "text-white/45"}`}>
              Votre nouveau CV est en cours d&apos;analyse. Toutes vos Talent Cards et portfolios seront mis à jour automatiquement. Vous pouvez revenir plus tard.
            </p>
          </div>
        </div>
      )}

      {/* Regeneration done banner */}
      {regenDone && (
        <div className="bg-green-500/[0.06] border border-green-500/15 rounded-2xl p-6 mb-8 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} className="text-green-400" />
          </div>
          <div>
            <h3 className={`text-[14px] font-semibold mb-1 ${isLight ? "text-black" : "text-white"}`}>Régénération terminée ✓</h3>
            <p className={`text-[13px] font-light ${isLight ? "text-black/70" : "text-white/45"}`}>
              Tous vos fichiers ont été mis à jour avec les données de votre nouveau CV.
            </p>
          </div>
        </div>
      )}

      {/* Mes CV */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-5 rounded-full bg-tap-red" />
          <h2 className={`text-[13px] uppercase tracking-[2px] font-semibold ${isLight ? "text-black" : "text-white/50"}`}>Mes CV</h2>
        </div>

        {cvQuery.isLoading ? (
          <div className="grid gap-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : cvQuery.isError ? (
          <ErrorState onRetry={() => cvQuery.refetch()} />
        ) : !cvQuery.data?.cvFiles?.length ? (
          <EmptyState
            icon={<FileText className="w-10 h-10" />}
            title="Aucun CV"
            description="Uploadez votre premier CV ci-dessus pour lancer l'analyse IA."
          />
        ) : (
          <div className="grid gap-3">
            {cvQuery.data.cvFiles.map((file, i) => (
              <FileCard key={i} {...file} onDelete={(p) => deleteCv.mutate(p)} />
            ))}
          </div>
        )}
      </div>

      {/* Talent Cards */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-5 rounded-full bg-blue-500" />
          <h2 className={`text-[13px] uppercase tracking-[2px] font-semibold flex items-center gap-2 ${isLight ? "text-black" : "text-white/50"}`}>
            <Award size={13} className="text-blue-500" /> Talent Cards
          </h2>
        </div>

        {talentcardQuery.isLoading ? (
          <div className="grid gap-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : talentcardQuery.isError ? (
          <ErrorState onRetry={() => talentcardQuery.refetch()} />
        ) : !talentcardQuery.data?.talentcardFiles?.length ? (
          <EmptyState
            icon={<Award className="w-10 h-10" />}
            title={hasCvs ? "En attente de l'analyse" : "Aucune Talent Card"}
            description={hasCvs
              ? "Vos Talent Cards seront générées automatiquement après l'analyse de votre CV."
              : "Uploadez d'abord un CV pour que l'IA génère vos Talent Cards."
            }
            action={!hasCvs ? (
              <button onClick={() => fileRef.current?.click()} className="btn-primary gap-2 mt-2">
                <Upload size={14} /> Uploader un CV
              </button>
            ) : undefined}
          />
        ) : (
          <div className="grid gap-3">
            {talentcardQuery.data.talentcardFiles.map((file, i) => (
              <FileCard key={i} {...file} onDelete={(path) => deleteTalentcard.mutate(path)} />
            ))}
          </div>
        )}
      </div>

      {/* Portfolio */}
      <div className="mt-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-5 rounded-full bg-green-500" />
          <h2 className={`text-[13px] uppercase tracking-[2px] font-semibold flex items-center gap-2 ${isLight ? "text-black" : "text-white/50"}`}>
            <Briefcase size={13} className="text-green-500" /> Portfolio
          </h2>
        </div>

        {portfolioQuery.isLoading ? (
          <div className="grid gap-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : portfolioQuery.isError ? (
          <ErrorState onRetry={() => portfolioQuery.refetch()} />
        ) : !portfolioQuery.data?.portfolioPdfFiles?.length ? (
          <EmptyState
            icon={<Briefcase className="w-10 h-10" />}
            title={hasCvs ? "En attente de l'analyse" : "Aucun portfolio"}
            description={hasCvs
              ? "Vos portfolios seront générés automatiquement après l'analyse."
              : "Uploadez d'abord un CV pour que l'IA génère vos portfolios."
            }
          />
        ) : (
          <div className="grid gap-3">
            {portfolioQuery.data.portfolioPdfFiles.map((file, i) => (
              <FileCard key={i} {...file} onDelete={(path) => deletePortfolioPdf.mutate(path)} />
            ))}
          </div>
        )}
      </div>

      {/* Link to scoring */}
      {hasTalentCards && (
        <div className={`mt-8 pt-6 ${isLight ? "border-t border-black/10" : "border-t border-white/[0.04]"}`}>
          <Link href="/app/scoring" className="inline-flex items-center gap-2 text-tap-red hover:text-tap-red-hover text-[13px] font-medium transition-colors group">
            Voir votre score d&apos;employabilité
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      )}
    </div>
  );
}
