'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { NakimeGachaResult } from '@/store/slices/nakimeSlice';
import { getCharacterById } from '@/lib/game/characters';
import { GACHA_TIERS, GACHA_TIER_INFO, NAKIME_GACHA_TITLE_DUPLICATE_GEMS, describeGachaPrize, isHighTier } from '@/lib/game/nakimeGacha';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';
import { equipmentChip } from './NakimeMeta';

const OPEN_STEP_MS = 650;      // délai entre deux ouvertures
const CHARGE_MS = 1100;        // suspense avant une capsule Légendaire / Mythique

// Confettis : trajectoires fixes (pas d'aléatoire au rendu).
const CONFETTI = Array.from({ length: 26 }, (_, i) => {
  const angle = (i / 26) * Math.PI * 2;
  const dist = 110 + (i % 5) * 28;
  return {
    dx: Math.round(Math.cos(angle) * dist), dy: Math.round(Math.sin(angle) * dist - 40),
    rot: (i * 47) % 360, color: ['#fde047', '#f472b6', '#60a5fa', '#4ade80', '#c084fc', '#fb923c'][i % 6], delay: (i % 4) * 40,
  };
});

// Scène d'ouverture des capsules : chacune tremble puis s'ouvre en deux.
export function NakimeCapsuleReveal({ results, tickets, onClose, onAgain }: {
  results: NakimeGachaResult[];
  tickets: number;
  onClose: () => void;
  onAgain: (count: number) => void;
}) {
  const [opened, setOpened] = useState<boolean[]>(() => results.map(() => false));
  const [charging, setCharging] = useState<number | null>(null);
  const [flash, setFlash] = useState<'gold' | 'mythic' | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const open = (i: number) => {
    setOpened(o => (o[i] ? o : o.map((v, k) => (k === i ? true : v))));
    setCharging(c => (c === i ? null : c));
    const tier = results[i].prize.tier;
    if (isHighTier(tier)) {
      setFlash(tier === 'mythique' ? 'mythic' : 'gold');
      timers.current.push(setTimeout(() => setFlash(null), 1200));
    }
  };

  // Ouverture automatique, l'une après l'autre (suspense avant les grosses capsules).
  useEffect(() => {
    let t = 500;
    results.forEach((r, i) => {
      if (isHighTier(r.prize.tier)) {
        timers.current.push(setTimeout(() => setCharging(i), t));
        t += CHARGE_MS;
      }
      timers.current.push(setTimeout(() => open(i), t));
      t += OPEN_STEP_MS;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- séquence lancée une seule fois par tirage
  }, []);

  const allOpen = opened.every(Boolean);
  useEffect(() => { if (allOpen) closeRef.current?.focus(); }, [allOpen]);
  const revealAll = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setCharging(null);
    const best = results.reduce((b, r) => Math.max(b, GACHA_TIERS.indexOf(r.prize.tier)), 0);
    setOpened(results.map(() => true));
    if (isHighTier(GACHA_TIERS[best])) {
      setFlash(GACHA_TIERS[best] === 'mythique' ? 'mythic' : 'gold');
      timers.current.push(setTimeout(() => setFlash(null), 1200));
    }
  };

  return (
    <div className={`nk-reveal${flash ? ` is-flash-${flash}` : ''}`} role="dialog" aria-modal="true" aria-label="Ouverture des capsules">
      <div className="nk-reveal__box">
        <h2 className="nk-reveal__title">{allOpen ? 'Tes lots' : 'Ouverture des capsules…'}</h2>
        <div className={`nk-reveal__grid${results.length === 1 ? ' is-single' : ''}`}>
          {results.map((r, i) => {
            const info = GACHA_TIER_INFO[r.prize.tier];
            const isOpen = opened[i];
            const rank = GACHA_TIERS.indexOf(r.prize.tier);
            return (
              <button key={i} type="button" disabled={isOpen} onClick={() => open(i)}
                className={['nk-cap', `nk-cap--${r.prize.tier}`, isOpen && 'is-open', charging === i && 'is-charging'].filter(Boolean).join(' ')}
                style={{ ['--cap' as string]: info.color, animationDelay: `${i * 70}ms` } as CSSProperties}
                aria-label={isOpen ? `${info.label} : ${r.prize.name}` : 'Capsule fermée, toucher pour ouvrir'}>
                {rank >= 2 && isOpen && <span className="nk-cap__rays" aria-hidden />}
                <span className="nk-cap__shell" aria-hidden>
                  <span className="nk-cap__top" />
                  <span className="nk-cap__bottom" />
                  {!isOpen && <span className="nk-cap__q">?</span>}
                </span>
                {isOpen && isHighTier(r.prize.tier) && (
                  <span className="nk-confetti" aria-hidden>
                    {CONFETTI.map((c, k) => (
                      <i key={k} style={{ ['--dx' as string]: `${c.dx}px`, ['--dy' as string]: `${c.dy}px`, ['--rot' as string]: `${c.rot}deg`, background: c.color, animationDelay: `${c.delay}ms` } as CSSProperties} />
                    ))}
                  </span>
                )}
                {isOpen && (
                  <span className="nk-cap__prize">
                    <span className="nk-cap__tier">{info.label}{r.pity ? ' · garantie' : ''}</span>
                    <span className="nk-cap__icon">{r.prize.icon}</span>
                    <b>{r.prize.name}</b>
                    <span className="nk-cap__desc">{describeGachaPrize(r.prize)}</span>
                    {r.titleDuplicate && <span className="nk-cap__desc">Titre déjà obtenu : +{NAKIME_GACHA_TITLE_DUPLICATE_GEMS} gemmes.</span>}
                    {r.pulls.length > 0 && (
                      <span className="nk-cap__pulls">
                        {r.pulls.slice(0, 10).map((p, k) => {
                          const tpl = getCharacterById(p.templateId);
                          return tpl ? <CharacterCardThumb key={k} templateId={tpl.id} name={tpl.name} rarity={tpl.rarity} edition={p.edition} width={34} height={47} /> : null;
                        })}
                        {r.pulls.length > 10 && <span className="nk-cap__more">+{r.pulls.length - 10}</span>}
                      </span>
                    )}
                    {r.equipment.length > 0 && <span className="nk-loot__equip">{r.equipment.map(equipmentChip)}</span>}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="nk-reveal__actions">
          {!allOpen ? (
            <button className="btn-secondary nk-btn" onClick={revealAll}>Tout révéler ⏭</button>
          ) : (
            <>
              <button ref={closeRef} className="btn-secondary nk-btn" onClick={onClose}>Fermer</button>
              <button className="btn-primary nk-btn nk-gacha__btn" disabled={tickets < 1} onClick={() => onAgain(1)}>Encore 1 <span>🎟️ 1</span></button>
              <button className="btn-primary nk-btn nk-gacha__btn" disabled={tickets < 5} onClick={() => onAgain(5)}>Encore 5 <span>🎟️ 5</span></button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
