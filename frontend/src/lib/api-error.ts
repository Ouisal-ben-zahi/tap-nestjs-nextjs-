import axios from "axios";

/** Détail lisible depuis le corps d’une réponse Nest (400/401/…). */
export function nestResponseDetail(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;

  const raw = d.message;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (Array.isArray(raw) && raw.length > 0) {
    const parts = raw
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "message" in (item as object)) {
          const m = (item as { message?: unknown }).message;
          return typeof m === "string" ? m : "";
        }
        return "";
      })
      .filter(Boolean);
    if (parts.length) return parts.join(" · ");
  }

  if (typeof d.error === "string" && d.error.trim()) return d.error.trim();
  return null;
}

/** Extrait le message d’erreur d’une réponse API (Nest / validation / axios). */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const fromBody = nestResponseDetail(error.response?.data);
    if (fromBody) return fromBody;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
