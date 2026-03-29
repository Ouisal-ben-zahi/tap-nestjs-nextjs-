/** Aligné sur `DashboardService.isJobInactiveForCandidatListe` (Nest). */
export function isCandidatJobInactiveForMatchingList(status: unknown): boolean {
  if (status == null) return false;
  const t = String(status).trim();
  if (t === "") return false;
  const u = t
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const exact = new Set([
    "INACTIVE",
    "INACTIF",
    "CLOSED",
    "ARCHIVED",
    "FERME",
    "FERMEE",
    "DESACTIVE",
    "DISABLED",
  ]);
  if (exact.has(u)) return true;
  if (u.includes("INACTIVE") || u.includes("INACTIF")) return true;
  return false;
}

/** Retire les offres inactives de la liste matching (toutes offres + matching IA). */
export function filterActiveJobsForCandidatMatching<T extends { status?: string | null }>(jobs: T[]): T[] {
  return jobs.filter((j) => !isCandidatJobInactiveForMatchingList(j.status));
}
