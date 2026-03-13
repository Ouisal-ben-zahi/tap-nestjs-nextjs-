"use client";

import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-40 w-10 h-10 rounded-full bg-white/[0.06] backdrop-blur-xl border border-white/[0.1] flex items-center justify-center hover:bg-tap-red/20 hover:border-tap-red/30 transition-all duration-300 cursor-pointer group"
      aria-label="Retour en haut"
    >
      <ArrowUp size={16} className="text-white/40 group-hover:text-tap-red transition-colors duration-300" strokeWidth={1.5} />
    </button>
  );
}
