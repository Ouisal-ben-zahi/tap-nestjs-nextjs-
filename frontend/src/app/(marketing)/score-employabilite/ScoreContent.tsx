"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, BarChart3, Shield, TrendingUp, Layers, CheckCircle2 } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

function AnimatedCounter({ value, delay = 0 }: { value: number; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const timeout = setTimeout(() => {
      const start = performance.now();
      const duration = 1500;
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = String(Math.round(eased * value));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);
  return <span ref={ref}>0</span>;
}

const criteria = [
  { label: "Compétences techniques", pct: 25, score: 88, abbr: "CT" },
  { label: "Expérience professionnelle", pct: 20, score: 75, abbr: "EP" },
  { label: "Formation & certifications", pct: 20, score: 82, abbr: "FC" },
  { label: "Soft skills", pct: 15, score: 91, abbr: "SS" },
  { label: "Adéquation au marché", pct: 10, score: 70, abbr: "AM" },
  { label: "Potentiel de progression", pct: 10, score: 85, abbr: "PP" },
];

const features = [
  {
    icon: BarChart3,
    title: "Score multi-critères",
    description: "Plus de 30 critères analysés : compétences, soft skills, expérience, formation, certifications et adéquation marché.",
  },
  {
    icon: Shield,
    title: "Objectivité garantie",
    description: "Calcul transparent et impartial qui élimine les biais humains dans le processus d'évaluation.",
  },
  {
    icon: TrendingUp,
    title: "Score évolutif",
    description: "Mise à jour en temps réel quand le candidat complète des formations ou améliore ses compétences.",
  },
  {
    icon: Layers,
    title: "Benchmark sectoriel",
    description: "Contextualisé par rapport aux standards du marché marocain et aux exigences des entreprises.",
  },
];

export default function ScoreContent() {
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
            Score d&apos;<span className="font-bold text-glow text-tap-red">employabilité</span>
          </h1>
          <p
            className="hero-fade-in text-[15px] md:text-[17px] text-white/50 max-w-[480px] leading-[1.7] font-light"
            style={{ animationDelay: "0.5s" }}
          >
            Une évaluation objective et transparente du potentiel de chaque candidat, notée de 0 à 100.
          </p>

          <div
            className="hero-fade-in flex items-center gap-2 sm:gap-4 mt-10 sm:mt-14"
            style={{ animationDelay: "0.7s" }}
          >
            {[
              { num: "30+", label: "Critères analysés" },
              { num: "6", label: "Catégories de score" },
              { num: "100%", label: "Transparent" },
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
      {/* Score Dashboard — Bento grid */}
      <section className="py-16 sm:py-28 bg-black relative overflow-hidden">
        <div className="absolute top-[10%] right-[-100px] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.04),transparent_60%)] blur-3xl" />
        <div className="absolute bottom-[10%] left-[-100px] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.03),transparent_60%)] blur-3xl" />
        <div className="max-w-[1300px] w-[88%] mx-auto relative z-10">
          <div className="reveal text-center mb-10 sm:mb-16">
            <span className="inline-flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] uppercase tracking-[2px] sm:tracking-[3px] text-tap-red font-semibold mb-4 sm:mb-5">
              <span className="w-6 h-[1px] bg-tap-red" />
              Dashboard
              <span className="w-6 h-[1px] bg-tap-red" />
            </span>
            <h2 className="font-heading text-[26px] sm:text-[32px] md:text-[44px] lg:text-[52px] font-extralight text-white tracking-[-0.03em] leading-[1.1]">
              Anatomie du <span className="font-bold">score</span>
            </h2>
          </div>

          {/* Bento grid: Big score left + 6 criteria cards right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
            {/* Big Score Card — spans 5 cols, full height */}
            <div className="reveal-scale lg:col-span-5 card-solid rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center relative overflow-hidden">
              {/* Glow behind circle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.08),transparent_70%)] blur-2xl pointer-events-none" />

              <div className="relative w-[180px] h-[180px] sm:w-[200px] sm:h-[200px]">
                <svg viewBox="0 0 220 220" className="w-full h-full -rotate-90">
                  <circle cx="110" cy="110" r="95" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="10" />
                  <circle cx="110" cy="110" r="80" fill="none" stroke="rgba(255,255,255,0.015)" strokeWidth="2" />
                  <circle
                    cx="110" cy="110" r="95" fill="none" strokeWidth="10" strokeLinecap="round"
                    stroke="url(#dashGrad)"
                    strokeDasharray={`${2 * Math.PI * 95}`}
                    strokeDashoffset={2 * Math.PI * 95 * (1 - 0.82)}
                  />
                  <defs>
                    <linearGradient id="dashGrad" x1="0" y1="0" x2="1" y2="0.5">
                      <stop offset="0%" stopColor="#CA1B28" />
                      <stop offset="100%" stopColor="#CA1B28" stopOpacity="0.2" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[48px] sm:text-[56px] font-bold text-white tracking-[-0.03em] font-heading leading-none">
                    <AnimatedCounter value={82} delay={300} />
                  </span>
                  <span className="text-[13px] sm:text-[14px] text-white/20 font-light mt-0.5">/100</span>
                </div>
              </div>

              <div className="mt-4 text-center">
                <span className="text-[9px] uppercase tracking-[2.5px] text-tap-red font-semibold">Score global</span>
                <p className="text-[12px] text-white/25 font-light mt-1">Basé sur 6 critères pondérés</p>
              </div>

              <div className="w-full mt-5 pt-4 border-t border-white/[0.04] flex items-center justify-between">
                <div className="text-center flex-1">
                  <p className="text-[18px] font-bold text-white">Top 15%</p>
                  <p className="text-[9px] text-white/25 uppercase tracking-[1.5px]">Classement</p>
                </div>
                <div className="w-[1px] h-8 bg-white/[0.06]" />
                <div className="text-center flex-1">
                  <p className="text-[18px] font-bold text-tap-red">+12</p>
                  <p className="text-[9px] text-white/25 uppercase tracking-[1.5px]">vs. dernier mois</p>
                </div>
              </div>
            </div>

            {/* 6 Criteria cards — nested 3x2 grid in right 7 cols */}
            <div className="reveal-stagger lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 auto-rows-fr">
              {criteria.map((item, i) => {
                const r = 28;
                const circ = 2 * Math.PI * r;
                return (
                  <div
                    key={item.label}
                    className="reveal-item card-solid rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center text-center group hover:bg-white/[0.025] transition-colors duration-300"
                  >
                    {/* Mini circular gauge */}
                    <div className="relative w-[60px] h-[60px] mb-3">
                      <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3.5" />
                        <circle
                          cx="32" cy="32" r={r} fill="none" stroke="#CA1B28" strokeWidth="3.5" strokeLinecap="round"
                          strokeDasharray={circ}
                          strokeDashoffset={circ * (1 - item.score / 100)}
                          style={{ opacity: 0.7 + (item.score / 100) * 0.3 }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[15px] font-bold text-white/80">
                          <AnimatedCounter value={item.score} delay={400 + i * 100} />
                        </span>
                      </div>
                    </div>

                    <p className="text-[12px] sm:text-[13px] font-semibold text-white/70 leading-tight">{item.label}</p>
                    <span className="text-[10px] font-bold text-tap-red/60 bg-tap-red/[0.06] px-2 py-0.5 rounded-full mt-2">{item.pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-center text-[12px] text-white/35 mt-6 font-light">Exemple de dashboard — Score recalculé en temps réel</p>
        </div>
      </section>

      {/* Features — 2x2 grid */}
      <section className="py-16 sm:py-28 bg-tap-dark relative overflow-hidden">
        <div className="max-w-[1300px] w-[88%] mx-auto relative z-10">
          <div className="reveal text-center mb-10 sm:mb-16">
            <span className="inline-flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] uppercase tracking-[2px] sm:tracking-[3px] text-tap-red font-semibold mb-4 sm:mb-5">
              <span className="w-6 h-[1px] bg-tap-red" />
              Fonctionnalités
              <span className="w-6 h-[1px] bg-tap-red" />
            </span>
            <h2 className="font-heading text-[26px] sm:text-[32px] md:text-[44px] lg:text-[52px] font-extralight text-white tracking-[-0.03em] leading-[1.1]">
              Un score <span className="font-bold">intelligent</span>
            </h2>
          </div>

          <div className="reveal-stagger grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="reveal-item group card-solid rounded-2xl p-6 sm:p-8"
              >
                <div className="w-14 h-14 rounded-2xl bg-tap-red/[0.08] border border-tap-red/10 flex items-center justify-center mb-5 group-hover:bg-tap-red/15 group-hover:border-tap-red/20 transition-all duration-500">
                  <feature.icon size={24} className="text-tap-red" strokeWidth={1.5} />
                </div>
                <h3 className="text-[17px] sm:text-[19px] font-bold text-white mb-2 tracking-[-0.01em]">{feature.title}</h3>
                <p className="text-[14px] text-white/40 leading-[1.8] font-light">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 bg-black relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-tap-red/[0.02] to-transparent pointer-events-none" />
        <div className="max-w-[600px] w-[88%] mx-auto text-center relative z-10">
          <div className="reveal">
            <h2 className="font-heading text-[22px] sm:text-[32px] md:text-[40px] font-extralight text-white tracking-[-0.03em] leading-[1.15] mb-4">
              Découvrez votre <span className="font-bold">score</span>
            </h2>
            <p className="text-[14px] sm:text-[15px] text-white/40 max-w-[400px] mx-auto mb-8 leading-[1.7] font-light">
              Évaluez votre employabilité en quelques secondes grâce à l&apos;IA.
            </p>
            <a href="https://demo.tap-hr.com/" target="_blank" rel="noopener noreferrer" className="btn-primary group">
              Calculer mon score
              <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}
