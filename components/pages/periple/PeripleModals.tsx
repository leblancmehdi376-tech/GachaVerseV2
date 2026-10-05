'use client';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';
import { EquipmentIcon } from '@/components/ui/EquipmentIcon';
import { Countdown } from '@/components/pages/QuestsPage';
import { getCharacterById } from '@/lib/game/characters';
import { getEquipmentDef } from '@/lib/game/items';
import {
  PERIPLE_SHOP, SHOP_SECTIONS, PERIPLE_MAX_DICE, PERIPLE_DICE_REGEN_MS, PERIPLE_PASS_START_TOKENS, PERIPLE_POINTS_PER_PIP,
  TILE_INFO, PERIPLE_QUESTS_TOTAL_GEMS, formatPeripleReward, shortPeripleReward, type TileKind, type PeripleReward, type PeripleDaily,
} from '@/lib/game/periple';
import type { PeripleLoot, PeriplePull } from '@/store/slices/peripleSlice';
import { RewardIcon } from './PeripleIcons';
import { TileBadge } from './TileBadge';

// Popups ouvertes (elles peuvent s'empiler) : tant qu'il y en a une, les
// animations en boucle de la page passent en pause (voir body.pp-modal-open).
let openModals = 0;

export function Modal({ onClose, wide, closable = true, children }: { onClose: () => void; wide?: boolean; closable?: boolean; children: ReactNode }) {
  useEffect(() => {
    openModals++;
    document.body.classList.add('pp-modal-open');
    return () => {
      openModals = Math.max(0, openModals - 1);
      if (openModals === 0) document.body.classList.remove('pp-modal-open');
    };
  }, []);
  useEffect(() => {
    if (!closable) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, closable]);
  // Portail vers <body> : la zone de contenu forme son propre empilement
  // (zIndex) et piégerait sinon la popup sous la barre du haut.
  return createPortal(
    <div className="pp-overlay" onClick={closable ? onClose : undefined}>
      <div className={`pp-modal${wide ? ' pp-modal--wide' : ''}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        {closable && <button className="pp-close" onClick={onClose} aria-label="Fermer">✕</button>}
        {children}
      </div>
    </div>,
    document.body,
  );
}

// ─── Affichage d'un butin ────────────────────────────────────────────────────
function pillLabel(r: PeripleReward): string {
  if (r.kind === 'title') return 'Titre exclusif';
  if (r.kind === 'boost') return `Boost ${r.amount} min`;
  if (r.kind === 'gold') return 'Sac d\'or';
  return `+${r.amount}`;
}

export function RewardPill({ reward, big }: { reward: PeripleReward; big?: boolean }) {
  return (
    <span className={`pp-reward${big ? ' pp-reward--big' : ''}`} title={formatPeripleReward(reward)}>
      <RewardIcon kind={reward.kind} size={big ? 34 : 26} />
      <span>{pillLabel(reward)}</span>
    </span>
  );
}

export function PullCards({ pulls }: { pulls: PeriplePull[] }) {
  if (pulls.length === 0) return null;
  const w = pulls.length > 10 ? 64 : pulls.length > 3 ? 80 : 116;
  return (
    <div className="pp-pulls">
      {pulls.map((p, i) => {
        const tpl = getCharacterById(p.templateId);
        if (!tpl) return null;
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: w, animation: `ppPop 0.35s ${Math.min(i, 20) * 0.05}s both` }}>
            <CharacterCardThumb templateId={tpl.id} name={tpl.name} rarity={tpl.rarity} edition={p.edition} width={w} height={w * 1.4} frameOverlay />
            {pulls.length <= 10 && <span style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 14, color: 'var(--text)', textAlign: 'center', lineHeight: 1.15 }}>{tpl.name}</span>}
          </div>
        );
      })}
    </div>
  );
}

export function LootView({ loot }: { loot: PeripleLoot }) {
  return (
    <>
      {loot.rewards.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {loot.rewards.map((r, i) => <RewardPill key={i} reward={r} big />)}
        </div>
      )}
      {loot.equipment.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 12 }}>
          {loot.equipment.map((id, i) => {
            const def = getEquipmentDef(id);
            if (!def) return null;
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, maxWidth: 120 }}>
                <div style={{ width: 72, height: 72, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', border: `2px solid ${def.color}` }}>
                  <EquipmentIcon item={def} size={56} />
                </div>
                <span style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 14, color: def.color, textAlign: 'center', lineHeight: 1.15 }}>{def.name}</span>
              </div>
            );
          })}
        </div>
      )}
      <PullCards pulls={loot.pulls} />
    </>
  );
}

export interface RewardPopupData {
  title: string;
  text?: string;
  icon?: ReactNode;
  accent?: string;
  loot: PeripleLoot;
}

export function RewardModal({ data, onClose }: { data: RewardPopupData; onClose: () => void }) {
  return (
    <Modal onClose={onClose} wide={data.loot.pulls.length > 3}>
      <div style={{ textAlign: 'center', paddingTop: 6 }}>
        {data.icon && (
          <div className="pp-burst pp-loop" style={{ ['--accent' as string]: data.accent ?? '#a855f7' }}>{data.icon}</div>
        )}
        <div className="pp-modal-title">{data.title}</div>
        {data.text && <div className="pp-modal-text">{data.text}</div>}
        <div style={{ marginTop: 14 }}><LootView loot={data.loot} /></div>
        <button className="pp-btn pp-btn--green pp-loop" style={{ marginTop: 18, minWidth: 180 }} onClick={onClose}>CONTINUER</button>
      </div>
    </Modal>
  );
}

// ─── Boutique ────────────────────────────────────────────────────────────────
const SECTION_ACCENT: Record<string, string> = { featured: '#f59e0b', summon: '#a855f7', resources: '#3b82f6', daily: '#22c55e' };

export function PeripleShopModal({ tokens, bought, daily, onBuy, onClose }: {
  tokens: number;
  bought: Record<string, number>;
  daily: PeripleDaily;
  onBuy: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose} wide>
      <div className="pp-shop-head">
        <div className="pp-modal-title" style={{ textAlign: 'left', padding: 0 }}>Boutique du Périple</div>
        <span className="pp-balance"><RewardIcon kind="tokens" size={30} />{tokens}</span>
      </div>
      {SHOP_SECTIONS.map(sec => {
        const items = PERIPLE_SHOP.filter(i => i.section === sec.id);
        const accent = SECTION_ACCENT[sec.id];
        return (
          <section key={sec.id} style={{ marginBottom: 18 }}>
            <div className="pp-shop-sec" style={{ ['--accent' as string]: accent }}>
              <span>{sec.title}</span>
              {sec.id === 'daily' && <small>⏳ <Countdown type="daily" /></small>}
            </div>
            <div className={`pp-shop-grid${sec.id === 'featured' ? ' pp-shop-grid--featured' : ''}`}>
              {items.map(item => {
                const n = item.daily ? (daily.shop?.[item.id] ?? 0) : (bought[item.id] ?? 0);
                const left = item.stock - n;
                const soldOut = left <= 0;
                const canBuy = !soldOut && tokens >= item.cost;
                return (
                  <div key={item.id} className={`pp-shop-item${soldOut ? ' is-sold' : ''}`} style={{ ['--accent' as string]: accent }}>
                    {item.tag && <span className="pp-shop-tag">{item.tag}</span>}
                    <div className="pp-shop-item__art"><RewardIcon kind={item.reward.kind} size={sec.id === 'featured' ? 64 : 52} /></div>
                    <div className="pp-shop-item__name">{item.name}</div>
                    <div className="pp-shop-item__qty">{shortPeripleReward(item.reward)}</div>
                    <div className="pp-shop-item__stock">{soldOut ? 'Épuisé' : item.daily ? `${left}/${item.stock} aujourd'hui` : `Stock : ${left}/${item.stock}`}</div>
                    <button className="pp-btn pp-btn--small pp-loop" style={{ width: '100%', marginTop: 'auto' }} disabled={!canBuy} onClick={() => onBuy(item.id)}
                      aria-label={`Acheter ${formatPeripleReward(item.reward)} pour ${item.cost} jetons`}>
                      <RewardIcon kind="tokens" size={22} /> {item.cost}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </Modal>
  );
}

// ─── Règles ──────────────────────────────────────────────────────────────────
export function PeripleRulesModal({ onClose }: { onClose: () => void }) {
  const regenH = PERIPLE_DICE_REGEN_MS / 3600_000;
  return (
    <Modal onClose={onClose}>
      <div className="pp-modal-title" style={{ textAlign: 'left', padding: '0 48px 0 0' }}>Comment jouer</div>
      <ul className="pp-rules">
        <li>Lance le dé : ton équipe avance et <b>chaque case lance un mini-jeu</b>. Meilleure est ta médaille, meilleure est la récompense.</li>
        <li><b>1 dé toutes les {regenH} h</b> (réserve de {PERIPLE_MAX_DICE}). Missions, cases et boutique en donnent d&apos;autres.</li>
        <li>Chaque lancer rapporte <b>{PERIPLE_POINTS_PER_PIP} points par point du dé</b>. Les points débloquent les paliers.</li>
        <li>Passer par le Départ rapporte <b>{PERIPLE_PASS_START_TOKENS} jetons</b>, s&apos;y arrêter pile rapporte bien plus.</li>
        <li>Les <b>jetons</b> s&apos;échangent dans la boutique : impossible de tout acheter, fais tes choix !</li>
        <li>Les <b>quêtes de l&apos;événement</b> courent sur toute sa durée : <b>{PERIPLE_QUESTS_TOTAL_GEMS.toLocaleString('fr-FR')} gemmes</b> à la clé.</li>
      </ul>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(Object.keys(TILE_INFO) as TileKind[]).map(k => <TileLegendRow key={k} kind={k} />)}
      </div>
    </Modal>
  );
}

export function TileLegendRow({ kind }: { kind: TileKind }) {
  const info = TILE_INFO[kind];
  return (
    <div className="pp-legend" style={{ ['--accent' as string]: info.top }}>
      <TileBadge kind={kind} size={52} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--f-game)', fontSize: 18, color: info.glow, lineHeight: 1.1 }}>{info.label} <span style={{ color: 'var(--text-sub)', fontSize: 16 }}>· {info.game}</span></div>
        <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 600, fontSize: 14, color: 'var(--text-sub)', lineHeight: 1.3 }}>{info.desc}</div>
      </div>
    </div>
  );
}
