import { useMemo } from 'react';
import type { Route } from '../App';
import { useStore } from '../store';
import { recipes } from '../lib/data';
import { buildSession, getCard, MASTERED_BOX } from '../lib/srs';
import { DAY } from '../lib/srs';

export default function Home({ go }: { go: (r: Route) => void }) {
  const { progress, settings } = useStore();
  const session = useMemo(() => buildSession(recipes, progress, settings, Date.now()), [progress, settings]);
  const fresh = session.filter((i) => i.isNew && i.level === 1).length;
  const mastered = recipes.filter((r) => getCard(progress, r.id, 3).box >= MASTERED_BOX).length;
  const seen = recipes.filter((r) => getCard(progress, r.id, 1).attempts > 0).length;
  const backupOld = seen > 0 && (!settings.lastBackup || Date.now() - settings.lastBackup > 14 * DAY);

  return (
    <div className="stack">
      <h1>Bar Trainer</h1>
      <div className="card stack">
        <div>
          <div className="sub">Session du jour</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>
            {session.length} carte{session.length > 1 ? 's' : ''}
          </div>
          <div className="sub">
            {session.length - fresh} à réviser · {fresh} nouveau{fresh > 1 ? 'x' : ''}
          </div>
        </div>
        <button
          className="primary"
          style={{ width: '100%' }}
          disabled={session.length === 0}
          onClick={() => go({ name: 'session', items: session, counts: true, title: 'Session du jour', nonce: Date.now() })}
        >
          {session.length ? 'Commencer' : 'Rien à réviser pour l’instant'}
        </button>
      </div>
      <div className="grid2">
        <div className="stat">
          <div className="n">{seen} / {recipes.length}</div>
          <div className="l">cocktails déjà vus</div>
        </div>
        <div className="stat">
          <div className="n">{mastered}</div>
          <div className="l">maîtrisés au niveau 3</div>
        </div>
      </div>
      <div className="grid2">
        <button onClick={() => go({ name: 'free' })}>Entraînement libre</button>
        <button onClick={() => go({ name: 'catalogue' })}>Catalogue</button>
        <button onClick={() => go({ name: 'stats' })}>Stats</button>
        <button onClick={() => go({ name: 'settings' })}>Réglages</button>
      </div>
      {backupOld && (
        <p className="small muted">
          Pense à exporter ta progression (Réglages → Exporter), elle n’est gardée que sur cet appareil.
        </p>
      )}
    </div>
  );
}
