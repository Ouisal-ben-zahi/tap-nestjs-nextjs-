"use client";

import Link from "next/link";
import { Brain, BarChart3, GraduationCap, Eye, ArrowRight, Building2, Users, CheckCircle2 } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const features = [
  {
    icon: Brain,
    label: "Analyse IA",
    desc: "Chaque CV est scanné et évalué par notre moteur d'intelligence artificielle en moins de 30 secondes.",
    href: "/analyse-cv",
    gradient: "from-tap-red/20 via-tap-red/5 to-transparent",
    stat: "<30s",
    statLabel: "d'analyse",
  },
  {
    icon: BarChart3,
    label: "Score d'employabilité",
    desc: "Un score objectif de 0 à 100 basé sur les compétences réelles, pas les diplômes.",
    href: "/score-employabilite",
    gradient: "from-tap-red/15 via-tap-red/5 to-transparent",
    stat: "0-100",
    statLabel: "score",
  },
  {
    icon: GraduationCap,
    label: "Micro-learning",
    desc: "Des formations courtes et ciblées pour combler les lacunes identifiées par l'IA.",
    href: "/micro-learning",
    gradient: "from-tap-red/12 via-tap-red/4 to-transparent",
    stat: "37+",
    statLabel: "modules",
  },
  {
    icon: Eye,
    label: "Matching intelligent",
    desc: "Les profils validés sont connectés aux recruteurs qui embauchent, en temps réel.",
    href: "/matching-intelligent",
    gradient: "from-tap-red/10 via-tap-red/3 to-transparent",
    stat: "87%",
    statLabel: "précision",
  },
];

export default function PresentationTap() {
  const containerRef = useScrollReveal();

  return (
    <section className="relative py-16 sm:py-32 bg-tap-dark overflow-hidden" ref={containerRef}>
      <div className="absolute top-[-200px] left-[-200px] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.03),transparent_60%)] blur-3xl floating-orb" style={{ animationDuration: "10s" }} />
      <div className="absolute bottom-[-100px] right-[-150px] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.025),transparent_60%)] blur-3xl" />

      <div className="max-w-[1300px] w-[88%] mx-auto relative z-10">
        <div className="reveal text-center mb-10 sm:mb-16">
          <span className="inline-flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] uppercase tracking-[2px] sm:tracking-[3px] text-tap-red font-semibold mb-4 sm:mb-5">
            <span className="reveal-scale-x w-6 h-[1px] bg-tap-red origin-right" />
            La solution
            <span className="reveal-scale-x w-6 h-[1px] bg-tap-red origin-left" />
          </span>
          <h2 className="font-heading text-[26px] sm:text-[32px] md:text-[44px] lg:text-[56px] font-extralight text-white tracking-[-0.03em] leading-[1.08] mb-4 sm:mb-5">
            Pourquoi <span className="font-bold">TAP</span> ?
          </h2>
          <p className="text-[15px] text-white/40 max-w-[420px] mx-auto leading-[1.7] font-light">
            Le recrutement classique repose sur des CV. TAP repose sur des talents révélés.
          </p>
        </div>

        {/* Feature cards */}
        <div className="reveal-stagger grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-12 sm:mb-20">
          {features.map((f, i) => (
            <div key={i} className="reveal-item group relative rounded-2xl overflow-hidden bg-[#0A0A0A] border border-white/[0.06] hover:border-tap-red/15 transition-all duration-500 cursor-default">
              <div className={`absolute top-0 left-0 right-0 h-[120px] bg-gradient-to-b ${f.gradient} pointer-events-none`} />
              <div className="relative p-5 sm:p-7 lg:p-8">
                <div className="flex items-start justify-between mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-tap-red/[0.08] border border-tap-red/10 flex items-center justify-center group-hover:bg-tap-red/15 group-hover:border-tap-red/20 transition-all duration-500">
                    <f.icon size={24} className="text-tap-red" strokeWidth={1.5} />
                  </div>
                  <div className="text-right">
                    <p className="text-[22px] sm:text-[26px] font-bold text-white/10 font-heading leading-none group-hover:text-white/15 transition-colors duration-500">{f.stat}</p>
                    <p className="text-[9px] text-white/20 uppercase tracking-[1.5px] mt-0.5">{f.statLabel}</p>
                  </div>
                </div>
                <h3 className="text-[17px] sm:text-[19px] font-bold text-white tracking-[-0.01em] mb-2">{f.label}</h3>
                <p className="text-[13px] sm:text-[14px] text-white/40 leading-[1.7] font-light mb-5">{f.desc}</p>
                <Link href={f.href} className="inline-flex items-center gap-2 text-[12px] font-semibold text-tap-red/70 hover:text-tap-red transition-colors duration-300 group/link">
                  En savoir plus
                  <ArrowRight size={12} className="transition-transform duration-300 group-hover/link:translate-x-1" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Audience cards */}
        <div className="reveal-stagger grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* Entreprises */}
          <div className="reveal-item group rounded-2xl overflow-hidden bg-[#0A0A0A] border border-white/[0.06] hover:border-tap-red/15 transition-all duration-500">
            <div className="px-5 sm:px-7 py-4 sm:py-5 bg-gradient-to-r from-tap-red to-tap-red/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
                  <Building2 size={17} className="text-white" strokeWidth={1.5} />
                </div>
                <h3 className="text-[12px] font-bold uppercase tracking-[2px] text-white">Entreprises</h3>
              </div>
              <ArrowRight size={14} className="text-white/40 group-hover:text-white/80 group-hover:translate-x-1 transition-all duration-300" />
            </div>
            <div className="p-5 sm:p-7 flex flex-col gap-3.5">
              {["Candidats préparés, opérationnels dès le jour 1.", "Sélection sécurisée par les données et l'IA.", "Moins de risque. Plus de rétention."].map((item, j) => (
                <div key={j} className="flex items-start gap-3">
                  <CheckCircle2 size={14} className="text-tap-red/50 mt-[3px] shrink-0" strokeWidth={1.5} />
                  <p className="text-[13px] sm:text-[14px] text-white/45 leading-[1.7] font-light">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Candidats */}
          <div className="reveal-item group rounded-2xl overflow-hidden bg-[#0A0A0A] border border-white/[0.06] hover:border-white/10 transition-all duration-500">
            <div className="px-5 sm:px-7 py-4 sm:py-5 bg-gradient-to-r from-white/90 to-white/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-black/10 flex items-center justify-center">
                  <Users size={17} className="text-black/70" strokeWidth={1.5} />
                </div>
                <h3 className="text-[12px] font-bold uppercase tracking-[2px] text-black">Candidats</h3>
              </div>
              <ArrowRight size={14} className="text-black/30 group-hover:text-black/60 group-hover:translate-x-1 transition-all duration-300" />
            </div>
            <div className="p-5 sm:p-7 flex flex-col gap-3.5">
              {["Vos forces révélées, pas juste votre CV.", "Formation ciblée pour renforcer vos atouts.", "Visibilité directe auprès des recruteurs."].map((item, j) => (
                <div key={j} className="flex items-start gap-3">
                  <CheckCircle2 size={14} className="text-white/25 mt-[3px] shrink-0" strokeWidth={1.5} />
                  <p className="text-[13px] sm:text-[14px] text-white/45 leading-[1.7] font-light">{item}</p>
                </div>
              ))}
              <div className="mt-1 pt-4 border-t border-white/[0.06]">
                <p className="text-[12px] font-semibold text-tap-red">100 % gratuit pour les candidats.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
