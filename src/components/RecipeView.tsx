import type { Ingredient, Recipe } from '../lib/types';
import { formatDose } from '../lib/text';

export function doseLabel(ing: Ingredient): string {
  if (ing.type === 'fill') return 'auffüllen';
  if (ing.type === 'presence' || ing.amount == null) return '—';
  return formatDose(ing.amount, ing.amountMax, ing.unit);
}

export function RecipeLines({ recipe, showDoses = true }: { recipe: Recipe; showDoses?: boolean }) {
  return (
    <div className="lines" style={{ marginTop: 8 }}>
      {recipe.ingredients.map((ing, i) => (
        <div className="line" key={i}>
          <span className="name">
            {ing.name}
            {ing.tag && <span className="pill">{ing.tag}</span>}
          </span>
          {showDoses && <span className="val">{doseLabel(ing)}</span>}
        </div>
      ))}
    </div>
  );
}

export function MethodBox({ recipe, note }: { recipe: Recipe; note?: string }) {
  if (!recipe.notes && !recipe.garnish && !note) return null;
  return (
    <div className="method">
      {recipe.notes && <div>Méthode : {recipe.notes}</div>}
      {recipe.garnish && <div>Deko : {recipe.garnish}</div>}
      {note && <div>Mes notes : {note}</div>}
    </div>
  );
}
