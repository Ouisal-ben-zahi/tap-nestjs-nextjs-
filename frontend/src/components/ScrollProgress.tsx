"use client";

import { useEffect, useRef } from "react";

export default function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      el.style.transform = `scaleX(${scrollTop / (scrollHeight - clientHeight)})`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      ref={ref}
      className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-tap-red to-tap-red/60 z-[60] origin-left"
      style={{ transform: "scaleX(0)" }}
    />
  );
}
