'use client';

import { useEffect, useState } from 'react';
import DialerPropertyPanels from './DialerPropertyPanels';
import type { DialerContact } from './property-context';

// Contact identity/editing lives in the calling row, not duplicated among research tools.
export default function DialerContactPane({ contact, isLight, visible }: { contact?: DialerContact; isLight: boolean; visible: boolean; preview?: { name: string; phone: string; context: string; city: string; label: string } }) {
  const [tab, setTab] = useState<'home' | 'comps'>('comps');
  const [opened, setOpened] = useState(visible);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1280px)');
    const reveal = () => { if (desktop.matches || visible) setOpened(true); };
    reveal(); desktop.addEventListener('change', reveal);
    return () => desktop.removeEventListener('change', reveal);
  }, [visible]);
  if (contact?.dialerUnavailable) return <p className="p-5 text-sm">This contact is no longer accessible. Saved wrap-up remains available above.</p>;
  return <div className="flex h-full min-h-0 flex-col xl:h-auto">
    <nav aria-label="Property tools" className={`flex shrink-0 gap-1 border-b p-2 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
      {(['home', 'comps'] as const).map(item => <button key={item} aria-pressed={tab === item} onClick={() => setTab(item)} className={`min-h-11 flex-1 rounded-lg text-sm font-semibold ${tab === item ? 'bg-emerald-600 text-white' : ''}`}>{item === 'home' ? 'Property' : 'MLS comps & map'}</button>)}
    </nav>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-3 pb-28 xl:overflow-visible xl:pb-3">{opened && <DialerPropertyPanels contact={contact} isLight={isLight} visiblePanel={tab === 'home' ? 1 : 2} mode={tab} />}</div>
  </div>;
}
