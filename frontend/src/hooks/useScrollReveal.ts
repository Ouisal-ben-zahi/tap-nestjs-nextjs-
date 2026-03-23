"use client";

import { useEffect, useRef } from "react";

const SELECTOR =
  ".reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-scale-x, .reveal-fade, .reveal-stagger, .reveal-item";

function getInitialTransform(el: Element) {
  if (!(el instanceof HTMLElement)) return "none";
  if (el.classList.contains("reveal-left")) return "translateX(-24px)";
  if (el.classList.contains("reveal-right")) return "translateX(24px)";
  if (el.classList.contains("reveal-scale-x")) return "scaleX(0.85)";
  if (el.classList.contains("reveal-scale")) return "translateY(14px) scale(0.98)";
  if (el.classList.contains("reveal-fade")) return "translateY(16px)";
  return "translateY(18px)";
}

function revealWithAnimation(el: Element) {
  if (!(el instanceof HTMLElement)) return;
  el.classList.add("revealed");
  el.style.opacity = "1";
  el.style.transform = "none";
}

function setupInitialStyle(el: Element) {
  if (!(el instanceof HTMLElement)) return;
  // Respect prefers-reduced-motion
  const reduce =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    // On “révèle” direct sans animation
    el.classList.add("revealed");
    el.style.opacity = "1";
    el.style.transform = "none";
    el.style.transition = "none";
    return;
  }

  el.style.opacity = "0";
  el.style.transform = getInitialTransform(el);
  el.style.transition =
    "opacity 700ms cubic-bezier(0.22, 1, 0.36, 1), transform 700ms cubic-bezier(0.22, 1, 0.36, 1)";

  // Cas particulier pour une ligne (scaleX)
  if (el.classList.contains("reveal-scale-x")) el.style.transformOrigin = "left center";
}

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

    // On mount: on “setup” seulement ce qui est hors viewport,
    // et on révèle immédiatement ce qui est déjà visible.
    targets.forEach((t) => {
      if (t.classList.contains("revealed")) return;
      if (t.getBoundingClientRect().top < vh) instantReveal(t);
      else setupInitialStyle(t);
    });

    // IntersectionObserver for elements entering viewport later (CSS transitions handle animation)
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            revealWithAnimation(entry.target);
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
