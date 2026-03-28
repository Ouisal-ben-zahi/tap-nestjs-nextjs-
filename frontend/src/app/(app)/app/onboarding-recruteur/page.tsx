"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  useRecruiterCompanyProfile,
  useUpsertRecruiterCompanyProfile,
} from "@/hooks/use-recruteur";
import { Skeleton } from "@/components/ui/Skeleton";
import ErrorState from "@/components/ui/ErrorState";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";
import { isRecruiterCompanyProfileComplete } from "@/lib/recruiter-profile";
import {
  isValidMoroccoIce,
  isValidMoroccoMobilePhone,
  normalizeIceInput,
} from "@/lib/ma-company-fields";

export default function OnboardingRecruteurPage() {
  const router = useRouter();
  const { user, isRecruteur } = useAuth();
  const theme = useDashboardTheme();
  const isLight = theme === "light";
  const profileQuery = useRecruiterCompanyProfile(isRecruteur);
  const upsert = useUpsertRecruiterCompanyProfile();
  const inputClass = "input-premium w-full";
  const labelCls = `block text-[11px] mb-1.5 ${isLight ? "text-black/70" : "text-white/50"}`;

  const [nomSociete, setNomSociete] = useState("");
  const [nomContact, setNomContact] = useState("");
  const [telephone, setTelephone] = useState("");
  const [emailPersonnel, setEmailPersonnel] = useState("");
  const [emailPro, setEmailPro] = useState("");
  const [ice, setIce] = useState("");
  const [adresse, setAdresse] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    telephone?: string;
    ice?: string;
  }>({});

  useEffect(() => {
    if (user?.email) {
      setEmailPersonnel(user.email);
    }
  }, [user?.email]);

  useEffect(() => {
    if (!profileQuery.isSuccess) return;
    if (isRecruiterCompanyProfileComplete(profileQuery.data)) {
      router.replace("/app");
    }
  }, [profileQuery.isSuccess, profileQuery.data, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const telOk = isValidMoroccoMobilePhone(telephone);
    const iceOk = isValidMoroccoIce(ice);
    if (!telOk || !iceOk) {
      setFieldErrors({
        telephone: telOk
          ? undefined
          : "Numéro invalide : téléphone marocain (+212 5…–8… ou 05…–08…, 9 chiffres après l’indicatif).",
        ice: iceOk ? undefined : "ICE invalide : exactement 15 chiffres.",
      });
      return;
    }
    setFieldErrors({});
    const emailPersonnelFinal = user?.email?.trim().toLowerCase() ?? emailPersonnel.trim().toLowerCase();
    await upsert.mutateAsync({
      nom_societe: nomSociete,
      nom_contact: nomContact,
      telephone,
      email_personnel: emailPersonnelFinal,
      email_pro: emailPro,
      ice: ice.replace(/\D/g, ""),
      adresse,
    });
    router.push("/app");
  };

  if (!isRecruteur) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center text-white/60 text-sm">
        Cette page est réservée aux comptes recruteur.
      </div>
    );
  }

  if (profileQuery.isLoading) {
    return (
      <div className="max-w-[800px] mx-auto py-12 px-1 space-y-8">
        <Skeleton className="h-10 w-2/3 rounded-lg" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (profileQuery.isError) {
    return (
      <div className="max-w-lg mx-auto py-12">
        <ErrorState
          message="Impossible de charger ton profil entreprise. Réessaie dans un instant."
          onRetry={() => profileQuery.refetch()}
        />
      </div>
    );
  }

  if (
    profileQuery.isSuccess &&
    isRecruiterCompanyProfileComplete(profileQuery.data)
  ) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center text-white/50 text-sm">
        Redirection…
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto space-y-8 py-6 sm:py-10 px-1">
      <div
        className={`relative mb-2 pb-6 ${isLight ? "border-b border-black/10" : "border-b border-white/[0.04]"}`}
      >
        <h1
          className={`text-[26px] sm:text-[32px] font-bold tracking-[-0.04em] font-heading ${isLight ? "text-black" : "text-white"}`}
        >
          Complète ton profil recruteur
        </h1>
        <p
          className={`text-[14px] mt-2 font-light max-w-xl ${isLight ? "text-black/60" : "text-white/45"}`}
        >
          Ces informations permettent d’identifier ton entreprise et de te contacter.
        </p>
      </div>

      <div
        className={`rounded-2xl p-5 sm:p-6 ${isLight ? "card-luxury-light" : "bg-zinc-900/50 border border-white/[0.06]"}`}
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className={labelCls}>Nom de la société *</label>
              <input
                required
                value={nomSociete}
                onChange={(e) => setNomSociete(e.target.value)}
                className={inputClass}
                placeholder="Ex. TAP SARL"
              />
            </div>

            <div className="min-w-0">
              <label className={labelCls}>Nom du contact *</label>
              <input
                required
                value={nomContact}
                onChange={(e) => setNomContact(e.target.value)}
                className={inputClass}
                placeholder="Prénom et nom"
              />
            </div>

            <div className="min-w-0">
              <label className={labelCls}>Téléphone *</label>
              <input
                required
                type="tel"
                value={telephone}
                onChange={(e) => {
                  setTelephone(e.target.value);
                  if (fieldErrors.telephone) setFieldErrors((f) => ({ ...f, telephone: undefined }));
                }}
                aria-invalid={Boolean(fieldErrors.telephone)}
                className={`${inputClass} ${fieldErrors.telephone ? "border-red-500/50" : ""}`}
                placeholder="+212 6XX XXX XXX ou 06XXXXXXXX"
              />
              {fieldErrors.telephone && (
                <div className="mt-2 text-[12px] text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  {fieldErrors.telephone}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <label className={labelCls}>ICE *</label>
              <input
                required
                inputMode="numeric"
                autoComplete="off"
                value={ice}
                onChange={(e) => {
                  setIce(normalizeIceInput(e.target.value));
                  if (fieldErrors.ice) setFieldErrors((f) => ({ ...f, ice: undefined }));
                }}
                aria-invalid={Boolean(fieldErrors.ice)}
                className={`${inputClass} ${fieldErrors.ice ? "border-red-500/50" : ""}`}
                placeholder="15 chiffres"
              />
              {fieldErrors.ice && (
                <div className="mt-2 text-[12px] text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  {fieldErrors.ice}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <label className={labelCls}>Email personnel (compte)</label>
              <input
                type="email"
                value={emailPersonnel}
                disabled
                readOnly
                className={`${inputClass} cursor-not-allowed opacity-70`}
                title="Email lié à ton compte — non modifiable"
              />
            </div>

            <div className="min-w-0">
              <label className={labelCls}>Email professionnel *</label>
              <input
                required
                type="email"
                value={emailPro}
                onChange={(e) => setEmailPro(e.target.value)}
                className={inputClass}
                placeholder="contact@entreprise.com"
              />
            </div>

            <div className="min-w-0 sm:col-span-2">
              <label className={labelCls}>Adresse *</label>
              <textarea
                required
                rows={3}
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                className={`${inputClass} min-h-[88px] resize-none`}
                placeholder="Adresse complète du siège ou du bureau"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={upsert.isPending}
              className="btn-primary btn-sm disabled:opacity-55 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_16px_rgba(202,27,40,0.35)]"
            >
              {upsert.isPending ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
