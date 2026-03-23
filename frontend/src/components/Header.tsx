"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const navLinks = [
  { href: "/", label: "Accueil" },
  { href: "/a-propos", label: "À propos" },
  { href: "/equipe", label: "Équipe" },
  { href: "/contact", label: "Contact" },
];

const produitLinks = [
  { href: "/analyse-cv", label: "Analyse IA du CV" },
  { href: "/score-employabilite", label: "Score d'employabilité" },
  { href: "/micro-learning", label: "Micro-learning" },
  { href: "/matching-intelligent", label: "Matching intelligent" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [produitOpen, setProduitOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();
  const initial = (user?.email?.[0] || "").toUpperCase();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnScroll = () => setMenuOpen(false);
    window.addEventListener("scroll", closeOnScroll, { passive: true });
    return () => window.removeEventListener("scroll", closeOnScroll);
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
    setProduitOpen(false);
  }, [pathname]);



  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Montserrat:wght@300;400;500;600&display=swap');

        .header-font { font-family: 'Montserrat', sans-serif; }
        .serif-font  { font-family: 'Cormorant Garamond', serif; }

        /* Hamburger morphing bars */
        .bar { transition: transform 0.45s cubic-bezier(.22,1,.36,1), opacity 0.3s ease, width 0.3s ease; }
      `}</style>

      <header
        className={`header-font fixed left-0 right-0 z-50 transition-[top] duration-500 ease-[cubic-bezier(.22,1,.36,1)] ${
          scrolled ? "top-0" : "top-3 sm:top-4"
        }`}
      >
        {/* ── Desktop / Shared bar ── */}
        <div
          className={`mx-auto transition-all duration-500 ${
            scrolled
              ? "max-w-full bg-white/[0.08] backdrop-blur-2xl border-b border-white/[0.10] py-3 rounded-b-2xl"
              : "max-w-full bg-black/60 backdrop-blur-xl border-b border-white/[0.04] py-3 lg:max-w-[1300px] lg:w-[88%] lg:rounded-full lg:bg-white/[0.05] lg:border lg:border-white/[0.08] lg:py-3 lg:px-2"
          }`}
        >
          <div
            className={`flex items-center justify-between ${
              scrolled ? "max-w-[1300px] w-[88%] mx-auto" : "px-4 sm:px-6"
            }`}
          >
            {/* Logo */}
            <Link href="/" className="relative z-10 shrink-0">
              <Image
                src="/images/logo-white.svg"
                alt="TAP — Plateforme de recrutement IA"
                width={120}
                height={40}
                className="h-[26px] sm:h-[32px] w-auto"
                priority
              />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.slice(0, 1).map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative px-4 py-2 text-[11px] font-medium uppercase tracking-[1.5px] rounded-full transition-all duration-300 ${
                      isActive
                        ? "text-red-500 font-bold"
                        : "text-white/50 hover:text-red-500"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}

              {navLinks.slice(1, 2).map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative px-4 py-2 text-[11px] font-medium uppercase tracking-[1.5px] rounded-full transition-all duration-300 ${
                      isActive
                        ? "text-red-500 font-bold"
                        : "text-white/50 hover:text-red-500"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}

              {/* Produit dropdown */}
              <div className="relative">
                <button
                  className={`flex items-center gap-1 px-4 py-2 text-[11px] font-medium uppercase tracking-[1.5px] rounded-full transition-all duration-300 ${
                    produitLinks.some((l) => pathname === l.href)
                      ? "text-red-500 font-bold"
                      : "text-white/50 hover:text-red-500"
                  }`}
                  onClick={() => setProduitOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={produitOpen}
                >
                  Produit
                  <ChevronDown
                    size={12}
                    className={`transition-transform duration-300 ${produitOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <div
                  className={`absolute top-full left-1/2 -translate-x-1/2 pt-2 transition-all duration-300 ${
                    produitOpen ? "opacity-100 visible" : "opacity-0 invisible"
                  }`}
                  role="menu"
                >
                  <div className="bg-[#0C0C0C]/95 backdrop-blur-2xl border border-white/[0.08] rounded-xl p-2 min-w-[220px] shadow-2xl shadow-black/50">
                    {produitLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        role="menuitem"
                        onClick={() => setProduitOpen(false)}
                        className={`block px-4 py-2.5 text-[12px] rounded-lg transition-all duration-200 ${
                          pathname === link.href
                            ? "text-red-500 font-bold bg-red-500/[0.08]"
                            : "text-white/50 hover:text-white hover:bg-white/[0.04]"
                        }`}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {navLinks.slice(2).map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative px-4 py-2 text-[11px] font-medium uppercase tracking-[1.5px] rounded-full transition-all duration-300 ${
                      isActive
                        ? "text-red-500 font-bold"
                        : "text-white/50 hover:text-red-500"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-2">
              {user ? (
                <Link
                  href="/app"
                  className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl hover:bg-white/[0.06] transition-colors duration-300"
                >
                  <span className="text-[11px] text-white/80 truncate max-w-[180px]">
                    {user.email}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-[11px] font-bold text-white uppercase ring-1 ring-red-600/40">
                    {initial || "?"}
                  </div>
                </Link>
              ) : (
                <>
                  <Link
                    href="/connexion"
                    className="inline-flex items-center px-4 py-2 rounded-full border border-white/40 bg-transparent text-[10px] font-semibold uppercase tracking-[1.5px] text-white/50 hover:border-transparent hover:bg-[#CA1B28] hover:text-white transition-colors duration-300"
                  >
                    Connexion
                  </Link>
                  <Link href="/inscription" className="btn-primary btn-sm">
                    Commencer
                  </Link>
                </>
              )}
            </div>

            {/* ── Mobile hamburger / close ── */}
            <button
              className="lg:hidden relative z-[70] w-9 h-9 flex items-center justify-center rounded-lg bg-white/[0.06] hover:bg-white/[0.10] transition-colors duration-200 border border-white/[0.08]"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={menuOpen}
            >
              {/* Hamburger bars — visible when closed */}
              <span className={`absolute flex flex-col gap-[5px] items-center transition-all duration-300 ${menuOpen ? "opacity-0 scale-75" : "opacity-100 scale-100"}`}>
                <span className="block w-[18px] h-[1.5px] bg-white rounded-full" />
                <span className="block w-[13px] h-[1.5px] bg-white/50 rounded-full self-start" />
                <span className="block w-[18px] h-[1.5px] bg-white rounded-full" />
              </span>

              {/* X — visible when open */}
              <span className={`absolute transition-all duration-300 ${menuOpen ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-50 rotate-90"}`}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M1 1l11 11M12 1L1 12" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </span>
            </button>
          </div>
        </div>

        {/* Overlay (mobile): click outside closes menu */}
        {menuOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* ── Mobile dropdown panel ── */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)] relative z-50 ${
            menuOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
          }`}
          style={{ background: "rgba(6,6,6,0.97)", backdropFilter: "blur(24px)" }}
          role="navigation"
          aria-label="Menu mobile"
        >
          {/* Top border line */}
          <div className="h-[1px] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

          <div className="px-5 py-4 flex flex-col gap-1">

            {/* Accueil + À propos */}
            {navLinks.slice(0, 2).map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-3 rounded-xl text-[13px] font-medium tracking-wide transition-colors duration-200 ${
                    isActive
                      ? "text-red-500 font-bold"
                      : "text-white/50 hover:text-red-500"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="w-1 h-1 rounded-full bg-red-500" />
                  )}
                </Link>
              );
            })}

            {/* Produit accordion */}
            <div>
              <button
                onClick={() => setProduitOpen((v) => !v)}
                className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-[13px] font-medium tracking-wide transition-colors duration-200 ${
                  produitLinks.some((l) => pathname === l.href)
                    ? "text-red-500 font-bold"
                    : "text-white/50 hover:text-red-500"
                }`}
              >
                Produit
                <ChevronDown
                  size={13}
                  strokeWidth={2}
                  className={`text-white/30 transition-transform duration-300 ${produitOpen ? "rotate-180" : ""}`}
                />
              </button>

              <div
                className={`overflow-hidden transition-all duration-400 ${
                  produitOpen ? "max-h-60 opacity-100" : "max-h-0 opacity-0"
                }`}
                style={{ transition: "max-height 0.4s cubic-bezier(.22,1,.36,1), opacity 0.25s ease" }}
              >
                <div className="ml-3 mt-1 mb-1 pl-3 border-l border-white/[0.07] flex flex-col gap-0.5">
                  {produitLinks.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-[12px] tracking-wide transition-colors duration-200 ${
                          isActive
                            ? "text-white font-bold"
                            : "text-white/35 hover:text-white/70 font-light"
                        }`}
                      >
                        {link.label}
                        {isActive && <span className="w-1 h-1 rounded-full bg-red-500" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Équipe + Contact */}
            {navLinks.slice(2).map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-3 rounded-xl text-[13px] font-medium tracking-wide transition-colors duration-200 ${
                    isActive
                      ? "text-red-500 font-bold"
                      : "text-white/50 hover:text-red-500"
                  }`}
                >
                  {link.label}
                  {isActive && <span className="w-1 h-1 rounded-full bg-red-500" />}
                </Link>
              );
            })}

            {/* Auth zone */}
            <div className="mt-2 pt-3 border-t border-white/[0.06]">
              {user ? (
                <Link
                  href="/app"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-[12px] font-bold text-white uppercase shrink-0">
                    {initial || "?"}
                  </div>
                  <span className="text-[12px] text-white/60 truncate">{user.email}</span>
                </Link>
              ) : (
                <div className="flex items-center gap-2 px-1">
                  <Link
                    href="/connexion"
                    onClick={() => setMenuOpen(false)}
                    className="flex-1 bg-transparent border border-white/40 rounded-full text-center py-2.5 text-[11px] uppercase tracking-[1.5px] text-white/50 hover:border-transparent hover:bg-[#CA1B28] hover:text-white transition-colors font-medium"
                  >
                    Connexion
                  </Link>
                  <Link
                    href="/inscription"
                    onClick={() => setMenuOpen(false)}
                    className="flex-1 py-2.5 px-4 bg-red-600 text-center text-white text-[11px] font-semibold uppercase tracking-[1.5px] rounded-full hover:bg-red-500 transition-colors"
                  >
                    Commencer
                  </Link>
                </div>
              )}
            </div>

            {/* Bottom spacing */}
            <div className="h-1" />
          </div>
        </div>
      </header>
    </>
  );
}
