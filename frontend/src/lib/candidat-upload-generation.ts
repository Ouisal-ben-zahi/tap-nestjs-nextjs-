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

export function isFreshGenerationTimestamp(
  iso: string | null | undefined,
  startedAtMs: number,
  skewMs = 3000,
): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t >= startedAtMs - skewMs;
}

export function listHasFreshTimestamp(
  files: Array<{ updatedAt?: string | null; createdAt?: string | null }>,
  startedAtMs: number,
): boolean {
  return files.some(
    (f) =>
      isFreshGenerationTimestamp(f.updatedAt, startedAtMs) ||
      isFreshGenerationTimestamp(f.createdAt, startedAtMs),
  );
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
