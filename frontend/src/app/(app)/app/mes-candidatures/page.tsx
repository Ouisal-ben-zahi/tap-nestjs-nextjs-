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

  const themedCardClass =
    "group card-animated-border relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#020001] shadow-[0_10px_28px_rgba(0,0,0,0.45)] hover:bg-[linear-gradient(180deg,rgba(202,27,40,0.08)_0%,rgba(10,10,10,0.96)_30%,rgba(10,10,10,0.96)_100%)] hover:border-tap-red/15 transition-all duration-500";

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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedApplications.map((app) => {
            const durationLabel = app.validatedAt ? formatRelative(app.validatedAt) : "—";
            const locationLabel = applicationLocationLine(app);
            return (
              <div
                key={app.id}
                className={`${themedCardClass} relative flex min-h-[188px] flex-col p-4 transition-all duration-300 hover:-translate-y-0.5 sm:p-5 ${
                  isLight
                    ? "card-luxury-light hover:shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
                    : "hover:shadow-[0_18px_45px_rgba(0,0,0,0.35)]"
                }`}
              >
                <div className="pointer-events-none absolute inset-0 opacity-100 transition-opacity duration-500 group-hover:opacity-0">
                  <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
                  <div className="absolute -bottom-16 -left-12 h-44 w-44 rounded-full bg-tap-red/10 blur-2xl opacity-40" />
                </div>

                <div className="relative z-[1] flex w-full min-w-0 items-start justify-between gap-3">
                  <h2 className="min-w-0 flex-1 text-left text-[14px] font-semibold leading-snug line-clamp-2">
                    <Link
                      href={`/app/mes-candidatures/${app.id}`}
                      className={`transition hover:underline ${
                        isLight ? "text-black hover:text-tap-red" : "text-white/95 hover:text-tap-red"
                      }`}
                      title="Voir le détail de la candidature"
                    >
                      {app.jobTitle ?? "Offre sans titre"}
                    </Link>
                  </h2>
                  <span
                    className={`shrink-0 text-right text-[11px] tabular-nums leading-snug pt-0.5 ${
                      isLight ? "text-black/45" : "text-white/40"
                    }`}
                    title={app.validatedAt ?? undefined}
                  >
                    {durationLabel}
                  </span>
                </div>

                <p
                  className={`relative z-[1] mt-2 flex min-w-0 items-start gap-1.5 text-left text-[12px] leading-snug ${
                    isLight ? "text-black/65" : "text-white/55"
                  }`}
                >
                  <MapPin size={14} className="mt-0.5 shrink-0 opacity-75" aria-hidden />
                  <span className="min-w-0 line-clamp-2" title={locationLabel}>
                    {locationLabel}
                  </span>
                </p>

                <div
                  className={`relative z-[1] mt-auto flex w-full min-w-0 items-center justify-between gap-3 border-t pt-3 ${
                    isLight ? "border-black/10" : "border-white/[0.08]"
                  }`}
                >
                  <span
                    className={`inline-flex max-w-[min(100%,58%)] shrink-0 truncate rounded-full border px-2.5 py-1 text-[10px] font-medium ${statusBg(
                      app.status ?? "Inconnu",
                    )}`}
                    title={candidatureStatusLabel(app.status)}
                  >
                    {candidatureStatusLabel(app.status)}
                  </span>
                  {app.jobId ? (
                    <Link
                      href={`/app/matching/offres/${app.jobId}`}
                      className={`inline-flex shrink-0 items-center gap-1 text-right text-[11px] font-semibold transition ${
                        isLight ? "text-tap-red hover:text-tap-red/90" : "text-tap-red hover:text-red-400"
                      }`}
                    >
                      Voir l&apos;offre
                      <ArrowRight size={12} strokeWidth={2} aria-hidden />
                    </Link>
                  ) : (
                    <span
                      className={`shrink-0 text-right text-[11px] ${isLight ? "text-black/35" : "text-white/30"}`}
                    >
                      —
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
