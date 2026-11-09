import { useCallback, useEffect, useState } from 'react';
import { useStore, type UndoToken } from '../store';
import { byId } from '../lib/data';
import type { Grade, Level } from '../lib/types';
import { gradeDoses, gradeLevel1, type DoseResult, type L1Result, type RowAnswer } from '../lib/grading';
import { gradeFromResult, targetSeconds, type SessionItem } from '../lib/srs';
import Timer from './Timer';
import Level1Input, { type L1Answer } from './Level1Input';
import Level1Flash from './Level1Flash';
import LevelDose from './LevelDose';
import Correction from './Correction';

export type Outcome =
  | { kind: 'l1'; result: L1Result; answer: L1Answer }
  | { kind: 'flash' }
  | { kind: 'dose'; result: DoseResult; answers: RowAnswer[]; mode: 'qcm' | 'free' };

interface Done {
  outcome: Outcome;
  grade: Grade;
  ms: number;
  target: number | null;
  token: UndoToken;
  requeued: boolean;
}

const LEVEL_NAME: Record<Level, string> = { 1: 'Ingrédients + verre', 2: 'Doses (QCM)', 3: 'Doses (saisie)' };

export default function Session({
  items: initial,
  counts,
  title,
  onExit,
}: {
  items: SessionItem[];
  counts: boolean;
  title: string;
  onExit: () => void;
}) {
  const { settings, device, record, undo } = useStore();
  const [queue, setQueue] = useState<SessionItem[]>(initial);
  const [idx, setIdx] = useState(0);
  const [start, setStart] = useState(Date.now());
  const [done, setDone] = useState<Done | null>(null);
  const [requeues, setRequeues] = useState<Record<string, number>>({});
  const [tally, setTally] = useState({ ok: 0, total: 0 });
  const [attempt, setAttempt] = useState(0);

  const item = queue[idx];
  const recipe = item ? byId.get(item.id) : undefined;
  const flash = item?.level === 1 && settings.level1Mode === 'flash';

  const finish = useCallback(
    (outcome: Outcome, explicitGrade?: Grade) => {
      if (!item || !recipe || done) return;
      const ms = Date.now() - start;
      const target = flash ? null : targetSeconds(settings, device, item.level, recipe);
      const ok = outcome.kind === 'flash' ? explicitGrade !== 'wrong' : outcome.result.ok;
      const grade = explicitGrade ?? gradeFromResult(ok, ms, target!);
      const token = record(item.id, item.level, grade, flash ? null : ms, counts);
      const key = `${item.id}:${item.level}`;
      let requeued = false;
      if (grade === 'wrong' && (requeues[key] ?? 0) < 2) {
        const pos = Math.min(idx + 4, queue.length);
        setQueue((q) => [...q.slice(0, pos), { ...item, isNew: false }, ...q.slice(pos)]);
        setRequeues((r) => ({ ...r, [key]: (r[key] ?? 0) + 1 }));
        requeued = true;
      }
      setTally((t) => ({ ok: t.ok + (grade !== 'wrong' ? 1 : 0), total: t.total + 1 }));
      if (outcome.kind === 'flash') {
        // the answer was already shown on the card: go straight to the next one
        setIdx((i) => i + 1);
        setStart(Date.now());
        setAttempt((a) => a + 1);
        return;
      }
      setDone({ outcome, grade, ms, target, token, requeued });
    },
    [item, recipe, done, start, flash, settings, device, record, counts, requeues, idx, queue.length],
  );

  const next = () => {
    setDone(null);
    setIdx((i) => i + 1);
    setStart(Date.now());
    setAttempt((a) => a + 1);
  };

  const undoLast = () => {
    if (!done || !item) return;
    undo(done.token);
    if (done.requeued) {
      const key = `${item.id}:${item.level}`;
      setQueue((q) => {
        const pos = q.findIndex((x, j) => j > idx && x.id === item.id && x.level === item.level);
        return pos >= 0 ? [...q.slice(0, pos), ...q.slice(pos + 1)] : q;
      });
      setRequeues((r) => ({ ...r, [key]: Math.max(0, (r[key] ?? 1) - 1) }));
    }
    setTally((t) => ({ ok: t.ok - (done.grade !== 'wrong' ? 1 : 0), total: t.total - 1 }));
    setDone(null);
    setStart(Date.now());
    setAttempt((a) => a + 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExit]);

  if (!item || !recipe) {
    return (
      <div className="stack">
        <h1>Session terminée</h1>
        <div className="card">
          <p style={{ fontSize: 22, fontWeight: 700 }}>
            {tally.ok} / {tally.total} réponses justes
          </p>
          <p className="muted">{counts ? 'Ta progression est enregistrée.' : 'Entraînement libre : progression non modifiée.'}</p>
        </div>
        <button className="primary" onClick={onExit} autoFocus>
          Retour à l’accueil
        </button>
      </div>
    );
  }

  const glassInfo = item.level === 1 ? '' : `${recipe.glass ?? 'verre ?'} · ${recipe.ingredients.length} ingrédients`;

  return (
    <div>
      <div className="topbar">
        <button className="ghost" onClick={onExit} aria-label="Quitter">✕</button>
        <span className="sub">
          {title} · {idx + 1} / {queue.length}
        </span>
        <Timer start={start} stopped={done ? start + done.ms : null} />
      </div>
      <div className="sub">
        Niveau {item.level} · {LEVEL_NAME[item.level]}
        {item.level === 1 && flash ? ' · flashcard' : ''}
        {item.isNew ? ' · nouveau' : ''}
      </div>
      <div className="cocktail">{recipe.name}</div>
      {glassInfo && <div className="sub" style={{ marginBottom: 10 }}>{glassInfo}</div>}
      <div style={{ marginTop: 12 }}>
        {done ? (
          <Correction recipe={recipe} level={item.level} done={done} counts={counts} onNext={next} onUndo={undoLast} />
        ) : item.level === 1 ? (
          flash ? (
            <Level1Flash key={attempt} recipe={recipe} onSubmit={(g) => finish({ kind: 'flash' }, g)} />
          ) : (
            <Level1Input
              key={attempt}
              recipe={recipe}
              onSubmit={(a) => finish({ kind: 'l1', result: gradeLevel1(recipe, a.ingredients, a.glass), answer: a })}
            />
          )
        ) : (
          <LevelDose
            key={attempt}
            recipe={recipe}
            mode={item.level === 2 ? 'qcm' : 'free'}
            onSubmit={(answers) =>
              finish({ kind: 'dose', result: gradeDoses(recipe, answers), answers, mode: item.level === 2 ? 'qcm' : 'free' })
            }
          />
        )}
      </div>
    </div>
  );
}
