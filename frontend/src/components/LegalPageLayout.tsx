"use client";

import type { ReactNode } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

interface LegalSection {
  icon: ReactNode;
  title: string;
  content: string[];
}

interface LegalPageLayoutProps {
  badge: string;
  title: ReactNode;
  subtitle: string;
  sections: LegalSection[];
}

export default function LegalPageLayout({ badge, title, subtitle, sections }: LegalPageLayoutProps) {
  const containerRef = useScrollReveal();

  return (
    <div>
      {/* Hero — compact & clean */}
      <section className="relative min-h-[40vh] sm:min-h-[55vh] flex items-end overflow-hidden bg-black">
        <div className="absolute inset-0 z-0">
          <img src="/images/bgpages.webp" alt="Arrière-plan TAP" className="w-full h-full object-cover scale-105" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60" />
        </div>

        <div className="relative z-10 w-[88%] max-w-[1300px] mx-auto pb-12 sm:pb-16 pt-[140px] sm:pt-[170px]">
          <div className="hero-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="inline-flex items-center gap-2 sm:gap-2.5 px-4 sm:px-5 py-2 sm:py-2.5 mb-5 sm:mb-6 glass rounded-full">
              <span className="relative w-2 h-2">
                <span className="absolute inset-0 bg-tap-red rounded-full animate-ping opacity-75" />
                <span className="relative block w-2 h-2 bg-tap-red rounded-full" />
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-[2px] sm:tracking-[2.5px] text-white/60 font-medium">{badge}</span>
            </div>
          </div>

          <h1 className="hero-fade-in font-heading text-[22px] sm:text-[38px] md:text-[48px] lg:text-[56px] font-extralight text-white tracking-[-0.03em] mb-3 sm:mb-4 leading-[1.05]" style={{ animationDelay: "0.3s" }}>
            {title}
          </h1>
          <p className="hero-fade-in text-[14px] md:text-[16px] text-white/45 max-w-[440px] leading-[1.7] font-light" style={{ animationDelay: "0.5s" }}>
            {subtitle}
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[150px] bg-gradient-to-t from-black to-transparent z-[5]" />
      </section>

      {/* Table of contents + Content */}
      <section className="py-10 sm:py-16 bg-black relative overflow-hidden">
        <div className="absolute top-[5%] right-[-100px] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.03),transparent_60%)] blur-3xl" />
        <div ref={containerRef} className="max-w-[900px] w-[88%] mx-auto relative z-10">

          {/* Quick nav */}
          <div className="reveal card-solid rounded-2xl p-5 sm:p-6 mb-10 sm:mb-14">
            <p className="text-[10px] uppercase tracking-[2px] text-tap-red font-semibold mb-4">Sommaire</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {sections.map((section, i) => (
                <a
                  key={section.title}
                  href={`#section-${i}`}
                  className="flex items-center gap-2.5 py-2 px-3 rounded-lg hover:bg-white/[0.02] transition-colors duration-300 group"
                >
                  <span className="text-[11px] font-bold text-tap-red/40 w-5">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-[13px] text-white/45 group-hover:text-white/65 transition-colors duration-300 font-light">{section.title}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Sections */}
          <div className="reveal-stagger flex flex-col gap-6 sm:gap-8">
            {sections.map((section, i) => (
              <div
                key={section.title}
                id={`section-${i}`}
                className="reveal-item card-solid rounded-2xl p-5 sm:p-7 group scroll-mt-24"
              >
                <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-5">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-tap-red/10 flex items-center justify-center shrink-0 group-hover:bg-tap-red/15 transition-colors duration-500">
                    <span className="text-tap-red">{section.icon}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-white/20 uppercase tracking-[2px]">Article {i + 1}</span>
                    <h2 className="text-[17px] sm:text-[20px] font-bold text-white tracking-[-0.01em] mt-0.5">{section.title}</h2>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 sm:gap-3 pl-12 sm:pl-14">
                  {section.content.map((paragraph, j) => (
                    <p key={j} className="text-[13px] sm:text-[14px] text-white/40 leading-[1.8] font-light">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="reveal-fade mt-12 sm:mt-16 text-center">
            <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-6" />
            <p className="text-[12px] text-white/20 font-light">Dernière mise à jour : Mars 2026</p>
            <p className="text-[11px] text-white/15 font-light mt-1">
              Questions ? Contactez-nous à{" "}
              <a href="mailto:tap@entrepreneursmorocco.com" className="text-tap-red/50 hover:text-tap-red transition-colors duration-300">
                tap@entrepreneursmorocco.com
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
