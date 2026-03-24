"use client";

import { useAuth } from "@/hooks/use-auth";
import { useCandidatStats } from "@/hooks/use-candidat";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { MessageSquare, Mic, FileText, Upload, Brain, Target, Clock, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";
import { useMutation } from "@tanstack/react-query";
import { candidatService } from "@/services/candidat.service";
import { useUiStore } from "@/stores/ui";
import { useRouter } from "next/navigation";

const interviewTypes = [
  { key: "behavioral", title: "Entretien comportemental", description: "Questions sur vos expériences passées et votre gestion des situations.", icon: Brain, color: "#a855f7", duration: "20 min", questions: 10 },
  { key: "technical", title: "Entretien technique", description: "Évaluez vos compétences techniques avec des questions adaptées.", icon: Target, color: "#3b82f6", duration: "30 min", questions: 15 },
  { key: "presentation", title: "Présentation personnelle", description: "Entraînez-vous à vous présenter de manière concise et impactante.", icon: Mic, color: "#10b981", duration: "10 min", questions: 5 },
  { key: "hr", title: "Questions RH classiques", description: "Motivation, prétentions salariales, disponibilité et plus.", icon: MessageSquare, color: "#f59e0b", duration: "15 min", questions: 8 },
] as const;

export default function EntretienPage() {
  const { isCandidat } = useAuth();
  const statsQuery = useCandidatStats();
  const theme = useDashboardTheme();
  const isLight = theme === "light";
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

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className={`relative mb-8 pb-8 ${isLight ? "border-b border-black/10" : "border-b border-white/[0.04]"}`}>
        <div className="absolute top-[-80px] left-[-100px] w-[350px] h-[350px] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.08),transparent_60%)] blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 mb-4 rounded-full bg-purple-500/[0.08] border border-purple-500/15">
            <MessageSquare size={13} className="text-purple-500" />
            <span className="text-[10px] uppercase tracking-[2.5px] text-purple-500/80 font-semibold">Entretien IA</span>
          </div>
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
          <div
            className={`rounded-2xl p-6 mb-8 flex items-start gap-4 ${
              isLight
                ? "bg-white border border-tap-red/40"
                : "bg-purple-500/[0.06] border border-purple-500/15"
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
              <Sparkles size={18} className="text-purple-500" />
            </div>
            <div>
              <h3 className={`text-[14px] font-semibold mb-1 ${isLight ? "text-black" : "text-white"}`}>Propulsé par l&apos;IA</h3>
              <p className={`text-[13px] font-light ${isLight ? "text-black/70" : "text-white/45"}`}>Les questions sont générées en fonction de votre CV, vos compétences et le poste visé.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-5 rounded-full bg-purple-500" />
            <h2 className={`text-[13px] uppercase tracking-[2px] font-semibold ${isLight ? "text-black" : "text-white/50"}`}>Types d&apos;entretien</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {interviewTypes.map((type, i) => {
              const Icon = type.icon;
              return (
                <div
                  key={i}
                  onClick={() => {
                    if (!startInterviewMutation.isPending) {
                      startInterviewMutation.mutate(type.key);
                    }
                  }}
                  className={`group rounded-2xl p-6 transition-all duration-300 cursor-pointer ${
                    isLight
                      ? "bg-white border border-tap-red/40 hover:border-tap-red/70"
                      : "bg-zinc-900/50 border border-white/[0.06] hover:border-white/[0.12]"
                  } ${startInterviewMutation.isPending ? "opacity-70 pointer-events-none" : ""}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-110"
                      style={{ background: `${type.color}0D`, borderColor: `${type.color}20` }}>
                      <Icon size={20} style={{ color: type.color }} />
                    </div>
                    <ArrowRight size={14} className={`transition-all ${isLight ? "text-black/0 group-hover:text-black/40" : "text-white/0 group-hover:text-white/40"}`} />
                  </div>
                  <h3 className={`text-[15px] font-semibold mb-2 ${isLight ? "text-black" : "text-white"}`}>{type.title}</h3>
                  <p className={`text-[12px] leading-relaxed mb-4 ${isLight ? "text-black/70" : "text-white/40"}`}>{type.description}</p>
                  <div className={`flex items-center gap-4 text-[11px] ${isLight ? "text-black/60" : "text-white/30"}`}>
                    <span className="flex items-center gap-1"><Clock size={11} />{type.duration}</span>
                    <span>{type.questions} questions</span>
                    <span className="text-purple-500">Lance entretien</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={`rounded-2xl p-6 ${isLight ? "bg-white border border-tap-red/40" : "bg-zinc-900/50 border border-white/[0.06]"}`}>
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
