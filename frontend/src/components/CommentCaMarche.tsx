"use client";

import {
  UserPlus,
  ScanSearch,
  Rocket,
  Building2,
  Target,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import FaqHome from "@/components/FaqHome";

type ProcessStep = {
  icon: LucideIcon;
  title: string;
  label: string;
  desc: string;
};

/** Contenu aligné sur la page : 90% de largeur, plafonné à 1300px (voir wrapper principal ci-dessous). */
const SECTION_MAX = "w-[90%] max-w-[1300px] mx-auto";

const steps: ProcessStep[] = [
  {
    icon: UserPlus,
    title: "Inscription",
    label: "INSCRIPTION",
    desc: "Créez votre profil et uploadez votre CV en quelques minutes.",
  },
  {
    icon: ScanSearch,
    title: "Analyse IA",
    label: "ANALYSE IA",
    desc: "L’IA identifie vos forces, compétences et axes d’amélioration.",
  },
  {
    icon: Rocket,
    title: "Formation",
    label: "FORMATION",
    desc: "Micro-learning ciblé pour monter en compétence rapidement.",
  },
  {
    icon: Building2,
    title: "Matching",
    label: "MATCHING",
    desc: "Votre profil rejoint les talents visibles par les recruteurs.",
  },
  {
    icon: Target,
    title: "Objectif",
    label: "OBJECTIF",
    desc: "Décisions plus sûres : moins de risque, plus de rétention.",
  },
];

function ProcessDiamond({
  step,
  index,
  size = "md",
}: {
  step: ProcessStep;
  index: number;
  /** fill = occupe la cellule (grille 90% / 5) · sm/md = tailles fixes */
  size?: "md" | "sm" | "fill";
}) {
  const Icon = step.icon;
  /* fill : limité à la cellule (grille 5 col.) pour ne pas casser la largeur du conteneur */
  const box =
    size === "fill"
      ? "mx-auto aspect-square w-full min-w-0 max-w-full"
      : size === "sm"
        ? "w-[min(188px,82vw)] h-[min(188px,82vw)] lg:w-[176px] lg:h-[176px]"
        : "w-[min(240px,88vw)] h-[min(240px,88vw)] sm:w-[240px] sm:h-[240px]";
  const iconSize = size === "fill" ? 30 : size === "sm" ? 26 : 30;
  const numClass =
    size === "fill"
      ? "text-[46px] sm:text-[50px] lg:text-[54px]"
      : "text-[46px] sm:text-[50px]";
  const titleClass =
    size === "fill" ? "text-[12px] sm:text-[13px] lg:text-[14px]" : "text-[13px] sm:text-[14px]";
  const descClass = size === "fill" ? "text-[10px] sm:text-[11px] lg:text-[12px]" : "text-[10px] sm:text-[11px] lg:text-[12px]";
  return (
    <div
      className="group relative flex flex-col items-center justify-center"
      role="article"
      aria-label={`Étape ${index + 1} — ${step.title}`}
    >
      <div className={`relative z-[1] ${box} rounded-[1.15rem] processus-card-premium`}>
        <div className="processus-card-inner absolute inset-0 -rotate-45 flex flex-col items-center justify-center px-3.5 py-3 sm:px-5 sm:py-4">
          <div className="mb-2.5 sm:mb-3 flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04]">
            <Icon className="text-tap-red" strokeWidth={1.2} size={iconSize} />
          </div>
          <div className="flex w-full max-w-[94%] items-start gap-2">
            <span
              className={`${numClass} shrink-0 tabular-nums font-semibold leading-[0.82] text-tap-red`}
            >
              {index + 1}
            </span>
            <div className="min-w-0 flex-1 pt-0.5 text-left">
              <h3 className={`${titleClass} font-bold uppercase tracking-[0.18em] text-white leading-tight`}>
                {step.label}
              </h3>
              <p className={`${descClass} mt-1.5 leading-[1.55] font-light text-white/[0.48]`}>{step.desc}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CommentCaMarche() {
  const containerRef = useScrollReveal();

  return (
    <section className="relative py-10 sm:py-16 bg-black overflow-x-clip" ref={containerRef}>
      <div className="absolute bottom-0 left-[30%] w-[500px] h-[350px] rounded-full bg-[radial-gradient(ellipse,rgba(202,27,40,0.03),transparent_60%)] blur-3xl floating-orb" style={{ animationDuration: "9s" }} />
      <div className="absolute top-[10%] right-[-100px] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.025),transparent_60%)] blur-3xl" />

      <div className={`${SECTION_MAX} relative z-10`}>
        <div className="reveal text-center mb-12 sm:mb-20 relative">
          <span className="mb-4 sm:mb-5 inline-flex items-center gap-2.5 sm:gap-3 text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.28em] text-tap-red">
            <span className="h-px w-7 bg-gradient-to-r from-transparent to-tap-red/90 sm:w-10" />
            Le processus
            <span className="h-px w-7 bg-gradient-to-l from-transparent to-tap-red/90 sm:w-10" />
          </span>
          <h2 className="font-heading text-[26px] sm:text-[32px] md:text-[44px] lg:text-[56px] font-extralight tracking-[-0.03em] leading-[1.06] text-white">
            Comment ça <span className="font-bold">marche</span>
          </h2>
          <p className="mx-auto mt-4 max-w-[34rem] text-[13px] sm:text-[14px] font-light leading-[1.65] text-white/38">
            Un parcours clair en cinq étapes — de l’inscription aux décisions les plus justes.
          </p>
          <div className="mx-auto mt-6 h-px w-20 bg-gradient-to-r from-transparent via-white/15 to-transparent sm:mt-7 sm:w-28" />
        </div>

        {/* Processus — 90% écran max 1300px, 5 colonnes alignées, cartes plus grandes */}
        <div className="relative mb-14 sm:mb-24">
          <div className="w-full overflow-visible px-0 py-6 sm:py-8">
            {/* Desktop — entrée en cascade au scroll */}
            <div className="reveal-stagger reveal-stagger-processus hidden lg:grid w-full grid-cols-[repeat(5,minmax(0,1fr))] items-start gap-x-0 py-4 px-0">
              {steps.map((step, i) => {
                const isLow = i % 2 === 1;
                return (
                  <div
                    key={step.label}
                    className={`reveal-item flex min-w-0 max-w-full flex-col items-center justify-center ${
                      isLow ? "mt-[64px] xl:mt-[72px]" : ""
                    }`}
                  >
                    <ProcessDiamond step={step} index={i} size="fill" />
                  </div>
                );
              })}
            </div>

            {/* Tablette */}
            <div className="hidden md:flex lg:hidden justify-center w-full overflow-x-auto overflow-y-visible py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="reveal-stagger reveal-stagger-processus flex min-h-[280px] w-max max-w-full items-start justify-center gap-x-0 px-0">
                {steps.map((step, i) => {
                  const isLow = i % 2 === 1;
                  return (
                    <div
                      key={step.label}
                      className={`reveal-item flex w-[min(46vw,11rem)] min-w-0 max-w-[11rem] shrink-0 flex-col items-center ${
                        isLow ? "mt-[48px]" : "mt-0"
                      }`}
                    >
                      <ProcessDiamond step={step} index={i} size="fill" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile */}
            <div className="reveal-stagger reveal-stagger-processus md:hidden flex flex-col items-center gap-5 py-4">
              {steps.map((step, i) => (
                <div
                  key={step.label}
                  className={`reveal-item w-full flex justify-center ${
                    i % 2 === 1 ? "pl-6" : "pr-6"
                  }`}
                >
                  <ProcessDiamond step={step} index={i} size="md" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Questions fréquentes */}
        <FaqHome />

        {/* CTA Banner */}
        <div className="reveal group cta-animated-border relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/[0.06] bg-[#0A0A0A]">
          {/* Superposition fond image (premium) */}
          <div className="absolute inset-0 bg-[url('/images/bgsections.jpg')] bg-no-repeat bg-center bg-[length:120%_auto] opacity-30 pointer-events-none" />
          <div className="absolute inset-0 bg-black/55 pointer-events-none" />

          {/* Glow accent */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[420px] h-[200px] bg-[radial-gradient(circle,rgba(202,27,40,0.35),transparent_60%)] blur-2xl mix-blend-screen" />
          </div>

          {/* Accent gradient (comme les cartes “Pourquoi TAP”) */}
          <div className="absolute top-0 left-0 right-0 h-[140px] bg-gradient-to-b from-tap-red/[0.18] to-transparent pointer-events-none" />

          {/* Orbes flottants (animation) */}
          <div
            className="absolute -top-8 -left-8 w-[180px] h-[180px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.12),transparent_60%)] blur-2xl floating-orb pointer-events-none"
            style={{ animationDuration: "9s" }}
          />
          <div className="absolute bottom-[-110px] right-[-130px] w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.08),transparent_60%)] blur-3xl pointer-events-none" />

          <div className="relative z-10 p-7 sm:p-12 lg:p-16 text-center">
            <h3 className="font-heading text-[22px] sm:text-[26px] md:text-[36px] lg:text-[44px] font-extralight text-white mb-3 sm:mb-4 tracking-[-0.03em] leading-[1.1]">
              Accélérez votre <span className="font-bold">recrutement</span>
            </h3>
            <p className="text-[14px] text-white/40 mb-8 font-light max-w-[480px] mx-auto leading-[1.7]">
              TAP analyse les CV, évalue les talents et aligne les besoins en temps réel pour des décisions claires.
            </p>
            <div className="flex gap-3 flex-wrap justify-center">
              <a href="https://demo.tap-hr.com/" target="_blank" rel="noopener noreferrer" className="btn-primary group">
                Demander une démo
                <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
              </a>
              <a href="mailto:tap@entrepreneursmorocco.com?subject=TAP%20-%20Demande%20de%20d%C3%A9mo" className="btn-secondary">
                Nous contacter
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
