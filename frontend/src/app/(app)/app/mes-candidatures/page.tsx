"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { useCandidatApplications } from "@/hooks/use-candidat";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatRelative, statusBg } from "@/lib/utils";

export default function MesCandidaturesPage() {
  const appsQuery = useCandidatApplications();
  const applications = appsQuery.data?.applications || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] sm:text-[30px] font-bold text-white tracking-[-0.03em]">
          Mes candidatures
        </h1>
        <p className="text-white/50 text-[14px] mt-1">
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
              className="flex items-center justify-between gap-4 bg-zinc-900/50 border border-white/[0.06] rounded-xl px-5 py-4 hover:border-white/[0.1] transition"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-white truncate">
                  {app.job_title}
                </p>
                <p className="text-[12px] text-white/40">{app.company}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${statusBg(
                    app.status,
                  )}`}
                >
                  {app.status}
                </span>
                <span className="text-[11px] text-white/30">
                  {formatRelative(app.validated_at || app.applied_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

