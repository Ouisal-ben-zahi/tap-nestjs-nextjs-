/** MIME image : jamais traité comme CV PDF. */
function isImageMime(mime: string): boolean {
  return (mime || "").toLowerCase().startsWith("image/");
}

/**
 * Fichier sélectionné / déposé : PDF uniquement (extension .pdf + type MIME).
 * Exclut explicitement les PNG / autres images (y compris si l’extension a été renommée).
 */
export function isPdfUploadFile(file: File): boolean {
  if (isImageMime(file.type || "")) return false;
  const name = file.name.trim().toLowerCase();
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "";
  if (ext !== "pdf") return false;
  const t = (file.type || "").toLowerCase();
  return (
    t === "application/pdf" ||
    t === "" ||
    t === "application/octet-stream"
  );
}

/**
 * Entrée API (name ou path) : uniquement si l’extension finale est exactement `pdf`.
 * Exclut .png, .jpg, etc. (ex. talent cards exportées en PNG).
 */
export function isListItemPdf(file: {
  name?: string | null;
  path?: string | null;
}): boolean {
  const fromName = file?.name != null ? String(file.name).trim() : "";
  const fromPath =
    file?.path != null
      ? String(file.path).split("/").filter(Boolean).pop()?.trim() ?? ""
      : "";
  const raw = fromName || fromPath;
  if (!raw) return false;
  const lower = raw.toLowerCase();
  const ext = lower.includes(".") ? lower.slice(lower.lastIndexOf(".") + 1) : "";
  return ext === "pdf";
}

/** @deprecated utiliser {@link isListItemPdf} (même comportement, path pris en compte) */
export const isCvListItemPdf = isListItemPdf;
