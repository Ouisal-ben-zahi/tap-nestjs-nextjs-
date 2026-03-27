"use client";

import Link from "next/link";
import { Eye, FileText } from "lucide-react";
import { useCandidatApplications } from "@/hooks/use-candidat";
import { useAuth } from "@/hooks/use-auth";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatRelative, statusBg } from "@/lib/utils";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";

export default function MesCandidaturesPage() {
  const { isCandidat, isHydrated } = useAuth();
  const enabled = Boolean(isCandidat && isHydrated);
  const appsQuery = useCandidatApplications(enabled);
  const applications = appsQuery.data?.applications || [];
  const theme = useDashboardTheme();
  const isLight = theme === "light";

  return (
    <div className="space-y-6">
      <div>
        <h1
          className={`text-[26px] sm:text-[30px] font-bold tracking-[-0.03em] ${
            isLight ? "text-black" : "text-white"
          }`}
        >
          Mes candidatures
        </h1>
        <p className={`text-[14px] mt-1 ${isLight ? "text-black/60" : "text-white/50"}`}>
          Retrouvez ici la liste des offres auxquelles vous avez postulé.
        </p>
      </div>

      {appsQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : appsQuery.isError ? (
        <ErrorState onRetry={() => appsQuery.refetch()} />
      ) : applications.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-10 h-10" />}
          title="Aucune candidature"
          description="Vos candidatures apparaîtront ici une fois que vous aurez postulé."
          action={
            <Link
              href="/app/matching"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-tap-red/90 hover:bg-tap-red-hover text-[12px] font-medium text-white transition-colors"
            >
              Découvrir des offres
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {applications.map((app) => (
            <div
              key={app.id}
              className={`rounded-xl px-5 py-4 transition ${
                isLight
                  ? "card-luxury-light hover:border-tap-red/70"
                  : "bg-zinc-900/50 border border-white/[0.06] hover:border-white/[0.1]"
              }`}
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-center">
                <div className="sm:col-span-4 min-w-0">
                  {app.jobId ? (
                    <Link
                      href={`/app/matching/offres/${app.jobId}`}
                      className={`text-[14px] font-medium truncate inline-block transition ${
                        isLight
                          ? "text-black hover:text-tap-red"
                          : "text-white hover:text-tap-red"
                      }`}
                      title="Voir détails offre"
                    >
                      {app.jobTitle ?? "Offre sans titre"}
                    </Link>
                  ) : (
                    <p
                      className={`text-[14px] font-medium truncate ${
                        isLight ? "text-black" : "text-white"
                      }`}
                    >
                      {app.jobTitle ?? "Offre sans titre"}
                    </p>
                  )}
                  <p className={`text-[12px] mt-1 ${isLight ? "text-black/70" : "text-white/40"}`}>
                    {app.jobLocationType ?? "Type de localisation non défini"}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <span
                    className={`inline-flex text-[11px] px-2.5 py-1 rounded-full border font-medium shrink-0 ${statusBg(
                      app.status ?? "Inconnu",
                    )}`}
                  >
                    {app.status ?? "Inconnu"}
                  </span>
                </div>

                <div className="sm:col-span-2">
                  <Link
                    href={`/app/mes-candidatures/${app.id}`}
                    className={`text-[11px] ${
                      isLight
                        ? "inline-flex items-center justify-center w-full btn-sm rounded-full bg-[#E6E6E6] text-tap-red border-t border-b border-tap-red/20 transition-colors hover:bg-[#E6E6E6]/85"
                        : "inline-flex items-center justify-center w-full btn-primary btn-sm"
                    }`}
                  >
                    Infos
                  </Link>
                </div>

                <div className="sm:col-span-3">
                  <p className={`text-[12px] ${isLight ? "text-black/70" : "text-white/45"}`}>
                    {app.validatedAt ? formatRelative(app.validatedAt) : "—"}
                  </p>
                </div>

                <div className="sm:col-span-1 flex sm:justify-end">
                  {app.jobId ? (
                    <Link
                      href={`/app/matching/offres/${app.jobId}`}
                      className={`p-1.5 rounded-full border transition ${
                        isLight
                          ? "border-black/10 hover:bg-black/5 text-black/60 hover:text-black"
                          : "border-white/[0.14] hover:bg-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                      aria-label="Voir détails offre"
                      title="Voir détails"
                    >
                      <Eye size={14} />
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          ))}

        </div>
      )}
    </div>
  );
}

