import { useEffect, useState } from 'react';
import type { Grade, Recipe } from '../lib/types';
import { RecipeLines } from './RecipeView';

export default function Level1Flash({ recipe, onSubmit }: { recipe: Recipe; onSubmit: (g: Grade) => void }) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!flipped && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        setFlipped(true);
      } else if (flipped) {
        if (e.key === '1') onSubmit('wrong');
        if (e.key === '2') onSubmit('slow');
        if (e.key === '3') onSubmit('fast');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flipped, onSubmit]);

  if (!flipped)
    return (
      <div className="card flash" onClick={() => setFlipped(true)} role="button" tabIndex={0}>
        <p className="muted">Ingrédients et verre ?</p>
        <p className="small muted">Touche la carte (ou Espace) pour la retourner</p>
      </div>
    );

  return (
    <div className="stack">
      <div className="card">
        <div className="sub">Verre : <strong>{recipe.glass ?? '—'}</strong></div>
        <RecipeLines recipe={recipe} showDoses={false} />
      </div>
      <div className="grid2" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
        <button className="bad" onClick={() => onSubmit('wrong')}>Raté</button>
        <button onClick={() => onSubmit('slow')}>Hésitant</button>
        <button className="ok" onClick={() => onSubmit('fast')}>Immédiat</button>
      </div>
      <div className="hint kbd">1 : raté · 2 : hésitant · 3 : immédiat</div>
    </div>
  );
}
