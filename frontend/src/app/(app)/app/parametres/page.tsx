"use client";

import { useEffect, useState } from "react";
import { LogOut, Settings, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";
import { useCandidatProfile, useUpdateCandidatProfile } from "@/hooks/use-candidat";
import type { CandidatProfile } from "@/types/candidat";
import DropdownSelect from "@/components/app/DropdownSelect";
import { DOMAINE_GROUPS } from "@/constants/domaines";

type SettingsTab = "mon-compte" | "securite";

const PAYS_OPTIONS = [
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

const VILLES_BY_PAYS: Record<string, string[]> = {
  Maroc: ["Casablanca", "Rabat", "Marrakech", "Fès", "Tanger", "Agadir", "Oujda", "Meknès"],
  France: ["Paris", "Lyon", "Marseille", "Toulouse", "Lille", "Nantes", "Bordeaux", "Nice"],
  Belgique: ["Bruxelles", "Anvers", "Gand", "Liège", "Charleroi"],
  Suisse: ["Genève", "Zurich", "Lausanne", "Berne", "Bâle"],
  Canada: ["Montréal", "Toronto", "Québec", "Ottawa", "Vancouver", "Calgary"],
  Espagne: ["Madrid", "Barcelone", "Valence", "Séville", "Bilbao"],
  Allemagne: ["Berlin", "Munich", "Francfort", "Hambourg", "Cologne"],
  "Royaume-Uni": ["Londres", "Manchester", "Birmingham", "Liverpool", "Leeds"],
  "États-Unis": ["New York", "San Francisco", "Los Angeles", "Chicago", "Boston", "Austin"],
  "Pays-Bas": ["Amsterdam", "Rotterdam", "La Haye", "Utrecht", "Eindhoven"],
  Italie: ["Rome", "Milan", "Turin", "Naples", "Bologne"],
  Portugal: ["Lisbonne", "Porto", "Braga", "Coimbra", "Faro"],
  Luxembourg: ["Luxembourg", "Esch-sur-Alzette", "Differdange"],
  "Émirats arabes unis": ["Dubaï", "Abou Dabi", "Sharjah"],
};

const PAYS_GROUPS = [{ options: PAYS_OPTIONS.map((p) => ({ value: p, label: p })) }];
const DISPONIBILITE_GROUPS = [
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
const SENIORITY_GROUPS = [
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
const TYPE_CONTRAT_GROUPS = [
  {
    options: [
      { value: "CDI", label: "CDI" },
      { value: "CDD", label: "CDD" },
      { value: "Freelance", label: "Freelance" },
      { value: "Mission", label: "Mission" },
      { value: "Stage", label: "Stage" },
    ],
  },
];

export default function ParametresPage() {
  const { user, logout } = useAuth();
  const theme = useDashboardTheme();
  const isLight = theme === "light";
  const profileQuery = useCandidatProfile(user?.role === "candidat");
  const updateProfile = useUpdateCandidatProfile();
  const [activeTab, setActiveTab] = useState<SettingsTab>("mon-compte");
  const [profileForm, setProfileForm] = useState<Partial<CandidatProfile>>({});
  const [profileError, setProfileError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!profileQuery.data) return;
    setProfileForm({
      nom: profileQuery.data.nom ?? "",
      prenom: profileQuery.data.prenom ?? "",
      titre_profil: profileQuery.data.titre_profil ?? "",
      categorie_profil: profileQuery.data.categorie_profil ?? "",
      ville: profileQuery.data.ville ?? "",
      pays: profileQuery.data.pays ?? "",
      pays_cible: profileQuery.data.pays_cible ?? "",
      linkedin: profileQuery.data.linkedin ?? "",
      github: profileQuery.data.github ?? "",
      behance: profileQuery.data.behance ?? "",
      email: profileQuery.data.email ?? "",
      phone: profileQuery.data.phone ?? "",
      annees_experience: profileQuery.data.annees_experience ?? null,
      disponibilite: profileQuery.data.disponibilite ?? "",
      pret_a_relocater: profileQuery.data.pret_a_relocater ?? "",
      niveau_seniorite: profileQuery.data.niveau_seniorite ?? "",
      salaire_minimum: profileQuery.data.salaire_minimum ?? "",
      constraints: profileQuery.data.constraints ?? "",
      search_criteria: profileQuery.data.search_criteria ?? "",
      resume_bref: profileQuery.data.resume_bref ?? "",
      type_contrat: profileQuery.data.type_contrat ?? "",
    });
  }, [profileQuery.data]);

  const handleLogout = () => {
    logout();
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Merci de remplir tous les champs.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setSaving(true);
    try {
      const { default: api } = await import("@/lib/api");
      await api.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      setSuccess("Mot de passe mis à jour avec succès.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        (Array.isArray(err?.response?.data?.message) ? err.response.data.message[0] : null) ||
        "Impossible de mettre à jour le mot de passe.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role !== "candidat") return;
    setProfileError(null);

    const isValidHttpUrl = (value: string) => {
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    };

    const linkedin = String(profileForm.linkedin ?? "").trim();
    const github = String(profileForm.github ?? "").trim();
    const behance = String(profileForm.behance ?? "").trim();
    if (linkedin && !isValidHttpUrl(linkedin)) {
      setProfileError("Lien LinkedIn invalide. Utilisez une URL complète (https://...).");
      return;
    }
    if (github && !isValidHttpUrl(github)) {
      setProfileError("Lien GitHub invalide. Utilisez une URL complète (https://...).");
      return;
    }
    if (behance && !isValidHttpUrl(behance)) {
      setProfileError("Lien Behance invalide. Utilisez une URL complète (https://...).");
      return;
    }

    const payload: Partial<CandidatProfile> = {
      ...profileForm,
      nom: (profileForm.nom ?? "").toString(),
      prenom: (profileForm.prenom ?? "").toString(),
      annees_experience:
        profileForm.annees_experience === null ||
        profileForm.annees_experience === undefined
          ? null
          : Number(profileForm.annees_experience),
      salaire_minimum:
        profileForm.salaire_minimum === null ||
        profileForm.salaire_minimum === undefined ||
        profileForm.salaire_minimum === ""
          ? null
          : String(Number(profileForm.salaire_minimum)),
      type_contrat: String(profileForm.type_contrat ?? ""),
    };
    await updateProfile.mutateAsync(payload);
  };

  const inputClass = "input-premium";

  return (
    <div className="max-w-[800px] mx-auto space-y-8">
      {/* Header */}
      <div className={`relative mb-2 pb-6 ${isLight ? "border-b border-black/10" : "border-b border-white/[0.04]"}`}>
        <div className="inline-flex items-center gap-2.5 px-5 py-2.5 mb-4 rounded-full bg-tap-red/[0.08] border border-tap-red/15">
          <Settings size={13} className="text-tap-red" />
          <span className="text-[10px] uppercase tracking-[2.5px] text-tap-red/80 font-semibold">
            Paramètres du compte
          </span>
        </div>
        <h1 className={`text-[26px] sm:text-[32px] font-bold tracking-[-0.04em] font-heading ${isLight ? "text-black" : "text-white"}`}>
          Paramètres
        </h1>
        <p className={`text-[14px] mt-2 font-light max-w-xl ${isLight ? "text-black/60" : "text-white/45"}`}>
          Gérez la sécurité de votre compte TAP et votre mot de passe.
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl p-3 bg-transparent border-0">
          <div className="flex items-center gap-6 px-2 pb-1">
            <button
              type="button"
              onClick={() => setActiveTab("mon-compte")}
              className={`relative pb-2 text-[13px] font-medium transition ${
                activeTab === "mon-compte" ? "text-tap-red" : isLight ? "text-black/65 hover:text-black" : "text-white/60 hover:text-white/85"
              }`}
            >
              Informations personnelles
              {activeTab === "mon-compte" && (
                <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-tap-red rounded-full" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("securite")}
              className={`relative pb-2 text-[13px] font-medium transition ${
                activeTab === "securite" ? "text-tap-red" : isLight ? "text-black/65 hover:text-black" : "text-white/60 hover:text-white/85"
              }`}
            >
              Sécurité
              {activeTab === "securite" && (
                <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-tap-red rounded-full" />
              )}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {activeTab === "mon-compte" && user?.role === "candidat" && (
            <div className={`rounded-2xl p-5 sm:p-6 ${isLight ? "bg-white border border-tap-red/40" : "bg-zinc-900/50 border border-white/[0.06]"}`}>
              <div className="mb-4">
                <h2 className={`text-[15px] font-semibold ${isLight ? "text-black" : "text-white"}`}>Informations personnelles</h2>
                <p className={`text-[12px] mt-1 ${isLight ? "text-black/60" : "text-white/40"}`}>
                  Modifiez vos informations candidat puis enregistrez-les.
                </p>
              </div>

          {profileQuery.isLoading ? (
            <p className={`${isLight ? "text-black/60" : "text-white/50"} text-sm`}>Chargement du profil...</p>
          ) : profileQuery.isError ? (
            <p className="text-sm text-red-400">Impossible de charger vos informations.</p>
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-3 mt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={`block text-[11px] mb-1.5 ${isLight ? "text-black/70" : "text-white/50"}`}>Nom</label><input className={inputClass} value={String(profileForm.nom ?? "")} onChange={(e) => setProfileForm((s: Partial<CandidatProfile>) => ({ ...s, nom: e.target.value }))} required /></div>
                <div><label className={`block text-[11px] mb-1.5 ${isLight ? "text-black/70" : "text-white/50"}`}>Prénom</label><input className={inputClass} value={String(profileForm.prenom ?? "")} onChange={(e) => setProfileForm((s: Partial<CandidatProfile>) => ({ ...s, prenom: e.target.value }))} required /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={`block text-[11px] mb-1.5 ${isLight ? "text-black/70" : "text-white/50"}`}>Titre profil</label><input className={inputClass} value={String(profileForm.titre_profil ?? "")} onChange={(e) => setProfileForm((s: Partial<CandidatProfile>) => ({ ...s, titre_profil: e.target.value }))} /></div>
                <div>
                  <label className={`block text-[11px] mb-1.5 ${isLight ? "text-black/70" : "text-white/50"}`}>Catégorie profil</label>
                  <DropdownSelect
                    value={String(profileForm.categorie_profil ?? "")}
                    onChange={(next) => setProfileForm((s: Partial<CandidatProfile>) => ({ ...s, categorie_profil: next }))}
                    placeholder="Sélectionner..."
                    groups={DOMAINE_GROUPS}
                    isLight={false}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] mb-1.5 ${isLight ? "text-black/70" : "text-white/50"}`}>Pays</label>
                  <DropdownSelect
                    value={String(profileForm.pays ?? "")}
                    onChange={(next) =>
                      setProfileForm((s: Partial<CandidatProfile>) => ({
                        ...s,
                        pays: next,
                        ville: "",
                      }))
                    }
                    placeholder="Sélectionner..."
                    groups={PAYS_GROUPS}
                    isLight={false}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] mb-1.5 ${isLight ? "text-black/70" : "text-white/50"}`}>Ville</label>
                  <DropdownSelect
                    value={String(profileForm.ville ?? "")}
                    onChange={(next) => setProfileForm((s: Partial<CandidatProfile>) => ({ ...s, ville: next }))}
                    placeholder={!profileForm.pays ? "Choisir d'abord un pays" : "Sélectionner..."}
                    groups={[{ options: (VILLES_BY_PAYS[String(profileForm.pays ?? "")] ?? []).map((v) => ({ value: v, label: v })) }]}
                    disabled={!profileForm.pays}
                    isLight={false}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] mb-1.5 ${isLight ? "text-black/70" : "text-white/50"}`}>Pays cible</label>
                  <DropdownSelect
                    value={String(profileForm.pays_cible ?? "")}
                    onChange={(next) => setProfileForm((s: Partial<CandidatProfile>) => ({ ...s, pays_cible: next }))}
                    placeholder="Sélectionner..."
                    groups={PAYS_GROUPS}
                    isLight={false}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] mb-1.5 ${isLight ? "text-black/70" : "text-white/50"}`}>Disponibilité</label>
                  <DropdownSelect
                    value={String(profileForm.disponibilite ?? "")}
                    onChange={(next) => setProfileForm((s: Partial<CandidatProfile>) => ({ ...s, disponibilite: next }))}
                    placeholder="Sélectionner..."
                    groups={DISPONIBILITE_GROUPS}
                    isLight={false}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={`block text-[11px] mb-1.5 ${isLight ? "text-black/70" : "text-white/50"}`}>LinkedIn</label><input type="url" placeholder="https://www.linkedin.com/in/..." className={inputClass} value={String(profileForm.linkedin ?? "")} onChange={(e) => setProfileForm((s: Partial<CandidatProfile>) => ({ ...s, linkedin: e.target.value }))} /></div>
                <div><label className={`block text-[11px] mb-1.5 ${isLight ? "text-black/70" : "text-white/50"}`}>GitHub</label><input type="url" placeholder="https://github.com/..." className={inputClass} value={String(profileForm.github ?? "")} onChange={(e) => setProfileForm((s: Partial<CandidatProfile>) => ({ ...s, github: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={`block text-[11px] mb-1.5 ${isLight ? "text-black/70" : "text-white/50"}`}>Behance</label><input type="url" placeholder="https://www.behance.net/..." className={inputClass} value={String(profileForm.behance ?? "")} onChange={(e) => setProfileForm((s: Partial<CandidatProfile>) => ({ ...s, behance: e.target.value }))} /></div>
                <div><label className={`block text-[11px] mb-1.5 ${isLight ? "text-black/70" : "text-white/50"}`}>Téléphone</label><input className={inputClass} value={String(profileForm.phone ?? "")} onChange={(e) => setProfileForm((s: Partial<CandidatProfile>) => ({ ...s, phone: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={`block text-[11px] mb-1.5 ${isLight ? "text-black/70" : "text-white/50"}`}>Années d’expérience</label><input type="number" className={inputClass} value={profileForm.annees_experience ?? ""} onChange={(e) => setProfileForm((s: Partial<CandidatProfile>) => ({ ...s, annees_experience: e.target.value === "" ? null : Number(e.target.value) }))} /></div>
                <div>
                  <label className={`block text-[11px] mb-1.5 ${isLight ? "text-black/70" : "text-white/50"}`}>Niveau de séniorité</label>
                  <DropdownSelect
                    value={String(profileForm.niveau_seniorite ?? "")}
                    onChange={(next) => setProfileForm((s: Partial<CandidatProfile>) => ({ ...s, niveau_seniorite: next }))}
                    placeholder="Sélectionner..."
                    groups={SENIORITY_GROUPS}
                    isLight={false}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={`block text-[11px] mb-1.5 ${isLight ? "text-black/70" : "text-white/50"}`}>Salaire minimum</label><input type="number" min={0} step={1} className={inputClass} value={profileForm.salaire_minimum ?? ""} onChange={(e) => setProfileForm((s: Partial<CandidatProfile>) => ({ ...s, salaire_minimum: e.target.value }))} /></div>
                <div>
                  <label className={`block text-[11px] mb-1.5 ${isLight ? "text-black/70" : "text-white/50"}`}>Type de contrat</label>
                  <DropdownSelect
                    value={String(profileForm.type_contrat ?? "")}
                    onChange={(next) => setProfileForm((s: Partial<CandidatProfile>) => ({ ...s, type_contrat: next }))}
                    placeholder="Sélectionner..."
                    groups={TYPE_CONTRAT_GROUPS}
                    isLight={false}
                  />
                </div>
              </div>
              <div><label className={`block text-[11px] mb-1.5 ${isLight ? "text-black/70" : "text-white/50"}`}>Exigences / Contraintes</label><textarea className={inputClass} value={String(profileForm.constraints ?? "")} onChange={(e) => setProfileForm((s: Partial<CandidatProfile>) => ({ ...s, constraints: e.target.value }))} rows={2} /></div>
              <div><label className={`block text-[11px] mb-1.5 ${isLight ? "text-black/70" : "text-white/50"}`}>Critères de recherche</label><textarea className={inputClass} value={String(profileForm.search_criteria ?? "")} onChange={(e) => setProfileForm((s: Partial<CandidatProfile>) => ({ ...s, search_criteria: e.target.value }))} rows={2} /></div>
              <div><label className={`block text-[11px] mb-1.5 ${isLight ? "text-black/70" : "text-white/50"}`}>Résumé bref</label><textarea className={inputClass} value={String(profileForm.resume_bref ?? "")} onChange={(e) => setProfileForm((s: Partial<CandidatProfile>) => ({ ...s, resume_bref: e.target.value }))} rows={3} /></div>
              {profileError && (
                <div className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  {profileError}
                </div>
              )}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={updateProfile.isPending}
                  className="px-4 py-2 rounded-lg text-[12px] font-semibold bg-tap-red text-white hover:bg-tap-red-hover disabled:opacity-60 transition-colors"
                >
                  {updateProfile.isPending ? "Sauvegarde..." : "Sauvegarder"}
                </button>
              </div>
            </form>
          )}
            </div>
          )}

          {activeTab === "securite" && (
            <div className={`rounded-2xl p-5 sm:p-6 ${isLight ? "bg-white border border-tap-red/40" : "bg-zinc-900/50 border border-white/[0.06]"}`}>
              <div className="mb-4">
                <h2 className={`text-[15px] font-semibold ${isLight ? "text-black" : "text-white"}`}>Sécurité</h2>
                <p className={`text-[12px] mt-1 ${isLight ? "text-black/60" : "text-white/40"}`}>
                  Utilisez un mot de passe unique, avec au moins 8 caractères.
                </p>
              </div>
              <form onSubmit={handleChangePassword} className="space-y-3 mt-3">
          <div className="relative">
            <label className={`block text-[11px] mb-1.5 ${isLight ? "text-black/70" : "text-white/50"}`} htmlFor="currentPassword">
              Mot de passe actuel
            </label>
            <input
              id="currentPassword"
              type={showCurrentPassword ? "text" : "password"}
              className={inputClass}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword((v) => !v)}
              className={`absolute right-3 top-[34px] ${isLight ? "text-black/55 hover:text-black" : "text-white/45 hover:text-white/80"} transition`}
              aria-label={showCurrentPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <label className={`block text-[11px] mb-1.5 ${isLight ? "text-black/70" : "text-white/50"}`} htmlFor="newPassword">
                Nouveau mot de passe
              </label>
              <input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                className={inputClass}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                className={`absolute right-3 top-[34px] ${isLight ? "text-black/55 hover:text-black" : "text-white/45 hover:text-white/80"} transition`}
                aria-label={showNewPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="relative">
              <label className={`block text-[11px] mb-1.5 ${isLight ? "text-black/70" : "text-white/50"}`} htmlFor="confirmPassword">
                Confirmer le nouveau mot de passe
              </label>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                className={inputClass}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className={`absolute right-3 top-[34px] ${isLight ? "text-black/55 hover:text-black" : "text-white/45 hover:text-white/80"} transition`}
                aria-label={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          {success && (
            <div className="text-[12px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
              {success}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg text-[12px] font-semibold bg-tap-red text-white hover:bg-tap-red-hover disabled:opacity-60 transition-colors"
            >
              {saving ? "Mise à jour..." : "Mettre à jour le mot de passe"}
            </button>
          </div>
              </form>
            </div>
          )}
      </div>
    </div>
    </div>
  );
}

