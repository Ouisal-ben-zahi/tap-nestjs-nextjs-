"use client";

import Link from "next/link";
import { ArrowRight, FileText, MapPin } from "lucide-react";
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

  const cardBase =
    "group relative card-animated-border rounded-2xl overflow-hidden border p-4 sm:p-5 lg:p-6 transition-all duration-300 transform-gpu will-change-transform hover:-translate-y-0.5 w-full";
  const cardSurface = isLight
    ? "bg-[#0A0A0A] border-white/[0.08] hover:border-tap-red/20 hover:shadow-[0_12px_40px_rgba(0,0,0,0.45),0_0_18px_rgba(202,27,40,0.10)]"
    : "bg-[#0A0A0A] border-white/[0.06] hover:border-tap-red/15 hover:shadow-[0_12px_40px_rgba(0,0,0,0.45),0_0_18px_rgba(202,27,40,0.10)]";

  return (
    <div className="max-w-[1320px] mx-auto">
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
            Suivez vos postulations : statut, dates et accès rapide au détail de chaque candidature.
          </p>
        </div>
      </div>

      {appsQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-2xl" />
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
        <div className="grid grid-cols-1 gap-4 lg:gap-5">
          {applications.map((app) => (
            <div key={app.id} className={`${cardBase} ${cardSurface}`}>
              <div className="absolute top-0 left-0 right-0 h-[100px] bg-gradient-to-b from-tap-red/14 via-tap-red/4 to-transparent pointer-events-none" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(202,27,40,0.20),transparent_55%)]" />
              </div>

              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-stretch sm:justify-between sm:gap-6 min-w-0">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex text-[10px] sm:text-[11px] px-2.5 py-1 rounded-full border font-medium uppercase tracking-wide ${statusBg(
                        app.status ?? "Inconnu",
                      )}`}
                    >
                      {app.status ?? "Inconnu"}
                    </span>
                    <span className={`text-[10px] sm:text-[11px] ${isLight ? "text-black/45" : "text-white/35"}`}>
                      {app.validatedAt ? formatRelative(app.validatedAt) : "Date non renseignée"}
                    </span>
                  </div>

                  {app.jobId ? (
                    <Link
                      href={`/app/matching/offres/${app.jobId}`}
                      className={`block text-[16px] sm:text-[17px] font-semibold uppercase leading-snug transition ${
                        isLight ? "text-black hover:text-tap-red" : "text-white hover:text-tap-red"
                      }`}
                    >
                      {app.jobTitle ?? "Offre sans titre"}
                    </Link>
                  ) : (
                    <p className={`text-[16px] sm:text-[17px] font-semibold uppercase ${isLight ? "text-black" : "text-white"}`}>
                      {app.jobTitle ?? "Offre sans titre"}
                    </p>
                  )}

                  <p
                    className={`inline-flex items-center gap-1.5 text-[11px] sm:text-[12px] min-w-0 ${
                      isLight ? "text-black/70" : "text-white/55"
                    }`}
                  >
                    <MapPin size={12} className="shrink-0 opacity-80" />
                    <span className="truncate">{app.jobLocationType ?? "Localisation non précisée"}</span>
                  </p>
                </div>

                <div className="flex shrink-0 flex-col justify-end gap-2 sm:items-end sm:min-h-[88px]">
                  <Link
                    href={`/app/mes-candidatures/${app.id}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-tap-red/35 bg-tap-red/10 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#CA1B28] transition hover:bg-tap-red/18 hover:border-tap-red/50 sm:min-w-[11rem]"
                  >
                    Détails candidature
                    <ArrowRight size={14} />
                  </Link>
                  {app.jobId ? (
                    <Link
                      href={`/app/matching/offres/${app.jobId}`}
                      className={`inline-flex items-center justify-center gap-1 text-[11px] font-medium underline underline-offset-2 transition ${
                        isLight ? "text-black/55 hover:text-tap-red" : "text-white/50 hover:text-tap-red"
                      }`}
                    >
                      Voir l&apos;offre
                      <ArrowRight size={12} />
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
