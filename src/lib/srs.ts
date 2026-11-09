import type { CardState, Device, Grade, Level, Progress, Recipe, Settings } from './types';
import { dayKey } from './text';

export const DAY = 24 * 60 * 60 * 1000;
/** Days until next review, per box (box 1 = same session / next session). */
export const INTERVAL_DAYS = [0, 0, 1, 3, 7, 16];
export const MASTERED_BOX = 5;
export const UNLOCK_BOX = 3;

export const cardKey = (id: string, level: Level) => `${id}:${level}`;

export function emptyCard(): CardState {
  return { box: 0, due: 0, attempts: 0, errors: 0, lastGrade: null };
}

export function getCard(p: Progress, id: string, level: Level): CardState {
  return p.cards[cardKey(id, level)] ?? emptyCard();
}

/** Number of items the person has to produce for this card. */
export function itemCount(recipe: Recipe, level: Level): number {
  if (level === 1) return new Set(recipe.ingredients.map((i) => i.name)).size + (recipe.glass ? 1 : 0);
  return recipe.ingredients.filter((i) => i.type === 'dose').length;
}

/** T_target = a + b·n (seconds). */
export function targetSeconds(settings: Settings, device: Device, level: Level, recipe: Recipe): number {
  const { a, b } = settings.time[device][level];
  return a + b * itemCount(recipe, level);
}

export function gradeFromResult(ok: boolean, ms: number, targetS: number): Grade {
  if (!ok) return 'wrong';
  return ms <= targetS * 1000 ? 'fast' : 'slow';
}

export function applyGrade(card: CardState, grade: Grade, now: number): CardState {
  let box = card.box;
  if (grade === 'wrong') box = 1;
  else if (grade === 'slow') box = Math.max(box, 1);
  else box = Math.min(box + 1, MASTERED_BOX);
  return {
    box,
    due: now + INTERVAL_DAYS[box] * DAY,
    attempts: card.attempts + 1,
    errors: card.errors + (grade === 'wrong' ? 1 : 0),
    lastGrade: grade,
  };
}

export function isUnlocked(p: Progress, settings: Settings, id: string, level: Level): boolean {
  if (level === 1 || settings.unlockAll) return true;
  return getCard(p, id, (level - 1) as Level).box >= UNLOCK_BOX;
}

export interface SessionItem {
  id: string;
  level: Level;
  isNew: boolean;
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
 * Today's session:
 * 1. due cards (already seen, unlocked, due <= now), most overdue first;
 * 2. cards unlocked but never answered at level 2/3 (they count as due);
 * 3. brand-new cocktails (level 1, box 0) up to the daily quota, favourites first, then A→Z.
 * Capped to sessionSize, then shuffled.
 */
export function buildSession(
  recipes: Recipe[],
  p: Progress,
  settings: Settings,
  now: number,
  rand: () => number = Math.random,
): SessionItem[] {
  const due: { item: SessionItem; overdue: number }[] = [];
  const fresh: Recipe[] = [];

  for (const r of recipes) {
    const hasDoses = r.ingredients.some((i) => i.type === 'dose');
    for (const level of [1, 2, 3] as Level[]) {
      if (level > 1 && !hasDoses) continue;
      if (!isUnlocked(p, settings, r.id, level)) continue;
      const c = getCard(p, r.id, level);
      if (c.attempts === 0) {
        if (level === 1) fresh.push(r);
        else due.push({ item: { id: r.id, level, isNew: true }, overdue: 0 });
      } else if (c.due <= now) {
        due.push({ item: { id: r.id, level, isNew: false }, overdue: now - c.due });
      }
    }
  }

  due.sort((x, y) => y.overdue - x.overdue);
  const items = due.map((d) => d.item).slice(0, settings.sessionSize);

  const already = p.newIntroduced[dayKey(now)] ?? 0;
  const quota = Math.max(0, settings.newPerDay - already);
  fresh.sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name, 'de'));
  for (const r of fresh.slice(0, quota)) {
    if (items.length >= settings.sessionSize) break;
    items.push({ id: r.id, level: 1, isNew: true });
  }
  return shuffle(items, rand);
}

/** Stable fingerprint of what levels 2/3 test. */
export function recipeHash(r: Recipe): string {
  return JSON.stringify(r.ingredients.map((i) => [i.name, i.type, i.amount, i.amountMax, i.unit, i.tag]));
}

/**
 * Keep progress for unchanged ids; if a recipe's ingredients changed,
 * send its level 2/3 cards back to box 1. Returns a new Progress.
 */
export function reconcile(p: Progress, recipes: Recipe[], now: number): Progress {
  const cards = { ...p.cards };
  const recipeHashes = { ...p.recipeHashes };
  for (const r of recipes) {
    const h = recipeHash(r);
    const old = recipeHashes[r.id];
    if (old && old !== h) {
      for (const level of [2, 3] as Level[]) {
        const k = cardKey(r.id, level);
        if (cards[k] && cards[k].box > 1) cards[k] = { ...cards[k], box: 1, due: now };
      }
    }
    recipeHashes[r.id] = h;
  }
  return { ...p, cards, recipeHashes };
}
