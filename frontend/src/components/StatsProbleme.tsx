"use client";

import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, EyeOff, UserX, FileText, SearchX } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

type ProblemCard = {
  icon: ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  title: string;
  desc: string;
  accent: "red" | "white";
};

function circularDistance(i: number, active: number, n: number) {
  // Shortest distance on a circular ring (works for odd n, range: -2..2 for n=5)
  const half = Math.floor(n / 2);
  let diff = i - active;
  diff = ((diff % n) + n) % n; // 0..n-1
  if (diff > half) diff -= n; // negative wrap
  return diff; // -half..half
}

const problemCards: ProblemCard[] = [
  {
    icon: AlertTriangle,
    title: "Tri trop rapide",
    desc: "Des profils prometteurs sont écartés avant même d'être évalués correctement.",
    accent: "red",
  },
  {
    icon: EyeOff,
    title: "Compétences masquées",
    desc: "Les forces réelles des talents ne ressortent pas toujours dans le CV.",
    accent: "red",
  },
  {
    icon: UserX,
    title: "Potentiel sous-estimé",
    desc: "Les informations pertinentes sont noyées et difficiles à comparer objectivement.",
    accent: "white",
  },
  {
    icon: FileText,
    title: "Signal difficile à lire",
    desc: "Le format et le bruit rendent la lecture lente et la décision moins fiable.",
    accent: "white",
  },
  {
    icon: SearchX,
    title: "Matching imprécis",
    desc: "L'alignement recruteur/talent n'est pas assez clair pour des décisions rapides.",
    accent: "red",
  },
];

