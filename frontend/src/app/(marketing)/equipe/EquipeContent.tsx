"use client";

import { ArrowUpRight, ArrowRight, Linkedin, CheckCircle2 } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const founders = [
  {
    name: "Imad El Boukhiari",
    role: "Co-Founder & CEO",
    photo: "/images/imad-el-boukhiari.webp",
    bio: "Spécialiste IA et blockchain, architecte de la vision produit TAP.",
    focusItems: [
      "IA (LLM) & systèmes intelligents",
      "Scoring & matching intelligent",
      "Vision produit & stratégie",
    ],
    linkedin: "https://www.linkedin.com/in/imad-el-boukhiari-626032250/",
  },
  {
    name: "Zakaria Ajmil",
    role: "Co-Founder & COO",
    photo: "/images/zakaria-Ajmil.webp",
    bio: "Professeur d'économie, stratège marketing et développement marché.",
    focusItems: [
      "Marketing & communication",
      "Acquisition & activation marché",
      "Partenariats universités",
    ],
    linkedin: "https://www.linkedin.com/in/zakaria-a-130421145/",
  },
];

const team = [
  {
    name: "Hajar El Aouni",
    role: "AI Product Lead",
    photo: "/images/Hajar-el-aouni.webp",
    focus: "Intégration IA & scoring",
    linkedin: "https://www.linkedin.com/in/hajar-el-aouni/",
  },
  {
    name: "Ouissal Ben Zahi",
    role: "Lead Full-Stack Dev",
    photo: "/images/Ouissal-ben-zahi.webp",
    focus: "Architecture & déploiement",
    linkedin: "https://www.linkedin.com/in/ouissal-ben-zahi/",
  },
  {
    name: "Juwher",
    role: "Product Designer",
    photo: "/images/Juwher-Profil.webp",
    focus: "UX & design system",
    linkedin: "https://www.linkedin.com/in/juwher-visual-4a485336a/",
  },
];

