"use client";

import { useAuth } from "@/hooks/use-auth";
import { useCandidatScheduledInterviews, useCandidatStats } from "@/hooks/use-candidat";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { MessageSquare, FileText, Upload, Brain, Cpu, Mic, ClipboardList, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";
import { useMutation } from "@tanstack/react-query";
import { candidatService } from "@/services/candidat.service";
import { useUiStore } from "@/stores/ui";
import { useRouter } from "next/navigation";

const interviewTypes = [
  {
    key: "behavioral",
    title: "Entretien comportemental",
    description: "Questions sur vos expériences passées et votre gestion des situations.",
    icon: Brain,
    badgeClass: "bg-red-500/10 border-red-500/20",
    iconClass: "text-red-500",
    duration: "20 min",
    questions: 10,
  },
  {
    key: "technical",
    title: "Entretien technique",
    description: "Évaluez vos compétences techniques avec des questions adaptées.",
    icon: Cpu,
    badgeClass: "bg-blue-500/10 border-blue-500/20",
    iconClass: "text-blue-500",
    duration: "30 min",
    questions: 15,
  },
  {
    key: "presentation",
    title: "Présentation personnelle",
    description: "Entraînez-vous à vous présenter de manière concise et impactante.",
    icon: Mic,
    badgeClass: "bg-emerald-500/10 border-emerald-500/20",
    iconClass: "text-emerald-500",
    duration: "10 min",
    questions: 5,
  },
  {
    key: "hr",
    title: "Questions RH classiques",
    description: "Motivation, prétentions salariales, disponibilité et plus.",
    icon: ClipboardList,
    badgeClass: "bg-amber-500/10 border-amber-500/20",
    iconClass: "text-amber-500",
    duration: "15 min",
    questions: 8,
  },
] as const;

export default function EntretienPage() {
  const { isCandidat } = useAuth();
  const statsQuery = useCandidatStats();
  const scheduledInterviewsQuery = useCandidatScheduledInterviews();
  const theme = useDashboardTheme();
  const isLight = theme === "light";
  /** Aligné sur les cartes liste `/app/matching` (fond plat, dégradé au survol, halos). */
  const interviewTypeCardClass = `group relative card-animated-border rounded-2xl overflow-hidden border p-5 sm:p-6 cursor-pointer transform-gpu will-change-transform transition-all duration-300 hover:-translate-y-0.5 w-full ${
    isLight
      ? "bg-[#020001] border-white/[0.08] hover:border-tap-red/20 hover:shadow-[0_12px_40px_rgba(0,0,0,0.45),0_0_18px_rgba(202,27,40,0.10)]"
      : "bg-[#020001] border-white/[0.08] shadow-[0_10px_28px_rgba(0,0,0,0.45)] hover:bg-[linear-gradient(180deg,rgba(202,27,40,0.08)_0%,rgba(10,10,10,0.96)_30%,rgba(10,10,10,0.96)_100%)] hover:border-tap-red/15 hover:shadow-[0_12px_40px_rgba(0,0,0,0.45),0_0_18px_rgba(202,27,40,0.10)]"
  }`;
  const addToast = useUiStore((s) => s.addToast);
  const router = useRouter();

  const startInterviewMutation = useMutation({
    mutationFn: (interviewType: string) => candidatService.startInterviewSimulation(interviewType),
    onSuccess: (res, interviewType) => {
      if (res?.session_id) {
        router.push(`/app/entretien/simulation?sessionId=${encodeURIComponent(res.session_id)}&type=${encodeURIComponent(interviewType)}`);
        addToast({ message: "Simulation B3 lancée.", type: "success" });
        return;
      }
      addToast({ message: "Simulation lancée, mais lien de session indisponible.", type: "error" });
    },
    onError: () => {
      addToast({ message: "Impossible de démarrer la simulation B3", type: "error" });
    },
  });

  if (!isCandidat) {
    return <EmptyState icon={<MessageSquare className="w-12 h-12" />} title="Espace candidat uniquement" description="Cette section est réservée aux candidats." />;
  }

  const hasProfile = statsQuery.data?.candidateId !== null && statsQuery.data?.candidateId !== undefined;
  const plannedInterviews = scheduledInterviewsQuery.data?.scheduledInterviews || [];
  const formatInterviewType = (type: string | null | undefined) => {
    const normalized = String(type ?? "").toUpperCase();
    if (normalized === "EN_LIGNE") return "En ligne";
    if (normalized === "PRESENTIEL") return "Présentiel";
    if (normalized === "TELEPHONIQUE") return "Téléphonique";
    return type || "—";
  };

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className={`relative mb-8 pb-8 ${isLight ? "border-b border-black/10" : "border-b border-white/[0.04]"}`}>
        <div className="absolute top-[-80px] left-[-100px] w-[350px] h-[350px] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.08),transparent_60%)] blur-3xl pointer-events-none" />
        <div className="relative">
          <h1 className={`text-[28px] sm:text-[36px] font-bold tracking-[-0.04em] font-heading ${isLight ? "text-black" : "text-white"}`}>Simulateur d&apos;entretien</h1>
          <p className={`text-[14px] mt-2 font-light ${isLight ? "text-black/60" : "text-white/45"}`}>Préparez-vous avec notre IA qui simule de vrais entretiens adaptés à votre profil.</p>
        </div>
      </div>

      {statsQuery.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44 w-full" />)}</div>
      ) : !hasProfile ? (
        <EmptyState icon={<FileText className="w-12 h-12" />} title="Profil requis" description="Uploadez votre CV pour que l'IA adapte les questions d'entretien à votre profil."
          action={<Link href="/app/analyse-cv" className="btn-primary gap-2 mt-2"><Upload size={14} /> Analyser mon CV</Link>} />
      ) : (
        <>
          {plannedInterviews.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-5 rounded-full bg-purple-500" />
                <h2 className={`text-[13px] uppercase tracking-[2px] font-semibold ${isLight ? "text-black" : "text-white/50"}`}>
                  Entretiens déjà planifiés
                </h2>
              </div>
              <div className="space-y-2">
                {plannedInterviews.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className={`grid grid-cols-1 sm:grid-cols-4 gap-2 items-center rounded-xl px-4 py-3 ${
                      isLight ? "bg-black/[0.03] border border-black/10" : "bg-white/[0.02] border border-white/[0.06]"
                    }`}
                  >
                    <p className={`text-[13px] font-medium truncate ${isLight ? "text-black" : "text-white"}`}>
                      {item.jobTitle ?? "Offre sans titre"}
                    </p>
                    <p className={`text-[12px] ${isLight ? "text-black/75" : "text-white/60"}`}>
                      {formatInterviewType(item.interviewType)}
                    </p>
                    <p className={`text-[12px] ${isLight ? "text-black/75" : "text-white/60"}`}>
                      {item.interviewDate ? new Date(item.interviewDate).toLocaleDateString("fr-FR") : "Non définie"}
                    </p>
                    <p className={`text-[12px] ${isLight ? "text-black/75" : "text-white/60"}`}>
                      {item.interviewTime ? item.interviewTime.slice(0, 5) : "Non définie"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-5 rounded-full shrink-0 bg-tap-red" />
            <h2 className={`text-[13px] uppercase tracking-[2px] font-semibold ${isLight ? "text-black" : "text-white/50"}`}>Types d&apos;entretien</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {interviewTypes.map((type, i) => {
              const Icon = type.icon;
              return (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (!startInterviewMutation.isPending) startInterviewMutation.mutate(type.key);
                    }
                  }}
                  onClick={() => {
                    if (!startInterviewMutation.isPending) {
                      startInterviewMutation.mutate(type.key);
                    }
                  }}
                  className={`${interviewTypeCardClass} ${startInterviewMutation.isPending ? "opacity-70 pointer-events-none" : ""}`}
                >
                  {!isLight && (
                    <div className="pointer-events-none absolute inset-0 opacity-100 group-hover:opacity-0 transition-opacity duration-500">
                      <div className="absolute -top-16 -right-8 w-48 h-48 rounded-full bg-white/5 blur-2xl" />
                      <div className="absolute -bottom-12 -left-8 w-56 h-56 rounded-full bg-tap-red/10 blur-2xl opacity-40" />
                    </div>
                  )}
                  <div className="relative flex items-start justify-between gap-3 min-w-0">
                    <div className="min-w-0 flex-1 flex flex-col pr-2">
                      <h3 className={`text-[15px] font-semibold mb-2 ${isLight ? "text-black" : "text-white"}`}>{type.title}</h3>
                      <p className={`text-[12px] leading-relaxed mb-4 flex-1 ${isLight ? "text-black/70" : "text-white/50"}`}>{type.description}</p>
                      <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] mt-auto ${isLight ? "text-black/60" : "text-white/35"}`}>
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {type.duration}
                        </span>
                        <span>{type.questions} questions</span>
                        <span className="font-medium text-[#CA1B28] inline-flex items-center gap-1">
                          Lance entretien
                          <ArrowRight size={12} className="opacity-80" />
                        </span>
                      </div>
                    </div>
                    <div
                      className={`w-11 h-11 shrink-0 rounded-xl border flex items-center justify-center ${
                        isLight ? type.badgeClass : "bg-tap-red/[0.08] border-tap-red/20"
                      }`}
                    >
                      <Icon size={18} className={isLight ? type.iconClass : "text-tap-red"} strokeWidth={1.75} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={`rounded-2xl p-6 ${isLight ? "card-luxury-light" : "bg-zinc-900/50 border border-white/[0.06]"}`}>
            <h3 className={`text-[13px] uppercase tracking-[2px] font-semibold mb-5 ${isLight ? "text-black" : "text-white/50"}`}>Comment ça marche</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { step: "1", title: "Choisissez un type", desc: "Sélectionnez le format d'entretien." },
                { step: "2", title: "Répondez aux questions", desc: "L'IA pose des questions adaptées à votre profil." },
                { step: "3", title: "Recevez un feedback", desc: "Score et conseils pour vous améliorer." },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-4 rounded-xl ${
                    isLight ? "bg-white border border-tap-red/30" : "bg-white/[0.02] border border-white/[0.04]"
                  }`}
                >
                  <span className="w-7 h-7 rounded-full bg-purple-500/10 text-purple-500 text-[12px] font-bold flex items-center justify-center shrink-0">{item.step}</span>
                  <div>
                    <p className={`text-[13px] font-medium mb-1 ${isLight ? "text-black" : "text-white"}`}>{item.title}</p>
                    <p className={`text-[11px] leading-relaxed ${isLight ? "text-black/70" : "text-white/40"}`}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
