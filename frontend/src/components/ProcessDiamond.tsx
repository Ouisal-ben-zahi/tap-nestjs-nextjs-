"use client";

import type { LucideIcon } from "lucide-react";

export type ProcessStep = {
  icon: LucideIcon;
  title: string;
  label: string;
  desc: string;
};

type ProcessDiamondProps = {
  step: ProcessStep;
  index: number;
  /** fill = occupe la cellule (grille) · sm/md = tailles fixes */
  size?: "md" | "sm" | "fill";
};

export function ProcessDiamond({ step, index, size = "md" }: ProcessDiamondProps) {
  const Icon = step.icon;
  const box =
    size === "fill"
      ? "mx-auto aspect-square w-full min-w-0 max-w-[min(100%,228px)]"
      : size === "sm"
        ? "w-[min(182px,80vw)] h-[min(182px,80vw)] lg:w-[170px] lg:h-[170px]"
        : "w-[min(228px,86vw)] h-[min(228px,86vw)] sm:w-[228px] sm:h-[228px]";
  const iconSize = size === "fill" ? 28 : size === "sm" ? 24 : 28;
  const numClass =
    size === "fill"
      ? "text-[44px] sm:text-[48px] lg:text-[52px]"
      : "text-[44px] sm:text-[48px]";
  const titleClass =
    size === "fill" ? "text-[12px] sm:text-[13px] lg:text-[14px]" : "text-[13px] sm:text-[14px]";
  const descClass =
    size === "fill"
      ? "text-[10px] sm:text-[11px] lg:text-[12px]"
      : "text-[10px] sm:text-[11px] lg:text-[12px]";

  return (
    <div
      className="group relative flex flex-col items-center justify-center"
      role="article"
      aria-label={`Étape ${index + 1} — ${step.title}`}
    >
      <div className={`relative z-[1] ${box} rounded-[1.1rem] processus-card-premium`}>
        <div className="processus-card-inner absolute inset-0 -rotate-45 flex flex-col items-center justify-center px-3.5 py-3 sm:px-5 sm:py-3.5">
          <div className="mb-2.5 sm:mb-3 flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04]">
            <Icon className="text-tap-red" strokeWidth={1.2} size={iconSize} />
          </div>
          <div className="flex w-full max-w-[94%] items-start gap-2">
            <span className={`${numClass} shrink-0 tabular-nums font-semibold leading-[0.82] text-tap-red`}>
              {index + 1}
            </span>
            <div className="min-w-0 flex-1 pt-0.5 text-left">
              <h3 className={`${titleClass} font-bold uppercase tracking-[0.18em] text-white leading-tight`}>
                {step.label}
              </h3>
              <p className={`${descClass} mt-1.5 leading-[1.55] font-light text-white/[0.48]`}>{step.desc}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
