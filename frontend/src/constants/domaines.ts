export type DomaineOption = { value: string; label: string };
export type DomaineGroup = { label?: string; options: DomaineOption[] };

export const DOMAINE_GROUPS: DomaineGroup[] = [
  {
    label: "Informatique & Technologies (IT)",
    options: [
      { value: "Developpement logiciel / Software engineering", label: "Développement logiciel / Software engineering" },
      { value: "Developpement web", label: "Développement web" },
      { value: "Reseaux informatiques", label: "Réseaux informatiques" },
      { value: "Cybersecurite", label: "Cybersécurité" },
      { value: "Cloud computing", label: "Cloud computing" },
      { value: "DevOps", label: "DevOps" },
      { value: "Architecture logicielle", label: "Architecture logicielle" },
    ],
  },
  {
    label: "Intelligence artificielle & Data",
    options: [
      { value: "Data science", label: "Data science" },
      { value: "Analyse de donnees", label: "Analyse de données" },
      {
        value: "Intelligence artificielle & Machine learning",
        label: "Intelligence artificielle & Machine learning",
      },
      { value: "Business Intelligence (BI)", label: "Business Intelligence (BI)" },
      { value: "ERP & CRM", label: "ERP & CRM" },
    ],
  },
  {
    label: "Marketing & Communication",
    options: [
      { value: "Marketing digital", label: "Marketing digital" },
      { value: "Community management", label: "Community management" },
      { value: "SEO / SEA", label: "SEO / SEA" },
      { value: "Content marketing", label: "Content marketing" },
      {
        value: "Branding & communication corporate",
        label: "Branding & communication corporate",
      },
      { value: "Relations publiques (RP)", label: "Relations publiques (RP)" },
      { value: "Email marketing", label: "Email marketing" },
      { value: "Growth marketing", label: "Growth marketing" },
    ],
  },
  {
    label: "Finance, Comptabilité & Banque",
    options: [
      { value: "Comptabilite generale", label: "Comptabilité générale" },
      { value: "Audit & controle de gestion", label: "Audit & contrôle de gestion" },
      { value: "Finance d'entreprise", label: "Finance d’entreprise" },
      { value: "Analyse financiere", label: "Analyse financière" },
      { value: "Banque & gestion de portefeuille", label: "Banque & gestion de portefeuille" },
      { value: "Fiscalite", label: "Fiscalité" },
      { value: "Tresorerie", label: "Trésorerie" },
      { value: "Assurance", label: "Assurance" },
    ],
  },
  {
    label: "Commerce & Vente",
    options: [
      { value: "Vente terrain", label: "Vente terrain" },
      { value: "Vente en magasin / retail", label: "Vente en magasin / retail" },
      { value: "Business development", label: "Business development" },
      { value: "Gestion grands comptes", label: "Gestion grands comptes" },
      { value: "E-commerce", label: "E-commerce" },
      { value: "Relation client", label: "Relation client" },
      { value: "Negociation commerciale", label: "Négociation commerciale" },
      { value: "Avant-vente / presales", label: "Avant-vente / presales" },
    ],
  },
  {
    label: "Transport & Automobile",
    options: [
      { value: "Logistique transport", label: "Logistique transport" },
      { value: "Maintenance automobile", label: "Maintenance automobile" },
      { value: "Gestion flotte vehicules", label: "Gestion flotte véhicules" },
      { value: "Transport international", label: "Transport international" },
      { value: "Exploitation transport", label: "Exploitation transport" },
      { value: "Mecanique automobile", label: "Mécanique automobile" },
      { value: "Diagnostic technique", label: "Diagnostic technique" },
    ],
  },
  {
    label: "Télécommunications",
    options: [
      { value: "Reseaux telecom", label: "Réseaux télécom" },
      { value: "Support telecom", label: "Support télécom" },
      { value: "Fibre optique", label: "Fibre optique" },
      { value: "Radio & mobile (4G/5G)", label: "Radio & mobile (4G/5G)" },
      {
        value: "VoIP & communications unifiees",
        label: "VoIP & communications unifiées",
      },
      { value: "Infrastructure telecom", label: "Infrastructure télécom" },
    ],
  },
  {
    label: "Immobilier",
    options: [
      { value: "Transaction immobiliere", label: "Transaction immobilière" },
      { value: "Gestion locative", label: "Gestion locative" },
      { value: "Syndic", label: "Syndic" },
      { value: "Promotion immobiliere", label: "Promotion immobilière" },
      { value: "Expertise immobiliere", label: "Expertise immobilière" },
      { value: "Negociation immobiliere", label: "Négociation immobilière" },
    ],
  },
  {
    label: "Média, Design & Création",
    options: [
      { value: "Design graphique", label: "Design graphique" },
      { value: "UI / UX design", label: "UI / UX design" },
      { value: "Motion design", label: "Motion design" },
      { value: "Montage video", label: "Montage vidéo" },
      { value: "Photographie", label: "Photographie" },
      { value: "Illustration", label: "Illustration" },
      { value: "Production media", label: "Production média" },
      { value: "Direction artistique", label: "Direction artistique" },
    ],
  },
  {
    label: "Logistique & Supply chain",
    options: [
      { value: "Gestion des stocks", label: "Gestion des stocks" },
      { value: "Planification & approvisionnement", label: "Planification & approvisionnement" },
      { value: "Transport & distribution", label: "Transport & distribution" },
      { value: "Supply chain management", label: "Supply chain management" },
      { value: "Import / Export", label: "Import / Export" },
      { value: "Gestion d'entrepot", label: "Gestion d’entrepôt" },
      { value: "Procurement / achats", label: "Procurement / achats" },
    ],
  },
  {
    label: "Autres",
    options: [
      { value: "Autre", label: "Autre" },
    ],
  },
];

export const DOMAINE_VALUES = DOMAINE_GROUPS.flatMap((group) =>
  group.options.map((option) => option.value),
);
