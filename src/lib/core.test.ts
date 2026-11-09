import { describe, expect, it } from 'vitest';
import { recipes, byId, amountIndex } from './data';
import { gradeDoses, gradeLevel1 } from './grading';
import { makeOptions } from './distractors';
import { applyGrade, buildSession, emptyCard, gradeFromResult, itemCount, reconcile, recipeHash, targetSeconds, DAY, cardKey } from './srs';
import { DEFAULT_SETTINGS, emptyProgress } from './storage';
import { parseAmount } from './text';
import type { Recipe } from './types';

const R = (id: string) => byId.get(id)!;
const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

describe('data', () => {
  it('has unique ids and sane ingredients', () => {
    expect(recipes.length).toBeGreaterThan(150);
    expect(new Set(recipes.map((r) => r.id)).size).toBe(recipes.length);
    for (const r of recipes)
      for (const i of r.ingredients) {
        if (i.type === 'dose') expect(i.amount).toBeGreaterThan(0);
        else expect(i.amount).toBeNull();
      }
  });
  it('applies confirmed normalisations', () => {
    const names = new Set(recipes.flatMap((r) => r.ingredients.map((i) => i.name)));
    for (const bad of ['Smirnoff', 'Tanqueray', 'Läuterzucker', 'Zitrone', 'Rum 73%', 'Maracuja', 'O-Saft']) expect(names.has(bad)).toBe(false);
    expect(names.has('Old Pascas 73%')).toBe(true);
  });
});

describe('level 1', () => {
  const r = R('amaretto-sour');
  it('accepts any order, accents and case', () => {
    expect(gradeLevel1(r, ['orangensaft', 'AMARETTO', 'Zitronensaft'], 'Tumbler').ok).toBe(true);
  });
  it('reports missing, extra and glass', () => {
    const g = gradeLevel1(r, ['Amaretto', 'Limettensaft'], 'Boston');
    expect(g.ok).toBe(false);
    expect(g.missing.sort()).toEqual(['Orangensaft', 'Zitronensaft']);
    expect(g.extra).toEqual(['Limettensaft']);
    expect(g.glassOk).toBe(false);
  });
  it('does not ask the glass when unknown', () => {
    const c = R('chambord-cosmo');
    expect(gradeLevel1(c, c.ingredients.map((i) => i.name), null).ok).toBe(true);
  });
});

describe('levels 2/3', () => {
  it('grades doses and tags (Tequila Sunrise)', () => {
    const r = R('tequila-sunrise');
    const right = r.ingredients.map((i) => ({ amount: i.amount, tag: i.tag }));
    expect(gradeDoses(r, right).ok).toBe(true);
    const noTag = right.map((a) => ({ ...a, tag: null }));
    const res = gradeDoses(r, noTag);
    expect(res.ok).toBe(false);
    expect(res.total).toBe(3); // 2 dose rows + grenadine (dose+tag)… tequila, zitronensaft, grenadine
    const wrongTag = right.map((a, i) => (i === 0 ? { ...a, tag: 'floaten' } : a));
    expect(gradeDoses(r, wrongTag).ok).toBe(false);
  });
  it('accepts any value in a range (Pornstar Martini 3–4)', () => {
    const r = R('pornstar-martini');
    const base = r.ingredients.map((i) => ({ amount: i.amount, tag: i.tag }));
    const k = r.ingredients.findIndex((i) => i.amountMax != null);
    expect(gradeDoses(r, base.map((a, i) => (i === k ? { ...a, amount: 3.5 } : a))).ok).toBe(true);
    expect(gradeDoses(r, base.map((a, i) => (i === k ? { ...a, amount: 4.5 } : a))).ok).toBe(false);
  });
  it('parses decimal comma', () => {
    expect(parseAmount('3,5')).toBe(3.5);
    expect(parseAmount(' 6 ')).toBe(6);
    expect(parseAmount('abc')).toBeNull();
  });
});

describe('distractors', () => {
  it('always gives 5 sorted unique options with exactly one right answer', () => {
    for (const r of recipes)
      for (const ing of r.ingredients) {
        if (ing.type !== 'dose') continue;
        const opts = makeOptions(ing, amountIndex, seeded(r.id.length));
        expect(opts).toHaveLength(5);
        expect(opts.filter((o) => o.correct)).toHaveLength(1);
        const vals = opts.map((o) => o.value);
        expect(new Set(vals).size).toBe(5);
        expect([...vals].sort((a, b) => a - b)).toEqual(vals);
        expect(vals.every((v) => v > 0)).toBe(true);
      }
  });
});

describe('spaced repetition', () => {
  const now = 1_800_000_000_000;
  it('moves boxes as specified', () => {
    let c = emptyCard();
    c = applyGrade(c, 'fast', now);
    expect(c.box).toBe(1);
    c = applyGrade(c, 'fast', now);
    expect(c.box).toBe(2);
    expect(c.due).toBe(now + DAY);
    c = applyGrade(c, 'slow', now);
    expect(c.box).toBe(2);
    c = applyGrade(c, 'wrong', now);
    expect(c.box).toBe(1);
    expect(c.errors).toBe(1);
    expect(applyGrade({ ...c, box: 5 }, 'fast', now).box).toBe(5);
  });
  it('target time grows with the number of items', () => {
    const big = R('wiki-waki-woo');
    const small = R('godfather');
    expect(itemCount(small, 1)).toBe(3);
    expect(targetSeconds(DEFAULT_SETTINGS, 'keyboard', 1, small)).toBe(3 + 2.5 * 3);
    expect(targetSeconds(DEFAULT_SETTINGS, 'keyboard', 1, big)).toBeGreaterThan(30);
    expect(gradeFromResult(true, 5000, 10)).toBe('fast');
    expect(gradeFromResult(true, 11000, 10)).toBe('slow');
    expect(gradeFromResult(false, 1000, 10)).toBe('wrong');
  });
  it('builds a first session of favourites, capped by the daily quota', () => {
    const s = buildSession(recipes, emptyProgress(), DEFAULT_SETTINGS, now, seeded());
    expect(s).toHaveLength(DEFAULT_SETTINGS.newPerDay);
    expect(s.every((i) => i.level === 1 && byId.get(i.id)!.favorite)).toBe(true);
  });
  it('unlocks level 2 at box 3 and serves due cards first', () => {
    const p = emptyProgress();
    p.cards[cardKey('mojito', 1)] = { box: 3, due: now + 3 * DAY, attempts: 3, errors: 0, lastGrade: 'fast' };
    p.cards[cardKey('negroni', 1)] = { box: 2, due: now - DAY, attempts: 2, errors: 0, lastGrade: 'fast' };
    const s = buildSession(recipes, p, { ...DEFAULT_SETTINGS, newPerDay: 0 }, now, seeded());
    expect(s.map((i) => `${i.id}:${i.level}`).sort()).toEqual(['mojito:2', 'negroni:1']);
  });
  it('resets dose levels when a recipe changes', () => {
    const r = R('mojito');
    let p = emptyProgress();
    p = reconcile(p, recipes, now);
    p.cards[cardKey('mojito', 2)] = { box: 4, due: now, attempts: 4, errors: 0, lastGrade: 'fast' };
    const changed: Recipe = { ...r, ingredients: r.ingredients.map((i, k) => (k === 0 ? { ...i, amount: 9 } : i)) };
    expect(recipeHash(changed)).not.toBe(recipeHash(r));
    const p2 = reconcile(p, recipes.map((x) => (x.id === 'mojito' ? changed : x)), now);
    expect(p2.cards[cardKey('mojito', 2)].box).toBe(1);
  });
});
