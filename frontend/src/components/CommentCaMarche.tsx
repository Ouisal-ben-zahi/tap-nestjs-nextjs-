"use client";

import { UserPlus, ScanSearch, Rocket, Building2, Target } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import FaqHome from "@/components/FaqHome";
import { ProcessDiamond, type ProcessStep } from "@/components/ProcessDiamond";

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
          <div className="w-full overflow-visible px-0 py-4 sm:py-5">
            {/* Desktop — entrée en cascade au scroll */}
            <div className="reveal-stagger reveal-stagger-processus hidden lg:grid w-full grid-cols-[repeat(5,minmax(0,1fr))] items-start gap-x-0 py-2 px-0">
              {steps.map((step, i) => {
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

            {/* Tablette */}
            <div className="hidden md:flex lg:hidden justify-center w-full overflow-x-auto overflow-y-visible py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="reveal-stagger reveal-stagger-processus flex min-h-[240px] w-max max-w-full items-start justify-center gap-x-0 px-0">
                {steps.map((step, i) => {
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

            {/* Mobile */}
            <div className="reveal-stagger reveal-stagger-processus md:hidden flex flex-col items-center gap-3 py-3">
              {steps.map((step, i) => (
                <div
                  key={step.label}
                  className={`reveal-item w-full flex justify-center ${
                    i % 2 === 1 ? "pl-4" : "pr-4"
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
      </div>
    </section>
  );
}
