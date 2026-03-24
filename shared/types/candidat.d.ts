export interface CandidateDashboardStats {
    candidateId: number | null;
    firstProfileDate: string | null;
    firstName?: string | null;
    lastName?: string | null;
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
    dimensions: {
        id: string;
        label: string;
        score: number;
    }[];
    skills: {
        name: string;
        score: number;
        status: string;
        scope: string;
    }[];
    softSkills: {
        nom: string;
        niveau: string;
    }[];
}
export interface CandidateProfile {
    candidateId: number;
    nom: string;
    prenom: string;
    titre_profil: string | null;
    categorie_profil: string | null;
    ville: string | null;
    pays: string | null;
    pays_cible: string | null;
    linkedin: string | null;
    github: string | null;
    behance: string | null;
    email: string | null;
    phone: string | null;
    annees_experience: number | null;
    disponibilite: string | null;
    pret_a_relocater: string | null;
    niveau_seniorite: string | null;
    salaire_minimum: string | null;
    constraints: string | null;
    search_criteria: string | null;
    resume_bref: string | null;
    type_contrat: string | null;
}
