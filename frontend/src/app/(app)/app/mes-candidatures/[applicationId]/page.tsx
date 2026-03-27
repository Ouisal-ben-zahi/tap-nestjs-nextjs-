"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { useCandidatApplications } from "@/hooks/use-candidat";
import { useAuth } from "@/hooks/use-auth";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatRelative, statusBg } from "@/lib/utils";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";

export default function CandidatureDetailsPage() {
  const params = useParams<{ applicationId: string }>();
  const applicationId = Number(params?.applicationId);
  const { isCandidat, isHydrated } = useAuth();
  const enabled = Boolean(isCandidat && isHydrated);
  const appsQuery = useCandidatApplications(enabled);
  const applications = appsQuery.data?.applications || [];
  const theme = useDashboardTheme();
  const isLight = theme === "light";

  const application = applications.find((item) => item.id === applicationId) ?? null;
  const normalizedStatus = String(application?.status ?? "").toLowerCase();
  const isAcceptedStatus =
    normalizedStatus === "acceptee" ||
    normalizedStatus === "acceptée" ||
    normalizedStatus === "accepted";
  const applicationFiles = application
    ? [
        {
          key: "cv",
          label: "CV",
          path: application.cvPath,
          url: application.cvUrl,
        },
        {
          key: "portfolio",
          label: "Portfolio",
          path: application.portfolioPath ?? null,
          url: application.portfolioUrl ?? null,
        },
        {
          key: "talent-card",
          label: "Talent Card",
          path: application.talentCardPath ?? null,
          url: application.talentCardUrl ?? null,
        },
      ].filter((f) => Boolean(f.path || f.url))
    : [];

  if (appsQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-40" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (appsQuery.isError) {
    return <ErrorState onRetry={() => appsQuery.refetch()} />;
  }

  if (!application) {
    return (
      <EmptyState
        icon={<FileText className="w-10 h-10" />}
        title="Candidature introuvable"
        description="Cette postulation n'existe pas ou n'est plus disponible."
        action={
          <Link
            href="/app/mes-candidatures"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-tap-red/90 hover:bg-tap-red-hover text-[12px] font-medium text-white transition-colors"
          >
            Retour à mes candidatures
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <Link
        href="/app/mes-candidatures"
        className={`inline-flex items-center gap-2 text-[12px] transition ${
          isLight ? "text-black/70 hover:text-black" : "text-white/60 hover:text-white"
        }`}
      >
        <ArrowLeft size={14} />
        Retour
      </Link>

      <section
        className={`rounded-2xl p-5 ${
          isLight ? "card-luxury-light" : "bg-zinc-900/50 border border-white/[0.06]"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <h1 className={`text-[22px] sm:text-[28px] font-bold tracking-[-0.03em] ${isLight ? "text-black" : "text-white"}`}>
            {application.jobTitle ?? "Offre sans titre"}
          </h1>
          <p className={`shrink-0 text-[12px] sm:text-[13px] ${isLight ? "text-black/70" : "text-white/65"}`}>
            {application.validatedAt ? formatRelative(application.validatedAt) : "—"}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
          <p className={isLight ? "text-black/80" : "text-white/75"}>
            {application.jobLocationType ?? "Non défini"}
          </p>
          {!isAcceptedStatus ? (
            <p>
              <span
                className={`inline-flex text-[11px] px-2.5 py-1 rounded-full border font-medium ${statusBg(
                  application.status ?? "Inconnu",
                )}`}
              >
                {application.status ?? "Inconnu"}
              </span>
            </p>
          ) : null}
        </div>

        <div
          className={`mt-5 rounded-xl p-4 ${
            isLight ? "bg-black/[0.03] border border-black/10" : "bg-white/[0.02] border border-white/[0.08]"
          }`}
        >
          <p className={`text-[13px] font-medium ${isLight ? "text-black" : "text-white/85"}`}>
            Fichiers de postulation
          </p>
          {applicationFiles.length === 0 ? (
            <p className={`mt-2 text-[12px] ${isLight ? "text-black/65" : "text-white/60"}`}>
              Aucun fichier postulé.
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              {applicationFiles.map((file) => (
                <div
                  key={file.key}
                  className={`rounded-xl px-3 py-2 ${
                    isLight
                      ? "bg-white border border-black/10"
                      : "bg-white/[0.02] border border-white/[0.08]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p
                      className={`text-[12px] truncate max-w-[65%] ${
                        isLight ? "text-black/75" : "text-white/65"
                      }`}
                    >
                      {file.path ? file.path.split("/").pop() : file.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
