import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';
import * as nodemailer from 'nodemailer';
import type { CandidateGenerationStatusResponseDto } from './dto/candidate-generation-status.dto';

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
  jobCategory: string | null;
  jobLocationType: string | null;
  jobDuration: string | null;
  applicationLink: string | null;
  cvPath: string | null;
  cvUrl: string | null;
  portfolioPath: string | null;
  portfolioUrl: string | null;
  talentCardPath: string | null;
  talentCardUrl: string | null;
  status: string | null;
  validate: boolean;
  validatedAt: string | null;
}

export interface CandidateScheduledInterviewItem {
  id: number;
  jobTitle: string | null;
  interviewType: 'EN_LIGNE' | 'PRESENTIEL' | 'TELEPHONIQUE' | string;
  interviewDate: string | null;
  interviewTime: string | null;
}

export interface CandidateCvFileItem {
  name: string;
  path: string;
  publicUrl: string;
  updatedAt: string | null;
  size: number | null;
}

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
  skills?: { name: string; level: string; priority: string }[] | null;
  languages?: { name: string; level: string; importance: string }[] | null;
}

export interface CandidatePortfolioPdfFiles {
  portfolioShort: CandidateCvFileItem[];
  portfolioLong: CandidateCvFileItem[];
}

export interface GeneratePortfolioResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface PortfolioChatStartResult {
  success: boolean;
  session_id?: string;
  question?: string | null;
  is_complete?: boolean;
  profile?: any;
  missing_fields?: any;
  error?: string;
}

export interface PortfolioChatMessageResult {
  success: boolean;
  session_id?: string;
  question?: string | null;
  is_complete?: boolean;
  message?: string;
  profile?: any;
  missing_fields?: any;
  filled_field?: string | null;
  error?: string;
}

export interface PortfolioChatStateResult {
  success: boolean;
  session_id?: string;
  state?: any;
  error?: string;
}

export interface PortfolioLongPipelineResult {
  success: boolean;
  started?: boolean;
  scoring?: any;
  generation?: GeneratePortfolioResult;
  error?: string;
}

export interface InterviewStartResult {
  success: boolean;
  session_id?: string;
  message?: string;
  status_url?: string;
  events_url?: string;
  audio_url?: string;
  evaluation_url?: string;
  error?: string;
}

export interface InterviewStatusResult {
  session_id: string;
  status: string;
  current_question: number;
  total_questions: number;
  current_question_text: string;
  intro_text: string;
  error?: string | null;
}

export interface InterviewAudioFileItem {
  type: 'intro' | 'question' | 'response' | string;
  filename: string;
  text?: string;
  question_number?: number;
  file_url?: string;
}

export interface InterviewAudioListResult {
  session_id: string;
  audio_files: InterviewAudioFileItem[];
}

export interface InterviewEvaluationResult {
  success: boolean;
  evaluation?: any;
  error?: string;
}

export interface RecruiterOverviewStats {
  totalJobs: number;
  totalApplications: number;
  totalCandidates: number;
  urgentJobs: number;
  lastJobDate: string | null;
  jobsPerCategory: { label: string; value: number }[];
  applicationsPerJob: { jobId: number; title: string; value: number }[];
  recentApplications: {
    id: number;
    jobId: number;
    candidateId: number | null;
    candidateName: string | null;
    candidateCategory: string | null;
    candidateAvatarUrl: string | null;
    jobTitle: string | null;
    status: string | null;
    validatedAt: string | null;
  }[];
  acceptedApplications: {
    id: number;
    jobId: number;
    candidateId: number | null;
    candidateName: string | null;
    candidateCategory: string | null;
    candidateAvatarUrl: string | null;
    jobTitle: string | null;
    status: string | null;
    validatedAt: string | null;
  }[];
  alerts: { type: string; message: string }[];
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
  tasks: any[] | null;
  skills: any[] | null;
  languages: any[] | null;
  score?: number | null;
}

export interface ApplyJobPayload {
  jobId: number;
  cvPath?: string | null;
  portfolioPath?: string | null;
  talentCardPath?: string | null;
  lien?: string | null;
}

export interface ToggleSavedJobPayload {
  jobId: number;
}

export interface RecruiterMatchByOfferPayload {
  job_id: number;
  top_n?: number;
  only_postule?: boolean;
}

export interface RecruiterValidateCandidatePayload {
  job_id: number;
  candidate_id: number;
}

export interface RecruiterUpdateCandidateStatusPayload {
  job_id: number;
  candidate_id: number;
  status: 'EN_COURS' | 'ACCEPTEE' | 'REFUSEE';
}

export interface RecruiterSaveInterviewPdfPayload {
  job_id: number;
  candidate_id: number;
  questions?: RecruiterInterviewQuestion[];
}

export interface RecruiterInterviewQuestion {
  id: string;
  text: string;
  category: string;
}

export interface RecruiterScheduleInterviewPayload {
  job_id: number;
  candidate_id: number;
  interview_type: 'EN_LIGNE' | 'PRESENTIEL' | 'TELEPHONIQUE' | string;
  interview_date: string; // YYYY-MM-DD
  interview_time: string; // HH:MM
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

@Injectable()
export class DashboardService {
  private supabase: SupabaseClient;
  private mailer: nodemailer.Transporter | null = null;

  constructor(private config: ConfigService) {
    const url = this.config.get<string>('SUPABASE_URL');
    const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!url || !key) {
      throw new Error(
        'SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis',
      );
    }

    this.supabase = createClient(url, key);

    const user = this.config.get<string>('MAILER_USER');
    const pass = this.config.get<string>('MAILER_PASS');
    if (user && pass) {
      this.mailer = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
    }
  }

  private async getCandidateIdForUser(userId: number): Promise<{ id: number; created_at: string } | null> {
    const {
      data: candidate,
      error: candidateError,
    } = await this.supabase
      .from('candidates')
      .select('id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (candidateError) {
      throw new BadRequestException(
        candidateError.message || 'Erreur lors du chargement du candidat',
      );
    }

    if (!candidate) {
      return null;
    }

    return candidate as { id: number; created_at: string };
  }

  /**
   * Extrait le chemin dans le bucket `tap_files` depuis une URL publique/signée Supabase.
   */
  private extractTapFilesObjectPathFromUrl(url: string): string | null {
    const marker = '/tap_files/';
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    const after = url.slice(idx + marker.length).split('?')[0];
    if (!after) return null;
    try {
      return decodeURIComponent(after);
    } catch {
      return after;
    }
  }

  /**
   * Retourne une URL affichable pour la photo candidat (signed URL bucket `tap_files`).
   * Gère `image_minio_url` en chemin relatif ou en URL complète.
   */
  private async resolveCandidateAvatarUrl(
    rawImage: string | null | undefined,
  ): Promise<string | null> {
    const trimmed = typeof rawImage === 'string' ? rawImage.trim() : '';
    if (!trimmed) return null;

    const trySign = async (objectPath: string) => {
      const path = objectPath.replace(/^\/+/, '');
      const { data: signed, error } = await this.supabase.storage
        .from('tap_files')
        .createSignedUrl(path, 60 * 60);
      if (!error && signed?.signedUrl) return signed.signedUrl;
      return null;
    };

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const fromUrl = this.extractTapFilesObjectPathFromUrl(trimmed);
      if (fromUrl) {
        const signed = await trySign(fromUrl);
        if (signed) return signed;
      }
      return trimmed;
    }

