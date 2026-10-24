'use client';
import { useGameStore } from '@/store/gameStore';
import { useNow } from '@/hooks/useNow';
import { AFFINITY_CONFIG, getAffinityForId, type Affinity } from '@/lib/game/affinities';
import { getCosmicTide, getNextTide, tideMultFor, TIDE_UP_MULT, TIDE_DOWN_MULT, type CosmicTide } from '@/lib/game/tides';
import { msUntilNextDailyReset } from '@/lib/game/shop';
import { getCharacterById } from '@/lib/game/characters';
import { parseInstanceKey } from '@/lib/game/editions';
import { formatTimeLeft } from '@/lib/game/format';
import { BreakdownPopup, Row, pct } from './DpsBreakdownTooltip';

interface TideDetail {
  tide: CosmicTide;
  next: CosmicTide;
  msLeft: number;
  team: { key: string; name: string; mult: number }[];
}

const readTide = (): TideDetail => {
  const tide = getCosmicTide();
  const team = useGameStore.getState().equippedTeam
    .filter((k): k is string => !!k)
    .map(key => {
      const id = parseInstanceKey(key).templateId;
      return { key, name: getCharacterById(id)?.name ?? id, mult: tideMultFor(getAffinityForId(id), tide) };
    })
    .filter(m => m.mult !== 1);
  return { tide, next: getNextTide(tide), msLeft: msUntilNextDailyReset(), team };
};

const typeLabel = (a: Affinity) => `${AFFINITY_CONFIG[a].icon} ${AFFINITY_CONFIG[a].label}`;

function TideContent({ d }: { d: TideDetail }) {
  return (
    <div className="dps-tip dps-tip--tide">
      <div className="dps-tip__title">🌊 MARÉE COSMIQUE DU JOUR</div>
      <div className="dps-tip__section">
        <Row label={<>▲ {typeLabel(d.tide.up)}</>} value={`${pct(TIDE_UP_MULT)} dégâts`} color="#4ade80" />
        <Row label={<>▼ {typeLabel(d.tide.down)}</>} value={`${pct(TIDE_DOWN_MULT)} dégâts`} color="#f87171" />
      </div>
      <div className="dps-tip__section">
        {d.team.length === 0 ? (
          <div className="dps-tip__empty">Aucun compagnon de ton équipe n&apos;est concerné aujourd&apos;hui.</div>
        ) : d.team.map(m => (
          <Row key={m.key} sub label={m.name} value={pct(m.mult)} color={m.mult > 1 ? '#4ade80' : '#f87171'} />
        ))}
      </div>
      <div className="dps-tip__note tide-tip__note">
        S&apos;applique aux persos de ce type au combat et dans le Château de Nakime.
        Prochaine marée dans {formatTimeLeft(d.msLeft)} : ▲ {typeLabel(d.next.up)} · ▼ {typeLabel(d.next.down)}.
      </div>
    </div>
  );
}

const renderTide = (d: TideDetail) => <TideContent d={d} />;

// ── Marée cosmique du jour (voir lib/game/tides.ts) : type en marée haute et
// en marée basse, détail (équipe concernée, marée suivante) au survol/appui.
export function CosmicTideBar() {
  useNow(60_000); // la marée change à 2h : revérifiée une fois par minute
  const tide = getCosmicTide();
  const up = AFFINITY_CONFIG[tide.up];
  const down = AFFINITY_CONFIG[tide.down];

  return (
    <div style={{ position:'relative', zIndex:3, display:'flex', padding:'0 18px 8px', flexShrink:0 }}>
      <BreakdownPopup read={readTide} render={renderTide}>
        <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:'4px 10px', background:'rgba(56,189,248,0.1)', border:'1px solid rgba(56,189,248,0.35)', borderRadius:8, padding:'4px 10px', minHeight:44 }}>
          <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:14, color:'#7dd3fc', letterSpacing:1 }}>🌊 MARÉE <span style={{ opacity:0.8 }}>ⓘ</span></span>
          {/* Flèche et valeur en vert/rouge, nom du type dans sa couleur. */}
          <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:14, whiteSpace:'nowrap' }}>
            <span style={{ color:'#4ade80' }}>▲</span> <span style={{ color:up.color }}>{up.icon} {up.label}</span> <span style={{ color:'#4ade80' }}>{pct(TIDE_UP_MULT)}</span>
          </span>
          <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:14, whiteSpace:'nowrap' }}>
            <span style={{ color:'#f87171' }}>▼</span> <span style={{ color:down.color }}>{down.icon} {down.label}</span> <span style={{ color:'#f87171' }}>{pct(TIDE_DOWN_MULT)}</span>
          </span>
        </div>
      </BreakdownPopup>
    </div>
  );
}
