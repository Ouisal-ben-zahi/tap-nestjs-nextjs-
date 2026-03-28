"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  useCandidatStats,
  useCandidatCvFiles,
  useCandidatTalentcardFiles,
  useCandidatPortfolioPdfs,
  useCheckCvHasPhoto,
  useUploadCv,
  useDeleteCandidateAvatar,
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
import CvUploadPhotoPromptModal from "@/components/app/candidat/CvUploadPhotoPromptModal";

export default function AnalyseCvAppPage() {
  const { isCandidat } = useAuth();
  const theme = useDashboardTheme();
  const isLight = theme === "light";
  const cvQuery = useCandidatCvFiles();
  const statsQuery = useCandidatStats();
  const addToast = useUiStore((s) => s.addToast);

  // polling: true during first-time analysis OR regeneration after re-upload
  const [polling, setPolling] = useState(false);
  // regenDone: briefly shown after regeneration completes
  const [regenDone, setRegenDone] = useState(false);
  // analysisDone: briefly shown after first-time analysis completes
  const [analysisDone, setAnalysisDone] = useState(false);

  const talentcardQuery = useCandidatTalentcardFiles(polling ? 10000 : false);
  const portfolioQuery = useCandidatPortfolioPdfs(polling ? 10000 : false);
  const uploadCv = useUploadCv();
  const checkCvHasPhoto = useCheckCvHasPhoto();
  const deleteAvatar = useDeleteCandidateAvatar();
  const deleteCv = useDeleteCvFile();
  const deleteTalentcard = useDeleteTalentcardFile();
  const deletePortfolioPdf = useDeletePortfolioPdfFile();
  const [dragOver, setDragOver] = useState(false);
  const [uploadBorderActive, setUploadBorderActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [pendingCv, setPendingCv] = useState<File | null>(null);
  const [imgModalOpen, setImgModalOpen] = useState(false);
  const [selectedImg, setSelectedImg] = useState<File | null>(null);
  const [modalMode, setModalMode] = useState<"need_image" | "replace_optional">("need_image");
  const [modalChoice, setModalChoice] = useState<"keep_existing" | "upload_new" | null>(null);

  const triggerUploadBorderAnimation = useCallback(() => {
    setUploadBorderActive(true);
    window.setTimeout(() => setUploadBorderActive(false), 1200);
  }, []);

  const startUploadFlow = useCallback(async (file: File) => {
    // Verify if CV contains an extractable photo (fast check via backend)
    let hasPhotoInCv = false;
    try {
      const res = await checkCvHasPhoto.mutateAsync(file);
      hasPhotoInCv = Boolean(res?.has_photo);
    } catch {
      hasPhotoInCv = false;
    }

    const existingAvatarUrl = (statsQuery.data?.avatarUrl ?? "").trim();
    const hasExistingAvatar = Boolean(existingAvatarUrl);

    // If CV has a photo, we can proceed directly (no need to ask for extra image)
    if (hasPhotoInCv) {
      uploadCv.mutate({ file });
      return;
    }

    // If no photo in CV, ask:
    // - if no existing avatar => require an image
    // - if existing avatar => offer to keep it or replace it
    setPendingCv(file);
    setSelectedImg(null);
    setModalMode(hasExistingAvatar ? "replace_optional" : "need_image");
    setModalChoice(hasExistingAvatar ? "keep_existing" : "upload_new");
    setImgModalOpen(true);
  }, [checkCvHasPhoto, statsQuery.data?.avatarUrl, uploadCv]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    triggerUploadBorderAnimation();
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      void startUploadFlow(file);
    }
  }, [startUploadFlow, triggerUploadBorderAnimation]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      triggerUploadBorderAnimation();
      void startUploadFlow(file);
    }
    e.target.value = "";
  }, [startUploadFlow, triggerUploadBorderAnimation]);

  const confirmUploadWithImageChoice = useCallback(async (choice: "keep_existing" | "upload_new") => {
    const cvFile = pendingCv;
    if (!cvFile) {
      setImgModalOpen(false);
      return;
    }

    if (choice === "keep_existing") {
      setImgModalOpen(false);
      uploadCv.mutate({ file: cvFile });
      setPendingCv(null);
      return;
    }

    // upload_new
    if (!selectedImg) {
      addToast({ message: "Veuillez sélectionner une image", type: "error" });
      return;
    }

    try {
      // delete old avatar from storage (requirement)
      await deleteAvatar.mutateAsync();
    } catch {
      // non-blocking: still try to upload new image
    }

    setImgModalOpen(false);
    uploadCv.mutate({ file: cvFile, imgFile: selectedImg });
    setPendingCv(null);
  }, [addToast, deleteAvatar, pendingCv, selectedImg, uploadCv]);

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
  const regenerationProgress = !isRegenerating
    ? 0
    : hasTalentCards && portfolioShortReady
      ? 100
      : hasTalentCards
        ? 75
        : 35;

  // Stop polling once both talent cards AND portfolios are available after a re-upload
  useEffect(() => {
    if (isRegenerating && hasTalentCards && portfolioShortReady) {
      const graceMs = 20000;
      const tStop = window.setTimeout(() => {
        setPolling(false);
        uploadCv.setRegeneration(false);
        setRegenDone(true);

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
        {(uploadBorderActive || uploadCv.isPending) && (
          <div className="pointer-events-none absolute inset-[-2px] rounded-2xl border-2 border-tap-red animate-pulse shadow-[0_0_0_2px_rgba(202,27,40,0.25),0_0_24px_rgba(202,27,40,0.35)]" />
        )}
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
              onClick={() => {
                triggerUploadBorderAnimation();
                // Laisse 80ms pour peindre l'animation avant d'ouvrir le picker système.
                window.setTimeout(() => fileRef.current?.click(), 80);
              }}
              className="btn-primary btn-sm gap-2"
            >
              <Upload size={14} />
              Choisir un fichier
            </button>
            <input ref={fileRef} type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />
            <p className={`text-xs mt-2 ${isLight ? "text-black/50" : "text-white/25"}`}>PDF uniquement</p>
          </>
        )}
      </div>

      <CvUploadPhotoPromptModal
        open={imgModalOpen}
        onClose={() => {
          setImgModalOpen(false);
          setModalChoice(null);
          setSelectedImg(null);
          setPendingCv(null);
        }}
        isLight={isLight}
        mode={modalMode}
        choice={modalChoice ?? "upload_new"}
        onChoiceChange={(c) => setModalChoice(c)}
        selectedImageFile={selectedImg}
        onSelectedImageChange={setSelectedImg}
        isUploading={uploadCv.isPending}
        onConfirmKeepExisting={() => void confirmUploadWithImageChoice("keep_existing")}
        onConfirmWithNewImage={() => void confirmUploadWithImageChoice("upload_new")}
      />

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
          <div className="w-full">
            <h3 className={`text-[14px] font-semibold mb-1 ${isLight ? "text-black" : "text-white"}`}>Régénération en cours...</h3>
            <p className={`text-[13px] font-light ${isLight ? "text-black/70" : "text-white/45"}`}>
              Votre nouveau CV est en cours d&apos;analyse. Toutes vos Talent Cards et portfolios seront mis à jour automatiquement. Vous pouvez revenir plus tard.
            </p>
            <div className={`mt-4 h-2 w-full overflow-hidden rounded-full ${isLight ? "bg-black/10" : "bg-white/10"}`}>
              <div
                className="h-full rounded-full bg-blue-400 transition-all duration-500"
                style={{ width: `${regenerationProgress}%` }}
              />
            </div>
            <p className={`mt-2 text-[12px] ${isLight ? "text-black/55" : "text-white/40"}`}>
              Progression: {regenerationProgress}%
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
        <div className="mb-5">
          <sup className="relative z-10 inline-flex items-center gap-2 rounded-full bg-tap-red/[0.08] border border-tap-red/20 px-3 py-1">
            <FileText size={12} className="text-tap-red" />
            <span className="text-[10px] uppercase tracking-[2.5px] text-tap-red/80 font-semibold leading-none">Mes CV</span>
          </sup>
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
              <FileCard key={i} {...file} variant="sidebar-active" onDelete={(p) => deleteCv.mutate(p)} />
            ))}
          </div>
        )}
      </div>

      {hasCvs ? (
        <>
          {/* Talent Cards */}
          <div>
            <div className="mb-5">
              <sup className="relative z-10 inline-flex items-center gap-2 rounded-full bg-blue-500/[0.08] border border-blue-500/20 px-3 py-1">
                <Award size={12} className="text-blue-500" />
                <span className="text-[10px] uppercase tracking-[2.5px] text-blue-500/80 font-semibold leading-none">Talent Cards</span>
              </sup>
              <p className={`mt-2 text-[12px] ${isLight ? "text-black/55" : "text-white/45"}`}>
                Cartes générées par IA à partir de votre CV.
              </p>
            </div>

            {talentcardQuery.isLoading ? (
              <div className="grid gap-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
            ) : talentcardQuery.isError ? (
              <ErrorState onRetry={() => talentcardQuery.refetch()} />
            ) : !talentcardQuery.data?.talentcardFiles?.length ? (
              <EmptyState
                icon={<Award className="w-10 h-10" />}
                title=""
                description="Vos Talent Cards seront générées automatiquement après l'analyse de votre CV."
              />
            ) : (
              <div className="grid gap-3">
                {talentcardQuery.data.talentcardFiles.map((file, i) => (
                  <FileCard key={i} {...file} variant="sidebar-active" onDelete={(path) => deleteTalentcard.mutate(path)} />
                ))}
              </div>
            )}
          </div>

          {/* Portfolio */}
          <div className="mt-8">
            <div className="mb-5">
              <sup className="relative z-10 inline-flex items-center gap-2 rounded-full bg-emerald-500/[0.08] border border-emerald-500/20 px-3 py-1">
                <Briefcase size={12} className="text-emerald-500" />
                <span className="text-[10px] uppercase tracking-[2.5px] text-emerald-500/80 font-semibold leading-none">Portfolio</span>
              </sup>
              <p className={`mt-2 text-[12px] ${isLight ? "text-black/55" : "text-white/45"}`}>
                Portfolios PDF générés automatiquement par IA.
              </p>
            </div>

            {portfolioQuery.isLoading ? (
              <div className="grid gap-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
            ) : portfolioQuery.isError ? (
              <ErrorState onRetry={() => portfolioQuery.refetch()} />
            ) : !portfolioQuery.data?.portfolioPdfFiles?.length ? (
              <EmptyState
                icon={<Briefcase className="w-10 h-10" />}
                title=""
                description="Vos portfolios seront générés automatiquement après l'analyse."
              />
            ) : (
              <div className="grid gap-3">
                {portfolioQuery.data.portfolioPdfFiles.map((file, i) => (
                  <FileCard key={i} {...file} variant="sidebar-active" onDelete={(path) => deletePortfolioPdf.mutate(path)} />
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}

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
