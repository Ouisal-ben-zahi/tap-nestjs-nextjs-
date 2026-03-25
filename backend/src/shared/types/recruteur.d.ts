export interface RecruiterJobPayload {
    title: string;
    categorie_profil?: string | null;
    niveau_attendu?: string | null;
    experience_min?: string | null;
    presence_sur_site?: string | null;
    localisation?: string | null;
    reason?: string | null;
    main_mission?: string | null;
    tasks_other?: string | null;
    disponibilite?: string | null;
    salary_min?: number | null;
    salary_max?: number | null;
    urgent?: boolean;
    contrat?: string | null;
    niveau_seniorite?: string | null;
    entreprise?: string | null;
    phone?: string | null;
    soft_skills?: string[] | null;
    skills?: {
        name: string;
        level: string;
        priority: string;
    }[] | null;
    languages?: {
        name: string;
        level: string;
        importance: string;
    }[] | null;
}
export interface RecruiterOverviewStats {
    totalJobs: number;
    totalApplications: number;
    totalCandidates: number;
    urgentJobs: number;
    lastJobDate: string | null;
    jobsPerCategory: {
        label: string;
        value: number;
    }[];
    applicationsPerJob: {
        jobId: number;
        title: string;
        value: number;
    }[];
    recentApplications: {
        id: number;
        jobId: number;
        candidateName: string | null;
    candidateCategory: string | null;
    candidateAvatarUrl: string | null;
        jobTitle: string | null;
        status: string | null;
        validatedAt: string | null;
    }[];
    alerts: {
        type: string;
        message: string;
    }[];
}
export interface PublicJobItem {
    id: number;
    title: string | null;
    categorie_profil: string | null;
    created_at: string | null;
    urgent: boolean;
    location_type: string | null;
    niveau_attendu: string | null;
    experience_min: string | null;
    presence_sur_site: string | null;
    localisation: string | null;
    reason: string | null;
    main_mission: string | null;
    tasks_other: string | null;
    disponibilite: string | null;
    salary_min: number | null;
    salary_max: number | null;
    contrat: string | null;
    niveau_seniorite: string | null;
    entreprise: string | null;
    phone: string | null;
}
