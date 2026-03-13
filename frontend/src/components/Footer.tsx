"use client";

import Link from "next/link";
import Image from "next/image";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { ArrowRight, Mail, Phone, MapPin, Linkedin } from "lucide-react";

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

  return (
    <footer ref={containerRef} className="relative bg-[#030303] overflow-hidden">
      <div className="h-[1px] bg-gradient-to-r from-transparent via-tap-red/20 to-transparent" />

      {/* CTA Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-tap-red/[0.03] to-transparent pointer-events-none" />
        <div className="absolute top-0 left-[50%] -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-[radial-gradient(ellipse,rgba(202,27,40,0.05),transparent_60%)] blur-3xl pointer-events-none" />

        <div className="reveal max-w-[1300px] w-[88%] mx-auto py-16 sm:py-20 text-center relative z-10">
          <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[3px] text-tap-red font-semibold mb-5">
            <span className="w-5 h-[1px] bg-tap-red" />
            Commencez maintenant
            <span className="w-5 h-[1px] bg-tap-red" />
          </span>
          <h3 className="font-heading text-[22px] sm:text-[32px] md:text-[40px] font-extralight text-white tracking-[-0.03em] leading-[1.15] mb-4">
            Prêt à recruter <span className="font-bold">autrement</span> ?
          </h3>
          <p className="text-[14px] sm:text-[15px] text-white/40 max-w-[400px] mx-auto mb-8 leading-[1.7] font-light">
            Rejoignez les entreprises qui recrutent des talents préparés par l&apos;IA.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/inscription"
              className="btn-primary group"
            >
              Créer mon compte
              <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link href="/connexion" className="btn-secondary">
              Se connecter
            </Link>
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="max-w-[1300px] w-[88%] mx-auto">
        <div className="h-[1px] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>

      {/* Main footer */}
      <div className="max-w-[1300px] w-[88%] mx-auto py-12 sm:py-16">
        <div className="grid grid-cols-12 gap-8 max-lg:grid-cols-6 max-sm:grid-cols-2 max-lg:gap-8 max-sm:gap-6">
          {/* Brand */}
          <div className="col-span-4 max-lg:col-span-6 max-sm:col-span-2">
            <Image src="/images/logo-white.svg" alt="TAP" width={100} height={36} className="h-[32px] w-auto mb-4 sm:mb-5" />
            <p className="text-[13px] sm:text-[14px] text-white/40 leading-[1.7] max-w-[300px] font-light mb-5 sm:mb-6">
              La plateforme qui transforme des profils en talents prêts à performer.
            </p>

            <div className="flex flex-col gap-3">
              <a href="mailto:tap@entrepreneursmorocco.com" className="flex items-center gap-2.5 text-[13px] text-white/40 hover:text-tap-red transition-colors duration-300 group">
                <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center group-hover:bg-tap-red/10 transition-colors duration-300">
                  <Mail size={13} className="text-white/30 group-hover:text-tap-red transition-colors duration-300" strokeWidth={1.5} />
                </div>
                tap@entrepreneursmorocco.com
              </a>
              <a href="tel:+212776868163" className="flex items-center gap-2.5 text-[13px] text-white/40 hover:text-tap-red transition-colors duration-300 group">
                <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center group-hover:bg-tap-red/10 transition-colors duration-300">
                  <Phone size={13} className="text-white/30 group-hover:text-tap-red transition-colors duration-300" strokeWidth={1.5} />
                </div>
                +212 7 76 86 81 63
              </a>
              <a href="https://www.google.com/maps/search/?api=1&query=Immeuble+STAVROULA+gueliz+Marrakesh+4000" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-[13px] text-white/30 hover:text-white/50 transition-colors duration-300 group">
                <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                  <MapPin size={13} className="text-white/30" strokeWidth={1.5} />
                </div>
                Immeuble STAVROULA, Gueliz — Marrakech
              </a>
            </div>

            <div className="flex items-center gap-2 mt-5">
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
          <div className="col-span-2 max-lg:col-span-2 max-sm:col-span-1">
            <h4 className="text-[10px] font-bold uppercase tracking-[2px] text-white/50 mb-4 sm:mb-5">Navigation</h4>
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
          <div className="col-span-3 max-lg:col-span-2 max-sm:col-span-1">
            <h4 className="text-[10px] font-bold uppercase tracking-[2px] text-white/50 mb-4 sm:mb-5">Produit</h4>
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
          <div className="col-span-3 max-lg:col-span-2 max-sm:col-span-2">
            <h4 className="text-[10px] font-bold uppercase tracking-[2px] text-white/50 mb-4 sm:mb-5">Légal</h4>
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
        </div>
      </div>

      {/* Bottom bar */}
      <div className="h-[1px] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
      <div className="max-w-[1300px] w-[88%] mx-auto py-6 flex items-center justify-between max-md:flex-col max-md:gap-2">
        <p className="text-[12px] text-white/25 tracking-[0.5px]">&copy; 2026 TAP — Tous droits réservés.</p>
        <p className="text-[12px] text-white/25 tracking-[0.5px]">Marrakech, Maroc</p>
      </div>
    </footer>
  );
}
