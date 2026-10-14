'use client';
import type { NakimeRunEnd } from '@/store/slices/nakimeSlice';
import { equipmentChip, milestoneRewards } from './NakimeMeta';

// Bilan d'une run terminée : étages franchis, butin crédité, Notes, paliers.
export function NakimeEndModal({ end, onClose }: { end: NakimeRunEnd; onClose: () => void }) {
  const { loot } = end;
  return (
    <div className="nk-modal" role="dialog" aria-modal="true" aria-label="Bilan de la run" onClick={onClose}>
      <div className="panel nk-modal__box" onClick={e => e.stopPropagation()}>
        <button className="nk-modal__close" onClick={onClose} aria-label="Fermer">✕</button>
        <span className="nk-banner__eyebrow">{end.defeated ? 'Défaite' : 'Retraite'}</span>
        <h2>{end.floorsCleared} étage{end.floorsCleared > 1 ? 's' : ''} franchi{end.floorsCleared > 1 ? 's' : ''}</h2>
        {end.newRecord && <p className="nk-record">🏆 Nouveau record !</p>}
        <p className="nk-muted">⚔️ {end.elites} élite{end.elites > 1 ? 's' : ''} · 👹 {end.bosses} boss vaincu{end.bosses > 1 ? 's' : ''}</p>
        <div className="nk-loot">
          <div><span>💎</span><b>{loot.gems}</b><small>Gemmes</small></div>
          {loot.stones > 0 && <div><span>💠</span><b>{loot.stones}</b><small>Pierres d&apos;Évolution</small></div>}
          {(loot.tickets ?? 0) > 0 && <div className="nk-loot__ticket"><span>🎟️</span><b>{loot.tickets}</b><small>Tickets de l&apos;Infini</small></div>}
          <div><span>🎵</span><b>{end.notes}</b><small>Notes de Biwa</small></div>
        </div>
        {end.equipment.length > 0 && <div className="nk-loot__equip">{end.equipment.map(equipmentChip)}</div>}
        {end.milestones.length > 0 && (
          <div className="nk-end-milestones">
            <b>Paliers de record atteints ! (déjà comptés ci-dessus)</b>
            {end.milestones.map(m => <span key={m.floor}>🏯 Étage {m.floor} : {milestoneRewards(m)}</span>)}
          </div>
        )}
        <button className="btn-primary nk-btn" onClick={onClose}>Fermer</button>
      </div>
    </div>
  );
}
