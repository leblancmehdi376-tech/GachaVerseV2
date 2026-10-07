'use client';
// Comparateur de cartes (bouton COMPARER du header) : le joueur choisit deux
// persos (édition + forme d'évolution) et un niveau, puis clique sur COMPARER.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { RARITY_CONFIG } from '@/types/game';
import { EDITION_CONFIG, EDITION_ORDER, type CardEdition } from '@/lib/game/editions';
import { compareCards, compareFormCount, COMPARE_MAX_LEVEL, COMPARE_POOL, type CompareCard, type CompareResult } from '@/lib/game/cardCompare';
import { getCharacterById, getCharFormName } from '@/lib/game/characters';
import { bnToNumber, type BigNum } from '@/lib/game/bignum';
import { formatNumber } from '@/lib/game/format';
import { useGameStore } from '@/store/gameStore';
import { EditionIcon } from '@/components/ui/EditionLogo';
import { RarityBadge } from '@/components/ui/RarityBadge';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';

const LEVEL_PRESETS = [100, 500, 1000, 2000];
const MAX_RESULTS = 40;

function cardName(c: CompareCard): string {
  const tpl = getCharacterById(c.templateId)!;
  const name = getCharFormName(tpl, c.form);
  return c.edition === 'base' ? name : `${name} ${EDITION_CONFIG[c.edition].label}`;
}

