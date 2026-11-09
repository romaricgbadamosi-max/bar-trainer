import { useMemo } from 'react';
import type { Route } from '../App';
import { useStore } from '../store';
import { byId, recipes } from '../lib/data';
import { DAY, getCard, MASTERED_BOX } from '../lib/srs';
import { dayKey } from '../lib/text';
import type { Device, Level } from '../lib/types';

export default function Stats({ onBack, go }: { onBack: () => void; go: (r: Route) => void }) {
  const { progress, history, device } = useStore();

  const data = useMemo(() => {
    const now = Date.now();
    const mastered = ([1, 2, 3] as Level[]).map((l) => recipes.filter((r) => getCard(progress, r.id, l).box >= MASTERED_BOX).length);

    const avg = (dev: Device, level: Level, from: number, to: number) => {
      const xs = history.filter((h) => h.device === dev && h.level === level && h.ms != null && h.ok && h.t >= from && h.t < to);
      return xs.length ? xs.reduce((s, h) => s + h.ms!, 0) / xs.length / 1000 : null;
    };
    const times = ([1, 2, 3] as Level[]).map((l) => ({
      level: l,
      recent: avg(device, l, now - 7 * DAY, now + 1),
      before: avg(device, l, now - 30 * DAY, now - 7 * DAY),
    }));

    const days = new Set(history.map((h) => dayKey(h.t)));
    let streak = 0;
    for (let t = now; days.has(dayKey(t)); t -= DAY) streak++;
    if (streak === 0 && days.has(dayKey(now - DAY))) for (let t = now - DAY; days.has(dayKey(t)); t -= DAY) streak++;

    const fails = new Map<string, number>();
    for (const h of history) if (!h.ok) fails.set(h.id, (fails.get(h.id) ?? 0) + 1);
    const worst = [...fails.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

    const todayCount = history.filter((h) => dayKey(h.t) === dayKey(now)).length;
    return { mastered, times, streak, worst, todayCount };
  }, [progress, history, device]);

  const fmt = (s: number | null) => (s == null ? '—' : `${s.toFixed(1).replace('.', ',')} s`);

  return (
    <div className="stack">
      <div className="topbar">
        <button className="ghost" onClick={onBack}>← Accueil</button>
      </div>
      <h1>Stats</h1>
      <div className="grid2">
        <div className="stat"><div className="n">{data.streak}</div><div className="l">jour{data.streak > 1 ? 's' : ''} d’affilée</div></div>
        <div className="stat"><div className="n">{data.todayCount}</div><div className="l">réponses aujourd’hui</div></div>
      </div>
      <h2>Maîtrisés (boîte 5)</h2>
      <div className="grid2" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
        {data.mastered.map((n, i) => (
          <div className="stat" key={i}><div className="n">{n}</div><div className="l">niveau {i + 1}</div></div>
        ))}
      </div>
      <h2>Temps moyen (réponses justes, {device === 'touch' ? 'tactile' : 'clavier'})</h2>
      <div className="lines">
        {data.times.map((t) => (
          <div className="line" key={t.level}>
            <span className="name">Niveau {t.level}</span>
            <span className="small muted">7 derniers jours : <strong>{fmt(t.recent)}</strong> · avant : {fmt(t.before)}</span>
          </div>
        ))}
      </div>
      <h2>Les plus ratés</h2>
      {data.worst.length === 0 ? (
        <p className="muted">Pas encore d’erreur enregistrée.</p>
      ) : (
        <div className="card list" style={{ padding: 0, overflow: 'hidden' }}>
          {data.worst.map(([id, n]) => (
            <button key={id} onClick={() => go({ name: 'catalogue', id })}>
              <span>{byId.get(id)?.name ?? id}</span>
              <span className="badge bad">{n}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
