"use client";

import { useEffect, useState } from "react";

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export default function ScoreRing({
  score,
  size = 200,
  strokeWidth = 12,
  label = "Score global",
}: ScoreRingProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  const clampedScore = Math.max(0, Math.min(100, score ?? 0));

  useEffect(() => {
    let frame: number;
    const duration = 800;
    const start = performance.now();
    const startFrom = animatedScore;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = startFrom + (clampedScore - startFrom) * eased;

      setAnimatedScore(Math.round(value));

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [clampedScore, animatedScore]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;
  const center = size / 2;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#ef4444"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-white">{animatedScore}</span>
          <span className="text-[11px] text-white/40 uppercase tracking-wider">
            /100
          </span>
        </div>
      </div>
      <p className="text-[13px] text-white/50 font-medium">{label}</p>
    </div>
  );
}