export default function StatsProbleme() {
  const containerRef = useScrollReveal();
  const n = problemCards.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const stepPx = useMemo(() => {
    if (typeof window === "undefined") return 300;
    return window.innerWidth < 640 ? 240 : window.innerWidth < 1024 ? 280 : 300;
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % n);
    }, 4200);
    return () => window.clearInterval(id);
  }, [paused, n]);

  const onPrev = () => setActiveIndex((i) => (i - 1 + n) % n);
  const onNext = () => setActiveIndex((i) => (i + 1) % n);

  return (
    <section className="relative py-10 sm:py-16 bg-black overflow-hidden" ref={containerRef}>
      <div className="absolute top-0 right-[20%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.03),transparent_60%)] blur-3xl floating-orb" />

      <div className="max-w-[1300px] w-[88%] mx-auto relative z-10">
        <div className="reveal text-center mb-2 sm:mb-4">
          <span className="inline-flex items-center gap-3 text-[10px] uppercase tracking-[3px] text-tap-red font-semibold mb-5">
            <span className="reveal-scale-x w-6 h-[1px] bg-tap-red origin-right" />
            Le problème
            <span className="reveal-scale-x w-6 h-[1px] bg-tap-red origin-left" />
          </span>
          <h2 className="font-heading text-[26px] sm:text-[32px] md:text-[44px] lg:text-[56px] font-extralight text-white tracking-[-0.03em] leading-[1.08]">
            Rejetés avant d&apos;être{" "}
            <span className="text-glow text-tap-red font-medium">compris</span>.
          </h2>
        </div>

        <div className="reveal relative">
          {/* Carousel buttons */}
          <button
            type="button"
            onClick={onPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-[5] w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-tap-red/25 hover:bg-tap-red/10 transition-all duration-300 hidden sm:flex items-center justify-center"
            aria-label="Précédent"
          >
            <span className="text-white/70 text-[18px] leading-none select-none">&lt;</span>
          </button>
          <button
            type="button"
            onClick={onNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-[5] w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-tap-red/25 hover:bg-tap-red/10 transition-all duration-300 hidden sm:flex items-center justify-center"
            aria-label="Suivant"
          >
            <span className="text-white/70 text-[18px] leading-none select-none">&gt;</span>
          </button>

          <div
            className="relative mx-auto mt-0 sm:mt-1 h-[420px] sm:h-[460px] overflow-visible"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {/* Cards layer */}
            {problemCards.map((card, i) => {
              const diff = circularDistance(i, activeIndex, n);
              const distance = Math.abs(diff);

              const isActive = diff === 0;
              const showCard = distance <= 1; // 3 cartes visibles (left / center / right)
              const opacity = isActive ? 1 : distance === 1 ? 0.78 : 0;
              const blur = isActive ? 0 : distance === 1 ? 1.5 : 10;
              // Important: supprimer le scale évite l'impression de mouvement haut/bas.
              const scale = 1;
              // La profondeur est gérée via opacity/blur + zIndex (sans déformation verticale).
              const translateY = 0;
              const translateX = diff * stepPx;
              const zIndex = 100 - distance;

              return (
                <div
                  key={card.title}
                  className={[
                    "absolute left-1/2 top-1/2",
                    "flex w-[min(300px,88vw)] flex-col aspect-[3/4]",
                    "rounded-2xl overflow-hidden",
                    "transition-[transform,opacity,filter] duration-700 ease-[cubic-bezier(.22,1,.36,1)]",
                    isActive
                      ? "bg-[#0C0C0C] border-2 border-[#CA1B28] shadow-[0_8px_36px_rgba(202,27,40,0.22),0_2px_20px_rgba(0,0,0,0.45)] ring-1 ring-[#CA1B28]/30"
                      : "bg-[#0A0A0A] border border-white/[0.08] pointer-events-none",
                    "will-change-transform",
                  ].join(" ")}
                  style={{
                    transform: `translate(-50%, -50%) translateX(${translateX}px) translateY(${translateY}px) scale(${scale})`,
                    opacity,
                    filter: `blur(${blur}px)`,
                    zIndex,
                    // Empêche tout impact visuel quand on n'est pas dans le "slot" visible
                    visibility: showCard ? "visible" : "hidden",
                  }}
                >
                  {!isActive && (
                    <>
                      <div
                        className={[
                          "absolute inset-0 opacity-70",
                          card.accent === "red"
                            ? "bg-[radial-gradient(circle_at_30%_20%,rgba(202,27,40,0.18),transparent_50%)]"
                            : "bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.10),transparent_50%)]",
                        ].join(" ")}
                      />
                      <div className="absolute top-0 left-0 right-0 h-[120px] bg-gradient-to-b from-tap-red/[0.06] to-transparent pointer-events-none" />
                    </>
                  )}
                  <div className="relative flex flex-1 flex-col justify-center p-6 sm:p-7 text-center min-h-0">
                    <div
                      className={[
                        "mb-5 sm:mb-6 mx-auto flex shrink-0 items-center justify-center rounded-full border transition-colors duration-700",
                        isActive
                          ? "h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem] border-[#CA1B28]/55 bg-[#CA1B28]/18 shadow-[0_0_28px_rgba(202,27,40,0.35)]"
                          : "h-14 w-14 sm:h-16 sm:w-16 border-white/[0.08] bg-white/[0.04]",
                      ].join(" ")}
                    >
                      <card.icon
                        className={isActive ? "text-[#ff5c6a]" : "text-tap-red"}
                        strokeWidth={isActive ? 1.4 : 1.25}
                        size={isActive ? 32 : 28}
                      />
                    </div>
                    <h3
                      className={[
                        "text-[19px] sm:text-[22px] md:text-[24px] font-bold tracking-[-0.02em] mb-2.5 leading-tight",
                        isActive ? "text-white drop-shadow-[0_1px_12px_rgba(0,0,0,0.45)]" : "text-white/88",
                      ].join(" ")}
                    >
                      {card.title}
                    </h3>
                    <p
                      className={[
                        "text-[13px] font-light leading-[1.75]",
                        isActive ? "text-white/80" : "text-white/35",
                      ].join(" ")}
                    >
                      {card.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dots (hidden on mobile) */}
          <div className="hidden sm:flex items-center justify-center gap-2 mt-3 sm:mt-4">
            {problemCards.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Aller à la carte ${i + 1}`}
                onClick={() => setActiveIndex(i)}
                className={[
                  "w-2.5 h-2.5 rounded-full transition-all duration-300",
                  i === activeIndex ? "bg-tap-red/90 w-7" : "bg-white/20 hover:bg-white/30",
                ].join(" ")}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
