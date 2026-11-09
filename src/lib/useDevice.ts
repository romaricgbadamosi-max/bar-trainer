import { useEffect, useState } from 'react';
import type { Device } from './types';

const query = '(pointer: coarse)';

export function currentDevice(): Device {
  return typeof window !== 'undefined' && window.matchMedia?.(query).matches ? 'touch' : 'keyboard';
}

export function useDevice(): Device {
  const [d, setD] = useState<Device>(currentDevice);
  useEffect(() => {
    const m = window.matchMedia?.(query);
    if (!m) return;
    const on = () => setD(m.matches ? 'touch' : 'keyboard');
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return d;
}
