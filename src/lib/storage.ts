import { get, set, del } from 'idb-keyval';
import type { HistoryEntry, Progress, Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  level1Mode: 'input',
  time: {
    keyboard: { 1: { a: 3, b: 2.5 }, 2: { a: 2, b: 1.5 }, 3: { a: 2, b: 2.5 } },
    touch: { 1: { a: 3.9, b: 3.25 }, 2: { a: 2.6, b: 1.95 }, 3: { a: 2.6, b: 3.25 } },
  },
  newPerDay: 8,
  sessionSize: 20,
  unlockAll: false,
  lastBackup: null,
};

export const emptyProgress = (): Progress => ({ cards: {}, recipeHashes: {}, newIntroduced: {} });

const K = { progress: 'progress', settings: 'settings', history: 'history', notes: 'notes' };
const HISTORY_CAP = 8000;

export interface Store {
  progress: Progress;
  settings: Settings;
  history: HistoryEntry[];
  notes: Record<string, string>;
}

function mergeSettings(s: Partial<Settings> | undefined): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...(s ?? {}),
    time: {
      keyboard: { ...DEFAULT_SETTINGS.time.keyboard, ...(s?.time?.keyboard ?? {}) },
      touch: { ...DEFAULT_SETTINGS.time.touch, ...(s?.time?.touch ?? {}) },
    },
  };
}

export async function loadStore(): Promise<Store> {
  try {
    const [progress, settings, history, notes] = await Promise.all([
      get<Progress>(K.progress),
      get<Settings>(K.settings),
      get<HistoryEntry[]>(K.history),
      get<Record<string, string>>(K.notes),
    ]);
    return {
      progress: { ...emptyProgress(), ...(progress ?? {}) },
      settings: mergeSettings(settings),
      history: history ?? [],
      notes: notes ?? {},
    };
  } catch {
    return { progress: emptyProgress(), settings: DEFAULT_SETTINGS, history: [], notes: {} };
  }
}

export const saveProgress = (p: Progress) => set(K.progress, p).catch(() => {});
export const saveSettings = (s: Settings) => set(K.settings, s).catch(() => {});
export const saveNotes = (n: Record<string, string>) => set(K.notes, n).catch(() => {});
export const saveHistory = (h: HistoryEntry[]) => set(K.history, h.slice(-HISTORY_CAP)).catch(() => {});

export async function resetAll() {
  await Promise.all(Object.values(K).map((k) => del(k).catch(() => {})));
}

export function exportJson(store: Store): string {
  return JSON.stringify({ app: 'bar-trainer', version: 1, exportedAt: new Date().toISOString(), ...store });
}

export function parseImport(text: string): Store {
  const data = JSON.parse(text);
  if (data?.app !== 'bar-trainer' || !data.progress) throw new Error('Ce fichier ne vient pas de Bar Trainer.');
  return {
    progress: { ...emptyProgress(), ...data.progress },
    settings: mergeSettings(data.settings),
    history: Array.isArray(data.history) ? data.history : [],
    notes: data.notes ?? {},
  };
}

export async function requestPersistence() {
  try {
    if (navigator.storage?.persist) await navigator.storage.persist();
  } catch {
    /* ignore */
  }
}
