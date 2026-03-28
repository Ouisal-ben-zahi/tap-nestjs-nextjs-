"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  useCandidatCvFiles,
  useCandidatTalentcardFiles,
  useCandidatPortfolioPdfs,
  useCandidatScore,
  useCandidatStats,
  useCheckCvHasPhoto,
  useDeleteCandidateAvatar,
  useUploadCv,
  useDeleteCvFile,
  useDeleteTalentcardFile,
  useDeletePortfolioPdfFile,
} from "@/hooks/use-candidat";
import FileCard from "@/components/ui/FileCard";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { FolderOpen, Award, Briefcase, Upload, LogOut } from "lucide-react";
import PortfolioLongChatModal from "@/components/app/portfolio/PortfolioLongChatModal";
import CandidatCvUploadGenerationPanel from "@/components/app/candidat/CandidatCvUploadGenerationPanel";
import CvUploadPhotoPromptModal from "@/components/app/candidat/CvUploadPhotoPromptModal";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";
import { useUiStore } from "@/stores/ui";
import {
  hasFreshCorrectedCvTapPdf,
  isFreshGenerationTimestamp,
  portfolioOnePageSatisfiedForSession,
  talentcardReadyForSession,
} from "@/lib/candidat-upload-generation";
import { isPdfUploadFile, isListItemPdf } from "@/lib/cv-pdf";

type Tab = "cv" | "talentcard" | "portfolio" | "portfolio-long";

const tabs: { key: Tab; label: string }[] = [
  { key: "cv", label: "CV" },
  { key: "talentcard", label: "Talent Cards" },
  { key: "portfolio", label: "Portfolio court" },
  { key: "portfolio-long", label: "Portfolio long" },
];

