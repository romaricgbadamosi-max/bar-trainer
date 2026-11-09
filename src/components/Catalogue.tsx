import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { byId, recipes } from '../lib/data';
import { getCard } from '../lib/srs';
import { norm } from '../lib/text';
import type { Level } from '../lib/types';
import { MethodBox, RecipeLines } from './RecipeView';

export default function Catalogue({ initialId, onBack }: { initialId?: string; onBack: () => void }) {
  const { progress, notes, setNote } = useStore();
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | undefined>(initialId);

  const list = useMemo(() => {
    const n = norm(q);
    return n ? recipes.filter((r) => norm(r.name).includes(n) || r.ingredients.some((i) => norm(i.name).includes(n))) : recipes;
  }, [q]);

  const r = openId ? byId.get(openId) : undefined;
  if (r) {
    return (
      <div className="stack">
        <div className="topbar">
          <button className="ghost" onClick={() => setOpenId(undefined)}>← Catalogue</button>
        </div>
        <div className="cocktail">{r.name}</div>
        <div className="sub">
          {r.glass ?? 'Verre non indiqué'}
          {r.favorite && ' · favori'}
          {r.alcoholFree && ' · sans alcool'}
          {r.frozen && ' · frozen'}
        </div>
        <div className="card">
          <RecipeLines recipe={r} />
          <MethodBox recipe={r} />
        </div>
        <div className="boxes">
          {([1, 2, 3] as Level[]).map((l) => `Niveau ${l} : boîte ${getCard(progress, r.id, l).box}/5`).join(' · ')}
        </div>
        <div>
          <label>Mes notes</label>
          <textarea
            defaultValue={notes[r.id] ?? ''}
            onBlur={(e) => setNote(r.id, e.target.value.trim())}
            placeholder="Astuce perso pour retenir ce cocktail"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="topbar">
        <button className="ghost" onClick={onBack}>← Accueil</button>
      </div>
      <h1>Catalogue</h1>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un cocktail ou un ingrédient" />
      <div className="card list" style={{ padding: 0, overflow: 'hidden' }}>
        {list.map((x) => (
          <button key={x.id} onClick={() => setOpenId(x.id)}>
            <span>
              {x.name}
              {x.favorite && <span className="pill">favori</span>}
            </span>
            <span className="boxes">
              {getCard(progress, x.id, 1).box}·{getCard(progress, x.id, 2).box}·{getCard(progress, x.id, 3).box}
            </span>
          </button>
        ))}
      </div>
      <p className="small muted">Les trois chiffres à droite : boîte (0 à 5) aux niveaux 1, 2 et 3.</p>
    </div>
  );
}
