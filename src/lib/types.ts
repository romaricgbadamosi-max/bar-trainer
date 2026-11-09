export type IngredientType = 'dose' | 'fill' | 'presence';

export interface Ingredient {
  name: string;
  type: IngredientType;
  amount: number | null;
  amountMax: number | null;
  unit: string | null;
  tag: string | null;
}

export interface Recipe {
  id: string;
  name: string;
  glass: string | null;
  favorite: boolean;
  alcoholFree: boolean;
  frozen: boolean;
  ingredients: Ingredient[];
  garnish: string | null;
  notes: string | null;
}

export type Level = 1 | 2 | 3;
export type Grade = 'wrong' | 'slow' | 'fast';
export type Device = 'keyboard' | 'touch';

export interface CardState {
  box: number; // 0..5
  due: number; // timestamp ms
  attempts: number;
  errors: number;
  lastGrade: Grade | null;
}

export interface Progress {
  cards: Record<string, CardState>; // key = `${recipeId}:${level}`
  recipeHashes: Record<string, string>;
  newIntroduced: Record<string, number>; // 'YYYY-MM-DD' -> count
}

export interface HistoryEntry {
  t: number;
  id: string;
  level: Level;
  ok: boolean;
  grade: Grade;
  ms: number | null;
  device: Device;
}

export interface TimeConstants {
  a: number;
  b: number;
}

export interface Settings {
  level1Mode: 'input' | 'flash';
  time: Record<Device, Record<Level, TimeConstants>>;
  newPerDay: number;
  sessionSize: number;
  unlockAll: boolean;
  lastBackup: number | null;
}

export const TAGS = ['oben drauf', 'floaten', 'schichten', 'unten', 'mittig', 'oben', 'muddeln'] as const;
