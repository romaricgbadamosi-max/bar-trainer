import type { Ingredient, Recipe } from './types';
import { norm } from './text';

export interface DoseOption {
  value: number; // lower bound, used for grading
  max: number | null;
  correct: boolean;
}

/** Build an index ingredient name -> every amount used for it across the card (same unit). */
export function buildAmountIndex(recipes: Recipe[]): Map<string, number[]> {
  const idx = new Map<string, number[]>();
  for (const r of recipes)
    for (const ing of r.ingredients) {
      if (ing.type !== 'dose' || ing.amount == null) continue;
      const k = `${norm(ing.name)}|${ing.unit ?? 'cl'}`;
      const arr = idx.get(k) ?? [];
      arr.push(ing.amount);
      if (ing.amountMax != null) arr.push(ing.amountMax);
      idx.set(k, arr);
    }
  return idx;
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 5 options sorted ascending: the right answer + 4 plausible distractors.
 * Distractors come first from amounts of the same ingredient elsewhere on the card,
 * then from the right answer ±0.5 / ±1 / ±2 (strictly positive), no duplicates.
 */
export function makeOptions(
  ing: Ingredient,
  index: Map<string, number[]>,
  rand: () => number = Math.random,
  count = 5,
): DoseOption[] {
  if (ing.type !== 'dose' || ing.amount == null) return [];
  const lo = ing.amount;
  const hi = ing.amountMax;
  const isRight = (v: number) => (hi == null ? Math.abs(v - lo) < 1e-6 : v >= lo - 1e-6 && v <= hi + 1e-6);

  const seen = new Set<number>();
  const pool: number[] = [];
  const add = (v: number) => {
    const r = Math.round(v * 100) / 100;
    if (r <= 0 || isRight(r) || seen.has(r)) return;
    seen.add(r);
    pool.push(r);
  };

  const k = `${norm(ing.name)}|${ing.unit ?? 'cl'}`;
  const elsewhere = shuffle([...new Set(index.get(k) ?? [])], rand);
  for (const v of elsewhere) add(v);
  const picked = pool.slice(0, count - 1);

  if (picked.length < count - 1) {
    pool.length = 0;
    for (const v of picked) pool.push(v);
    const top = hi ?? lo;
    for (const d of shuffle([0.5, 1, 2, -0.5, -1, -2], rand)) add(d > 0 ? top + d : lo + d);
    for (let d = 3; pool.length < count - 1; d++) add(top + d);
    picked.splice(0, picked.length, ...pool.slice(0, count - 1));
  }

  const options: DoseOption[] = [
    { value: lo, max: hi, correct: true },
    ...picked.map((v) => ({ value: v, max: null, correct: false })),
  ];
  return options.sort((a, b) => a.value - b.value);
}
