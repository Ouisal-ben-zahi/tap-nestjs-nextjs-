"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRecruteurOverview } from "@/hooks/use-recruteur";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { MessageSquare, Calendar, Clock, Video, MapPin, Phone, CheckCircle } from "lucide-react";
import { formatRelative, statusBg } from "@/lib/utils";

const INTERVIEW_TYPES = [
  { label: "Visio", icon: Video, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  { label: "Présentiel", icon: MapPin, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
  { label: "Téléphone", icon: Phone, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
];

function getInitials(name: string | null | undefined) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return `${first}${second}`.toUpperCase() || "C";
}

export default function EntretiensPlanifiesPage() {
  const { user } = useAuth();
  const isRecruteur = user?.role === "recruteur";
  const overviewQuery = useRecruteurOverview();

  if (!isRecruteur) {
    return (
      <EmptyState
        icon={<MessageSquare className="w-12 h-12" />}
        title="Espace recruteur uniquement"
        description="Cette section est réservée aux recruteurs."
      />
    );
  }

  const overview = overviewQuery.data;
  const recentApps = overview?.recentApplications || [];
  const interviewCandidates = recentApps.filter(
    (a) => a.status?.toLowerCase() === "accepted" || a.status?.toLowerCase() === "accepté"
  );

  return (
    <div className="max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="relative mb-8 pb-8 border-b border-white/[0.04]">
        <div className="absolute top-[-80px] left-[-100px] w-[350px] h-[350px] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.08),transparent_60%)] blur-3xl pointer-events-none" />
        <div className="relative">
          <h1 className="text-[28px] sm:text-[36px] font-bold text-white tracking-[-0.04em] font-heading">
            Entretiens planifiés
          </h1>
          <p className="text-white/45 text-[14px] mt-2 font-light">
            Gérez et suivez vos entretiens avec les candidats sélectionnés.
          </p>
        </div>
      </div>

      {overviewQuery.isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-40 w-full" />
        </div>
      ) : overviewQuery.isError ? (
        <ErrorState onRetry={() => overviewQuery.refetch()} />
      ) : (
        <>
          {/* Types d'entretien */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            {INTERVIEW_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <div key={type.label} className="bg-zinc-900/50 border border-white/[0.06] rounded-xl p-5 flex items-center gap-4 hover:border-white/[0.1] transition">
                  <div className={`w-10 h-10 rounded-xl ${type.bg} border flex items-center justify-center`}>
                    <Icon size={18} className={type.color} />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-white">{type.label}</p>
                    <p className="text-[11px] text-white/40">Mode d&apos;entretien</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stats rapides */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className="bg-zinc-900/50 border border-white/[0.06] rounded-xl p-4 text-center">
              <p className="text-[20px] font-bold text-white">{recentApps.length}</p>
              <p className="text-[11px] text-white/40">Candidatures</p>
            </div>
            <div className="bg-zinc-900/50 border border-white/[0.06] rounded-xl p-4 text-center">
              <p className="text-[20px] font-bold text-purple-400">{interviewCandidates.length}</p>
              <p className="text-[11px] text-white/40">À interviewer</p>
            </div>
            <div className="bg-zinc-900/50 border border-white/[0.06] rounded-xl p-4 text-center">
              <p className="text-[20px] font-bold text-green-400">{overview?.totalJobs ?? 0}</p>
              <p className="text-[11px] text-white/40">Postes ouverts</p>
            </div>
            <div className="bg-zinc-900/50 border border-white/[0.06] rounded-xl p-4 text-center">
              <p className="text-[20px] font-bold text-yellow-400">{overview?.urgentJobs ?? 0}</p>
              <p className="text-[11px] text-white/40">Urgents</p>
            </div>
          </div>

          {/* Candidats à interviewer */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-5 rounded-full bg-purple-500" />
              <h2 className="text-[13px] uppercase tracking-[2px] text-white/50 font-semibold">Candidats acceptés — Prêts pour entretien</h2>
            </div>

            {interviewCandidates.length === 0 ? (
              <EmptyState
                icon={<Calendar className="w-10 h-10" />}
                title="Aucun entretien planifié"
                description="Acceptez des candidatures pour planifier des entretiens avec les meilleurs profils."
              />
            ) : (
              <div className="space-y-2">
                {interviewCandidates.map((app) => (
                  <div key={app.id} className="flex items-center justify-between gap-4 bg-zinc-900/50 border border-white/[0.06] rounded-xl px-5 py-4 hover:border-purple-500/20 transition group">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-full overflow-hidden border border-white/[0.10] bg-white/[0.04] flex items-center justify-center shrink-0">
                        {app.candidateAvatarUrl ? (
                          <img
                            src={app.candidateAvatarUrl}
                            alt={app.candidateName ?? "Avatar candidat"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[12px] font-semibold text-white/70">{getInitials(app.candidateName)}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-medium text-white truncate">{app.candidateName}</p>
                        <p className="text-[12px] text-white/40 truncate">{app.jobTitle}</p>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <span className="text-[12px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/45 truncate">
                            {typeof app.candidateCategory === "string" && app.candidateCategory.trim()
                              ? app.candidateCategory
                              : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-medium flex items-center gap-1">
                        <CheckCircle size={10} /> Accepté
                      </span>
                      <span className="text-[11px] text-white/30">
                        {app.validatedAt ? formatRelative(app.validatedAt) : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Toutes les candidatures récentes */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-5 rounded-full bg-purple-500" />
              <h2 className="text-[13px] uppercase tracking-[2px] text-white/50 font-semibold">Toutes les candidatures</h2>
            </div>

            {recentApps.length === 0 ? (
              <EmptyState
                icon={<MessageSquare className="w-10 h-10" />}
                title="Aucune candidature"
                description="Les candidatures pour vos offres apparaîtront ici."
              />
            ) : (
              <div className="space-y-2">
                {recentApps.map((app) => (
                  <div key={app.id} className="flex items-center justify-between gap-4 bg-zinc-900/50 border border-white/[0.06] rounded-xl px-5 py-4 hover:border-white/[0.1] transition">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-white/[0.10] bg-white/[0.04] flex items-center justify-center shrink-0">
                        {app.candidateAvatarUrl ? (
                          <img
                            src={app.candidateAvatarUrl}
                            alt={app.candidateName ?? "Avatar candidat"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[12px] font-semibold text-white/70">{getInitials(app.candidateName)}</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-[14px] font-medium text-white truncate">{app.candidateName}</p>
                        <p className="text-[12px] text-white/40 truncate">{app.jobTitle}</p>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <span className="text-[12px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/45 truncate">
                            {typeof app.candidateCategory === "string" && app.candidateCategory.trim()
                              ? app.candidateCategory
                              : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${statusBg(
                          app.status ?? "Inconnu",
                        )}`}
                      >
                        {app.status ?? "Inconnu"}
                      </span>
                      <span className="text-[11px] text-white/30">
                        {app.validatedAt ? formatRelative(app.validatedAt) : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
