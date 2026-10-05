'use client';
import { useState } from 'react';
import { NAV_ICONS } from '@/components/ui/NavIcons';
import { isPeripleActive } from '@/lib/game/periple';
import { PeriplePage } from './PeriplePage';
import { GachaDlePage } from './GachaDlePage';

// Onglet « Événements » (rubrique Activités) : regroupe le Grand Périple
// (événement temporaire) et le GachaDle (défi quotidien) derrière deux
// sous-onglets. Chaque sous-page garde son propre défilement.
type EventTab = 'periple' | 'gachadle';

const TABS: { id: EventTab; label: string; tag: string; accent: string }[] = [
  { id: 'periple',  label: 'Grand Périple', tag: 'Temporaire', accent: '#fb923c' },
  { id: 'gachadle', label: 'GachaDle',      tag: 'Quotidien',  accent: '#38bdf8' },
];

// Dernier sous-onglet ouvert, mémorisé sur cet appareil.
const TAB_KEY = 'gv_events_tab';
function loadTab(): EventTab {
  try {
    const v = localStorage.getItem(TAB_KEY);
    if (v === 'periple' || v === 'gachadle') return v;
  } catch { /* stockage indisponible */ }
  return isPeripleActive() ? 'periple' : 'gachadle';
}

export function EventsPage() {
  const [tab, setTab] = useState<EventTab>(loadTab);
  const select = (t: EventTab) => {
    setTab(t);
    try { localStorage.setItem(TAB_KEY, t); } catch { /* stockage indisponible */ }
  };

  return (
    <div className="ev-page">
      <div className="ev-tabs" role="tablist" aria-label="Événements">
        {TABS.map(t => {
          const Icon = NAV_ICONS[t.id];
          const active = tab === t.id;
          return (
            <button key={t.id} role="tab" aria-selected={active} className={`ev-tab${active ? ' is-active' : ''}`}
              style={{ ['--accent' as string]: t.accent }} onClick={() => select(t.id)}>
              {Icon && <Icon size={20} color="currentColor" />}
              <span className="ev-tab__label">{t.label}</span>
              <span className="ev-tab__tag">{t.tag}</span>
            </button>
          );
        })}
      </div>
      <div className="ev-content">
        {tab === 'periple' ? <PeriplePage /> : <GachaDlePage />}
      </div>
    </div>
  );
}
