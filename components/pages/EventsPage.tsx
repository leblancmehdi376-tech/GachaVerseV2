'use client';
import { useState } from 'react';
import { NAV_ICONS } from '@/components/ui/NavIcons';
import { isPeripleActive } from '@/lib/game/periple';
import { isPlinkoActive } from '@/lib/game/plinko';
import { PeriplePage } from './PeriplePage';
import { PlinkoPage } from './PlinkoPage';
import { GachaDlePage } from './GachaDlePage';

// Onglet « Événements » (rubrique Activités) : l'événement du mois (Plinko
// Multiversel), le Grand Périple tant qu'il dure, et le GachaDle (défi
// quotidien). Chaque sous-page garde son propre défilement.
type EventTab = 'plinko' | 'periple' | 'gachadle';

const ALL_TABS: { id: EventTab; label: string; tag: string; accent: string }[] = [
  { id: 'plinko',   label: 'Plinko',        tag: 'Du mois',    accent: '#f472b6' },
  { id: 'periple',  label: 'Grand Périple', tag: 'Temporaire', accent: '#fb923c' },
  { id: 'gachadle', label: 'GachaDle',      tag: 'Quotidien',  accent: '#38bdf8' },
];
// Le Périple disparaît une fois terminé (son code reste, pour une prochaine édition).
const visibleTabs = () => ALL_TABS.filter(t => t.id !== 'periple' || isPeripleActive());

// Dernier sous-onglet ouvert, mémorisé sur cet appareil.
const TAB_KEY = 'gv_events_tab';
function loadTab(): EventTab {
  try {
    const v = localStorage.getItem(TAB_KEY);
    if (visibleTabs().some(t => t.id === v)) return v as EventTab;
  } catch { /* stockage indisponible */ }
  return isPlinkoActive() || !isPeripleActive() ? 'plinko' : 'periple';
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
        {visibleTabs().map(t => {
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
        {tab === 'plinko' ? <PlinkoPage /> : tab === 'periple' ? <PeriplePage /> : <GachaDlePage />}
      </div>
    </div>
  );
}
