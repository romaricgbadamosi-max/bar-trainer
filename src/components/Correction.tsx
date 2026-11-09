import { useEffect } from 'react';
import type { Grade, Level, Recipe } from '../lib/types';
import type { Outcome } from './Session';
import { useStore } from '../store';
import { formatDose, norm } from '../lib/text';
import { doseLabel, MethodBox } from './RecipeView';

const GRADE: Record<Grade, { label: string; cls: string }> = {
  wrong: { label: 'Raté', cls: 'bad' },
  slow: { label: 'Juste, mais lent', cls: 'slow' },
  fast: { label: 'Juste et rapide', cls: 'ok' },
};

const sec = (ms: number) => (ms / 1000).toFixed(1).replace('.', ',');

export default function Correction({
  recipe,
  level,
  done,
  counts,
  onNext,
  onUndo,
}: {
  recipe: Recipe;
  level: Level;
  done: { outcome: Outcome; grade: Grade; ms: number; target: number | null; requeued: boolean };
  counts: boolean;
  onNext: () => void;
  onUndo: () => void;
}) {
  const { notes } = useStore();
  const g = GRADE[done.grade];
  const o = done.outcome;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onNext();
      } else if (e.key === 'u' || e.key === 'U') onUndo();
    };
    // let the key that submitted the answer finish before listening
    const t = setTimeout(() => window.addEventListener('keydown', onKey), 150);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [onNext, onUndo]);

  let score = '';
  if (o.kind === 'dose') score = `${o.result.score} / ${o.result.total}`;
  if (o.kind === 'l1') score = `${o.result.correct.length} / ${o.result.correct.length + o.result.missing.length}`;

  return (
    <div className="card stack">
      <div className="row between wrap">
        <span className={`badge ${g.cls}`}>
          {g.label}
          {score && ` · ${score}`}
        </span>
        {done.target != null && (
          <span className="sub">
            {sec(done.ms)} s / cible {sec(done.target * 1000)} s
          </span>
        )}
      </div>

      {o.kind === 'l1' && (
        <div>
          <div className="lines">
            {recipe.ingredients.map((ing, i) => {
              const found = o.result.correct.some((c) => norm(c) === norm(ing.name));
              return (
                <div className="line" key={i}>
                  <span className="name">
                    <span className={found ? 'icon-ok' : 'icon-bad'}>{found ? '✓' : '✗'}</span> {ing.name}
                    {ing.tag && <span className="pill">{ing.tag}</span>}
                  </span>
                  <span className="val muted">{doseLabel(ing)}</span>
                </div>
              );
            })}
            {o.result.extra.map((x) => (
              <div className="line" key={'x' + x}>
                <span className="name">
                  <span className="icon-bad">✗</span> <s>{x}</s> <span className="small muted">en trop</span>
                </span>
              </div>
            ))}
          </div>
          {recipe.glass && (
            <p style={{ marginTop: 10 }}>
              <span className={o.result.glassOk ? 'icon-ok' : 'icon-bad'}>{o.result.glassOk ? '✓' : '✗'}</span> Verre :{' '}
              {!o.result.glassOk && o.answer.glass && <s>{o.answer.glass}</s>} <strong>{recipe.glass}</strong>
            </p>
          )}
        </div>
      )}

      {o.kind === 'flash' && (
        <div>
          <p className="sub">Verre : <strong>{recipe.glass ?? '—'}</strong></p>
          <div className="lines">
            {recipe.ingredients.map((ing, i) => (
              <div className="line" key={i}>
                <span className="name">
                  {ing.name}
                  {ing.tag && <span className="pill">{ing.tag}</span>}
                </span>
                <span className="val muted">{doseLabel(ing)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {o.kind === 'dose' && (
        <div className="lines">
          {recipe.ingredients.map((ing, i) => {
            const r = o.result.rows[i];
            const a = o.answers[i];
            const checked = ing.type === 'dose' || ing.tag != null || a.tag != null;
            const good = r.amountOk && r.tagOk;
            return (
              <div className="line" key={i}>
                <span className="name">
                  {checked ? <span className={good ? 'icon-ok' : 'icon-bad'}>{good ? '✓' : '✗'}</span> : <span className="muted">·</span>}{' '}
                  {ing.name}
                  {ing.tag && <span className="pill">{ing.tag}</span>}
                  {!r.tagOk && a.tag && (
                    <span className="pill" style={{ opacity: 0.6 }}>
                      <s>{a.tag}</s>
                    </span>
                  )}
                </span>
                <span className="val">
                  {ing.type === 'dose' && !r.amountOk && a.amount != null && (
                    <>
                      <s>{formatDose(a.amount, null, ing.unit)}</s>{' '}
                    </>
                  )}
                  <span className={ing.type === 'dose' ? '' : 'muted'}>{doseLabel(ing)}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      <MethodBox recipe={recipe} note={notes[recipe.id]} />
      {done.requeued && <p className="small muted">Ce cocktail reviendra un peu plus loin dans la session.</p>}
      {!counts && <p className="small muted">Entraînement libre : ta progression n’est pas modifiée.</p>}

      <div className="grid2">
        <button onClick={onUndo}>Erreur de touche</button>
        <button className="primary" onClick={onNext} autoFocus>
          Suivant →
        </button>
      </div>
      <div className="hint kbd">Entrée : suivant · U : annuler cette réponse</div>
    </div>
  );
}
