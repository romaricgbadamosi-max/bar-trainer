import { useEffect, useMemo, useRef, useState } from 'react';
import { TAGS, type Recipe } from '../lib/types';
import type { RowAnswer } from '../lib/grading';
import { makeOptions } from '../lib/distractors';
import { amountIndex } from '../lib/data';
import { formatDose, parseAmount } from '../lib/text';

const TAG_CYCLE: (string | null)[] = [null, ...TAGS];

export default function LevelDose({
  recipe,
  mode,
  onSubmit,
}: {
  recipe: Recipe;
  mode: 'qcm' | 'free';
  onSubmit: (answers: RowAnswer[]) => void;
}) {
  const ings = recipe.ingredients;
  const doseRows = useMemo(() => ings.map((g, i) => (g.type === 'dose' ? i : -1)).filter((i) => i >= 0), [ings]);
  const options = useMemo(() => ings.map((g) => makeOptions(g, amountIndex)), [ings]);
  const [answers, setAnswers] = useState<RowAnswer[]>(() => ings.map(() => ({ amount: null, tag: null })));
  const [texts, setTexts] = useState<string[]>(() => ings.map(() => ''));
  const [active, setActive] = useState(doseRows[0] ?? 0);
  const [error, setError] = useState('');
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const setRow = (i: number, patch: Partial<RowAnswer>) =>
    setAnswers((a) => a.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const cycleTag = (i: number) => {
    const cur = TAG_CYCLE.indexOf(answers[i].tag);
    setRow(i, { tag: TAG_CYCLE[(cur + 1) % TAG_CYCLE.length] });
  };

  const nextDose = (from: number, filled: RowAnswer[]) =>
    doseRows.find((i) => i > from && filled[i].amount == null) ?? doseRows.find((i) => filled[i].amount == null);

  const trySubmit = (current = answers, curTexts = texts) => {
    if (mode === 'free') {
      const parsed = current.map((r, i) => (ings[i].type === 'dose' ? { ...r, amount: parseAmount(curTexts[i]) } : r));
      const bad = doseRows.find((i) => parsed[i].amount == null);
      if (bad != null) {
        setActive(bad);
        inputs.current[bad]?.focus();
        return setError('Entre un nombre pour chaque dose.');
      }
      return onSubmit(parsed);
    }
    const missing = doseRows.find((i) => current[i].amount == null);
    if (missing != null) {
      setActive(missing);
      return setError('Choisis une dose pour chaque ingrédient.');
    }
    onSubmit(current);
  };

  const pick = (i: number, value: number) => {
    const next = answers.map((r, j) => (j === i ? { ...r, amount: value } : r));
    setAnswers(next);
    setError('');
    const n = nextDose(i, next);
    if (n != null) setActive(n);
  };

  useEffect(() => {
    if (mode === 'free') inputs.current[active]?.focus();
  }, [active, mode]);

  useEffect(() => {
    if (mode !== 'qcm') return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'SELECT') return;
      if (/^[1-9]$/.test(e.key)) {
        const opt = options[active]?.[Number(e.key) - 1];
        if (opt) pick(active, opt.value);
      } else if (e.key === 't' || e.key === 'T') cycleTag(active);
      else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, ings.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        trySubmit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const onInputKey = (i: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      cycleTag(i);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (parseAmount(texts[i]) == null) return setError('Entre un nombre (ex. 3,5).');
      setError('');
      const later = doseRows.find((j) => j > i && parseAmount(texts[j]) == null);
      if (later != null) setActive(later);
      else trySubmit();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const pos = doseRows.indexOf(i) + (e.key === 'ArrowDown' ? 1 : -1);
      if (doseRows[pos] != null) setActive(doseRows[pos]);
    }
  };

  return (
    <div>
      <div className="lines">
        {ings.map((ing, i) => {
          const a = answers[i];
          const isActive = i === active;
          return (
            <div key={i}>
              <div className={`line${isActive ? ' active' : ''}`} onClick={() => setActive(i)}>
                <span className="name">{ing.name}</span>
                <select
                  className={`tagbtn${a.tag ? ' on' : ''}`}
                  style={{ width: 'auto', minHeight: 32, padding: '2px 6px' }}
                  value={a.tag ?? ''}
                  onChange={(e) => setRow(i, { tag: e.target.value || null })}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Étiquette pour ${ing.name}`}
                >
                  <option value="">étiquette</option>
                  {TAGS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {ing.type === 'fill' && <span className="val muted">auffüllen</span>}
                {ing.type === 'presence' && <span className="val muted">—</span>}
                {ing.type === 'dose' && mode === 'qcm' && (
                  <span className="val" style={{ color: a.amount == null ? 'var(--accent)' : undefined }}>
                    {a.amount == null ? '?' : options[i].find((o) => o.value === a.amount) ? labelOf(options[i].find((o) => o.value === a.amount)!, ing.unit) : a.amount}
                  </span>
                )}
                {ing.type === 'dose' && mode === 'free' && (
                  <span className="row" style={{ gap: 4 }}>
                    <input
                      ref={(el) => { inputs.current[i] = el; }}
                      inputMode="decimal"
                      enterKeyHint="next"
                      value={texts[i]}
                      onFocus={() => setActive(i)}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^\d.,]/g, '');
                        setTexts((t) => t.map((x, j) => (j === i ? v : x)));
                        setError('');
                      }}
                      onKeyDown={onInputKey(i)}
                      aria-label={`Dose de ${ing.name}`}
                    />
                    <span className="small muted" style={{ width: 44 }}>{ing.unit ?? 'cl'}</span>
                  </span>
                )}
              </div>
              {ing.type === 'dose' && mode === 'qcm' && isActive && (
                <div className="grid5" style={{ margin: '8px 0' }}>
                  {options[i].map((o, k) => (
                    <button
                      key={k}
                      className={a.amount === o.value ? 'sel' : ''}
                      style={{ padding: '4px 0' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        pick(i, o.value);
                      }}
                    >
                      <span className="hint kbd" style={{ display: 'block', margin: 0, fontSize: 11 }}>{k + 1}</span>
                      {labelOf(o, ing.unit)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {error && <div className="error">{error}</div>}
      <button className="primary" style={{ width: '100%', marginTop: 14 }} onClick={() => trySubmit()}>
        Valider
      </button>
      <div className="hint kbd">
        {mode === 'qcm'
          ? '1–5 : dose · ↑↓ : changer de ligne · T : étiquette · Entrée : valider'
          : 'Entrée : ligne suivante (puis valider) · ↑↓ : changer de ligne · T : étiquette'}
      </div>
    </div>
  );
}

function labelOf(o: { value: number; max: number | null }, unit: string | null) {
  return formatDose(o.value, o.max, unit);
}
