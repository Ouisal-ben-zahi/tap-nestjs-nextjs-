"use client";

import { UserPlus, ScanSearch, Rocket, Building2, ArrowRight } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const steps = [
  { icon: UserPlus, title: "Inscription", desc: "Créez votre profil candidat en quelques minutes et uploadez votre CV." },
  { icon: ScanSearch, title: "Analyse IA", desc: "Notre IA identifie vos forces, compétences et axes d'amélioration." },
  { icon: Rocket, title: "Formation", desc: "Micro-learning ciblé et personnalisé pour monter en compétence rapidement." },
  { icon: Building2, title: "Matching", desc: "Votre profil validé rencontre les recruteurs qui embauchent au Maroc." },
];

export default function CommentCaMarche() {
  const containerRef = useScrollReveal();

  return (
    <section className="relative py-10 sm:py-16 bg-black overflow-x-clip" ref={containerRef}>
      <div className="absolute bottom-0 left-[30%] w-[500px] h-[350px] rounded-full bg-[radial-gradient(ellipse,rgba(202,27,40,0.03),transparent_60%)] blur-3xl floating-orb" style={{ animationDuration: "9s" }} />
      <div className="absolute top-[10%] right-[-100px] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.025),transparent_60%)] blur-3xl" />

      <div className="max-w-[1300px] w-[88%] mx-auto relative z-10">
        <div className="reveal text-center mb-12 sm:mb-20">
          <span className="inline-flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] uppercase tracking-[2px] sm:tracking-[3px] text-tap-red font-semibold mb-4 sm:mb-5">
            <span className="reveal-scale-x w-6 h-[1px] bg-tap-red origin-right" />
            Le processus
            <span className="reveal-scale-x w-6 h-[1px] bg-tap-red origin-left" />
          </span>
          <h2 className="font-heading text-[26px] sm:text-[32px] md:text-[44px] lg:text-[56px] font-extralight text-white tracking-[-0.03em] leading-[1.08]">
            Comment ça <span className="font-bold">marche</span>
          </h2>
        </div>

        {/* Timeline steps */}
        <div className="relative mb-14 sm:mb-24">
          <div className="reveal-stagger grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-5">
            {steps.map((step, i) => (
              <div key={i} className="reveal-item group relative flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-[104px] h-[104px] rounded-full bg-white/[0.02] border border-white/[0.06] flex items-center justify-center group-hover:border-tap-red/20 transition-colors duration-500">
                    <div className="w-[72px] h-[72px] rounded-full bg-tap-red/[0.08] flex items-center justify-center group-hover:bg-tap-red/15 transition-colors duration-500">
                      <step.icon size={28} className="text-tap-red" strokeWidth={1.5} />
                    </div>
                  </div>
                  <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-tap-red/20 border border-tap-red/30 flex items-center justify-center">
                    <span className="text-[11px] font-bold text-tap-red">0{i + 1}</span>
                  </div>
                </div>
                <h3 className="text-[17px] sm:text-[18px] font-bold text-white mb-2.5 tracking-[-0.01em]">{step.title}</h3>
                <p className="text-[13px] text-white/35 leading-[1.7] font-light max-w-[260px]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Banner */}
        <div className="reveal cta-animated-border relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/[0.06] bg-[#0A0A0A] shadow-[0_0_60px_rgba(202,27,40,0.12)] transition-all duration-500 hover:border-tap-red/25">
          {/* Superposition fond image (premium) */}
          <div className="absolute inset-0 bg-[url('/images/bgsections.jpg')] bg-no-repeat bg-center bg-[length:120%_auto] opacity-30 pointer-events-none" />
          <div className="absolute inset-0 bg-black/55 pointer-events-none" />

          {/* Subtle background shift (premium) */}
          <div className="cta-bg-shift" />

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
