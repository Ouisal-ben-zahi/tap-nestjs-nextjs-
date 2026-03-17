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
  const pathname = usePathname();
  const { user } = useAuth();
  const initial = (user?.email?.[0] || "").toUpperCase();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className={`mx-auto transition-all duration-500 hero-fade-in ${
        scrolled
          ? "max-w-full bg-black/70 backdrop-blur-2xl border-b border-white/[0.04] py-3"
          : "max-w-[1300px] w-[92%] sm:w-[88%] mt-3 sm:mt-4 rounded-full bg-white/[0.05] backdrop-blur-xl border border-white/[0.08] py-2.5 sm:py-3 px-1 sm:px-2"
      }`}>
        <div className={`flex items-center justify-between ${scrolled ? "max-w-[1300px] w-[88%] mx-auto" : "px-3 sm:px-5"}`}>
          <Link href="/" className="cursor-pointer relative z-10 shrink-0">
            <Image
              src="/images/logo-white.svg"
              alt="TAP — Plateforme de recrutement IA"
              width={120}
              height={40}
              className="h-[26px] sm:h-[32px] w-auto"
              priority
            />
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-4 py-2 text-[11px] font-medium uppercase tracking-[1.5px] rounded-full transition-all duration-300 cursor-pointer ${
                    isActive
                      ? "text-white bg-white/[0.1]"
                      : "text-white/50 hover:text-white/70 hover:bg-white/[0.04]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

            <div className="relative group">
              <button
                className={`flex items-center gap-1 px-4 py-2 text-[11px] font-medium uppercase tracking-[1.5px] rounded-full transition-all duration-300 cursor-pointer ${
                  produitLinks.some((l) => pathname === l.href)
                    ? "text-white bg-white/[0.1]"
                    : "text-white/50 hover:text-white/70 hover:bg-white/[0.04]"
                }`}
                aria-haspopup="menu"
              >
                Produit
                <ChevronDown size={12} className="transition-transform duration-300 group-hover:rotate-180" />
              </button>
              <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300" role="menu">
                <div className="bg-[#0C0C0C]/95 backdrop-blur-2xl border border-white/[0.08] rounded-xl p-2 min-w-[220px] shadow-2xl shadow-black/50">
                  {produitLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      role="menuitem"
                      className={`block px-4 py-2.5 text-[12px] rounded-lg transition-all duration-200 ${
                        pathname === link.href
                          ? "text-tap-red bg-tap-red/[0.08]"
                          : "text-white/50 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </nav>

          <div className="hidden lg:flex items-center gap-2">
            {user ? (
              <Link
                href="/app"
                className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors duration-300 cursor-pointer"
              >
                <span className="text-[11px] text-white/70 truncate max-w-[180px] text-left">
                  {user.email}
                </span>
                <div className="w-7 h-7 rounded-full bg-tap-red flex items-center justify-center text-[11px] font-bold text-white uppercase ring-1 ring-tap-red/40">
                  {initial || "?"}
                </div>
              </Link>
            ) : (
              <>
                <Link
                  href="/connexion"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-[10px] font-semibold uppercase tracking-[1.5px] text-white/50 hover:text-white/70 transition-colors duration-300 cursor-pointer"
                >
                  Connexion
                </Link>
                <Link
                  href="/inscription"
                  className="btn-primary btn-sm"
                >
                  Commencer
                </Link>
              </>
            )}
          </div>

          <button
            className="lg:hidden relative z-[60] w-10 h-10 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-transparent border-none"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={menuOpen}
          >
            <span className={`block w-5 h-[1.5px] bg-white transition-all duration-500 origin-center ${menuOpen ? "rotate-45 translate-y-[4.5px]" : ""}`} />
            <span className={`block w-5 h-[1.5px] bg-white transition-all duration-500 origin-center ${menuOpen ? "-rotate-45 -translate-y-[4.5px]" : ""}`} />
          </button>
        </div>
      </div>

      <div
        className={`lg:hidden fixed inset-0 bg-black/98 backdrop-blur-3xl z-50 flex flex-col justify-center items-center transition-all duration-300 ${
          menuOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navigation"
      >
        <nav className="flex flex-col items-center gap-5">
          {navLinks.map((link, i) => (
            <div key={link.href} style={{ transitionDelay: menuOpen ? `${50 + i * 50}ms` : "0ms" }} className={`transition-all duration-400 ${menuOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
              <Link
                href={link.href}
                className={`text-[28px] font-light tracking-[4px] uppercase transition-colors duration-300 cursor-pointer ${
                  pathname === link.href ? "text-tap-red" : "text-white/50 hover:text-white"
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            </div>
          ))}

          <div style={{ transitionDelay: menuOpen ? "250ms" : "0ms" }} className={`flex flex-col items-center gap-2.5 mt-2 transition-all duration-400 ${menuOpen ? "opacity-100" : "opacity-0"}`}>
            <span className="text-[9px] font-bold uppercase tracking-[3px] text-white/20 mb-1">Produit</span>
            {produitLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[16px] font-light tracking-[2px] uppercase transition-colors duration-300 cursor-pointer ${
                  pathname === link.href ? "text-tap-red" : "text-white/30 hover:text-white/60"
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {user ? (
            <div
              style={{ transitionDelay: menuOpen ? "350ms" : "0ms" }}
              className={`transition-all duration-400 ${menuOpen ? "opacity-100" : "opacity-0"}`}
            >
              <Link
                href="/app"
                className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-white text-black text-[14px] font-medium tracking-[1px] uppercase"
                onClick={() => setMenuOpen(false)}
              >
                <span className="truncate max-w-[200px]">{user.email}</span>
                <div className="w-8 h-8 rounded-full bg-tap-red flex items-center justify-center text-[13px] font-bold text-white uppercase">
                  {initial || "?"}
                </div>
              </Link>
            </div>
          ) : (
            <>
              <div
                style={{ transitionDelay: menuOpen ? "350ms" : "0ms" }}
                className={`transition-all duration-400 ${menuOpen ? "opacity-100" : "opacity-0"}`}
              >
                <Link
                  href="/connexion"
                  className="text-[28px] font-light tracking-[4px] uppercase text-white/50 hover:text-white transition-colors duration-300 cursor-pointer"
                  onClick={() => setMenuOpen(false)}
                >
                  Connexion
                </Link>
              </div>
              <div
                style={{ transitionDelay: menuOpen ? "400ms" : "0ms" }}
                className={`mt-12 transition-all duration-400 ${menuOpen ? "opacity-100" : "opacity-0"}`}
              >
                <Link href="/inscription" className="btn-primary" onClick={() => setMenuOpen(false)}>
                  Commencer
                </Link>
              </div>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
