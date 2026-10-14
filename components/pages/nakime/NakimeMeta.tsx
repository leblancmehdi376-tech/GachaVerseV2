'use client';
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '@/store/gameStore';
import { emptyNakimeTotals } from '@/store/slices/nakimeSlice';
import { getEquipmentDef } from '@/lib/game/items';
import { NAKIME_META, NAKIME_MILESTONES, memberName, metaTotalCost, type NakimeMilestone } from '@/lib/game/nakime';
import { formatNumber } from '@/lib/game/format';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';
import { getCharacterById } from '@/lib/game/characters';

export function milestoneRewards(m: NakimeMilestone): string {
  return [
    `💎 ${m.gems}`,
    m.stones ? `💠 ${m.stones}` : '',
    m.chestEpic ? `👑 ${m.chestEpic} coffre${m.chestEpic > 1 ? 's' : ''} épique${m.chestEpic > 1 ? 's' : ''}` : '',
    m.title ? `Titre « ${m.title} »` : '',
  ].filter(Boolean).join(' · ');
}

// ── Mémoire du Château : améliorations permanentes ───────────────────────
export function NakimeMemory() {
  const { notes, meta } = useGameStore(useShallow(s => ({ notes: s.nakimeNotes ?? 0, meta: s.nakimeMeta ?? {} })));
  const [msg, setMsg] = useState<{ id: string; text: string } | null>(null);
  const buy = (id: (typeof NAKIME_META)[number]['id']) => {
    const err = useGameStore.getState().buyNakimeMeta(id);
    setMsg({ id, text: err ?? '✔ Amélioré !' });
  };
  return (
    <section className="panel nk-memory">
      <div className="nk-builder__head">
        <h2>Mémoire du Château</h2>
        <span className="chip">🎵 <b>{notes}</b> Notes de Biwa</span>
      </div>
      <p className="nk-muted">Chaque run rapporte des <b>Notes de Biwa</b> (1 par étage, +3 par élite, +10 par boss). Elles achètent des améliorations <b>permanentes</b> pour toutes tes prochaines runs.</p>
      <div className="nk-meta-grid">
        {NAKIME_META.map(def => {
          const lv = meta[def.id] ?? 0;
          const maxed = lv >= def.max;
          const cost = maxed ? 0 : def.cost(lv);
          return (
            <div key={def.id} className={`nk-meta${maxed ? ' is-max' : ''}`}>
              <span className="nk-meta__icon">{def.icon}</span>
              <div className="nk-meta__body">
                <b>{def.name}</b>
                <span>{lv > 0 ? def.text(lv) : 'Pas encore appris'}</span>
                {!maxed && <span className="nk-meta__next">Niveau suivant : {def.text(lv + 1)}</span>}
                {!maxed && def.max > 1 && <span className="nk-meta__next">Reste pour le max : 🎵 {formatNumber(metaTotalCost(def, lv))}</span>}
                <span className="nk-pips" aria-label={`Niveau ${lv} sur ${def.max}`}>
                  {Array.from({ length: def.max }, (_, i) => <i key={i} className={i < lv ? 'is-on' : ''} />)}
                </span>
                {msg?.id === def.id && <span className={msg.text.startsWith('✔') ? 'nk-ok' : 'nk-error'}>{msg.text}</span>}
              </div>
              <button className="btn-primary nk-btn" disabled={maxed || notes < cost} onClick={() => buy(def.id)}>
                {maxed ? 'Max' : `🎵 ${formatNumber(cost)}`}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Records : paliers, statistiques, historique ──────────────────────────
export function NakimeRecords() {
  // Le sélecteur ne renvoie que des références du store : un objet ou un
  // tableau neuf à chaque appel ferait boucler le rendu (useShallow).
  const { best, rawClaimed, rawTotals, rawHistory } = useGameStore(useShallow(s => ({
    best: s.nakimeBestFloor, rawClaimed: s.nakimeMilestones, rawTotals: s.nakimeTotals, rawHistory: s.nakimeHistory,
  })));
  const claimed = rawClaimed ?? [];
  const totals = { ...emptyNakimeTotals(), ...rawTotals };
  const history = rawHistory ?? [];
  const next = NAKIME_MILESTONES.find(m => !claimed.includes(m.floor));
  return (
    <>
      <section className="panel nk-records">
        <div className="nk-builder__head">
          <h2>Paliers de record</h2>
          <span className="chip">Record : <b style={{ color: 'var(--gold-hi)' }}>{best}</b> étage{best > 1 ? 's' : ''}</span>
        </div>
        <p className="nk-muted">Chaque palier n&apos;est récompensé qu&apos;une fois, à la fin de la run qui l&apos;atteint.{next ? ` Prochain : étage ${next.floor}.` : ''}</p>
        <ul className="nk-milestones">
          {NAKIME_MILESTONES.map(m => {
            const done = claimed.includes(m.floor);
            const pct = Math.min(100, (best / m.floor) * 100);
            return (
              <li key={m.floor} className={done ? 'is-done' : ''}>
                <span className="nk-milestones__floor">{done ? '✔' : '🏯'} Étage {m.floor}</span>
                <span className="nk-milestones__reward">{milestoneRewards(m)}</span>
                {!done && <div className="nk-bar"><div style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#b45309,#fbbf24)' }} /></div>}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel nk-records">
        <h2 className="nk-h2">Statistiques</h2>
        <div className="nk-totals">
          <div><b>{totals.runs}</b><span>Runs</span></div>
          <div><b>{totals.floors}</b><span>Étages franchis</span></div>
          <div><b>{totals.fights}</b><span>Combats gagnés</span></div>
          <div><b>{totals.elites}</b><span>Élites vaincues</span></div>
          <div><b>{totals.bosses}</b><span>Boss vaincus</span></div>
        </div>
      </section>

      <section className="panel nk-records">
        <h2 className="nk-h2">Dernières runs</h2>
        {history.length === 0 ? <p className="nk-muted">Aucune run pour l&apos;instant.</p> : (
          <ul className="nk-history">
            {history.map(h => (
              <li key={h.at}>
                <div className="nk-history__head">
                  <b>{h.floors} étage{h.floors > 1 ? 's' : ''}</b>
                  <span className="nk-muted">Acte {h.act} · {h.defeated ? 'Défaite' : 'Retraite'} · {new Date(h.at).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="nk-history__team">
                  {h.team.map(tid => {
                    const tpl = getCharacterById(tid);
                    return tpl ? <CharacterCardThumb key={tid} templateId={tid} name={tpl.name} rarity={tpl.rarity} width={40} height={55} /> : <span key={tid}>{memberName(tid)}</span>;
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export function equipmentChip(id: string, i: number) {
  const def = getEquipmentDef(id);
  return <span key={i} className="chip" style={{ color: def?.color }}>{def?.icon} {def?.name ?? id}</span>;
}
