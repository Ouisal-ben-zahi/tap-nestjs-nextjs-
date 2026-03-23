"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import EmptyState from "@/components/ui/EmptyState";
import api from "@/lib/api";
import DropdownSelect from "@/components/app/DropdownSelect";

type OtherLink = { type: string; url: string };

const wizardSteps = [
  {
    id: 1,
    title: "Comprendre ton profil",
    subtitle: "Qui tu es",
    aiMessage:
      " Salut ! Avant de commencer, laisse-moi t'expliquer ce que je vais faire : je vais analyser ton profil pour comprendre ton contexte et adapter les opportunités qui te correspondent vraiment.",
    aiExplanation:
      " Pourquoi je demande ça ? Ces informations m'aident à comprendre ton contexte et à filtrer les opportunités qui matchent vraiment avec ta situation.",
    whatAiDoes:
      "Une fois que tu auras rempli ces informations, j'analyserai ton profil pour créer une carte d'identité professionnelle personnalisée.",
  },
  {
    id: 2,
    title: "Ton objectif professionnel",
    subtitle: "Ce que tu veux",
    aiMessage:
      "Parfait ! Je vais structurer tes aspirations pour créer un profil qui attire les bonnes opportunités.",
    aiExplanation:
      "Plus je comprends ce que tu veux, mieux je peux structurer ta candidature pour attirer les bonnes opportunités.",
    whatAiDoes:
      "Je transforme tes objectifs en un profil ciblé qui parle directement aux recruteurs.",
  },
  {
    id: 3,
    title: "Tes compétences",
    subtitle: "Ce que tu sais faire",
    aiMessage:
      "Super ! Je vais analyser ton CV ou ton LinkedIn pour extraire automatiquement tes compétences, expériences et réalisations.",
    aiExplanation:
      "Au lieu de te faire remplir un long formulaire, je lis directement ton CV pour gagner du temps.",
    whatAiDoes:
      "J'utilise l'IA pour extraire automatiquement tes compétences et expériences depuis ton CV ou LinkedIn.",
  },
  {
    id: 4,
    title: "Validation & génération",
    subtitle: "Ton profil est prêt",
    aiMessage:
      "Excellent ! Ton profil est complet. Je vais générer une Talent Card et structurer ton profil pour les recruteurs.",
    aiExplanation:
      "Tu obtiendras un profil structuré, prêt à être utilisé pour le matching et les candidatures.",
    whatAiDoes:
      "Je génère et sauvegarde ton profil pour qu'il puisse être utilisé par l'IA et les recruteurs.",
  },
];

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

