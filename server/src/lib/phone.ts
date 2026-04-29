export function normalizeNorwegianPhone(raw?: string | null): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('47') && digits.length === 10) return `+${digits}`;
  if (digits.length === 8) return `+47${digits}`;
  if (digits.length > 8) return `+${digits.replace(/^00/, '')}`;
  return `+47${digits}`;
}

export function pickPhone(mobil?: string | null, telefon?: string | null): string {
  return normalizeNorwegianPhone(mobil) || normalizeNorwegianPhone(telefon);
}
