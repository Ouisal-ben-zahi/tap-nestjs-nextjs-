import type { CvFile } from "@/types/candidat";
import type { PortfolioPdfFile } from "@/types/candidat";
import type { RecruiterTalentcardFile } from "@/services/recruteur.service";

function byUpdatedDesc<T extends { updatedAt?: string | null }>(a: T, b: T): number {
  const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
  const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
  return tb - ta;
}

function norm(n: string): string {
  return n.trim().toLowerCase();
}

/** Dernier CV PDF renvoyé par l’API recruteur. */
export function pickCvFileForDownload(files: CvFile[] | undefined | null): CvFile | null {
  const list = files ?? [];
  const pdfs = list.filter((f) => norm(f.name).endsWith(".pdf"));
  if (!pdfs.length) return null;
  return [...pdfs].sort(byUpdatedDesc)[0] ?? null;
}

const TALENT_FR_PNG = "talentcard_html_tap.png";

/** Talent Card à télécharger : PNG FR prioritaire, sinon dernier PDF / PNG talentcard. */
export function pickTalentCardFileForDownload(
  files: RecruiterTalentcardFile[] | undefined | null,
): RecruiterTalentcardFile | null {
  const list = files ?? [];
  if (!list.length) return null;

  const pngs = list.filter((f) => norm(f.name).endsWith(".png") && norm(f.name).includes("talentcard"));
  const frExact = pngs.filter((f) => norm(f.name) === TALENT_FR_PNG);
  if (frExact.length) return [...frExact].sort(byUpdatedDesc)[0] ?? null;

  const frLoose = pngs.filter((f) => {
    const n = norm(f.name);
    return (
      n.includes("html") &&
      n.includes("tap") &&
      !n.endsWith("_en.png") &&
      !n.includes("tap_en")
    );
  });
  if (frLoose.length) return [...frLoose].sort(byUpdatedDesc)[0] ?? null;

  const pdfs = list.filter((f) => norm(f.name).endsWith(".pdf") && norm(f.name).includes("talentcard"));
  if (pdfs.length) return [...pdfs].sort(byUpdatedDesc)[0] ?? null;

  if (pngs.length) return [...pngs].sort(byUpdatedDesc)[0] ?? null;
  return [...list].sort(byUpdatedDesc)[0] ?? null;
}

/** Portfolio court (one-pager) préféré, sinon premier PDF disponible. */
export function pickPortfolioFileForDownload(
  files: PortfolioPdfFile[] | undefined | null,
): PortfolioPdfFile | null {
  const list = files ?? [];
  const short = list.filter((f) => f.type === "short");
  const pool = short.length ? short : list;
  if (!pool.length) return null;
  return [...pool].sort(byUpdatedDesc)[0] ?? null;
}

export function sanitizeDownloadFilename(name: string, fallback: string): string {
  const t = name.trim();
  if (!t) return fallback;
  return t.replace(/[/\\?%*:|"<>]/g, "_").slice(0, 180) || fallback;
}
