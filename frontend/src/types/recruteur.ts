import type {
  PublicJobItem,
  RecruiterJobPayload,
  RecruiterOverviewStats,
} from '@shared/types/recruteur';

export type RecruteurOverview = RecruiterOverviewStats;

// Mapping simple pour le front : Job correspond au job retourné côté public
export type Job = PublicJobItem & {
  applicationCount?: number;
  /** ACTIVE | INACTIVE — renvoyé par l’API recruteur */
  status?: string | null;
};

export type JobPayload = RecruiterJobPayload;

/** Profil entreprise (table `recruteurs`), aligné sur le backend Nest. */
export type RecruiterCompanyProfile = {
  id: number;
  userId: number;
  nomSociete: string | null;
  nomContact: string | null;
  telephone: string | null;
  emailPersonnel: string | null;
  emailPro: string | null;
  ice: string | null;
  adresse: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type RecruiterCompanyProfilePayload = {
  nom_societe: string;
  nom_contact: string;
  telephone: string;
  email_personnel: string;
  email_pro: string;
  ice: string;
  adresse: string;
};

