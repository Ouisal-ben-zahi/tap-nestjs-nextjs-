"use client";

import { FileText, Layers, UserPlus, ShieldCheck, Copyright, Upload, AlertTriangle, Lock, RefreshCw, XCircle, Scale, Mail } from "lucide-react";
import LegalPageLayout from "@/components/LegalPageLayout";

const sections = [
  {
    icon: <FileText size={17} strokeWidth={1.5} />,
    title: "Objet",
    content: [
      "Les présentes conditions générales d'utilisation (CGU) régissent l'accès et l'utilisation du site tap-hr.com et de la plateforme TAP (Talent Acceleration Platform).",
      "En accédant au site ou en utilisant la plateforme, vous acceptez sans réserve les présentes CGU. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser le site.",
    ],
  },
  {
    icon: <Layers size={17} strokeWidth={1.5} />,
    title: "Description des services",
    content: [
      "TAP est une plateforme d'employabilité assistée par l'intelligence artificielle qui propose les services suivants :",
      "• Analyse de CV par IA : évaluation automatisée des compétences et du profil",
      "• Score d'employabilité : notation objective basée sur les critères du marché",
      "• Micro-learning : parcours de formation personnalisés pour renforcer les compétences",
      "• Matching intelligent : mise en relation entre candidats et entreprises partenaires",
      "TAP se réserve le droit de modifier, suspendre ou interrompre tout ou partie de ses services à tout moment, avec ou sans préavis.",
    ],
  },
  {
    icon: <UserPlus size={17} strokeWidth={1.5} />,
    title: "Inscription et compte utilisateur",
    content: [
      "L'accès à certaines fonctionnalités de la plateforme peut nécessiter la création d'un compte utilisateur.",
      "L'utilisateur s'engage à :",
      "• Fournir des informations exactes, complètes et à jour",
      "• Maintenir la confidentialité de ses identifiants de connexion",
      "• Ne pas créer de compte avec une fausse identité ou au nom d'un tiers sans autorisation",
      "• Informer immédiatement TAP en cas d'utilisation non autorisée de son compte",
      "TAP se réserve le droit de suspendre ou supprimer tout compte en cas de violation des présentes CGU.",
    ],
  },
  {
    icon: <ShieldCheck size={17} strokeWidth={1.5} />,
    title: "Utilisation acceptable",
    content: [
      "L'utilisateur s'engage à utiliser le site et la plateforme de manière licite et conforme aux présentes CGU. Il est notamment interdit de :",
      "• Soumettre des informations fausses, trompeuses ou frauduleuses",
      "• Utiliser la plateforme à des fins illégales ou non autorisées",
      "• Tenter de contourner les mesures de sécurité du site",
      "• Collecter des données personnelles d'autres utilisateurs sans leur consentement",
      "• Utiliser des systèmes automatisés (robots, scrapers) pour accéder au site",
      "• Porter atteinte au fonctionnement normal de la plateforme",
    ],
  },
  {
    icon: <Copyright size={17} strokeWidth={1.5} />,
    title: "Propriété intellectuelle",
    content: [
      "L'ensemble des éléments du site et de la plateforme (design, textes, logos, algorithmes, bases de données, code source) sont protégés par le droit de la propriété intellectuelle et restent la propriété exclusive de TAP.",
      "L'utilisateur bénéficie d'un droit d'utilisation personnel et non transférable du site et de la plateforme dans le cadre des services proposés.",
      "Toute reproduction, copie ou utilisation non autorisée du contenu est strictement interdite.",
    ],
  },
  {
    icon: <Upload size={17} strokeWidth={1.5} />,
    title: "Contenu utilisateur",
    content: [
      "En soumettant du contenu sur la plateforme (CV, informations de profil, etc.), l'utilisateur accorde à TAP une licence non exclusive pour traiter, analyser et utiliser ces données dans le cadre des services proposés.",
      "L'utilisateur garantit qu'il dispose de tous les droits nécessaires sur le contenu qu'il soumet et que celui-ci ne porte atteinte aux droits d'aucun tiers.",
    ],
  },
  {
    icon: <AlertTriangle size={17} strokeWidth={1.5} />,
    title: "Limitation de responsabilité",
    content: [
      "TAP fournit ses services « en l'état ». TAP ne garantit pas que les services seront ininterrompus, sécurisés ou exempts d'erreurs.",
      "TAP ne saurait être tenue responsable :",
      "• Des décisions prises sur la base des scores ou analyses fournis par l'IA",
      "• Des résultats des processus de recrutement entre candidats et entreprises",
      "• Des dommages indirects, pertes de données ou de profits liés à l'utilisation du site",
      "• De l'indisponibilité temporaire du site pour maintenance ou mise à jour",
      "Les scores d'employabilité et analyses IA sont fournis à titre indicatif et ne constituent pas des garanties d'embauche.",
    ],
  },
  {
    icon: <Lock size={17} strokeWidth={1.5} />,
    title: "Protection des données",
    content: [
      "TAP s'engage à protéger les données personnelles de ses utilisateurs conformément à sa Politique de confidentialité et à la loi marocaine n° 09-08.",
      "Pour plus d'informations, consultez notre Politique de confidentialité.",
    ],
  },
  {
    icon: <RefreshCw size={17} strokeWidth={1.5} />,
    title: "Modification des CGU",
    content: [
      "TAP se réserve le droit de modifier les présentes CGU à tout moment. Les modifications prennent effet dès leur publication sur le site.",
      "L'utilisation continue du site après modification constitue une acceptation des nouvelles conditions.",
      "Nous vous encourageons à consulter régulièrement cette page pour rester informé des éventuelles mises à jour.",
    ],
  },
  {
    icon: <XCircle size={17} strokeWidth={1.5} />,
    title: "Résiliation",
    content: [
      "L'utilisateur peut cesser d'utiliser le site à tout moment et demander la suppression de son compte en contactant TAP.",
      "TAP se réserve le droit de résilier ou suspendre l'accès de tout utilisateur qui enfreint les présentes CGU, sans préavis ni indemnité.",
    ],
  },
  {
    icon: <Scale size={17} strokeWidth={1.5} />,
    title: "Droit applicable et juridiction",
    content: [
      "Les présentes CGU sont régies par le droit marocain.",
      "En cas de litige relatif à l'interprétation ou à l'exécution des présentes conditions, les parties s'efforceront de résoudre le différend à l'amiable.",
      "À défaut d'accord amiable, les tribunaux compétents de Marrakech seront seuls habilités à connaître du litige.",
    ],
  },
  {
    icon: <Mail size={17} strokeWidth={1.5} />,
    title: "Contact",
    content: [
      "Pour toute question relative aux présentes CGU :",
      "TAP — Entrepreneurs Morocco",
      "Immeuble STAVROULA, Gueliz — Marrakech 40000, Maroc",
      "Email : tap@entrepreneursmorocco.com",
      "Téléphone : +212 7 76 86 81 63",
    ],
  },
];

export default function ConditionsContent() {
  return (
    <LegalPageLayout
      title={<>Conditions <span className="font-bold text-glow text-tap-red">d&apos;utilisation</span></>}
      subtitle="Les règles qui régissent l'utilisation de la plateforme TAP."
      sections={sections}
    />
  );
}
