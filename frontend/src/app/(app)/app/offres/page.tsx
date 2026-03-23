"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRecruteurJobs, useCreateJob, useToggleJobStatus } from "@/hooks/use-recruteur";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import StatusBadge from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Briefcase, Plus, X, Send, MapPin, Clock, DollarSign, Users, ChevronDown, CheckCircle2, CircleSlash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { JobPayload } from "@/types/recruteur";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";

const CATEGORIES = ["Développement", "Design", "Marketing", "Commercial", "Finance", "RH", "Ingénierie", "Autre"];
const NIVEAUX = ["Junior", "Intermédiaire", "Senior", "Lead", "Manager"];
const CONTRATS = ["CDI", "CDD", "Stage", "Freelance", "Alternance"];

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
  Maroc: ["Casablanca", "Rabat", "Marrakech", "Tanger", "Fès", "Autre"],
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
  categorie_profil: "Développement",
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

export default function OffresPage() {
  const { isRecruteur } = useAuth();
  const jobsQuery = useRecruteurJobs();
  const createJob = useCreateJob();
  const toggleJobStatus = useToggleJobStatus();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<JobPayload>(emptyForm);
  const [categorieOpen, setCategorieOpen] = useState(false);
  const [niveauOpen, setNiveauOpen] = useState(false);
  const [contratOpen, setContratOpen] = useState(false);
  const [presenceOpen, setPresenceOpen] = useState(false);
  const [dispoOpen, setDispoOpen] = useState(false);
  const [country, setCountry] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const localisationFromSelectors =
      city && country ? `${city}, ${country}` : undefined;

    const payload: JobPayload = {
      ...form,
      localisation: localisationFromSelectors ?? form.localisation ?? "",
    };

    await createJob.mutateAsync(payload);
    setForm(emptyForm);
    setCountry("");
    setCity("");
    setShowForm(false);
  };

  const update = (field: keyof JobPayload, value: any) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="max-w-[1100px] mx-auto">
      {/* Header */}
      <div className={`relative mb-8 pb-8 ${isLight ? "border-b border-black/10" : "border-b border-white/[0.04]"}`}>
        <div className="absolute top-[-80px] left-[-100px] w-[350px] h-[350px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.08),transparent_60%)] blur-3xl pointer-events-none" />
        <div className="relative flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 mb-4 rounded-full bg-tap-red/[0.08] border border-tap-red/15">
              <Briefcase size={13} className="text-tap-red" />
              <span className="text-[10px] uppercase tracking-[2.5px] text-tap-red/80 font-semibold">
                Mes offres
              </span>
            </div>
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
            onClick={() => setShowForm(!showForm)}
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
            isLight ? "bg-white border border-tap-red/40" : "bg-zinc-900/50 border border-white/[0.06]"
          }`}
        >
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
                    {["Sur site", "Hybride", "Remote"].map((p) => {
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
                    {["Immédiate", "1 mois", "2 mois et plus", "Autre"].map((d) => {
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

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={createJob.isPending}
              className="btn-primary gap-2 disabled:opacity-50"
            >
              {createJob.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Embedding IA + publication…
                </span>
              ) : (
                <>
                  <Send size={14} />
                  Publier l&apos;offre
                </>
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
            <button onClick={() => setShowForm(true)} className="btn-primary gap-2 mt-2">
              <Plus size={14} />
              Créer une offre
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {jobsQuery.data.jobs.map((job) => {
            const titre = (job as any).titre ?? job.title ?? "Offre sans titre";
            const localisation =
              (job as any).localisation ??
              (typeof (job as any).location_type === "string" &&
              (job as any).location_type.trim()
                ? (job as any).location_type
                : null);

            const status = (job as any).status ?? 'ACTIVE';
            const isInactive = status === 'INACTIVE';

            return (
              <div
                key={job.id}
                className={`rounded-xl p-5 transition group ${
                  isLight
                    ? "bg-white border border-tap-red/40 hover:border-tap-red/70"
                    : "bg-zinc-900/50 border border-white/[0.06] hover:border-white/[0.1]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Colonne gauche : titre + 2 icônes */}
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-[15px] font-semibold truncate ${isLight ? "text-black" : "text-white"}`}>
                      {titre}
                    </h3>

                    {/* 2 icônes sous le titre : localisation + candidatures */}
                    <div
                      className={`mt-2 flex flex-wrap items-center gap-3 text-[12px] ${
                        isLight ? "text-black/70" : "text-white/50"
                      }`}
                    >
                      {/* Localisation avec tooltip au hover */}
                      <button
                        type="button"
                        className="relative group flex items-center gap-2"
                      >
                        <MapPin
                          size={14}
                          className={isLight ? "text-black/70 group-hover:text-black" : "text-white/60 group-hover:text-white"}
                        />
                        <span className="sr-only">Localisation</span>
                        <span className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black px-2 py-1 text-[11px] text-white/90 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-1 transition-all">
                          {localisation || "Localisation non renseignée"}
                        </span>
                      </button>

                      {/* Icône + nombre de candidatures juste à côté */}
                      <div className="flex items-center gap-2">
                        <Users size={14} className={isLight ? "text-black/70" : "text-white/60"} />
                        <span className={isLight ? "text-black/80" : "text-white/70"}>
                          {(job.applicationCount ?? 0)} candidature
                          {(job.applicationCount ?? 0) !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Colonne droite : statut + date + urgence */}
                  <div
                    className={`text-right shrink-0 flex flex-col items-end gap-1 text-[11px] ${
                      isLight ? "text-black/60" : "text-white/35"
                    }`}
                  >
                    {/* Bouton statut ACTIVE / INACTIVE */}
                    <button
                      type="button"
                      onClick={() => {
                        toggleJobStatus.mutate({
                          jobId: job.id,
                          nextStatus: isInactive ? "ACTIVE" : "INACTIVE",
                        });
                      }}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] ${
                        isInactive
                          ? "border-white/15 text-white/45 hover:border-white/30"
                          : "border-emerald-400/40 text-emerald-300 hover:border-emerald-300"
                      }`}
                    >
                      {isInactive ? (
                        <>
                          <CircleSlash2 size={12} />
                          <span>Inactive</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={12} />
                          <span>Active</span>
                        </>
                      )}
                    </button>

                    <span className="mt-1">{formatDate(job.created_at as any)}</span>
                    {job.urgent && (
                      <div className="mt-1">
                        <StatusBadge status="urgent" label="Urgent" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
