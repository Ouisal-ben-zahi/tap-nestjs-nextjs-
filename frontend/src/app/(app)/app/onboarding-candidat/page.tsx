"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import EmptyState from "@/components/ui/EmptyState";
import api from "@/lib/api";
import { candidatService } from "@/services/candidat.service";
import DropdownSelect from "@/components/app/DropdownSelect";
import { DOMAINE_GROUPS } from "@/constants/domaines";
import { useUiStore } from "@/stores/ui";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";

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

const STEP1_FIELD_KEYS = [
  "locationCountry",
  "nationality",
  "targetCountry",
  "seniorityLevel",
  "disponibilite",
  "domaineActivite",
  "targetPosition",
] as const;
const STEP2_FIELD_KEYS = [
  "salaireMinimum",
  "typeContrat",
  "constraints",
  "searchCriteria",
  "cvFile",
  "photoPro",
  "linkedinUrl",
  "githubUrl",
  "socialLinks",
] as const;

function isValidHttpUrl(value: string): boolean {
  const t = value.trim();
  if (!t) return false;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Hôte linkedin.com ou sous-domaine (www., fr., etc.) + chemin type profil / page org. */
function isLikelyLinkedInUrl(raw: string): boolean {
  const t = raw.trim();
  if (!t || !isValidHttpUrl(t)) return false;
  try {
    const u = new URL(t);
    const host = u.hostname.toLowerCase();
    if (host !== "linkedin.com" && !host.endsWith(".linkedin.com")) return false;
    const norm =
      (u.pathname || "/").replace(/\/+/g, "/").replace(/\/$/, "") || "/";
    return (
      /^\/in\/[^/]+/i.test(norm) ||
      /^\/company\/[^/]+/i.test(norm) ||
      /^\/school\/[^/]+/i.test(norm) ||
      /^\/pub\/[^/]+/i.test(norm)
    );
  } catch {
    return false;
  }
}

/** Profil ou dépôt sur github.com (pas un lien générique vers la home). */
function isLikelyGitHubUrl(raw: string): boolean {
  const t = raw.trim();
  if (!t || !isValidHttpUrl(t)) return false;
  try {
    const u = new URL(t);
    const host = u.hostname.toLowerCase();
    if (host !== "github.com" && host !== "www.github.com") return false;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 1) return false;
    const reserved = new Set([
      "features",
      "enterprise",
      "explore",
      "marketplace",
      "pricing",
      "login",
      "signup",
      "join",
      "topics",
      "collections",
      "sponsors",
      "settings",
      "notifications",
      "git-guides",
      "readme",
      "security",
      "about",
    ]);
    const seg0 = parts[0].toLowerCase();
    if (reserved.has(seg0)) return false;
    const user = parts[0];
    if (user.length > 39) return false;
    if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(user))
      return false;
    return true;
  } catch {
    return false;
  }
}

function validateOnboardingStep1(values: {
  locationCountry: string;
  nationality: string;
  targetCountry: string;
  seniorityLevel: string;
  disponibilite: string;
  domaineActivite: string;
  targetPosition: string;
}): Record<string, string> {
  const e: Record<string, string> = {};
  if (!String(values.locationCountry ?? "").trim()) {
    e.locationCountry = "Le pays de résidence est obligatoire.";
  }
  if (!String(values.nationality ?? "").trim()) {
    e.nationality = "La nationalité est obligatoire.";
  }
  if (!String(values.targetCountry ?? "").trim()) {
    e.targetCountry = "Le pays cible est obligatoire.";
  }
  if (!String(values.seniorityLevel ?? "").trim()) {
    e.seniorityLevel = "Le niveau de séniorité est obligatoire.";
  }
  if (!String(values.disponibilite ?? "").trim()) {
    e.disponibilite = "La disponibilité est obligatoire.";
  }
  if (!String(values.domaineActivite ?? "").trim()) {
    e.domaineActivite = "Le domaine d’activité est obligatoire.";
  }
  if (!String(values.targetPosition ?? "").trim()) {
    e.targetPosition = "Le poste cible est obligatoire.";
  }
  return e;
}

