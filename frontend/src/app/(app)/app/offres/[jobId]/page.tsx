"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useRecruteurJob } from "@/hooks/use-recruteur";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";
import { ArrowLeft, Briefcase, Clock, MapPin } from "lucide-react";
import { formatRelative } from "@/lib/utils";

function parseJsonArray(value: unknown): string[] {
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
}

function extractLabels(value: unknown): string[] {
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
}

export default function OffreDetailRecruteurPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = Number(params?.jobId);
  const { isRecruteur } = useAuth();
  const jobQuery = useRecruteurJob(Number.isFinite(jobId) ? jobId : null, isRecruteur && Number.isFinite(jobId));
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

  if (!Number.isFinite(jobId)) {
    return (
      <EmptyState
        icon={<Briefcase className="w-12 h-12" />}
        title="Offre introuvable"
        description="Identifiant d'offre invalide."
      />
    );
  }

  if (jobQuery.isLoading) {
    return (
      <div className="max-w-[900px] mx-auto py-6">
        <Skeleton className="h-10 w-40 mb-4" />
        <Skeleton className="h-32 w-full mb-3" />
        <Skeleton className="h-24 w-full mb-3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (jobQuery.isError) {
    return <ErrorState onRetry={() => jobQuery.refetch()} />;
  }

  const job = jobQuery.data?.job as Record<string, unknown> | undefined;
  if (!job) {
    return (
      <EmptyState
        icon={<Briefcase className="w-12 h-12" />}
        title="Offre introuvable"
        description="Cette offre n'existe pas ou n'est plus accessible."
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

  const locationValues = [
    ...parseJsonArray(job.location_type),
    ...parseJsonArray(job.localisation),
  ];
  const uniqueLocations = Array.from(new Set(locationValues));
  const locationLabel = uniqueLocations.length > 0 ? uniqueLocations.join(" • ") : null;

  const taskLabels = extractLabels(job.tasks);

  const softList = Array.isArray(job.soft_skills)
    ? (job.soft_skills as unknown[]).map((x) => String(x)).filter((s) => s.trim())
    : [];

  const skillItems = Array.isArray(job.skills)
    ? (job.skills as Record<string, unknown>[]).filter((s) => s && typeof s === "object")
    : [];

  const langItems = Array.isArray(job.languages)
    ? (job.languages as Record<string, unknown>[]).filter((l) => l && typeof l === "object")
    : [];

  const hasSalary = job.salary_min !== null || job.salary_max !== null;
  const salaryLabel = hasSalary
    ? `${job.salary_min ?? "?"} - ${job.salary_max ?? "?"} MAD`
    : null;

  const detailsRows = [
    { label: "Entreprise", value: job.entreprise },
    { label: "Téléphone", value: job.phone },
    { label: "Contrat", value: job.contrat },
    { label: "Niveau de séniorité", value: job.niveau_seniorite },
    { label: "Niveau d'études attendu", value: job.niveau_attendu },
    { label: "Expérience minimum", value: job.experience_min },
    { label: "Présence sur site", value: job.presence_sur_site },
    { label: "Disponibilité", value: job.disponibilite },
    hasSalary ? { label: "Salaire", value: salaryLabel } : null,
  ].filter(
    (row): row is { label: string; value: unknown } =>
      !!row && row.value !== null && row.value !== undefined && String(row.value).trim().length > 0,
  );

  const statusStr = String(job.status ?? "ACTIVE");
  const isInactive = statusStr === "INACTIVE";

  const hasAnyInfo =
    detailsRows.length > 0 ||
    hasSalary ||
    Boolean(descriptionText) ||
    taskLabels.length > 0 ||
    softList.length > 0 ||
    skillItems.length > 0 ||
    langItems.length > 0;

  const pillClass = `px-2.5 py-1 rounded-full text-[12px] border ${
    isLight
      ? "bg-black/[0.03] border-black/10 text-black/75"
      : "bg-white/[0.04] border-white/[0.08] text-white/70"
  }`;

  return (
    <div className="max-w-[900px] mx-auto">
      <div className="mb-6">
        <Link
          href="/app/offres"
          className={`inline-flex items-center gap-2 text-[13px] ${
            isLight ? "text-black/70 hover:text-black" : "text-white/60 hover:text-white"
          }`}
        >
          <ArrowLeft size={14} />
          Retour à mes offres
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 items-start">
        <div
          className={`rounded-2xl border p-6 sm:p-7 ${
            isLight
              ? "bg-[#faf7f7] border-[#f1d5d7] shadow-[0_18px_40px_rgba(0,0,0,0.06)]"
              : "bg-zinc-900/50 border-white/[0.08]"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-[24px] sm:text-[26px] font-bold tracking-[-0.03em] mb-1 text-tap-red">
              {String(job.title ?? "Offre sans titre")}
            </h1>

            <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium border ${
                  Boolean(job.urgent)
                    ? "bg-red-500/10 text-red-500 border-red-500/20"
                    : isLight
                      ? "bg-black/5 text-black/70 border-black/10"
                      : "bg-white/[0.04] text-white/60 border-white/[0.08]"
                }`}
              >
                {Boolean(job.urgent) ? "Urgent" : "Standard"}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium border ${
                  isInactive
                    ? isLight
                      ? "bg-black/[0.04] text-black/55 border-black/10"
                      : "bg-white/[0.04] text-white/45 border-white/[0.08]"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                }`}
              >
                {isInactive ? "Inactive" : "Active"}
              </span>
            </div>
          </div>

          <p className={`text-[13px] mb-4 ${isLight ? "text-black/55" : "text-white/50"}`}>
            {String(job.categorie_profil || "Catégorie non renseignée")}
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
              {job.created_at ? formatRelative(String(job.created_at)) : "Date inconnue"}
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
                      <span key={item} className={pillClass}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {softList.length > 0 && (
                <div>
                  <h2
                    className={`text-[16px] font-semibold mb-2 ${
                      isLight ? "text-black" : "text-white"
                    }`}
                  >
                    Soft skills
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {softList.map((item) => (
                      <span key={item} className={pillClass}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {skillItems.length > 0 && (
                <div>
                  <h2
                    className={`text-[16px] font-semibold mb-2 ${
                      isLight ? "text-black" : "text-white"
                    }`}
                  >
                    Compétences demandées
                  </h2>
                  <div className="space-y-2">
                    {skillItems.map((s, idx) => {
                      const name = String(s.name ?? "").trim();
                      if (!name) return null;
                      return (
                        <div
                          key={`${name}-${idx}`}
                          className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 ${
                            isLight
                              ? "border-black/[0.08] bg-white"
                              : "border-white/[0.08] bg-white/[0.03]"
                          }`}
                        >
                          <span
                            className={`font-medium text-[13px] ${
                              isLight ? "text-black/90" : "text-white/[0.92]"
                            }`}
                          >
                            {name}
                          </span>
                          <div className="flex flex-wrap gap-2 text-[11px]">
                            <span
                              className={`rounded-md px-2 py-0.5 border ${
                                isLight ? "border-black/10 text-black/65" : "border-white/10 text-white/55"
                              }`}
                            >
                              Niveau : {String(s.level ?? "—")}
                            </span>
                            <span
                              className={`rounded-md px-2 py-0.5 border ${
                                isLight ? "border-black/10 text-black/65" : "border-white/10 text-white/55"
                              }`}
                            >
                              Priorité : {String(s.priority ?? "—")}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {langItems.length > 0 && (
                <div>
                  <h2
                    className={`text-[16px] font-semibold mb-2 ${
                      isLight ? "text-black" : "text-white"
                    }`}
                  >
                    Langues
                  </h2>
                  <div className="space-y-2">
                    {langItems.map((l, idx) => {
                      const name = String(l.name ?? "").trim();
                      if (!name) return null;
                      return (
                        <div
                          key={`${name}-${idx}`}
                          className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 ${
                            isLight
                              ? "border-black/[0.08] bg-white"
                              : "border-white/[0.08] bg-white/[0.03]"
                          }`}
                        >
                          <span
                            className={`font-medium text-[13px] ${
                              isLight ? "text-black/90" : "text-white/[0.92]"
                            }`}
                          >
                            {name}
                          </span>
                          <div className="flex flex-wrap gap-2 text-[11px]">
                            <span
                              className={`rounded-md px-2 py-0.5 border ${
                                isLight ? "border-black/10 text-black/65" : "border-white/10 text-white/55"
                              }`}
                            >
                              Niveau : {String(l.level ?? "—")}
                            </span>
                            <span
                              className={`rounded-md px-2 py-0.5 border ${
                                isLight ? "border-black/10 text-black/65" : "border-white/10 text-white/55"
                              }`}
                            >
                              Importance : {String(l.importance ?? "—")}
                            </span>
                          </div>
                        </div>
                      );
                    })}
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
                        {String(row.value)}
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
        </div>
      </div>
    </div>
  );
}
