/** Lowercase, strip accents and collapse whitespace — for tolerant comparison. */
export function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatAmount(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n).replace('.', ',');
}

export function formatDose(amount: number, amountMax: number | null, unit: string | null): string {
  const base = amountMax != null ? `${formatAmount(amount)}–${formatAmount(amountMax)}` : formatAmount(amount);
  return unit && unit !== 'cl' ? `${base} ${unit}` : base;
}

/** Parse "3,5" / "3.5" / " 4 " into a number, or null. */
export function parseAmount(s: string): number | null {
  const t = s.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  return parseFloat(t);
}

export function dayKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
