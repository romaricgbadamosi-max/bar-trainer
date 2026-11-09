import type { Ingredient, Recipe } from './types';
import { norm } from './text';

const EPS = 1e-6;

// ---------- Level 1 ----------

export interface L1Result {
  ok: boolean;
  correct: string[]; // canonical names found
  missing: string[];
  extra: string[]; // as typed
  glassOk: boolean;
}

export function gradeLevel1(recipe: Recipe, answer: string[], glass: string | null): L1Result {
  const expected = new Map<string, string>();
  for (const ing of recipe.ingredients) expected.set(norm(ing.name), ing.name);
  const given = new Map<string, string>();
  for (const a of answer) given.set(norm(a), a);

  const correct: string[] = [];
  const missing: string[] = [];
  const extra: string[] = [];
  for (const [k, name] of expected) (given.has(k) ? correct : missing).push(name);
  for (const [k, name] of given) if (!expected.has(k)) extra.push(name);

  const glassOk = recipe.glass == null || (glass != null && norm(glass) === norm(recipe.glass));
  return { ok: missing.length === 0 && extra.length === 0 && glassOk, correct, missing, extra, glassOk };
}

// ---------- Levels 2 & 3 ----------

export function amountMatches(ing: Ingredient, value: number | null): boolean {
  if (ing.type !== 'dose' || ing.amount == null) return true;
  if (value == null) return false;
  const max = ing.amountMax ?? ing.amount;
  return value >= ing.amount - EPS && value <= max + EPS;
}

export interface RowAnswer {
  amount: number | null; // for dose rows; for QCM the chosen option's lower bound
  tag: string | null;
}

export interface RowResult {
  amountOk: boolean;
  tagOk: boolean;
}

export interface DoseResult {
  ok: boolean;
  rows: RowResult[];
  score: number; // rows fully right
  total: number; // rows that were checked (dose rows + rows where a tag is expected or given)
}

export function gradeDoses(recipe: Recipe, answers: RowAnswer[]): DoseResult {
  let score = 0;
  let total = 0;
  const rows = recipe.ingredients.map((ing, i) => {
    const a = answers[i] ?? { amount: null, tag: null };
    const amountOk = amountMatches(ing, a.amount);
    const tagOk = (ing.tag ?? null) === (a.tag ?? null);
    const checked = ing.type === 'dose' || ing.tag != null || a.tag != null;
    if (checked) {
      total++;
      if (amountOk && tagOk) score++;
    }
    return { amountOk, tagOk };
  });
  return { ok: rows.every((r) => r.amountOk && r.tagOk), rows, score, total };
}
