"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

const AfricaMap = lazy(() => import("@/components/AfricaMap"));

export default function Hero() {
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setTimeout(() => setMapReady(true), 200);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <section className="relative w-full min-h-screen overflow-hidden bg-black flex items-center">
      <div className="absolute inset-0 z-0">
        <img src="/images/bgaccueil.webp" alt="Vue aérienne de Marrakech, Maroc" className="w-full h-full object-cover object-top" />
      </div>

      <div className="absolute inset-0 z-[1] bg-gradient-to-r from-black via-black/75 to-black/20" />
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black via-black/20 to-black/50" />

      <div className="absolute top-[15%] left-[-150px] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.08),transparent_60%)] z-[1] blur-2xl" />
      <div className="absolute bottom-[10%] right-[5%] w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.05),transparent_60%)] z-[1] blur-2xl max-sm:hidden" />
      <div className="absolute right-[5%] top-[30%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.12),transparent_65%)] z-[1] blur-2xl max-lg:hidden" />

      {mapReady && (
        <div
          className="absolute right-[-160px] xl:right-[-120px] 2xl:right-[-60px] top-[50%] -translate-y-[45%] z-[2] pointer-events-none max-lg:hidden scale-[1.05] 2xl:scale-110"
          style={{ opacity: 0.9 }}
        >
          <Suspense fallback={null}>
            <AfricaMap />
          </Suspense>
        </div>
      )}

      <div className="relative z-[3] w-[88%] max-w-[1300px] mx-auto pt-[140px] sm:pt-[180px] pb-10 sm:pb-16">
        <div className="hero-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="inline-flex items-center gap-2 sm:gap-2.5 px-4 sm:px-5 py-2 sm:py-2.5 mb-8 sm:mb-10 glass rounded-full">
            <Sparkles size={12} className="text-tap-red shrink-0" />
            <span className="text-[9px] sm:text-[10px] uppercase tracking-[2px] sm:tracking-[2.5px] text-white/60 font-medium whitespace-nowrap">
              Plateforme IA — Maroc
            </span>
          </div>
        </div>

        <h1 className="max-w-[900px]">
          <div className="hero-fade-in" style={{ animationDelay: "0.2s" }}>
            <span className="block font-heading text-[20px] sm:text-[38px] md:text-[52px] lg:text-[72px] xl:text-[82px] leading-[1.1] sm:leading-[1.05] tracking-[-0.03em] mb-2">
              <span className="font-extralight text-white/80">Des profils. Des </span>
              <span className="relative font-bold text-white">
                talents
                <span className="hero-underline absolute -bottom-1 left-0 w-full h-[2px] sm:h-[3px] bg-gradient-to-r from-tap-red to-tap-red/20 origin-left rounded-full" />
              </span>
              <span className="font-extralight text-white/80">.</span>
            </span>
          </div>

          <div className="hero-fade-in" style={{ animationDelay: "0.35s" }}>
            <span className="block font-heading text-[20px] sm:text-[38px] md:text-[52px] lg:text-[72px] xl:text-[82px] leading-[1.1] sm:leading-[1.05] tracking-[-0.03em] mb-6 sm:mb-8">
              <span className="font-extralight text-white/80">Prêts à </span>
              <span className="text-tap-red font-bold text-glow">performer</span>
              <span className="font-extralight text-white/80">.</span>
            </span>
          </div>
        </h1>

        <div className="hero-fade-in" style={{ animationDelay: "0.5s" }}>
          <p className="text-[13px] sm:text-[15px] md:text-[17px] max-w-full sm:max-w-[440px] mb-10 sm:mb-12 text-white/50 leading-[1.7] font-light">
            L&apos;IA qui analyse, forme et connecte les candidats
            aux entreprises qui recrutent au Maroc.
          </p>
        </div>

        <div className="hero-fade-in" style={{ animationDelay: "0.65s" }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <Link
              href="/connexion"
              className="btn-primary group w-full sm:w-auto justify-center"
            >
              Découvrir TAP
              <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              href="/inscription"
              className="btn-secondary w-full sm:w-auto justify-center"
            >
              Créer mon profil
            </Link>
          </div>
        </div>

        <div className="hero-fade-in" style={{ animationDelay: "0.85s" }}>
          <div className="mt-14 sm:mt-20 flex flex-wrap items-center gap-2 sm:gap-4">
            {[
              { num: "500+", label: "Profils analysés" },
              { num: "95%", label: "Satisfaction" },
              { num: "4x", label: "Plus rapide" },
            ].map((stat, i) => (
              <div key={i} className="flex items-center px-3 sm:px-5 py-2 sm:py-3 rounded-xl glass">
                <div>
                  <div className="text-[15px] sm:text-[22px] font-bold text-white tracking-[-0.02em]">{stat.num}</div>
                  <div className="text-[6.5px] sm:text-[9px] uppercase tracking-[1px] sm:tracking-[2px] text-white/40 font-medium">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[120px] bg-gradient-to-t from-black to-transparent z-[2]" />

      <div className="hero-fade-in absolute bottom-8 left-1/2 -translate-x-1/2 z-[5]" style={{ animationDelay: "1.2s" }}>
        <div className="w-5 h-8 rounded-full border border-white/10 flex justify-center pt-1.5 scroll-indicator">
          <div className="w-[2px] h-2 bg-white/30 rounded-full scroll-dot" />
        </div>
      </div>
    </section>
  );
}