export default function MesFichiersPage() {
  const [activeTab, setActiveTab] = useState<Tab>("cv");
  const { isCandidat } = useAuth();
  const theme = useDashboardTheme();
  const isLight = theme === "light";
  const addToast = useUiStore((s) => s.addToast);
  const statsQuery = useCandidatStats();
  const checkCvHasPhoto = useCheckCvHasPhoto();
  const deleteAvatar = useDeleteCandidateAvatar();

  const [polling, setPolling] = useState(false);
  const pollMs = polling ? 2500 : false;
  const cvQuery = useCandidatCvFiles(pollMs);
  const talentcardQuery = useCandidatTalentcardFiles(pollMs);
  const portfolioQuery = useCandidatPortfolioPdfs(pollMs);
  const scoreQuery = useCandidatScore(pollMs);
  const uploadCv = useUploadCv();
  const deleteCv = useDeleteCvFile();
  const deleteTalentcard = useDeleteTalentcardFile();
  const deletePortfolioPdf = useDeletePortfolioPdfFile();
  const [portfolioLongModalOpen, setPortfolioLongModalOpen] = useState(false);
  const [cvGenerationStartedAt, setCvGenerationStartedAt] = useState<number | null>(null);
  /** Recalcul périodique du « temps écoulé » (timestamps stockage parfois absents). */
  const [genTick, setGenTick] = useState(0);

  const [dragOver, setDragOver] = useState(false);
  const [pendingCv, setPendingCv] = useState<File | null>(null);
  const [imgModalOpen, setImgModalOpen] = useState(false);
  const [selectedImg, setSelectedImg] = useState<File | null>(null);
  const [modalMode, setModalMode] = useState<"need_image" | "replace_optional">("need_image");
  const [modalChoice, setModalChoice] = useState<"keep_existing" | "upload_new" | null>(null);

  const beginCvGenerationTracking = useCallback(() => {
    setCvGenerationStartedAt(Date.now());
    setPolling(true);
  }, []);

  useEffect(() => {
    if (!polling) return;
    const timeout = window.setTimeout(() => {
      setPolling(false);
    }, 20 * 60 * 1000);
    return () => window.clearTimeout(timeout);
  }, [polling]);

  useEffect(() => {
    if (cvGenerationStartedAt == null || !polling) return;
    const id = window.setInterval(() => setGenTick((t) => t + 1), 2000);
    return () => window.clearInterval(id);
  }, [cvGenerationStartedAt, polling]);

  const runCvUploadWithTracking = useCallback(
    (payload: { file: File; imgFile?: File | null }) => {
      uploadCv.mutate(payload, {
        onSuccess: () => beginCvGenerationTracking(),
      });
    },
    [uploadCv, beginCvGenerationTracking],
  );

  const startUploadFlow = useCallback(
    async (file: File) => {
      let hasPhotoInCv = false;
      try {
        const res = await checkCvHasPhoto.mutateAsync(file);
        hasPhotoInCv = Boolean(res?.has_photo);
      } catch {
        hasPhotoInCv = false;
      }

      const existingAvatarUrl = (statsQuery.data?.avatarUrl ?? "").trim();
      const hasExistingAvatar = Boolean(existingAvatarUrl);

      if (hasPhotoInCv) {
        runCvUploadWithTracking({ file });
        return;
      }

      setPendingCv(file);
      setSelectedImg(null);
      setModalMode(hasExistingAvatar ? "replace_optional" : "need_image");
      setModalChoice(hasExistingAvatar ? "keep_existing" : "upload_new");
      setImgModalOpen(true);
    },
    [checkCvHasPhoto, statsQuery.data?.avatarUrl, runCvUploadWithTracking],
  );

  const confirmUploadWithImageChoice = useCallback(
    async (choice: "keep_existing" | "upload_new") => {
      const cvFile = pendingCv;
      if (!cvFile) {
        setImgModalOpen(false);
        return;
      }

      if (choice === "keep_existing") {
        setImgModalOpen(false);
        runCvUploadWithTracking({ file: cvFile });
        setPendingCv(null);
        return;
      }

      if (!selectedImg) {
        addToast({ message: "Veuillez sélectionner une image", type: "error" });
        return;
      }

      try {
        await deleteAvatar.mutateAsync();
      } catch {
        // non-bloquant
      }

      setImgModalOpen(false);
      runCvUploadWithTracking({ file: cvFile, imgFile: selectedImg });
      setPendingCv(null);
    },
    [addToast, deleteAvatar, pendingCv, selectedImg, runCvUploadWithTracking],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && isPdfUploadFile(file)) {
        void startUploadFlow(file);
      } else if (file) {
        addToast({
          message: "Seuls les fichiers PDF sont acceptés pour le CV.",
          type: "error",
        });
      }
    },
    [startUploadFlow, addToast],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (!isPdfUploadFile(file)) {
          addToast({
            message: "Seuls les fichiers PDF sont acceptés pour le CV.",
            type: "error",
          });
          e.target.value = "";
          return;
        }
        void startUploadFlow(file);
      }
      e.target.value = "";
    },
    [startUploadFlow, addToast],
  );

  const cvPdfFilesOnly = useMemo(
    () => (cvQuery.data?.cvFiles ?? []).filter(isListItemPdf),
    [cvQuery.data?.cvFiles],
  );

  const talentPdfFilesOnly = useMemo(
    () => (talentcardQuery.data?.talentcardFiles ?? []).filter(isListItemPdf),
    [talentcardQuery.data?.talentcardFiles],
  );

  const portfolioFilesForGen = portfolioQuery.data?.portfolioPdfFiles ?? [];
  const shortForGen = portfolioFilesForGen.filter((f) => f.type !== "long");
  const longForGen = portfolioFilesForGen.filter((f) => f.type === "long");

  const showCvGenerationPanel = useMemo(() => {
    if (cvGenerationStartedAt == null) return false;
    const tc = talentcardQuery.data?.talentcardFiles ?? [];
    const cv = cvPdfFilesOnly;
    const sc = scoreQuery.data ?? null;
    const started = cvGenerationStartedAt;
    void genTick;
    const elapsedMs = Date.now() - started;

    const hasTap = hasFreshCorrectedCvTapPdf(cv, started);
    const talentOk = talentcardReadyForSession(tc, cv, started, elapsedMs);
    const cvTapAndTalentFresh = talentOk && hasTap;
    const scoringOk =
      isFreshGenerationTimestamp(sc?.metadataTimestamp ?? null, started) ||
      (elapsedMs > 90_000 &&
        cvTapAndTalentFresh &&
        (typeof sc?.scoreGlobal === "number" ||
          (Array.isArray(sc?.dimensions) && sc.dimensions.length > 0)));
    const prerequisiteStepsDone = cvTapAndTalentFresh && scoringOk;
    const portfolioOk = portfolioOnePageSatisfiedForSession({
      portfolioShort: shortForGen,
      portfolioLong: longForGen,
      startedAtMs: started,
      elapsedMs,
      prerequisiteStepsDone,
      cvTapAndTalentFreshForSession: cvTapAndTalentFresh,
    });
    const allDone = prerequisiteStepsDone && portfolioOk;
    return polling || !allDone;
  }, [
    genTick,
    cvGenerationStartedAt,
    cvPdfFilesOnly,
    talentcardQuery.data?.talentcardFiles,
    scoreQuery.data,
    shortForGen,
    longForGen,
    polling,
  ]);

  if (!isCandidat) {
    return (
      <EmptyState
        icon={<FolderOpen className="w-12 h-12" />}
        title="Espace candidat uniquement"
        description="Cette section est réservée aux candidats."
      />
    );
  }

  const portfolioFiles = portfolioQuery.data?.portfolioPdfFiles ?? [];
  const shortPortfolioFiles = portfolioFiles.filter((file) => file.type !== "long");
  const longPortfolioFiles = portfolioFiles.filter((file) => file.type === "long");

  return (
    <div className="max-w-[1100px] mx-auto">
      {/* Header */}
      <div className={`relative mb-8 pb-8 ${isLight ? "border-b border-black/10" : "border-b border-white/[0.04]"}`}>
        <div className="absolute top-[-80px] left-[-100px] w-[350px] h-[350px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.08),transparent_60%)] blur-3xl pointer-events-none" />
        <div className="relative">
          <h1
            className={`text-[28px] sm:text-[36px] font-bold tracking-[-0.04em] font-heading ${
              isLight ? "text-black" : "text-white"
            }`}
          >
            Documents & fichiers
          </h1>
          <p className={`text-[14px] mt-2 font-light ${isLight ? "text-black/60" : "text-white/45"}`}>
            Retrouvez vos CV, talent cards et portfolios générés par l&apos;IA.
          </p>
        </div>
      </div>

      {/* Tabs (une seule ligne en bas) */}
      <div className="rounded-2xl p-3 bg-transparent border-0 mb-6">
        <div
          className={`flex items-center gap-6 px-2 pb-1 border-b ${
            isLight ? "border-black/10" : "border-white/[0.08]"
          }`}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`relative pb-2 text-[13px] font-medium transition ${
                activeTab === tab.key
                  ? "text-tap-red"
                  : isLight
                    ? "text-black/65 hover:text-black"
                    : "text-white/60 hover:text-white/85"
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-tap-red rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* CV Tab */}
      {activeTab === "cv" && (
        <div className="rounded-2xl p-5 sm:p-6 bg-transparent border-0">
          <div className="mb-4">
            <h2 className={`text-[15px] font-semibold ${isLight ? "text-black" : "text-white"}`}>CV</h2>
            <p className={`text-[12px] mt-1 ${isLight ? "text-black/60" : "text-white/40"}`}>
              Uploadez un PDF pour lancer l&apos;analyse IA, puis retrouvez vos CV.
            </p>
          </div>
          <div className="space-y-6">
          {/* Upload zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
              dragOver
                ? "border-tap-red/60 bg-tap-red/10"
                : isLight
                  ? "border-tap-red/40 bg-white hover:border-tap-red/70"
                  : "border-white/[0.08] hover:border-white/[0.15] bg-zinc-900/30"
            }`}
          >
            {uploadCv.isPending ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-6 h-6 border-2 border-tap-red border-t-transparent rounded-full animate-spin" />
                <span className={`${isLight ? "text-black/70" : "text-white/60"} text-sm`}>Upload en cours...</span>
              </div>
            ) : (
              <>
                <Upload
                  className={`w-8 h-8 mx-auto mb-3 ${
                    isLight ? "text-tap-red" : "text-white/20"
                  }`}
                />
                <p className={`text-sm mb-1 ${isLight ? "text-black/70" : "text-white/50"}`}>
                  Glissez votre CV ici ou
                </p>
                <label className="btn-primary btn-sm gap-2 cursor-pointer">
                  <Upload size={14} />
                  Choisir un fichier
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
                <p className={`text-xs mt-2 ${isLight ? "text-black/50" : "text-white/25"}`}>PDF uniquement</p>
              </>
            )}
          </div>

          {showCvGenerationPanel && cvGenerationStartedAt != null ? (
            <CandidatCvUploadGenerationPanel
              startedAtMs={cvGenerationStartedAt}
              isLight={isLight}
              cvFiles={cvQuery.data?.cvFiles ?? []}
              talentcardFiles={talentcardQuery.data?.talentcardFiles ?? []}
              score={scoreQuery.data ?? null}
              portfolioShort={shortForGen}
              portfolioLong={longForGen}
            />
          ) : null}

          {/* Files list */}
          {cvQuery.isLoading ? (
            <div className="grid grid-cols-1 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : cvQuery.isError ? (
            <ErrorState onRetry={() => cvQuery.refetch()} />
          ) : !cvPdfFilesOnly.length ? (
            <EmptyState title="Aucun CV" description="Uploadez votre premier CV (PDF) pour commencer l'analyse IA." />
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {cvPdfFilesOnly.slice(0, 4).map((file, i) => (
                <FileCard key={i} {...file} variant="sidebar-active" onDelete={(path) => deleteCv.mutate(path)} />
              ))}
            </div>
          )}
          </div>
        </div>
      )}

      {/* Talent Cards Tab */}
      {activeTab === "talentcard" && (
        <div className="rounded-2xl p-5 sm:p-6 bg-transparent border-0">
          <div className="mb-4">
            <h2 className={`text-[15px] font-semibold ${isLight ? "text-black" : "text-white"}`}>Talent Cards</h2>
            <p className={`text-[12px] mt-1 ${isLight ? "text-black/60" : "text-white/40"}`}>
              Fichiers PDF uniquement (les exports PNG ne sont pas listés). Génération après
              l&apos;analyse de votre CV.
            </p>
          </div>
          {talentcardQuery.isLoading ? (
            <div className="grid grid-cols-1 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : talentcardQuery.isError ? (
            <ErrorState onRetry={() => talentcardQuery.refetch()} />
          ) : !talentPdfFilesOnly.length ? (
            <EmptyState
              icon={<Award className="w-12 h-12" />}
              title="Aucune Talent Card (PDF)"
              description="Seuls les exports PDF sont affichés ici. Les Talent Cards PDF sont générées après l'analyse de votre CV."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {talentPdfFilesOnly.map((file, i) => (
                <FileCard
                  key={i}
                  {...file}
                  variant="sidebar-active"
                  onDelete={(path) => deleteTalentcard.mutate(path)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Portfolio (court) Tab */}
      {activeTab === "portfolio" && (
        <div className="rounded-2xl p-5 sm:p-6 bg-transparent border-0">
          <div className="mb-4">
            <h2 className={`text-[15px] font-semibold ${isLight ? "text-black" : "text-white"}`}>Portfolio court</h2>
            <p className={`text-[12px] mt-1 ${isLight ? "text-black/60" : "text-white/40"}`}>
              Une version synthétique de votre portfolio.
            </p>
          </div>
          {portfolioQuery.isLoading ? (
            <div className="grid grid-cols-1 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : portfolioQuery.isError ? (
            <ErrorState onRetry={() => portfolioQuery.refetch()} />
          ) : !shortPortfolioFiles.length ? (
            <EmptyState
              icon={<Briefcase className="w-12 h-12" />}
              title="Aucun portfolio"
              description="Votre portfolio court apparaîtra ici."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {shortPortfolioFiles.slice(0, 4).map((file, i) => (
                <FileCard
                  key={i}
                  {...file}
                  type={file.type}
                  variant="sidebar-active"
                  onDelete={(path) => deletePortfolioPdf.mutate(path)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Portfolio long Tab */}
      {activeTab === "portfolio-long" && (
        <div className="rounded-2xl p-5 sm:p-6 bg-transparent border-0">
          <div className="mb-4">
            <h2 className={`text-[15px] font-semibold ${isLight ? "text-black" : "text-white"}`}>Portfolio long</h2>
          </div>

          <div className="flex items-center justify-end mb-5">
            <button
              onClick={() => setPortfolioLongModalOpen(true)}
              className="btn-primary btn-sm gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
            >
              <LogOut size={14} />
              Générer le portfolio long
            </button>
          </div>

          {portfolioQuery.isLoading ? (
            <div className="grid grid-cols-1 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : portfolioQuery.isError ? (
            <ErrorState onRetry={() => portfolioQuery.refetch()} />
          ) : !longPortfolioFiles.length ? (
            <EmptyState
              icon={<Briefcase className="w-12 h-12" />}
              title="Aucun portfolio long"
              description="Cliquez sur &quot;Générer le portfolio long&quot; pour l&apos;afficher ici."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {longPortfolioFiles.slice(0, 4).map((file, i) => (
                <FileCard
                  key={i}
                  {...file}
                  type={file.type}
                  variant="sidebar-active"
                  onDelete={(path) => deletePortfolioPdf.mutate(path)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <PortfolioLongChatModal
        open={portfolioLongModalOpen}
        onClose={() => setPortfolioLongModalOpen(false)}
      />

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
    </div>
  );
}
