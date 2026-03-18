"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { ArrowRight, FileText, Layout, Layers, Users, Sparkles, Upload, Cpu, Download, Share2, CheckCircle2 } from "lucide-react";

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

const deliverables = [
  {
    icon: FileText,
    tag: "Document",
    title: "CV Professionnel",
    description: "L'IA restructure et optimise le CV dans un format professionnel standardisé, ATS-friendly.",
    visual: (
      <div className="relative w-full h-[180px] sm:h-[200px] rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 overflow-hidden group-hover:border-white/[0.08] transition-colors duration-500">
        <div className="flex gap-3">
          <div className="w-12 h-12 rounded-lg bg-tap-red/10 shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-2.5 w-[70%] bg-white/[0.08] rounded-full" />
            <div className="h-2 w-[50%] bg-white/[0.05] rounded-full" />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-1.5 w-full bg-white/[0.04] rounded-full" />
          <div className="h-1.5 w-[90%] bg-white/[0.04] rounded-full" />
          <div className="h-1.5 w-[75%] bg-white/[0.04] rounded-full" />
        </div>
        <div className="mt-4 flex gap-2">
          <div className="h-5 w-16 rounded-full bg-tap-red/10 border border-tap-red/20" />
          <div className="h-5 w-14 rounded-full bg-white/[0.04] border border-white/[0.06]" />
          <div className="h-5 w-18 rounded-full bg-white/[0.04] border border-white/[0.06]" />
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-1.5 w-full bg-white/[0.04] rounded-full" />
          <div className="h-1.5 w-[85%] bg-white/[0.04] rounded-full" />
        </div>
      </div>
    ),
  },
  {
    icon: Layout,
    tag: "One-pager",
    title: "Portfolio en une page",
    description: "Un résumé visuel et percutant : compétences, expériences marquantes et score intégré.",
    visual: (
      <div className="relative w-full h-[180px] sm:h-[200px] rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 overflow-hidden group-hover:border-white/[0.08] transition-colors duration-500">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-tap-red/30 to-tap-red/5" />
            <div className="space-y-1">
              <div className="h-2 w-20 bg-white/[0.1] rounded-full" />
              <div className="h-1.5 w-14 bg-white/[0.05] rounded-full" />
            </div>
          </div>
          <div className="text-[20px] font-bold text-tap-red/40">87</div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-8 rounded-lg bg-white/[0.03] border border-white/[0.04]" />
          ))}
        </div>
        <div className="space-y-1.5">
          <div className="h-1.5 w-full bg-white/[0.04] rounded-full" />
          <div className="h-1.5 w-[80%] bg-white/[0.04] rounded-full" />
        </div>
      </div>
    ),
  },
  {
    icon: Layers,
    tag: "Multi-pages",
    title: "Portfolio complet",
    description: "Parcours détaillé : projets, compétences techniques, certifications et recommandations.",
    visual: (
      <div className="relative w-full h-[180px] sm:h-[200px] flex items-center justify-center">
        {[2, 1, 0].map((offset) => (
          <div
            key={offset}
            className="absolute rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 group-hover:border-white/[0.08] transition-colors duration-500"
            style={{
              width: `${85 - offset * 8}%`,
              height: `${85 - offset * 8}%`,
              top: `${8 + offset * 6}%`,
              left: `${7.5 + offset * 4}%`,
              zIndex: 3 - offset,
              opacity: 1 - offset * 0.25,
            }}
          >
            {offset === 0 && (
              <div className="space-y-2">
                <div className="h-2 w-[60%] bg-white/[0.08] rounded-full" />
                <div className="h-1.5 w-full bg-white/[0.04] rounded-full" />
                <div className="h-1.5 w-[90%] bg-white/[0.04] rounded-full" />
                <div className="h-1.5 w-[70%] bg-white/[0.04] rounded-full" />
                <div className="mt-3 h-2 w-[50%] bg-white/[0.06] rounded-full" />
                <div className="h-1.5 w-full bg-white/[0.04] rounded-full" />
                <div className="h-1.5 w-[85%] bg-white/[0.04] rounded-full" />
              </div>
            )}
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Users,
    tag: "Recruteurs",
    title: "Talents Cards",
    description: "Comparez 1 à 5 profils côte à côte, chacun noté de 0 à 100 sur des critères clés.",
    visual: (
      <div className="relative w-full h-[180px] sm:h-[200px] flex items-center justify-center gap-2 px-2">
        {[
          { score: 87, h: "75%" },
          { score: 74, h: "65%" },
          { score: 62, h: "55%" },
        ].map((c, i) => (
          <div
            key={i}
            className="flex-1 rounded-lg bg-white/[0.02] border border-white/[0.04] p-2 flex flex-col items-center justify-end group-hover:border-white/[0.08] transition-colors duration-500"
            style={{ height: c.h }}
          >
            <div className="w-6 h-6 rounded-full bg-white/[0.06] mb-1.5" />
            <span className="text-[16px] font-bold text-white/50">{c.score}</span>
            <div className="w-full mt-1.5 space-y-1">
              <div className="h-1 rounded-full bg-tap-red/20" style={{ width: `${c.score}%` }} />
              <div className="h-1 rounded-full bg-white/[0.04]" />
              <div className="h-1 rounded-full bg-white/[0.04]" />
            </div>
          </div>
        ))}
      </div>
    ),
  },
];

type TalentCandidate = {
  name: string;
  score: number; // 0..100
};

const scoreCategories = [
  { label: "Compétences techniques", score: 85 },
  { label: "Expérience professionnelle", score: 72 },
  { label: "Soft skills", score: 90 },
  { label: "Formation & certifications", score: 68 },
  { label: "Adéquation marché", score: 78 },
];

function TalentScoreCard({ candidate, index }: { candidate: TalentCandidate; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [t, setT] = useState(0); // 0..1 for progress animation

  // Start animation only when the card becomes visible
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25, rootMargin: "0px 0px -60px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;

    let raf: number | null = null;
    const startAt = performance.now();
    const duration = 1200;

    setT(0);

    const tick = (now: number) => {
      const p = Math.min((now - startAt) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setT(eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [started, candidate.score, index]);

  const scoreAnim = (candidate.score || 0) * t; // 0..score
  const progress = candidate.score > 0 ? scoreAnim / candidate.score : 0;

  // Circle (global score)
  const r = 34;
  const circ = 2 * Math.PI * r;
  const dashoffset = circ * (1 - scoreAnim / 100);
  const gradId = `scoreGrad-${index}`;

  return (
    <div
      ref={cardRef}
      className="reveal-item group relative flex-1 max-w-[280px] sm:max-w-[200px] w-full card-animated-border rounded-xl p-4 sm:p-5 overflow-hidden bg-[#0A0A0A] border border-white/[0.06] hover:border-tap-red/15 transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)] transform-gpu hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_18px_60px_rgba(0,0,0,0.55),0_0_40px_rgba(202,27,40,0.10)]"
    >
      <div className="absolute inset-0 opacity-0 transition-opacity duration-500 pointer-events-none bg-[radial-gradient(circle_at_25%_0%,rgba(202,27,40,0.28),transparent_55%)] blur-[2px] mix-blend-screen" />
      <div className="luxury-sweep !opacity-0 absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(202,27,40,0.35)_45%,rgba(255,255,255,0.14)_55%,transparent_100%)]" />

      <div className="relative z-10">
        <div className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center mx-auto mb-3">
          <span className="text-[13px] font-semibold text-white/40">{candidate.name[0]}</span>
        </div>
        <p className="text-[13px] font-semibold text-white text-center mb-0.5">{candidate.name}</p>
        <p className="text-[9px] text-white/25 text-center uppercase tracking-[1.5px] mb-4">Talents Card</p>

        {/* Score circle */}
        <div className="relative w-[80px] h-[80px] mx-auto mb-4">
          <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
            <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="4" />
            <circle
              cx="40"
              cy="40"
              r={r}
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${circ}`}
              strokeDashoffset={dashoffset}
            />
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#CA1B28" />
                <stop offset="100%" stopColor="#CA1B28" stopOpacity="0.4" />
              </linearGradient>
            </defs>
          </svg>

          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[22px] font-bold text-white tracking-[-0.02em]">{Math.round(scoreAnim)}</span>
          </div>
        </div>

        {/* Progress bars */}
        <div className="flex flex-col gap-1.5">
          {scoreCategories.map((cat) => {
            const adj =
              index === 0 ? cat.score : index === 1 ? Math.max(40, cat.score - 13) : Math.max(30, cat.score - 25);
            const barAnim = adj * progress; // 0..adj

            const widthPct = Math.min(100, barAnim);

            return (
              <div key={cat.label}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[9px] text-white/25 font-light truncate mr-2">{cat.label}</span>
                  <span className="text-[10px] font-semibold text-white/40">{Math.round(barAnim)}</span>
                </div>
                <div className="w-full h-[2px] bg-white/[0.04] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${widthPct}%`,
                      background: "linear-gradient(90deg, rgba(202,27,40,0.35), rgba(202,27,40,0.95))",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AnalyseCvContent() {
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
            Analyse <span className="font-bold text-glow text-tap-red">IA</span> du CV
          </h1>
          <p
            className="hero-fade-in text-[15px] md:text-[17px] text-white/50 max-w-[520px] leading-[1.7] font-light"
            style={{ animationDelay: "0.5s" }}
          >
            Déposez un CV, l&apos;IA génère un CV professionnel, des portfolios et des Talents Cards notées de 0 à 100 pour les recruteurs.
          </p>

          <div
            className="hero-fade-in flex items-center gap-2 sm:gap-4 mt-10 sm:mt-14"
            style={{ animationDelay: "0.7s" }}
          >
            {[
              { num: "4", label: "Livrables générés" },
              { num: "< 30s", label: "Temps d'analyse" },
              { num: "0-100", label: "Score détaillé" },
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
      {/* Process — Horizontal flow */}
      <section className="py-12 sm:py-16 bg-black relative overflow-hidden">
        <div className="max-w-[1300px] w-[88%] mx-auto relative z-10">
          <div className="reveal text-center mb-10 sm:mb-16">
            <span className="inline-flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] uppercase tracking-[2px] sm:tracking-[3px] text-tap-red font-semibold mb-4 sm:mb-5">
              <span className="w-6 h-[1px] bg-tap-red" />
              En 4 étapes
              <span className="w-6 h-[1px] bg-tap-red" />
            </span>
            <h2 className="font-heading text-[26px] sm:text-[32px] md:text-[44px] lg:text-[52px] font-extralight text-white tracking-[-0.03em] leading-[1.1]">
              Du CV brut aux <span className="font-bold">livrables IA</span>
            </h2>
          </div>

          <div className="relative">
            {/* Connecting line — desktop only */}
            <div className="hidden lg:block absolute top-[52px] left-[calc(12.5%+20px)] right-[calc(12.5%+20px)] h-[1px]">
              <div className="reveal-scale-x w-full h-full bg-gradient-to-r from-tap-red/30 via-tap-red/15 to-tap-red/30 origin-left" />
            </div>

            <div className="reveal-stagger grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-5">
              {[
                { icon: Upload, num: "01", title: "Upload", desc: "Déposez le CV en PDF ou Word sur la plateforme." },
                { icon: Cpu, num: "02", title: "Analyse IA", desc: "NLP extraction & évaluation complète du profil en quelques secondes." },
                { icon: Sparkles, num: "03", title: "Génération", desc: "4 livrables créés automatiquement par l'intelligence artificielle." },
                { icon: Share2, num: "04", title: "Partage", desc: "Résultats disponibles pour le candidat et les recruteurs." },
              ].map((step) => (
                <div
                  key={step.num}
                  className="reveal-item group relative flex flex-col items-center text-center"
                >
                  <div className="relative mb-6">
                    <div className="w-[104px] h-[104px] rounded-full bg-white/[0.02] border border-white/[0.06] flex items-center justify-center group-hover:border-tap-red/20 transition-colors duration-500">
                      <div className="w-[72px] h-[72px] rounded-full bg-tap-red/[0.08] flex items-center justify-center group-hover:bg-tap-red/15 transition-colors duration-500">
                        <step.icon size={28} className="text-tap-red" strokeWidth={1.5} />
                      </div>
                    </div>
                    <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-tap-red/20 border border-tap-red/30 flex items-center justify-center">
                      <span className="text-[11px] font-bold text-tap-red">{step.num}</span>
                    </div>
                  </div>

                  <h3 className="text-[17px] sm:text-[18px] font-bold text-white mb-2.5 tracking-[-0.01em]">{step.title}</h3>
                  <p className="text-[13px] text-white/35 leading-[1.7] font-light max-w-[260px]">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Deliverables — Bento Grid with visual mockups */}
      <section className="py-12 sm:py-20 bg-black relative overflow-hidden">
        <div className="absolute top-[10%] right-[-100px] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.04),transparent_60%)] blur-3xl" />
        <div className="absolute bottom-[10%] left-[-100px] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.03),transparent_60%)] blur-3xl" />
        <div className="max-w-[1300px] w-[88%] mx-auto relative z-10">
          <div className="reveal text-center mb-10 sm:mb-16">
            <span className="inline-flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] uppercase tracking-[2px] sm:tracking-[3px] text-tap-red font-semibold mb-4 sm:mb-5">
              <span className="w-6 h-[1px] bg-tap-red" />
              Ce que l&apos;IA génère
              <span className="w-6 h-[1px] bg-tap-red" />
            </span>
            <h2 className="font-heading text-[26px] sm:text-[32px] md:text-[44px] lg:text-[52px] font-extralight text-white tracking-[-0.03em] leading-[1.1]">
              4 livrables <span className="font-bold">automatiques</span>
            </h2>
          </div>

          {/* Bento grid — 2 big top, 2 big bottom */}
          <div className="reveal-stagger grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {deliverables.map((item) => (
              <div
                key={item.title}
                className="reveal-item group relative card-animated-border rounded-2xl overflow-hidden bg-[#0A0A0A] border border-white/[0.06] hover:border-tap-red/15 transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)] transform-gpu hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_18px_60px_rgba(0,0,0,0.55),0_0_40px_rgba(202,27,40,0.10)]"
              >
                <div className="absolute inset-0 opacity-0 transition-opacity duration-500 pointer-events-none bg-[radial-gradient(circle_at_25%_0%,rgba(202,27,40,0.28),transparent_55%)] blur-[2px] mix-blend-screen" />
                <div className="luxury-sweep !opacity-0 absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(202,27,40,0.35)_45%,rgba(255,255,255,0.14)_55%,transparent_100%)]" />

                <div className="relative z-10">
                {/* Visual mockup */}
                <div className="p-5 sm:p-6 pb-0">
                  {item.visual}
                </div>

                {/* Text content */}
                <div className="p-5 sm:p-6 pt-4">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-tap-red/[0.08] border border-tap-red/10 flex items-center justify-center group-hover:bg-tap-red/15 group-hover:border-tap-red/20 transition-all duration-500">
                      <item.icon size={15} className="text-tap-red" strokeWidth={1.5} />
                    </div>
                    <span className="text-[8px] font-bold uppercase tracking-[2px] text-tap-red/50 bg-tap-red/[0.06] px-2 py-0.5 rounded-full">{item.tag}</span>
                  </div>
                  <h3 className="text-[18px] sm:text-[20px] font-bold text-white mb-2 tracking-[-0.01em]">{item.title}</h3>
                  <p className="text-[13px] sm:text-[14px] text-white/40 leading-[1.7] font-light">{item.description}</p>
                </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Talents Card Deep Dive — Score visualization */}
      <section className="py-12 sm:py-20 bg-black relative overflow-hidden">
        <div className="absolute top-[20%] left-[-100px] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.04),transparent_60%)] blur-3xl" />
        <div className="max-w-[1300px] w-[88%] mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-16 items-center">
            {/* Left — Text */}
            <div className="reveal-left">
              <span className="inline-flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] uppercase tracking-[2px] sm:tracking-[3px] text-tap-red font-semibold mb-4 sm:mb-5">
                <span className="w-6 h-[1px] bg-tap-red" />
                Talents Card
              </span>
              <h2 className="font-heading text-[26px] sm:text-[32px] md:text-[40px] lg:text-[48px] font-extralight text-white tracking-[-0.03em] leading-[1.1] mb-5">
                Notation <span className="font-bold">0 à 100</span>
              </h2>
              <p className="text-[14px] sm:text-[15px] text-white/40 leading-[1.8] font-light mb-8">
                Les recruteurs comparent jusqu&apos;à 5 profils côte à côte. Chaque critère est noté objectivement par l&apos;IA pour une prise de décision éclairée.
              </p>

              <div className="reveal-stagger flex flex-col gap-3">
                {[
                  "Comparaison de 1 à 5 profils simultanés",
                  "Score global et scores par critère",
                  "Visualisation claire des forces et faiblesses",
                  "Export et partage avec l'équipe RH",
                ].map((item, i) => (
                  <div
                    key={i}
                    className="reveal-item flex items-center gap-3"
                  >
                    <CheckCircle2 size={15} className="text-tap-red shrink-0" strokeWidth={1.5} />
                    <p className="text-[13px] sm:text-[14px] text-white/50 font-light">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Cards mockup */}
            <div className="reveal-right reveal-stagger flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
              {[
                { name: "Sarah M.", score: 87 },
                { name: "Karim B.", score: 74 },
                { name: "Leila A.", score: 62 },
              ].map((candidate, i) => (
                <TalentScoreCard key={candidate.name} candidate={candidate} index={i} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-16 bg-transparent relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-tap-red/[0.02] to-transparent pointer-events-none" />
        <div className="max-w-[1300px] w-[88%] mx-auto relative z-10">
          <div className="reveal group cta-animated-border relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/[0.06] bg-[#0A0A0A] shadow-[0_0_60px_rgba(202,27,40,0.12)] transition-all duration-500 hover:border-tap-red/25 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_0_80px_rgba(202,27,40,0.18),0_18px_70px_rgba(0,0,0,0.65)]">
            {/* Superposition fond image (premium) */}
            <div className="absolute inset-0 bg-[url('/images/bgsections.jpg')] bg-no-repeat bg-center bg-[length:120%_auto] opacity-30 pointer-events-none" />
            <div className="absolute inset-0 bg-black/55 pointer-events-none" />

            {/* Glow accent */}
            <div className="absolute inset-0 opacity-0 transition-opacity duration-500 pointer-events-none">
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[420px] h-[200px] bg-[radial-gradient(circle,rgba(202,27,40,0.35),transparent_60%)] blur-2xl mix-blend-screen" />
            </div>

            {/* Accent gradient */}
            <div className="absolute top-0 left-0 right-0 h-[140px] bg-gradient-to-b from-tap-red/[0.18] to-transparent pointer-events-none" />

            {/* Orbes flottants */}
            <div
              className="absolute -top-8 -left-8 w-[180px] h-[180px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.12),transparent_60%)] blur-2xl floating-orb pointer-events-none"
              style={{ animationDuration: "9s" }}
            />
            <div className="absolute bottom-[-110px] right-[-130px] w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.08),transparent_60%)] blur-3xl pointer-events-none" />

            <div className="relative z-10 p-7 sm:p-12 lg:p-16 text-center">
              <h3 className="font-heading text-[22px] sm:text-[26px] md:text-[36px] lg:text-[44px] font-extralight text-white mb-3 sm:mb-4 tracking-[-0.03em] leading-[1.1]">
                Prêt à <span className="font-bold">tester</span> ?
              </h3>
              <p className="text-[14px] text-white/40 mb-8 font-light max-w-[520px] mx-auto leading-[1.7]">
                Déposez un CV et découvrez la puissance de l&apos;analyse IA en quelques secondes.
              </p>
              <div className="flex gap-3 flex-wrap justify-center">
                <a href="https://demo.tap-hr.com/" target="_blank" rel="noopener noreferrer" className="btn-primary group">
                  Essayer l&apos;analyse IA
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
