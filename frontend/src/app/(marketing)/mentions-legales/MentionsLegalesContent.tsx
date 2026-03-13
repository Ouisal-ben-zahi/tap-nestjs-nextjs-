"use client";

import { Building2, Server, Copyright, ShieldCheck, Cookie, AlertTriangle, Scale, Mail } from "lucide-react";
import LegalPageLayout from "@/components/LegalPageLayout";

const sections = [
  {
    icon: <Building2 size={17} strokeWidth={1.5} />,
    title: "Éditeur du site",
    content: [
      "Le site tap-hr.com est édité par TAP (Talent Acceleration Platform), projet porté par Entrepreneurs Morocco.",
      "Siège social : Immeuble STAVROULA, Gueliz — Marrakech 40000, Maroc",
      "Email : tap@entrepreneursmorocco.com",
      "Téléphone : +212 7 76 86 81 63",
      "Directeur de la publication : Imad El Boukhiari, Co-Founder & CEO",
    ],
  },
  {
    icon: <Server size={17} strokeWidth={1.5} />,
    title: "Hébergement",
    content: [
      "Le site est hébergé par Hostinger International Ltd.",
      "Adresse : 61 Lordou Vironos Street, 6023 Larnaca, Chypre",
      "Site : hostinger.com",
    ],
  },
  {
    icon: <Copyright size={17} strokeWidth={1.5} />,
    title: "Propriété intellectuelle",
    content: [
      "L'ensemble du contenu du site tap-hr.com (textes, images, logos, graphismes, icônes, vidéos, sons, logiciels, bases de données, etc.) est protégé par le droit de la propriété intellectuelle.",
      "Toute reproduction, représentation, modification, distribution ou exploitation, totale ou partielle, du contenu de ce site, par quelque procédé que ce soit, sans l'autorisation préalable et écrite de TAP, est strictement interdite et constitue une contrefaçon sanctionnée par la loi.",
      "Les marques, logos et noms de domaine figurant sur ce site sont la propriété exclusive de TAP ou de ses partenaires.",
    ],
  },
  {
    icon: <ShieldCheck size={17} strokeWidth={1.5} />,
    title: "Données personnelles",
    content: [
      "Les informations recueillies via le formulaire de contact sont destinées à TAP et servent uniquement à traiter votre demande.",
      "Conformément à la loi marocaine n° 09-08 relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel, vous disposez d'un droit d'accès, de rectification et de suppression de vos données.",
      "Pour exercer ces droits, contactez-nous à : tap@entrepreneursmorocco.com",
    ],
  },
  {
    icon: <Cookie size={17} strokeWidth={1.5} />,
    title: "Cookies",
    content: [
      "Le site tap-hr.com peut utiliser des cookies à des fins de mesure d'audience et d'amélioration de l'expérience utilisateur.",
      "Vous pouvez configurer votre navigateur pour refuser les cookies. Toutefois, certaines fonctionnalités du site pourraient ne plus être accessibles.",
    ],
  },
  {
    icon: <AlertTriangle size={17} strokeWidth={1.5} />,
    title: "Limitation de responsabilité",
    content: [
      "TAP s'efforce de fournir des informations aussi précises que possible sur le site. Toutefois, TAP ne pourra être tenue responsable des omissions, inexactitudes ou des carences dans la mise à jour de ces informations.",
      "TAP décline toute responsabilité en cas d'interruption du site, de bugs, d'incompatibilité ou de dommages résultant de l'utilisation du site.",
    ],
  },
  {
    icon: <Scale size={17} strokeWidth={1.5} />,
    title: "Droit applicable",
    content: [
      "Les présentes mentions légales sont régies par le droit marocain. En cas de litige, les tribunaux de Marrakech seront seuls compétents.",
    ],
  },
  {
    icon: <Mail size={17} strokeWidth={1.5} />,
    title: "Contact",
    content: [
      "Pour toute question relative aux présentes mentions légales :",
      "TAP — Entrepreneurs Morocco",
      "Immeuble STAVROULA, Gueliz — Marrakech 40000, Maroc",
      "Email : tap@entrepreneursmorocco.com",
      "Téléphone : +212 7 76 86 81 63",
    ],
  },
];

export default function MentionsLegalesContent() {
  return (
    <LegalPageLayout
      badge="Légal"
      title={<>Mentions <span className="font-bold text-glow text-tap-red">légales</span></>}
      subtitle="Informations légales relatives au site tap-hr.com"
      sections={sections}
    />
  );
}
