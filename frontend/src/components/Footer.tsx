"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { ChevronDown, Mail, Phone, MapPin, Linkedin } from "lucide-react";

const footerLinks = {
  navigation: [
    { label: "Accueil", href: "/" },
    { label: "À propos", href: "/a-propos" },
    { label: "Équipe", href: "/equipe" },
    { label: "Contact", href: "/contact" },
  ],
  produit: [
    { label: "Analyse IA du CV", href: "/analyse-cv" },
    { label: "Score d'employabilité", href: "/score-employabilite" },
    { label: "Micro-learning", href: "/micro-learning" },
    { label: "Matching intelligent", href: "/matching-intelligent" },
  ],
  legal: [
    { label: "Mentions légales", href: "/mentions-legales" },
    { label: "Politique de confidentialité", href: "/politique-de-confidentialite" },
    { label: "Conditions d'utilisation", href: "/conditions-utilisation" },
  ],
};

export default function Footer() {
  const containerRef = useScrollReveal();
  const [openSection, setOpenSection] = useState<null | "navigation" | "produit" | "legal" | "contact">(
    null,
  );

  return (
    <footer
      ref={containerRef}
      className="relative bg-transparent backdrop-blur-2xl border-t border-white/[0.10] overflow-hidden rounded-t-2xl"
    >
      {/* Separator */}
      <div className="max-w-[1300px] w-full px-5 sm:w-[88%] sm:px-0 mx-auto">
        <div className="h-[1px] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>

      {/* Main footer */}
      <div className="max-w-[1300px] w-full px-5 sm:w-[88%] sm:px-0 mx-auto py-12 sm:py-16">
        {/* Mobile: logo/description full width + accordions */}
        <div className="sm:hidden">
          <div className="text-left">
            <Image
              src="/images/logo-white.svg"
              alt="TAP"
              width={120}
              height={42}
              className="h-[42px] w-auto mb-4"
            />
            <p className="text-[14px] text-white/40 leading-[1.7] font-light">
              La plateforme qui transforme des profils en talents prêts à performer.
            </p>
            <div className="hidden mt-5">
              <a
                href="https://www.linkedin.com/company/tap-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-tap-red/10 hover:border-tap-red/20 transition-all duration-300 group"
                aria-label="LinkedIn"
              >
                <Linkedin size={14} className="text-white/30 group-hover:text-tap-red transition-colors duration-300" strokeWidth={1.5} />
              </a>
            </div>
          </div>

          <div className="mt-8 space-y-2">
            {[
              { key: "navigation" as const, title: "Navigation" },
              { key: "produit" as const, title: "Produit" },
              { key: "legal" as const, title: "Légal" },
              { key: "contact" as const, title: "Contact" },
            ].map((item) => (
              <div key={item.key}>
                <button
                  type="button"
                  onClick={() => setOpenSection((v) => (v === item.key ? null : item.key))}
                  className="w-full flex items-center justify-between py-3"
                  aria-expanded={openSection === item.key}
                >
                  <span className="text-[12px] font-extrabold uppercase tracking-[2.5px] text-tap-red">
                    {item.title}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-white/40 transition-transform duration-300 ${openSection === item.key ? "rotate-180" : ""}`}
                  />
                </button>

                {item.key === "navigation" && (
                  <div className={`${openSection === "navigation" ? "block" : "hidden"} pb-4`}>
                    <ul className="flex flex-col gap-2.5">
                      {footerLinks.navigation.map((link) => (
                        <li key={link.label}>
                          <Link
                            href={link.href}
                            className="block text-[14px] text-white/40 hover:text-white/70 transition-colors duration-300"
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                      <li>
                        <Link
                          href="/connexion"
                          className="block text-[14px] text-tap-red/70 hover:text-tap-red transition-colors duration-300 font-medium"
                        >
                          Connexion
                        </Link>
                      </li>
                    </ul>
                  </div>
                )}

                {item.key === "produit" && (
                  <div className={`${openSection === "produit" ? "block" : "hidden"} pb-4`}>
                    <ul className="flex flex-col gap-2.5">
                      {footerLinks.produit.map((link) => (
                        <li key={link.label}>
                          <Link
                            href={link.href}
                            className="block text-[14px] text-white/40 hover:text-white/70 transition-colors duration-300"
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {item.key === "legal" && (
                  <div className={`${openSection === "legal" ? "block" : "hidden"} pb-4`}>
                    <ul className="flex flex-col gap-2.5">
                      {footerLinks.legal.map((link) => (
                        <li key={link.label}>
                          <Link
                            href={link.href}
                            className="block text-[14px] text-white/40 hover:text-white/70 transition-colors duration-300"
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {item.key === "contact" && (
                  <div className={`${openSection === "contact" ? "block" : "hidden"} pb-4`}>
                    <div className="flex flex-col gap-3">
                      <a
                        href="mailto:tap@entrepreneursmorocco.com"
                        className="flex items-center gap-2.5 text-[14px] text-white/40 hover:text-tap-red transition-colors duration-300 group"
                      >
                        <Mail
                          size={14}
                          className="text-white/30 group-hover:text-tap-red transition-colors duration-300"
                          strokeWidth={1.5}
                        />
                        tap@entrepreneursmorocco.com
                      </a>
                      <a
                        href="tel:+212776868163"
                        className="flex items-center gap-2.5 text-[14px] text-white/40 hover:text-tap-red transition-colors duration-300 group"
                      >
                        <Phone
                          size={14}
                          className="text-white/30 group-hover:text-tap-red transition-colors duration-300"
                          strokeWidth={1.5}
                        />
                        +212 7 76 86 81 63
                      </a>
                      <a
                        href="https://www.google.com/maps/search/?api=1&query=Immeuble+STAVROULA+gueliz+Marrakesh+4000"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 text-[14px] text-white/30 hover:text-white/50 transition-colors duration-300 group"
                      >
                        <MapPin size={14} className="text-white/30" strokeWidth={1.5} />
                        Immeuble STAVROULA, Gueliz — Marrakech
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tablet/Desktop: grid columns */}
        <div className="hidden sm:grid grid-cols-3 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="text-center sm:text-left">
            <Image
              src="/images/logo-white.svg"
              alt="TAP"
              width={100}
              height={36}
              className="h-[38px] sm:h-[42px] w-auto mb-4 sm:mb-5 mx-auto sm:mx-0"
            />
            <p className="text-[13px] sm:text-[14px] text-white/40 leading-[1.7] font-light">
              La plateforme qui transforme des profils en talents prêts à performer.
            </p>
            <div className="mt-5 flex justify-center sm:justify-start">
              <a
                href="https://www.linkedin.com/company/tap-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-tap-red/10 hover:border-tap-red/20 transition-all duration-300 group"
                aria-label="LinkedIn"
              >
                <Linkedin size={14} className="text-white/30 group-hover:text-tap-red transition-colors duration-300" strokeWidth={1.5} />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-[11px] sm:text-[12px] font-extrabold uppercase tracking-[2.5px] text-tap-red mb-4 sm:mb-5">Navigation</h4>
            <ul className="flex flex-col gap-2.5 sm:gap-3">
              {footerLinks.navigation.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-[14px] text-white/40 hover:text-white/70 transition-colors duration-300">
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/connexion" className="text-[14px] text-tap-red/70 hover:text-tap-red transition-colors duration-300 font-medium">
                  Connexion
                </Link>
              </li>
            </ul>
          </div>

          {/* Produit */}
          <div>
            <h4 className="text-[11px] sm:text-[12px] font-extrabold uppercase tracking-[2.5px] text-tap-red mb-4 sm:mb-5">Produit</h4>
            <ul className="flex flex-col gap-2.5 sm:gap-3">
              {footerLinks.produit.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-[14px] text-white/40 hover:text-white/70 transition-colors duration-300">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h4 className="text-[11px] sm:text-[12px] font-extrabold uppercase tracking-[2.5px] text-tap-red mb-4 sm:mb-5">Légal</h4>
            <ul className="flex flex-wrap gap-x-4 gap-y-2 sm:flex-col sm:gap-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-[13px] sm:text-[14px] text-white/40 hover:text-white/70 transition-colors duration-300">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="text-center sm:text-left">
            <h4 className="text-[11px] sm:text-[12px] font-extrabold uppercase tracking-[2.5px] text-tap-red mb-4 sm:mb-5">
              Contact
            </h4>
            <div className="flex flex-col gap-3 items-center sm:items-start">
              <a
                href="mailto:tap@entrepreneursmorocco.com"
                className="flex items-center gap-2.5 text-[13px] text-white/40 hover:text-tap-red transition-colors duration-300 group"
              >
                <Mail size={14} className="text-white/30 group-hover:text-tap-red transition-colors duration-300" strokeWidth={1.5} />
                tap@entrepreneursmorocco.com
              </a>
              <a
                href="tel:+212776868163"
                className="flex items-center gap-2.5 text-[13px] text-white/40 hover:text-tap-red transition-colors duration-300 group"
              >
                <Phone size={14} className="text-white/30 group-hover:text-tap-red transition-colors duration-300" strokeWidth={1.5} />
                +212 7 76 86 81 63
              </a>
              <a
                href="https://www.google.com/maps/search/?api=1&query=Immeuble+STAVROULA+gueliz+Marrakesh+4000"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-[13px] text-white/30 hover:text-white/50 transition-colors duration-300 group"
              >
                <MapPin size={14} className="text-white/30" strokeWidth={1.5} />
                Immeuble STAVROULA, Gueliz — Marrakech
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="h-[1px] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
      <div className="max-w-[1300px] w-full px-5 sm:w-[88%] sm:px-0 mx-auto py-6 flex flex-col md:flex-row md:items-center md:justify-center gap-2 md:gap-4 text-center">
        <p className="text-[12px] text-white/25 tracking-[0.5px]">
          &copy; {new Date().getFullYear()} TAP — Tous droits réservés.{" "}
          <a
            href="https://communik-agency.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-white/25 hover:text-tap-red transition-colors duration-300"
          >
            Développé par Agence Communik
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
