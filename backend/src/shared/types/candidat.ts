export interface CandidateDashboardStats {
  candidateId: number | null;
  firstProfileDate: string | null;
  applications: number;
  interviews: number;
  savedOffers: number;
  notifications: number;
  statusPending: number;
  statusAccepted: number;
  statusRefused: number;
  avatarUrl?: string | null;
}

export interface CandidatePortfolioItem {
  id: number;
  title: string;
  shortDescription: string | null;
  longDescription: string | null;
  tags: string[];
  createdAt: string | null;
}

export interface CandidateApplicationItem {
  id: number;
  jobId: number | null;
  jobTitle: string | null;
  company: string | null;
  status: string | null;
  validate: boolean;
  validatedAt: string | null;
}

export interface CandidateCvFileItem {
  name: string;
  path: string;
  publicUrl: string;
  updatedAt: string | null;
  size: number | null;
}

export interface CandidatePortfolioPdfFiles {
  portfolioShort: CandidateCvFileItem[];
  portfolioLong: CandidateCvFileItem[];
}

export interface CandidateScoreFromJson {
  candidateId: number | null;
  scoreGlobal: number | null;
  decision: string | null;
  familleDominante: string | null;
  metadataTimestamp: string | null;
  metadataSector: string | null;
  metadataModule: string | null;
  commentaire: string | null;
  dimensions: { id: string; label: string; score: number }[];
  skills: { name: string; score: number; status: string; scope: string }[];
  softSkills: { nom: string; niveau: string }[];
}

