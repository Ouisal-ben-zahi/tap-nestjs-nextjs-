"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import EmptyState from "@/components/ui/EmptyState";
import api from "@/lib/api";
import { candidatService } from "@/services/candidat.service";
import { useUiStore } from "@/stores/ui";

type OtherLink = { type: string; url: string };
type GenerationStep = { id: string; label: string };

const generationSteps: GenerationStep[] = [
  { id: "upload", label: "Envoi des fichiers" },
  { id: "cv", label: "Analyse du CV" },
  { id: "talentCard", label: "Génération de la Talent Card" },
  { id: "cvPdf", label: "Génération du CV corrigé (PDF)" },
  { id: "scoring", label: "Calcul du scoring candidat" },
  { id: "portfolio", label: "Génération du Portfolio One Page" },
  { id: "finalize", label: "Finalisation du profil" },
];

const progressByStep: Record<string, number> = {
  upload: 16,
  cv: 32,
  talentCard: 48,
  cvPdf: 62,
  scoring: 76,
  portfolio: 90,
  finalize: 100,
};

const wizardSteps = [
  {
    id: 1,
    title: "Comprendre ton profil",
    subtitle: "Qui tu es",
    aiMessage:
      "👋 Salut ! Avant de commencer, laisse-moi t'expliquer ce que je vais faire : je vais analyser ton profil pour comprendre ton contexte et adapter les opportunités qui te correspondent vraiment.",
    aiExplanation:
      "💡 Pourquoi je demande ça ? Ces informations m'aident à comprendre ton contexte et à filtrer les opportunités qui matchent vraiment avec ta situation.",
    whatAiDoes:
      "🔍 Une fois que tu auras rempli ces informations, j'analyserai ton profil pour créer une carte d'identité professionnelle personnalisée.",
  },
  {
    id: 2,
    title: "Ton objectif professionnel",
    subtitle: "Ce que tu veux",
    aiMessage:
      "🎯 Parfait ! Je vais structurer tes aspirations pour créer un profil qui attire les bonnes opportunités.",
    aiExplanation:
      "💡 Plus je comprends ce que tu veux, mieux je peux structurer ta candidature pour attirer les bonnes opportunités.",
    whatAiDoes:
      "🔍 Je transforme tes objectifs en un profil ciblé qui parle directement aux recruteurs.",
  },
  {
    id: 3,
    title: "Tes compétences",
    subtitle: "Ce que tu sais faire",
    aiMessage:
      "💼 Super ! Je vais analyser ton CV ou ton LinkedIn pour extraire automatiquement tes compétences, expériences et réalisations.",
    aiExplanation:
      "💡 Au lieu de te faire remplir un long formulaire, je lis directement ton CV pour gagner du temps.",
    whatAiDoes:
      "🔍 J'utilise l'IA pour extraire automatiquement tes compétences et expériences depuis ton CV ou LinkedIn.",
  },
  {
    id: 4,
    title: "Validation & génération",
    subtitle: "Ton profil est prêt",
    aiMessage:
      "✨ Excellent ! Ton profil est complet. Je vais générer une Talent Card et structurer ton profil pour les recruteurs.",
    aiExplanation:
      "💡 Tu obtiendras un profil structuré, prêt à être utilisé pour le matching et les candidatures.",
    whatAiDoes:
      "🔍 Je génère et sauvegarde ton profil pour qu'il puisse être utilisé par l'IA et les recruteurs.",
  },
];

