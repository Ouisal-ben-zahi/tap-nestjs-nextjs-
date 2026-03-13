"use client";

import { useEffect, useRef } from "react";

const SELECTOR = ".reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-scale-x, .reveal-fade, .reveal-stagger";

function instantReveal(t: Element) {
  if (t instanceof HTMLElement) {
    t.classList.add("revealed");
    t.style.opacity = "1";
    t.style.transform = "none";
    t.style.transition = "none";
    // Also instant-reveal stagger children
    if (t.classList.contains("reveal-stagger")) {
      t.querySelectorAll(":scope > .reveal-item").forEach((child) => {
        if (child instanceof HTMLElement) {
          child.style.opacity = "1";
          child.style.transform = "none";
          child.style.transition = "none";
        }
      });
    }
  }
}

export function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const targets = el.querySelectorAll(SELECTOR);
    if (targets.length === 0) return;

    const vh = window.innerHeight;

    // On mount: instantly reveal everything already in or above viewport
    targets.forEach((t) => {
      if (t.classList.contains("revealed")) return;
      if (t.getBoundingClientRect().top < vh) {
        instantReveal(t);
      }
    });

    // IntersectionObserver for elements entering viewport later (CSS transitions handle animation)
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px 50px 0px" }
    );

    targets.forEach((t) => {
      if (!t.classList.contains("revealed")) {
        observer.observe(t);
      }
    });

    // Scroll fallback
    const onScroll = () => {
      const currentVh = window.innerHeight;
      targets.forEach((t) => {
        if (t.classList.contains("revealed")) return;
        if (t.getBoundingClientRect().top < currentVh - 50) {
          t.classList.add("revealed");
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return ref;
}