function validateOnboardingStep2(
  values: {
    constraints: string;
    searchCriteria: string;
    salaireMinimum: string;
    linkedinUrl: string;
    githubUrl: string;
  },
  typeContrat: string[],
  cvFile: File | null,
  imgFile: File | null,
  cvNeedsManualPhoto: boolean | null,
): Record<string, string> {
  const e: Record<string, string> = {};
  if (typeContrat.length === 0) {
    e.typeContrat = "Sélectionne au moins un type de contrat.";
  }
  const sal = String(values.salaireMinimum ?? "").trim();
  if (!sal) {
    e.salaireMinimum = "Le salaire minimum (MAD) est obligatoire.";
  } else if (!/^\d+$/.test(sal) || Number(sal) <= 0) {
    e.salaireMinimum = "Indique un montant valide en chiffres (ex. 8000).";
  }
  if (!String(values.constraints ?? "").trim()) {
    e.constraints = "Les exigences / pré-requis sont obligatoires.";
  }
  if (!String(values.searchCriteria ?? "").trim()) {
    e.searchCriteria = "Décris ce que tu recherches.";
  }
  if (!cvFile) {
    e.cvFile = "Ajoute ton CV (PDF ou DOCX).";
  }
  if (cvNeedsManualPhoto === true && !imgFile) {
    e.photoPro =
      "Une photo professionnelle est requise (aucune photo détectée dans ton CV).";
  }
  const li = values.linkedinUrl.trim();
  const gh = values.githubUrl.trim();
  if (!li && !gh) {
    e.socialLinks = "Renseigne au moins une URL LinkedIn ou GitHub.";
  } else {
    if (li) {
      if (!isValidHttpUrl(li)) {
        e.linkedinUrl = "URL invalide (http ou https requis).";
      } else if (!isLikelyLinkedInUrl(li)) {
        e.linkedinUrl =
          "Ce n’est pas une URL LinkedIn reconnue (ex. https://www.linkedin.com/in/… ou /company/…).";
      }
    }
    if (gh) {
      if (!isValidHttpUrl(gh)) {
        e.githubUrl = "URL invalide (http ou https requis).";
      } else if (!isLikelyGitHubUrl(gh)) {
        e.githubUrl =
          "Ce n’est pas une URL GitHub reconnue (ex. https://github.com/ton-profil).";
      }
    }
  }
  return e;
}

type DropdownOption = { value: string; label: string };
type DropdownGroup = { label?: string; options: DropdownOption[] };

const SENIORITY_GROUPS: DropdownGroup[] = [
  {
    options: [
      { value: "Entry Level", label: "Entry Level / Débutant" },
      { value: "Junior", label: "Junior" },
      { value: "Intermediate", label: "Intermédiaire" },
      { value: "Mid-Level", label: "Mid-Level / Confirmé" },
      { value: "Senior", label: "Senior" },
      { value: "Expert", label: "Expert / Lead" },
    ],
  },
];

const DISPONIBILITE_GROUPS: DropdownGroup[] = [
  {
    options: [
      { value: "Immediat", label: "Immédiate" },
      { value: "1 semaine", label: "1 semaine" },
      { value: "2 semaines", label: "2 semaines" },
      { value: "3 semaines", label: "3 semaines" },
      { value: "4 semaines", label: "4 semaines" },
      { value: "5 semaines", label: "5 semaines" },
    ],
  },
];

const RELOCATION_GROUPS: DropdownGroup[] = [
  {
    options: [
      { value: "Oui", label: "Oui" },
      { value: "Non", label: "Non" },
    ],
  },
];

const NATIONALITE_GROUPS: DropdownGroup[] = [
  {
    options: [
      { value: "Marocaine", label: "Marocaine" },
      { value: "Française", label: "Française" },
      { value: "Belge", label: "Belge" },
      { value: "Suisse", label: "Suisse" },
      { value: "Canadienne", label: "Canadienne" },
      { value: "Espagnole", label: "Espagnole" },
      { value: "Allemande", label: "Allemande" },
      { value: "Britannique", label: "Britannique" },
      { value: "Américaine", label: "Américaine" },
      { value: "Néerlandaise", label: "Néerlandaise" },
      { value: "Italienne", label: "Italienne" },
      { value: "Portugaise", label: "Portugaise" },
      { value: "Luxembourgeoise", label: "Luxembourgeoise" },
      { value: "Émiratie", label: "Émiratie" },
      { value: "Autre", label: "Autre" },
    ],
  },
];

