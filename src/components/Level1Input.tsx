import { useEffect, useMemo, useRef, useState } from 'react';
import type { Recipe } from '../lib/types';
import { allIngredients, glasses } from '../lib/data';
import { norm } from '../lib/text';

export interface L1Answer {
  ingredients: string[];
  glass: string | null;
}

export default function Level1Input({ recipe, onSubmit }: { recipe: Recipe; onSubmit: (a: L1Answer) => void }) {
  const [chips, setChips] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [active, setActive] = useState(0);
  const [glass, setGlass] = useState<string | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const askGlass = recipe.glass != null;

  useEffect(() => inputRef.current?.focus(), []);

  const suggestions = useMemo(() => {
    const q = norm(text);
    if (!q) return [];
    const taken = new Set(chips.map(norm));
    const pool = allIngredients.filter((n) => !taken.has(norm(n)));
    const starts = pool.filter((n) => norm(n).startsWith(q));
    const words = pool.filter((n) => !starts.includes(n) && norm(n).split(/[\s-]/).some((w) => w.startsWith(q)));
    const inside = pool.filter((n) => !starts.includes(n) && !words.includes(n) && norm(n).includes(q));
    return [...starts, ...words, ...inside].slice(0, 5);
  }, [text, chips]);

  const add = (name: string) => {
    setChips((c) => (c.some((x) => norm(x) === norm(name)) ? c : [...c, name]));
    setText('');
    setActive(0);
    setError('');
    inputRef.current?.focus();
  };

  const submit = () => {
    if (chips.length === 0) return setError('Ajoute au moins un ingrédient.');
    if (askGlass && !glass) return setError('Choisis le verre.');
    onSubmit({ ingredients: chips, glass });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        submit();
        return;
      }
      const inGlass = glassRef.current?.contains(document.activeElement);
      if (inGlass && /^[1-9]$/.test(e.key)) {
        const g = glasses[Number(e.key) - 1];
        if (g) setGlass(g);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      if (suggestions[active]) add(suggestions[active]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Backspace' && text === '' && chips.length) {
      setChips((c) => c.slice(0, -1));
    } else if (e.key === 'Tab' && !e.shiftKey && askGlass) {
      e.preventDefault();
      (glassRef.current?.querySelector('button.sel') as HTMLButtonElement | null ?? glassRef.current?.querySelector('button'))?.focus();
    }
  };

  return (
    <div>
      <label>Ingrédients</label>
      <div>
        {chips.map((c) => (
          <button key={c} className="chip" onClick={() => setChips((x) => x.filter((y) => y !== c))} aria-label={`Retirer ${c}`}>
            {c} ✕
          </button>
        ))}
      </div>
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setActive(0);
          setError('');
        }}
        onKeyDown={onInputKey}
        placeholder="Tape un ingrédient…"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="enter"
      />
      {suggestions.length > 0 && (
        <div className="suggest">
          {suggestions.map((s, i) => (
            <button key={s} className={i === active ? 'active' : ''} onMouseDown={(e) => e.preventDefault()} onClick={() => add(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
      {askGlass && (
        <>
          <label style={{ marginTop: 14 }}>Verre</label>
          <div className="grid4" ref={glassRef}>
            {glasses.map((g, i) => (
              <button key={g} className={glass === g ? 'sel' : ''} onClick={() => { setGlass(g); setError(''); }} style={{ fontSize: 13, padding: '6px 4px' }}>
                <span className="hint kbd" style={{ margin: 0, display: 'block', fontSize: 11 }}>{i < 9 ? i + 1 : ''}</span>
                {g}
              </button>
            ))}
          </div>
        </>
      )}
      {error && <div className="error">{error}</div>}
      <button className="primary" style={{ width: '100%', marginTop: 14 }} onClick={submit}>
        Valider
      </button>
      <div className="hint kbd">Entrée : ajouter · ↑↓ : choisir · Retour arrière : retirer · Tab : verre (puis 1–9) · Ctrl+Entrée : valider</div>
    </div>
  );
}
