/** Libellé lisible pour la modalité d’entretien renvoyée par l’API (entretiens planifiés). */
export function formatInterviewType(type: string | null | undefined) {
  const normalized = String(type ?? "").toUpperCase();
  if (normalized === "EN_LIGNE") return "En ligne";
  if (normalized === "PRESENTIEL") return "Présentiel";
  if (normalized === "TELEPHONIQUE") return "Téléphonique";
  return type || "—";
}
