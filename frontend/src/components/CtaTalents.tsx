"use client";

import { ArrowRight } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export default function CtaTalents() {
  const containerRef = useScrollReveal();

  return (
    <section ref={containerRef} className="relative py-10 sm:py-16 bg-transparent overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-tap-red/[0.02] to-transparent pointer-events-none" />
      <div className="max-w-[1300px] w-[88%] mx-auto relative z-10">
        <div className="reveal relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/[0.06] bg-[url('/images/bgsections.jpg')] bg-no-repeat bg-center bg-[length:100%_auto]">
          <div className="absolute inset-0 bg-black/15 pointer-events-none" />
          <div className="relative z-10 p-7 sm:p-12 lg:p-16 text-center">
            <h3 className="font-heading text-[22px] sm:text-[26px] md:text-[36px] lg:text-[44px] font-extralight text-white mb-3 sm:mb-4 tracking-[-0.03em] leading-[1.1]">
              Des talents <span className="font-bold">déjà préparés</span>
            </h3>
            <p className="text-[14px] text-white/40 mb-8 font-light max-w-[400px] mx-auto leading-[1.7]">
              Candidats analysés, formés et évalués par l&apos;IA.
            </p>
            <div className="flex gap-3 flex-wrap justify-center">
              <a href="https://demo.tap-hr.com/" target="_blank" rel="noopener noreferrer" className="btn-primary group">
                Accéder aux talents
                <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
              </a>
              <a href="https://demo.tap-hr.com/" target="_blank" rel="noopener noreferrer" className="btn-secondary">
                Créer mon profil
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