    return trySign(trimmed);
  }

  async deleteCandidateAvatar(userId: number): Promise<void> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }

    const candidate = await this.getOrCreateCandidate(userId);
    const candidateId = candidate.id as number;

    const { data: row, error } = await this.supabase
      .from('candidates')
      .select('image_minio_url')
      .eq('id', candidateId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message || 'Erreur lors du chargement candidat');
    }

    const raw = (row as any)?.image_minio_url as string | null | undefined;
    const trimmed = typeof raw === 'string' ? raw.trim() : '';
    if (!trimmed) {
      return;
    }

    const objectPath =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? this.extractTapFilesObjectPathFromUrl(trimmed)
        : trimmed;

    if (objectPath) {
      try {
        await this.supabase.storage.from('tap_files').remove([objectPath]);
      } catch (e: any) {
        // Non bloquant: même si la suppression storage échoue, on nettoie la DB.
        console.warn('[avatar] remove failed for candidate ' + candidateId + ': ' + (e?.message ?? e));
      }
    }

    await this.supabase
      .from('candidates')
      .update({ image_minio_url: null })
      .eq('id', candidateId);
  }

  private async resolveUserId(
    userRef: number | string | { sub?: unknown; id?: unknown; userId?: unknown; email?: unknown } | null | undefined,
  ): Promise<number> {
    const extractNumeric = (value: unknown): number | null => {
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string') {
        const n = Number.parseInt(value, 10);
        if (Number.isFinite(n)) return n;
      }
      return null;
    };

    const direct =
      extractNumeric(userRef) ??
      (typeof userRef === 'object' && userRef !== null
        ? extractNumeric((userRef as any).sub) ??
          extractNumeric((userRef as any).id) ??
          extractNumeric((userRef as any).userId)
        : null);

    if (direct) return direct;

    const email =
      typeof userRef === 'string' && userRef.includes('@')
        ? userRef
        : typeof userRef === 'object' && userRef !== null && typeof (userRef as any).email === 'string'
          ? (userRef as any).email
          : null;

    if (!email) {
      throw new BadRequestException('userId invalide');
    }

    const { data, error } = await this.supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .limit(1)
      .maybeSingle();

    if (error || !data?.id) {
      throw new BadRequestException('userId invalide');
    }
    return Number(data.id);
  }

  private extractEmailFromUserRef(
    userRef:
      | number
      | string
      | { sub?: unknown; id?: unknown; userId?: unknown; email?: unknown }
      | null
      | undefined,
  ): string | null {
    const email =
      typeof userRef === 'string' && userRef.includes('@')
        ? userRef
        : typeof userRef === 'object' &&
            userRef !== null &&
            typeof (userRef as any).email === 'string'
          ? (userRef as any).email
          : null;
    if (!email) return null;
    const normalized = email.toLowerCase().trim();
    return normalized || null;
  }

  async resolveJwtUserId(
    userRef:
      | number
      | string
      | { sub?: unknown; id?: unknown; userId?: unknown; email?: unknown }
      | null
      | undefined,
  ): Promise<number> {
    return this.resolveUserId(userRef);
  }


  private async getOrCreateCandidate(userId: number): Promise<{ id: number; categorie_profil: string | null }> {
    const { data: existing } = await this.supabase
      .from("candidates")
      .select("id, categorie_profil")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existing) return existing;

    const idAgent = 'A1-' + Math.random().toString(16).slice(2, 8).toUpperCase();
    const { data: created, error } = await this.supabase
      .from("candidates")
      .insert({
        user_id: userId,
        // IMPORTANT :
        // - `nom` est NOT NULL côté BDD, donc on met une valeur placeholder.
        // - `categorie_profil` est mise à "Autres" par défaut, et sera ensuite
        //   écrasée par le backend IA après extraction du CV.
        nom: "À compléter",
        prenom: "",
        categorie_profil: "Autres",
        id_agent: idAgent,
      })
      .select("id, categorie_profil")
      .single();

    if (error || !created) {
      throw new BadRequestException(error?.message || "Impossible de creer le profil candidat");
    }
    return created;
  }

  /** Base URL Flask optionnelle (ex. création d’offre sans IA en local). */
  private tryGetFlaskBaseUrl(): string | null {
    const raw =
      this.config.get<string>('FLASK_AI_URL') ||
      this.config.get<string>('NEXT_PUBLIC_FLASK_AI_URL');
    if (!raw || !String(raw).trim()) {
      return null;
    }
    let flaskUrl = String(raw).trim().replace(/\/$/, '');
    // Sans schéma (ex. localhost:5000), `new URL(...)` lève « Invalid URL ».
    if (!/^https?:\/\//i.test(flaskUrl)) {
      flaskUrl = `http://${flaskUrl}`;
    }
    try {
      const parsed = new URL(flaskUrl);
      if (!parsed.hostname) {
        return null;
      }
    } catch {
      return null;
    }
    return flaskUrl;
  }

  private getFlaskBaseUrl(): string {
    const base = this.tryGetFlaskBaseUrl();
    if (!base) {
      throw new BadRequestException(
        'FLASK_AI_URL non configuré ou invalide (ex. http://127.0.0.1:5000, sans guillemets superflus).',
      );
    }
    return base;
  }

  /**
   * URL publique utilisée dans les réponses API renvoyées au navigateur.
   * Elle doit être HTTPS (ou relative) pour éviter le Mixed Content.
   *
   * Exemples recommandés en prod:
   * - FLASK_AI_PUBLIC_URL=/ia
   * - FLASK_AI_PUBLIC_URL=https://demo.tap-hr.com/ia
   */
  private getFlaskPublicBaseUrl(): string {
    const raw =
      this.config.get<string>('FLASK_AI_PUBLIC_URL') ||
      this.config.get<string>('NEXT_PUBLIC_FLASK_AI_URL') ||
      '/ia';
    const value = String(raw || '').trim().replace(/\/$/, '');
    if (!value) return '/ia';
    if (value.startsWith('/')) return value;
    if (/^https?:\/\//i.test(value)) return value;
    return `/${value.replace(/^\/+/, '')}`;
  }

  private async callFlaskJsonWithBase<T>(
    base: string,
    method: 'GET' | 'POST',
    path: string,
    body?: any,
    timeoutMs: number = 300000,
  ): Promise<T> {
    try {
      const http = require('http');
      const https = require('https');
      const { URL } = require('url');

      const pathNorm = path.startsWith('/') ? path : `/${path}`;
      let url: InstanceType<typeof URL>;
      try {
        url = new URL(pathNorm, base);
      } catch (e: any) {
        throw new BadRequestException(
          `URL Flask invalide (FLASK_AI_URL). Vérifiez le schéma http(s) et l'hôte. Détail : ${e?.message ?? e}`,
        );
      }
      const transport = url.protocol === 'https:' ? https : http;
      const reqPort =
        url.port !== ''
          ? Number(url.port)
          : url.protocol === 'https:'
            ? 443
            : 80;

      const payload = body !== undefined ? JSON.stringify(body) : undefined;

      return await new Promise((resolve, reject) => {
        const req = transport.request(
          {
            hostname: url.hostname,
            port: reqPort,
            path: url.pathname + url.search,
            method,
            headers:
              method === 'POST'
                ? {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload ?? ''),
                  }
                : undefined,
            timeout: timeoutMs,
          },
          (res) => {
            let raw = '';
            res.on('data', (chunk) => (raw += chunk));
            res.on('end', () => {
              const status = res.statusCode ?? 0;
              if (status < 200 || status >= 300) {
                try {
                  const parsed = raw ? JSON.parse(raw) : {};
                  reject(
                    new Error(
                      parsed?.error ||
                        parsed?.message ||
                        `Erreur Flask (${status})`,
                    ),
                  );
                } catch {
                  reject(new Error(`Erreur Flask (${status})`));
                }
                return;
              }

              try {
                const parsed = raw ? JSON.parse(raw) : {};
                resolve(parsed);
              } catch {
                // Some endpoints might return empty body on success
                resolve({} as T);
              }
            });
          },
        );

        req.on('error', reject);
        req.on('timeout', () => req.destroy(new Error('timeout')));
        if (method === 'POST') req.write(payload ?? '');
        req.end();
      });
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'Erreur appel Flask');
    }
  }

  private async callFlaskJson<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: any,
    timeoutMs: number = 300000,
  ): Promise<T> {
    return this.callFlaskJsonWithBase<T>(
      this.getFlaskBaseUrl(),
      method,
      path,
      body,
      timeoutMs,
    );
  }

  /**
   * Appelle le backend IA pour générer l’embedding document d’une offre (matching sémantique).
   * L'embedding est requis pour la création d'offre côté recruteur.
   */
  private async fetchJobEmbeddingFromFlask(
    payload: RecruiterJobPayload,
  ): Promise<number[]> {
    const base = this.tryGetFlaskBaseUrl();
    if (!base) {
      throw new BadRequestException(
        'FLASK_AI_URL non configuré ou invalide (NEXT_PUBLIC_FLASK_AI_URL). Exemple : http://127.0.0.1:5000 — impossible de générer l’embedding de l’offre.',
      );
    }

    const embedPayload = {
      title: payload.title,
      categorie_profil: payload.categorie_profil ?? null,
      niveau_attendu: payload.niveau_attendu ?? null,
      experience_min: payload.experience_min ?? null,
      presence_sur_site: payload.presence_sur_site ?? null,
      localisation:
        typeof payload.localisation === 'string' && payload.localisation.trim()
          ? payload.localisation.trim()
          : null,
      reason: payload.reason ?? null,
      main_mission: payload.main_mission ?? null,
      tasks_other: payload.tasks_other ?? null,
      disponibilite: payload.disponibilite ?? null,
      contrat: payload.contrat ?? null,
      niveau_seniorite: payload.niveau_seniorite ?? null,
      entreprise: payload.entreprise ?? null,
    };

    const res = await this.callFlaskJsonWithBase<{ embedding?: number[] }>(
      base,
      'POST',
      '/api/offres/embed',
      embedPayload,
      120_000,
    );

    const emb = res?.embedding;
    if (!Array.isArray(emb) || emb.length === 0) {
      throw new BadRequestException(
        "L'IA n'a pas pu générer l'embedding de l'offre. Vérifiez le serveur Flask (GEMINI_API_KEY, /api/offres/embed).",
      );
    }
    return emb;
  }

  private async getCandidateRowForUser(
    userId: number,
  ): Promise<{ id: number; id_agent?: string | null }> {
    const {
      data: candidate,
      error: candidateError,
    } = await this.supabase
      .from('candidates')
      .select('id, id_agent')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (candidateError) {
      throw new BadRequestException(
        candidateError.message || 'Erreur lors du chargement du candidat',
      );
    }
    if (!candidate) {
      throw new BadRequestException('Profil candidat introuvable');
    }
    return candidate as any;
  }

  async startCandidatePortfolioLongChat(
    userId: number,
    lang?: 'fr' | 'en',
  ): Promise<PortfolioChatStartResult> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }

    const candidate = await this.getCandidateRowForUser(userId);
    const safeLang: 'fr' | 'en' = lang === 'en' ? 'en' : 'fr';

    // Flask start endpoint doesn't use lang today, but we keep it in extracted_data for future compatibility
    return await this.callFlaskJson<PortfolioChatStartResult>('POST', '/portfolio/start', {
      candidate_id: candidate.id,
      extracted_data: { lang: safeLang },
    });
  }

  async sendCandidatePortfolioLongChatMessage(
    userId: number,
    sessionId: string,
    message: string,
  ): Promise<PortfolioChatMessageResult> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }
    if (!sessionId || !sessionId.trim()) {
      throw new BadRequestException('sessionId manquant');
    }
    if (!message || !message.trim()) {
      throw new BadRequestException('message manquant');
    }

    // Ensure candidate exists (avoid leaking session ids to non-candidates)
    await this.getCandidateRowForUser(userId);

    return await this.callFlaskJson<PortfolioChatMessageResult>(
      'POST',
      `/portfolio/${encodeURIComponent(sessionId)}/message`,
      { message: message.trim() },
    );
  }

  async getCandidatePortfolioLongChatState(
    userId: number,
    sessionId: string,
  ): Promise<PortfolioChatStateResult> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }
    if (!sessionId || !sessionId.trim()) {
      throw new BadRequestException('sessionId manquant');
    }

    await this.getCandidateRowForUser(userId);

    return await this.callFlaskJson<PortfolioChatStateResult>(
      'GET',
      `/portfolio/${encodeURIComponent(sessionId)}/state`,
    );
  }

  async runCandidatePortfolioLongPipeline(
    userId: number,
    lang?: 'fr' | 'en',
  ): Promise<PortfolioLongPipelineResult> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }
    const candidate = await this.getCandidateRowForUser(userId);
    const safeLang: 'fr' | 'en' = lang === 'en' ? 'en' : 'fr';

    // IMPORTANT: This can take a long time (LLM + generation).
    // In dev, the Next proxy may drop long-lived connections ("Failed to proxy / socket hang up").
    // We therefore respond immediately and run the pipeline in background.
    // The frontend can observe progress via:
    // - GET /dashboard/candidat/score-json
    // - GET /dashboard/candidat/portfolio-pdf-files
    setImmediate(() => {
      (async () => {
        try {
          // 1) Trigger scoring A2 (Flask)
          await this.callFlaskJson<any>(
            'POST',
            `/api/scoring/${encodeURIComponent(String(candidate.id))}`,
            {},
          );
        } catch (e: any) {
          // eslint-disable-next-line no-console
          console.error('[portfolio-long/run] scoring failed:', e?.message ?? e);
        }

        try {
          // 2) Trigger portfolio long generation (Flask)
          await this.generateCandidatePortfolioLong(userId, safeLang);
        } catch (e: any) {
          // eslint-disable-next-line no-console
          console.error('[portfolio-long/run] generation failed:', e?.message ?? e);
        }
      })().catch((e) => {
        // eslint-disable-next-line no-console
        console.error('[portfolio-long/run] background task failed:', (e as any)?.message ?? e);
      });
    });

    return { success: true, started: true };
  }

  async generateCandidatePortfolioLong(
    userId: number,
    lang?: 'fr' | 'en',
  ): Promise<GeneratePortfolioResult> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }

    const candidate = await this.getCandidateRowForUser(userId);
    const candidateId = candidate.id as number;
    const candidateUuid = (candidate as any).id_agent as string | null | undefined;
    if (!candidateUuid || typeof candidateUuid !== 'string') {
      throw new BadRequestException('candidate_uuid introuvable (id_agent)');
    }

    const safeLang: 'fr' | 'en' = lang === 'en' ? 'en' : 'fr';

    try {
      // Flask: si `lang` est explicite, auto_generate_other_lang vaut false par défaut
      // → une seule langue. On force les deux PDF (fr + en) comme sur l’UI « Mes fichiers ».
      const result = await this.callFlaskJson<any>('POST', `/portfolio/${encodeURIComponent(candidateUuid)}/generate-html`, {
        db_candidate_id: candidateId,
        version: 'long',
        save_to_minio: true,
        lang: safeLang,
        auto_generate_other_lang: true,
      });

      // If Flask returned success, consider it launched
      return { success: true, message: (result?.message as string) || 'Génération du portfolio long lancée' };
    } catch (e: any) {
      throw new BadRequestException(
        e?.message || 'Erreur lors de la génération du portfolio long',
      );
    }
  }

  async startCandidateInterviewSimulation(
    userId: number,
    interviewType?: string,
  ): Promise<InterviewStartResult> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }

    const candidate = await this.getCandidateRowForUser(userId);
    const candidateId = candidate.id as number;
    const candidateUuid = (candidate as any).id_agent as string | null | undefined;
    if (!candidateUuid || typeof candidateUuid !== 'string') {
      throw new BadRequestException('candidate_uuid introuvable (id_agent)');
    }

    const result = await this.callFlaskJson<any>(
      'POST',
      `/interview/${encodeURIComponent(candidateUuid)}/start`,
      { db_candidate_id: candidateId, interview_type: interviewType || 'technical' },
    );

    const sessionId = result?.session_id ? String(result.session_id) : null;
    const flaskBase = this.getFlaskPublicBaseUrl();
    return {
      success: Boolean(result?.success),
      session_id: sessionId ?? undefined,
      message: result?.message,
      status_url: sessionId ? `${flaskBase}/interview/${encodeURIComponent(sessionId)}/status` : undefined,
      events_url: sessionId ? `${flaskBase}/interview/${encodeURIComponent(sessionId)}/events` : undefined,
      audio_url: sessionId ? `${flaskBase}/interview/${encodeURIComponent(sessionId)}/audio` : undefined,
      evaluation_url: sessionId ? `${flaskBase}/interview/${encodeURIComponent(sessionId)}/evaluation` : undefined,
    };
  }

  async getCandidateInterviewSimulationStatus(
    userId: number,
    sessionId: string,
  ): Promise<InterviewStatusResult> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }
    if (!sessionId || !sessionId.trim()) {
      throw new BadRequestException('sessionId manquant');
    }

    // Vérifie que l'utilisateur courant possède un profil candidat
    await this.getCandidateRowForUser(userId);

    return await this.callFlaskJson<InterviewStatusResult>(
      'GET',
      `/interview/${encodeURIComponent(sessionId)}/status`,
    );
  }

  async getCandidateInterviewSimulationAudio(
    userId: number,
    sessionId: string,
  ): Promise<InterviewAudioListResult> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }
    if (!sessionId || !sessionId.trim()) {
      throw new BadRequestException('sessionId manquant');
    }

    await this.getCandidateRowForUser(userId);

    const data = await this.callFlaskJson<InterviewAudioListResult>(
      'GET',
      `/interview/${encodeURIComponent(sessionId)}/audio`,
    );

    const flaskBase = this.getFlaskPublicBaseUrl();
    const audio_files = (data?.audio_files || []).map((f: any) => ({
      ...f,
      file_url:
        f?.filename
          ? `${flaskBase}/interview/${encodeURIComponent(sessionId)}/audio/${encodeURIComponent(String(f.filename))}`
          : undefined,
    }));
    return {
      session_id: data?.session_id || sessionId,
      audio_files,
    };
  }

  async sendCandidateInterviewSimulationAudio(
    userId: number,
    sessionId: string,
    file: any,
  ): Promise<any> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }
    if (!sessionId || !sessionId.trim()) {
      throw new BadRequestException('sessionId manquant');
    }
    if (!file || !file.buffer) {
      throw new BadRequestException('Fichier audio manquant');
    }

    await this.getCandidateRowForUser(userId);

    const FormData = require('form-data');
    const http = require('http');
    const https = require('https');
    const { URL } = require('url');
    const base = this.getFlaskBaseUrl();
    const endpoint = `${base}/interview/${encodeURIComponent(sessionId)}/record`;

    const form = new FormData();
    form.append('audio', file.buffer, {
      filename: file.originalname || `response-${Date.now()}.webm`,
      contentType: file.mimetype || 'audio/webm',
    });

    return await new Promise((resolve, reject) => {
      const u = new URL(endpoint);
      const transport = u.protocol === 'https:' ? https : http;
      const req = transport.request(
        {
          hostname: u.hostname,
          port: u.port || (u.protocol === 'https:' ? 443 : 80),
          path: u.pathname + u.search,
          method: 'POST',
          headers: form.getHeaders(),
          timeout: 180000,
        },
        (res: any) => {
          const chunks: Buffer[] = [];
          res.on('data', (c: Buffer) => chunks.push(c));
          res.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf-8');
            let parsed: any = {};
            try {
              parsed = raw ? JSON.parse(raw) : {};
            } catch {
              parsed = { message: raw };
            }
            if (res.statusCode && res.statusCode >= 400) {
              return reject(
                new BadRequestException(parsed?.error || parsed?.message || 'Erreur envoi audio entretien'),
              );
            }
            resolve(parsed);
          });
        },
      );

      req.on('error', (err: any) =>
        reject(new BadRequestException(err?.message || 'Erreur réseau envoi audio entretien')),
      );
      req.on('timeout', () => {
        req.destroy();
        reject(new BadRequestException('Timeout lors de l’envoi audio entretien'));
      });
      form.pipe(req);
    });
  }

  async getCandidateInterviewSimulationEvaluation(
    userId: number,
    sessionId: string,
  ): Promise<InterviewEvaluationResult> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }
    if (!sessionId || !sessionId.trim()) {
      throw new BadRequestException('sessionId manquant');
    }

    await this.getCandidateRowForUser(userId);

    return await this.callFlaskJson<InterviewEvaluationResult>(
      'GET',
      `/interview/${encodeURIComponent(sessionId)}/evaluation`,
    );
  }
  async getCandidateStats(userId: number): Promise<CandidateDashboardStats> {
    if (userId === null || userId === undefined || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }

    const {
      data: candidateRow,
      error: candidateError,
    } = await this.supabase
      .from('candidates')
      .select('id, created_at, image_minio_url, nom, prenom')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (candidateError) {
      throw new BadRequestException(
        candidateError.message || 'Erreur lors du chargement du candidat',
      );
    }

    if (!candidateRow) {
      return {
        candidateId: null,
        firstProfileDate: null,
        firstName: null,
        lastName: null,
        applications: 0,
        interviews: 0,
        savedOffers: 0,
        notifications: 0,
        statusPending: 0,
        statusAccepted: 0,
        statusRefused: 0,
      };
    }

    const candidateId = candidateRow.id as number;

    const [
      { count: applications = 0 },
      { count: interviews = 0 },
      { count: statusPending = 0 },
      { count: statusAccepted = 0 },
      { count: statusRefused = 0 },
    ] = await Promise.all([
      this.supabase
        .from('candidate_postule')
        .select('id', { count: 'exact', head: true })
        .eq('candidate_id', candidateId),
      this.supabase
        .from('candidate_postule')
        .select('id', { count: 'exact', head: true })
        .eq('candidate_id', candidateId)
        .eq('validate', true),
      this.supabase
        .from('candidate_postule')
        .select('id', { count: 'exact', head: true })
        .eq('candidate_id', candidateId)
        .eq('status', 'EN_COURS'),
      this.supabase
        .from('candidate_postule')
        .select('id', { count: 'exact', head: true })
        .eq('candidate_id', candidateId)
        .eq('status', 'ACCEPTEE'),
      this.supabase
        .from('candidate_postule')
        .select('id', { count: 'exact', head: true })
        .eq('candidate_id', candidateId)
        .eq('status', 'REFUSEE'),
    ]);

    const avatarUrl = await this.resolveCandidateAvatarUrl(
      candidateRow.image_minio_url as string | null,
    );

    let savedOffers = 0;
    try {
      const { count } = await this.supabase
        .from('candidate_saved_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('candidate_id', candidateId);
      savedOffers = count ?? 0;
    } catch {
      // Keep dashboard resilient if saved-jobs table is unavailable.
      savedOffers = 0;
    }

    return {
      candidateId,
      firstProfileDate: candidateRow.created_at as string,
      firstName: (candidateRow.prenom as string | null) ?? null,
      lastName: (candidateRow.nom as string | null) ?? null,
      applications: applications ?? 0,
      interviews: interviews ?? 0,
      savedOffers,
      notifications: 0,
      statusPending: statusPending ?? 0,
      statusAccepted: statusAccepted ?? 0,
      statusRefused: statusRefused ?? 0,
      avatarUrl,
    };
  }

  async getCandidatePortfolio(userId: number): Promise<{ projects: CandidatePortfolioItem[] }> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }

    const candidate = await this.getCandidateIdForUser(userId);

    if (!candidate) {
      return { projects: [] };
    }

    const { data, error } = await this.supabase
      .from('candidate_projects')
      .select('id, project_name, project_description, detailed_description, technologies, created_at')
      .eq('candidate_id', candidate.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(
        error.message || 'Erreur lors du chargement du portfolio',
      );
    }

    const projects: CandidatePortfolioItem[] =
      (data ?? []).map((row: any) => {
        const tech = Array.isArray(row.technologies) ? row.technologies : [];
        const tags = tech
          .map((t: any) =>
            typeof t === 'string'
              ? t
              : t?.name ?? t?.label ?? '',
          )
          .filter((x: string) => !!x)
          .slice(0, 5);

        return {
          id: row.id as number,
          title: row.project_name as string,
          shortDescription: (row.project_description as string) ?? null,
          longDescription:
            (row.detailed_description as string) ??
            (row.project_description as string) ??
            null,
          tags,
          createdAt: (row.created_at as string) ?? null,
        };
      });

    return { projects };
  }

  async getCandidateApplications(
    userId: number,
  ): Promise<{ applications: CandidateApplicationItem[] }> {
    if (userId === null || userId === undefined || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }

    const candidate = await this.getCandidateIdForUser(userId);

    if (!candidate) {
      return { applications: [] };
    }

    const { data, error } = await this.supabase
      .from('candidate_postule')
      .select(
        'id, job_id, validated_at, status, validate, note, jobs ( id, title, entreprise, categorie_profil, location_type, contrat )',
      )
      .eq('candidate_id', candidate.id)
      .order('validated_at', { ascending: false });

    if (error) {
      throw new BadRequestException(
        error.message || 'Erreur lors du chargement des candidatures',
      );
    }

    const applications: CandidateApplicationItem[] = await Promise.all(
      (data ?? []).map(async (row: any) => {
        const job = row.jobs || row.job || null;
        const rawNote = typeof row?.note === 'string' ? row.note : null;
        let parsedNote: any = null;
        if (rawNote) {
          try {
            parsedNote = JSON.parse(rawNote);
          } catch {
            parsedNote = null;
          }
        }

        const signStoragePath = async (path: string | null): Promise<string | null> => {
          if (!path) return null;
          const { data: signed, error: signError } = await this.supabase.storage
            .from('tap_files')
            .createSignedUrl(path, 60 * 60);
          if (!signError && signed?.signedUrl) {
            return signed.signedUrl;
          }
          return null;
        };

        const cvPath =
          parsedNote && typeof parsedNote.cvPath === 'string'
            ? (parsedNote.cvPath as string)
            : null;
        const portfolioPath =
          parsedNote && typeof parsedNote.portfolioPath === 'string'
            ? (parsedNote.portfolioPath as string)
            : null;
        const talentCardPath =
          parsedNote && typeof parsedNote.talentCardPath === 'string'
            ? (parsedNote.talentCardPath as string)
            : null;
        const [cvUrl, portfolioUrl, talentCardUrl] = await Promise.all([
          signStoragePath(cvPath),
          signStoragePath(portfolioPath),
          signStoragePath(talentCardPath),
        ]);

        return {
          id: row.id as number,
          jobId: (row.job_id as number) ?? (job?.id ?? null),
          jobTitle: (job?.title as string) ?? null,
          company: (job?.entreprise as string) ?? null,
          jobCategory: (job?.categorie_profil as string) ?? null,
          jobLocationType: (job?.location_type as string) ?? null,
          jobDuration: (job?.contrat as string) ?? null,
          applicationLink:
            parsedNote && typeof parsedNote.lien === 'string'
              ? (parsedNote.lien as string)
              : null,
          cvPath,
          cvUrl,
          portfolioPath,
          portfolioUrl,
          talentCardPath,
          talentCardUrl,
          status: (row.status as string) ?? null,
          validate: Boolean(row.validate),
          validatedAt: (row.validated_at as string) ?? null,
        };
      }),
    );

    return { applications };
  }

  async getCandidateScheduledInterviews(
    userId: number,
  ): Promise<{ scheduledInterviews: CandidateScheduledInterviewItem[] }> {
    if (userId === null || userId === undefined || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }

    const candidate = await this.getCandidateIdForUser(userId);
    if (!candidate) {
      return { scheduledInterviews: [] };
    }

    const { data, error } = await this.supabase
      .from('recruiter_scheduled_interviews')
      .select('id, interview_type, interview_date, interview_time, jobs ( title )')
      .eq('candidate_id', candidate.id)
      .order('interview_date', { ascending: true })
      .order('interview_time', { ascending: true });

    if (error) {
      throw new BadRequestException(
        error.message || 'Erreur lors du chargement des entretiens planifiés',
      );
    }

    const scheduledInterviews: CandidateScheduledInterviewItem[] = (data ?? []).map((row: any) => {
      const job = row.jobs || row.job || null;
      return {
        id: Number(row.id),
        jobTitle: (job?.title as string) ?? null,
        interviewType: (row.interview_type as string) ?? 'EN_LIGNE',
        interviewDate: (row.interview_date as string) ?? null,
        interviewTime: (row.interview_time as string) ?? null,
      };
    });

    return { scheduledInterviews };
  }

  async getCandidateCvFiles(
    userId: number,
  ): Promise<{ cvFiles: CandidateCvFileItem[] }> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }

    const {
      data: candidate,
      error: candidateError,
    } = await this.supabase
      .from('candidates')
      .select('id, categorie_profil')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (candidateError) {
      throw new BadRequestException(
        candidateError.message || 'Erreur lors du chargement du candidat',
      );
    }

    if (!candidate) {
      return { cvFiles: [] };
    }

    const category =
      (candidate.categorie_profil as string | null) || 'Autres';
    const candidateId = candidate.id as number;

    // Exemple de structure dans le bucket:
    // tap_files / candidates / <categorie_profil> / <candidateId> / ...
    const basePath = `candidates/${category}/${candidateId}`;

    const { data: listed, error: listError } = await this.supabase
      .storage
      .from('tap_files')
      .list(basePath, {
        limit: 100,
      });

    if (listError) {
      throw new BadRequestException(
        listError.message || 'Erreur lors du listing des fichiers CV',
      );
    }

    const files = (listed ?? []).filter((f: any) => {
      if (typeof f.name !== 'string') return false;
      const name = f.name.toLowerCase();
      return name.startsWith('cv') && name.endsWith('.pdf');
    });

    const cvFiles: CandidateCvFileItem[] = [];

    for (const file of files) {
      const path = `${basePath}/${file.name}`;
      const { data: signed, error: signedError } = await this.supabase.storage
        .from('tap_files')
        .createSignedUrl(path, 60 * 60); // URL valable 1h

      if (signedError || !signed) {
        // on ignore juste ce fichier si la signature échoue
        // eslint-disable-next-line no-continue
        continue;
      }

      const size =
        typeof file.metadata?.size === 'number'
          ? (file.metadata.size as number)
          : null;

      cvFiles.push({
        name: file.name as string,
        path,
        publicUrl: signed.signedUrl,
        updatedAt: (file.updated_at as string) ?? null,
        size,
      });
    }

    return { cvFiles };
  }

  async getCandidateCvFilesByCandidateId(
    candidateId: number,
  ): Promise<{ cvFiles: CandidateCvFileItem[] }> {
    if (!candidateId || Number.isNaN(candidateId)) {
      throw new BadRequestException('candidateId invalide');
    }

    const {
      data: candidate,
      error: candidateError,
    } = await this.supabase
      .from('candidates')
      .select('id, categorie_profil')
      .eq('id', candidateId)
      .maybeSingle();

    if (candidateError) {
      throw new BadRequestException(
        candidateError.message || 'Erreur lors du chargement du candidat',
      );
    }

    if (!candidate) {
      return { cvFiles: [] };
    }

    const category =
      (candidate.categorie_profil as string | null) || 'Autres';

    const basePath = `candidates/${category}/${candidateId}`;

    const { data: listed, error: listError } = await this.supabase.storage
      .from('tap_files')
      .list(basePath, {
        limit: 100,
      });

    if (listError) {
      throw new BadRequestException(
        listError.message || 'Erreur lors du listing des fichiers CV',
      );
    }

    const files = (listed ?? []).filter((f: any) => {
      if (typeof f.name !== 'string') return false;
      const name = f.name.toLowerCase();
      return name.startsWith('cv') && name.endsWith('.pdf');
    });

    const cvFiles: CandidateCvFileItem[] = [];

    for (const file of files) {
      const path = `${basePath}/${file.name}`;
      const { data: signed, error: signedError } = await this.supabase.storage
        .from('tap_files')
        .createSignedUrl(path, 60 * 60);

      if (signedError || !signed) {
        // on ignore juste ce fichier si la signature échoue
        // eslint-disable-next-line no-continue
        continue;
      }

      const size =
        typeof file.metadata?.size === 'number'
          ? (file.metadata.size as number)
          : null;

      cvFiles.push({
        name: file.name as string,
        path,
        publicUrl: signed.signedUrl,
        updatedAt: (file.updated_at as string) ?? null,
        size,
      });
    }

    return { cvFiles };
  }

  /** Talent Cards: tous les PDF dont le nom contient "talentcard". */
  private isTalentcardTapPdfFileName(fileName: string): boolean {
    const n = fileName.trim().toLowerCase();
    return n.includes('talentcard') && n.endsWith('.pdf');
  }

  async getCandidateTalentcardFiles(
    userId: number,
  ): Promise<{ talentcardFiles: CandidateCvFileItem[] }> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }

    const {
      data: candidate,
      error: candidateError,
    } = await this.supabase
      .from('candidates')
      .select('id, categorie_profil')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (candidateError) {
      throw new BadRequestException(
        candidateError.message || 'Erreur lors du chargement du candidat',
      );
    }

    if (!candidate) {
      return { talentcardFiles: [] };
    }

    const category =
      (candidate.categorie_profil as string | null) || 'Autres';
    const candidateId = candidate.id as number;

    const basePath = `candidates/${category}/${candidateId}`;

    const { data: listed, error: listError } = await this.supabase.storage
      .from('tap_files')
      .list(basePath, {
        limit: 100,
      });

    if (listError) {
      throw new BadRequestException(
        listError.message ||
          'Erreur lors du listing des fichiers Talent Card',
      );
    }

    const files = (listed ?? []).filter((f: any) => {
      if (typeof f.name !== 'string') return false;
      return this.isTalentcardTapPdfFileName(f.name);
    });

    const talentcardFiles: CandidateCvFileItem[] = [];

    for (const file of files) {
      const path = `${basePath}/${file.name}`;
      const { data: signed, error: signedError } = await this.supabase.storage
        .from('tap_files')
        .createSignedUrl(path, 60 * 60);

      if (signedError || !signed) {
        // on ignore ce fichier si la signature échoue
        // eslint-disable-next-line no-continue
        continue;
      }

      const size =
        typeof file.metadata?.size === 'number'
          ? (file.metadata.size as number)
          : null;

      talentcardFiles.push({
        name: file.name as string,
        path,
        publicUrl: signed.signedUrl,
        updatedAt: (file.updated_at as string) ?? null,
        size,
      });
    }

    return { talentcardFiles };
  }

  async getCandidateTalentcardFilesByCandidateId(
    candidateId: number,
  ): Promise<{ talentcardFiles: CandidateCvFileItem[] }> {
    if (!candidateId || Number.isNaN(candidateId)) {
      throw new BadRequestException('candidateId invalide');
    }

    const {
      data: candidate,
      error: candidateError,
    } = await this.supabase
      .from('candidates')
      .select('id, categorie_profil')
      .eq('id', candidateId)
      .maybeSingle();

    if (candidateError) {
      throw new BadRequestException(
        candidateError.message || 'Erreur lors du chargement du candidat',
      );
    }

    if (!candidate) {
      return { talentcardFiles: [] };
    }

    const category =
      (candidate.categorie_profil as string | null) || 'Autres';

    const basePath = `candidates/${category}/${candidateId}`;

    const { data: listed, error: listError } = await this.supabase.storage
      .from('tap_files')
      .list(basePath, {
        limit: 100,
      });

    if (listError) {
      throw new BadRequestException(
        listError.message ||
          'Erreur lors du listing des fichiers Talent Card',
      );
    }

    const files = (listed ?? []).filter((f: any) => {
      if (typeof f.name !== 'string') return false;
      return this.isTalentcardTapPdfFileName(f.name);
    });

    const talentcardFiles: CandidateCvFileItem[] = [];

    for (const file of files) {
      const path = `${basePath}/${file.name}`;
      const { data: signed, error: signedError } = await this.supabase.storage
        .from('tap_files')
        .createSignedUrl(path, 60 * 60);

      if (signedError || !signed) {
        // on ignore ce fichier si la signature échoue
        // eslint-disable-next-line no-continue
        continue;
      }

      const size =
        typeof file.metadata?.size === 'number'
          ? (file.metadata.size as number)
          : null;

      talentcardFiles.push({
        name: file.name as string,
        path,
        publicUrl: signed.signedUrl,
        updatedAt: (file.updated_at as string) ?? null,
        size,
      });
    }

    return { talentcardFiles };
  }

  /**
   * Vérifie qu'un recruteur a au moins une candidature (sur une de ses offres) pour ce candidat.
   */
  private async assertRecruiterHasCandidateApplication(
    recruiterUserId: number,
    candidateId: number,
  ): Promise<void> {
    const { data: jobs, error: jobsError } = await this.supabase
      .from('jobs')
      .select('id')
      .eq('user_id', recruiterUserId);

    if (jobsError) {
      throw new BadRequestException(
        jobsError.message || 'Erreur lors de la vérification des offres',
      );
    }

    const jobIds = (jobs ?? [])
      .map((j: any) => j.id as number)
      .filter((id: number) => Number.isFinite(id) && id > 0);
    if (!jobIds.length) {
      throw new ForbiddenException('Accès refusé');
    }

    const { data: row, error } = await this.supabase
      .from('candidate_postule')
      .select('id')
      .eq('candidate_id', candidateId)
      .in('job_id', jobIds)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        error.message || 'Erreur lors de la vérification de la candidature',
      );
    }
    if (!row) {
      throw new ForbiddenException('Accès refusé');
    }
  }

  /**
   * Talent cards d'un candidat pour un recruteur connecté (JWT), uniquement si une candidature existe.
   */
  async getRecruiterCandidateTalentcardFiles(
    recruiterUserId: number,
    candidateId: number,
  ): Promise<{ talentcardFiles: CandidateCvFileItem[] }> {
    if (!recruiterUserId || Number.isNaN(recruiterUserId)) {
      throw new BadRequestException('userId invalide');
    }
    if (!candidateId || Number.isNaN(candidateId)) {
      throw new BadRequestException('candidateId invalide');
    }

    await this.assertRecruiterHasCandidateApplication(
      recruiterUserId,
      candidateId,
    );
    return this.getCandidateTalentcardFilesByCandidateId(candidateId);
  }

  async getRecruiterCandidateBasicProfile(
    recruiterUserId: number,
    candidateId: number,
  ): Promise<{
    candidateId: number;
    nom: string | null;
    prenom: string | null;
    pays: string | null;
    ville: string | null;
  }> {
    if (!recruiterUserId || Number.isNaN(recruiterUserId)) {
      throw new BadRequestException('userId invalide');
    }
    if (!candidateId || Number.isNaN(candidateId)) {
      throw new BadRequestException('candidateId invalide');
    }

    await this.assertRecruiterHasCandidateApplication(
      recruiterUserId,
      candidateId,
    );

    const { data, error } = await this.supabase
      .from('candidates')
      .select('id, nom, prenom, pays, ville')
      .eq('id', candidateId)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        error.message || 'Erreur lors du chargement du profil candidat',
      );
    }
    if (!data?.id) {
      throw new BadRequestException('Candidat introuvable');
    }

    return {
      candidateId: Number(data.id),
      nom: (data.nom as string | null) ?? null,
      prenom: (data.prenom as string | null) ?? null,
      pays: (data.pays as string | null) ?? null,
      ville: (data.ville as string | null) ?? null,
    };
  }

  async getCandidatePortfolioPdfFiles(
    userId: number,
  ): Promise<CandidatePortfolioPdfFiles> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }

    const {
      data: candidate,
      error: candidateError,
    } = await this.supabase
      .from('candidates')
      .select('id, categorie_profil')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (candidateError) {
      throw new BadRequestException(
        candidateError.message || 'Erreur lors du chargement du candidat',
      );
    }

    if (!candidate) {
      return { portfolioShort: [], portfolioLong: [] };
    }

    const category =
      (candidate.categorie_profil as string | null) || 'Autres';
    const candidateId = candidate.id as number;

    const basePath = `candidates/${category}/${candidateId}`;

    const { data: listed, error: listError } = await this.supabase.storage
      .from('tap_files')
      .list(basePath, {
        limit: 100,
      });

    if (listError) {
      throw new BadRequestException(
        listError.message ||
          'Erreur lors du listing des fichiers de portfolio',
      );
    }

    const portfolioShort: CandidateCvFileItem[] = [];
    const portfolioLong: CandidateCvFileItem[] = [];

    const files = (listed ?? []).filter((f: any) => {
      if (typeof f.name !== 'string') return false;
      const name = f.name.toLowerCase();
      const isPdf = name.endsWith('.pdf');
      const startsWithPortfolio = name.startsWith('portfolio');
      if (!isPdf || !startsWithPortfolio) return false;

      // on supporte les 2 variantes : "one-page" et "one_page"
      const isShort =
        name.endsWith('_one-page_fr.pdf') ||
        name.endsWith('_one-page_en.pdf') ||
        name.endsWith('_one_page_fr.pdf') ||
        name.endsWith('_one_page_en.pdf');
      const isLong =
        name.endsWith('_long_fr.pdf') || name.endsWith('_long_en.pdf') ||
        (name.endsWith('_fr.pdf') && !isShort) ||
        (name.endsWith('_en.pdf') && !isShort);

      return isShort || isLong;
    });

    for (const file of files) {
      const name = (file.name as string).toLowerCase();
      const path = `${basePath}/${file.name}`;

      const { data: signed, error: signedError } = await this.supabase.storage
        .from('tap_files')
        .createSignedUrl(path, 60 * 60);

      if (signedError || !signed) {
        // on ignore ce fichier si la signature échoue
        // eslint-disable-next-line no-continue
        continue;
      }

      const size =
        typeof file.metadata?.size === 'number'
          ? (file.metadata.size as number)
          : null;

      const item: CandidateCvFileItem = {
        name: file.name as string,
        path,
        publicUrl: signed.signedUrl,
        updatedAt: (file.updated_at as string) ?? null,
        size,
      };

      const isShort =
        name.endsWith('_one-page_fr.pdf') ||
        name.endsWith('_one-page_en.pdf') ||
        name.endsWith('_one_page_fr.pdf') ||
        name.endsWith('_one_page_en.pdf');
      const isLong =
        name.endsWith('_long_fr.pdf') || name.endsWith('_long_en.pdf') ||
        (name.endsWith('_fr.pdf') && !isShort) ||
        (name.endsWith('_en.pdf') && !isShort);

      if (isShort) {
        portfolioShort.push(item);
      } else if (isLong) {
        portfolioLong.push(item);
      }
    }

    return { portfolioShort, portfolioLong };
  }

  /** Tolérance horloge alignée sur le front (onboarding). */
  private isFreshGenerationTimestamp(
    value: unknown,
    startedAtMs: number,
  ): boolean {
    if (typeof value !== 'string' || !value.trim()) return false;
    const parsedMs = new Date(value).getTime();
    if (!Number.isFinite(parsedMs)) return false;
    return parsedMs >= startedAtMs - 3000;
  }

  private hasMeaningfulScoreJson(score: CandidateScoreFromJson): boolean {
    return (
      typeof score.scoreGlobal === 'number' ||
      (Array.isArray(score.dimensions) && score.dimensions.length > 0) ||
      (typeof score.metadataTimestamp === 'string' &&
        score.metadataTimestamp.trim().length > 0)
    );
  }

  private listHasFreshGenerationFile(
    files: Array<{ updatedAt?: string | null; createdAt?: string | null }>,
    startedAtMs: number,
  ): boolean {
    return files.some(
      (f) =>
        this.isFreshGenerationTimestamp(f.updatedAt, startedAtMs) ||
        this.isFreshGenerationTimestamp(f.createdAt, startedAtMs),
    );
  }

  /** PDF CV corrigé généré par l’IA (ex. CV_TAP_fr.pdf). */
  private isCorrectedCvTapPdfFileName(fileName: string): boolean {
    const n = fileName.trim().toLowerCase();
    return n.startsWith('cv_tap') && n.endsWith('.pdf');
  }

  private listHasFreshCorrectedCvTapPdf(
    files: CandidateCvFileItem[],
    startedAtMs: number,
  ): boolean {
    return files.some(
      (f) =>
        this.isCorrectedCvTapPdfFileName(f.name) &&
        this.isFreshGenerationTimestamp(f.updatedAt, startedAtMs),
    );
  }

  /**
   * Agrège l’état réel de la chaîne de génération (stockage + score JSON).
   * Sans `generationStartedAtMs` : considère tout fichier / score existant comme terminé (tableau de bord).
   * Avec `generationStartedAtMs` : n’accepte que les artefacts « frais » (même logique que le polling onboarding).
   */
  async getCandidateGenerationStatus(
    userId: number,
    generationStartedAtMs?: number,
  ): Promise<CandidateGenerationStatusResponseDto> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }

    const since = generationStartedAtMs;
    const [cvRes, tcRes, scoreRes, portfolioRes] = await Promise.all([
      this.getCandidateCvFiles(userId),
      this.getCandidateTalentcardFiles(userId),
      this.getCandidateScoreFromJsonByUser(userId),
      this.getCandidatePortfolioPdfFiles(userId),
    ]);

    const cvFiles = cvRes.cvFiles;
    const tcFiles = tcRes.talentcardFiles;
    const score = scoreRes;
    const portfolioAll = [
      ...portfolioRes.portfolioShort,
      ...portfolioRes.portfolioLong,
    ];

    const readyCv =
      cvFiles.length > 0 &&
      (since == null || this.listHasFreshGenerationFile(cvFiles, since));
    const readyTalentCard =
      tcFiles.length > 0 &&
      (since == null || this.listHasFreshGenerationFile(tcFiles, since));
    const hasAnyCorrectedCvTap = cvFiles.some((f) =>
      this.isCorrectedCvTapPdfFileName(f.name),
    );
    const readyCvPdf =
      hasAnyCorrectedCvTap &&
      (since == null || this.listHasFreshCorrectedCvTapPdf(cvFiles, since));
    const readyScoring =
      since == null
        ? this.hasMeaningfulScoreJson(score)
        : this.isFreshGenerationTimestamp(score.metadataTimestamp, since) ||
          (this.hasMeaningfulScoreJson(score) && readyTalentCard);
    const readyPortfolio =
      portfolioAll.length > 0 &&
      (since == null || this.listHasFreshGenerationFile(portfolioAll, since));

    const pipeline: Array<{
      id: string;
      label: string;
      completed: boolean;
      workingMessage: string;
      doneMessage: string;
    }> = [
      {
        id: 'cv',
        label: 'CV',
        completed: readyCv,
        workingMessage: 'Enregistrement et analyse du CV en cours…',
        doneMessage: 'CV enregistré et disponible.',
      },
      {
        id: 'talentCard',
        label: 'Talent Card',
        completed: readyTalentCard,
        workingMessage: 'Génération de la Talent Card par l’IA…',
        doneMessage: 'Talent Card générée.',
      },
      {
        id: 'cvPdf',
        label: 'CV corrigé (PDF)',
        completed: readyCvPdf,
        workingMessage: 'Génération du CV corrigé (PDF TAP)…',
        doneMessage: 'CV corrigé disponible.',
      },
      {
        id: 'scoring',
        label: 'Scoring candidat',
        completed: readyScoring,
        workingMessage: 'Calcul du scoring candidat…',
        doneMessage: 'Scoring disponible.',
      },
      {
        id: 'portfolio',
        label: 'Portfolio One Page',
        completed: readyPortfolio,
        workingMessage: 'Génération du portfolio IA (One Page)…',
        doneMessage: 'Portfolio One Page prêt.',
      },
    ];

    let seenIncomplete = false;
    const steps = pipeline.map((p) => {
      let status: 'pending' | 'in_progress' | 'completed';
      let message: string;
      if (p.completed) {
        status = 'completed';
        message = p.doneMessage;
      } else if (!seenIncomplete) {
        status = 'in_progress';
        message = p.workingMessage;
        seenIncomplete = true;
      } else {
        status = 'pending';
        message = 'En attente de l’étape précédente…';
      }
      return {
        id: p.id,
        status,
        label: p.label,
        message,
      };
    });

    const completedCount = pipeline.filter((p) => p.completed).length;
    const allComplete = completedCount === pipeline.length;
    const currentStepId = allComplete
      ? null
      : (pipeline.find((p) => !p.completed)?.id ?? null);

    return {
      candidateId: score.candidateId,
      steps,
      currentStepId,
      progressPercent: Math.round((completedCount / pipeline.length) * 100),
      allComplete,
      serverTime: new Date().toISOString(),
    };
  }

  async getCandidatePortfolioPdfFilesByCandidateId(
    candidateId: number,
  ): Promise<CandidatePortfolioPdfFiles> {
    if (!candidateId || Number.isNaN(candidateId)) {
      throw new BadRequestException('candidateId invalide');
    }

    const {
      data: candidate,
      error: candidateError,
    } = await this.supabase
      .from('candidates')
      .select('id, categorie_profil')
      .eq('id', candidateId)
      .maybeSingle();

    if (candidateError) {
      throw new BadRequestException(
        candidateError.message || 'Erreur lors du chargement du candidat',
      );
    }

    if (!candidate) {
      return { portfolioShort: [], portfolioLong: [] };
    }

    const category =
      (candidate.categorie_profil as string | null) || 'Autres';

    const basePath = `candidates/${category}/${candidateId}`;

    const { data: listed, error: listError } = await this.supabase.storage
      .from('tap_files')
      .list(basePath, {
        limit: 100,
      });

    if (listError) {
      throw new BadRequestException(
        listError.message ||
          'Erreur lors du listing des fichiers de portfolio',
      );
    }

    const portfolioShort: CandidateCvFileItem[] = [];
    const portfolioLong: CandidateCvFileItem[] = [];

    const files = (listed ?? []).filter((f: any) => {
      if (typeof f.name !== 'string') return false;
      const name = f.name.toLowerCase();
      const isPdf = name.endsWith('.pdf');
      const startsWithPortfolio = name.startsWith('portfolio');
      if (!isPdf || !startsWithPortfolio) return false;

      const isShort =
        name.endsWith('_one-page_fr.pdf') ||
        name.endsWith('_one-page_en.pdf') ||
        name.endsWith('_one_page_fr.pdf') ||
        name.endsWith('_one_page_en.pdf');
      const isLong =
        name.endsWith('_long_fr.pdf') || name.endsWith('_long_en.pdf') ||
        (name.endsWith('_fr.pdf') && !isShort) ||
        (name.endsWith('_en.pdf') && !isShort);

      return isShort || isLong;
    });

    for (const file of files) {
      const name = (file.name as string).toLowerCase();
      const path = `${basePath}/${file.name}`;

      const { data: signed, error: signedError } = await this.supabase.storage
        .from('tap_files')
        .createSignedUrl(path, 60 * 60);

      if (signedError || !signed) {
        // on ignore ce fichier si la signature échoue
        // eslint-disable-next-line no-continue
        continue;
      }

      const size =
        typeof file.metadata?.size === 'number'
          ? (file.metadata.size as number)
          : null;

      const item: CandidateCvFileItem = {
        name: file.name as string,
        path,
        publicUrl: signed.signedUrl,
        updatedAt: (file.updated_at as string) ?? null,
        size,
      };

      const isShort =
        name.endsWith('_one-page_fr.pdf') ||
        name.endsWith('_one-page_en.pdf') ||
        name.endsWith('_one_page_fr.pdf') ||
        name.endsWith('_one_page_en.pdf');
      const isLong =
        name.endsWith('_long_fr.pdf') || name.endsWith('_long_en.pdf') ||
        (name.endsWith('_fr.pdf') && !isShort) ||
        (name.endsWith('_en.pdf') && !isShort);

      if (isShort) {
        portfolioShort.push(item);
      } else if (isLong) {
        portfolioLong.push(item);
      }
    }

    return { portfolioShort, portfolioLong };
  }

  async uploadCandidateCv(
    userId: number,
    file: any,
    opts?: { onboarding?: Record<string, any>; imgFile?: any },
  ): Promise<CandidateCvFileItem> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }
    if (!file || !file.buffer) {
      throw new BadRequestException('Fichier CV manquant');
    }
    const mime = (file.mimetype as string | undefined) ?? '';
    if (!mime.includes('pdf')) {
      throw new BadRequestException('Seuls les fichiers PDF sont acceptés');
    }

    const candidate = await this.getOrCreateCandidate(userId);
    const category = (candidate.categorie_profil as string | null) || 'Autres';
    const candidateId = candidate.id as number;
    const basePath = `candidates/${category}/${candidateId}`;

    const safeName = 'CV_importer.pdf';
    const path = `${basePath}/${safeName}`;

    // Nettoyage préventif: garder un seul CV "source" par candidat dans le Storage.
    // Avant d'uploader le nouveau CV, on supprime les anciens fichiers cv*.pdf.
    try {
      const { data: existingCvFiles, error: existingCvFilesError } =
        await this.supabase.storage.from('tap_files').list(basePath, {
          limit: 100,
        });

      if (!existingCvFilesError && existingCvFiles?.length) {
        const oldCvPaths = existingCvFiles
          .filter((f: any) => {
            if (typeof f?.name !== 'string') return false;
            const n = f.name.toLowerCase();
            // Nom standard unique du CV importé
            return n === 'cv_importer.pdf';
          })
          .map((f: any) => `${basePath}/${f.name}`);

        if (oldCvPaths.length) {
          const { error: removeError } = await this.supabase.storage
            .from('tap_files')
            .remove(oldCvPaths);
          if (removeError) {
            // Non bloquant: on continue, l'upload du nouveau CV reste prioritaire.
            console.warn(
              '[CV] Suppression anciens CV échouée pour candidat ' +
                candidateId +
                ': ' +
                removeError.message,
            );
          }
        }
      }
    } catch (cleanupErr) {
      // Non bloquant: en cas d'erreur de listing/suppression, on n'interrompt pas l'upload.
      console.warn(
        '[CV] Nettoyage anciens CV ignoré pour candidat ' +
          candidateId +
          ': ' +
          (cleanupErr as any)?.message,
      );
    }

    const { error: uploadError } = await this.supabase.storage
      .from('tap_files')
      .upload(path, file.buffer, {
        upsert: true,
        contentType: 'application/pdf',
      });

    if (uploadError) {
      throw new BadRequestException(
        uploadError.message || "Erreur lors de l'upload du CV",
      );
    }

    // Optionnel : garder le dernier CV dans la table candidates
    await this.supabase
      .from('candidates')
      .update({ cv_minio_url: path })
      .eq('id', candidateId);

    const { data: signed, error: signedError } = await this.supabase.storage
      .from('tap_files')
      .createSignedUrl(path, 60 * 60);

    if (signedError || !signed) {
      throw new BadRequestException(
        signedError?.message || "Erreur lors de la génération du lien de téléchargement",
      );
    }

    const size =
      typeof file.size === 'number' ? (file.size as number) : null;

    // Fire-and-forget: trigger Flask AI analysis
    const normalizedFlaskBase = this.tryGetFlaskBaseUrl();
    if (normalizedFlaskBase) {
      try {
        const FormData = require('form-data');
        const http = require('http');
        const https = require('https');
        const { URL } = require('url');

        const form = new FormData();
        form.append('cv_file', file.buffer, { filename: safeName, contentType: 'application/pdf' });
        form.append("existing_candidate_id", String(candidateId));
        form.append('storage_prefix', basePath);

        // Optional onboarding fields forwarded to Flask /process
        const onboarding = (opts?.onboarding ?? {}) as Record<string, any>;
        const forwardKeys = [
          'linkedin_url',
          'github_url',
          'behance_url',
          'target_position',
          'target_country',
          'pret_a_relocater',
          'constraints',
          'search_criteria',
          'nationality',
          'location_country',
          'seniority_level',
          'disponibilite',
          'salaire_minimum',
          'domaine_activite',
          'lang',
          'other_links',
        ];

        for (const key of forwardKeys) {
          const raw = onboarding[key];
          if (raw === undefined || raw === null) continue;
          if (key === 'other_links' && typeof raw !== 'string') {
            // Flask expects a JSON string for other_links
            form.append(key, JSON.stringify(raw));
            continue;
          }
          form.append(key, String(raw));
        }

        const typeContrat = onboarding.type_contrat;
        if (Array.isArray(typeContrat)) {
          typeContrat.forEach((v) => form.append('type_contrat', String(v)));
        } else if (typeof typeContrat === 'string' && typeContrat.trim()) {
          // if sent as comma-separated
          typeContrat
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean)
            .forEach((v) => form.append('type_contrat', v));
        }

        const imgFile = opts?.imgFile;
        if (imgFile?.buffer) {
          const contentType = (imgFile.mimetype as string | undefined) ?? 'application/octet-stream';
          const filename = (imgFile.originalname as string | undefined) ?? 'image';
          form.append('img_file', imgFile.buffer, { filename, contentType });
        }

        const parsed = new URL(normalizedFlaskBase + '/process');
        const transport = parsed.protocol === 'https:' ? https : http;
        const req = transport.request(
          {
            hostname: parsed.hostname,
            port: parsed.port,
            path: parsed.pathname,
            method: 'POST',
            headers: form.getHeaders(),
            timeout: 300000,
          },
          (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                console.log('[AI] Analyse lancee pour candidat ' + candidateId);
                // Le scoring est deja declenche dans Flask /process.
                // Ne pas relancer ici pour eviter un double scoring.
              } else {
                console.error('[AI] Erreur ' + res.statusCode + ' pour candidat ' + candidateId + ': ' + body);
              }
            });
          },
        );
        req.on('error', (err) => console.error('[AI] Connexion echouee pour candidat ' + candidateId + ':', err.message));
        form.pipe(req);
      } catch (triggerErr) {
        console.error('[AI] Exception trigger:', triggerErr.message);
      }
    }

    return {
      name: safeName,
      path,
      publicUrl: signed.signedUrl,
      updatedAt: new Date().toISOString(),
      size,
    };
  }

  async checkCvHasPhoto(
    userId: number,
    file: any,
  ): Promise<{ has_photo: boolean }> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }
    if (!file || !file.buffer) {
      throw new BadRequestException('Fichier CV manquant');
    }

    const mime = (file.mimetype as string | undefined) ?? '';
    if (!mime.includes('pdf')) {
      // Only PDF is supported for photo extraction today
      return { has_photo: false };
    }

    const flaskBase = this.tryGetFlaskBaseUrl();
    if (!flaskBase) {
      return { has_photo: false };
    }

    try {
      const FormData = require('form-data');
      const http = require('http');
      const https = require('https');
      const { URL } = require('url');

      const form = new FormData();
      form.append('cv_file', file.buffer, {
        filename: (file.originalname as string | undefined) ?? 'cv.pdf',
        contentType: 'application/pdf',
      });

      const parsed = new URL(flaskBase + '/check-cv-photo');
      const transport = parsed.protocol === 'https:' ? https : http;

      const result: { has_photo: boolean } = await new Promise(
        (resolve, reject) => {
          const req = transport.request(
            {
              hostname: parsed.hostname,
              port: parsed.port,
              path: parsed.pathname,
              method: 'POST',
              headers: form.getHeaders(),
              timeout: 60000,
            },
            (res) => {
              let body = '';
              res.on('data', (chunk) => (body += chunk));
              res.on('end', () => {
                try {
                  const parsedBody = body ? JSON.parse(body) : {};
                  const hasPhoto = Boolean(parsedBody?.has_photo);
                  resolve({ has_photo: hasPhoto });
                } catch {
                  resolve({ has_photo: false });
                }
              });
            },
          );
          req.on('error', reject);
          req.on('timeout', () => {
            req.destroy(new Error('timeout'));
          });
          form.pipe(req);
        },
      );

      return result;
    } catch {
      return { has_photo: false };
    }
  }

  async createRecruiterJob(
    userId: number,
    payload: RecruiterJobPayload,
  ): Promise<{ job: any }> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }

    const title = payload.title?.trim();
    if (!title) {
      throw new BadRequestException('Le titre du poste est obligatoire');
    }

    const locationType =
      typeof payload.localisation === 'string' && payload.localisation.trim()
        ? payload.localisation.trim()
        : null;

    const embedding = await this.fetchJobEmbeddingFromFlask({
      ...payload,
      title,
      localisation: locationType ?? payload.localisation,
    });

    const bodyToInsert: any = {
      title,
      categorie_profil: payload.categorie_profil ?? null,
      niveau_attendu: payload.niveau_attendu ?? null,
      experience_min: payload.experience_min ?? null,
      presence_sur_site: payload.presence_sur_site ?? null,
      reason: payload.reason ?? null,
      main_mission: payload.main_mission ?? null,
      tasks_other: payload.tasks_other ?? null,
      disponibilite: payload.disponibilite ?? null,
      salary_min: payload.salary_min ?? null,
      salary_max: payload.salary_max ?? null,
      urgent: Boolean(payload.urgent),
      contrat: payload.contrat ?? 'stage',
      niveau_seniorite: payload.niveau_seniorite ?? null,
      entreprise: payload.entreprise ?? null,
      phone: payload.phone ?? null,
      soft_skills: Array.isArray(payload.soft_skills) ? payload.soft_skills : null,
      skills: Array.isArray(payload.skills) ? payload.skills : null,
      languages: Array.isArray(payload.languages) ? payload.languages : null,
      location_type: locationType,
      embedding,
      user_id: userId,
    };

    const { data, error } = await this.supabase
      .from('jobs')
      .insert(bodyToInsert)
      .select('*')
      .single();

    if (error || !data) {
      throw new BadRequestException(
        error?.message || 'Erreur lors de la création de l’offre',
      );
    }

    return { job: data };
  }

  async getRecruiterJobsWithCounts(
    userId: number,
  ): Promise<{ jobs: any[] }> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }

    const { data, error } = await this.supabase
      .from('jobs')
      .select(`
        id,
        title,
        categorie_profil,
        niveau_attendu,
        experience_min,
        salary_min,
        salary_max,
        urgent,
        entreprise,
        contrat,
        created_at,
        location_type,
        status,
        candidate_postule ( id )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(
        error.message || 'Erreur lors du chargement des offres',
      );
    }

    const jobs =
      (data ?? []).map((row: any) => ({
        ...row,
        localisation:
          typeof row.location_type === 'string' && row.location_type.trim()
            ? (row.location_type as string)
            : null,
        status: (row.status as string) ?? 'ACTIVE',
        applicationCount: Array.isArray(row.candidate_postule)
          ? row.candidate_postule.length
          : 0,
      })) ?? [];

    return { jobs };
  }

  async getRecruiterJobById(
    userId: number,
    jobId: number,
  ): Promise<{ job: any }> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }
    if (!jobId || Number.isNaN(jobId)) {
      throw new BadRequestException('jobId invalide');
    }

    const { data, error } = await this.supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        error.message || 'Erreur lors du chargement de l’offre',
      );
    }
    if (!data) {
      throw new BadRequestException('Offre introuvable pour ce recruteur');
    }

    return { job: data };
  }

  async updateRecruiterJob(
    userId: number,
    jobId: number,
    payload: RecruiterJobPayload,
  ): Promise<{ job: any }> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }
    if (!jobId || Number.isNaN(jobId)) {
      throw new BadRequestException('jobId invalide');
    }

    const { data: existing, error: exErr } = await this.supabase
      .from('jobs')
      .select('id')
      .eq('id', jobId)
      .eq('user_id', userId)
      .maybeSingle();

    if (exErr) {
      throw new BadRequestException(
        exErr.message || 'Erreur lors de la vérification de l’offre',
      );
    }
    if (!existing) {
      throw new BadRequestException('Offre introuvable pour ce recruteur');
    }

    const title = payload.title?.trim();
    if (!title) {
      throw new BadRequestException('Le titre du poste est obligatoire');
    }

    const locationType =
      typeof payload.localisation === 'string' && payload.localisation.trim()
        ? payload.localisation.trim()
        : null;

    const embedding = await this.fetchJobEmbeddingFromFlask({
      ...payload,
      title,
      localisation: locationType ?? payload.localisation,
    });

    const bodyToUpdate: any = {
      title,
      categorie_profil: payload.categorie_profil ?? null,
      niveau_attendu: payload.niveau_attendu ?? null,
      experience_min: payload.experience_min ?? null,
      presence_sur_site: payload.presence_sur_site ?? null,
      reason: payload.reason ?? null,
      main_mission: payload.main_mission ?? null,
      tasks_other: payload.tasks_other ?? null,
      disponibilite: payload.disponibilite ?? null,
      salary_min: payload.salary_min ?? null,
      salary_max: payload.salary_max ?? null,
      urgent: Boolean(payload.urgent),
      contrat: payload.contrat ?? 'stage',
      niveau_seniorite: payload.niveau_seniorite ?? null,
      entreprise: payload.entreprise ?? null,
      phone: payload.phone ?? null,
      soft_skills: Array.isArray(payload.soft_skills) ? payload.soft_skills : null,
      skills: Array.isArray(payload.skills) ? payload.skills : null,
      languages: Array.isArray(payload.languages) ? payload.languages : null,
      location_type: locationType,
      embedding,
    };

    const { data, error } = await this.supabase
      .from('jobs')
      .update(bodyToUpdate)
      .eq('id', jobId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error || !data) {
      throw new BadRequestException(
        error?.message || 'Erreur lors de la mise à jour de l’offre',
      );
    }

    return { job: data };
  }

  async deleteRecruiterJob(
    userId: number,
    jobId: number,
  ): Promise<{ success: true }> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }
    if (!jobId || Number.isNaN(jobId)) {
      throw new BadRequestException('jobId invalide');
    }

    const { error } = await this.supabase
      .from('jobs')
      .delete()
      .eq('id', jobId)
      .eq('user_id', userId);

    if (error) {
      throw new BadRequestException(
        error.message || 'Erreur lors de la suppression de l’offre',
      );
    }

    return { success: true };
  }

  async updateRecruiterJobStatus(
    userId: number,
    jobId: number,
    status: 'ACTIVE' | 'INACTIVE',
  ): Promise<{ success: true }> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }
    if (!jobId || Number.isNaN(jobId)) {
      throw new BadRequestException('jobId invalide');
    }

    const { error } = await this.supabase
      .from('jobs')
      .update({ status })
      .eq('id', jobId)
      .eq('user_id', userId);

    if (error) {
      throw new BadRequestException(
        error.message || "Erreur lors de la mise à jour du statut de l'offre",
      );
    }

    return { success: true };
  }

  async getRecruiterMatchedCandidatesByOffer(
    userId: number,
    payload: RecruiterMatchByOfferPayload,
  ): Promise<any> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }

    const jobId = Number(payload?.job_id);
    if (!jobId || Number.isNaN(jobId)) {
      throw new BadRequestException("Le champ 'job_id' est requis");
    }

    // Security: ensure recruiter can only query their own jobs.
    const { data: job, error: jobError } = await this.supabase
      .from('jobs')
      .select('id')
      .eq('id', jobId)
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (jobError) {
      throw new BadRequestException(
        jobError.message || 'Erreur lors de la validation de l’offre',
      );
    }
    if (!job) {
      throw new BadRequestException('Offre introuvable pour ce recruteur');
    }

    return this.callFlaskJson<any>('POST', '/api/recruteur/match-by-offre', {
      job_id: jobId,
      top_n: payload?.top_n ?? 20,
      only_postule: Boolean(payload?.only_postule),
    });
  }

  async validateCandidateApplication(
    userId: number,
    payload: RecruiterValidateCandidatePayload,
  ): Promise<{
    success: boolean;
    applicationId: number;
    interviewQuestions: RecruiterInterviewQuestion[];
    interviewQuestionsError?: string | null;
    interviewPdfPath?: string | null;
    interviewPdfUrl?: string | null;
  }> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }

    const jobId = Number(payload?.job_id);
    const candidateId = Number(payload?.candidate_id);
    if (!jobId || Number.isNaN(jobId)) {
      throw new BadRequestException("Le champ 'job_id' est requis");
    }
    if (!candidateId || Number.isNaN(candidateId)) {
      throw new BadRequestException("Le champ 'candidate_id' est requis");
    }

    // Security: ensure recruiter can only validate on their own jobs.
    const { data: job, error: jobError } = await this.supabase
      .from('jobs')
      .select('id')
      .eq('id', jobId)
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (jobError) {
      throw new BadRequestException(
        jobError.message || 'Erreur lors de la validation de l’offre',
      );
    }
    if (!job) {
      throw new BadRequestException('Offre introuvable pour ce recruteur');
    }

    const { data: updated, error: updateError } = await this.supabase
      .from('candidate_postule')
      .update({
        validate: true,
        validated_at: new Date().toISOString(),
        status: 'ACCEPTEE',
      })
      .eq('job_id', jobId)
      .eq('candidate_id', candidateId)
      .select('id')
      .maybeSingle();

    if (updateError) {
      throw new BadRequestException(
        updateError.message || 'Erreur lors de la validation du candidat',
      );
    }
    if (!updated?.id) {
      throw new BadRequestException(
        "Candidature introuvable pour ce candidat et cette offre",
      );
    }

    // Déclenchement best-effort de la génération des questions d'entretien A4.
    // On ne bloque jamais la validation si la génération échoue.
    let interviewQuestions: RecruiterInterviewQuestion[] = [];
    let interviewQuestionsError: string | null = null;
    try {
      const qResp = await this.callFlaskJson<any>(
        'POST',
        '/api/recruteur/interview-questions',
        {
          candidate_id: candidateId,
          job_id: jobId,
        },
        90000,
      );
      if (qResp?.success && Array.isArray(qResp?.questions)) {
        interviewQuestions = qResp.questions
          .filter((q: any) => q && typeof q === 'object')
          .map((q: any, idx: number) => ({
            id: String(q.id ?? `q${idx + 1}`),
            text: String(q.text ?? '').trim(),
            category: String(q.category ?? 'autre').trim().toLowerCase(),
          }))
          .filter((q: RecruiterInterviewQuestion) => q.text.length > 0);
      } else if (typeof qResp?.error === 'string' && qResp.error.trim()) {
        interviewQuestionsError = qResp.error.trim();
      }
    } catch (e: any) {
      interviewQuestionsError =
        typeof e?.message === 'string' && e.message.trim()
          ? e.message.trim()
          : "Erreur lors de la génération des questions d'entretien";
    }

    // Best-effort: vérifier si un PDF entretien existe déjà dans le storage
    // pour ce candidat, afin de proposer un téléchargement immédiat côté front.
    let interviewPdfPath: string | null = null;
    let interviewPdfUrl: string | null = null;
    try {
      const { data: candRow } = await this.supabase
        .from('candidates')
        .select('id, categorie_profil')
        .eq('id', candidateId)
        .limit(1)
        .maybeSingle();

      if (candRow?.id) {
        const category = String(candRow.categorie_profil ?? 'Autres').trim() || 'Autres';
        const folderPath = `candidates/${category}/${candidateId}`;
        const { data: files, error: listError } = await this.supabase.storage
          .from('tap_files')
          .list(folderPath, {
            limit: 100,
            sortBy: { column: 'name', order: 'desc' },
          });

        if (!listError && Array.isArray(files) && files.length > 0) {
          const latestInterviewPdf = files
            .filter((f: any) => typeof f?.name === 'string' && f.name.toLowerCase().endsWith('.pdf'))
            .sort((a: any, b: any) => {
              const ta = new Date(String(a?.updated_at ?? a?.created_at ?? 0)).getTime();
              const tb = new Date(String(b?.updated_at ?? b?.created_at ?? 0)).getTime();
              return tb - ta;
            })[0];

          if (latestInterviewPdf?.name) {
            const path = `${folderPath}/${latestInterviewPdf.name}`;
            interviewPdfPath = path;
            const { data: signed, error: signError } = await this.supabase.storage
              .from('tap_files')
              .createSignedUrl(path, 60 * 60);
            interviewPdfUrl = signError ? null : (signed?.signedUrl ?? null);
          }
        }
      }
    } catch {
      // On ne bloque jamais la validation si la lecture storage échoue.
    }

    return {
      success: true,
      applicationId: Number(updated.id),
      interviewQuestions,
      interviewQuestionsError,
      interviewPdfPath,
      interviewPdfUrl,
    };
  }

  async updateCandidateApplicationStatus(
    userId: number,
    payload: RecruiterUpdateCandidateStatusPayload,
  ): Promise<{
    success: boolean;
    applicationId: number;
    status: RecruiterUpdateCandidateStatusPayload['status'];
    validate: boolean;
    validatedAt: string | null;
  }> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }

    const jobId = Number(payload?.job_id);
    const candidateId = Number(payload?.candidate_id);
    const status = payload?.status;

    if (!jobId || Number.isNaN(jobId)) {
      throw new BadRequestException("Le champ 'job_id' est requis");
    }
    if (!candidateId || Number.isNaN(candidateId)) {
      throw new BadRequestException("Le champ 'candidate_id' est requis");
    }
    if (!status || !['EN_COURS', 'ACCEPTEE', 'REFUSEE'].includes(status)) {
      throw new BadRequestException("Le champ 'status' est invalide");
    }

    // Security: ensure recruiter can only update on their own jobs.
    const { data: job, error: jobError } = await this.supabase
      .from('jobs')
      .select('id')
      .eq('id', jobId)
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (jobError) {
      throw new BadRequestException(
        jobError.message || "Erreur lors de la mise à jour de la candidature",
      );
    }
    if (!job) {
      throw new BadRequestException('Offre introuvable pour ce recruteur');
    }

    const nowIso = new Date().toISOString();
    const nextValidate = status === 'ACCEPTEE';
    const nextValidatedAt = status === 'ACCEPTEE' ? nowIso : null;

    const { data: updated, error: updateError } = await this.supabase
      .from('candidate_postule')
      .update({
        status,
        validate: nextValidate,
        validated_at: nextValidatedAt,
      })
      .eq('job_id', jobId)
      .eq('candidate_id', candidateId)
      .select('id, status, validate, validated_at')
      .maybeSingle();

    if (updateError) {
      throw new BadRequestException(
        updateError.message || 'Erreur lors de la mise à jour de la candidature',
      );
    }
    if (!updated?.id) {
      throw new BadRequestException(
        "Candidature introuvable pour ce candidat et cette offre",
      );
    }

    return {
      success: true,
      applicationId: Number(updated.id),
      status: updated.status as RecruiterUpdateCandidateStatusPayload['status'],
      validate: Boolean(updated.validate),
      validatedAt: (updated.validated_at as string) ?? null,
    };
  }

  async scheduleRecruiterInterview(
    recruiterUserId: number,
    payload: RecruiterScheduleInterviewPayload,
  ): Promise<{
    success: boolean;
    interviewId: number;
    mailSent: boolean;
    mailError?: string | null;
  }> {
    if (!recruiterUserId || Number.isNaN(recruiterUserId)) {
      throw new BadRequestException('userId invalide');
    }

    const jobId = Number(payload?.job_id);
    const candidateId = Number(payload?.candidate_id);
    const rawInterviewType = String(payload?.interview_type ?? '').trim();
    const interviewDate = String(payload?.interview_date ?? '').trim();
    const interviewTime = String(payload?.interview_time ?? '').trim();

    if (!jobId || Number.isNaN(jobId)) throw new BadRequestException("Le champ 'job_id' est requis");
    if (!candidateId || Number.isNaN(candidateId)) throw new BadRequestException("Le champ 'candidate_id' est requis");

    if (!rawInterviewType) throw new BadRequestException("Le champ 'interview_type' est requis");
    if (!interviewDate) throw new BadRequestException("Le champ 'interview_date' est requis");
    if (!interviewTime) throw new BadRequestException("Le champ 'interview_time' est requis");

    if (!/^\d{4}-\d{2}-\d{2}$/.test(interviewDate)) {
      throw new BadRequestException("Le champ 'interview_date' doit être au format YYYY-MM-DD");
    }
    if (!/^\d{2}:\d{2}$/.test(interviewTime)) {
      throw new BadRequestException("Le champ 'interview_time' doit être au format HH:MM");
    }

    // Normalise les libellés UI (Visio/Présentiel/Téléphone) vers les valeurs SQL attendues.
    const normalizedInterviewType =
      rawInterviewType.toLowerCase() === 'visio'
        ? 'EN_LIGNE'
        : rawInterviewType.toLowerCase() === 'présentiel' || rawInterviewType.toLowerCase() === 'presentiel'
          ? 'PRESENTIEL'
          : rawInterviewType.toLowerCase() === 'téléphone' || rawInterviewType.toLowerCase() === 'telephone'
            ? 'TELEPHONIQUE'
            : rawInterviewType;

    const allowed = ['EN_LIGNE', 'PRESENTIEL', 'TELEPHONIQUE'];
    if (!allowed.includes(normalizedInterviewType)) {
      throw new BadRequestException("Type d'entretien invalide");
    }

    // Security: le recruteur ne peut planifier que sur ses propres offres.
    const { data: job, error: jobError } = await this.supabase
      .from('jobs')
      .select('id, title, entreprise, user_id')
      .eq('id', jobId)
      .eq('user_id', recruiterUserId)
      .limit(1)
      .maybeSingle();

    if (jobError) {
      throw new BadRequestException(jobError.message || "Erreur lors du chargement de l'offre");
    }
    if (!job) {
      throw new BadRequestException('Offre introuvable pour ce recruteur');
    }

    // candidate_postule_id = table pivot (job_id + candidate_id).
    const { data: candidatePostule, error: postuleError } = await this.supabase
      .from('candidate_postule')
      .select('id')
      .eq('job_id', jobId)
      .eq('candidate_id', candidateId)
      .maybeSingle();

    if (postuleError) {
      throw new BadRequestException(postuleError.message || 'Erreur lors de la recherche candidature');
    }
    if (!candidatePostule?.id) {
      throw new BadRequestException("Candidature introuvable pour ce candidat et cette offre");
    }

    const { data: inserted, error: insertError } = await this.supabase
      .from('recruiter_scheduled_interviews')
      .insert({
        recruiter_user_id: recruiterUserId,
        job_id: jobId,
        candidate_id: candidateId,
        candidate_postule_id: candidatePostule.id,
        interview_type: normalizedInterviewType,
        interview_date: interviewDate,
        interview_time: interviewTime,
        status: 'PLANIFIE',
      })
      .select('id')
      .single();

    if (insertError || !inserted?.id) {
      throw new BadRequestException(insertError?.message || "Erreur lors de la planification de l'entretien");
    }

    // Envoi e-mail best-effort (on ne bloque pas la DB si l'e-mail échoue).
    let mailSent = false;
    let mailError: string | null = null;

    try {
      if (!this.mailer) {
        mailError = 'Mailer non configuré';
      } else {
        const { data: candidate, error: candidateError } = await this.supabase
          .from('candidates')
          .select('id, email, nom, prenom')
          .eq('id', candidateId)
          .maybeSingle();

        if (candidateError) {
          throw new Error(candidateError.message || 'Erreur lors du chargement du candidat');
        }

        const candidateEmail = (candidate?.email as string | null) ?? null;
        if (!candidateEmail) {
          mailError = 'Email candidat introuvable';
        } else {
          const from =
            this.config.get<string>('MAILER_FROM') ||
            this.config.get<string>('MAILER_USER') ||
            'noreply@tap.com';

          const candidateFirstName = (candidate?.prenom as string | null) ?? '';
          const candidateLastName = (candidate?.nom as string | null) ?? '';
          const candidateName = [candidateFirstName, candidateLastName].filter(Boolean).join(' ').trim();

          const formatDisplayType =
            normalizedInterviewType === 'EN_LIGNE'
              ? 'Visio'
              : normalizedInterviewType === 'PRESENTIEL'
                ? 'Présentiel'
                : 'Téléphone';

          const dateDisplay = new Date(`${interviewDate}T00:00:00`).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });

          const subject = `Entretien planifié (${formatDisplayType}) - ${String(job.title ?? 'Offre')}`;

          const html = `
            <p>Bonjour${candidateName ? ` ${candidateName}` : ''},</p>
            <p>Votre entretien a bien été planifié.</p>
            <ul>
              <li><strong>Offre :</strong> ${String(job.title ?? '')}</li>
              <li><strong>Format :</strong> ${formatDisplayType}</li>
              <li><strong>Date :</strong> ${dateDisplay}</li>
              <li><strong>Heure :</strong> ${interviewTime}</li>
            </ul>
            <p>Nous vous contacterons avant l’entretien si nécessaire.</p>
            <p>Cordialement,<br/>${String(job.entreprise ?? 'L’équipe recrutement')}</p>
          `;

          const text = [
            `Bonjour${candidateName ? ` ${candidateName}` : ''},`,
            '',
            'Votre entretien a bien été planifié.',
            '',
            `Offre : ${String(job.title ?? '')}`,
            `Format : ${formatDisplayType}`,
            `Date : ${dateDisplay}`,
            `Heure : ${interviewTime}`,
            '',
            'Cordialement,',
            String(job.entreprise ?? 'L’équipe recrutement'),
          ].join('\n');

          await this.mailer.sendMail({
            from: `"TAP" <${from}>`,
            to: candidateEmail,
            subject,
            text,
            html,
          });

          mailSent = true;
        }
      }
    } catch (err: any) {
      mailError = String(err?.message ?? err ?? 'Erreur envoi e-mail');
    }

    return {
      success: true,
      interviewId: Number(inserted.id),
      mailSent,
      mailError,
    };
  }

  async saveInterviewQuestionsPdf(
    userId: number,
    payload: RecruiterSaveInterviewPdfPayload,
  ): Promise<{
    success: boolean;
    file_path?: string;
    file_url?: string | null;
    questions_count?: number;
  }> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }

    const jobId = Number(payload?.job_id);
    const candidateId = Number(payload?.candidate_id);
    if (!jobId || Number.isNaN(jobId)) {
      throw new BadRequestException("Le champ 'job_id' est requis");
    }
    if (!candidateId || Number.isNaN(candidateId)) {
      throw new BadRequestException("Le champ 'candidate_id' est requis");
    }

    const { data: job, error: jobError } = await this.supabase
      .from('jobs')
      .select('id')
      .eq('id', jobId)
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (jobError) {
      throw new BadRequestException(
        jobError.message || 'Erreur lors de la validation de l’offre',
      );
    }
    if (!job) {
      throw new BadRequestException('Offre introuvable pour ce recruteur');
    }

    // Vérifier qu'il existe bien une candidature pour ce couple (job, candidate)
    const { data: postule, error: postuleError } = await this.supabase
      .from('candidate_postule')
      .select('id')
      .eq('job_id', jobId)
      .eq('candidate_id', candidateId)
      .limit(1)
      .maybeSingle();
    if (postuleError) {
      throw new BadRequestException(
        postuleError.message || 'Erreur lors de la vérification de la candidature',
      );
    }
    if (!postule?.id) {
      throw new BadRequestException(
        "Candidature introuvable pour ce candidat et cette offre",
      );
    }

    // Charger infos candidat + offre pour le header du PDF et le chemin de stockage
    const { data: candRow, error: candError } = await this.supabase
      .from('candidates')
      .select('id, id_agent, prenom, nom, categorie_profil')
      .eq('id', candidateId)
      .limit(1)
      .maybeSingle();
    if (candError) {
      throw new BadRequestException(
        candError.message || 'Erreur lors de la lecture du candidat',
      );
    }
    if (!candRow) {
      throw new BadRequestException('Candidat introuvable');
    }

    const { data: jobRow, error: jobReadError } = await this.supabase
      .from('jobs')
      .select('title')
      .eq('id', jobId)
      .limit(1)
      .maybeSingle();
    if (jobReadError) {
      throw new BadRequestException(
        jobReadError.message || "Erreur lors de la lecture de l'offre",
      );
    }

    // Questions: utiliser le payload si fourni, sinon les régénérer via Flask
    let questions: RecruiterInterviewQuestion[] = [];
    if (Array.isArray(payload?.questions) && payload.questions.length > 0) {
      questions = payload.questions
        .map((q: any, idx: number) => ({
          id: String(q?.id ?? `q${idx + 1}`),
          text: String(q?.text ?? '').trim(),
          category: String(q?.category ?? 'autre').trim().toLowerCase(),
        }))
        .filter((q) => q.text.length > 0);
    } else {
      const qResp = await this.callFlaskJson<any>(
        'POST',
        '/api/recruteur/interview-questions',
        {
          candidate_id: candidateId,
          job_id: jobId,
        },
      );
      if (!qResp?.success || !Array.isArray(qResp?.questions)) {
        throw new BadRequestException(
          qResp?.error || "Impossible de générer les questions d'entretien",
        );
      }
      questions = qResp.questions
        .map((q: any, idx: number) => ({
          id: String(q?.id ?? `q${idx + 1}`),
          text: String(q?.text ?? '').trim(),
          category: String(q?.category ?? 'autre').trim().toLowerCase(),
        }))
        .filter((q: RecruiterInterviewQuestion) => q.text.length > 0);
    }

    if (!questions.length) {
      throw new BadRequestException("Aucune question d'entretien à enregistrer");
    }

    // Génération PDF (Nest)
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const candidateName = `${String(candRow.prenom ?? '').trim()} ${String(candRow.nom ?? '').trim()}`.trim();
      const jobTitle = String(jobRow?.title ?? '').trim();
      const generatedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);

      doc.fontSize(16).font('Helvetica-Bold').text('Entretien TAP - Questions proposees');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      if (candidateName) doc.text(`Candidat: ${candidateName}`);
      doc.text(`Candidate ID: ${candidateId}`);
      if (jobTitle) doc.text(`Offre: ${jobTitle}`);
      doc.text(`Genere le: ${generatedAt} UTC`);
      doc.moveDown(0.8);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#CCCCCC').stroke();
      doc.moveDown(0.8);

      questions.forEach((q, index) => {
        doc.fontSize(11).font('Helvetica-Bold').text(`${index + 1}. [${q.category || 'autre'}]`);
        doc.moveDown(0.2);
        doc.fontSize(10).font('Helvetica').text(q.text, {
          width: 495,
          align: 'left',
        });
        doc.moveDown(0.8);
      });

      doc.end();
    });

    // Upload dans tap_files/candidates/<categorie>/<candidateId>/
    const category = String(candRow.categorie_profil ?? 'Autres').trim() || 'Autres';
    const idAgent = String(candRow.id_agent ?? `candidate_${candidateId}`).trim();
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15);
    const fileName = `entretien_tap_${idAgent}_${timestamp}.pdf`;
    const filePath = `candidates/${category}/${candidateId}/${fileName}`;

    const { error: uploadError } = await this.supabase.storage
      .from('tap_files')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      throw new BadRequestException(
        uploadError.message || "Erreur lors de l'upload du PDF d'entretien",
      );
    }

    const { data: signed, error: signError } = await this.supabase.storage
      .from('tap_files')
      .createSignedUrl(filePath, 60 * 60);

    return {
      success: true,
      file_path: filePath,
      file_url: signError ? null : (signed?.signedUrl ?? null),
      questions_count: questions.length,
    };
  }

  async getRecruiterOverview(
    userId: number,
  ): Promise<RecruiterOverviewStats> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }

    const { data: jobs, error } = await this.supabase
      .from('jobs')
      .select(
        `
        id,
        title,
        categorie_profil,
        urgent,
        created_at,
        candidate_postule ( id, candidate_id, validated_at, status )
      `,
      )
      .eq('user_id', userId);

    if (error) {
      throw new BadRequestException(
        error.message || 'Erreur lors du chargement du dashboard recruteur',
      );
    }

    const safeJobs = (jobs ?? []) as any[];

    const totalJobs = safeJobs.length;

    let totalApplications = 0;
    const candidateIds = new Set<number>();
    let urgentJobs = 0;
    let lastJobDate: string | null = null;

    const categoryCount = new Map<string, number>();
    const applicationsPerJob: { jobId: number; title: string; value: number }[] = [];
    const allApplications: {
      id: number;
      jobId: number;
      validatedAt: string | null;
      status: string | null;
      candidateId: number | null;
    }[] = [];

    for (const job of safeJobs) {
      const apps = Array.isArray(job.candidate_postule)
        ? job.candidate_postule
        : [];

      const count = apps.length;
      totalApplications += count;

      for (const app of apps) {
        const cId =
          typeof app.candidate_id === 'number' ? (app.candidate_id as number) : null;
        if (cId !== null) candidateIds.add(cId);
        allApplications.push({
          id: app.id as number,
          jobId: job.id as number,
          validatedAt: (app.validated_at as string) ?? null,
          status: (app.status as string) ?? null,
          candidateId: cId,
        });
      }

      if (job.urgent) {
        urgentJobs += 1;
      }

      if (job.created_at) {
        const d = new Date(job.created_at as string);
        if (!Number.isNaN(d.getTime())) {
          if (!lastJobDate || d > new Date(lastJobDate)) {
            lastJobDate = d.toISOString();
          }
        }
      }

      const cat = (job.categorie_profil as string | null) || 'Autres';
      categoryCount.set(cat, (categoryCount.get(cat) ?? 0) + 1);

      applicationsPerJob.push({
        jobId: job.id as number,
        title: (job.title as string) ?? 'Offre',
        value: count,
      });
    }

    const jobsPerCategory = Array.from(categoryCount.entries()).map(
      ([label, value]) => ({ label, value }),
    );

    // Trier les candidatures (par validatedAt décroissant)
    // Note: on n'exclut plus les candidatures sans validated_at (status en attente, etc.).
    const recentSorted = [...allApplications].sort((a, b) => {
      const da = a.validatedAt ? new Date(a.validatedAt as string).getTime() : 0;
      const db = b.validatedAt ? new Date(b.validatedAt as string).getTime() : 0;
      if (db !== da) return db - da;
      // Tie-breaker pour une stabilité du tri (id décroissant).
      return (b.id ?? 0) - (a.id ?? 0);
    });

    let recentApplications: RecruiterOverviewStats['recentApplications'] = [];
    let acceptedApplications: RecruiterOverviewStats['acceptedApplications'] = [];

    if (recentSorted.length > 0) {
      const candidateIdsArr = Array.from(
        new Set(
          recentSorted
            .map((a) => a.candidateId)
            .filter((id): id is number => typeof id === 'number'),
        ),
      );

      let candidatesMap = new Map<
        number,
        { nom: string | null; prenom: string | null; categorie_profil: string | null; avatarUrl: string | null }
      >();
      if (candidateIdsArr.length > 0) {
        const { data: candidatesRows } = await this.supabase
          .from('candidates')
          .select('id, nom, prenom, categorie_profil, image_minio_url')
          .in('id', candidateIdsArr);

        await Promise.all(
          (candidatesRows ?? []).map(async (row: any) => {
            const avatarUrl = await this.resolveCandidateAvatarUrl(
              row.image_minio_url as string | null,
            );

            candidatesMap.set(row.id as number, {
              nom: (row.nom as string) ?? null,
              prenom: (row.prenom as string) ?? null,
              categorie_profil: (row.categorie_profil as string) ?? null,
              avatarUrl,
            });
          }),
        );
      }

      const jobTitleMap = new Map<number, string>();
      safeJobs.forEach((job: any) => {
        jobTitleMap.set(job.id as number, (job.title as string) ?? 'Offre');
      });

      recentApplications = recentSorted.map((a) => {
        const c = a.candidateId ? candidatesMap.get(a.candidateId) : undefined;
        const name =
          c && (c.nom || c.prenom)
            ? [c.prenom, c.nom].filter(Boolean).join(' ')
            : null;
        return {
          id: a.id,
          jobId: a.jobId,
          candidateId: a.candidateId ?? null,
          candidateName: name,
          candidateCategory: c?.categorie_profil ?? null,
          candidateAvatarUrl: c?.avatarUrl ?? null,
          jobTitle: jobTitleMap.get(a.jobId) ?? 'Offre',
          status: a.status ?? null,
          validatedAt: a.validatedAt,
        };
      });
    }

    // Applications acceptées : tous les candidats "acceptés" (dédupliqués par candidateId)
    const isAcceptedStatus = (s: string | null) => {
      const v = (s ?? '').toLowerCase();
      return v === 'accepted' || v === 'accepté' || v === 'active' || v === 'acceptee' || v === 'acceptee';
    };

    const acceptedSorted = allApplications
      .filter((a) => a.candidateId !== null && a.validatedAt && isAcceptedStatus(a.status ?? null))
      .sort((a, b) => {
        const da = a.validatedAt ? new Date(a.validatedAt).getTime() : 0;
        const db = b.validatedAt ? new Date(b.validatedAt).getTime() : 0;
        if (db !== da) return db - da;
        return (b.id ?? 0) - (a.id ?? 0);
      });

    if (acceptedSorted.length > 0) {
      // Keep only the most recent application per candidate
      const bestByCandidate = new Map<number, (typeof acceptedSorted)[0]>();
      for (const a of acceptedSorted) {
        const cid = a.candidateId as number;
        if (!bestByCandidate.has(cid)) bestByCandidate.set(cid, a);
      }

      const acceptedCandidateIdsArr = Array.from(bestByCandidate.keys());

      const { data: candidatesRows } = await this.supabase
        .from('candidates')
        .select('id, nom, prenom, categorie_profil, image_minio_url')
        .in('id', acceptedCandidateIdsArr);

      const candidatesMapAccepted = new Map<
        number,
        { nom: string | null; prenom: string | null; categorie_profil: string | null; avatarUrl: string | null }
      >();

      await Promise.all(
        (candidatesRows ?? []).map(async (row: any) => {
          const avatarUrl = await this.resolveCandidateAvatarUrl(row.image_minio_url as string | null);
          candidatesMapAccepted.set(row.id as number, {
            nom: (row.nom as string) ?? null,
            prenom: (row.prenom as string) ?? null,
            categorie_profil: (row.categorie_profil as string) ?? null,
            avatarUrl,
          });
        }),
      );

      const jobTitleMap = new Map<number, string>();
      safeJobs.forEach((job: any) => {
        jobTitleMap.set(job.id as number, (job.title as string) ?? 'Offre');
      });

      acceptedApplications = Array.from(bestByCandidate.values())
        .sort((a, b) => {
          const da = a.validatedAt ? new Date(a.validatedAt).getTime() : 0;
          const db = b.validatedAt ? new Date(b.validatedAt).getTime() : 0;
          return db - da;
        })
        .map((a) => {
          const c = candidatesMapAccepted.get(a.candidateId as number);
          const name =
            c && (c.nom || c.prenom)
              ? [c.prenom, c.nom].filter(Boolean).join(' ')
              : null;
          return {
            id: a.id,
            jobId: a.jobId,
            candidateId: a.candidateId,
            candidateName: name,
            candidateCategory: c?.categorie_profil ?? null,
            candidateAvatarUrl: c?.avatarUrl ?? null,
            jobTitle: jobTitleMap.get(a.jobId) ?? 'Offre',
            status: a.status ?? null,
            validatedAt: a.validatedAt,
          };
        });
    }

    // Alertes recruteur simples
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const offersNoApps7d = safeJobs.filter((job: any) => {
      const createdAt = job.created_at ? new Date(job.created_at as string) : null;
      const apps = Array.isArray(job.candidate_postule)
        ? job.candidate_postule
        : [];
      return (
        createdAt &&
        createdAt < sevenDaysAgo &&
        apps.length === 0
      );
    });

    const urgentNoApps = safeJobs.filter((job: any) => {
      const apps = Array.isArray(job.candidate_postule)
        ? job.candidate_postule
        : [];
      return Boolean(job.urgent) && apps.length === 0;
    });

    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const newAppsCount = allApplications.filter((a) => {
      if (!a.validatedAt) return false;
      const d = new Date(a.validatedAt);
      return d > fortyEightHoursAgo;
    }).length;

    const alerts: RecruiterOverviewStats['alerts'] = [];

    if (offersNoApps7d.length > 0) {
      alerts.push({
        type: 'no_apps_7d',
        message: `${offersNoApps7d.length} offre(s) n'ont reçu aucune candidature depuis 7 jours.`,
      });
    }

    if (urgentNoApps.length > 0) {
      alerts.push({
        type: 'urgent_no_apps',
        message: `${urgentNoApps.length} offre(s) urgentes sans candidature.`,
      });
    }

    if (newAppsCount > 0) {
      alerts.push({
        type: 'new_apps',
        message: `${newAppsCount} nouvelle(s) candidature(s) reçue(s) ces dernières 48h.`,
      });
    }

    return {
      totalJobs,
      totalApplications,
      totalCandidates: candidateIds.size,
      urgentJobs,
      lastJobDate,
      jobsPerCategory,
      applicationsPerJob,
      recentApplications,
      acceptedApplications,
      alerts,
    };
  }

  async getCandidateMatchingJobs(
    userId: number | string | { sub?: unknown; id?: unknown; userId?: unknown; email?: unknown } | null | undefined,
  ): Promise<{ jobs: PublicJobItem[] }> {
    let normalizedUserId: number | null = null;
    try {
      normalizedUserId = await this.resolveUserId(userId);
    } catch {
      normalizedUserId = null;
    }

    let candidate:
      | { id: number; created_at: string }
      | { id: number; created_at?: string }
      | null = null;

    if (normalizedUserId) {
      candidate = await this.getCandidateIdForUser(normalizedUserId);
    }

    // Fallback robuste: certains anciens profils peuvent avoir user_id manquant,
    // mais email candidat rempli. On tente alors une résolution par email JWT.
    if (!candidate) {
      const email = this.extractEmailFromUserRef(userId);
      if (email) {
        const { data: candidateByEmail } = await this.supabase
          .from('candidates')
          .select('id, created_at')
          .eq('email', email)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (candidateByEmail) {
          candidate = {
            id: Number((candidateByEmail as any).id),
            created_at: (candidateByEmail as any).created_at as string,
          };
        }
      }
    }

    if (!candidate?.id) {
      return { jobs: [] };
    }

    let rows: any[] = [];
    try {
      const data = await this.callFlaskJson<{ jobs?: any[] }>(
        'GET',
        `/api/offres/matching/${encodeURIComponent(String(candidate.id))}`,
        undefined,
        120_000,
      );
      rows = Array.isArray(data?.jobs) ? data.jobs : [];
    } catch {
      rows = [];
    }
    const jobsFromAi: PublicJobItem[] = rows
      .map((row: any) => ({
      id: Number(row?.id),
      title: (row?.title as string | null) ?? null,
      categorie_profil: (row?.categorie_profil as string | null) ?? null,
      created_at: (row?.created_at as string | null) ?? null,
      urgent: Boolean(row?.urgent),
      location_type: (row?.location_type as string | null) ?? null,
      niveau_attendu: (row?.niveau_attendu as string | null) ?? null,
      experience_min: (row?.experience_min as string | null) ?? null,
      presence_sur_site: (row?.presence_sur_site as string | null) ?? null,
      localisation: (row?.localisation as string | null) ?? null,
      reason: (row?.reason as string | null) ?? null,
      main_mission: (row?.main_mission as string | null) ?? null,
      tasks_other: (row?.tasks_other as string | null) ?? null,
      disponibilite: (row?.disponibilite as string | null) ?? null,
      salary_min:
        typeof row?.salary_min === 'number' ? (row.salary_min as number) : null,
      salary_max:
        typeof row?.salary_max === 'number' ? (row.salary_max as number) : null,
      contrat: (row?.contrat as string | null) ?? null,
      niveau_seniorite: (row?.niveau_seniorite as string | null) ?? null,
      entreprise: (row?.entreprise as string | null) ?? null,
      phone: (row?.phone as string | null) ?? null,
      tasks: Array.isArray(row?.tasks) ? row.tasks : null,
      skills: Array.isArray(row?.skills) ? row.skills : null,
      languages: Array.isArray(row?.languages) ? row.languages : null,
      score: typeof row?.score === 'number' ? row.score : null,
      }))
      .filter((job) => typeof job.score === 'number' && job.score > 0.7);

    if (jobsFromAi.length > 0) {
      return { jobs: jobsFromAi };
    }

    // Fallback métier: si l'IA ne retourne rien, proposer les offres actives
    // du même domaine que le candidat pour éviter une page vide.
    const { data: candidateRow, error: candidateErr } = await this.supabase
      .from('candidates')
      .select('categorie_profil')
      .eq('id', candidate.id)
      .limit(1)
      .maybeSingle();

    if (candidateErr) {
      return { jobs: [] };
    }

    const candidateCategory = String(
      (candidateRow as any)?.categorie_profil ?? '',
    ).trim();
    if (!candidateCategory) {
      return { jobs: [] };
    }

    const { data: jobsRaw, error: jobsErr } = await this.supabase
      .from('jobs')
      .select(
        'id, title, categorie_profil, created_at, urgent, location_type, niveau_attendu, experience_min, presence_sur_site, localisation, reason, main_mission, tasks_other, disponibilite, salary_min, salary_max, contrat, niveau_seniorite, entreprise, phone, tasks, skills, languages, status',
      )
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false });

    if (jobsErr) {
      return { jobs: [] };
    }

    const norm = (v: unknown) =>
      String(v ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    const candidateNorm = norm(candidateCategory);
    const fallbackJobs: PublicJobItem[] = (jobsRaw ?? [])
      .filter((row: any) => norm(row?.categorie_profil) === candidateNorm)
      .slice(0, 20)
      .map((row: any) => ({
        id: Number(row?.id),
        title: (row?.title as string | null) ?? null,
        categorie_profil: (row?.categorie_profil as string | null) ?? null,
        created_at: (row?.created_at as string | null) ?? null,
        urgent: Boolean(row?.urgent),
        location_type: (row?.location_type as string | null) ?? null,
        niveau_attendu: (row?.niveau_attendu as string | null) ?? null,
        experience_min: (row?.experience_min as string | null) ?? null,
        presence_sur_site: (row?.presence_sur_site as string | null) ?? null,
        localisation: (row?.localisation as string | null) ?? null,
        reason: (row?.reason as string | null) ?? null,
        main_mission: (row?.main_mission as string | null) ?? null,
        tasks_other: (row?.tasks_other as string | null) ?? null,
        disponibilite: (row?.disponibilite as string | null) ?? null,
        salary_min:
          typeof row?.salary_min === 'number' ? (row.salary_min as number) : null,
        salary_max:
          typeof row?.salary_max === 'number' ? (row.salary_max as number) : null,
        contrat: (row?.contrat as string | null) ?? null,
        niveau_seniorite: (row?.niveau_seniorite as string | null) ?? null,
        entreprise: (row?.entreprise as string | null) ?? null,
        phone: (row?.phone as string | null) ?? null,
        tasks: Array.isArray(row?.tasks) ? row.tasks : null,
        skills: Array.isArray(row?.skills) ? row.skills : null,
        languages: Array.isArray(row?.languages) ? row.languages : null,
        // Fallback "matching domaine" conservé, avec un score conforme au seuil UI.
        score: 0.72,
      }));

    return { jobs: fallbackJobs };
  }

  async debugCandidateIdentity(
    userRef: number | string | { sub?: unknown; id?: unknown; userId?: unknown; email?: unknown } | null | undefined,
  ): Promise<{
    rawUser: any;
    resolvedUserId: number | null;
    resolveError: string | null;
    candidateFound: boolean;
    candidateId: number | null;
    candidateCategory: string | null;
  }> {
    const rawUser =
      typeof userRef === 'object' && userRef !== null
        ? {
            sub: (userRef as any).sub ?? null,
            id: (userRef as any).id ?? null,
            userId: (userRef as any).userId ?? null,
            email: (userRef as any).email ?? null,
            role: (userRef as any).role ?? null,
          }
        : userRef;

    let resolvedUserId: number | null = null;
    let resolveError: string | null = null;
    try {
      resolvedUserId = await this.resolveUserId(userRef as any);
    } catch (e: any) {
      resolveError = e?.message ?? 'resolveUserId failed';
    }

    if (!resolvedUserId) {
      return {
        rawUser,
        resolvedUserId: null,
        resolveError,
        candidateFound: false,
        candidateId: null,
        candidateCategory: null,
      };
    }

    const { data: candidate, error } = await this.supabase
      .from('candidates')
      .select('id, categorie_profil')
      .eq('user_id', resolvedUserId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !candidate) {
      return {
        rawUser,
        resolvedUserId,
        resolveError,
        candidateFound: false,
        candidateId: null,
        candidateCategory: null,
      };
    }

    return {
      rawUser,
      resolvedUserId,
      resolveError,
      candidateFound: true,
      candidateId: Number((candidate as any).id),
      candidateCategory: String((candidate as any).categorie_profil ?? ''),
    };
  }

  async getAllJobsForCandidates(): Promise<{ jobs: PublicJobItem[] }> {
    const { data, error } = await this.supabase
      .from('jobs')
      .select(
        'id, title, categorie_profil, created_at, urgent, location_type, niveau_attendu, experience_min, presence_sur_site, reason, main_mission, tasks_other, disponibilite, salary_min, salary_max, contrat, niveau_seniorite, entreprise, phone, tasks, skills, languages, status',
      )
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(
        error.message || 'Erreur lors du chargement des offres',
      );
    }

    const jobs: PublicJobItem[] = (data ?? []).map((row: any) => ({
      id: row.id as number,
      title: (row.title as string) ?? null,
      categorie_profil: (row.categorie_profil as string) ?? null,
      created_at: (row.created_at as string) ?? null,
      urgent: Boolean(row.urgent),
      location_type:
        typeof row.location_type === 'string' && row.location_type.trim()
          ? (row.location_type as string)
          : null,
      niveau_attendu:
        typeof row.niveau_attendu === 'string' ? (row.niveau_attendu as string) : null,
      experience_min:
        typeof row.experience_min === 'string' ? (row.experience_min as string) : null,
      presence_sur_site:
        typeof row.presence_sur_site === 'string' ? (row.presence_sur_site as string) : null,
      localisation: null,
      reason: typeof row.reason === 'string' ? (row.reason as string) : null,
      main_mission:
        typeof row.main_mission === 'string' ? (row.main_mission as string) : null,
      tasks_other:
        typeof row.tasks_other === 'string' ? (row.tasks_other as string) : null,
      disponibilite:
        typeof row.disponibilite === 'string' ? (row.disponibilite as string) : null,
      salary_min:
        typeof row.salary_min === 'number' ? (row.salary_min as number) : null,
      salary_max:
        typeof row.salary_max === 'number' ? (row.salary_max as number) : null,
      contrat: typeof row.contrat === 'string' ? (row.contrat as string) : null,
      niveau_seniorite:
        typeof row.niveau_seniorite === 'string'
          ? (row.niveau_seniorite as string)
          : null,
      entreprise:
        typeof row.entreprise === 'string' ? (row.entreprise as string) : null,
      phone: typeof row.phone === 'string' ? (row.phone as string) : null,
      tasks: Array.isArray(row.tasks) ? (row.tasks as any[]) : null,
      skills: Array.isArray(row.skills) ? (row.skills as any[]) : null,
      languages: Array.isArray(row.languages) ? (row.languages as any[]) : null,
    }));

    return { jobs };
  }

  async applyToJob(userId: number, payload: ApplyJobPayload): Promise<{ success: boolean; applicationId: number; status: string }> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }
    if (!payload || !payload.jobId || Number.isNaN(payload.jobId)) {
      throw new BadRequestException('jobId invalide');
    }

    const jobId = Number(payload.jobId);

    // Ensure we have a candidate row for this user
    const candidate = await this.getOrCreateCandidate(userId);
    const candidateId = candidate.id as number;

    // Store the selected files + link in `note` for now (DB schema currently doesn't have dedicated columns)
    const notePayload = {
      lien: payload.lien ?? null,
      cvPath: payload.cvPath ?? null,
      portfolioPath: payload.portfolioPath ?? null,
      talentCardPath: payload.talentCardPath ?? null,
    };
    const note = JSON.stringify(notePayload);

    const { data: existing, error: existingError } = await this.supabase
      .from('candidate_postule')
      .select('id, status')
      .eq('candidate_id', candidateId)
      .eq('job_id', jobId)
      .maybeSingle();

    if (existingError) {
      throw new BadRequestException(existingError.message || 'Erreur lors de la recherche candidature');
    }

    const useTapCv = Boolean(payload.cvPath || payload.portfolioPath || payload.talentCardPath);

    if (existing) {
      const { data: updated, error: updateError } = await this.supabase
        .from('candidate_postule')
        .update({
          note,
          use_tap_cv: useTapCv,
          validate: false,
          status: 'EN_COURS',
        })
        .eq('id', existing.id)
        .select('id, status')
        .single();

      if (updateError || !updated) {
        throw new BadRequestException(updateError?.message || 'Erreur lors de la mise a jour de la candidature');
      }

      return { success: true, applicationId: updated.id as number, status: (updated.status as string) || 'EN_COURS' };
    }

    const { data: inserted, error: insertError } = await this.supabase
      .from('candidate_postule')
      .insert({
        job_id: jobId,
        candidate_id: candidateId,
        note,
        validate: false,
        use_tap_cv: useTapCv,
        status: 'EN_COURS',
      })
      .select('id, status')
      .single();

    if (insertError || !inserted) {
      throw new BadRequestException(insertError?.message || "Erreur lors de l'ajout de la candidature");
    }

    return { success: true, applicationId: inserted.id as number, status: (inserted.status as string) || 'EN_COURS' };
  }

  async getCandidateSavedJobs(userId: number): Promise<{ jobIds: number[] }> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }

    const candidate = await this.getOrCreateCandidate(userId);

    const { data, error } = await this.supabase
      .from('candidate_saved_jobs')
      .select('job_id')
      .eq('candidate_id', candidate.id);

    if (error) {
      throw new BadRequestException(
        error.message || 'Erreur lors du chargement des offres enregistrées',
      );
    }

    const jobIds = (data ?? [])
      .map((row: any) => Number(row?.job_id))
      .filter((id: number) => Number.isFinite(id) && id > 0);

    return { jobIds };
  }

  async toggleCandidateSavedJob(
    userId: number,
    payload: ToggleSavedJobPayload,
  ): Promise<{ success: boolean; saved: boolean; jobId: number }> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }
    const jobId = Number(payload?.jobId);
    if (!jobId || Number.isNaN(jobId)) {
      throw new BadRequestException("Le champ 'jobId' est requis");
    }

    const candidate = await this.getOrCreateCandidate(userId);

    const { data: existing, error: existingError } = await this.supabase
      .from('candidate_saved_jobs')
      .select('id')
      .eq('candidate_id', candidate.id)
      .eq('job_id', jobId)
      .maybeSingle();

    if (existingError) {
      throw new BadRequestException(
        existingError.message || "Erreur lors de la recherche de l'offre enregistrée",
      );
    }

    if (existing?.id) {
      const { error: deleteError } = await this.supabase
        .from('candidate_saved_jobs')
        .delete()
        .eq('id', existing.id);

      if (deleteError) {
        throw new BadRequestException(
          deleteError.message || "Erreur lors de la suppression de l'offre enregistrée",
        );
      }

      return { success: true, saved: false, jobId };
    }

    const { error: insertError } = await this.supabase
      .from('candidate_saved_jobs')
      .insert({
        candidate_id: candidate.id,
        job_id: jobId,
      });

    if (insertError) {
      throw new BadRequestException(
        insertError.message || "Erreur lors de l'enregistrement de l'offre",
      );
    }

    return { success: true, saved: true, jobId };
  }

  async getCandidateScoreFromJson(
    candidateId: number,
  ): Promise<CandidateScoreFromJson> {
    if (!candidateId || Number.isNaN(candidateId)) {
      throw new BadRequestException('candidateId invalide');
    }

    const {
      data: candidate,
      error: candidateError,
    } = await this.supabase
      .from('candidates')
      .select('id, categorie_profil')
      .eq('id', candidateId)
      .maybeSingle();

    if (candidateError) {
      throw new BadRequestException(
        candidateError.message || 'Erreur lors du chargement du candidat',
      );
    }

    if (!candidate) {
      return {
        candidateId: null,
        scoreGlobal: null,
        decision: null,
        familleDominante: null,
        metadataTimestamp: null,
        metadataSector: null,
        metadataModule: null,
        commentaire: null,
        dimensions: [],
        skills: [],
        softSkills: [],
      };
    }

    const category =
      (candidate.categorie_profil as string | null) || 'Autres';
    const basePath = `candidates/${category}/${candidateId}`;

    const { data: listed, error: listError } = await this.supabase.storage
      .from('tap_files')
      .list(basePath, {
        limit: 100,
      });

    if (listError) {
      throw new BadRequestException(
        listError.message ||
          'Erreur lors du listing des fichiers de scoring',
      );
    }

    const analysisFiles =
      (listed ?? []).filter((f: any) => {
        if (typeof f.name !== 'string') return false;
        const name = f.name.toLowerCase();
        return name.endsWith('_analyse.json') || name.endsWith('a2_analyse.json');
      }) ?? [];

    if (analysisFiles.length === 0) {
      return {
        candidateId,
        scoreGlobal: null,
        decision: null,
        familleDominante: null,
        metadataTimestamp: null,
        metadataSector: null,
        metadataModule: null,
        commentaire: null,
        dimensions: [],
        skills: [],
        softSkills: [],
      };
    }

    const latestFile = analysisFiles
      .slice()
      .sort((a: any, b: any) => {
        const da = a.updated_at ? new Date(a.updated_at as string).getTime() : 0;
        const db = b.updated_at ? new Date(b.updated_at as string).getTime() : 0;
        return db - da;
      })[0];

    const path = `${basePath}/${latestFile.name as string}`;

    const { data: fileData, error: downloadError } = await this.supabase
      .storage
      .from('tap_files')
      .download(path);

    if (downloadError || !fileData) {
      throw new BadRequestException(
        downloadError?.message ||
          'Erreur lors du téléchargement du fichier de scoring',
      );
    }

    const text = await (fileData as any).text();
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new BadRequestException('Fichier de scoring JSON invalide');
    }

    const scoreGlobal =
      typeof parsed?.scores?.score_global === 'number'
        ? (parsed.scores.score_global as number)
        : null;
    const decision =
      typeof parsed?.decision === 'string' ? (parsed.decision as string) : null;
    const familleDominante =
      typeof parsed?.metadata?.famille_dominante === 'string'
        ? (parsed.metadata.famille_dominante as string)
        : null;

    const metadataTimestamp =
      typeof parsed?.metadata?.timestamp === 'string'
        ? (parsed.metadata.timestamp as string)
        : null;
    const metadataSector =
      typeof parsed?.metadata?.sector_detected === 'string'
        ? (parsed.metadata.sector_detected as string)
        : null;
    const metadataModule =
      typeof parsed?.metadata?.module_used === 'string'
        ? (parsed.metadata.module_used as string)
        : null;

    const commentaire =
      typeof parsed?.commentaire_recruteur === 'string'
        ? (parsed.commentaire_recruteur as string)
        : null;

    const dims: { id: string; label: string; score: number }[] = [];
    const dimSrc = parsed?.scores?.dimensions ?? {};
    const dimsById = new Map<string, { id: string; label: string; score: number }>();

    const upsertDim = (id: string, label: string, score: unknown) => {
      if (typeof score !== 'number') return;
      dimsById.set(id, {
        id,
        label,
        score,
      });
    };

    // Source 1: formats avec objet dimensions.
    // Format A2 actuel: impact, hard_skills_depth, coherence, rarete_marche, stabilite, communication.
    upsertDim('preuves_impact', 'Preuves d’impact', dimSrc?.impact?.score);
    upsertDim('hard_skills_fit', 'Hard skills fit', dimSrc?.hard_skills_depth?.score);
    upsertDim('coherence_parcours', 'Cohérence parcours', dimSrc?.coherence?.score);
    upsertDim('rarete_marche', 'Rareté marché', dimSrc?.rarete_marche?.score);
    upsertDim('stabilite_risque', 'Stabilité / risque', dimSrc?.stabilite?.score);
    upsertDim('communication_clarte', 'Clarté de communication', dimSrc?.communication?.score);

    // Format historique alternatif.
    upsertDim('hard_skills_fit', 'Hard skills fit', dimSrc?.hard_skills_fit?.score);
    upsertDim('preuves_impact', 'Preuves d’impact', dimSrc?.preuves_impact?.score);
    upsertDim('rarete_marche', 'Rareté marché', dimSrc?.rarete_marche?.score);
    upsertDim('coherence_parcours', 'Cohérence parcours', dimSrc?.coherence_parcours?.score);
    upsertDim('stabilite_risque', 'Stabilité / risque', dimSrc?.stabilite_risque?.score);
    upsertDim('communication_clarte', 'Clarté de communication', dimSrc?.communication_clarte?.score);

    // Source 2: champs dim_* aplatis (souvent présents dans le scoring actuel).
    upsertDim('preuves_impact', 'Preuves d’impact', parsed?.scores?.dim_impact);
    upsertDim('hard_skills_fit', 'Hard skills fit', parsed?.scores?.dim_hard_skills_depth);
    upsertDim('coherence_parcours', 'Cohérence parcours', parsed?.scores?.dim_coherence);
    upsertDim('rarete_marche', 'Rareté marché', parsed?.scores?.dim_rarete_marche);
    upsertDim('stabilite_risque', 'Stabilité / risque', parsed?.scores?.dim_stabilite);
    upsertDim('communication_clarte', 'Clarté de communication', parsed?.scores?.dim_communication);

    dims.push(
      ...(Array.from(dimsById.values()).sort(
        (a, b) =>
          [
            'hard_skills_fit',
            'preuves_impact',
            'rarete_marche',
            'coherence_parcours',
            'stabilite_risque',
            'communication_clarte',
          ].indexOf(a.id) -
          [
            'hard_skills_fit',
            'preuves_impact',
            'rarete_marche',
            'coherence_parcours',
            'stabilite_risque',
            'communication_clarte',
          ].indexOf(b.id),
      )),
    );

    const skills: {
      name: string;
      score: number;
      status: string;
      scope: string;
    }[] = Array.isArray(parsed?.skills)
      ? parsed.skills.map((s: any) => ({
          name: (s?.name as string) ?? '',
          score:
            typeof s?.score === 'number' ? (s.score as number) : 0,
          status: (s?.status as string) ?? '',
          scope: (s?.scope as string) ?? '',
        }))
      : [];

    const softSkills: { nom: string; niveau: string }[] =
      Array.isArray(parsed?.evaluation_soft_skills_declares)
        ? parsed.evaluation_soft_skills_declares.map((s: any) => ({
            nom: (s?.nom as string) ?? '',
            niveau: (s?.niveau as string) ?? '',
          }))
        : [];

    return {
      candidateId,
      scoreGlobal,
      decision,
      familleDominante,
      metadataTimestamp,
      metadataSector,
      metadataModule,
      commentaire,
      dimensions: dims,
      skills,
      softSkills,
    };
  }

  async getCandidateScoreFromJsonByUser(
    userId: number,
  ): Promise<CandidateScoreFromJson> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }

    const candidate = await this.getCandidateIdForUser(userId);

    if (!candidate) {
      return {
        candidateId: null,
        scoreGlobal: null,
        decision: null,
        familleDominante: null,
        metadataTimestamp: null,
        metadataSector: null,
        metadataModule: null,
        commentaire: null,
        dimensions: [],
        skills: [],
        softSkills: [],
      };
    }

    return this.getCandidateScoreFromJson(candidate.id);
  }

  async getCandidateProfileByUser(userId: number): Promise<CandidateProfile> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }

    const candidate = await this.getOrCreateCandidate(userId);
    const candidateId = candidate.id as number;

    const { data, error } = await this.supabase
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .maybeSingle();

    if (error || !data) {
      throw new BadRequestException(
        error?.message || 'Erreur lors du chargement du profil candidat',
      );
    }

    return {
      candidateId,
      nom: (data.nom as string) ?? '',
      prenom: (data.prenom as string) ?? '',
      titre_profil: (data.titre_profil as string | null) ?? null,
      categorie_profil: (data.categorie_profil as string | null) ?? null,
      ville: (data.ville as string | null) ?? null,
      pays: (data.pays as string | null) ?? null,
      pays_cible: (data.pays_cible as string | null) ?? null,
      linkedin: (data.linkedin as string | null) ?? null,
      github: (data.github as string | null) ?? null,
      behance: (data.behance as string | null) ?? null,
      email: (data.email as string | null) ?? null,
      phone: (data.phone as string | null) ?? null,
      annees_experience:
        typeof data.annees_experience === 'number'
          ? (data.annees_experience as number)
          : null,
      disponibilite: (data.disponibilite as string | null) ?? null,
      pret_a_relocater: (data.pret_a_relocater as string | null) ?? null,
      niveau_seniorite: (data.niveau_seniorite as string | null) ?? null,
      salaire_minimum: (data.salaire_minimum as string | null) ?? null,
      constraints: (data.constraints as string | null) ?? null,
      search_criteria: (data.search_criteria as string | null) ?? null,
      resume_bref: (data.resume_bref as string | null) ?? null,
      type_contrat: (data.type_contrat as string | null) ?? null,
    };
  }

  async updateCandidateProfileByUser(
    userId: number,
    payload: Partial<CandidateProfile>,
  ): Promise<CandidateProfile> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }

    const candidate = await this.getOrCreateCandidate(userId);
    const candidateId = candidate.id as number;
    const { data: currentRow, error: currentRowError } = await this.supabase
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .maybeSingle();

    if (currentRowError || !currentRow) {
      throw new BadRequestException(
        currentRowError?.message || 'Impossible de charger le profil candidat',
      );
    }

    const updatableKeys = [
      'nom',
      'prenom',
      'titre_profil',
      'categorie_profil',
      'ville',
      'pays',
      'pays_cible',
      'linkedin',
      'github',
      'behance',
      'email',
      'phone',
      'annees_experience',
      'disponibilite',
      'pret_a_relocater',
      'niveau_seniorite',
      'salaire_minimum',
      'constraints',
      'search_criteria',
      'resume_bref',
      'type_contrat',
    ] as const;

    const toUpdate: Record<string, any> = {};
    const existingColumns = new Set(Object.keys(currentRow as Record<string, unknown>));
    for (const key of updatableKeys) {
      if (payload[key] !== undefined && existingColumns.has(key)) {
        toUpdate[key] = payload[key];
      }
    }

    if (Object.keys(toUpdate).length === 0) {
      return this.getCandidateProfileByUser(userId);
    }

    if (typeof toUpdate.nom === 'string') toUpdate.nom = toUpdate.nom.trim();
    if (typeof toUpdate.prenom === 'string') toUpdate.prenom = toUpdate.prenom.trim();
    if (!toUpdate.nom) toUpdate.nom = 'À compléter';
    if (toUpdate.prenom === null) toUpdate.prenom = '';

    if (toUpdate.annees_experience !== undefined && toUpdate.annees_experience !== null) {
      const parsed = Number(toUpdate.annees_experience);
      toUpdate.annees_experience = Number.isFinite(parsed) ? parsed : null;
    }

    const { error } = await this.supabase
      .from('candidates')
      .update(toUpdate)
      .eq('id', candidateId);

    if (error) {
      throw new BadRequestException(
        error.message || 'Erreur lors de la mise à jour du profil candidat',
      );
    }

    return this.getCandidateProfileByUser(userId);
  }

  async deleteCandidateCvFile(userId: number, filePath: string): Promise<void> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }
    if (!filePath) {
      throw new BadRequestException('Chemin du fichier manquant');
    }

    const { data: candidate } = await this.supabase
      .from('candidates')
      .select('id, categorie_profil')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!candidate) {
      throw new BadRequestException('Aucun profil candidat associe');
    }

    const category = (candidate.categorie_profil as string | null) || 'Autres';
    const candidateId = candidate.id as number;
    const expectedPrefix = 'candidates/' + category + '/' + candidateId + '/';

    if (!filePath.startsWith(expectedPrefix)) {
      throw new BadRequestException('Acces non autorise a ce fichier');
    }

    const { error } = await this.supabase.storage
      .from('tap_files')
      .remove([filePath]);

    if (error) {
      throw new BadRequestException(error.message || 'Erreur lors de la suppression');
    }
  }

  async deleteCandidateTalentcardFile(userId: number, filePath: string): Promise<void> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }
    if (!filePath) {
      throw new BadRequestException('Chemin du fichier manquant');
    }

    const { data: candidate } = await this.supabase
      .from('candidates')
      .select('id, categorie_profil')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!candidate) {
      throw new BadRequestException('Aucun profil candidat associé');
    }

    const category = (candidate.categorie_profil as string | null) || 'Autres';
    const candidateId = candidate.id as number;
    const expectedPrefix = `candidates/${category}/${candidateId}/`;

    if (!filePath.startsWith(expectedPrefix)) {
      throw new BadRequestException('Acces non autorise a ce fichier');
    }

    const fileName = filePath.slice(expectedPrefix.length).toLowerCase();
    const isTalentcard = this.isTalentcardTapPdfFileName(fileName);
    if (!isTalentcard) {
      throw new BadRequestException('Type de fichier invalide pour Talent Card');
    }

    const { error } = await this.supabase.storage
      .from('tap_files')
      .remove([filePath]);

    if (error) {
      throw new BadRequestException(error.message || 'Erreur lors de la suppression');
    }
  }

  async deleteCandidatePortfolioPdfFile(userId: number, filePath: string): Promise<void> {
    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('userId invalide');
    }
    if (!filePath) {
      throw new BadRequestException('Chemin du fichier manquant');
    }

    const { data: candidate } = await this.supabase
      .from('candidates')
      .select('id, categorie_profil')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!candidate) {
      throw new BadRequestException('Aucun profil candidat associé');
    }

    const category = (candidate.categorie_profil as string | null) || 'Autres';
    const candidateId = candidate.id as number;
    const expectedPrefix = `candidates/${category}/${candidateId}/`;

    if (!filePath.startsWith(expectedPrefix)) {
      throw new BadRequestException('Acces non autorise a ce fichier');
    }

    const fileName = filePath.slice(expectedPrefix.length).toLowerCase();
    // Validation "large" : certains noms peuvent contenir des suffixes (one-page/long, fr/en…).
    const isPortfolioPdf = fileName.includes('portfolio') && fileName.endsWith('.pdf');
    if (!isPortfolioPdf) {
      throw new BadRequestException('Type de fichier invalide pour Portfolio PDF');
    }

    const { error } = await this.supabase.storage
      .from('tap_files')
      .remove([filePath]);

    if (error) {
      throw new BadRequestException(error.message || 'Erreur lors de la suppression');
    }
  }
}
