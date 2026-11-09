import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { CardState, Device, Grade, HistoryEntry, Level, Progress, Settings } from './lib/types';
import {
  loadStore,
  saveHistory,
  saveNotes,
  saveProgress,
  saveSettings,
  resetAll,
  emptyProgress,
  DEFAULT_SETTINGS,
  type Store,
} from './lib/storage';
import { applyGrade, cardKey, getCard, reconcile } from './lib/srs';
import { dayKey } from './lib/text';
import { recipes } from './lib/data';
import { useDevice } from './lib/useDevice';

export interface UndoToken {
  key: string;
  prev: CardState | undefined;
  countedNew: boolean;
  historyLen: number;
}

interface Ctx extends Store {
  ready: boolean;
  device: Device;
  record: (id: string, level: Level, grade: Grade, ms: number | null, counts: boolean) => UndoToken;
  undo: (t: UndoToken) => void;
  setSettings: (s: Settings) => void;
  setNote: (id: string, text: string) => void;
  replaceAll: (s: Store) => void;
  reset: () => Promise<void>;
}

const C = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const device = useDevice();
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  // refs so callbacks always see fresh values without re-rendering consumers
  const pRef = useRef(progress);
  const hRef = useRef(history);
  pRef.current = progress;
  hRef.current = history;

  useEffect(() => {
    loadStore().then((s) => {
      const p = reconcile(s.progress, recipes, Date.now());
      setProgress(p);
      setSettingsState(s.settings);
      setHistory(s.history);
      setNotes(s.notes);
      saveProgress(p);
      setReady(true);
    });
  }, []);

  const record = useCallback<Ctx['record']>(
    (id, level, grade, ms, counts) => {
      const now = Date.now();
      const key = cardKey(id, level);
      const p = pRef.current;
      const prev = p.cards[key];
      const before = getCard(p, id, level);
      const entry: HistoryEntry = { t: now, id, level, ok: grade !== 'wrong', grade, ms, device };
      const historyLen = hRef.current.length;
      const h = [...hRef.current, entry];
      setHistory(h);
      saveHistory(h);
      let countedNew = false;
      if (counts) {
        const cards = { ...p.cards, [key]: applyGrade(before, grade, now) };
        const newIntroduced = { ...p.newIntroduced };
        if (level === 1 && before.attempts === 0) {
          const d = dayKey(now);
          newIntroduced[d] = (newIntroduced[d] ?? 0) + 1;
          countedNew = true;
        }
        const np = { ...p, cards, newIntroduced };
        pRef.current = np;
        setProgress(np);
        saveProgress(np);
      }
      return { key, prev: counts ? prev : p.cards[key], countedNew, historyLen };
    },
    [device],
  );

  const undo = useCallback<Ctx['undo']>((t) => {
    const p = pRef.current;
    const cards = { ...p.cards };
    if (t.prev) cards[t.key] = t.prev;
    else delete cards[t.key];
    const newIntroduced = { ...p.newIntroduced };
    if (t.countedNew) {
      const d = dayKey(Date.now());
      newIntroduced[d] = Math.max(0, (newIntroduced[d] ?? 1) - 1);
    }
    const np = { ...p, cards, newIntroduced };
    pRef.current = np;
    setProgress(np);
    saveProgress(np);
    const h = hRef.current.slice(0, t.historyLen);
    setHistory(h);
    saveHistory(h);
  }, []);

  const setSettings = useCallback((s: Settings) => {
    setSettingsState(s);
    saveSettings(s);
  }, []);

  const setNote = useCallback((id: string, text: string) => {
    setNotes((n) => {
      const nn = { ...n, [id]: text };
      if (!text) delete nn[id];
      saveNotes(nn);
      return nn;
    });
  }, []);

  const replaceAll = useCallback((s: Store) => {
    const p = reconcile(s.progress, recipes, Date.now());
    setProgress(p);
    setSettingsState(s.settings);
    setHistory(s.history);
    setNotes(s.notes);
    saveProgress(p);
    saveSettings(s.settings);
    saveHistory(s.history);
    saveNotes(s.notes);
  }, []);

  const reset = useCallback(async () => {
    await resetAll();
    const p = reconcile(emptyProgress(), recipes, Date.now());
    setProgress(p);
    setSettingsState(DEFAULT_SETTINGS);
    setHistory([]);
    setNotes({});
    saveProgress(p);
  }, []);

  return (
    <C.Provider
      value={{ ready, device, progress, settings, history, notes, record, undo, setSettings, setNote, replaceAll, reset }}
    >
      {children}
    </C.Provider>
  );
}

export function useStore(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error('StoreProvider missing');
  return c;
}