export default function EquipeContent() {
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
            <span className="text-[9px] sm:text-[10px] uppercase tracking-[2px] sm:tracking-[2.5px] text-white/60 font-medium">L&apos;équipe</span>
          </div>

          <h1
            className="hero-fade-in font-heading text-[22px] sm:text-[38px] md:text-[52px] lg:text-[66px] font-extralight text-white tracking-[-0.03em] mb-4 sm:mb-5 leading-[1.05]"
            style={{ animationDelay: "0.3s" }}
          >
            L&apos;équipe <span className="font-bold text-glow text-tap-red">TAP</span>
          </h1>
          <p
            className="hero-fade-in text-[15px] md:text-[17px] text-white/50 max-w-[440px] leading-[1.7] font-light"
            style={{ animationDelay: "0.5s" }}
          >
            Tech, stratégie et design réunis pour transformer l&apos;employabilité au Maroc.
          </p>

          <div
            className="hero-fade-in flex items-center gap-2 sm:gap-4 mt-10 sm:mt-14"
            style={{ animationDelay: "0.7s" }}
          >
            {[
              { num: "2", label: "Fondateurs" },
              { num: "5", label: "Membres" },
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
      {/* Fondateurs — Premium cards */}
      <section className="py-16 sm:py-28 bg-black relative overflow-hidden">
        <div className="absolute top-0 left-[20%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.04),transparent_60%)] blur-3xl" />
        <div className="absolute bottom-[10%] right-[-100px] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.025),transparent_60%)] blur-3xl" />
        <div className="max-w-[1300px] w-[88%] mx-auto relative z-10">
          <div className="reveal text-center mb-10 sm:mb-16">
            <span className="inline-flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] uppercase tracking-[2px] sm:tracking-[3px] text-tap-red font-semibold mb-4 sm:mb-5">
              <span className="w-6 h-[1px] bg-tap-red" />
              Leadership
              <span className="w-6 h-[1px] bg-tap-red" />
            </span>
            <h2 className="font-heading text-[26px] sm:text-[32px] md:text-[44px] lg:text-[52px] font-extralight text-white tracking-[-0.03em] leading-[1.1]">
              <span className="font-bold">Fondateurs</span>
            </h2>
          </div>

          <div className="reveal-stagger grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {founders.map((member, i) => (
              <div
                key={member.name}
                className="reveal-item group relative rounded-2xl overflow-hidden bg-[#0A0A0A] border border-white/[0.06] hover:border-tap-red/15 transition-all duration-500"
              >
                {/* Top gradient accent */}
                <div className="absolute top-0 left-0 right-0 h-[150px] bg-gradient-to-b from-tap-red/[0.06] to-transparent pointer-events-none" />

                <div className="relative flex max-sm:flex-col">
                  {/* Photo */}
                  <div className="relative w-[220px] max-sm:w-full max-sm:h-[250px] shrink-0 overflow-hidden">
                    <img
                      src={member.photo}
                      alt={member.name}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0A0A0A]/80 max-sm:bg-gradient-to-t max-sm:from-[#0A0A0A]/70 max-sm:via-transparent max-sm:to-transparent" />
                    {/* Red accent line */}
                    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-tap-red/50 to-transparent sm:hidden" />
                    <div className="absolute top-0 right-0 h-full w-[2px] bg-gradient-to-b from-tap-red/30 to-transparent max-sm:hidden" />
                  </div>

                  {/* Infos */}
                  <div className="flex-1 p-5 sm:p-7 flex flex-col justify-center">
                    <span className="text-[9px] font-bold uppercase tracking-[2px] text-tap-red mb-2">{member.role}</span>
                    <h3 className="text-[20px] sm:text-[22px] font-bold text-white mb-2 tracking-[-0.02em]">{member.name}</h3>
                    <p className="text-[13px] text-white/40 leading-[1.7] mb-5 font-light">{member.bio}</p>

                    <div className="flex flex-col gap-2.5 mb-5">
                      {member.focusItems.map((item, j) => (
                        <div key={j} className="flex items-center gap-2.5">
                          <CheckCircle2 size={13} className="text-tap-red/50 shrink-0" strokeWidth={1.5} />
                          <p className="text-[12px] sm:text-[13px] text-white/45 font-light">{item}</p>
                        </div>
                      ))}
                    </div>

                    <a
                      href={member.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[11px] font-semibold text-white/30 hover:text-tap-red transition-colors duration-300 w-fit group/link"
                    >
                      <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center group-hover/link:bg-tap-red/10 transition-colors duration-300">
                        <Linkedin size={12} className="group-hover/link:text-tap-red transition-colors duration-300" />
                      </div>
                      LinkedIn
                      <ArrowUpRight size={10} />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Équipe opérationnelle — Premium centered cards */}
      <section className="py-16 sm:py-28 bg-tap-dark relative overflow-hidden">
        <div className="absolute bottom-0 right-[-100px] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.04),transparent_60%)] blur-3xl" />
        <div className="max-w-[1300px] w-[88%] mx-auto relative z-10">
          <div className="reveal text-center mb-10 sm:mb-16">
            <span className="inline-flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] uppercase tracking-[2px] sm:tracking-[3px] text-tap-red font-semibold mb-4 sm:mb-5">
              <span className="w-6 h-[1px] bg-tap-red" />
              Équipe
              <span className="w-6 h-[1px] bg-tap-red" />
            </span>
            <h2 className="font-heading text-[26px] sm:text-[32px] md:text-[44px] lg:text-[52px] font-extralight text-white tracking-[-0.03em] leading-[1.1]">
              Équipe <span className="font-bold">opérationnelle</span>
            </h2>
          </div>

          <div className="reveal-stagger grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {team.map((member, i) => (
              <div
                key={member.name}
                className="reveal-item group relative rounded-2xl overflow-hidden bg-[#0A0A0A] border border-white/[0.06] hover:border-tap-red/15 transition-all duration-500"
              >
                {/* Top gradient */}
                <div className="absolute top-0 left-0 right-0 h-[120px] bg-gradient-to-b from-tap-red/[0.04] to-transparent pointer-events-none" />

                <div className="relative p-6 sm:p-8 text-center">
                  {/* Photo — double circle border */}
                  <div className="relative w-[120px] h-[120px] mx-auto mb-6">
                    <div className="absolute inset-0 rounded-full border border-white/[0.06] group-hover:border-tap-red/20 transition-colors duration-500" />
                    <div className="absolute inset-[6px] rounded-full border border-tap-red/10 group-hover:border-tap-red/25 transition-colors duration-500 overflow-hidden">
                      <img
                        src={member.photo}
                        alt={member.name}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-110"
                      />
                    </div>
                  </div>

                  <h3 className="text-[17px] sm:text-[18px] font-bold text-white mb-1.5 tracking-[-0.01em]">{member.name}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-[2px] text-tap-red mb-3">{member.role}</p>
                  <p className="text-[13px] text-white/35 font-light">{member.focus}</p>

                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-5 text-[11px] font-semibold text-white/25 hover:text-tap-red transition-colors duration-300 group/link"
                  >
                    <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center group-hover/link:bg-tap-red/10 transition-colors duration-300">
                      <Linkedin size={12} className="group-hover/link:text-tap-red transition-colors duration-300" />
                    </div>
                    LinkedIn
                    <ArrowUpRight size={10} />
                  </a>
                </div>
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
              Rejoignez <span className="font-bold">l&apos;aventure</span>
            </h2>
            <p className="text-[14px] sm:text-[15px] text-white/40 max-w-[400px] mx-auto mb-8 leading-[1.7] font-light">
              Une équipe passionnée qui révolutionne l&apos;employabilité au Maroc.
            </p>
            <a href="https://demo.tap-hr.com/" target="_blank" rel="noopener noreferrer" className="btn-primary group">
              Découvrir TAP
              <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}
