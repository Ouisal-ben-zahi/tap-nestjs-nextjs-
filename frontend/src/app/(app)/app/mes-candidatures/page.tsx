"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, FileText, MapPin } from "lucide-react";
import { useCandidatApplications } from "@/hooks/use-candidat";
import { useAuth } from "@/hooks/use-auth";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatRelative, statusBg } from "@/lib/utils";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";
import {
  applicationLocationLine,
  candidatureStatusLabel,
} from "@/lib/candidat-candidature-display";

export default function MesCandidaturesPage() {
  const { isCandidat, isHydrated } = useAuth();
  const enabled = Boolean(isCandidat && isHydrated);
  const appsQuery = useCandidatApplications(enabled);
  const applications = appsQuery.data?.applications || [];
  const theme = useDashboardTheme();
  const isLight = theme === "light";

  const sortedApplications = useMemo(() => {
    return [...applications].sort((a, b) => {
      const ta = a.validatedAt ? new Date(a.validatedAt).getTime() : 0;
      const tb = b.validatedAt ? new Date(b.validatedAt).getTime() : 0;
      return tb - ta;
    });
  }, [applications]);

  /** Même base que les cartes de la liste gauche `/app/matching` (offres). */
  const listOfferCardClass = isLight
    ? "bg-[#020001] border-white/[0.08] hover:border-tap-red/20 hover:shadow-[0_12px_40px_rgba(0,0,0,0.45),0_0_18px_rgba(202,27,40,0.10)]"
    : "bg-[#020001] border-white/[0.08] shadow-[0_10px_28px_rgba(0,0,0,0.45)] hover:bg-[linear-gradient(180deg,rgba(202,27,40,0.08)_0%,rgba(10,10,10,0.96)_30%,rgba(10,10,10,0.96)_100%)] hover:border-tap-red/15 hover:shadow-[0_12px_40px_rgba(0,0,0,0.45),0_0_18px_rgba(202,27,40,0.10)]";

  return (
    <div className="max-w-[min(100%,1440px)] mx-auto px-1 sm:px-0">
      <div className={`relative mb-8 pb-8 ${isLight ? "border-b border-black/10" : "border-b border-white/[0.04]"}`}>
        <div className="absolute top-[-80px] left-[-100px] w-[350px] h-[350px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.06),transparent_60%)] blur-3xl pointer-events-none" />
        <div className="relative">
          <h1
            className={`text-[28px] sm:text-[36px] font-bold tracking-[-0.04em] font-heading ${
              isLight ? "text-black" : "text-white"
            }`}
          >
            Mes candidatures
          </h1>
          <p className={`text-[14px] mt-2 font-light ${isLight ? "text-black/60" : "text-white/45"}`}>
            Suivez vos postulations : statut, dates et accès à l&apos;offre.
          </p>
        </div>
      </div>

      {appsQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      ) : appsQuery.isError ? (
        <ErrorState onRetry={() => appsQuery.refetch()} />
      ) : sortedApplications.length === 0 ? (
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
        <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedApplications.map((app) => {
            const durationLabel = app.validatedAt ? formatRelative(app.validatedAt) : "—";
            const locationLabel = applicationLocationLine(app);
            const categoryLine = app.jobCategory?.trim() || "Catégorie non précisée";

            return (
              <div
                key={app.id}
                className={`group relative card-animated-border rounded-2xl overflow-hidden border p-4 sm:p-5 lg:p-6 transform-gpu will-change-transform transition-all duration-300 hover:-translate-y-0.5 w-full ${listOfferCardClass}`}
              >
                {!isLight && (
                  <div className="pointer-events-none absolute inset-0 opacity-100 group-hover:opacity-0 transition-opacity duration-500">
                    <div className="absolute -top-16 -right-8 w-48 h-48 rounded-full bg-white/5 blur-2xl" />
                    <div className="absolute -bottom-12 -left-8 w-56 h-56 rounded-full bg-tap-red/10 blur-2xl opacity-40" />
                  </div>
                )}

                <div className="relative flex flex-col gap-0 min-w-0">
                  <div className="flex flex-row items-stretch justify-between gap-3 sm:gap-4 min-w-0">
                    <div className="min-w-0 flex-1">
                      <h3 className={`text-[15px] sm:text-[17px] font-semibold uppercase truncate ${isLight ? "text-black" : "text-white"}`}>
                        <Link
                          href={`/app/mes-candidatures/${app.id}`}
                          className={`transition hover:underline ${isLight ? "text-black hover:text-tap-red" : "text-white hover:text-tap-red"}`}
                          title="Voir le détail de la candidature"
                        >
                          {app.jobTitle ?? "Offre sans titre"}
                        </Link>
                      </h3>
                      <p className={`text-[11px] sm:text-[12px] mt-0.5 truncate ${isLight ? "text-black/65" : "text-white/50"}`}>
                        {categoryLine}
                      </p>
                      <p
                        className={`text-[11px] sm:text-[12px] mt-0.5 inline-flex items-center gap-1 min-w-0 ${isLight ? "text-black/70" : "text-white/55"}`}
                      >
                        <MapPin size={12} className="shrink-0" aria-hidden />
                        <span className="truncate">{locationLabel}</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-0.5 pt-0.5">
                      <span
                        className={`text-[10px] sm:text-[11px] whitespace-nowrap ${isLight ? "text-black/50" : "text-white/35"}`}
                        title={app.validatedAt ?? undefined}
                      >
                        {durationLabel}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`relative mt-3 flex min-w-0 items-center justify-between gap-3 border-t pt-3 ${
                      isLight ? "border-white/[0.08]" : "border-white/[0.08]"
                    }`}
                  >
                    <span
                      className={`inline-flex max-w-[58%] shrink truncate rounded-full border px-2.5 py-1 text-[10px] font-medium ${statusBg(
                        app.status ?? "Inconnu",
                      )}`}
                      title={candidatureStatusLabel(app.status)}
                    >
                      {candidatureStatusLabel(app.status)}
                    </span>
                    {app.jobId ? (
                      <Link
                        href={`/app/matching/offres/${app.jobId}`}
                        className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-[#CA1B28] whitespace-nowrap transition hover:text-red-400"
                      >
                        Voir l&apos;offre
                        <ArrowRight size={12} aria-hidden />
                      </Link>
                    ) : (
                      <span className={`shrink-0 text-[11px] ${isLight ? "text-black/35" : "text-white/30"}`}>—</span>
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
