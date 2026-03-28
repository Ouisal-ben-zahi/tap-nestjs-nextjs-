/** PDF CV corrigé généré par l’IA (ex. CV_TAP_fr.pdf) — aligné sur le polling onboarding. */
export function cvFileListHasCorrectedTapPdf(
  cvFiles: unknown[] | null | undefined,
): boolean {
  if (!Array.isArray(cvFiles)) return false;
  return cvFiles.some((f) => {
    if (!f || typeof f !== "object" || !("name" in f)) return false;
    const name = String((f as { name: unknown }).name || "");
    const n = name.trim().toLowerCase();
    return n.startsWith("cv_tap") && n.endsWith(".pdf");
  });
}

/**
 * Même critères que la fin du wizard onboarding : artefacts présents côté API.
 * (Pas de fenêtre temporelle « fresh » : tout fichier existant compte.)
 */
export function isCandidatGenerationComplete(parts: {
  cvFiles: unknown[] | null | undefined;
  talentcardFiles: unknown[] | null | undefined;
  score:
    | {
        scoreGlobal: number | null;
        dimensions?: unknown[] | null;
        metadataTimestamp?: string | null;
      }
    | null
    | undefined;
  portfolioShort: unknown[] | null | undefined;
  portfolioLong: unknown[] | null | undefined;
}): boolean {
  const hasCorrectedCv = cvFileListHasCorrectedTapPdf(parts.cvFiles);
  const hasTc =
    Array.isArray(parts.talentcardFiles) && parts.talentcardFiles.length > 0;
  const s = parts.score;
  const hasScore =
    s != null &&
    (typeof s.scoreGlobal === "number" ||
      (Array.isArray(s.dimensions) && s.dimensions.length > 0) ||
      (typeof s.metadataTimestamp === "string" &&
        s.metadataTimestamp.trim().length > 0));
  const hasPortfolio =
    (Array.isArray(parts.portfolioShort) && parts.portfolioShort.length > 0) ||
    (Array.isArray(parts.portfolioLong) && parts.portfolioLong.length > 0);
  return Boolean(hasCorrectedCv && hasTc && hasScore && hasPortfolio);
}
