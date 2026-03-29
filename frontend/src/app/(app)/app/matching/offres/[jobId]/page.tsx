"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useApplyToJob, useCandidatCvFiles, useCandidatPortfolioPdfs, useCandidatPublicJobs, useCandidatTalentcardFiles } from "@/hooks/use-candidat";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";
import { ArrowLeft, Briefcase, Clock, MapPin } from "lucide-react";
import { formatRelative } from "@/lib/utils";
import { filterActiveJobsForCandidatMatching } from "@/lib/candidat-job-matching-filter";

export default function OffreDetailCandidatPage() {
  const router = useRouter();
  const params = useParams<{ jobId: string }>();
  const jobId = Number(params?.jobId);
  const { isCandidat } = useAuth();
  const jobsQuery = useCandidatPublicJobs();
  const cvQuery = useCandidatCvFiles();
  const talentCardQuery = useCandidatTalentcardFiles();
  const portfolioQuery = useCandidatPortfolioPdfs();
  const applyToJob = useApplyToJob();
  const theme = useDashboardTheme();
  const isLight = theme === "light";

  const [applyOpen, setApplyOpen] = useState(false);
  const [cvPath, setCvPath] = useState<string | null>(null);
  const [portfolioPath, setPortfolioPath] = useState<string | null>(null);
  const [talentCardPath, setTalentCardPath] = useState<string | null>(null);
  const [lien, setLien] = useState<string>("");

  const cvFiles = cvQuery.data?.cvFiles ?? [];
  const talentCardFiles = talentCardQuery.data?.talentcardFiles ?? [];
  const portfolioFiles = portfolioQuery.data?.portfolioPdfFiles ?? [];

  const shortPortfolioFiles = useMemo(
    () => portfolioFiles.filter((f: any) => f.type !== "long"),
    [portfolioFiles],
  );

  const visibleJobs = useMemo(
    () => filterActiveJobsForCandidatMatching(jobsQuery.data?.jobs ?? []),
    [jobsQuery.data?.jobs],
  );

  useEffect(() => {
    if (!applyOpen) return;
    if (!cvPath && cvFiles.length > 0) setCvPath(cvFiles[0].path);
    if (!portfolioPath && shortPortfolioFiles.length > 0) setPortfolioPath(shortPortfolioFiles[0].path);
    if (!talentCardPath && talentCardFiles.length > 0) setTalentCardPath(talentCardFiles[0].path);
  }, [applyOpen, cvFiles, shortPortfolioFiles, talentCardFiles, cvPath, portfolioPath, talentCardPath]);

  if (!isCandidat) {
    return (
      <EmptyState
        icon={<Briefcase className="w-12 h-12" />}
        title="Espace candidat uniquement"
        description="Cette section est réservée aux candidats."
      />
    );
  }

  if (!Number.isFinite(jobId)) {
    return (
      <EmptyState
        icon={<Briefcase className="w-12 h-12" />}
        title="Offre introuvable"
        description="Identifiant d'offre invalide."
      />
    );
  }

  if (jobsQuery.isLoading) {
    return (
      <div className="max-w-[900px] mx-auto py-6">
        <Skeleton className="h-10 w-40 mb-4" />
        <Skeleton className="h-32 w-full mb-3" />
        <Skeleton className="h-24 w-full mb-3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (jobsQuery.isError) {
    return <ErrorState onRetry={() => jobsQuery.refetch()} />;
  }

  const job = visibleJobs.find((item) => item.id === jobId);

  if (!job) {
    return (
      <EmptyState
        icon={<Briefcase className="w-12 h-12" />}
        title="Offre introuvable"
        description="Cette offre n'est plus disponible."
      />
    );
  }

  const descriptionParts = [
    job.reason,
    job.main_mission,
    job.tasks_other,
  ].filter((p) => typeof p === "string" && p.trim().length > 0) as string[];

  const descriptionText =
    descriptionParts.length > 0 ? descriptionParts.join("\n\n") : null;

  const parseJsonArray = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean);
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => (typeof item === "string" ? item.trim() : ""))
            .filter(Boolean);
        }
      } catch {
        return [trimmed];
      }
    }
    return [];
  };

  const locationValues = [
    ...parseJsonArray((job as any).location_type),
    ...parseJsonArray((job as any).localisation),
  ];

  const uniqueLocations = Array.from(new Set(locationValues));
  const locationLabel = uniqueLocations.length > 0 ? uniqueLocations.join(" • ") : null;

  const extractLabels = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          const label = obj.label ?? obj.name ?? obj.skill ?? obj.value;
          return typeof label === "string" ? label.trim() : "";
        }
        return "";
      })
      .filter(Boolean);
  };

  const taskLabels = extractLabels((job as any).tasks);
  const skillLabels = extractLabels((job as any).skills);
  const languageLabels = extractLabels((job as any).languages);

  const hasSalary = job.salary_min !== null || job.salary_max !== null;

  const salaryLabel = hasSalary
    ? `${job.salary_min ?? "?"} - ${job.salary_max ?? "?"} MAD`
    : null;

  const detailsRows = [
    { label: "Contrat", value: job.contrat },
    { label: "Niveau de séniorité", value: job.niveau_seniorite },
    { label: "Niveau attendu", value: job.niveau_attendu },
    { label: "Expérience minimum", value: job.experience_min },
    { label: "Présence sur site", value: job.presence_sur_site },
    { label: "Disponibilité", value: job.disponibilite },
    hasSalary ? { label: "Salaire", value: salaryLabel } : null,
  ].filter(
    (row): row is { label: string; value: string } =>
      !!row && typeof row.value === "string" && row.value.trim().length > 0,
  );

  const hasAnyInfo =
    detailsRows.length > 0 ||
    hasSalary ||
    Boolean(descriptionText) ||
    taskLabels.length > 0 ||
    skillLabels.length > 0 ||
    languageLabels.length > 0;

  return (
    <div className="max-w-[900px] mx-auto">
      <div className="mb-6">
        <Link
          href="/app/matching"
          className={`inline-flex items-center gap-2 text-[13px] ${
            isLight ? "text-black/70 hover:text-black" : "text-white/60 hover:text-white"
          }`}
        >
          <ArrowLeft size={14} />
          Retour aux offres
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 items-start">
        {/* Carte principale : contenu de l'offre + CTA */}
        <div
          className={`rounded-2xl border p-6 sm:p-7 ${
            isLight
              ? "bg-[#faf7f7] border-[#f1d5d7] shadow-[0_18px_40px_rgba(0,0,0,0.06)]"
              : "bg-zinc-900/50 border-white/[0.08]"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <h1
              className={`text-[24px] sm:text-[26px] font-bold tracking-[-0.03em] mb-1 ${
                "text-tap-red"
              }`}
            >
              {job.title ?? "Offre sans titre"}
            </h1>

            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium border shrink-0 ${
                job.urgent
                  ? "bg-red-500/10 text-red-500 border-red-500/20"
                  : isLight
                    ? "bg-black/5 text-black/70 border-black/10"
                    : "bg-white/[0.04] text-white/60 border-white/[0.08]"
              }`}
            >
              {job.urgent ? "Urgent" : "Standard"}
            </span>
          </div>

          <p
            className={`text-[13px] mb-4 ${
              isLight ? "text-black/55" : "text-white/50"
            }`}
          >
            {job.categorie_profil || "Catégorie non renseignée"}
          </p>

          <div
            className={`flex flex-wrap items-center gap-3 text-[12px] mb-6 ${
              isLight ? "text-black/65" : "text-white/50"
            }`}
          >
            {locationLabel && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} />
                {locationLabel}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Clock size={12} />
              {job.created_at ? formatRelative(job.created_at) : "Date inconnue"}
            </span>
          </div>

          {hasAnyInfo ? (
            <div className="mt-6 space-y-5">
              {descriptionText && (
                <div>
                  <h2
                    className={`text-[16px] font-semibold mb-2 ${
                      isLight ? "text-black" : "text-white"
                    }`}
                  >
                    Description & missions
                  </h2>
                  <p
                    className={`text-[14px] leading-relaxed whitespace-pre-line ${
                      isLight ? "text-black/80" : "text-white/80"
                    }`}
                  >
                    {descriptionText}
                  </p>
                </div>
              )}

              {taskLabels.length > 0 && (
                <div>
                  <h2
                    className={`text-[16px] font-semibold mb-2 ${
                      isLight ? "text-black" : "text-white"
                    }`}
                  >
                    Tâches clés
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {taskLabels.map((item) => (
                      <span
                        key={item}
                        className={`px-2.5 py-1 rounded-full text-[12px] border ${
                          isLight
                            ? "bg-black/[0.03] border-black/10 text-black/75"
                            : "bg-white/[0.04] border-white/[0.08] text-white/70"
                        }`}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {skillLabels.length > 0 && (
                <div>
                  <h2
                    className={`text-[16px] font-semibold mb-2 ${
                      isLight ? "text-black" : "text-white"
                    }`}
                  >
                    Compétences demandées
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {skillLabels.map((item) => (
                      <span
                        key={item}
                        className={`px-2.5 py-1 rounded-full text-[12px] border ${
                          isLight
                            ? "bg-black/[0.03] border-black/10 text-black/75"
                            : "bg-white/[0.04] border-white/[0.08] text-white/70"
                        }`}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {languageLabels.length > 0 && (
                <div>
                  <h2
                    className={`text-[16px] font-semibold mb-2 ${
                      isLight ? "text-black" : "text-white"
                    }`}
                  >
                    Langues
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {languageLabels.map((item) => (
                      <span
                        key={item}
                        className={`px-2.5 py-1 rounded-full text-[12px] border ${
                          isLight
                            ? "bg-black/[0.03] border-black/10 text-black/75"
                            : "bg-white/[0.04] border-white/[0.08] text-white/70"
                        }`}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {detailsRows.length > 0 && (
                <div>
                  <h2
                    className={`text-[16px] font-semibold mb-2 ${
                      isLight ? "text-black" : "text-white"
                    }`}
                  >
                    Détails du poste
                  </h2>
                  <div
                    className={`grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px] ${
                      isLight ? "text-black/80" : "text-white/80"
                    }`}
                  >
                    {detailsRows.map((row) => (
                      <p key={row.label}>
                        <span className="font-medium">{row.label} : </span>
                        {row.value}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className={`text-[14px] ${isLight ? "text-black/65" : "text-white/60"}`}>
              Les informations détaillées de cette offre ne sont pas encore disponibles.
            </p>
          )}

          {/* CTA Postuler en bas à droite de la carte */}
          <div className="mt-8 flex justify-end">
            {!applyOpen ? (
              <button
                type="button"
                className="btn-primary btn-sm rounded-full"
                onClick={() => router.push(`/app/matching/offres/${jobId}/postuler`)}
              >
                Postuler maintenant
              </button>
            ) : (
              <div
                className={`w-full sm:w-[520px] rounded-2xl border p-5 ${isLight ? "bg-white/60 border-tap-red/20" : "bg-zinc-900/60 border-white/[0.08]"}`}
              >
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h2 className="text-[14px] font-semibold">Formulaire de candidature</h2>
                  <button
                    type="button"
                    className={`text-[13px] px-3 py-1.5 rounded-full border hover:bg-black/5 ${
                      isLight ? "border-black/10" : "border-white/10 hover:bg-white/5"
                    }`}
                    onClick={() => setApplyOpen(false)}
                  >
                    Fermer
                  </button>
                </div>

                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    applyToJob.mutate({
                      jobId,
                      cvPath,
                      portfolioPath,
                      talentCardPath,
                      lien: lien.trim() || null,
                    }, {
                      onSuccess: () => setApplyOpen(false),
                    });
                  }}
                >
                  <div className="space-y-1">
                    <label className={`text-[12px] font-semibold ${isLight ? "text-black/70" : "text-white/60"}`}>
                      CV
                    </label>
                    <select
                      className="input-premium w-full"
                      value={cvPath ?? ""}
                      onChange={(e) => setCvPath(e.target.value || null)}
                      disabled={cvQuery.isLoading || cvFiles.length === 0}
                    >
                      {cvQuery.isLoading ? <option value="">Chargement...</option> : null}
                      {cvFiles.length === 0 ? <option value="">Aucun CV</option> : null}
                      {cvFiles.map((f) => (
                        <option key={f.path} value={f.path}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className={`text-[12px] font-semibold ${isLight ? "text-black/70" : "text-white/60"}`}>
                      Portfolio
                    </label>
                    <select
                      className="input-premium w-full"
                      value={portfolioPath ?? ""}
                      onChange={(e) => setPortfolioPath(e.target.value || null)}
                      disabled={portfolioQuery.isLoading || shortPortfolioFiles.length === 0}
                    >
                      {portfolioQuery.isLoading ? <option value="">Chargement...</option> : null}
                      {shortPortfolioFiles.length === 0 ? <option value="">Aucun portfolio</option> : null}
                      {shortPortfolioFiles.map((f: any) => (
                        <option key={f.path} value={f.path}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className={`text-[12px] font-semibold ${isLight ? "text-black/70" : "text-white/60"}`}>
                      Talent Card
                    </label>
                    <select
                      className="input-premium w-full"
                      value={talentCardPath ?? ""}
                      onChange={(e) => setTalentCardPath(e.target.value || null)}
                      disabled={talentCardQuery.isLoading || talentCardFiles.length === 0}
                    >
                      {talentCardQuery.isLoading ? <option value="">Chargement...</option> : null}
                      {talentCardFiles.length === 0 ? <option value="">Aucune Talent Card</option> : null}
                      {talentCardFiles.map((f) => (
                        <option key={f.path} value={f.path}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className={`text-[12px] font-semibold ${isLight ? "text-black/70" : "text-white/60"}`}>
                      Lien
                    </label>
                    <input
                      type="url"
                      className="input-premium w-full"
                      placeholder="https://... (optionnel)"
                      value={lien}
                      onChange={(e) => setLien(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full h-11 rounded-xl bg-tap-red text-white text-[13px] font-semibold hover:bg-tap-red-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={applyToJob.isPending || !cvPath || !portfolioPath || !talentCardPath}
                  >
                    {applyToJob.isPending ? "Envoi..." : "Envoyer la candidature"}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
