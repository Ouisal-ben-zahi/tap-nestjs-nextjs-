/** Téléphone Maroc : +212 + 9 chiffres ou 0 + 9 chiffres (05–08). */
export function normalizePhoneInput(value: string): string {
  return value.replace(/\s/g, '').trim();
}

export function isValidMoroccoMobilePhone(raw: string): boolean {
  const n = normalizePhoneInput(raw);
  if (!n) return false;
  if (n.startsWith('+212')) {
    const rest = n.slice(4);
    return /^[5-8]\d{8}$/.test(rest);
  }
  if (n.startsWith('0')) {
    return /^0[5-8]\d{8}$/.test(n);
  }
  return false;
}

/** ICE (Identifiant Commun de l’Entreprise) : 15 chiffres. */
export function normalizeIceInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 15);
}

export function isValidMoroccoIce(raw: string): boolean {
  const n = raw.replace(/\D/g, '');
  return /^\d{15}$/.test(n);
}
