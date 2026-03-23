"use client";

import { Target, Lightbulb, BarChart3, BookOpen, FileCheck, Users, Building2, ArrowRight, CheckCircle2, TrendingUp } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { ProcessDiamond, type ProcessStep } from "@/components/ProcessDiamond";

const pillarSteps: ProcessStep[] = [
  {
    icon: BarChart3,
    title: "Diagnostic précis",
    label: "DIAGNOSTIC",
    desc: "Analyse complète de l'employabilité via un scoring multi-critères piloté par l'IA.",
  },
  {
    icon: BookOpen,
    title: "Micro-learning",
    label: "MICRO-LEARNING",
    desc: "Formations ciblées sur les écarts terrain pour combler les lacunes identifiées.",
  },
  {
    icon: FileCheck,
    title: "Portfolio vivant",
    label: "PORTFOLIO",
    desc: "Un portfolio de compétences dynamique qui évolue avec chaque formation complétée.",
  },
  {
    icon: TrendingUp,
    title: "Score transparent",
    label: "SCORE",
    desc: "Notation objective et transparente pour candidats et recruteurs.",
  },
];

export default function AProposContent() {
  const containerRef = useScrollReveal();
  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[50vh] sm:min-h-[70vh] flex items-end overflow-hidden bg-black">
        <div className="absolute inset-0 z-0">
          <img src="/images/bgpages.webp" alt="Arrière-plan TAP" className="absolute inset-0 w-full h-full object-cover scale-105" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/60" />
        </div>

        <div className="relative z-10 w-[88%] max-w-[1300px] mx-auto pb-14 sm:pb-20 pt-[140px] sm:pt-[180px]">
          <h1
            className="hero-fade-in font-heading text-[22px] sm:text-[38px] md:text-[52px] lg:text-[66px] font-extralight text-white tracking-[-0.03em] mb-4 sm:mb-5 leading-[1.05]"
            style={{ animationDelay: "0.3s" }}
          >
            À propos de <span className="font-bold text-glow text-tap-red">TAP</span>
          </h1>
          <p
            className="hero-fade-in text-[15px] md:text-[17px] text-white/45 max-w-[460px] leading-[1.7] font-light"
            style={{ animationDelay: "0.5s" }}
          >
            Élever chaque talent au niveau d&apos;exigence des meilleures entreprises.
          </p>

          <div
            className="hero-fade-in flex items-center gap-2 sm:gap-4 mt-10 sm:mt-14"
            style={{ animationDelay: "0.7s" }}
          >
            {[
              { num: "4", label: "Piliers" },
              { num: "IA", label: "Powered" },
              { num: "100%", label: "Maroc" },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-2 sm:py-3 rounded-xl glass">
                <div>
                  <div className="text-[16px] sm:text-[22px] font-bold text-white tracking-[-0.02em]">{stat.num}</div>
                  <div className="text-[7px] sm:text-[9px] uppercase tracking-[1px] sm:tracking-[2px] text-white/40 font-medium">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[200px] bg-gradient-to-t from-black to-transparent z-[5]" />
      </section>

      <div ref={containerRef}>
      {/* Mission & Approche — Premium cards */}
      <section className="py-12 sm:py-20 bg-black relative overflow-hidden">
        <div className="absolute bottom-0 right-[-100px] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.03),transparent_60%)] blur-3xl" />
        <div className="absolute top-[20%] left-[-150px] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.025),transparent_60%)] blur-3xl" />
        <div className="max-w-[1300px] w-[88%] mx-auto relative z-10">
          <div className="reveal text-center mb-10 sm:mb-16">
            <span className="inline-flex items-center gap-3 text-[10px] uppercase tracking-[3px] text-tap-red font-semibold mb-5">
              <span className="w-6 h-[1px] bg-tap-red" />
              Notre vision
              <span className="w-6 h-[1px] bg-tap-red" />
            </span>
            <h2 className="font-heading text-[26px] sm:text-[32px] md:text-[44px] lg:text-[52px] font-extralight text-white tracking-[-0.03em] leading-[1.08] max-w-[650px] mx-auto">
              Réconcilier le <span className="font-bold">potentiel</span> avec le marché.
            </h2>
          </div>

          <div className="reveal-stagger grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {[
              {
                icon: Target,
                title: "Notre mission",
                desc: "Installer une norme d'employabilité pilotée par la donnée. TAP orchestre analyse de CV, scoring et micro-learning pour rendre chaque profil opérationnel.",
                gradient: "from-tap-red/20 via-tap-red/5 to-transparent",
              },
              {
                icon: Lightbulb,
                title: "Notre approche",
                desc: "IA, data science et accompagnement humain réunis dans un parcours d'employabilité complet, mesurable et transparent pour tous les acteurs.",
                gradient: "from-tap-red/15 via-tap-red/5 to-transparent",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="reveal-item group relative card-animated-border rounded-2xl overflow-hidden bg-[#0A0A0A] border border-white/[0.06] hover:border-tap-red/15 transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)] transform-gpu hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_18px_60px_rgba(0,0,0,0.55),0_0_40px_rgba(202,27,40,0.10)]"
              >
                <div className={`absolute top-0 left-0 right-0 h-[120px] bg-gradient-to-b ${item.gradient} pointer-events-none`} />
                {/* Background premium au hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_0%,rgba(202,27,40,0.28),transparent_55%)] blur-[2px] mix-blend-screen" />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(202,27,40,0.10),transparent_55%)]" />
                </div>
                <div className="relative p-6 sm:p-8">
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-tap-red/[0.08] border border-tap-red/10 flex items-center justify-center group-hover:bg-tap-red/15 group-hover:border-tap-red/20 transition-all duration-500">
                      <item.icon size={24} className="text-tap-red" strokeWidth={1.5} />
                    </div>
                  </div>
                  <h3 className="text-[17px] sm:text-[19px] font-bold text-white tracking-[-0.01em] mb-2.5">{item.title}</h3>
                  <p className="text-[13px] sm:text-[14px] text-white/40 leading-[1.7] font-light">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4 Piliers — même présentation que « Le processus » (cartes losange) */}
      <section className="py-12 sm:py-20 bg-black relative overflow-hidden">
        <div className="absolute top-[20%] right-[-150px] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.03),transparent_60%)] blur-3xl" />
        <div className="max-w-[1300px] w-[88%] mx-auto relative z-10">
          <div className="reveal text-center mb-12 sm:mb-20">
            <span className="inline-flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] uppercase tracking-[2px] sm:tracking-[3px] text-tap-red font-semibold mb-4 sm:mb-5">
              <span className="w-6 h-[1px] bg-tap-red" />
              Piliers
              <span className="w-6 h-[1px] bg-tap-red" />
            </span>
            <h2 className="font-heading text-[26px] sm:text-[32px] md:text-[44px] lg:text-[52px] font-extralight text-white tracking-[-0.03em] leading-[1.08]">
              Les fondations de <span className="font-bold">TAP</span>
            </h2>
          </div>

          <div className="relative">
            <div className="w-full overflow-visible px-0 py-2 sm:py-3">
              <div className="reveal-stagger reveal-stagger-processus hidden lg:grid w-full grid-cols-[repeat(4,minmax(0,1fr))] items-start gap-x-0 py-2 px-0">
                {pillarSteps.map((step, i) => {
                  const isLow = i % 2 === 1;
                  return (
                    <div
                      key={step.label}
                      className={`reveal-item flex min-w-0 max-w-full flex-col items-center justify-center ${
                        isLow ? "mt-[40px] xl:mt-[48px]" : ""
                      }`}
                    >
                      <ProcessDiamond step={step} index={i} size="fill" />
                    </div>
                  );
                })}
              </div>

              <div className="hidden md:flex lg:hidden justify-center w-full overflow-x-auto overflow-y-visible py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="reveal-stagger reveal-stagger-processus flex min-h-[240px] w-max max-w-full items-start justify-center gap-x-0 px-0">
                  {pillarSteps.map((step, i) => {
                    const isLow = i % 2 === 1;
                    return (
                      <div
                        key={step.label}
                        className={`reveal-item flex w-[min(44vw,11rem)] min-w-0 max-w-[11rem] shrink-0 flex-col items-center ${
                          isLow ? "mt-[32px]" : "mt-0"
                        }`}
                      >
                        <ProcessDiamond step={step} index={i} size="fill" />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="reveal-stagger reveal-stagger-processus md:hidden flex flex-col items-center gap-3 py-3">
                {pillarSteps.map((step, i) => (
                  <div
                    key={step.label}
                    className={`reveal-item w-full flex justify-center ${i % 2 === 1 ? "pl-4" : "pr-4"}`}
                  >
                    <ProcessDiamond step={step} index={i} size="md" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pour qui — Premium audience cards */}
      <section className="py-12 sm:py-20 bg-black relative overflow-hidden">
        <div className="absolute bottom-[10%] left-[-100px] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.025),transparent_60%)] blur-3xl" />
        <div className="max-w-[1300px] w-[88%] mx-auto relative z-10">
          <div className="reveal text-center mb-10 sm:mb-16">
            <span className="inline-flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] uppercase tracking-[2px] sm:tracking-[3px] text-tap-red font-semibold mb-4 sm:mb-5">
              <span className="w-6 h-[1px] bg-tap-red" />
              Audiences
              <span className="w-6 h-[1px] bg-tap-red" />
            </span>
            <h2 className="font-heading text-[26px] sm:text-[32px] md:text-[44px] lg:text-[52px] font-extralight text-white tracking-[-0.03em] leading-[1.08]">
              Pour <span className="font-bold">qui</span> ?
            </h2>
          </div>

          <div className="reveal-stagger grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Entreprises */}
            <div className="reveal-item group relative card-animated-border rounded-2xl overflow-hidden bg-[#0A0A0A] border border-white/[0.06] hover:border-tap-red/15 transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)] transform-gpu hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_18px_60px_rgba(0,0,0,0.55),0_0_40px_rgba(202,27,40,0.10)]">
              {/* Background premium au hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_0%,rgba(202,27,40,0.28),transparent_55%)] blur-[2px] mix-blend-screen" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(202,27,40,0.10),transparent_55%)]" />
              </div>
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
                {[
                  "Recrutement précis, guidé par les données et l'IA.",
                  "Candidats acculturés, opérationnels dès le jour 1.",
                  "Meilleure rétention grâce à l'accompagnement amont.",
                ].map((item, j) => (
                  <div key={j} className="flex items-start gap-3">
                    <CheckCircle2 size={14} className="text-tap-red/50 mt-[3px] shrink-0" strokeWidth={1.5} />
                    <p className="text-[13px] sm:text-[14px] text-white/45 leading-[1.7] font-light">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Talents */}
            <div className="reveal-item group relative card-animated-border-white rounded-2xl overflow-hidden bg-[#0A0A0A] border border-white/[0.06] hover:border-white/10 transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)] transform-gpu hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_18px_60px_rgba(0,0,0,0.55),0_0_40px_rgba(202,27,40,0.10)]">
              {/* Background premium au hover (blanc) */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_0%,rgba(255,255,255,0.25),transparent_55%)] blur-[2px] mix-blend-screen" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.10),transparent_55%)]" />
              </div>
              <div className="px-5 sm:px-7 py-4 sm:py-5 bg-gradient-to-r from-white/90 to-white/70 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-black/10 flex items-center justify-center">
                    <Users size={17} className="text-black/70" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-[12px] font-bold uppercase tracking-[2px] text-black">Talents</h3>
                </div>
                <ArrowRight size={14} className="text-black/30 group-hover:text-black/60 group-hover:translate-x-1 transition-all duration-300" />
              </div>
              <div className="p-5 sm:p-7 flex flex-col gap-3.5">
                {[
                  "Jeunes diplômés à haut potentiel.",
                  "Profils en reconversion ambitieuse.",
                  "Talents tech et métiers d'avenir.",
                ].map((item, j) => (
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
      </div>
    </div>
  );
}
