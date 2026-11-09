import { useEffect, useState } from 'react';

export default function Timer({ start, stopped }: { start: number; stopped?: number | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (stopped) return;
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, [stopped]);
  const ms = (stopped ?? now) - start;
  return <span className="sub">{(ms / 1000).toFixed(1).replace('.', ',')} s</span>;
}
