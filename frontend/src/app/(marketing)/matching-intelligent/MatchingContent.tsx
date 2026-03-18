"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { ArrowRight, GitCompare, Users, Building2, Fingerprint, CheckCircle2, Heart, ArrowLeftRight } from "lucide-react";

function AnimatedCounter({ value, delay = 0, suffix = "" }: { value: number; delay?: number; suffix?: string }) {
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
        el.textContent = String(Math.round(eased * value)) + suffix;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(timeout);
  }, [value, delay, suffix]);
  return <span ref={ref}>0{suffix}</span>;
}

const matchCriteria = [
  { label: "Compétences techniques", candidat: 85, entreprise: 80, match: 94 },
  { label: "Soft skills", candidat: 90, entreprise: 75, match: 88 },
  { label: "Expérience secteur", candidat: 65, entreprise: 70, match: 76 },
  { label: "Culture fit", candidat: 80, entreprise: 85, match: 91 },
  { label: "Évolution potentielle", candidat: 88, entreprise: 60, match: 72 },
];

export default function MatchingContent() {
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
            Matching <span className="font-bold text-glow text-tap-red">intelligent</span>
          </h1>
          <p
            className="hero-fade-in text-[15px] md:text-[17px] text-white/50 max-w-[480px] leading-[1.7] font-light"
            style={{ animationDelay: "0.5s" }}
          >
            L&apos;IA connecte les bons candidats aux bonnes entreprises en analysant la compatibilité au-delà du simple CV.
          </p>

          <div
            className="hero-fade-in flex items-center gap-2 sm:gap-4 mt-10 sm:mt-14"
            style={{ animationDelay: "0.7s" }}
          >
            {[
              { num: "60%", label: "Temps gagné" },
              { num: "5", label: "Critères de match" },
              { num: "2x", label: "Meilleure rétention" },
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
      {/* Matching visualization — Candidate ↔ Company */}
      <section className="py-16 sm:py-28 bg-black relative overflow-hidden">
        <div className="absolute top-[10%] left-[-100px] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.04),transparent_60%)] blur-3xl" />
        <div className="max-w-[1300px] w-[88%] mx-auto relative z-10">
          <div className="reveal text-center mb-10 sm:mb-16">
            <span className="inline-flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] uppercase tracking-[2px] sm:tracking-[3px] text-tap-red font-semibold mb-4 sm:mb-5">
              <span className="w-6 h-[1px] bg-tap-red" />
              Compatibilité
              <span className="w-6 h-[1px] bg-tap-red" />
            </span>
            <h2 className="font-heading text-[26px] sm:text-[32px] md:text-[44px] lg:text-[52px] font-extralight text-white tracking-[-0.03em] leading-[1.1]">
              Un matching <span className="font-bold">bidirectionnel</span>
            </h2>
          </div>

          {/* Match UI */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 max-w-[1000px] mx-auto items-start">
            {/* Candidate card */}
            <div className="reveal-left card-solid rounded-2xl p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-white/[0.06] flex items-center justify-center">
                  <Users size={18} className="text-white/40" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-white">Sarah M.</p>
                  <p className="text-[10px] text-white/30 uppercase tracking-[1.5px]">Candidat</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {matchCriteria.map((c) => (
                  <div key={c.label}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] text-white/30 font-light">{c.label}</span>
                      <span className="text-[11px] font-semibold text-white/40">{c.candidat}</span>
                    </div>
                    <div className="w-full h-[2px] bg-white/[0.04] rounded-full overflow-hidden">
                      <div
                        style={{ width: `${c.candidat}%` }}
                        className="h-full bg-white/20 rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Match score center */}
            <div className="reveal-scale flex flex-col items-center justify-center py-6 sm:py-8">
              <div className="relative w-[140px] h-[140px] sm:w-[160px] sm:h-[160px] mb-4">
                <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
                  <circle cx="80" cy="80" r="68" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="6" />
                  <circle
                    cx="80" cy="80" r="68" fill="none" stroke="url(#matchGrad)" strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 68}`}
                    strokeDashoffset={2 * Math.PI * 68 * (1 - 0.87)}
                  />
                  <defs>
                    <linearGradient id="matchGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#CA1B28" />
                      <stop offset="100%" stopColor="#CA1B28" stopOpacity="0.3" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[36px] sm:text-[44px] font-bold text-white tracking-[-0.03em] font-heading">
                    <AnimatedCounter value={87} delay={500} suffix="%" />
                  </span>
                  <span className="text-[9px] uppercase tracking-[2px] text-tap-red font-semibold">Match</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-white/25">
                <ArrowLeftRight size={14} className="text-tap-red/50" />
                <span>Compatibilité mutuelle</span>
              </div>
            </div>

            {/* Company card */}
            <div className="reveal-right card-solid rounded-2xl p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-tap-red/10 flex items-center justify-center">
                  <Building2 size={18} className="text-tap-red" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-white">TechCorp MA</p>
                  <p className="text-[10px] text-white/30 uppercase tracking-[1.5px]">Entreprise</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {matchCriteria.map((c) => (
                  <div key={c.label}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] text-white/30 font-light">{c.label}</span>
                      <span className="text-[11px] font-semibold text-white/40">{c.entreprise}</span>
                    </div>
                    <div className="w-full h-[2px] bg-white/[0.04] rounded-full overflow-hidden">
                      <div
                        style={{ width: `${c.entreprise}%` }}
                        className="h-full bg-tap-red/30 rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-[12px] text-white/20 mt-6 font-light">Exemple de matching entre un candidat et une entreprise</p>
        </div>
      </section>

      {/* Process — Premium timeline */}
      <section className="py-16 sm:py-28 bg-tap-dark relative overflow-hidden">
        <div className="absolute top-[20%] right-[-150px] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.03),transparent_60%)] blur-3xl" />
        <div className="max-w-[1300px] w-[88%] mx-auto relative z-10">
          <div className="reveal text-center mb-12 sm:mb-20">
            <span className="inline-flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] uppercase tracking-[2px] sm:tracking-[3px] text-tap-red font-semibold mb-4 sm:mb-5">
              <span className="w-6 h-[1px] bg-tap-red" />
              Processus
              <span className="w-6 h-[1px] bg-tap-red" />
            </span>
            <h2 className="font-heading text-[26px] sm:text-[32px] md:text-[44px] lg:text-[52px] font-extralight text-white tracking-[-0.03em] leading-[1.1]">
              Comment fonctionne <span className="font-bold">le matching</span>
            </h2>
          </div>

          {/* Timeline steps */}
          <div className="relative">
            {/* Connecting line — desktop only */}
            <div className="hidden lg:block absolute top-[52px] left-[calc(12.5%+20px)] right-[calc(12.5%+20px)] h-[1px]">
              <div className="reveal-scale-x w-full h-full bg-gradient-to-r from-tap-red/30 via-tap-red/15 to-tap-red/30 origin-left" />
            </div>

            <div className="reveal-stagger grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-5">
              {[
                { icon: Fingerprint, num: "01", title: "Profil enrichi", desc: "L'IA construit un profil complet à partir de l'analyse CV, du score d'employabilité et des formations suivies." },
                { icon: Building2, num: "02", title: "Besoins entreprise", desc: "Les exigences sont décortiquées et structurées : compétences, culture, secteur, niveau d'expérience." },
                { icon: GitCompare, num: "03", title: "Calcul de match", desc: "Score de compatibilité multi-critères calculé pour chaque paire candidat-entreprise en temps réel." },
                { icon: Heart, num: "04", title: "Recommandation", desc: "Les meilleurs matchs sont présentés avec un rapport de compatibilité détaillé et actionnable." },
              ].map((step) => (
                <div
                  key={step.num}
                  className="reveal-item group relative flex flex-col items-center text-center"
                >
                  {/* Step circle with icon */}
                  <div className="relative mb-6">
                    <div className="w-[104px] h-[104px] rounded-full bg-white/[0.02] border border-white/[0.06] flex items-center justify-center group-hover:border-tap-red/20 transition-colors duration-500">
                      <div className="w-[72px] h-[72px] rounded-full bg-tap-red/[0.08] flex items-center justify-center group-hover:bg-tap-red/15 transition-colors duration-500">
                        <step.icon size={28} className="text-tap-red" strokeWidth={1.5} />
                      </div>
                    </div>
                    {/* Step number badge */}
                    <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-tap-red/20 border border-tap-red/30 flex items-center justify-center">
                      <span className="text-[11px] font-bold text-tap-red">{step.num}</span>
                    </div>
                  </div>

                  {/* Text */}
                  <h3 className="text-[17px] sm:text-[18px] font-bold text-white mb-2.5 tracking-[-0.01em]">{step.title}</h3>
                  <p className="text-[13px] text-white/35 leading-[1.7] font-light max-w-[260px]">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24 bg-black relative overflow-hidden">
        <div className="max-w-[800px] w-[88%] mx-auto relative z-10">
          <div className="reveal-stagger grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {[
              "Réduction du temps de recrutement de 60%",
              "Taux de rétention supérieur",
              "Profils pré-qualifiés et formés",
              "Transparence sur les critères",
              "Matching culturel au-delà du CV",
              "Candidats motivés et préparés",
            ].map((benefit, i) => (
              <div
                key={i}
                className="reveal-item flex items-center gap-3 card-solid rounded-xl p-4"
              >
                <CheckCircle2 size={15} className="text-tap-red shrink-0" strokeWidth={1.5} />
                <p className="text-[13px] sm:text-[14px] text-white/45 font-light">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 bg-transparent relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-tap-red/[0.02] to-transparent pointer-events-none" />
        <div className="max-w-[1300px] w-[88%] mx-auto relative z-10">
          <div className="reveal relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/[0.06] bg-[url('/images/bgsections.jpg')] bg-no-repeat bg-center bg-[length:100%_auto]">
            <div className="absolute inset-0 bg-black/50 pointer-events-none" />
            <div className="relative z-10 p-7 sm:p-12 lg:p-16 text-center">
              <h3 className="font-heading text-[22px] sm:text-[26px] md:text-[36px] lg:text-[44px] font-extralight text-white mb-3 sm:mb-4 tracking-[-0.03em] leading-[1.1]">
                Trouvez le <span className="font-bold">match parfait</span>
              </h3>
              <p className="text-[14px] text-white/40 mb-8 font-light max-w-[520px] mx-auto leading-[1.7]">
                Connectez-vous aux meilleurs talents ou aux meilleures entreprises.
              </p>
              <div className="flex gap-3 flex-wrap justify-center">
                <a href="https://demo.tap-hr.com/" target="_blank" rel="noopener noreferrer" className="btn-primary group">
                  Découvrir le matching
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