const PAYS_GROUPS: DropdownGroup[] = [
  {
    options: [
      { value: "Maroc", label: "Maroc" },
      { value: "France", label: "France" },
      { value: "Belgique", label: "Belgique" },
      { value: "Suisse", label: "Suisse" },
      { value: "Canada", label: "Canada" },
      { value: "Espagne", label: "Espagne" },
      { value: "Allemagne", label: "Allemagne" },
      { value: "Royaume-Uni", label: "Royaume-Uni" },
      { value: "États-Unis", label: "États-Unis" },
      { value: "Pays-Bas", label: "Pays-Bas" },
      { value: "Italie", label: "Italie" },
      { value: "Portugal", label: "Portugal" },
      { value: "Luxembourg", label: "Luxembourg" },
      { value: "Émirats arabes unis", label: "Émirats arabes unis" },
      { value: "Autre", label: "Autre" },
    ],
  },
];

export default function OnboardingCandidatPage() {
  const { isCandidat } = useAuth();
  const router = useRouter();
  const theme = useDashboardTheme();
  const isLight = theme === "light";
  const inputClass = "input-premium w-full";
  const labelCls = `block text-[11px] mb-1.5 ${isLight ? "text-black/70" : "text-white/50"}`;
  const FLASK_AI_URL =
    process.env.NEXT_PUBLIC_FLASK_AI_URL ?? "http://31.97.196.196:5002";

  // Wizard state (2 étapes formulaire + panneau finalisation après « Suivant » sur l’étape 2)
  const [currentWizardStep, setCurrentWizardStep] = useState(1);
  const [showFinalizeSection, setShowFinalizeSection] = useState(false);

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
  const [checkingCvPhoto, setCheckingCvPhoto] = useState(false);
  const [cvNeedsManualPhoto, setCvNeedsManualPhoto] = useState<boolean | null>(
    null,
  );
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentGenerationStep, setCurrentGenerationStep] = useState<
    string | null
  >(null);
  const [completedGenerationSteps, setCompletedGenerationSteps] = useState<
    string[]
  >([]);
  const [showResumeHint, setShowResumeHint] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const addToast = useUiStore((s) => s.addToast);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("resume") === "1") {
      setCurrentWizardStep(2);
      setShowFinalizeSection(true);
      setShowResumeHint(true);
      window.history.replaceState({}, "", "/app/onboarding-candidat");
    }
  }, []);

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

  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const isStepComplete = (stepId: number) => {
    switch (stepId) {
      case 1:
        return Boolean(
          locationCountry &&
            nationality &&
            String(targetCountry ?? "").trim() &&
            String(seniorityLevel ?? "").trim() &&
            String(disponibilite ?? "").trim() &&
            String(domaineActivite ?? "").trim() &&
            String(targetPosition ?? "").trim(),
        );
      case 2: {
        const jobOk =
          Boolean(String(constraints ?? "").trim()) &&
          Boolean(String(searchCriteria ?? "").trim()) &&
          typeContrat.length > 0 &&
          Boolean(String(salaireMinimum ?? "").trim()) &&
          /^\d+$/.test(String(salaireMinimum ?? "").trim()) &&
          Number(String(salaireMinimum ?? "").trim()) > 0;
        if (!jobOk) return false;
        if (!cvFile) return false;
        if (cvNeedsManualPhoto === true) return Boolean(imgFile);
        return Boolean(linkedinUrl.trim() || githubUrl.trim());
      }
      default:
        return false;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setCvFile(selectedFile);
    clearFieldError("cvFile");
    setError(null);
    setCheckingCvPhoto(true);
    setCvNeedsManualPhoto(null);

    try {
      const formData = new FormData();
      // Le backend IA attend `cv_file`
      formData.append("cv_file", selectedFile);

      const res = await fetch(
        `${FLASK_AI_URL.replace(/\/$/, "")}/check-cv-photo`,
        {
        method: "POST",
        body: formData,
        },
      );
      if (!res.ok) {
        throw new Error("check-cv-photo failed");
      }
      const data = (await res.json()) as { has_photo?: boolean };
      const hasPhoto = Boolean(data?.has_photo);
      setCvNeedsManualPhoto(!hasPhoto);
      if (hasPhoto) {
        setImgFile(null);
        clearFieldError("photoPro");
      }
    } catch {
      // si on ne peut pas vérifier, on ne force pas la photo
      setCvNeedsManualPhoto(null);
    } finally {
      setCheckingCvPhoto(false);
    }
  };

  const handleRemoveCv = () => {
    setCvFile(null);
    setCvNeedsManualPhoto(null);
    setCheckingCvPhoto(false);
    clearFieldError("cvFile");
    clearFieldError("photoPro");
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setImgFile(selectedFile);
      clearFieldError("photoPro");
    }
  };

  const handleRemoveImage = () => {
    setImgFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setGenerationProgress(0);
    setCurrentGenerationStep(null);
    setCompletedGenerationSteps([]);

    try {
      const hasLinkedin = Boolean(linkedinUrl.trim());
      const hasGithub = Boolean(githubUrl.trim());

      if (!cvFile) {
        setError("Veuillez importer votre CV (PDF ou DOCX).");
        setLoading(false);
        return;
      }

      if (!hasLinkedin && !hasGithub) {
        setError("Veuillez renseigner au moins un profil : LinkedIn ou GitHub.");
        setLoading(false);
        return;
      }

      if (hasLinkedin && !isLikelyLinkedInUrl(linkedinUrl)) {
        setError(
          "L’URL LinkedIn n’est pas valide (profil /in/… ou page /company/… sur linkedin.com).",
        );
        setLoading(false);
        return;
      }
      if (hasGithub && !isLikelyGitHubUrl(githubUrl)) {
        setError(
          "L’URL GitHub n’est pas valide (ex. https://github.com/ton-identifiant).",
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
        return parsedMs >= startedAtMs - 3000;
      };
      const hasFreshFile = (
        files: Array<{ updatedAt?: string | null; createdAt?: string | null }>,
        startedAtMs: number,
      ) =>
        files.some(
          (file) =>
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

      const formData = new FormData();
      formData.append("file", cvFile);
      if (imgFile) {
        formData.append("img_file", imgFile);
      }
      formData.append("lang", talentCardLang);
      if (hasLinkedin) formData.append("linkedin_url", linkedinUrl.trim());
      if (hasGithub) formData.append("github_url", githubUrl.trim());
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
      if (disponibilite.trim())
        formData.append("disponibilite", disponibilite.trim());
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
      markStepDone("cv");

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
            }>("/dashboard/candidat/score-json")
            .catch(() => null),
          api
            .get<{
              portfolioShort: Array<{
                updatedAt?: string | null;
                createdAt?: string | null;
              }>;
              portfolioLong: Array<{
                updatedAt?: string | null;
                createdAt?: string | null;
              }>;
            }>("/dashboard/candidat/portfolio-pdf-files")
            .catch(() => null),
        ]);

        if (
          !readyTalentCard &&
          Array.isArray(talentCardRes?.data?.talentcardFiles) &&
          hasFreshFile(
            talentCardRes.data.talentcardFiles,
            generationStartedAtMs,
          )
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
          (isFreshTimestamp(
            scoreRes?.data?.metadataTimestamp,
            generationStartedAtMs,
          ) ||
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
          break;
        }

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
      await sleep(350);
      markStepDone("finalize");

      addToast({
        message:
          "Votre dossier est prêt. Vous allez être redirigé vers le tableau de bord.",
        type: "success",
        duration: 5500,
      });
      await queryClient.invalidateQueries({
        queryKey: ["candidat", "generation-complete"],
      });
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
      const message =
        err instanceof Error
          ? err.message
          : "Erreur lors de la sauvegarde du profil.";
      setError(message);
      addToast({ message, type: "error", duration: 8000 });
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentWizardStep === 1) {
      const err = validateOnboardingStep1({
        locationCountry,
        nationality,
        targetCountry,
        seniorityLevel,
        disponibilite,
        domaineActivite,
        targetPosition,
      });
      setFieldErrors((prev) => {
        const next = { ...prev };
        for (const k of STEP1_FIELD_KEYS) delete next[k];
        return { ...next, ...err };
      });
      if (Object.keys(err).length > 0) return;
      setCurrentWizardStep(2);
      return;
    }
    if (currentWizardStep === 2 && !showFinalizeSection) {
      const err = validateOnboardingStep2(
        {
          constraints,
          searchCriteria,
          salaireMinimum,
          linkedinUrl,
          githubUrl,
        },
        typeContrat,
        cvFile,
        imgFile,
        cvNeedsManualPhoto,
      );
      setFieldErrors((prev) => {
        const next = { ...prev };
        for (const k of STEP2_FIELD_KEYS) delete next[k];
        return { ...next, ...err };
      });
      if (Object.keys(err).length > 0) return;
      setShowFinalizeSection(true);
    }
  };

  const handlePrevious = () => {
    if (showFinalizeSection) {
      setShowFinalizeSection(false);
      return;
    }
    if (currentWizardStep > 1) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        for (const k of STEP2_FIELD_KEYS) delete next[k];
        return next;
      });
      setCurrentWizardStep((s) => s - 1);
    }
  };

  const fileInputClass = [
    "block w-full text-[13px] file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-1.5 file:text-[12px] file:font-medium",
    isLight
      ? "text-black/70 file:bg-black/5 file:text-black hover:file:bg-black/10"
      : "text-white/70 file:bg-white/10 file:text-white hover:file:bg-white/20",
  ].join(" ");
  const fileRowBox = isLight
    ? "mt-2 flex items-center justify-between rounded-lg border border-black/10 bg-black/[0.03] px-3 py-2 text-[12px]"
    : "mt-2 flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-[12px]";
  const fileNameText = isLight ? "text-black/80 truncate" : "text-white/80 truncate";
  const genPanelClass = isLight
    ? "mt-5 rounded-xl border border-black/10 bg-black/[0.03] p-4 text-left"
    : "mt-5 rounded-xl border border-white/15 bg-black/25 p-4 text-left";

  const errEl = (key: string) => {
    const msg = fieldErrors[key];
    if (!msg) return null;
    return (
      <p
        role="alert"
        className={`mt-1 text-[11px] ${
          isLight ? "text-red-600" : "text-red-400"
        }`}
      >
        {msg}
      </p>
    );
  };
  return (
    <div className="max-w-[800px] mx-auto space-y-8 py-6 sm:py-10 px-1">
      <div
        className={`relative mb-2 pb-6 text-left ${isLight ? "border-b border-black/10" : "border-b border-white/[0.04]"}`}
      >
        <h1
          className={`text-[26px] sm:text-[32px] font-bold tracking-[-0.04em] font-heading ${isLight ? "text-black" : "text-white"}`}
        >
          Complète ton profil candidat
        </h1>
        <p
          className={`text-[14px] mt-2 font-light max-w-xl mx-0 ${isLight ? "text-black/60" : "text-white/45"}`}
        >
          Je t&apos;accompagne pour créer ton profil professionnel étape par
          étape.
        </p>
      </div>

      {error && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            isLight
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-red-500/40 bg-red-500/10 text-red-200"
          }`}
        >
          {error}
        </div>
      )}

      <div
        className={`rounded-2xl p-5 sm:p-6 space-y-6 ${isLight ? "card-luxury-light" : "bg-zinc-900/50 border border-white/[0.06]"}`}
      >
        {/* Form */}
        <form
          onSubmit={showFinalizeSection ? handleSubmit : (e) => e.preventDefault()}
          className="space-y-5"
        >
        {/* Étape 1 : ~moitié des champs (contexte + profil cible) */}
        {currentWizardStep === 1 && (
          <div className="space-y-3">
            <p
              className={`text-[12px] ${isLight ? "text-black/55" : "text-white/55"}`}
            >
              Lieu, mobilité, niveau et poste visé — la suite : salaire, détails
              et documents.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="min-w-0">
                <label className={labelCls}>
                  Pays de résidence actuel *
                </label>
                <DropdownSelect
                  value={locationCountry}
                  onChange={(v) => {
                    setLocationCountry(v);
                    clearFieldError("locationCountry");
                  }}
                  placeholder="Ex: Maroc, France, Canada..."
                  groups={PAYS_GROUPS}
                  isLight={isLight}
                />
                {errEl("locationCountry")}
              </div>
              <div className="min-w-0">
                <label className={labelCls}>
                  Nationalité *
                </label>
                <DropdownSelect
                  value={nationality}
                  onChange={(v) => {
                    setNationality(v);
                    clearFieldError("nationality");
                  }}
                  placeholder="Ex: Marocaine, Française, Canadienne..."
                  groups={NATIONALITE_GROUPS}
                  isLight={isLight}
                />
                {errEl("nationality")}
              </div>
              <div className="min-w-0">
                <label className={labelCls}>
                  Pays où tu cherches un emploi *
                </label>
                <DropdownSelect
                  value={targetCountry}
                  onChange={(v) => {
                    setTargetCountry(v);
                    clearFieldError("targetCountry");
                  }}
                  placeholder="Ex: France, Canada, USA..."
                  groups={PAYS_GROUPS}
                  isLight={isLight}
                />
                {errEl("targetCountry")}
              </div>
              <div className="min-w-0">
                <label className={labelCls}>
                  Prêt à relocaliser
                </label>
                <DropdownSelect
                  value={pretARelocater}
                  onChange={setPretARelocater}
                  placeholder="Non spécifié"
                  groups={RELOCATION_GROUPS}
                  isLight={isLight}
                />
              </div>
              <div className="min-w-0">
                <label className={labelCls}>
                  Niveau de séniorité *
                </label>
                <DropdownSelect
                  value={seniorityLevel}
                  onChange={(v) => {
                    setSeniorityLevel(v);
                    clearFieldError("seniorityLevel");
                  }}
                  placeholder="Sélectionner..."
                  groups={SENIORITY_GROUPS}
                  isLight={isLight}
                />
                {errEl("seniorityLevel")}
              </div>
              <div className="min-w-0">
                <label className={labelCls}>
                  Disponibilité *
                </label>
                <DropdownSelect
                  value={disponibilite}
                  onChange={(v) => {
                    setDisponibilite(v);
                    clearFieldError("disponibilite");
                  }}
                  placeholder="Sélectionner..."
                  groups={DISPONIBILITE_GROUPS}
                  isLight={isLight}
                />
                {errEl("disponibilite")}
              </div>
              <div className="min-w-0">
                <label className={labelCls}>
                  Domaine d&apos;activité *
                </label>
                <DropdownSelect
                  value={domaineActivite}
                  onChange={(v) => {
                    setDomaineActivite(v);
                    clearFieldError("domaineActivite");
                  }}
                  placeholder="Sélectionner..."
                  groups={DOMAINE_GROUPS}
                  isLight={isLight}
                />
                {errEl("domaineActivite")}
              </div>
              <div className="min-w-0">
                <label className={labelCls}>
                  Poste cible *
                </label>
                <input
                  value={targetPosition}
                  onChange={(e) => {
                    setTargetPosition(e.target.value);
                    clearFieldError("targetPosition");
                  }}
                  placeholder="Ex: Data Scientist, Software Engineer..."
                  className={inputClass}
                />
                {errEl("targetPosition")}
              </div>
            </div>
          </div>
        )}

        {/* Étape 2 : salaire, contrats, textes, CV / liens */}
        {currentWizardStep === 2 && (
          <>
          <p
            className={`text-[12px] -mt-1 mb-1 ${isLight ? "text-black/55" : "text-white/55"}`}
          >
            Précise tes attentes, décris ton projet et ajoute ton CV ainsi que tes
            liens.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className={labelCls}>
                Salaire minimum (MAD) *
              </label>
              <input
                value={salaireMinimum}
                inputMode="numeric"
                pattern="[0-9]*"
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, "");
                  setSalaireMinimum(digitsOnly);
                  clearFieldError("salaireMinimum");
                }}
                placeholder="Ex: 8000"
                className={inputClass}
              />
              {errEl("salaireMinimum")}
            </div>
            <div className="min-w-0">
              <label className={labelCls}>
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
                        clearFieldError("typeContrat");
                      }}
                      className={[
                        "px-3 py-1.5 rounded-full border transition-colors",
                        active
                          ? "border-tap-red bg-tap-red/20 text-white"
                          : isLight
                            ? "border-black/15 text-black/60 hover:border-black/30"
                            : "border-white/20 text-white/60 hover:border-white/40",
                      ].join(" ")}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
              {errEl("typeContrat")}
            </div>
            <div className="min-w-0 sm:col-span-2">
              <label className={labelCls}>
                Exigences / Pré-requis *
              </label>
              <textarea
                value={constraints}
                onChange={(e) => {
                  setConstraints(e.target.value);
                  clearFieldError("constraints");
                }}
                rows={3}
                className={`${inputClass} min-h-[88px] resize-none`}
                placeholder="Ex: Télétravail 3 jours/semaine, localisation Casablanca, etc."
              />
              {errEl("constraints")}
            </div>
            <div className="min-w-0 sm:col-span-2">
              <label className={labelCls}>
                Ce que tu recherches *
              </label>
              <textarea
                value={searchCriteria}
                onChange={(e) => {
                  setSearchCriteria(e.target.value);
                  clearFieldError("searchCriteria");
                }}
                rows={3}
                className={`${inputClass} min-h-[88px] resize-none`}
                placeholder="Ex: opportunités de croissance, projets IA, environnement startup..."
              />
              {errEl("searchCriteria")}
            </div>
          </div>

          <div
            className={`space-y-4 pt-5 mt-1 ${isLight ? "border-t border-black/10" : "border-t border-white/10"}`}
          >
            {cvFile &&
            !checkingCvPhoto &&
            cvNeedsManualPhoto === true ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                <div className="min-w-0">
                  <label className={labelCls}>
                    CV (PDF ou DOCX)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className={fileInputClass}
                  />
                  {errEl("cvFile")}
                  {cvFile && (
                    <div className={fileRowBox}>
                      <span className={fileNameText}>{cvFile.name}</span>
                      <button
                        type="button"
                        onClick={handleRemoveCv}
                        className="text-red-300 hover:text-red-200"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                  <p
                    className={`mt-1 text-[11px] ${isLight ? "text-black/50" : "text-white/50"}`}
                  >
                    💡 Extraction auto des compétences et expériences depuis ton
                    CV.
                  </p>
                </div>
                <div className="min-w-0">
                  <label className={labelCls}>
                    Photo professionnelle *
                  </label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={handleImageChange}
                    className={fileInputClass}
                  />
                  {errEl("photoPro")}
                  {imgFile && (
                    <div className={fileRowBox}>
                      <span className={fileNameText}>{imgFile.name}</span>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="text-red-300 hover:text-red-200"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                  <p
                    className={`mt-1 text-[11px] ${isLight ? "text-black/50" : "text-white/50"}`}
                  >
                    Aucune photo détectée dans le CV — ajoute-en une pour la Talent
                    Card.
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full">
                <label className={labelCls}>
                  CV (PDF ou DOCX)
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className={fileInputClass}
                />
                {errEl("cvFile")}
                {cvFile && (
                  <div className={fileRowBox}>
                    <span className={fileNameText}>{cvFile.name}</span>
                    <button
                      type="button"
                      onClick={handleRemoveCv}
                      className="text-red-300 hover:text-red-200"
                    >
                      Supprimer
                    </button>
                  </div>
                )}
                <p
                  className={`mt-1 text-[11px] ${isLight ? "text-black/50" : "text-white/50"}`}
                >
                  💡 Je vais extraire automatiquement tes compétences, expériences et
                  réalisations de ton CV.
                </p>
              </div>
            )}

            {checkingCvPhoto && cvFile && (
              <p className={`text-[12px] ${isLight ? "text-black/55" : "text-white/60"}`}>
                Vérification de la photo dans ton CV...
              </p>
            )}

            {cvFile && !checkingCvPhoto && cvNeedsManualPhoto === null && (
              <p className={`text-[12px] ${isLight ? "text-black/50" : "text-white/50"}`}>
                Impossible de vérifier si ton CV contient une photo. Tu peux
                continuer, ou ajouter une photo si tu veux.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="min-w-0">
                <label className={labelCls}>
                  OU URL LinkedIn (obligatoire avec GitHub ou seul)
                </label>
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => {
                    setLinkedinUrl(e.target.value);
                    clearFieldError("linkedinUrl");
                    clearFieldError("socialLinks");
                  }}
                  placeholder="https://www.linkedin.com/in/..."
                  className={inputClass}
                />
                {errEl("linkedinUrl")}
              </div>
              <div className="min-w-0">
                <label className={labelCls}>
                  URL GitHub (obligatoire avec LinkedIn ou seul)
                </label>
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(e) => {
                    setGithubUrl(e.target.value);
                    clearFieldError("githubUrl");
                    clearFieldError("socialLinks");
                  }}
                  placeholder="https://github.com/..."
                  className={inputClass}
                />
                {errEl("githubUrl")}
              </div>
            </div>
            {errEl("socialLinks")}
            <p className={`text-[11px] ${isLight ? "text-black/45" : "text-white/45"}`}>
              Au moins une URL est obligatoire : LinkedIn ou GitHub.
            </p>
            <div>
              <label className={labelCls}>
                Autres liens (optionnel)
              </label>
              <div className="space-y-2">
                {otherLinks.map((link, index) => (
                  <div key={index} className="w-full space-y-2">
                    <input
                      value={link.type}
                      onChange={(e) => {
                        const next = [...otherLinks];
                        next[index] = { ...next[index], type: e.target.value };
                        setOtherLinks(next);
                      }}
                      placeholder="Ex: Portfolio, Instagram..."
                      className={`${inputClass} w-full`}
                    />
                    <input
                      value={link.url}
                      onChange={(e) => {
                        const next = [...otherLinks];
                        next[index] = { ...next[index], url: e.target.value };
                        setOtherLinks(next);
                      }}
                      placeholder="https://..."
                      className={`${inputClass} w-full`}
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
          </>
        )}

        {showFinalizeSection && (
          <div
            className={`space-y-4 text-left pt-5 mt-2 ${isLight ? "border-t border-black/10" : "border-t border-white/10"}`}
          >
            <h3
              className={`text-lg font-semibold mb-2 ${isLight ? "text-black" : "text-white"}`}
            >
              Ton profil est complet !
            </h3>
            {showResumeHint && !loading && (
              <div
                className={`mb-4 rounded-xl border px-4 py-3 text-left text-[13px] ${
                  isLight
                    ? "border-amber-600/30 bg-amber-500/[0.12] text-amber-950/90"
                    : "border-amber-500/35 bg-amber-500/10 text-amber-100/95"
                }`}
              >
                La génération des fichiers n’était pas terminée. Clique sur{" "}
                <span className="font-semibold">Finaliser mon profil</span> pour
                relancer l’envoi et suivre la progression (toasts en haut à droite).
              </div>
            )}
            <p className={`text-[12px] ${isLight ? "text-black/50" : "text-white/50"}`}>
              La génération peut prendre quelques instants. Tu pourras ensuite
              utiliser ton profil pour le matching et les candidatures.
            </p>
            <div className={`${genPanelClass} text-left`}>
              <div className="mb-2 flex items-center justify-between text-[12px]">
                <span className={isLight ? "text-black/70" : "text-white/80"}>
                  Progression de la génération
                </span>
                <span
                  className={`font-semibold ${isLight ? "text-black" : "text-white"}`}
                >
                  {loading ? generationProgress : 0}%
                </span>
              </div>
              <div
                className={`h-2 w-full overflow-hidden rounded-full ${isLight ? "bg-black/10" : "bg-white/10"}`}
              >
                <div
                  className="h-full rounded-full bg-tap-red transition-all duration-500 ease-out"
                  style={{
                    width: `${loading ? generationProgress : 0}%`,
                  }}
                />
              </div>
              <div className="mt-3 space-y-2">
                {generationSteps.map((step) => {
                  const isDone = completedGenerationSteps.includes(step.id);
                  const isCurrent =
                    loading && currentGenerationStep === step.id && !isDone;
                  return (
                    <div
                      key={step.id}
                      className="flex items-center justify-between text-[12px]"
                    >
                      <span
                        className={
                          isDone
                            ? isLight
                              ? "text-emerald-700"
                              : "text-emerald-300"
                            : isCurrent
                              ? isLight
                                ? "text-black"
                                : "text-white"
                              : isLight
                                ? "text-black/40"
                                : "text-white/45"
                        }
                      >
                        {step.label}
                      </span>
                      <span
                        className={
                          isDone
                            ? isLight
                              ? "text-emerald-700"
                              : "text-emerald-300"
                            : isCurrent
                              ? "text-tap-red"
                              : isLight
                                ? "text-black/35"
                                : "text-white/40"
                        }
                      >
                        {isDone
                          ? "Terminé"
                          : isCurrent
                            ? "En cours…"
                            : "En attente"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div
          className={`mt-6 pt-4 border-t flex items-center justify-between ${isLight ? "border-black/10" : "border-white/10"}`}
        >
          {currentWizardStep > 1 || showFinalizeSection ? (
            <button
              type="button"
              onClick={handlePrevious}
              className={`text-[12px] ${isLight ? "text-black/50 hover:text-black" : "text-white/60 hover:text-white"}`}
            >
              ← Précédent
            </button>
          ) : (
            <span />
          )}
          {!showFinalizeSection ? (
            <button
              type="button"
              onClick={handleNext}
              className="btn-primary btn-sm"
            >
              Suivant →
            </button>
          ) : (
            <button
              type="submit"
              disabled={
                loading ||
                !isStepComplete(1) ||
                !isStepComplete(2)
              }
              className="btn-primary btn-sm disabled:opacity-55 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_16px_rgba(202,27,40,0.35)]"
            >
              {loading ? "Génération en cours…" : "Finaliser mon profil"}
            </button>
          )}
        </div>
      </form>
      </div>
    </div>
  );
}

