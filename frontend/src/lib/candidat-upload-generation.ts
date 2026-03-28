/** PDF portfolio court (one-page) — noms produits par le pipeline TAP. */
export function isOnePagePortfolioPdfName(name: string | undefined | null): boolean {
  if (!name) return false;
  const n = name.trim().toLowerCase();
  return (
    n.endsWith('_one-page_fr.pdf') ||
    n.endsWith('_one-page_en.pdf') ||
    n.endsWith('_one_page_fr.pdf') ||
    n.endsWith('_one_page_en.pdf')
  );
}

/** Tolérance large : décalage horloge poste / VM hébergée vs métadonnées Storage (souvent en UTC). */
const DEFAULT_GENERATION_SKEW_MS = 120_000;

export function isFreshGenerationTimestamp(
  iso: string | null | undefined,
  startedAtMs: number,
  skewMs = DEFAULT_GENERATION_SKEW_MS,
): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t >= startedAtMs - skewMs;
}

export function listHasFreshTimestamp(
  files: Array<{ updatedAt?: string | null; createdAt?: string | null }>,
  startedAtMs: number,
  skewMs = DEFAULT_GENERATION_SKEW_MS,
): boolean {
  return files.some(
    (f) =>
      isFreshGenerationTimestamp(f.updatedAt, startedAtMs, skewMs) ||
      isFreshGenerationTimestamp(f.createdAt, startedAtMs, skewMs),
  );
}

export function isCorrectedCvTapPdfName(fileName: string | undefined | null): boolean {
  const n = String(fileName || '')
    .trim()
    .toLowerCase();
  return n.startsWith('cv_tap') && n.endsWith('.pdf');
}

export function hasFreshCorrectedCvTapPdf(
  files: Array<{ name?: string; updatedAt?: string | null; createdAt?: string | null }>,
  startedAtMs: number,
  skewMs = DEFAULT_GENERATION_SKEW_MS,
): boolean {
  return files.some(
    (f) =>
      isCorrectedCvTapPdfName(f.name) &&
      (isFreshGenerationTimestamp(f.updatedAt, startedAtMs, skewMs) ||
        isFreshGenerationTimestamp(f.createdAt, startedAtMs, skewMs)),
  );
}

/**
 * Talent Card : timestamp récent OU cohérence pipeline (CV TAP déjà « frais » + au moins un export
 * listé, délai écoulé). Compense les list() Storage sans updated_at fiable après overwrite.
 */
export function talentcardReadyForSession(
  talentcardFiles: Array<{ updatedAt?: string | null; createdAt?: string | null }>,
  cvFiles: Array<{ name?: string; updatedAt?: string | null; createdAt?: string | null }>,
  startedAtMs: number,
  elapsedMs: number,
  skewMs = DEFAULT_GENERATION_SKEW_MS,
): boolean {
  if (listHasFreshTimestamp(talentcardFiles, startedAtMs, skewMs)) return true;
  if (
    elapsedMs >= 20_000 &&
    talentcardFiles.length > 0 &&
    hasFreshCorrectedCvTapPdf(cvFiles, startedAtMs, skewMs)
  ) {
    return true;
  }
  return false;
}

/**
 * Portfolio « vu comme prêt » : fichier récent OU (filet sans timestamps).
 * Le filet exige CV TAP + talent card **frais** pour la session : sinon un ancien PDF one-page
 * + un vieux score suffisaient à afficher « terminé » trop tôt.
 */
export function portfolioOnePageSatisfiedForSession(args: {
  portfolioShort: Array<{ name?: string; updatedAt?: string | null; createdAt?: string | null }>;
  portfolioLong: Array<{ name?: string; updatedAt?: string | null; createdAt?: string | null }>;
  startedAtMs: number;
  elapsedMs: number;
  prerequisiteStepsDone: boolean;
  cvTapAndTalentFreshForSession: boolean;
  /** Délai minimum avant filet « nom de fichier seul » (second ligne de défense). */
  minElapsedMs?: number;
}): boolean {
  const {
    portfolioShort,
    portfolioLong,
    startedAtMs,
    elapsedMs,
    prerequisiteStepsDone,
    cvTapAndTalentFreshForSession,
    minElapsedMs = 45_000,
  } = args;
  if (listHasFreshTimestamp(portfolioShort, startedAtMs) || listHasFreshTimestamp(portfolioLong, startedAtMs)) {
    return true;
  }
  if (
    !prerequisiteStepsDone ||
    !cvTapAndTalentFreshForSession ||
    elapsedMs < minElapsedMs
  ) {
    return false;
  }
  return portfolioShort.some((f) => isOnePagePortfolioPdfName(f.name));
}
