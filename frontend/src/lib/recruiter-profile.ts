import type { RecruiterCompanyProfile } from '@/types/recruteur';

/** Réponse API ou cache corrompu : on n’accepte qu’un objet avec id + userId valides. */
export function normalizeRecruiterCompanyProfileResponse(
  raw: unknown,
): RecruiterCompanyProfile | null {
  if (raw == null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = o.id;
  const userId = o.userId;
  const idOk = typeof id === 'number' && Number.isFinite(id);
  const userIdOk = typeof userId === 'number' && Number.isFinite(userId);
  if (!idOk || !userIdOk) return null;
  return raw as RecruiterCompanyProfile;
}

export function isRecruiterCompanyProfileComplete(
  data: RecruiterCompanyProfile | null | undefined,
): boolean {
  return normalizeRecruiterCompanyProfileResponse(data) != null;
}