const DOMAINE_GROUPS: DropdownGroup[] = [
  {
    label: "Informatique & Technologies (IT)",
    options: [
      { value: "Développement logiciel / Software engineering", label: "Développement logiciel / Software engineering" },
      { value: "Développement web", label: "Développement web" },
      { value: "Réseaux informatiques", label: "Réseaux informatiques" },
      { value: "Cybersécurité", label: "Cybersécurité" },
      { value: "Cloud computing", label: "Cloud computing" },
      { value: "DevOps", label: "DevOps" },
      { value: "Architecture logicielle", label: "Architecture logicielle" },
    ],
  },
  {
    label: "Intelligence artificielle & Data",
    options: [
      { value: "Data science", label: "Data science" },
      { value: "Analyse de données", label: "Analyse de données" },
      {
        value: "Intelligence artificielle & Machine learning",
        label: "Intelligence artificielle & Machine learning",
      },
      { value: "Business Intelligence (BI)", label: "Business Intelligence (BI)" },
      { value: "ERP & CRM", label: "ERP & CRM" },
    ],
  },
  {
    label: "Marketing & Communication",
    options: [
      { value: "Marketing digital", label: "Marketing digital" },
      { value: "Community management", label: "Community management" },
      { value: "SEO / SEA", label: "SEO / SEA" },
      { value: "Content marketing", label: "Content marketing" },
      {
        value: "Branding & communication corporate",
        label: "Branding & communication corporate",
      },
      { value: "Relations publiques (RP)", label: "Relations publiques (RP)" },
      { value: "Email marketing", label: "Email marketing" },
      { value: "Growth marketing", label: "Growth marketing" },
    ],
  },
  {
    label: "Finance, Comptabilité & Banque",
    options: [
      { value: "Comptabilité générale", label: "Comptabilité générale" },
      { value: "Audit & contrôle de gestion", label: "Audit & contrôle de gestion" },
      { value: "Finance d’entreprise", label: "Finance d’entreprise" },
      { value: "Analyse financière", label: "Analyse financière" },
      { value: "Banque & gestion de portefeuille", label: "Banque & gestion de portefeuille" },
      { value: "Fiscalité", label: "Fiscalité" },
      { value: "Trésorerie", label: "Trésorerie" },
      { value: "Assurance", label: "Assurance" },
    ],
  },
  {
    label: "Commerce & Vente",
    options: [
      { value: "Vente terrain", label: "Vente terrain" },
      { value: "Vente en magasin / retail", label: "Vente en magasin / retail" },
      { value: "Business development", label: "Business development" },
      { value: "Gestion grands comptes", label: "Gestion grands comptes" },
      { value: "E-commerce", label: "E-commerce" },
      { value: "Relation client", label: "Relation client" },
      { value: "Négociation commerciale", label: "Négociation commerciale" },
      { value: "Avant-vente / presales", label: "Avant-vente / presales" },
    ],
  },
  {
    label: "Transport & Automobile",
    options: [
      { value: "Logistique transport", label: "Logistique transport" },
      { value: "Maintenance automobile", label: "Maintenance automobile" },
      { value: "Gestion flotte véhicules", label: "Gestion flotte véhicules" },
      { value: "Transport international", label: "Transport international" },
      { value: "Exploitation transport", label: "Exploitation transport" },
      { value: "Mécanique automobile", label: "Mécanique automobile" },
      { value: "Diagnostic technique", label: "Diagnostic technique" },
    ],
  },
  {
    label: "Télécommunications",
    options: [
      { value: "Réseaux télécom", label: "Réseaux télécom" },
      { value: "Support télécom", label: "Support télécom" },
      { value: "Fibre optique", label: "Fibre optique" },
      { value: "Radio & mobile (4G/5G)", label: "Radio & mobile (4G/5G)" },
      {
        value: "VoIP & communications unifiées",
        label: "VoIP & communications unifiées",
      },
      { value: "Infrastructure télécom", label: "Infrastructure télécom" },
    ],
  },
  {
    label: "Immobilier",
    options: [
      { value: "Transaction immobilière", label: "Transaction immobilière" },
      { value: "Gestion locative", label: "Gestion locative" },
      { value: "Syndic", label: "Syndic" },
      { value: "Promotion immobilière", label: "Promotion immobilière" },
      { value: "Expertise immobilière", label: "Expertise immobilière" },
      { value: "Négociation immobilière", label: "Négociation immobilière" },
    ],
  },
  {
    label: "Média, Design & Création",
    options: [
      { value: "Design graphique", label: "Design graphique" },
      { value: "UI / UX design", label: "UI / UX design" },
      { value: "Motion design", label: "Motion design" },
      { value: "Montage vidéo", label: "Montage vidéo" },
      { value: "Photographie", label: "Photographie" },
      { value: "Illustration", label: "Illustration" },
      { value: "Production média", label: "Production média" },
      { value: "Direction artistique", label: "Direction artistique" },
    ],
  },
  {
    label: "Logistique & Supply chain",
    options: [
      { value: "Gestion des stocks", label: "Gestion des stocks" },
      { value: "Planification & approvisionnement", label: "Planification & approvisionnement" },
      { value: "Transport & distribution", label: "Transport & distribution" },
      { value: "Supply chain management", label: "Supply chain management" },
      { value: "Import / Export", label: "Import / Export" },
      { value: "Gestion d’entrepôt", label: "Gestion d’entrepôt" },
      { value: "Procurement / achats", label: "Procurement / achats" },
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
  const FLASK_AI_URL =
    process.env.NEXT_PUBLIC_FLASK_AI_URL ?? "http://31.97.196.196:5002";

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
  const [checkingCvPhoto, setCheckingCvPhoto] = useState(false);
  const [cvNeedsManualPhoto, setCvNeedsManualPhoto] = useState<boolean | null>(
    null,
  );
  const queryClient = useQueryClient();

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
        return nationality && locationCountry && seniorityLevel && disponibilite;
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
        if (cvFile) {
          if (cvNeedsManualPhoto === true) return Boolean(imgFile);
          // Photo OK (ou inconnue) => vérifier aussi LinkedIn ou GitHub
          return Boolean(linkedinUrl.trim() || githubUrl.trim());
        }
        return false;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setCvFile(selectedFile);
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
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) setImgFile(selectedFile);
  };

  const handleRemoveImage = () => {
    setImgFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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

      const formData = new FormData();
      // Nest expects `file` for CV. It will forward to Flask as `cv_file`.
      formData.append("file", cvFile);

      // Optional: forward photo to Flask for better talentcard generation.
      if (imgFile) {
        formData.append("img_file", imgFile);
      }

      // Forward onboarding fields to Flask (via Nest)
      formData.append("lang", talentCardLang);
      if (hasLinkedin) formData.append("linkedin_url", linkedinUrl.trim());
      if (hasGithub) formData.append("github_url", githubUrl.trim());
      if (targetPosition.trim()) formData.append("target_position", targetPosition.trim());
      if (targetCountry.trim()) formData.append("target_country", targetCountry.trim());
      if (pretARelocater.trim()) formData.append("pret_a_relocater", pretARelocater.trim());
      if (constraints.trim()) formData.append("constraints", constraints.trim());
      if (searchCriteria.trim()) formData.append("search_criteria", searchCriteria.trim());
      if (nationality.trim()) formData.append("nationality", nationality.trim());
      if (locationCountry.trim()) formData.append("location_country", locationCountry.trim());
      if (seniorityLevel.trim()) formData.append("seniority_level", seniorityLevel.trim());
      if (disponibilite.trim()) formData.append("disponibilite", disponibilite.trim());
      if (salaireMinimum.trim()) formData.append("salaire_minimum", salaireMinimum.trim());
      if (domaineActivite.trim()) formData.append("domaine_activite", domaineActivite.trim());

      typeContrat.forEach((t) => formData.append("type_contrat", t));
      if (otherLinks.length > 0) {
        formData.append("other_links", JSON.stringify(otherLinks));
      }

      await api.post("/dashboard/candidat/upload-cv", formData);

      // Attendre que la Talent Card soit générée (polling sur les fichiers Talent Card)
      const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
      try {
        for (let i = 0; i < 20; i += 1) {
          try {
            const res = await api.get<{ talentcardFiles: unknown[] }>(
              "/dashboard/candidat/talentcard-files",
            );
            const files = Array.isArray(res.data?.talentcardFiles)
              ? res.data.talentcardFiles
              : [];
            if (files.length > 0) {
              break;
            }
          } catch {
            // on ignore et on retente
          }
          await sleep(3000);
        }
      } catch {
        // en cas de problème de polling, on laisse quand même l'utilisateur aller au dashboard
      }

      // Forcer la mise à jour des stats candidat afin que /app et /app/matching
      // voient bien le profil créé immédiatement après l'onboarding.
      queryClient.invalidateQueries({ queryKey: ["candidat", "stats"] });

      router.push("/app");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Erreur lors de la sauvegarde du profil.";
      setError(message);
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
              <DropdownSelect
                value={nationality}
                onChange={setNationality}
                placeholder="Ex: Marocaine, Française, Canadienne..."
                groups={NATIONALITE_GROUPS}
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[2px] text-white/50 mb-2">
                Pays de résidence actuel *
              </label>
              <DropdownSelect
                value={locationCountry}
                onChange={setLocationCountry}
                placeholder="Ex: Maroc, France, Canada..."
                groups={PAYS_GROUPS}
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[2px] text-white/50 mb-2">
                Niveau de séniorité *
              </label>
              <DropdownSelect
                value={seniorityLevel}
                onChange={setSeniorityLevel}
                placeholder="Sélectionner..."
                groups={SENIORITY_GROUPS}
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[2px] text-white/50 mb-2">
                Disponibilité *
              </label>
              <DropdownSelect
                value={disponibilite}
                onChange={setDisponibilite}
                placeholder="Sélectionner..."
                groups={DISPONIBILITE_GROUPS}
              />
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
              <DropdownSelect
                value={targetCountry}
                onChange={setTargetCountry}
                placeholder="Ex: France, Canada, USA..."
                groups={PAYS_GROUPS}
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[2px] text-white/50 mb-2">
                Prêt à relocaliser
              </label>
              <DropdownSelect
                value={pretARelocater}
                onChange={setPretARelocater}
                placeholder="Non spécifié"
                groups={RELOCATION_GROUPS}
              />
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
                inputMode="numeric"
                pattern="[0-9]*"
                onChange={(e) => {
                  // Garde uniquement les chiffres (pas de lettres / séparateurs)
                  const digitsOnly = e.target.value.replace(/\D/g, "");
                  setSalaireMinimum(digitsOnly);
                }}
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
              <DropdownSelect
                value={domaineActivite}
                onChange={setDomaineActivite}
                placeholder="Sélectionner..."
                groups={DOMAINE_GROUPS}
              />
              <select
                value={domaineActivite}
                onChange={(e) => setDomaineActivite(e.target.value)}
                className="hidden"
                aria-hidden="true"
              >
                <option value="">Sélectionner...</option>

                <optgroup label="Informatique & Technologies (IT)">
                  <option value="Développement logiciel / Software engineering">
                    Développement logiciel / Software engineering
                  </option>
                  <option value="Développement web">Développement web</option>
                  <option value="Réseaux informatiques">Réseaux informatiques</option>
                  <option value="Cybersécurité">Cybersécurité</option>
                  <option value="Cloud computing">Cloud computing</option>
                  <option value="DevOps">DevOps</option>
                  <option value="Architecture logicielle">Architecture logicielle</option>
                </optgroup>

                <optgroup label="Intelligence artificielle & Data">
                  <option value="Data science">Data science</option>
                  <option value="Analyse de données">Analyse de données</option>
                  <option value="Intelligence artificielle & Machine learning">
                    Intelligence artificielle & Machine learning
                  </option>
                  <option value="Business Intelligence (BI)">
                    Business Intelligence (BI)
                  </option>
                  <option value="ERP & CRM">ERP & CRM</option>
                </optgroup>

                <optgroup label="Marketing & Communication">
                  <option value="Marketing digital">Marketing digital</option>
                  <option value="Community management">Community management</option>
                  <option value="SEO / SEA">SEO / SEA</option>
                  <option value="Content marketing">Content marketing</option>
                  <option value="Branding & communication corporate">
                    Branding & communication corporate
                  </option>
                  <option value="Relations publiques (RP)">
                    Relations publiques (RP)
                  </option>
                  <option value="Email marketing">Email marketing</option>
                  <option value="Growth marketing">Growth marketing</option>
                </optgroup>

                <optgroup label="Finance, Comptabilité & Banque">
                  <option value="Comptabilité générale">Comptabilité générale</option>
                  <option value="Audit & contrôle de gestion">
                    Audit & contrôle de gestion
                  </option>
                  <option value="Finance d’entreprise">Finance d’entreprise</option>
                  <option value="Analyse financière">Analyse financière</option>
                  <option value="Banque & gestion de portefeuille">
                    Banque & gestion de portefeuille
                  </option>
                  <option value="Fiscalité">Fiscalité</option>
                  <option value="Trésorerie">Trésorerie</option>
                  <option value="Assurance">Assurance</option>
                </optgroup>

                <optgroup label="Commerce & Vente">
                  <option value="Vente terrain">Vente terrain</option>
                  <option value="Vente en magasin / retail">
                    Vente en magasin / retail
                  </option>
                  <option value="Business development">Business development</option>
                  <option value="Gestion grands comptes">Gestion grands comptes</option>
                  <option value="E-commerce">E-commerce</option>
                  <option value="Relation client">Relation client</option>
                  <option value="Négociation commerciale">Négociation commerciale</option>
                  <option value="Avant-vente / presales">Avant-vente / presales</option>
                </optgroup>

                <optgroup label="Transport & Automobile">
                  <option value="Logistique transport">Logistique transport</option>
                  <option value="Maintenance automobile">Maintenance automobile</option>
                  <option value="Gestion flotte véhicules">
                    Gestion flotte véhicules
                  </option>
                  <option value="Transport international">Transport international</option>
                  <option value="Exploitation transport">Exploitation transport</option>
                  <option value="Mécanique automobile">Mécanique automobile</option>
                  <option value="Diagnostic technique">Diagnostic technique</option>
                </optgroup>

                <optgroup label="Télécommunications">
                  <option value="Réseaux télécom">Réseaux télécom</option>
                  <option value="Support télécom">Support télécom</option>
                  <option value="Fibre optique">Fibre optique</option>
                  <option value="Radio & mobile (4G/5G)">Radio & mobile (4G/5G)</option>
                  <option value="VoIP & communications unifiées">
                    VoIP & communications unifiées
                  </option>
                  <option value="Infrastructure télécom">Infrastructure télécom</option>
                </optgroup>

                <optgroup label="Immobilier">
                  <option value="Transaction immobilière">Transaction immobilière</option>
                  <option value="Gestion locative">Gestion locative</option>
                  <option value="Syndic">Syndic</option>
                  <option value="Promotion immobilière">Promotion immobilière</option>
                  <option value="Expertise immobilière">Expertise immobilière</option>
                  <option value="Négociation immobilière">Négociation immobilière</option>
                </optgroup>

                <optgroup label="Média, Design & Création">
                  <option value="Design graphique">Design graphique</option>
                  <option value="UI / UX design">UI / UX design</option>
                  <option value="Motion design">Motion design</option>
                  <option value="Montage vidéo">Montage vidéo</option>
                  <option value="Photographie">Photographie</option>
                  <option value="Illustration">Illustration</option>
                  <option value="Production média">Production média</option>
                  <option value="Direction artistique">Direction artistique</option>
                </optgroup>

                <optgroup label="Logistique & Supply chain">
                  <option value="Gestion des stocks">Gestion des stocks</option>
                  <option value="Planification & approvisionnement">
                    Planification & approvisionnement
                  </option>
                  <option value="Transport & distribution">Transport & distribution</option>
                  <option value="Supply chain management">Supply chain management</option>
                  <option value="Import / Export">Import / Export</option>
                  <option value="Gestion d’entrepôt">Gestion d’entrepôt</option>
                  <option value="Procurement / achats">Procurement / achats</option>
                </optgroup>
              </select>
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
                required
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

            {checkingCvPhoto && cvFile && (
              <p className="text-[12px] text-white/60">
                Vérification de la photo dans ton CV...
              </p>
            )}

            {cvFile && !checkingCvPhoto && cvNeedsManualPhoto === null && (
              <p className="text-[12px] text-white/50">
                Impossible de vérifier si ton CV contient une photo. Tu peux
                continuer, ou ajouter une photo si tu veux.
              </p>
            )}

            {cvFile && cvNeedsManualPhoto === true && (
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
                <p className="mt-1 text-[11px] text-white/50">
                  Ton CV ne contient pas de photo détectable, ajoute-en une pour
                  améliorer la Talent Card.
                </p>
              </div>
            )}
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[2px] text-white/50 mb-2">
                OU URL LinkedIn (obligatoire avec GitHub ou seul)
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
                URL GitHub (obligatoire avec LinkedIn ou seul)
              </label>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/..."
                className="input-premium"
              />
            </div>
            <p className="text-[11px] text-white/45">
              Au moins une URL est obligatoire : LinkedIn ou GitHub.
            </p>
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
               Ton profil est complet !
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
              La génération peut prendre quelques instants. Tu pourras ensuite
              utiliser ton profil pour le matching et les candidatures.
            </p>
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
              {loading ? " Génération en cours..." : " Finaliser mon profil"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

