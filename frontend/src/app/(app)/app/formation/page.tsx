"use client";

import { useAuth } from "@/hooks/use-auth";
import { useCandidatStats } from "@/hooks/use-candidat";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { GraduationCap, Clock, ArrowRight, BookOpen, Code, MessageCircle, BarChart3, Globe, Lightbulb, Upload, FileText, Star, Mic } from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";

interface Course { title: string; category: string; duration: string; level: string; icon: LucideIcon; color: string; }

const courses: Course[] = [
  { title: "Optimiser son CV pour le marché marocain", category: "Carrière", duration: "15 min", level: "Débutant", icon: FileText, color: "#ef4444" },
  { title: "Les soft skills les plus recherchées", category: "Soft Skills", duration: "20 min", level: "Intermédiaire", icon: MessageCircle, color: "#3b82f6" },
  { title: "Réussir son entretien d'embauche", category: "Entretien", duration: "25 min", level: "Débutant", icon: Lightbulb, color: "#f59e0b" },
  { title: "Introduction au développement web", category: "Tech", duration: "30 min", level: "Débutant", icon: Code, color: "#10b981" },
  { title: "Communication professionnelle", category: "Langues", duration: "20 min", level: "Intermédiaire", icon: Globe, color: "#a855f7" },
  { title: "Analyse de données avec Excel", category: "Tech", duration: "35 min", level: "Intermédiaire", icon: BarChart3, color: "#06b6d4" },
  { title: "Leadership et gestion d'équipe", category: "Management", duration: "25 min", level: "Avancé", icon: Star, color: "#f97316" },
  { title: "Négociation salariale", category: "Carrière", duration: "15 min", level: "Intermédiaire", icon: BookOpen, color: "#ec4899" },
];

export default function FormationPage() {
  const { isCandidat } = useAuth();
  const statsQuery = useCandidatStats();
  const theme = useDashboardTheme();
  const isLight = theme === "light";

  if (!isCandidat) {
    return <EmptyState icon={<GraduationCap className="w-12 h-12" />} title="Espace candidat uniquement" description="Cette section est réservée aux candidats." />;
  }

  const hasProfile = statsQuery.data?.candidateId !== null && statsQuery.data?.candidateId !== undefined;

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className={`relative mb-8 pb-8 ${isLight ? "border-b border-black/10" : "border-b border-white/[0.04]"}`}>
        <div className="absolute top-[-80px] left-[-100px] w-[350px] h-[350px] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.08),transparent_60%)] blur-3xl pointer-events-none" />
        <div className="relative">
          <h1 className={`text-[28px] sm:text-[36px] font-bold tracking-[-0.04em] font-heading ${isLight ? "text-black" : "text-white"}`}>Formations recommandées</h1>
          <p className={`text-[14px] mt-2 font-light ${isLight ? "text-black/60" : "text-white/45"}`}>Des modules courts et ciblés pour booster votre profil et combler vos lacunes.</p>
        </div>
      </div>

      {statsQuery.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}</div>
      ) : !hasProfile ? (
        <EmptyState icon={<FileText className="w-12 h-12" />} title="Profil requis" description="Uploadez votre CV pour que l'IA vous recommande des formations personnalisées."
          action={<Link href="/app/analyse-cv" className="btn-primary gap-2 mt-2"><Upload size={14} /> Analyser mon CV</Link>} />
      ) : (
        <>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-5 rounded-full bg-amber-500" />
            <h2 className={`text-[13px] uppercase tracking-[2px] font-semibold ${isLight ? "text-black" : "text-white/50"}`}>Modules disponibles</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {courses.map((course, i) => {
              const Icon = course.icon;
              return (
                <div
                  key={i}
                  className={`group rounded-xl p-5 transition-all duration-300 cursor-pointer ${
                    isLight
                      ? "card-luxury-light hover:border-tap-red/70"
                      : "bg-zinc-900/50 border border-white/[0.06] hover:border-white/[0.12]"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center border shrink-0 transition-transform group-hover:scale-110"
                      style={{ background: `${course.color}0D`, borderColor: `${course.color}20` }}>
                      <Icon size={18} style={{ color: course.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-[14px] font-semibold mb-1.5 group-hover:text-tap-red transition-colors ${isLight ? "text-black" : "text-white"}`}>{course.title}</h3>
                      <div className={`flex flex-wrap items-center gap-2 text-[11px] ${isLight ? "text-black/60" : "text-white/40"}`}>
                        <span className={`px-2 py-0.5 rounded-full ${isLight ? "bg-white border border-tap-red/40 text-black/80" : "bg-white/[0.05] border border-white/[0.08]"}`}>{course.category}</span>
                        <span className="flex items-center gap-1"><Clock size={10} />{course.duration}</span>
                        <span>{course.level}</span>
                      </div>
                    </div>
                    <ArrowRight size={14} className={`mt-1 transition-all shrink-0 ${isLight ? "text-black/0 group-hover:text-black/40" : "text-white/0 group-hover:text-white/40"}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
