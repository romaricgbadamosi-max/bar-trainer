import { useEffect, useState } from 'react';
import { useStore } from './store';
import Home from './components/Home';
import Session from './components/Session';
import FreeSetup from './components/FreeSetup';
import Catalogue from './components/Catalogue';
import Stats from './components/Stats';
import SettingsScreen from './components/SettingsScreen';
import type { SessionItem } from './lib/srs';

export type Route =
  | { name: 'home' }
  | { name: 'session'; items: SessionItem[]; counts: boolean; title: string; nonce: number }
  | { name: 'free' }
  | { name: 'catalogue'; id?: string }
  | { name: 'stats' }
  | { name: 'settings' };

export default function App() {
  const { ready, device } = useStore();
  const [route, setRoute] = useState<Route>({ name: 'home' });

  useEffect(() => {
    document.documentElement.classList.toggle('touch', device === 'touch');
  }, [device]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route.name]);

  if (!ready) return <p className="muted">Chargement…</p>;
  const go = (r: Route) => setRoute(r);
  const home = () => setRoute({ name: 'home' });

  switch (route.name) {
    case 'session':
      return <Session key={route.nonce} items={route.items} counts={route.counts} title={route.title} onExit={home} />;
    case 'free':
      return <FreeSetup go={go} onBack={home} />;
    case 'catalogue':
      return <Catalogue initialId={route.id} onBack={home} />;
    case 'stats':
      return <Stats onBack={home} go={go} />;
    case 'settings':
      return <SettingsScreen onBack={home} />;
    default:
      return <Home go={go} />;
  }
}
