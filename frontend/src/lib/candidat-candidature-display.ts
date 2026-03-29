import type { Application } from "@/types/candidat";

export function candidatureStatusLabel(status: string | null | undefined): string {
  const s = String(status ?? "").toLowerCase();
  if (s.includes("accept") || s === "active") return "Acceptée";
  if (s.includes("refus") || s.includes("reject")) return "Refusée";
  if (s.includes("pending") || s.includes("attente") || s.includes("cours")) return "En cours";
  const t = String(status ?? "").trim();
  return t || "En cours";
}

/** Localisation courte pour les cartes candidat : type de lieu uniquement (pas d’entreprise ni catégorie). */
export function applicationLocationLine(app: Pick<Application, "jobLocationType">): string {
  const t = typeof app.jobLocationType === "string" ? app.jobLocationType.trim() : "";
  return t || "Localisation non précisée";
}
