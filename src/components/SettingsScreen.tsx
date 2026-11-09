import { useRef, useState } from 'react';
import { useStore } from '../store';
import { exportJson, parseImport } from '../lib/storage';
import type { Device, Level, Settings } from '../lib/types';

export default function SettingsScreen({ onBack }: { onBack: () => void }) {
  const store = useStore();
  const { settings, setSettings, device } = store;
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const patch = (p: Partial<Settings>) => setSettings({ ...settings, ...p });
  const setTime = (dev: Device, level: Level, key: 'a' | 'b', v: number) =>
    setSettings({
      ...settings,
      time: { ...settings.time, [dev]: { ...settings.time[dev], [level]: { ...settings.time[dev][level], [key]: v } } },
    });

  const doExport = async () => {
    const json = exportJson({ progress: store.progress, settings: { ...settings, lastBackup: Date.now() }, history: store.history, notes: store.notes });
    const name = `bar-trainer-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([json], name, { type: 'application/json' });
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: name });
      else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(file);
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }
      patch({ lastBackup: Date.now() });
      setMsg('Progression exportée.');
    } catch {
      setMsg('Export annulé.');
    }
  };

  const doImport = async (f: File) => {
    try {
      const s = parseImport(await f.text());
      if (!confirm('Remplacer la progression de cet appareil par celle du fichier ?')) return;
      store.replaceAll(s);
      setMsg('Progression importée.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Fichier illisible.');
    }
  };

  return (
    <div className="stack">
      <div className="topbar">
        <button className="ghost" onClick={onBack}>← Accueil</button>
      </div>
      <h1>Réglages</h1>

      <h2>Niveau 1</h2>
      <div className="grid2">
        <button className={settings.level1Mode === 'input' ? 'sel' : ''} onClick={() => patch({ level1Mode: 'input' })}>Saisie</button>
        <button className={settings.level1Mode === 'flash' ? 'sel' : ''} onClick={() => patch({ level1Mode: 'flash' })}>Flashcard</button>
      </div>

      <h2>Sessions</h2>
      <div className="grid2">
        <div>
          <label>Nouveaux cocktails par jour</label>
          <input type="number" min={0} max={50} value={settings.newPerDay} onChange={(e) => patch({ newPerDay: Math.max(0, Number(e.target.value) || 0) })} />
        </div>
        <div>
          <label>Cartes par session</label>
          <input type="number" min={5} max={200} value={settings.sessionSize} onChange={(e) => patch({ sessionSize: Math.max(1, Number(e.target.value) || 1) })} />
        </div>
      </div>
      <label className="row" style={{ color: 'var(--text)' }}>
        <input type="checkbox" checked={settings.unlockAll} onChange={(e) => patch({ unlockAll: e.target.checked })} style={{ width: 22, minHeight: 22 }} />
        Débloquer tous les niveaux (aller directement aux doses)
      </label>

      <h2>Chrono ({device === 'touch' ? 'tactile' : 'clavier'})</h2>
      <p className="small muted">Temps cible = a + b × nombre d’éléments à donner. Juste et sous le temps cible = « rapide ».</p>
      {([1, 2, 3] as Level[]).map((l) => (
        <div className="row" key={l}>
          <span style={{ width: 80 }}>Niveau {l}</span>
          <label className="row" style={{ margin: 0 }}>a <input type="number" step={0.5} min={0} value={settings.time[device][l].a} onChange={(e) => setTime(device, l, 'a', Number(e.target.value) || 0)} /></label>
          <label className="row" style={{ margin: 0 }}>b <input type="number" step={0.25} min={0} value={settings.time[device][l].b} onChange={(e) => setTime(device, l, 'b', Number(e.target.value) || 0)} /></label>
        </div>
      ))}

      <h2>Sauvegarde</h2>
      <p className="small muted">
        La progression reste sur cet appareil. Exporte-la régulièrement, et importe le fichier sur un autre appareil pour continuer là-bas.
        {settings.lastBackup ? ` Dernière sauvegarde : ${new Date(settings.lastBackup).toLocaleDateString('fr-FR')}.` : ' Aucune sauvegarde pour l’instant.'}
      </p>
      <div className="grid2">
        <button onClick={doExport}>Exporter</button>
        <button onClick={() => fileRef.current?.click()}>Importer</button>
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
      {msg && <p className="small">{msg}</p>}

      <h2>Réinitialiser</h2>
      <button
        className="bad"
        onClick={async () => {
          if (confirm('Tout effacer (progression, stats, notes, réglages) ?')) {
            await store.reset();
            setMsg('Tout a été réinitialisé.');
          }
        }}
      >
        Tout effacer
      </button>
    </div>
  );
}
