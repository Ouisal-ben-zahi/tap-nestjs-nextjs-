import type { Application } from "@/types/candidat";

export function candidatureStatusLabel(status: string | null | undefined): string {
  const s = String(status ?? "").toLowerCase();
  if (s.includes("accept") || s === "active") return "Acceptée";
  if (s.includes("refus") || s.includes("reject")) return "Refusée";
  if (s.includes("pending") || s.includes("attente") || s.includes("cours")) return "En cours";
  const t = String(status ?? "").trim();
  return t || "En cours";
}

export function applicationLocationLine(app: Pick<Application, "company" | "jobLocationType" | "jobCategory">): string {
  const parts = [app.jobLocationType, app.company, app.jobCategory]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);
  if (!parts.length) return "Localisation non précisée";
  return [...new Set(parts)].join(" · ");
}
