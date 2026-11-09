import { useMemo, useState } from 'react';
import type { Route } from '../App';
import { useStore } from '../store';
import { allIngredients, glasses, recipes } from '../lib/data';
import { getCard, type SessionItem } from '../lib/srs';
import { norm } from '../lib/text';
import type { Level } from '../lib/types';

type Filter = 'all' | 'fav' | 'weak' | 'alcfree';

export default function FreeSetup({ go, onBack }: { go: (r: Route) => void; onBack: () => void }) {
  const { progress } = useStore();
  const [filter, setFilter] = useState<Filter>('fav');
  const [letter, setLetter] = useState('');
  const [glass, setGlass] = useState('');
  const [ingredient, setIngredient] = useState('');
  const [level, setLevel] = useState<Level>(1);
  const [count, setCount] = useState(20);
  const [counts, setCounts] = useState(false);

  const pool = useMemo(() => {
    let list = recipes.filter((r) => {
      if (filter === 'fav' && !r.favorite) return false;
      if (filter === 'alcfree' && !r.alcoholFree) return false;
      if (letter && norm(r.name)[0] !== norm(letter)) return false;
      if (glass && r.glass !== glass) return false;
      if (ingredient && !r.ingredients.some((i) => i.name === ingredient)) return false;
      if (level > 1 && !r.ingredients.some((i) => i.type === 'dose')) return false;
      return true;
    });
    if (filter === 'weak') {
      list = list
        .map((r) => ({ r, c: getCard(progress, r.id, level) }))
        .filter((x) => x.c.errors > 0)
        .sort((a, b) => b.c.errors / b.c.attempts - a.c.errors / a.c.attempts)
        .map((x) => x.r);
    }
    return list;
  }, [filter, letter, glass, ingredient, level, progress]);

  const start = () => {
    const shuffled = filter === 'weak' ? pool : [...pool].sort(() => Math.random() - 0.5);
    const items: SessionItem[] = shuffled.slice(0, count).map((r) => ({ id: r.id, level, isNew: false }));
    go({ name: 'session', items, counts, title: 'Entraînement', nonce: Date.now() });
  };

  const letters = [...new Set(recipes.map((r) => r.name[0].toUpperCase()))].sort();

  return (
    <div className="stack">
      <div className="topbar">
        <button className="ghost" onClick={onBack}>← Accueil</button>
      </div>
      <h1>Entraînement libre</h1>
      <div>
        <label>Cocktails</label>
        <div className="grid2">
          {([['fav', 'Favoris'], ['all', 'Tous'], ['weak', 'Mes points faibles'], ['alcfree', 'Sans alcool']] as [Filter, string][]).map(([k, l]) => (
            <button key={k} className={filter === k ? 'sel' : ''} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
      </div>
      <div>
        <label>Niveau</label>
        <div className="grid2" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
          {([1, 2, 3] as Level[]).map((l) => (
            <button key={l} className={level === l ? 'sel' : ''} onClick={() => setLevel(l)}>
              {l === 1 ? 'Ingrédients' : l === 2 ? 'Doses QCM' : 'Doses libres'}
            </button>
          ))}
        </div>
      </div>
      <div className="grid2">
        <div>
          <label>Lettre</label>
          <select value={letter} onChange={(e) => setLetter(e.target.value)}>
            <option value="">Toutes</option>
            {letters.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label>Verre</label>
          <select value={glass} onChange={(e) => setGlass(e.target.value)}>
            <option value="">Tous</option>
            {glasses.map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label>Contient l’ingrédient</label>
        <select value={ingredient} onChange={(e) => setIngredient(e.target.value)}>
          <option value="">Peu importe</option>
          {allIngredients.map((g) => <option key={g}>{g}</option>)}
        </select>
      </div>
      <div className="grid2">
        <div>
          <label>Nombre de cartes</label>
          <input type="number" min={1} max={200} value={count} onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))} />
        </div>
        <label className="row" style={{ alignSelf: 'end', minHeight: 44, color: 'var(--text)' }}>
          <input type="checkbox" checked={counts} onChange={(e) => setCounts(e.target.checked)} style={{ width: 22, minHeight: 22 }} />
          Compter dans la progression
        </label>
      </div>
      <button className="primary" disabled={pool.length === 0} onClick={start}>
        {pool.length ? `Commencer (${Math.min(count, pool.length)} sur ${pool.length})` : 'Aucun cocktail avec ces filtres'}
      </button>
    </div>
  );
}