export default function OnboardingCandidatPage() {
  const { isCandidat } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const addToast = useUiStore((s) => s.addToast);
  const updateToast = useUiStore((s) => s.updateToast);
  const removeToast = useUiStore((s) => s.removeToast);
  const generationToastIdRef = useRef<string | null>(null);

  // Wizard state
  const [currentWizardStep, setCurrentWizardStep] = useState(1);

  // Form state
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [otherLinks, setOtherLinks] = useState<OtherLink[]>([]);
  const [targetPosition, setTargetPosition] = useState("");
  const [targetCountry, setTargetCountry] = useState("");
  const [pretARelocater, setPretARelocater] = useState("");
  const [constraints, setConstraints] = useState("");
  const [searchCriteria, setSearchCriteria] = useState("");
  const [nationality, setNationality] = useState("");
  const [locationCountry, setLocationCountry] = useState("");
  const [seniorityLevel, setSeniorityLevel] = useState("");
  const [disponibilite, setDisponibilite] = useState("");
  const [typeContrat, setTypeContrat] = useState<string[]>([]);
  const [salaireMinimum, setSalaireMinimum] = useState("");
  const [domaineActivite, setDomaineActivite] = useState("");
  const [talentCardLang, setTalentCardLang] = useState<"fr" | "en">("fr");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentGenerationStep, setCurrentGenerationStep] = useState<string | null>(
    null,
  );
  const [completedGenerationSteps, setCompletedGenerationSteps] = useState<string[]>(
    [],
  );

  if (!isCandidat) {
    return (
      <EmptyState
        title="Espace candidat uniquement"
        description="Cette section est réservée aux candidats."
      />
    );
  }

  const setTalentCardLangAndSave = (lang: "fr" | "en") => {
    setTalentCardLang(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("talentcard-lang", lang);
    }
  };

  const isStepComplete = (stepId: number) => {
    switch (stepId) {
      case 1:
        return (
          nationality &&
          locationCountry &&
          seniorityLevel &&
          disponibilite &&
          imgFile
        );
      case 2:
        return (
          targetPosition &&
          targetCountry &&
          constraints &&
          searchCriteria &&
          typeContrat.length > 0 &&
          domaineActivite
        );
      case 3:
        return Boolean(cvFile) || Boolean(linkedinUrl.trim());
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) setCvFile(selectedFile);
  };

  const handleRemoveCv = () => {
    setCvFile(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) setImgFile(selectedFile);
  };

  const handleRemoveImage = () => {
    setImgFile(null);
  };

  const clearGenerationToast = () => {
    if (generationToastIdRef.current) {
      removeToast(generationToastIdRef.current);
      generationToastIdRef.current = null;
    }
  };

  const openGenerationToast = (progressLabel: string, progress: number) => {
    clearGenerationToast();
    generationToastIdRef.current = addToast({
      message:
        "L’IA génère vos fichiers (Talent Card, scoring, portfolio One Page)…",
      type: "info",
      duration: 600_000,
      progress,
      progressLabel,
    });
  };

  const syncGenerationToast = (stepId: string | null, progress: number) => {
    const id = generationToastIdRef.current;
    if (!id) return;
    const label =
      stepId != null
        ? generationSteps.find((s) => s.id === stepId)?.label ?? "En cours…"
        : "Finalisation du profil";
    updateToast(id, {
      progress: Math.min(100, Math.max(0, progress)),
      progressLabel: label,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setGenerationProgress(0);
    setCurrentGenerationStep(null);
    setCompletedGenerationSteps([]);

    try {
      if (!cvFile && !linkedinUrl.trim()) {
        setError(
          "Veuillez fournir au moins un CV (PDF/DOCX) ou une URL LinkedIn.",
        );
        setLoading(false);
        return;
      }

      const markStepDone = (stepId: string) => {
        setCompletedGenerationSteps((prev) =>
          prev.includes(stepId) ? prev : [...prev, stepId],
        );
        setGenerationProgress((prev) =>
          Math.max(prev, progressByStep[stepId] ?? prev),
        );
      };

      const sleep = (ms: number) =>
        new Promise<void>((resolve) => setTimeout(resolve, ms));
      const isFreshTimestamp = (value: unknown, startedAtMs: number) => {
        if (typeof value !== "string" || !value.trim()) return false;
        const parsedMs = new Date(value).getTime();
        if (!Number.isFinite(parsedMs)) return false;
        // Tolérance légère pour éviter les faux négatifs dus aux écarts d'horloge.
        return parsedMs >= startedAtMs - 3000;
      };
      const hasFreshFile = (
        files: Array<{ updatedAt?: string | null; createdAt?: string | null }>,
        startedAtMs: number,
      ) =>
        files.some((file) =>
          isFreshTimestamp(file.updatedAt, startedAtMs) ||
          isFreshTimestamp(file.createdAt, startedAtMs),
        );

      const isCorrectedCvTapPdfName = (fileName: string) => {
        const n = fileName.trim().toLowerCase();
        return n.startsWith("cv_tap") && n.endsWith(".pdf");
      };
      const hasFreshCorrectedCvPdf = (
        files: Array<{
          name?: string;
          updatedAt?: string | null;
          createdAt?: string | null;
        }>,
        startedAtMs: number,
      ) =>
        files.some(
          (f) =>
            typeof f.name === "string" &&
            isCorrectedCvTapPdfName(f.name) &&
            (isFreshTimestamp(f.updatedAt, startedAtMs) ||
              isFreshTimestamp(f.createdAt, startedAtMs)),
        );

      const generationStartedAtMs = Date.now();

      setCurrentGenerationStep("upload");
      openGenerationToast("Envoi des fichiers", progressByStep.upload);

      const formData = new FormData();
      if (cvFile) {
        formData.append("file", cvFile);
      }
      if (imgFile) {
        formData.append("img_file", imgFile);
      }
      formData.append("lang", talentCardLang);
      if (linkedinUrl.trim()) formData.append("linkedin_url", linkedinUrl.trim());
      if (githubUrl.trim()) formData.append("github_url", githubUrl.trim());
      if (targetPosition.trim())
        formData.append("target_position", targetPosition.trim());
      if (targetCountry.trim())
        formData.append("target_country", targetCountry.trim());
      if (pretARelocater.trim())
        formData.append("pret_a_relocater", pretARelocater.trim());
      if (constraints.trim()) formData.append("constraints", constraints.trim());
      if (searchCriteria.trim())
        formData.append("search_criteria", searchCriteria.trim());
      if (nationality.trim()) formData.append("nationality", nationality.trim());
      if (locationCountry.trim())
        formData.append("location_country", locationCountry.trim());
      if (seniorityLevel.trim())
        formData.append("seniority_level", seniorityLevel.trim());
      if (disponibilite.trim()) formData.append("disponibilite", disponibilite.trim());
      if (salaireMinimum.trim())
        formData.append("salaire_minimum", salaireMinimum.trim());
      if (domaineActivite.trim())
        formData.append("domaine_activite", domaineActivite.trim());
      typeContrat.forEach((t) => formData.append("type_contrat", t));
      if (otherLinks.length > 0) {
        formData.append("other_links", JSON.stringify(otherLinks));
      }

      await api.post("/dashboard/candidat/upload-cv", formData);
      markStepDone("upload");
      // CV uploadé et disponible immédiatement via Nest.
      markStepDone("cv");
      syncGenerationToast("talentCard", progressByStep.talentCard);

      const generationOrder = [
        "talentCard",
        "cvPdf",
        "scoring",
        "portfolio",
      ] as const;
      let readyTalentCard = false;
      let readyCvPdf = false;
      let readyScoring = false;
      let readyPortfolio = false;
      const maxAttempts = 80;

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const nextStep = generationOrder.find((stepId) => {
          if (stepId === "talentCard") return !readyTalentCard;
          if (stepId === "cvPdf") return !readyCvPdf;
          if (stepId === "scoring") return !readyScoring;
          return !readyPortfolio;
        });
        if (nextStep) setCurrentGenerationStep(nextStep);
        if (nextStep) {
          syncGenerationToast(
            nextStep,
            progressByStep[nextStep] ?? generationProgress,
          );
        }

        const [cvRes, talentCardRes, scoreRes, portfolioRes] = await Promise.all([
          api
            .get<{
              cvFiles: Array<{
                name?: string;
                updatedAt?: string | null;
                createdAt?: string | null;
              }>;
            }>("/dashboard/candidat/cv-files")
            .catch(() => null),
          api
            .get<{
              talentcardFiles: Array<{
                updatedAt?: string | null;
                createdAt?: string | null;
              }>;
            }>("/dashboard/candidat/talentcard-files")
            .catch(() => null),
          api
            .get<{
              scoreGlobal: number | null;
              dimensions?: unknown[];
              metadataTimestamp?: string | null;
            }>(
              "/dashboard/candidat/score-json",
            )
            .catch(() => null),
          api
            .get<{
              portfolioShort: Array<{ updatedAt?: string | null; createdAt?: string | null }>;
              portfolioLong: Array<{ updatedAt?: string | null; createdAt?: string | null }>;
            }>(
              "/dashboard/candidat/portfolio-pdf-files",
            )
            .catch(() => null),
        ]);

        if (
          !readyTalentCard &&
          Array.isArray(talentCardRes?.data?.talentcardFiles) &&
          hasFreshFile(talentCardRes.data.talentcardFiles, generationStartedAtMs)
        ) {
          readyTalentCard = true;
          markStepDone("talentCard");
        }
        if (
          !readyCvPdf &&
          Array.isArray(cvRes?.data?.cvFiles) &&
          hasFreshCorrectedCvPdf(cvRes.data.cvFiles, generationStartedAtMs)
        ) {
          readyCvPdf = true;
          markStepDone("cvPdf");
        }
        if (
          !readyScoring &&
          (isFreshTimestamp(scoreRes?.data?.metadataTimestamp, generationStartedAtMs) ||
            (attempt > 15 &&
              (typeof scoreRes?.data?.scoreGlobal === "number" ||
                (scoreRes?.data?.dimensions?.length ?? 0) > 0)))
        ) {
          readyScoring = true;
          markStepDone("scoring");
        }
        if (
          !readyPortfolio &&
          (hasFreshFile(
            portfolioRes?.data?.portfolioShort ?? [],
            generationStartedAtMs,
          ) ||
            hasFreshFile(
              portfolioRes?.data?.portfolioLong ?? [],
              generationStartedAtMs,
            ))
        ) {
          readyPortfolio = true;
          markStepDone("portfolio");
        }

        if (
          readyTalentCard &&
          readyCvPdf &&
          readyScoring &&
          readyPortfolio
        ) {
          syncGenerationToast("portfolio", progressByStep.portfolio);
          break;
        }

        // Avance légère entre deux checks pour une sensation plus fluide
        setGenerationProgress((prev) => Math.min(prev + 1, 96));
        await sleep(2000);
      }

      if (
        !(
          readyTalentCard &&
          readyCvPdf &&
          readyScoring &&
          readyPortfolio
        )
      ) {
        throw new Error(
          "La génération prend plus de temps que prévu. Merci de patienter puis réessayer dans quelques instants.",
        );
      }

      setCurrentGenerationStep("finalize");
      syncGenerationToast(null, progressByStep.finalize);
      await sleep(350);
      markStepDone("finalize");

      clearGenerationToast();
      addToast({
        message:
          "Votre dossier est prêt. Vous allez être redirigé vers le tableau de bord.",
        type: "success",
        duration: 5500,
      });
      await queryClient.invalidateQueries({ queryKey: ["candidat", "generation-complete"] });
      await queryClient.invalidateQueries({ queryKey: ["candidat", "stats"] });

      let serverReady = false;
      for (let v = 0; v < 28; v += 1) {
        const ok = await candidatService.checkGenerationCompleteSnapshot();
        if (ok) {
          serverReady = true;
          break;
        }
        await sleep(1200);
      }
      if (!serverReady) {
        addToast({
          message:
            "Synchronisation avec le serveur en cours — le tableau de bord peut afficher tous les fichiers dans quelques secondes.",
          type: "info",
          duration: 6500,
        });
      }
      await queryClient.invalidateQueries({
        queryKey: ["candidat", "generation-complete"],
      });
      await sleep(400);
      router.push("/app");
    } catch (err: unknown) {
      clearGenerationToast();
      const msg =
        err instanceof Error
          ? err.message
          : "Erreur lors de la sauvegarde du profil.";
      setError(msg);
      addToast({ message: msg, type: "error", duration: 8000 });
    } finally {
      setLoading(false);
    }
  };

  const currentStepData = wizardSteps.find(
    (s) => s.id === currentWizardStep,
  )!;

  const handleNext = () => {
    if (currentWizardStep < 4 && isStepComplete(currentWizardStep)) {
      setCurrentWizardStep((s) => s + 1);
    }
  };

  const handlePrevious = () => {
    if (currentWizardStep > 1) {
      setCurrentWizardStep((s) => s - 1);
    }
  };

  return (
    <div className="max-w-[900px] mx-auto py-8">
      <div className="mb-8 text-center">
        <h1 className="text-[28px] sm:text-[32px] font-bold text-white mb-2 tracking-[-0.04em]">
          Compléter mon profil candidat
        </h1>
        <p className="text-white/60 text-[14px]">
          Je t&apos;accompagne pour créer ton profil professionnel étape par
          étape.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Wizard Progress */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {wizardSteps.map((step, index) => (
          <div key={step.id} className="flex items-center gap-2">
            <div
              className={[
                "w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold",
                currentWizardStep === step.id
                  ? "bg-tap-red text-white"
                  : currentWizardStep > step.id
                    ? "bg-emerald-500 text-white"
                    : "bg-white/10 text-white/50",
              ].join(" ")}
            >
              {currentWizardStep > step.id ? "✓" : step.id}
            </div>
            {index < wizardSteps.length - 1 && (
              <div
                className={[
                  "w-10 h-0.5",
                  currentWizardStep > step.id
                    ? "bg-emerald-500"
                    : "bg-white/10",
                ].join(" ")}
              />
            )}
          </div>
        ))}
      </div>

      {/* AI Message */}
      <div className="mb-6 rounded-2xl border border-tap-red/25 bg-tap-red/10 p-5">
        <h3 className="text-sm font-semibold text-white mb-1">
          {currentStepData.title}
        </h3>
        <p className="text-[13px] text-white/80 mb-2">
          {currentStepData.aiMessage}
        </p>
        <div className="rounded-xl border border-tap-red/25 bg-black/20 p-3 text-[12px] text-white/80 space-y-1">
          <p>{currentStepData.aiExplanation}</p>
          <p>{currentStepData.whatAiDoes}</p>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={currentWizardStep === 4 ? handleSubmit : (e) => e.preventDefault()}
        className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 space-y-5"
      >
        {/* Étape 1 */}
        {currentWizardStep === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[2px] text-white/50 mb-2">
                Nationalité *
              </label>
              <input
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                placeholder="Ex: Marocaine, Française, Canadienne..."
                className="input-premium"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[2px] text-white/50 mb-2">
                Pays de résidence actuel *
              </label>
              <input
                value={locationCountry}
                onChange={(e) => setLocationCountry(e.target.value)}
                placeholder="Ex: Maroc, France, Canada..."
                className="input-premium"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[2px] text-white/50 mb-2">
                Niveau de séniorité *
              </label>
              <select
                value={seniorityLevel}
                onChange={(e) => setSeniorityLevel(e.target.value)}
                className="input-premium bg-black/20"
              >
                <option value="">Sélectionner...</option>
                <option value="Entry Level">Entry Level / Débutant</option>
                <option value="Junior">Junior</option>
                <option value="Intermediate">Intermédiaire</option>
                <option value="Mid-Level">Mid-Level / Confirmé</option>
                <option value="Senior">Senior</option>
                <option value="Expert">Expert / Lead</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[2px] text-white/50 mb-2">
                Disponibilité *
              </label>
              <select
                value={disponibilite}
                onChange={(e) => setDisponibilite(e.target.value)}
                className="input-premium bg-black/20"
              >
                <option value="">Sélectionner...</option>
                <option value="Immediat">Immédiate</option>
                <option value="1 semaine">1 semaine</option>
                <option value="2 semaines">2 semaines</option>
                <option value="3 semaines">3 semaines</option>
                <option value="4 semaines">4 semaines</option>
                <option value="5 semaines">5 semaines</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[2px] text-white/50 mb-2">
                Photo professionnelle *
              </label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png"
                onChange={handleImageChange}
                className="block w-full text-[13px] text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-white hover:file:bg-white/20"
              />
              {imgFile && (
                <div className="mt-2 flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-[12px]">
                  <span className="text-white/80 truncate">{imgFile.name}</span>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="text-red-300 hover:text-red-200"
                  >
                    Supprimer
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Étape 2 */}
        {currentWizardStep === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[2px] text-white/50 mb-2">
                Poste cible *
              </label>
              <input
                value={targetPosition}
                onChange={(e) => setTargetPosition(e.target.value)}
                placeholder="Ex: Data Scientist, Software Engineer..."
                className="input-premium"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[2px] text-white/50 mb-2">
                Pays cible *
              </label>
              <input
                value={targetCountry}
                onChange={(e) => setTargetCountry(e.target.value)}
                placeholder="Ex: France, Canada, USA..."
                className="input-premium"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[2px] text-white/50 mb-2">
                Prêt à relocaliser
              </label>
              <select
                value={pretARelocater}
                onChange={(e) => setPretARelocater(e.target.value)}
                className="input-premium bg-black/20"
              >
                <option value="">Non spécifié</option>
                <option value="Oui">Oui</option>
                <option value="Non">Non</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[2px] text-white/50 mb-2">
                Exigences / Pré-requis *
              </label>
              <textarea
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                rows={3}
                className="input-premium min-h-[80px]"
                placeholder="Ex: Télétravail 3 jours/semaine, localisation Casablanca, etc."
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[2px] text-white/50 mb-2">
                Ce que tu recherches *
              </label>
              <textarea
                value={searchCriteria}
                onChange={(e) => setSearchCriteria(e.target.value)}
                rows={3}
                className="input-premium min-h-[80px]"
                placeholder="Ex: opportunités de croissance, projets IA, environnement startup..."
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[2px] text-white/50 mb-2">
                Salaire minimum (MAD) *
              </label>
              <input
                value={salaireMinimum}
                onChange={(e) => setSalaireMinimum(e.target.value)}
                placeholder="Ex: 8000"
                className="input-premium"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[2px] text-white/50 mb-2">
                Types de contrat recherchés *
              </label>
              <div className="flex flex-wrap gap-2 text-[12px]">
                {["CDI", "CDD", "Freelance", "Mission", "Stage"].map((type) => {
                  const active = typeContrat.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setTypeContrat((prev) =>
                          prev.includes(type)
                            ? prev.filter((t) => t !== type)
                            : [...prev, type],
                        );
                      }}
                      className={[
                        "px-3 py-1.5 rounded-full border",
                        active
                          ? "border-tap-red bg-tap-red/20 text-white"
                          : "border-white/20 text-white/60 hover:border-white/40",
                      ].join(" ")}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[2px] text-white/50 mb-2">
                Domaine d&apos;activité *
              </label>
              <input
                value={domaineActivite}
                onChange={(e) => setDomaineActivite(e.target.value)}
                placeholder="Ex: Développement web, Data, Marketing..."
                className="input-premium"
              />
            </div>
          </div>
        )}

        {/* Étape 3 */}
        {currentWizardStep === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[2px] text-white/50 mb-2">
                CV (PDF ou DOCX)
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="block w-full text-[13px] text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-white hover:file:bg-white/20"
              />
              {cvFile && (
                <div className="mt-2 flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-[12px]">
                  <span className="text-white/80 truncate">{cvFile.name}</span>
                  <button
                    type="button"
                    onClick={handleRemoveCv}
                    className="text-red-300 hover:text-red-200"
                  >
                    Supprimer
                  </button>
                </div>
              )}
              <p className="mt-1 text-[11px] text-white/50">
                💡 Je vais extraire automatiquement tes compétences, expériences et
                réalisations de ton CV.
              </p>
            </div>
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[2px] text-white/50 mb-2">
                OU URL LinkedIn
              </label>
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://www.linkedin.com/in/..."
                className="input-premium"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[2px] text-white/50 mb-2">
                URL GitHub
              </label>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/..."
                className="input-premium"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[2px] text-white/50 mb-2">
                Autres liens (optionnel)
              </label>
              <div className="space-y-2">
                {otherLinks.map((link, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row gap-2 items-stretch"
                  >
                    <input
                      value={link.type}
                      onChange={(e) => {
                        const next = [...otherLinks];
                        next[index] = { ...next[index], type: e.target.value };
                        setOtherLinks(next);
                      }}
                      placeholder="Ex: Portfolio, Instagram..."
                      className="input-premium flex-1"
                    />
                    <input
                      value={link.url}
                      onChange={(e) => {
                        const next = [...otherLinks];
                        next[index] = { ...next[index], url: e.target.value };
                        setOtherLinks(next);
                      }}
                      placeholder="https://..."
                      className="input-premium flex-[2]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setOtherLinks((prev) =>
                          prev.filter((_, i) => i !== index),
                        )
                      }
                      className="text-red-300 hover:text-red-200 text-[12px]"
                    >
                      Supprimer
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setOtherLinks((prev) => [...prev, { type: "", url: "" }])
                  }
                  className="text-[12px] text-tap-red hover:text-red-300"
                >
                  ➕ Ajouter un lien
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Étape 4 */}
        {currentWizardStep === 4 && (
          <div className="space-y-4 text-center">
            <h3 className="text-lg font-semibold text-white mb-2">
              ✅ Ton profil est complet !
            </h3>
            <p className="text-[13px] text-white/60 mb-4">
              Choisis la langue de ta Talent Card, puis lance la génération.
            </p>
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-[13px] text-white/60">
                Langue de la Talent Card :
              </span>
              <div className="flex rounded-lg bg-white/5 p-1 text-[12px] font-semibold">
                <button
                  type="button"
                  onClick={() => setTalentCardLangAndSave("fr")}
                  className={[
                    "px-3 py-1 rounded-md",
                    talentCardLang === "fr"
                      ? "bg-tap-red text-white"
                      : "text-white/70",
                  ].join(" ")}
                >
                  FR
                </button>
                <button
                  type="button"
                  onClick={() => setTalentCardLangAndSave("en")}
                  className={[
                    "px-3 py-1 rounded-md",
                    talentCardLang === "en"
                      ? "bg-tap-red text-white"
                      : "text-white/70",
                  ].join(" ")}
                >
                  EN
                </button>
              </div>
            </div>
            <p className="text-[12px] text-white/50">
              💡 La génération peut prendre quelques instants. Tu pourras ensuite
              utiliser ton profil pour le matching et les candidatures.
            </p>
            {loading && (
              <div className="mt-5 rounded-xl border border-white/15 bg-black/25 p-4 text-left">
                <div className="mb-2 flex items-center justify-between text-[12px]">
                  <span className="text-white/80">Progression de la génération</span>
                  <span className="font-semibold text-white">
                    {generationProgress}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-tap-red transition-all duration-500 ease-out"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>

                <div className="mt-3 space-y-2">
                  {generationSteps.map((step) => {
                    const isDone = completedGenerationSteps.includes(step.id);
                    const isCurrent = currentGenerationStep === step.id && !isDone;
                    return (
                      <div
                        key={step.id}
                        className="flex items-center justify-between text-[12px]"
                      >
                        <span
                          className={
                            isDone
                              ? "text-emerald-300"
                              : isCurrent
                                ? "text-white"
                                : "text-white/45"
                          }
                        >
                          {step.label}
                        </span>
                        <span
                          className={
                            isDone
                              ? "text-emerald-300"
                              : isCurrent
                                ? "text-tap-red"
                                : "text-white/40"
                          }
                        >
                          {isDone ? "Terminé" : isCurrent ? "En cours..." : "En attente"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {completedGenerationSteps.includes("talentCard") && (
                  <p className="mt-3 text-[12px] text-emerald-300">
                    ✅ Talent Card prête.
                  </p>
                )}
                {completedGenerationSteps.includes("cv") && (
                  <p className="mt-1 text-[12px] text-emerald-300">
                    ✅ CV analysé avec succès.
                  </p>
                )}
                {completedGenerationSteps.includes("scoring") && (
                  <p className="mt-1 text-[12px] text-emerald-300">
                    ✅ Scoring candidat calculé.
                  </p>
                )}
                {completedGenerationSteps.includes("portfolio") && (
                  <p className="mt-1 text-[12px] text-emerald-300">
                    ✅ Portfolio One Page prêt.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
          {currentWizardStep > 1 ? (
            <button
              type="button"
              onClick={handlePrevious}
              className="text-[12px] text-white/60 hover:text-white"
            >
              ← Précédent
            </button>
          ) : (
            <span />
          )}
          {currentWizardStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!isStepComplete(currentWizardStep)}
              className="btn-primary text-[13px] disabled:opacity-40"
            >
              Suivant →
            </button>
          ) : (
            <button
              type="submit"
              disabled={
                loading ||
                !isStepComplete(1) ||
                !isStepComplete(2) ||
                !isStepComplete(3)
              }
              className="btn-primary text-[13px] disabled:opacity-40"
            >
              {loading ? "⏳ Génération en cours..." : "🚀 Finaliser mon profil"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

