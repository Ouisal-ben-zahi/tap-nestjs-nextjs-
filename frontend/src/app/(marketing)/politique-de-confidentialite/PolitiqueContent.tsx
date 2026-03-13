"use client";

import { Info, ClipboardList, Target, Scale, Clock, Share2, Lock, UserCheck, Cookie, RefreshCw, Mail } from "lucide-react";
import LegalPageLayout from "@/components/LegalPageLayout";

const sections = [
  {
    icon: <Info size={17} strokeWidth={1.5} />,
    title: "Introduction",
    content: [
      "TAP (Talent Acceleration Platform) accorde une importance fondamentale à la protection de vos données personnelles. La présente politique de confidentialité décrit les données que nous collectons, les raisons de cette collecte et la manière dont nous les utilisons.",
      "En utilisant le site tap-hr.com et la plateforme TAP, vous acceptez les pratiques décrites dans cette politique.",
    ],
  },
  {
    icon: <ClipboardList size={17} strokeWidth={1.5} />,
    title: "Données collectées",
    content: [
      "Nous collectons les données suivantes :",
      "• Données d'identification : nom, prénom, adresse e-mail, numéro de téléphone",
      "• Données professionnelles : CV, parcours académique, compétences, expériences professionnelles",
      "• Données de navigation : adresse IP, type de navigateur, pages consultées, durée de visite",
      "• Données de formulaire : toute information transmise via le formulaire de contact",
    ],
  },
  {
    icon: <Target size={17} strokeWidth={1.5} />,
    title: "Finalités du traitement",
    content: [
      "Vos données personnelles sont collectées et traitées pour les finalités suivantes :",
      "• Analyse de CV et génération du score d'employabilité via notre IA",
      "• Personnalisation des parcours de micro-learning",
      "• Matching intelligent entre candidats et entreprises",
      "• Réponse à vos demandes via le formulaire de contact",
      "• Amélioration continue de nos services et de l'expérience utilisateur",
      "• Statistiques et analyses d'audience anonymisées",
    ],
  },
  {
    icon: <Scale size={17} strokeWidth={1.5} />,
    title: "Base légale du traitement",
    content: [
      "Le traitement de vos données repose sur :",
      "• Votre consentement explicite lors de l'utilisation de la plateforme",
      "• L'exécution d'un contrat ou de mesures précontractuelles",
      "• L'intérêt légitime de TAP pour améliorer ses services",
      "Le traitement est conforme à la loi marocaine n° 09-08 relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel.",
    ],
  },
  {
    icon: <Clock size={17} strokeWidth={1.5} />,
    title: "Durée de conservation",
    content: [
      "Vos données personnelles sont conservées pendant la durée nécessaire aux finalités pour lesquelles elles ont été collectées :",
      "• Données de profil candidat : 24 mois après la dernière activité",
      "• Données de contact (formulaire) : 12 mois",
      "• Données de navigation : 13 mois",
      "Au-delà de ces durées, vos données sont supprimées ou anonymisées.",
    ],
  },
  {
    icon: <Share2 size={17} strokeWidth={1.5} />,
    title: "Partage des données",
    content: [
      "TAP ne vend jamais vos données personnelles à des tiers.",
      "Vos données peuvent être partagées uniquement dans les cas suivants :",
      "• Avec les entreprises partenaires, dans le cadre du matching candidat-entreprise, et uniquement avec votre consentement",
      "• Avec nos sous-traitants techniques (hébergement, analyse IA) qui sont contractuellement tenus de protéger vos données",
      "• En cas d'obligation légale ou de décision judiciaire",
    ],
  },
  {
    icon: <Lock size={17} strokeWidth={1.5} />,
    title: "Sécurité des données",
    content: [
      "TAP met en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données :",
      "• Chiffrement des données en transit (HTTPS/TLS)",
      "• Accès restreint aux données personnelles",
      "• Sauvegardes régulières et sécurisées",
      "• Surveillance continue des systèmes",
    ],
  },
  {
    icon: <UserCheck size={17} strokeWidth={1.5} />,
    title: "Vos droits",
    content: [
      "Conformément à la loi marocaine n° 09-08, vous disposez des droits suivants :",
      "• Droit d'accès : obtenir la confirmation du traitement de vos données et en obtenir une copie",
      "• Droit de rectification : corriger vos données inexactes ou incomplètes",
      "• Droit de suppression : demander l'effacement de vos données",
      "• Droit d'opposition : vous opposer au traitement de vos données",
      "• Droit à la portabilité : recevoir vos données dans un format structuré",
      "Pour exercer ces droits, contactez-nous à : tap@entrepreneursmorocco.com",
    ],
  },
  {
    icon: <Cookie size={17} strokeWidth={1.5} />,
    title: "Cookies",
    content: [
      "Notre site utilise des cookies essentiels au fonctionnement du site et des cookies analytiques pour mesurer l'audience.",
      "Vous pouvez à tout moment configurer votre navigateur pour accepter ou refuser les cookies. Le refus de certains cookies peut limiter votre accès à certaines fonctionnalités.",
    ],
  },
  {
    icon: <RefreshCw size={17} strokeWidth={1.5} />,
    title: "Modifications",
    content: [
      "TAP se réserve le droit de modifier cette politique de confidentialité à tout moment. Les modifications prennent effet dès leur publication sur le site. Nous vous encourageons à consulter régulièrement cette page.",
    ],
  },
  {
    icon: <Mail size={17} strokeWidth={1.5} />,
    title: "Contact",
    content: [
      "Pour toute question relative à cette politique de confidentialité ou à vos données personnelles :",
      "TAP — Entrepreneurs Morocco",
      "Immeuble STAVROULA, Gueliz — Marrakech 40000, Maroc",
      "Email : tap@entrepreneursmorocco.com",
      "Téléphone : +212 7 76 86 81 63",
    ],
  },
];

export default function PolitiqueContent() {
  return (
    <LegalPageLayout
      badge="Confidentialité"
      title={<>Politique de <span className="font-bold text-glow text-tap-red">confidentialité</span></>}
      subtitle="Comment nous collectons, utilisons et protégeons vos données."
      sections={sections}
    />
  );
}
