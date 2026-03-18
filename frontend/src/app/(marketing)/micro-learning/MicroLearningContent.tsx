"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Play, ChevronRight, CheckCircle2 } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const modules = [
  { title: "Communication pro", duration: "12 min", level: 85, category: "Soft Skills" },
  { title: "Excel avancé", duration: "15 min", level: 60, category: "Digital" },
  { title: "Gestion de projet", duration: "10 min", level: 45, category: "Métiers" },
  { title: "Leadership", duration: "8 min", level: 30, category: "Soft Skills" },
];

const domains = [
  {
    name: "Soft Skills",
    count: "12 modules",
    items: ["Communication professionnelle", "Leadership & management", "Travail d'équipe", "Gestion du stress"],
    gradient: "from-tap-red/20 to-tap-red/5",
  },
  {
    name: "Compétences digitales",
    count: "10 modules",
    items: ["Excel avancé", "Outils collaboratifs", "Data literacy", "Marketing digital"],
    gradient: "from-tap-red/15 to-tap-red/5",
  },
  {
    name: "Métiers & secteurs",
    count: "15 modules",
    items: ["Vente & négociation", "Gestion de projet", "Finance & comptabilité", "Logistique"],
    gradient: "from-tap-red/10 to-tap-red/5",
  },
];

export default function MicroLearningContent() {
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
          <div
            className="hero-fade-in inline-flex items-center gap-2 sm:gap-2.5 px-4 sm:px-5 py-2 sm:py-2.5 mb-6 sm:mb-8 glass rounded-full"
            style={{ animationDelay: "0.2s" }}
          >
            <span className="relative w-2 h-2">
              <span className="absolute inset-0 bg-tap-red rounded-full animate-ping opacity-75" />
              <span className="relative block w-2 h-2 bg-tap-red rounded-full" />
            </span>
            <span className="text-[9px] sm:text-[10px] uppercase tracking-[2px] sm:tracking-[2.5px] text-white/60 font-medium">Produit</span>
          </div>

          <h1
            className="hero-fade-in font-heading text-[22px] sm:text-[38px] md:text-[52px] lg:text-[66px] font-extralight text-white tracking-[-0.03em] mb-4 sm:mb-5 leading-[1.05]"
            style={{ animationDelay: "0.3s" }}
          >
            Micro-<span className="font-bold text-glow text-tap-red">learning</span>
          </h1>
          <p
            className="hero-fade-in text-[15px] md:text-[17px] text-white/50 max-w-[480px] leading-[1.7] font-light"
            style={{ animationDelay: "0.5s" }}
          >
            Des formations courtes et personnalisées par l&apos;IA pour combler les lacunes et booster l&apos;employabilité.
          </p>

          <div
            className="hero-fade-in flex items-center gap-2 sm:gap-4 mt-10 sm:mt-14"
            style={{ animationDelay: "0.7s" }}
          >
            {[
              { num: "5-15 min", label: "Par module" },
              { num: "37+", label: "Modules" },
              { num: "3", label: "Domaines" },
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
      {/* Learning path mockup — Left text, Right UI */}
      <section className="py-12 sm:py-20 bg-black relative overflow-hidden">
        <div className="absolute top-[10%] right-[-100px] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.04),transparent_60%)] blur-3xl" />
        <div className="max-w-[1300px] w-[88%] mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-16 items-center">
            {/* Left — Text */}
            <div className="reveal-left">
              <span className="inline-flex items-center gap-2 text-[9px] sm:text-[10px] uppercase tracking-[2px] sm:tracking-[3px] text-tap-red font-semibold mb-4 sm:mb-5">
                <span className="w-6 h-[1px] bg-tap-red" />
                Parcours adaptatif
              </span>
              <h2 className="font-heading text-[26px] sm:text-[32px] md:text-[40px] lg:text-[48px] font-extralight text-white tracking-[-0.03em] leading-[1.1] mb-5">
                L&apos;IA crée <span className="font-bold">votre parcours</span>
              </h2>
              <p className="text-[14px] sm:text-[15px] text-white/40 leading-[1.8] font-light mb-8">
                Après l&apos;analyse du CV, l&apos;IA identifie les lacunes et génère automatiquement un parcours de formation personnalisé. Chaque module complété améliore votre score d&apos;employabilité.
              </p>

              <div className="flex flex-col gap-3 reveal-stagger">
                {[
                  "Parcours 100% personnalisé par l'IA",
                  "Modules courts de 5 à 15 minutes",
                  "Score amélioré après chaque module",
                  "Badges et certifications",
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 reveal-item"
                  >
                    <CheckCircle2 size={15} className="text-tap-red shrink-0" strokeWidth={1.5} />
                    <p className="text-[13px] sm:text-[14px] text-white/50 font-light">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Module list UI mockup */}
            <div className="reveal-right card-solid rounded-2xl p-5 sm:p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[2px] text-tap-red font-semibold mb-1">Mon parcours</p>
                  <p className="text-[13px] text-white/35 font-light">4 modules recommandés</p>
                </div>
                <div className="text-right">
                  <p className="text-[20px] font-bold text-white">67<span className="text-[12px] text-white/25 font-light">/100</span></p>
                  <p className="text-[9px] text-white/25 uppercase tracking-[1.5px]">Score actuel</p>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 reveal-stagger">
                {modules.map((mod, i) => (
                  <div
                    key={mod.title}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-colors duration-300 group/mod cursor-default reveal-item"
                  >
                    <div className="w-9 h-9 rounded-lg bg-tap-red/10 flex items-center justify-center shrink-0 group-hover/mod:bg-tap-red/20 transition-colors duration-300">
                      <Play size={12} className="text-tap-red ml-0.5" fill="currentColor" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-white truncate">{mod.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-white/25">{mod.category}</span>
                        <span className="w-0.5 h-0.5 bg-white/15 rounded-full" />
                        <span className="text-[10px] text-white/25">{mod.duration}</span>
                      </div>
                    </div>
                    {/* Progress */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-12 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                        <div
                          style={{ width: `${mod.level}%` }}
                          className="h-full bg-tap-red/50 rounded-full"
                        />
                      </div>
                      <span className="text-[10px] text-white/30 font-medium w-6 text-right">{mod.level}%</span>
                    </div>
                    <ChevronRight size={14} className="text-white/15 shrink-0" />
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-white/[0.04] flex items-center justify-between">
                <p className="text-[11px] text-white/25 font-light">Score après complétion</p>
                <p className="text-[14px] font-bold text-tap-red">+15 points</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Domains */}
      <section className="py-12 sm:py-20 bg-tap-dark relative overflow-hidden">
        <div className="max-w-[1300px] w-[88%] mx-auto relative z-10">
          <div className="reveal text-center mb-10 sm:mb-16">
            <span className="inline-flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] uppercase tracking-[2px] sm:tracking-[3px] text-tap-red font-semibold mb-4 sm:mb-5">
              <span className="w-6 h-[1px] bg-tap-red" />
              Catalogue
              <span className="w-6 h-[1px] bg-tap-red" />
            </span>
            <h2 className="font-heading text-[26px] sm:text-[32px] md:text-[44px] lg:text-[52px] font-extralight text-white tracking-[-0.03em] leading-[1.1]">
              Domaines de <span className="font-bold">formation</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 reveal-stagger">
            {domains.map((domain, i) => (
              <div
                key={domain.name}
                className="group card-solid rounded-2xl overflow-hidden reveal-item"
              >
                {/* Header gradient */}
                <div className={`bg-gradient-to-r ${domain.gradient} px-6 py-4 sm:px-7 sm:py-5`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-[16px] sm:text-[17px] font-bold text-white">{domain.name}</h3>
                    <span className="text-[10px] text-tap-red/60 font-semibold bg-tap-red/[0.08] px-2 py-0.5 rounded-full">{domain.count}</span>
                  </div>
                </div>
                {/* Items */}
                <div className="p-5 sm:p-6 pt-4">
                  <ul className="flex flex-col gap-2.5">
                    {domain.items.map((item) => (
                      <li key={item} className="text-[13px] sm:text-[14px] text-white/40 flex items-center gap-2.5 font-light">
                        <BookOpen size={12} className="text-tap-red/40 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-16 bg-transparent relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-tap-red/[0.02] to-transparent pointer-events-none" />
        <div className="max-w-[1300px] w-[88%] mx-auto relative z-10">
          <div className="reveal relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/[0.06] bg-[url('/images/bgsections.jpg')] bg-no-repeat bg-center bg-[length:100%_auto]">
            <div className="absolute inset-0 bg-black/50 pointer-events-none" />
            <div className="relative z-10 p-7 sm:p-12 lg:p-16 text-center">
              <h3 className="font-heading text-[22px] sm:text-[26px] md:text-[36px] lg:text-[44px] font-extralight text-white mb-3 sm:mb-4 tracking-[-0.03em] leading-[1.1]">
                Commencez à <span className="font-bold">apprendre</span>
              </h3>
              <p className="text-[14px] text-white/40 mb-8 font-light max-w-[520px] mx-auto leading-[1.7]">
                Des formations personnalisées qui boostent votre employabilité.
              </p>
              <div className="flex gap-3 flex-wrap justify-center">
                <a href="https://demo.tap-hr.com/" target="_blank" rel="noopener noreferrer" className="btn-primary group">
                  Découvrir les formations
                  <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
                </a>
                <Link href="/inscription" className="btn-secondary">
                  Créer mon profil
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}
