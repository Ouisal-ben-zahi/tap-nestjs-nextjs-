"use client";

import Link from "next/link";
import { Target, Lightbulb, BarChart3, BookOpen, FileCheck, Users, Building2, ArrowRight, CheckCircle2, Sparkles, GraduationCap, TrendingUp } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export default function AProposContent() {
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
            <span className="text-[9px] sm:text-[10px] uppercase tracking-[2px] sm:tracking-[2.5px] text-white/50 font-medium">Notre mission</span>
          </div>

          <h1
            className="hero-fade-in font-heading text-[22px] sm:text-[38px] md:text-[52px] lg:text-[66px] font-extralight text-white tracking-[-0.03em] mb-4 sm:mb-5 leading-[1.05]"
            style={{ animationDelay: "0.3s" }}
          >
            À propos de <span className="font-bold text-glow text-tap-red">TAP</span>
          </h1>
          <p
            className="hero-fade-in text-[15px] md:text-[17px] text-white/45 max-w-[460px] leading-[1.7] font-light"
            style={{ animationDelay: "0.5s" }}
          >
            Élever chaque talent au niveau d&apos;exigence des meilleures entreprises.
          </p>

          <div
            className="hero-fade-in flex items-center gap-2 sm:gap-4 mt-10 sm:mt-14"
            style={{ animationDelay: "0.7s" }}
          >
            {[
              { num: "4", label: "Piliers" },
              { num: "IA", label: "Powered" },
              { num: "100%", label: "Maroc" },
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
      {/* Mission & Approche — Premium cards */}
      <section className="py-12 sm:py-20 bg-black relative overflow-hidden">
        <div className="absolute bottom-0 right-[-100px] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.03),transparent_60%)] blur-3xl" />
        <div className="absolute top-[20%] left-[-150px] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.025),transparent_60%)] blur-3xl" />
        <div className="max-w-[1300px] w-[88%] mx-auto relative z-10">
          <div className="reveal text-center mb-10 sm:mb-16">
            <span className="inline-flex items-center gap-3 text-[10px] uppercase tracking-[3px] text-tap-red font-semibold mb-5">
              <span className="w-6 h-[1px] bg-tap-red" />
              Notre vision
              <span className="w-6 h-[1px] bg-tap-red" />
            </span>
            <h2 className="font-heading text-[26px] sm:text-[32px] md:text-[44px] lg:text-[52px] font-extralight text-white tracking-[-0.03em] leading-[1.08] max-w-[650px] mx-auto">
              Réconcilier le <span className="font-bold">potentiel</span> avec le marché.
            </h2>
          </div>

          <div className="reveal-stagger grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {[
              {
                icon: Target,
                title: "Notre mission",
                desc: "Installer une norme d'employabilité pilotée par la donnée. TAP orchestre analyse de CV, scoring et micro-learning pour rendre chaque profil opérationnel.",
                gradient: "from-tap-red/20 via-tap-red/5 to-transparent",
              },
              {
                icon: Lightbulb,
                title: "Notre approche",
                desc: "IA, data science et accompagnement humain réunis dans un parcours d'employabilité complet, mesurable et transparent pour tous les acteurs.",
                gradient: "from-tap-red/15 via-tap-red/5 to-transparent",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="reveal-item group relative card-animated-border rounded-2xl overflow-hidden bg-[#0A0A0A] border border-white/[0.06] hover:border-tap-red/15 transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)] transform-gpu hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_18px_60px_rgba(0,0,0,0.55),0_0_40px_rgba(202,27,40,0.10)]"
              >
                <div className={`absolute top-0 left-0 right-0 h-[120px] bg-gradient-to-b ${item.gradient} pointer-events-none`} />
                {/* Background premium au hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_0%,rgba(202,27,40,0.28),transparent_55%)] blur-[2px] mix-blend-screen" />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(202,27,40,0.10),transparent_55%)]" />
                </div>
                <div className="relative p-6 sm:p-8">
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-tap-red/[0.08] border border-tap-red/10 flex items-center justify-center group-hover:bg-tap-red/15 group-hover:border-tap-red/20 transition-all duration-500">
                      <item.icon size={24} className="text-tap-red" strokeWidth={1.5} />
                    </div>
                  </div>
                  <h3 className="text-[17px] sm:text-[19px] font-bold text-white tracking-[-0.01em] mb-2.5">{item.title}</h3>
                  <p className="text-[13px] sm:text-[14px] text-white/40 leading-[1.7] font-light">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4 Piliers — Timeline circles */}
      <section className="py-12 sm:py-20 bg-black relative overflow-hidden">
        <div className="absolute top-[20%] right-[-150px] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.03),transparent_60%)] blur-3xl" />
        <div className="max-w-[1300px] w-[88%] mx-auto relative z-10">
          <div className="reveal text-center mb-12 sm:mb-20">
            <span className="inline-flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] uppercase tracking-[2px] sm:tracking-[3px] text-tap-red font-semibold mb-4 sm:mb-5">
              <span className="w-6 h-[1px] bg-tap-red" />
              Piliers
              <span className="w-6 h-[1px] bg-tap-red" />
            </span>
            <h2 className="font-heading text-[26px] sm:text-[32px] md:text-[44px] lg:text-[52px] font-extralight text-white tracking-[-0.03em] leading-[1.08]">
              Les fondations de <span className="font-bold">TAP</span>
            </h2>
          </div>

          <div className="relative">
            {/* Connecting line — desktop */}
            <div className="hidden lg:block absolute top-[52px] left-[calc(12.5%+20px)] right-[calc(12.5%+20px)] h-[1px]">
              <div className="reveal-scale-x w-full h-full bg-gradient-to-r from-tap-red/30 via-tap-red/10 to-tap-red/30 origin-left" />
            </div>

            <div className="reveal-stagger grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-5">
              {[
                { icon: BarChart3, title: "Diagnostic précis", desc: "Analyse complète de l'employabilité via un scoring multi-critères piloté par l'IA." },
                { icon: BookOpen, title: "Micro-learning", desc: "Formations ciblées sur les écarts terrain pour combler les lacunes identifiées." },
                { icon: FileCheck, title: "Portfolio vivant", desc: "Un portfolio de compétences dynamique qui évolue avec chaque formation complétée." },
                { icon: TrendingUp, title: "Score transparent", desc: "Notation objective et transparente pour candidats et recruteurs." },
              ].map((pillar, i) => (
                <div
                  key={i}
                  className="reveal-item group relative flex flex-col items-center text-center"
                >
                  <div className="relative mb-6">
                    <div className="w-[104px] h-[104px] rounded-full bg-white/[0.02] border border-white/[0.06] flex items-center justify-center group-hover:border-tap-red/20 transition-colors duration-500">
                      <div className="w-[72px] h-[72px] rounded-full bg-tap-red/[0.08] flex items-center justify-center group-hover:bg-tap-red/15 transition-colors duration-500">
                        <pillar.icon size={28} className="text-tap-red" strokeWidth={1.5} />
                      </div>
                    </div>
                    <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-tap-red/20 border border-tap-red/30 flex items-center justify-center">
                      <span className="text-[11px] font-bold text-tap-red">0{i + 1}</span>
                    </div>
                  </div>
                  <h3 className="text-[17px] sm:text-[18px] font-bold text-white mb-2.5 tracking-[-0.01em]">{pillar.title}</h3>
                  <p className="text-[13px] text-white/35 leading-[1.7] font-light max-w-[260px]">{pillar.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pour qui — Premium audience cards */}
      <section className="py-12 sm:py-20 bg-black relative overflow-hidden">
        <div className="absolute bottom-[10%] left-[-100px] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.025),transparent_60%)] blur-3xl" />
        <div className="max-w-[1300px] w-[88%] mx-auto relative z-10">
          <div className="reveal text-center mb-10 sm:mb-16">
            <span className="inline-flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] uppercase tracking-[2px] sm:tracking-[3px] text-tap-red font-semibold mb-4 sm:mb-5">
              <span className="w-6 h-[1px] bg-tap-red" />
              Audiences
              <span className="w-6 h-[1px] bg-tap-red" />
            </span>
            <h2 className="font-heading text-[26px] sm:text-[32px] md:text-[44px] lg:text-[52px] font-extralight text-white tracking-[-0.03em] leading-[1.08]">
              Pour <span className="font-bold">qui</span> ?
            </h2>
          </div>

          <div className="reveal-stagger grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Entreprises */}
            <div className="reveal-item group relative card-animated-border rounded-2xl overflow-hidden bg-[#0A0A0A] border border-white/[0.06] hover:border-tap-red/15 transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)] transform-gpu hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_18px_60px_rgba(0,0,0,0.55),0_0_40px_rgba(202,27,40,0.10)]">
              {/* Background premium au hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_0%,rgba(202,27,40,0.28),transparent_55%)] blur-[2px] mix-blend-screen" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(202,27,40,0.10),transparent_55%)]" />
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
                {[
                  "Recrutement précis, guidé par les données et l'IA.",
                  "Candidats acculturés, opérationnels dès le jour 1.",
                  "Meilleure rétention grâce à l'accompagnement amont.",
                ].map((item, j) => (
                  <div key={j} className="flex items-start gap-3">
                    <CheckCircle2 size={14} className="text-tap-red/50 mt-[3px] shrink-0" strokeWidth={1.5} />
                    <p className="text-[13px] sm:text-[14px] text-white/45 leading-[1.7] font-light">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Talents */}
            <div className="reveal-item group relative card-animated-border-white rounded-2xl overflow-hidden bg-[#0A0A0A] border border-white/[0.06] hover:border-white/10 transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)] transform-gpu hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_18px_60px_rgba(0,0,0,0.55),0_0_40px_rgba(202,27,40,0.10)]">
              {/* Background premium au hover (blanc) */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_0%,rgba(255,255,255,0.25),transparent_55%)] blur-[2px] mix-blend-screen" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.10),transparent_55%)]" />
              </div>
              <div className="px-5 sm:px-7 py-4 sm:py-5 bg-gradient-to-r from-white/90 to-white/70 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-black/10 flex items-center justify-center">
                    <Users size={17} className="text-black/70" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-[12px] font-bold uppercase tracking-[2px] text-black">Talents</h3>
                </div>
                <ArrowRight size={14} className="text-black/30 group-hover:text-black/60 group-hover:translate-x-1 transition-all duration-300" />
              </div>
              <div className="p-5 sm:p-7 flex flex-col gap-3.5">
                {[
                  "Jeunes diplômés à haut potentiel.",
                  "Profils en reconversion ambitieuse.",
                  "Talents tech et métiers d'avenir.",
                ].map((item, j) => (
                  <div key={j} className="flex items-start gap-3">
                    <CheckCircle2 size={14} className="text-white/25 mt-[3px] shrink-0" strokeWidth={1.5} />
                    <p className="text-[13px] sm:text-[14px] text-white/45 leading-[1.7] font-light">{item}</p>
                  </div>
                ))}
                <div className="mt-1 pt-4 border-t border-white/[0.06]">
                  <p className="text-[12px] font-semibold text-tap-red">100 % gratuit pour les candidats.</p>
                </div>
              </div>
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
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
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
                Rejoignez <span className="font-bold">TAP</span>
              </h3>
              <p className="text-[14px] text-white/40 mb-8 font-light max-w-[520px] mx-auto leading-[1.7]">
                Découvrez la plateforme qui révèle et accélère les talents.
              </p>
              <div className="flex gap-3 flex-wrap justify-center">
                <Link href="/connexion" className="btn-primary group">
                  Découvrir TAP
                  <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
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
