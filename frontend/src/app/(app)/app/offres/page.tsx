"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import {
  useRecruteurJobs,
  useRecruteurJob,
  useCreateJob,
  useUpdateJob,
  useDeleteJob,
  useToggleJobStatus,
} from "@/hooks/use-recruteur";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import DropdownSelect from "@/components/app/DropdownSelect";
import {
  Briefcase,
  Plus,
  X,
  MapPin,
  Clock,
  DollarSign,
  Users,
  ChevronDown,
  CheckCircle2,
  CircleSlash2,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { JobPayload } from "@/types/recruteur";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";
import { DOMAINE_VALUES } from "@/constants/domaines";

const CATEGORIES = DOMAINE_VALUES;
const NIVEAUX = ["Junior", "Intermédiaire", "Senior", "Lead", "Manager"];
const CONTRATS = ["CDI", "CDD", "Stage", "Freelance", "Alternance"];
const NIVEAUX_ETUDE = ["Bac", "Bac+2", "Bac+3", "Bac+5", "Bac+8"];
const SOFT_SKILLS = ["Autonomie", "Communication", "Organisation", "Teamwork", "Learning", "Rigueur"];
const SKILL_LEVELS = ["Debutant", "Intermediaire", "Avance"];
const SKILL_PRIORITIES = ["Indispensable", "Apprecie"];
const LANGUAGE_LEVELS = ["Debutant", "Intermediaire", "Courant"];
const LANGUAGE_IMPORTANCE = ["Indispensable", "Apprecie"];


// Liste courte de pays principaux pour le recrutement
const COUNTRIES = [
  "Maroc",
  "France",
  "Belgique",
  "Suisse",
  "Canada",
  "Espagne",
  "Allemagne",
  "Royaume-Uni",
  "États-Unis",
  "Pays-Bas",
  "Italie",
  "Portugal",
  "Luxembourg",
  "Émirats arabes unis",
  "Autre",
];

// Villes principales seulement par pays
const CITIES_BY_COUNTRY: Record<string, string[]> = {
  Maroc: [ "Agadir",
    "Ain El Aouda",
    "Ait Melloul",
    "Al Hoceima",
    "Azrou",
    "Beni Mellal",
    "Berkane",
    "Berrechid",
    "Bouskoura",
    "Bouznika",
    "Casablanca",
    "Chefchaouen",
    "Dakhla",
    "El Jadida",
    "Errachidia",
    "Essaouira",
    "Fes",
    "Figuig",
    "Guelmim",
    "Ifrane",
    "Inezgane",
    "Kenitra",
    "Khemisset",
    "Khouribga",
    "Ksar El Kebir",
    "Laayoune",
    "Larache",
    "Marrakech",
    "Martil",
    "Meknes",
    "Midelt",
    "Mohammedia",
    "Nador",
    "Ouarzazate",
    "Oujda",
    "Rabat",
    "Safi",
    "Sale",
    "Sefrou",
    "Settat",
    "Sidi Bennour",
    "Sidi Kacem",
    "Sidi Slimane",
    "Tanger",
    "Taza",
    "Temara",
    "Tetouan",
    "Tinghir",
    "Tiznit",
    "Youssoufia",
    "Zagora",
    "Zemamra",
    "Autre",],
  France: ["Paris", "Lyon", "Marseille", "Toulouse", "Lille", "Autre"],
  Belgique: ["Bruxelles", "Anvers", "Gand", "Autre"],
  Suisse: ["Genève", "Lausanne", "Zurich", "Autre"],
  Canada: ["Montréal", "Québec", "Toronto", "Vancouver", "Autre"],
  Espagne: ["Madrid", "Barcelone", "Valence", "Autre"],
  Allemagne: ["Berlin", "Munich", "Hambourg", "Autre"],
  "Royaume-Uni": ["Londres", "Manchester", "Birmingham", "Autre"],
  "États-Unis": ["New York", "San Francisco", "Los Angeles", "Autre"],
  "Pays-Bas": ["Amsterdam", "Rotterdam", "Utrecht", "Autre"],
  Italie: ["Rome", "Milan", "Turin", "Autre"],
  Portugal: ["Lisbonne", "Porto", "Autre"],
  Luxembourg: ["Luxembourg-ville", "Autre"],
  "Émirats arabes unis": ["Dubaï", "Abou Dabi", "Autre"],
  Autre: ["Remote", "Autre"],
};

const emptyForm: JobPayload = {
  title: "",
  categorie_profil: "Developpement logiciel / Software engineering",
  niveau_attendu: null,
  experience_min: "",
  presence_sur_site: "",
  localisation: "",
  reason: "",
  main_mission: "",
  tasks_other: "",
  disponibilite: "",
  salary_min: null,
  salary_max: null,
  urgent: false,
  contrat: "CDI",
  niveau_seniorite: "Junior",
  entreprise: "",
  phone: "",
};

function hydrateFormFromJobRow(
  job: Record<string, unknown>,
  defaults: JobPayload,
): {
  form: JobPayload;
  country: string;
  city: string;
  selectedCities: string[];
  softSkills: string[];
  skills: { name: string; level: string; priority: string }[];
  languages: { name: string; level: string; importance: string }[];
} {
  const loc = String(job.location_type ?? job.localisation ?? "").trim();
  let country = "";
  let city = "";
  let selectedCities: string[] = [];
  if (loc) {
    const parts = loc.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const last = parts[parts.length - 1]!;
      if (COUNTRIES.includes(last)) {
        country = last;
        const rest = parts.slice(0, -1);
        if (rest.length === 1) city = rest[0]!;
        else selectedCities = rest;
      } else {
        selectedCities = parts;
      }
    } else if (parts.length === 1) {
      selectedCities = parts;
    }
  }

  const soft_skills = Array.isArray(job.soft_skills) ? (job.soft_skills as string[]) : [];
  const skillsRaw = job.skills;
  const skills =
    Array.isArray(skillsRaw) && skillsRaw.length && typeof (skillsRaw as unknown[])[0] === "object"
      ? (skillsRaw as { name: string; level: string; priority: string }[])
      : [{ name: "", level: "Debutant", priority: "Indispensable" }];
  const languagesRaw = job.languages;
  const languages =
    Array.isArray(languagesRaw) && languagesRaw.length && typeof (languagesRaw as unknown[])[0] === "object"
      ? (languagesRaw as { name: string; level: string; importance: string }[])
      : [{ name: "", level: "Debutant", importance: "Indispensable" }];

  const numOrNull = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const form: JobPayload = {
    ...defaults,
    title: String(job.title ?? ""),
    categorie_profil: (job.categorie_profil as string) ?? defaults.categorie_profil,
    niveau_attendu: (job.niveau_attendu as string | null) ?? null,
    experience_min: (job.experience_min as string) ?? "",
    presence_sur_site: (job.presence_sur_site as string) ?? "",
    localisation: loc,
    reason: (job.reason as string) ?? "",
    main_mission: (job.main_mission as string) ?? "",
    tasks_other: (job.tasks_other as string) ?? "",
    disponibilite: (job.disponibilite as string) ?? "",
    salary_min: numOrNull(job.salary_min),
    salary_max: numOrNull(job.salary_max),
    urgent: Boolean(job.urgent),
    contrat: (job.contrat as string) ?? defaults.contrat,
    niveau_seniorite: (job.niveau_seniorite as string) ?? defaults.niveau_seniorite,
    entreprise: (job.entreprise as string) ?? "",
    phone: (job.phone as string) ?? "",
  };

  return { form, country, city, selectedCities, softSkills: soft_skills, skills, languages };
}

