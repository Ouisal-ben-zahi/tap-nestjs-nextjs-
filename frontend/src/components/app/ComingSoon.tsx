"use client";

import Link from "next/link";
import { ArrowLeft, Sparkles, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export default function ComingSoon({ title, description, icon: Icon }: ComingSoonProps) {
  return (
    <div className="max-w-[520px] mx-auto text-center py-16 sm:py-24">
      {/* Glow background */}
      <div className="relative inline-block mb-8">
        <div className="absolute inset-0 w-full h-full bg-[radial-gradient(circle,rgba(202,27,40,0.12),transparent_65%)] blur-3xl scale-[2.5] pointer-events-none" />
        <div className="relative card-animated-border rounded-2xl overflow-hidden">
          <div className="w-20 h-20 rounded-2xl bg-tap-card border border-white/[0.06] flex items-center justify-center">
            <Icon size={32} className="text-tap-red/60" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      <h1 className="text-[26px] sm:text-[34px] font-bold text-white tracking-[-0.03em] font-heading mb-4">
        {title}
      </h1>
      <p className="text-white/45 text-[14px] sm:text-[15px] leading-relaxed mb-10 font-light max-w-sm mx-auto">
        {description}
      </p>

      {/* Badge */}
      <div className="inline-flex items-center gap-2.5 px-5 py-2.5 mb-10 rounded-full bg-tap-red/[0.06] border border-tap-red/15">
        <Clock size={13} className="text-tap-red/70" />
        <span className="text-[10px] uppercase tracking-[2.5px] text-tap-red/70 font-semibold">
          Bientôt disponible
        </span>
      </div>

      <div className="pt-6 border-t border-white/[0.04]">
        <Link
          href="/app"
          className="inline-flex items-center gap-2 text-[13px] text-white/45 hover:text-white/70 transition-colors"
        >
          <ArrowLeft size={14} />
          Retour au dashboard
        </Link>
      </div>
    </div>
  );
}
