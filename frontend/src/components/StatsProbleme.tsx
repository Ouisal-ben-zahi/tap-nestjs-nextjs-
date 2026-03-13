"use client";

import { useRef, useEffect, useState } from "react";
import { AlertTriangle, EyeOff, UserX } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); obs.disconnect(); }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 2000;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      setCount(Math.floor(eased * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target]);

  return <span ref={ref} className="tabular-nums">{count}{suffix}</span>;
}

const stats = [
  { value: 80, suffix: "%", label: "Candidatures filtrées", icon: AlertTriangle, desc: "avant d'être lues par un humain" },
  { value: 45, suffix: "%", label: "Diplômés invisibles", icon: EyeOff, desc: "malgré leurs compétences réelles" },
  { value: 35, suffix: "%", label: "Talents perdus", icon: UserX, desc: "à cause d'un CV mal formaté" },
];

export default function StatsProbleme() {
  const containerRef = useScrollReveal();

  return (
    <section className="relative py-16 sm:py-32 bg-black overflow-hidden" ref={containerRef}>
      <div className="absolute top-0 right-[20%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.03),transparent_60%)] blur-3xl floating-orb" />

      <div className="max-w-[1300px] w-[88%] mx-auto relative z-10">
        <div className="reveal text-center mb-10 sm:mb-20">
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

        <div className="reveal-stagger grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="reveal-item group relative rounded-2xl overflow-hidden bg-[#0A0A0A] border border-white/[0.06] hover:border-tap-red/15 transition-all duration-500 cursor-default"
            >
              <div className="absolute top-0 left-0 right-0 h-[100px] bg-gradient-to-b from-tap-red/[0.04] to-transparent pointer-events-none" />
              <div className="relative p-6 sm:p-8 text-center">
                <div className="w-12 h-12 rounded-xl bg-tap-red/[0.08] border border-tap-red/10 flex items-center justify-center mx-auto mb-5 group-hover:bg-tap-red/15 group-hover:border-tap-red/20 transition-all duration-500">
                  <stat.icon size={22} className="text-tap-red" strokeWidth={1.5} />
                </div>
                <div className="text-[48px] sm:text-[64px] md:text-[72px] font-bold text-white leading-none tracking-[-0.05em] mb-2 transition-all duration-500 group-hover:text-glow">
                  <Counter target={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-[12px] font-semibold text-white/50 uppercase tracking-[2px] mb-1.5">{stat.label}</p>
                <p className="text-[12px] text-white/25 font-light">{stat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