export default function OffresPage() {
  const { isRecruteur } = useAuth();
  const jobsQuery = useRecruteurJobs();
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();
  const toggleJobStatus = useToggleJobStatus();
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [deleteConfirmJobId, setDeleteConfirmJobId] = useState<number | null>(null);
  const editJobQuery = useRecruteurJob(editingJobId, Boolean(editingJobId));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<JobPayload>(emptyForm);
  const [categorieOpen, setCategorieOpen] = useState(false);
  const [niveauOpen, setNiveauOpen] = useState(false);
  const [contratOpen, setContratOpen] = useState(false);
  const [presenceOpen, setPresenceOpen] = useState(false);
  const [dispoOpen, setDispoOpen] = useState(false);
  const [country, setCountry] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [softSkills, setSoftSkills] = useState<string[]>([]);
  const [skills, setSkills] = useState<{ name: string; level: string; priority: string }[]>([
    { name: "", level: "Debutant", priority: "Indispensable" },
  ]);
  const [languages, setLanguages] = useState<{ name: string; level: string; importance: string }[]>([
    { name: "", level: "Debutant", importance: "Indispensable" },
  ]);
  const [countryOpen, setCountryOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const hydratedEditJobIdRef = useRef<number | null>(null);
  const theme = useDashboardTheme();
  const isLight = theme === "light";

  if (!isRecruteur) {
    return (
      <EmptyState
        icon={<Briefcase className="w-12 h-12" />}
        title="Espace recruteur uniquement"
        description="Cette section est réservée aux recruteurs."
      />
    );
  }

  useEffect(() => {
    if (!editingJobId) {
      hydratedEditJobIdRef.current = null;
      return;
    }
    if (!editJobQuery.isSuccess || !editJobQuery.data?.job) return;
    const row = editJobQuery.data.job as Record<string, unknown>;
    if (Number(row.id) !== editingJobId) return;
    if (hydratedEditJobIdRef.current === editingJobId) return;
    hydratedEditJobIdRef.current = editingJobId;
    const h = hydrateFormFromJobRow(row, emptyForm);
    setForm(h.form);
    setCountry(h.country);
    setCity(h.city);
    setSelectedCities(h.selectedCities);
    setSoftSkills(h.softSkills);
    setSkills(h.skills);
    setLanguages(h.languages);
  }, [editingJobId, editJobQuery.isSuccess, editJobQuery.data]);

  const resetFormState = () => {
    setForm(emptyForm);
    setCountry("");
    setCity("");
    setSelectedCities([]);
    setSoftSkills([]);
    setSkills([{ name: "", level: "Debutant", priority: "Indispensable" }]);
    setLanguages([{ name: "", level: "Debutant", importance: "Indispensable" }]);
    setEditingJobId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const localisationFromSelectors =
      selectedCities.length > 0
        ? selectedCities.join(", ")
        : city && country
          ? `${city}, ${country}`
          : undefined;

    const payload: JobPayload = {
      ...form,
      localisation: localisationFromSelectors ?? form.localisation ?? "",
      soft_skills: softSkills,
      skills: skills.filter((s) => s.name.trim() !== ""),
      languages: languages.filter((l) => l.name.trim() !== ""),
    };

    if (editingJobId) {
      await updateJob.mutateAsync({ jobId: editingJobId, payload });
    } else {
      await createJob.mutateAsync(payload);
    }
    resetFormState();
    setShowForm(false);
  };

  const update = (field: keyof JobPayload, value: any) => setForm((f) => ({ ...f, [field]: value }));
  const toggleSoftSkill = (skill: string) => {
    setSoftSkills((prev) => {
      if (prev.includes(skill)) return prev.filter((s) => s !== skill);
      if (prev.length >= 5) return prev;
      return [...prev, skill];
    });
  };
  const updateLanguage = (index: number, field: "name" | "level" | "importance", value: string) => {
    setLanguages((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };
  const addLanguage = () =>
    setLanguages((prev) => [...prev, { name: "", level: "Debutant", importance: "Indispensable" }]);
  const removeLanguage = (index: number) =>
    setLanguages((prev) => prev.filter((_, i) => i !== index));
  const updateSkill = (index: number, field: "name" | "level" | "priority", value: string) => {
    setSkills((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };
  const addSkill = () =>
    setSkills((prev) => [...prev, { name: "", level: "Debutant", priority: "Indispensable" }]);
  const removeSkill = (index: number) =>
    setSkills((prev) => prev.filter((_, i) => i !== index));

  return (
    <div className="max-w-[1100px] mx-auto">
      {/* Header */}
      <div className={`relative mb-8 pb-8 ${isLight ? "border-b border-black/10" : "border-b border-white/[0.04]"}`}>
        <div className="absolute top-[-80px] left-[-100px] w-[350px] h-[350px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.08),transparent_60%)] blur-3xl pointer-events-none" />
        <div className="relative flex items-start justify-between">
          <div>
            <h1
              className={`text-[28px] sm:text-[36px] font-bold tracking-[-0.04em] font-heading ${
                isLight ? "text-black" : "text-white"
              }`}
            >
              Offres d&apos;emploi
            </h1>
            <p className={`text-[14px] mt-2 font-light ${isLight ? "text-black/60" : "text-white/45"}`}>
              Créez et gérez vos offres. Les candidats sont matchés par l&apos;IA.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowForm((open) => {
                if (open) {
                  resetFormState();
                  return false;
                }
                resetFormState();
                setEditingJobId(null);
                return true;
              });
            }}
            className="btn-primary gap-2"
          >
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "Fermer" : "Nouvelle offre"}
          </button>
        </div>
      </div>

      {/* Job Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className={`rounded-2xl p-6 sm:p-8 mb-8 space-y-5 ${
            isLight ? "card-luxury-light" : "bg-zinc-900/50 border border-white/[0.06]"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <p className={`text-[14px] font-semibold ${isLight ? "text-black" : "text-white"}`}>
              {editingJobId ? "Modifier l&apos;offre" : "Nouvelle offre"}
            </p>
            {editingJobId && editJobQuery.isLoading ? (
              <span className="text-[12px] text-white/45">Chargement des données…</span>
            ) : null}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Titre sur toute la largeur */}
            <div className="sm:col-span-2">
              <label
                className={`block text-[10px] font-semibold uppercase tracking-[2px] mb-2 ${
                  isLight ? "text-black/70" : "text-white/40"
                }`}
              >
                Titre du poste
              </label>
              <input
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                className="input-premium"
                placeholder="ex: Développeur Full Stack"
                required
              />
            </div>
            
            {/* Identité entreprise */}
            <div>
              <label
                className={`block text-[10px] font-semibold uppercase tracking-[2px] mb-2 ${
                  isLight ? "text-black/70" : "text-white/40"
                }`}
              >
                Entreprise
              </label>
              <input
                value={form.entreprise ?? ""}
                onChange={(e) => update("entreprise", e.target.value)}
                className="input-premium"
                placeholder="Nom de l'entreprise"
              />
            </div>

            <div>
              <label
                className={`block text-[10px] font-semibold uppercase tracking-[2px] mb-2 ${
                  isLight ? "text-black/70" : "text-white/40"
                }`}
              >
                Téléphone (optionnel)
              </label>
              <input
                value={form.phone ?? ""}
                onChange={(e) => update("phone", e.target.value)}
                className="input-premium"
                placeholder="+212 6 12 34 56 78"
              />
            </div>

            {/* Localisation : pays + ville */}
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Pays */}
              <div className="relative">
                <label
                  className={`block text-[10px] font-semibold uppercase tracking-[2px] mb-2 ${
                    isLight ? "text-black/70" : "text-white/40"
                  }`}
                >
                  Pays
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setCountryOpen((v) => !v);
                    setCityOpen(false);
                  }}
                  className={`input-premium w-full flex items-center justify-between cursor-pointer text-left rounded-xl ${
                    isLight
                      ? "bg-white border border-black/10 hover:border-tap-red/40"
                      : "bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08]"
                  }`}
                >
                  <span className={`text-[13px] truncate ${isLight ? "text-black" : "text-white/80"}`}>
                    {country || "Sélectionnez un pays"}
                  </span>
                  <ChevronDown size={14} className={isLight ? "text-black/60" : "text-white/45"} />
                </button>

                {countryOpen && (
                  <div className="absolute left-0 top-full mt-2 w-full bg-[#050505]/95 border border-white/[0.08] rounded-2xl shadow-lg backdrop-blur-xl overflow-hidden z-50">
                    <div>
                      {COUNTRIES.map((p) => {
                        const active = country === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              setCountry(p);
                              setCity("");
                              setCountryOpen(false);
                            }}
                            className={`w-full flex items-center gap-2.5 px-4 py-3 text-left text-[13px] transition-colors focus:outline-none focus-visible:outline-none ${
                              active
                                ? "text-white bg-red-500/15"
                                : "text-white/80 hover:text-white hover:bg-red-500/8"
                            }`}
                          >
                            <span className="flex-1 truncate">{p}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Ville */}
              <div className="relative">
                <label
                  className={`block text-[10px] font-semibold uppercase tracking-[2px] mb-2 ${
                    isLight ? "text-black/70" : "text-white/40"
                  }`}
                >
                  Ville
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (!country) return;
                    setCityOpen((v) => !v);
                    setCountryOpen(false);
                  }}
                  className={`input-premium w-full flex items-center justify-between cursor-pointer text-left rounded-xl border ${
                    country
                      ? isLight
                        ? "bg-white border border-black/10 hover:border-tap-red/40"
                        : "bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08]"
                      : isLight
                        ? "bg-white border border-black/10 text-black/40 cursor-not-allowed"
                        : "bg-white/[0.01] border-white/[0.04] text-white/30 cursor-not-allowed"
                  }`}
                  disabled={!country}
                >
                  <span className={`text-[13px] truncate ${isLight ? "text-black" : ""}`}>
                    {country
                      ? city || "Sélectionnez une ville"
                      : "Choisissez un pays d’abord"}
                  </span>
                  <ChevronDown size={14} className={isLight ? "text-black/60" : "text-white/45"} />
                </button>

                {country && cityOpen && (
                  <div className="absolute left-0 top-full mt-2 w-full bg-[#050505]/95 border border-white/[0.08] rounded-2xl shadow-lg backdrop-blur-xl overflow-hidden z-50">
                    <div>
                      {(CITIES_BY_COUNTRY[country] ?? []).map((v) => {
                        const active = city === v;
                        return (
                          <button
                            key={v}
                            type="button"
                            onClick={() => {
                              setCity(v);
                              setCityOpen(false);
                            }}
                            className={`w-full flex items-center gap-2.5 px-4 py-3 text-left text-[13px] transition-colors focus:outline-none focus-visible:outline-none ${
                              active
                                ? "text-white bg-red-500/15"
                                : "text-white/80 hover:text-white hover:bg-red-500/8"
                            }`}
                          >
                            <span className="flex-1 truncate">{v}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Type de poste */}
            <div className="relative">
              <label
                className={`block text-[10px] font-semibold uppercase tracking-[2px] mb-2 ${
                  isLight ? "text-black/70" : "text-white/40"
                }`}
              >
                Contrat
              </label>
              <button
                type="button"
                onClick={() => {
                  setContratOpen((v) => !v);
                  setCategorieOpen(false);
                  setNiveauOpen(false);
                }}
                  className={`input-premium w-full flex items-center justify-between cursor-pointer text-left rounded-xl ${
                    isLight
                      ? "bg-white border border-black/10 hover:border-tap-red/40"
                      : "bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08]"
                  }`}
              >
                <span className={`text-[13px] truncate ${isLight ? "text-black" : "text-white/80"}`}>
                  {form.contrat ?? ""}
                </span>
                <ChevronDown size={14} className={isLight ? "text-black/60" : "text-white/45"} />
              </button>

              {contratOpen && (
                <div className="absolute left-0 top-full mt-2 w-full bg-[#050505]/95 border border-white/[0.08] rounded-2xl shadow-lg backdrop-blur-xl overflow-hidden z-50">
                  <div>
                    {CONTRATS.map((c) => {
                      const active = form.contrat === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            update("contrat", c);
                            setContratOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-4 py-3 text-left text-[13px] transition-colors focus:outline-none focus-visible:outline-none ${
                            active
                              ? "text-white bg-red-500/15"
                              : "text-white/80 hover:text-white hover:bg-red-500/8"
                          }`}
                        >
                          <span className="flex-1 truncate">{c}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <label
                className={`block text-[10px] font-semibold uppercase tracking-[2px] mb-2 ${
                  isLight ? "text-black/70" : "text-white/40"
                }`}
              >
                Catégorie
              </label>
              <button
                type="button"
                onClick={() => {
                  setCategorieOpen((v) => !v);
                  setNiveauOpen(false);
                  setContratOpen(false);
                }}
                className="input-premium w-full flex items-center justify-between cursor-pointer text-left bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] rounded-xl"
              >
                <span className={`text-[13px] truncate ${isLight ? "text-black" : "text-white/80"}`}>
                  {form.categorie_profil}
                </span>
                <ChevronDown size={14} className={isLight ? "text-black/60" : "text-white/45"} />
              </button>

              {categorieOpen && (
                <div className="absolute left-0 top-full mt-2 w-full bg-[#050505]/95 border border-white/[0.08] rounded-2xl shadow-lg backdrop-blur-xl overflow-hidden z-50">
                  <div>
                    {CATEGORIES.map((c) => {
                      const active = form.categorie_profil === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            update("categorie_profil", c);
                            setCategorieOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-4 py-3 text-left text-[13px] transition-colors focus:outline-none focus-visible:outline-none ${
                            active
                              ? "text-white bg-red-500/15"
                              : "text-white/80 hover:text-white hover:bg-red-500/8"
                          }`}
                        >
                          <span className="flex-1 truncate">{c}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label
                className={`block text-[10px] font-semibold uppercase tracking-[2px] mb-2 ${
                  isLight ? "text-black/70" : "text-white/40"
                }`}
              >
                Niveau d&apos;etude attendu
              </label>
              <DropdownSelect
                value={form.niveau_attendu ?? ""}
                onChange={(value) => update("niveau_attendu", value || null)}
                placeholder="-- Selectionner --"
                groups={[
                  {
                    options: NIVEAUX_ETUDE.map((niveau) => ({
                      value: niveau,
                      label: niveau,
                    })),
                  },
                ]}
                isLight={isLight}
              />
            </div>

            {/* Niveau + Expérience minimum */}
            <div className="relative">
              <label
                className={`block text-[10px] font-semibold uppercase tracking-[2px] mb-2 ${
                  isLight ? "text-black/70" : "text-white/40"
                }`}
              >
                Niveau
              </label>
              <button
                type="button"
                onClick={() => {
                  setNiveauOpen((v) => !v);
                  setCategorieOpen(false);
                  setContratOpen(false);
                }}
                className="input-premium w-full flex items-center justify-between cursor-pointer text-left bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] rounded-xl"
              >
                <span className={`text-[13px] truncate ${isLight ? "text-black" : "text-white/80"}`}>
                  {form.niveau_seniorite ?? ""}
                </span>
                <ChevronDown size={14} className={isLight ? "text-black/60" : "text-white/45"} />
              </button>

              {niveauOpen && (
                <div className="absolute left-0 top-full mt-2 w-full bg-[#050505]/95 border border-white/[0.08] rounded-2xl shadow-lg backdrop-blur-xl overflow-hidden z-50">
                  <div>
                    {NIVEAUX.map((n) => {
                      const active = form.niveau_seniorite === n;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            update("niveau_seniorite", n);
                            setNiveauOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-4 py-3 text-left text-[13px] transition-colors focus:outline-none focus-visible:outline-none ${
                            active
                              ? "text-white bg-red-500/15"
                              : "text-white/80 hover:text-white hover:bg-red-500/8"
                          }`}
                        >
                          <span className="flex-1 truncate">{n}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label
                className={`block text-[10px] font-semibold uppercase tracking-[2px] mb-2 ${
                  isLight ? "text-black/70" : "text-white/40"
                }`}
              >
                Expérience minimum
              </label>
              <input
                value={form.experience_min ?? ""}
                onChange={(e) => update("experience_min", e.target.value)}
                className="input-premium"
                placeholder="ex: 2 ans"
              />
            </div>

            

            {/* Présence sur site + Disponibilité */}
            <div className="relative">
              <label
                className={`block text-[10px] font-semibold uppercase tracking-[2px] mb-2 ${
                  isLight ? "text-black/70" : "text-white/40"
                }`}
              >
                Présence sur site
              </label>
              <button
                type="button"
                onClick={() => {
                  setPresenceOpen((v) => !v);
                  setDispoOpen(false);
                }}
                className="input-premium w-full flex items-center justify-between cursor-pointer text-left bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] rounded-xl"
              >
                <span className="text-[13px] text-white/80 truncate">
                  {form.presence_sur_site || "Sélectionnez une option"}
                </span>
                <ChevronDown size={14} className="text-white/45" />
              </button>

              {presenceOpen && (
                <div className="absolute left-0 top-full mt-2 w-full bg-[#050505]/95 border border-white/[0.08] rounded-2xl shadow-lg backdrop-blur-xl overflow-hidden z-50">
                  <div>
                    {["Obligatoire", "A distance seulement", "Hybride", "Remote"].map((p) => {
                      const active = form.presence_sur_site === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            update("presence_sur_site", p);
                            setPresenceOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-4 py-3 text-left text-[13px] transition-colors focus:outline-none focus-visible:outline-none ${
                            active
                              ? "text-white bg-red-500/15"
                              : "text-white/80 hover:text-white hover:bg-red-500/8"
                          }`}
                        >
                          <span className="flex-1 truncate">{p}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <label
                className={`block text-[10px] font-semibold uppercase tracking-[2px] mb-2 ${
                  isLight ? "text-black/70" : "text-white/40"
                }`}
              >
                Disponibilité
              </label>
              <button
                type="button"
                onClick={() => {
                  setDispoOpen((v) => !v);
                  setPresenceOpen(false);
                }}
                className="input-premium w-full flex items-center justify-between cursor-pointer text-left bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] rounded-xl"
              >
                <span className="text-[13px] text-white/80 truncate">
                  {form.disponibilite || "Sélectionnez une option"}
                </span>
                <ChevronDown size={14} className="text-white/45" />
              </button>

              {dispoOpen && (
                <div className="absolute left-0 top-full mt-2 w-full bg-[#050505]/95 border border-white/[0.08] rounded-2xl shadow-lg backdrop-blur-xl overflow-hidden z-50">
                  <div>
                    {["Immediate", "1 mois", "2 mois et plus", "A preciser", "Autre"].map((d) => {
                      const active = form.disponibilite === d;
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            update("disponibilite", d);
                            setDispoOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-4 py-3 text-left text-[13px] transition-colors focus:outline-none focus-visible:outline-none ${
                            active
                              ? "text-white bg-red-500/15"
                              : "text-white/80 hover:text-white hover:bg-red-500/8"
                          }`}
                        >
                          <span className="flex-1 truncate">{d}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Salaire min | Salaire max */}
            <div>
              <label
                className={`block text-[10px] font-semibold uppercase tracking-[2px] mb-2 ${
                  isLight ? "text-black/70" : "text-white/40"
                }`}
              >
                Salaire min (MAD)
              </label>
              <input
                type="number"
                value={form.salary_min ?? ""}
                onChange={(e) =>
                  update("salary_min", e.target.value ? Number(e.target.value) : null)
                }
                className="input-premium"
                placeholder="5000"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[2px] text-white/40 mb-2">
                Salaire max (MAD)
              </label>
              <input
                type="number"
                value={form.salary_max ?? ""}
                onChange={(e) =>
                  update("salary_max", e.target.value ? Number(e.target.value) : null)
                }
                className="input-premium"
                placeholder="15000"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-semibold uppercase tracking-[2px] text-white/40 mb-2">
                Contexte / raison du poste
              </label>
              <textarea
                value={form.reason ?? ""}
                onChange={(e) => update("reason", e.target.value)}
                className="input-premium min-h-[80px] resize-y"
                placeholder="Pourquoi ce poste est ouvert ?"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-semibold uppercase tracking-[2px] text-white/40 mb-2">
                Mission principale
              </label>
              <textarea
                value={form.main_mission ?? ""}
                onChange={(e) => update("main_mission", e.target.value)}
                className="input-premium min-h-[100px] resize-y"
                placeholder="Décrivez la mission principale et les responsabilités clés..."
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-semibold uppercase tracking-[2px] text-white/40 mb-2">
                Autres tâches
              </label>
              <textarea
                value={form.tasks_other ?? ""}
                onChange={(e) => update("tasks_other", e.target.value)}
                className="input-premium min-h-[80px] resize-y"
                placeholder="Listez les tâches complémentaires, outils, stack, etc."
              />
            </div>

            <div className="sm:col-span-2 space-y-3">
              <label
                className={`block text-[10px] font-semibold uppercase tracking-[2px] ${
                  isLight ? "text-black/70" : "text-white/40"
                }`}
              >
                Competences techniques
              </label>
              <div className="space-y-3">
              {skills.map((skill, index) => (
                <div key={index} className="w-full grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-5">
                    <label className={`block text-[10px] mb-2 ${isLight ? "text-black/60" : "text-white/40"}`}>
                      Competence
                    </label>
                    <input
                      type="text"
                      value={skill.name}
                      onChange={(e) => updateSkill(index, "name", e.target.value)}
                      className="input-premium"
                      placeholder="ex: Python"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className={`block text-[10px] mb-2 ${isLight ? "text-black/60" : "text-white/40"}`}>
                      Niveau
                    </label>
                    <DropdownSelect
                      value={skill.level}
                      onChange={(value) => updateSkill(index, "level", value)}
                      placeholder="Niveau"
                      groups={[
                        {
                          options: SKILL_LEVELS.map((level) => ({
                            value: level,
                            label: level,
                          })),
                        },
                      ]}
                      isLight={isLight}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className={`block text-[10px] mb-2 ${isLight ? "text-black/60" : "text-white/40"}`}>
                      Priorite
                    </label>
                    <DropdownSelect
                      value={skill.priority}
                      onChange={(value) => updateSkill(index, "priority", value)}
                      placeholder="Priorite"
                      groups={[
                        {
                          options: SKILL_PRIORITIES.map((priority) => ({
                            value: priority,
                            label: priority,
                          })),
                        },
                      ]}
                      isLight={isLight}
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-[10px] mb-2 opacity-0 select-none">
                      Action
                    </label>
                    {skills.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSkill(index)}
                        className="w-full h-[42px] px-3 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10"
                      >
                        X
                      </button>
                    )}
                  </div>
                </div>
              ))}
              </div>
              <button
                type="button"
                onClick={addSkill}
                className={`px-3 py-2 rounded-lg border text-[12px] ${
                  isLight
                    ? "border-black/10 text-black/70 hover:border-tap-red/40"
                    : "border-white/[0.12] text-white/70 hover:border-white/[0.24]"
                }`}
              >
                + Ajouter une competence
              </button>
            </div>

            <div className="sm:col-span-2">
              <label
                className={`block text-[10px] font-semibold uppercase tracking-[2px] mb-2 ${
                  isLight ? "text-black/70" : "text-white/40"
                }`}
              >
                Soft skills (max 5)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SOFT_SKILLS.map((skill) => {
                  const checked = softSkills.includes(skill);
                  return (
                    <label
                      key={skill}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] cursor-pointer ${
                        checked
                          ? "border-red-500/40 bg-red-500/10"
                          : isLight
                            ? "border-black/10 bg-white"
                            : "border-white/[0.08] bg-white/[0.02]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSoftSkill(skill)}
                        className="accent-red-600"
                      />
                      <span className={isLight ? "text-black/80" : "text-white/80"}>{skill}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="sm:col-span-2 space-y-3">
              <label
                className={`block text-[10px] font-semibold uppercase tracking-[2px] ${
                  isLight ? "text-black/70" : "text-white/40"
                }`}
              >
                Langues
              </label>
              <div className="space-y-3">
              {languages.map((language, index) => (
                <div key={index} className="w-full grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-5">
                    <label className={`block text-[10px] mb-2 ${isLight ? "text-black/60" : "text-white/40"}`}>
                      Langue
                    </label>
                    <DropdownSelect
                      value={language.name}
                      onChange={(value) => updateLanguage(index, "name", value)}
                      placeholder="-- Selectionner --"
                      groups={[
                        {
                          options: [
                            { value: "Francais", label: "Francais" },
                            { value: "Anglais", label: "Anglais" },
                            { value: "Espagnol", label: "Espagnol" },
                            { value: "Arabe", label: "Arabe" },
                          ],
                        },
                      ]}
                      isLight={isLight}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className={`block text-[10px] mb-2 ${isLight ? "text-black/60" : "text-white/40"}`}>
                      Niveau
                    </label>
                    <DropdownSelect
                      value={language.level}
                      onChange={(value) => updateLanguage(index, "level", value)}
                      placeholder="Niveau"
                      groups={[
                        {
                          options: LANGUAGE_LEVELS.map((level) => ({
                            value: level,
                            label: level,
                          })),
                        },
                      ]}
                      isLight={isLight}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className={`block text-[10px] mb-2 ${isLight ? "text-black/60" : "text-white/40"}`}>
                      Importance
                    </label>
                    <DropdownSelect
                      value={language.importance}
                      onChange={(value) => updateLanguage(index, "importance", value)}
                      placeholder="Importance"
                      groups={[
                        {
                          options: LANGUAGE_IMPORTANCE.map((importance) => ({
                            value: importance,
                            label: importance,
                          })),
                        },
                      ]}
                      isLight={isLight}
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-[10px] mb-2 opacity-0 select-none">
                      Action
                    </label>
                    {languages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLanguage(index)}
                        className="w-full h-[42px] px-3 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10"
                      >
                        X
                      </button>
                    )}
                  </div>
                </div>
              ))}
              </div>
              <button
                type="button"
                onClick={addLanguage}
                className={`px-3 py-2 rounded-lg border text-[12px] ${
                  isLight
                    ? "border-black/10 text-black/70 hover:border-tap-red/40"
                    : "border-white/[0.12] text-white/70 hover:border-white/[0.24]"
                }`}
              >
                + Ajouter une langue
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => update("urgent", !form.urgent)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] transition-all ${
                  form.urgent
                    ? "bg-red-500/10 border-red-500/25 text-red-600"
                    : isLight
                      ? "bg-white border border-black/10 text-black/60 hover:border-tap-red/40"
                      : "bg-white/[0.03] border-white/[0.08] text-white/40 hover:border-white/[0.12]"
                }`}
              >
                <Clock size={14} />
                Urgent
              </button>
            </div>
          </div>

          <div className="flex justify-end items-center gap-3 pt-3 flex-wrap">
            {editingJobId ? (
              <button
                type="button"
                onClick={() => {
                  resetFormState();
                  setShowForm(false);
                }}
                disabled={createJob.isPending || updateJob.isPending}
                className={`h-11 px-5 rounded-xl border text-[13px] font-medium transition disabled:opacity-50 ${
                  isLight
                    ? "border-black/15 text-black/80 hover:bg-black/[0.04]"
                    : "border-white/[0.16] text-white/80 hover:bg-white/[0.06]"
                }`}
              >
                Annuler les modifications
              </button>
            ) : null}
            <button
              type="submit"
              disabled={createJob.isPending || updateJob.isPending || Boolean(editingJobId && editJobQuery.isLoading)}
              className="btn-primary disabled:opacity-50"
            >
              {createJob.isPending || updateJob.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {editingJobId ? "Mise à jour (embedding IA)…" : "Embedding IA + publication…"}
                </span>
              ) : editingJobId ? (
                "Enregistrer les modifications"
              ) : (
                "Publier l&apos;offre"
              )}
            </button>
          </div>
        </form>
      )}

      {/* Jobs List */}
      {jobsQuery.isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : jobsQuery.isError ? (
        <ErrorState onRetry={() => jobsQuery.refetch()} />
      ) : !jobsQuery.data?.jobs?.length ? (
        <EmptyState
          icon={<Briefcase className="w-12 h-12" />}
          title="Aucune offre"
          description="Créez votre première offre pour commencer à recevoir des candidatures."
          action={
            <button
              type="button"
              onClick={() => {
                resetFormState();
                setEditingJobId(null);
                setShowForm(true);
              }}
              className="btn-primary gap-2 mt-2"
            >
              <Plus size={14} />
              Créer une offre
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {jobsQuery.data.jobs.map((job) => {
            const titre = (job as any).titre ?? job.title ?? "Offre sans titre";
            const categorie = (job as any).categorie_profil ?? "—";
            const status = (job as any).status ?? "ACTIVE";
            const isInactive = status === "INACTIVE";
            const applications = job.applicationCount ?? 0;

            return (
              <div
                key={job.id}
                className={`rounded-xl p-4 sm:p-5 ${
                  isLight
                    ? "card-luxury-light hover:border-tap-red/60"
                    : "bg-zinc-900/50 border border-white/[0.06] hover:border-white/[0.12]"
                } transition`}
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:items-center">
                  {/* Col 1: date + titre */}
                  <div className="sm:col-span-5 min-w-0">
                    <div className="flex items-center gap-3">
                      <div
                        className={`text-[11px] uppercase tracking-[2px] ${
                          isLight ? "text-black/45" : "text-white/35"
                        } leading-none`}
                      >
                        {formatDate(job.created_at as any)}
                      </div>

                      <div className="min-w-0">
                        <h3
                          className={`text-[15px] font-semibold truncate ${
                            isLight ? "text-black" : "text-white"
                          }`}
                        >
                          {titre}
                        </h3>
                        <p className={`text-[13px] mt-1 truncate ${isLight ? "text-black/70" : "text-white/65"}`}>
                          {categorie}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Col 2: nb candidatures */}
                  <div className="sm:col-span-2">
                    <div
                      className={`inline-flex items-center gap-2 text-[12px] ${
                        isLight ? "text-black/70" : "text-white/60"
                      }`}
                    >
                      <Users size={14} className={isLight ? "text-black/50" : "text-white/40"} />
                      {applications} candidature{applications !== 1 ? "s" : ""}
                    </div>
                  </div>

                  {/* Col 3: status */}
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={() => {
                        toggleJobStatus.mutate({
                          jobId: job.id,
                          nextStatus: isInactive ? "ACTIVE" : "INACTIVE",
                        });
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-medium transition w-full justify-center ${
                        isInactive
                          ? isLight
                            ? "border-black/15 text-black/60 hover:border-black/30"
                            : "border-white/15 text-white/55 hover:border-white/30"
                          : "border-emerald-500/35 bg-emerald-500/10 text-emerald-400 hover:border-emerald-400"
                      }`}
                      title="Changer le statut"
                    >
                      {isInactive ? <CircleSlash2 size={14} /> : <CheckCircle2 size={14} />}
                      {isInactive ? "Inactive" : "Active"}
                    </button>
                  </div>

                  {/* Col 4: actions (3) */}
                  <div className="sm:col-span-3 flex items-center justify-end gap-1 shrink-0">
                    <Link
                      href={`/app/offres/${job.id}`}
                      title="Voir le détail"
                      className={`p-1.5 rounded-full border transition inline-flex ${
                        isLight
                          ? "border-black/10 hover:bg-black/5 text-black/60"
                          : "border-white/[0.14] hover:bg-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Eye size={14} />
                    </Link>

                    <button
                      type="button"
                      title="Modifier l'offre"
                      onClick={() => {
                        hydratedEditJobIdRef.current = null;
                        setEditingJobId(job.id);
                        setShowForm(true);
                      }}
                      className={`p-1.5 rounded-full border transition ${
                        isLight
                          ? "border-black/10 hover:bg-black/5 text-black/60"
                          : "border-white/[0.14] hover:bg-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Pencil size={14} />
                    </button>

                    <button
                      type="button"
                      title="Supprimer l'offre"
                      onClick={() => setDeleteConfirmJobId(job.id)}
                      className={`p-1.5 rounded-full border transition ${
                        isLight
                          ? "border-red-500/30 bg-red-500/10 text-red-600 hover:bg-red-500/15"
                          : "border-red-400/30 bg-red-500/15 text-red-400 hover:bg-red-500/25"
                      }`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Suppression — confirmation */}
      {deleteConfirmJobId != null ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Fermer"
            onClick={() => setDeleteConfirmJobId(null)}
          />
          <div
            className={`relative w-full max-w-[400px] rounded-2xl border p-6 shadow-2xl ${
              isLight ? "bg-white border-black/10" : "bg-[#0a0a0a] border-white/[0.08]"
            }`}
          >
            <p className={`text-[15px] font-semibold mb-2 ${isLight ? "text-black" : "text-white"}`}>
              Supprimer cette offre ?
            </p>
            <p className={`text-[13px] mb-6 ${isLight ? "text-black/60" : "text-white/50"}`}>
              Cette action est définitive. Les candidatures liées seront supprimées.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmJobId(null)}
                className={`h-9 px-4 rounded-lg border text-[13px] ${
                  isLight ? "border-black/15 text-black/80" : "border-white/[0.16] text-white/75"
                }`}
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={deleteJob.isPending}
                onClick={() => {
                  const id = deleteConfirmJobId;
                  if (id == null) return;
                  deleteJob.mutate(id, {
                    onSuccess: () => {
                      setDeleteConfirmJobId(null);
                      setEditingJobId((e) => {
                        if (e !== id) return e;
                        setShowForm(false);
                        resetFormState();
                        return null;
                      });
                    },
                  });
                }}
                className="h-9 px-4 rounded-lg border border-red-500/40 bg-red-500/15 text-red-300 hover:bg-red-500/25 text-[13px] disabled:opacity-50"
              >
                {deleteJob.isPending ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
