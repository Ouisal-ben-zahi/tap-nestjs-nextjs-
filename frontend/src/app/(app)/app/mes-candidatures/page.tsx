"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
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
              className={`flex items-center justify-between gap-4 rounded-xl px-5 py-4 transition ${
                isLight
                  ? "card-luxury-light hover:border-tap-red/70"
                  : "bg-zinc-900/50 border border-white/[0.06] hover:border-white/[0.1]"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p
                    className={`text-[14px] font-medium truncate ${
                      isLight ? "text-black" : "text-white"
                    }`}
                  >
                    {app.jobTitle ?? "Offre sans titre"}
                  </p>
                  <span
                    className={`text-[11px] px-2.5 py-1 rounded-full border font-medium shrink-0 ${statusBg(
                      app.status ?? "Inconnu",
                    )}`}
                  >
                    {app.status ?? "Inconnu"}
                  </span>
                </div>
                <p className={`text-[12px] mt-1 ${isLight ? "text-black/70" : "text-white/40"}`}>
                  {app.company}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className={`text-[11px] ${isLight ? "text-black/55" : "text-white/40"} `}>Postulation</p>
                <p className={`text-[11px] mt-0.5 ${isLight ? "text-black/70" : "text-white/30"}`}>
                  {app.validatedAt ? formatRelative(app.validatedAt) : "—"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

