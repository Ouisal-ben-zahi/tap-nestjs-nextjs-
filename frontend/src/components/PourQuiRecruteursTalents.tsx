"use client";

import { ArrowRight, Building2, Users, CheckCircle2 } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export default function PourQuiRecruteursTalents() {
  const containerRef = useScrollReveal();

  return (
    <section className="relative py-10 sm:py-16 bg-black overflow-hidden" ref={containerRef}>
      <div className="max-w-[1300px] w-[88%] mx-auto relative z-10">
      {/* Audience section */}
        <div className="reveal text-center mb-6 sm:mb-10">
        <span className="inline-flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] uppercase tracking-[2px] sm:tracking-[3px] text-tap-red font-semibold mb-4 sm:mb-5">
          <span className="reveal-scale-x w-6 h-[1px] bg-tap-red origin-right" />
          Pour qui ?
          <span className="reveal-scale-x w-6 h-[1px] bg-tap-red origin-left" />
        </span>
        <h2 className="font-heading text-[26px] sm:text-[32px] md:text-[44px] lg:text-[52px] font-extralight text-white tracking-[-0.03em] leading-[1.1] mb-4 sm:mb-5">
          Recruteurs <span className="font-bold">&</span> Talents
        </h2>
        <p className="text-[15px] text-white/40 max-w-[520px] mx-auto leading-[1.7] font-light">
          TAP aligne les besoins des recruteurs et les compétences des talents grâce à une évaluation IA claire et objective.
        </p>
        </div>

      {/* Audience cards */}
        <div className="reveal-stagger grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* Entreprises */}
        <div className="reveal-item group card-animated-border rounded-2xl overflow-hidden bg-[#0A0A0A] border border-white/[0.06] hover:border-tap-red/15 transition-all duration-500">
          {/* Background premium au hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(202,27,40,0.38),transparent_55%)] blur-[2px] mix-blend-screen" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(202,27,40,0.14),transparent_55%)]" />
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
            {["Candidats préparés, opérationnels dès le jour 1.", "Sélection sécurisée par les données et l'IA.", "Moins de risque. Plus de rétention."].map(
              (item, j) => (
                <div key={j} className="flex items-start gap-3">
                  <CheckCircle2 size={14} className="text-tap-red/50 mt-[3px] shrink-0" strokeWidth={1.5} />
                  <p className="text-[13px] sm:text-[14px] text-white/45 leading-[1.7] font-light">{item}</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Candidats */}
        <div className="reveal-item group card-animated-border-white rounded-2xl overflow-hidden bg-[#0A0A0A] border border-white/[0.06] hover:border-white/15 transition-all duration-500">
          {/* Background premium au hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.22),transparent_55%)] blur-[2px] mix-blend-screen" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.10),transparent_55%)]" />
          </div>
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
            {["Vos forces révélées, pas juste votre CV.", "Formation ciblée pour renforcer vos atouts.", "Visibilité directe auprès des recruteurs."].map(
              (item, j) => (
                <div key={j} className="flex items-start gap-3">
                  <CheckCircle2 size={14} className="text-white/25 mt-[3px] shrink-0" strokeWidth={1.5} />
                  <p className="text-[13px] sm:text-[14px] text-white/45 leading-[1.7] font-light">{item}</p>
                </div>
              )
            )}
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

