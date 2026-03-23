"use client";

import { ArrowRight } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

/** Même CTA que sur la page d’accueil (après FAQ), affiché sur toutes les pages marketing. */
export default function MarketingCtaBanner() {
  const containerRef = useScrollReveal();

  return (
    <section className="relative py-10 sm:py-16 bg-black overflow-x-clip" ref={containerRef}>
      <div className="w-[90%] max-w-[1300px] mx-auto relative z-10">
        <div className="reveal group cta-animated-border relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/[0.06] bg-[#0A0A0A]">
          <div className="absolute inset-0 bg-[url('/images/bgsections.jpg')] bg-no-repeat bg-center bg-[length:120%_auto] opacity-30 pointer-events-none" />
          <div className="absolute inset-0 bg-black/55 pointer-events-none" />

          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[420px] h-[200px] bg-[radial-gradient(circle,rgba(202,27,40,0.35),transparent_60%)] blur-2xl mix-blend-screen" />
          </div>

          <div className="absolute top-0 left-0 right-0 h-[140px] bg-gradient-to-b from-tap-red/[0.18] to-transparent pointer-events-none" />

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
              <a
                href="https://demo.tap-hr.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary group"
              >
                Demander une démo
                <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
              </a>
              <a
                href="mailto:tap@entrepreneursmorocco.com?subject=TAP%20-%20Demande%20de%20d%C3%A9mo"
                className="btn-secondary"
              >
                Nous contacter
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