function formatRatio(r: BigNum): string {
  return r.exponent < 3 ? bnToNumber(r).toFixed(2).replace('.', ',') : formatNumber(r);
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function Chip({ active, color, onClick, children }: { active: boolean; color: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      style={{
        minHeight: 40, padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap',
        color: active ? '#0f0c20' : color,
        background: active ? color : `${color}14`,
        border: `1px solid ${active ? color : `${color}55`}`,
        boxShadow: active ? `0 0 10px ${color}66` : 'none',
        transition: 'all 0.12s',
      }}>
      {children}
    </button>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-muted)' }}>{children}</div>;
}

// Recherche d'un perso (nom ou univers), filtrable sur les cartes possédées.
function CharacterSearch({ onPick, onCancel }: { onPick: (templateId: string) => void; onCancel?: () => void }) {
  const collection = useGameStore(s => s.collection);
  const [query, setQuery] = useState('');
  const [ownedOnly, setOwnedOnly] = useState(false);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    return COMPARE_POOL.filter(c =>
      (!ownedOnly || collection[c.id]) &&
      (!q || normalize(c.name).includes(q) || normalize(c.universe ?? '').includes(q)));
  }, [query, ownedOnly, collection]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Nom ou univers…" aria-label="Rechercher un perso"
          style={{ flex: '1 1 160px', minWidth: 0, minHeight: 44, padding: '0 12px', borderRadius: 8, fontFamily: 'var(--f-ui)', fontSize: 16, color: 'var(--text)', background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border-lit)' }} />
        <Chip active={ownedOnly} color="#c084fc" onClick={() => setOwnedOnly(v => !v)}>Mes cartes</Chip>
        {onCancel && <Chip active={false} color="#9ca3af" onClick={onCancel}>Annuler</Chip>}
      </div>
      <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 2 }}>
        {results.slice(0, MAX_RESULTS).map(c => {
          const owned = collection[c.id];
          const color = RARITY_CONFIG[c.rarity].color;
          return (
            <button key={c.id} type="button" onClick={() => onPick(c.id)}
              style={{ flexShrink: 0, minHeight: 44, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}33` }}>
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 700, color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.name} {owned?.edition && owned.edition !== 'base' && <EditionIcon edition={owned.edition} size={14} />}
                </span>
                <span style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.universe}</span>
              </span>
              <RarityBadge rarity={c.rarity} size="xs" />
            </button>
          );
        })}
        {results.length === 0 && <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-muted)', padding: 8 }}>Aucun perso trouvé.</div>}
        {results.length > MAX_RESULTS && (
          <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-muted)', padding: 8 }}>
            +{results.length - MAX_RESULTS} autres : précise ta recherche.
          </div>
        )}
      </div>
    </div>
  );
}

function CardSlot({ title, card, onChange }: { title: string; card: CompareCard | null; onChange: (c: CompareCard) => void }) {
  const collection = useGameStore(s => s.collection);
  const [searching, setSearching] = useState(card === null);

  const pick = (templateId: string) => {
    const owned = collection[templateId];
    // Carte possédée : on part de son édition et de sa forme actuelles.
    onChange({ templateId, edition: owned?.edition ?? 'base', form: owned?.currentForm ?? 0 });
    setSearching(false);
  };

  const tpl = card ? getCharacterById(card.templateId) : undefined;
  const color = tpl ? RARITY_CONFIG[tpl.rarity].color : 'var(--border-lit)';
  const owned = card ? collection[card.templateId] : undefined;
  const formCount = tpl ? compareFormCount(tpl) : 1;

  return (
    <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10, borderRadius: 12, border: `1px solid ${tpl ? `${color}55` : 'var(--border)'}`, background: 'rgba(255,255,255,0.02)', padding: 12 }}>
      <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 700, letterSpacing: 1, color: 'var(--text-dim)' }}>{title}</div>

      {searching || !card || !tpl ? (
        <CharacterSearch onPick={pick} onCancel={card ? () => setSearching(false) : undefined} />
      ) : (<>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <CharacterCardThumb templateId={tpl.id} formIndex={card.form} name={tpl.name} rarity={tpl.rarity} edition={card.edition} width={72} height={99} />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontFamily: 'var(--f-ui)', fontSize: 16, fontWeight: 800, color, lineHeight: 1.25 }}>{getCharFormName(tpl, card.form)}</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <RarityBadge rarity={tpl.rarity} size="xs" />
              {owned && <span style={{ fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 700, color: '#4ade80' }}>✓ Possédée</span>}
            </div>
            <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-sub)' }}>DPS de base : <strong style={{ color: 'var(--text)' }}>{tpl.baseDps}</strong></div>
          </div>
          <button type="button" onClick={() => setSearching(true)}
            style={{ flexShrink: 0, minHeight: 44, padding: '0 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 700, color: 'var(--text-sub)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
            Changer
          </button>
        </div>

        <FieldLabel>Édition</FieldLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {EDITION_ORDER.map((e: CardEdition) => (
            <Chip key={e} active={card.edition === e} color={EDITION_CONFIG[e].color} onClick={() => onChange({ ...card, edition: e })}>
              <EditionIcon edition={e} size={15} />{EDITION_CONFIG[e].label}
            </Chip>
          ))}
        </div>

        {formCount > 1 && (<>
          <FieldLabel>Forme d&apos;évolution (DPS ×{card.form + 1})</FieldLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Array.from({ length: formCount }, (_, f) => (
              <Chip key={f} active={card.form === f} color="#c084fc" onClick={() => onChange({ ...card, form: f })}>
                {f === 0 ? 'Base' : `Évo ${f}`}
              </Chip>
            ))}
          </div>
        </>)}
      </>)}
    </div>
  );
}

function ResultBox({ a, b, level, result }: { a: CompareCard; b: CompareCard; level: number; result: CompareResult }) {
  const lvl = level.toLocaleString('fr-FR');
  if (result.winner === 'tie') {
    return (
      <div style={{ fontFamily: 'var(--f-ui)', fontSize: 16, fontWeight: 700, color: 'var(--text)', textAlign: 'center' }}>
        Égalité au niveau {lvl} : les deux cartes ont la même puissance.
      </div>
    );
  }
  const [win, lose] = result.winner === 'a' ? [a, b] : [b, a];
  const winColor = RARITY_CONFIG[getCharacterById(win.templateId)!.rarity].color;
  const loseColor = RARITY_CONFIG[getCharacterById(lose.templateId)!.rarity].color;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 700, letterSpacing: 1, color: 'var(--text-dim)' }}>AU NIVEAU {lvl}</div>
      <div style={{ fontFamily: 'var(--f-title)', fontSize: 20, fontWeight: 800, color: winColor, textShadow: `0 0 12px ${winColor}66` }}>
        🏆 {cardName(win)}
      </div>
      <div style={{ fontFamily: 'var(--f-ui)', fontSize: 16, color: 'var(--text)' }}>
        est <strong style={{ color: '#4ade80' }}>{formatRatio(result.ratio)}× plus fort</strong> que <span style={{ color: loseColor }}>{cardName(lose)}</span>
      </div>
      <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-sub)', lineHeight: 1.5 }}>
        {result.overtakeLevel
          ? <>Mais <strong style={{ color: loseColor }}>{cardName(lose)}</strong> grandit plus vite et passe devant à partir du <strong style={{ color: 'var(--text)' }}>niveau {result.overtakeLevel.toLocaleString('fr-FR')}</strong>.</>
          : <>Il reste devant à tous les niveaux supérieurs.</>}
      </div>
    </div>
  );
}

export function CardCompareModal({ onClose }: { onClose: () => void }) {
  const [a, setA] = useState<CompareCard | null>(null);
  const [b, setB] = useState<CompareCard | null>(null);
  const [levelInput, setLevelInput] = useState('500');
  const [shown, setShown] = useState<{ a: CompareCard; b: CompareCard; level: number; result: CompareResult } | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Sur mobile le résultat tombe sous le bouton : on le ramène à l'écran.
  useEffect(() => {
    if (shown) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [shown]);

  const level = Math.floor(Number(levelInput));
  const levelValid = Number.isFinite(level) && level >= 1 && level <= COMPARE_MAX_LEVEL;
  const canCompare = levelValid && !!a && !!b;

  const compare = () => {
    if (!a || !b || !levelValid) return;
    setShown({ a, b, level, result: compareCards(a, b, level) });
  };

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, background: 'rgba(3,2,8,0.88)' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: 'min(760px, 100%)', maxHeight: '92vh', overflowY: 'auto', borderRadius: 14, border: '1px solid var(--border-lit)', background: '#0f0c20', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', padding: '16px 16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ fontFamily: 'var(--f-title)', fontSize: 18, fontWeight: 800, letterSpacing: 2, color: 'var(--purple-glow)' }}>⚖️ COMPARATEUR</div>
          <button onClick={onClose} aria-label="Fermer" style={{ flexShrink: 0, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.5 }}>
          Choisis deux persos, leur édition et leur forme, puis un niveau : on te dit lequel est le plus fort (même niveau, sans équipement).
        </div>

        <div className="gv-compare-pickers" style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
          <CardSlot title="CARTE 1" card={a} onChange={setA} />
          <CardSlot title="CARTE 2" card={b} onChange={setB} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <label htmlFor="gv-compare-level" style={{ fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 700, color: 'var(--text-sub)' }}>Niveau</label>
          <input id="gv-compare-level" type="number" inputMode="numeric" min={1} max={COMPARE_MAX_LEVEL} value={levelInput}
            onChange={e => setLevelInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') compare(); }}
            style={{ width: 110, minHeight: 44, padding: '0 12px', borderRadius: 8, fontFamily: 'var(--f-num)', fontSize: 16, fontWeight: 700, color: 'var(--text)', background: 'rgba(0,0,0,0.35)', border: `1px solid ${levelValid ? 'var(--border-lit)' : '#ef4444'}` }} />
          {LEVEL_PRESETS.map(p => (
            <button key={p} type="button" onClick={() => setLevelInput(String(p))}
              style={{ minHeight: 44, padding: '0 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--f-num)', fontSize: 14, fontWeight: 700, color: level === p ? 'var(--text)' : 'var(--text-dim)', background: level === p ? 'rgba(168,85,247,0.25)' : 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
              {p}
            </button>
          ))}
        </div>
        {!levelValid && (
          <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: '#f87171' }}>Entre un niveau entre 1 et {COMPARE_MAX_LEVEL.toLocaleString('fr-FR')}.</div>
        )}

        <button type="button" onClick={compare} disabled={!canCompare}
          style={{ minHeight: 48, borderRadius: 10, cursor: canCompare ? 'pointer' : 'not-allowed', fontFamily: 'var(--f-title)', fontSize: 16, fontWeight: 800, letterSpacing: 2, color: canCompare ? 'white' : 'var(--text-muted)', background: canCompare ? 'linear-gradient(135deg,#6d28d9,#a855f7)' : 'rgba(255,255,255,0.08)', border: `1px solid ${canCompare ? '#c084fc' : 'var(--border)'}`, boxShadow: canCompare ? '0 0 16px rgba(168,85,247,0.4)' : 'none' }}>
          {a && b ? 'COMPARER' : 'CHOISIS DEUX CARTES'}
        </button>

        {shown && (
          <div ref={resultRef} style={{ borderRadius: 12, border: '1px solid var(--border-glow)', background: 'linear-gradient(160deg,#150a28,#1e0e38)', padding: '14px 12px' }}>
            <ResultBox {...shown} />
          </div>
        )}
      </div>
      <style>{`@media (max-width: 640px) { .gv-compare-pickers { flex-direction: column; } }`}</style>
    </div>
  );
}
