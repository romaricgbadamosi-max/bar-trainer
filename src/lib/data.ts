import raw from '../data/recipes.json';
import type { Recipe } from './types';
import { buildAmountIndex } from './distractors';

export const recipes: Recipe[] = (raw as { recipes: Recipe[] }).recipes;
export const byId = new Map(recipes.map((r) => [r.id, r]));

export const allIngredients: string[] = [...new Set(recipes.flatMap((r) => r.ingredients.map((i) => i.name)))].sort(
  (a, b) => a.localeCompare(b, 'de'),
);

const GLASS_ORDER = ['Boston', 'M', 'V', 'Tumbler', 'kleiner Tumbler', 'Coupette', 'Longdrink', 'Weinglas', 'Shot', 'Margarita-Glas', 'St. Pauli Glas'];
const present = new Set(recipes.map((r) => r.glass).filter((g): g is string => !!g));
export const glasses: string[] = [
  ...GLASS_ORDER.filter((g) => present.has(g)),
  ...[...present].filter((g) => !GLASS_ORDER.includes(g)).sort(),
];

export const amountIndex = buildAmountIndex(recipes);
