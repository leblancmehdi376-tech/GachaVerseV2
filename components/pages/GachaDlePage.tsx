'use client';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { PageScroll } from '@/components/ui/Page';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';
import { UniverseIcon } from '@/components/ui/CollectionFilters';
import { getCharacterById } from '@/lib/game/characters';
import { AFFINITY_CONFIG, getAffinityForId } from '@/lib/game/affinities';
import { RARITY_CONFIG, CharacterTemplate } from '@/types/game';
import { getCardFormCount } from '@/lib/game/cardAssets';
import { GENDER_CONFIG, getCharacterGender } from '@/lib/game/characterGenders';
import {
  compareGuess, getDailyTarget, getDleDailyReward, getDleDateKey, getDleQuestProgress, getRandomTarget, suggestCharacters,
  DLE_POOL, DLE_QUESTS, type DleOrderMatch,
} from '@/lib/game/gachadle';
import { useGameStore } from '@/store/gameStore';
import { getDleStats, selectDleCurrentStreak } from '@/store/slices/gachaDleSlice';
import { Countdown } from '@/components/pages/QuestsPage';

type Mode = 'daily' | 'free';
const NO_GUESSES: string[] = [];

// Partie libre en cours, mémorisée en local uniquement (pas dans la sauvegarde
// cloud) pour la retrouver en revenant sur la page.
const FREE_GAME_STORAGE_KEY = 'gv_gachadle_free';
interface SavedFreeGame { mode: Mode; target: CharacterTemplate; guesses: string[] }
function loadFreeGame(): SavedFreeGame {
  try {
    const raw = localStorage.getItem(FREE_GAME_STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as { mode?: Mode; targetId?: string; guesses?: string[] };
      const target = DLE_POOL.find(c => c.id === saved.targetId);
      if (target) {
        const guesses = Array.isArray(saved.guesses) ? saved.guesses.filter(id => getCharacterById(id)) : [];
        return { mode: saved.mode === 'free' ? 'free' : 'daily', target, guesses };
      }
    }
  } catch {}
  return { mode: 'daily', target: getRandomTarget(), guesses: [] };
}

const OK  = { color: '#4ade80', bg: 'rgba(22,163,74,0.22)',  border: 'rgba(74,222,128,0.55)' };
const CLOSE = { color: '#fb923c', bg: 'rgba(234,88,12,0.22)', border: 'rgba(251,146,60,0.55)' };
const BAD = { color: '#f87171', bg: 'rgba(220,38,38,0.18)',  border: 'rgba(248,113,113,0.5)' };
type CellState = 'correct' | 'close' | 'wrong';
const CELL_COLORS: Record<CellState, typeof OK> = { correct: OK, close: CLOSE, wrong: BAD };
const GRID = 'minmax(150px,1.5fr) minmax(84px,0.8fr) minmax(96px,1fr) minmax(96px,1fr) minmax(130px,1.3fr) minmax(80px,0.8fr)';

// ─── Briques ──────────────────────────────────────────────────────────────

function Cell({ state, delay, children }: { state: CellState; delay: number; children: ReactNode }) {
  const c = CELL_COLORS[state];
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
      minHeight: 64, padding: '6px 8px', borderRadius: 8, textAlign: 'center',
      background: c.bg, border: `1px solid ${c.border}`, boxShadow: `inset 0 0 14px ${c.border}33`,
      fontFamily: 'var(--f-ui)', fontWeight: 800, fontSize: 14.4, color: 'var(--text)', lineHeight: 1.2,
      animation: `dleFlip 0.45s ${delay}s both`,
    }}>
      {children}
    </div>
  );
}

/** Case d'une valeur ordonnée : ▲/▼ indique si le mystère a une valeur plus haute ou plus basse. */
function OrderCell({ match, delay, higherHint, lowerHint, children }: {
  match: DleOrderMatch; delay: number; higherHint: string; lowerHint: string; children: ReactNode;
}) {
  return (
    <Cell state={match === 'correct' ? 'correct' : 'wrong'} delay={delay}>
      {children}
      {match !== 'correct' && (
        <span title={match === 'higher' ? higherHint : lowerHint} style={{ fontSize: 18, color: 'var(--text)' }}>
          {match === 'higher' ? '▲' : '▼'}
        </span>
      )}
    </Cell>
  );
}

function GuessRow({ tpl, target, animate }: { tpl: CharacterTemplate; target: CharacterTemplate; animate: boolean }) {
  const cmp = compareGuess(tpl, target);
  const aff = AFFINITY_CONFIG[getAffinityForId(tpl.id)];
  const rarity = RARITY_CONFIG[tpl.rarity];
  const forms = getCardFormCount(tpl);
  const gender = GENDER_CONFIG[getCharacterGender(tpl.id)];
  // Seule la dernière proposition se révèle case par case ; les anciennes s'affichent directement.
  const d = (i: number) => (animate ? i * 0.18 : 0);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 6 }}>
      <Cell state={cmp.name} delay={d(0)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
          <CharacterCardThumb templateId={tpl.id} name={tpl.name} rarity={tpl.rarity} width={40} height={54} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, textAlign: 'left' }}>{tpl.name}</span>
        </div>
      </Cell>
      <Cell state={cmp.gender} delay={d(1)}>
        <span style={{ fontSize: 20, lineHeight: 1, color: gender.color }}>{gender.icon}</span>
        <span style={{ color: gender.color }}>{gender.label.toUpperCase()}</span>
      </Cell>
      <OrderCell match={cmp.rarity} delay={d(2)} higherHint="Le personnage mystère est plus rare" lowerHint="Le personnage mystère est moins rare">
        <span style={{ color: rarity.color, textShadow: `0 0 8px ${rarity.glow}88`, letterSpacing: 0.5 }}>{rarity.label.toUpperCase()}</span>
      </OrderCell>
      <Cell state={cmp.affinity} delay={d(3)}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>{aff.icon}</span>
        <span style={{ color: aff.color }}>{aff.label.toUpperCase()}</span>
      </Cell>
      <Cell state={cmp.universe} delay={d(4)}>
        <UniverseIcon universe={tpl.universe ?? ''} size={20} />
        <span>{tpl.universe ?? '—'}</span>
      </Cell>
      <OrderCell match={cmp.forms} delay={d(5)} higherHint="Le personnage mystère a plus de formes" lowerHint="Le personnage mystère a moins de formes">
        <span style={{ fontFamily: 'var(--f-num)', fontSize: 18 }}>{forms}</span>
      </OrderCell>
    </div>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={active ? 'btn-primary' : 'btn-secondary'}
      style={{ padding: '8px 14px', fontSize: 14.4, whiteSpace: 'nowrap' }}>
      {children}
    </button>
  );
}

function DleQuestsPanel() {
  const stats = useGameStore(useShallow(getDleStats));
  const claimed = useGameStore(s => s.dleQuestsClaimed);
  const claimDleQuest = useGameStore(s => s.claimDleQuest);
  const rows = DLE_QUESTS.map((q, i) => ({ q, i, p: getDleQuestProgress(q, stats), isClaimed: claimed.includes(q.id) }));
  // Réclamables d'abord, puis en cours, puis déjà reçues.
  const rank = (r: typeof rows[number]) => (r.isClaimed ? 2 : r.p.done ? 0 : 1);
  const sorted = [...rows].sort((a, b) => rank(a) - rank(b) || a.i - b.i);
  const doneCount = rows.filter(r => r.p.done).length;

  return (
    <div className="panel" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontFamily: 'var(--f-title)', fontSize: 17, fontWeight: 700, color: '#38bdf8', letterSpacing: 2 }}>📜 QUÊTES GACHADLE</span>
        <span style={{ fontFamily: 'var(--f-num)', fontSize: 14.4, color: 'var(--text-dim)' }}>{doneCount} / {DLE_QUESTS.length}</span>
      </div>
      <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        Seuls les défis du jour comptent pour les quêtes : les parties libres ne font pas progresser.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.map(({ q, p, isClaimed }) => {
          const ready = p.done && !isClaimed;
          return (
            <div key={q.id} style={{
              display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px 12px', padding: '8px 12px', borderRadius: 8,
              background: ready ? 'rgba(56,189,248,0.10)' : 'var(--bg-deep)',
              border: `1px solid ${ready ? 'rgba(56,189,248,0.5)' : 'var(--border)'}`,
              opacity: isClaimed ? 0.55 : 1,
            }}>
              {/* flex-basis 200px : sur téléphone, le bloc de droite passe sous le libellé plutôt que de l'écraser */}
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{q.label}</div>
                {p.target > 1 && (
                  <div style={{ marginTop: 5, height: 5, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ width: `${(p.current / p.target) * 100}%`, height: '100%', background: p.done ? OK.color : '#38bdf8' }} />
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
                {p.target > 1 && (
                  <span style={{ fontFamily: 'var(--f-num)', fontSize: 14, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{p.current}/{p.target}</span>
                )}
                <span style={{ fontFamily: 'var(--f-num)', fontSize: 14.4, color: '#38bdf8', whiteSpace: 'nowrap', minWidth: 60, textAlign: 'right' }}>+{q.gems} 💎</span>
                {isClaimed ? (
                  <span style={{ fontFamily: 'var(--f-ui)', fontWeight: 800, fontSize: 14, color: OK.color, minWidth: 64, textAlign: 'center' }}>✓ REÇU</span>
                ) : (
                  <button type="button" className={ready ? 'btn-primary' : 'btn-secondary'} disabled={!ready}
                    onClick={() => claimDleQuest(q.id)} style={{ padding: '6px 10px', fontSize: 14, minWidth: 64 }}>
                    RÉCUP
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export function GachaDlePage() {
  // Suit le reset de 2h même si la page reste ouverte : sans ça, un essai
  // envoyé après le reset compterait encore pour le défi de la veille.
  const [dateKey, setDateKey] = useState(getDleDateKey);
  useEffect(() => {
    const id = setInterval(() => setDateKey(getDleDateKey()), 30_000);
    return () => clearInterval(id);
  }, []);
  const dailyTarget = useMemo(() => getDailyTarget(dateKey), [dateKey]);

  const [initialFree] = useState(loadFreeGame);
  const [mode, setMode] = useState<Mode>(initialFree.mode);
  // Essais du défi du jour : dans le store (sauvegarde cloud), ignorés s'ils datent d'un autre jour.
  const storedDaily = useGameStore(s => s.dleDailyGuesses);
  const storedDailyDate = useGameStore(s => s.dleDailyDate);
  const dailyGuesses = storedDailyDate === dateKey ? storedDaily : NO_GUESSES;
  const submitDleDailyGuess = useGameStore(s => s.submitDleDailyGuess);
  const streak = useGameStore(s => selectDleCurrentStreak(s, dateKey));
  const [freeTarget, setFreeTarget] = useState<CharacterTemplate>(initialFree.target);
  const [freeGuesses, setFreeGuesses] = useState<string[]>(initialFree.guesses);
  useEffect(() => {
    try {
      localStorage.setItem(FREE_GAME_STORAGE_KEY, JSON.stringify({ mode, targetId: freeTarget.id, guesses: freeGuesses }));
    } catch {}
  }, [mode, freeTarget, freeGuesses]);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [open, setOpen] = useState(false);
  const [lastGuessId, setLastGuessId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const target  = mode === 'daily' ? dailyTarget : freeTarget;
  const guesses = mode === 'daily' ? dailyGuesses : freeGuesses;
  const won = guesses.includes(target.id);
  const dailyWon = dailyGuesses.includes(dailyTarget.id);
  const guessedIds = useMemo(() => new Set(guesses), [guesses]);
  const suggestions = useMemo(() => suggestCharacters(query, guessedIds), [query, guessedIds]);

  const submit = (tpl: CharacterTemplate) => {
    if (won || guessedIds.has(tpl.id)) return;
    const next = [...guesses, tpl.id];
    if (mode === 'daily') submitDleDailyGuess(dateKey, tpl.id);
    else setFreeGuesses(next);
    setLastGuessId(tpl.id);
    setQuery('');
    setHighlight(0);
    setOpen(false);
    inputRef.current?.focus();
  };

  const newFreeGame = () => {
    setFreeTarget(getRandomTarget(freeTarget.id));
    setFreeGuesses([]);
    setLastGuessId(null);
    setMode('free');
    setQuery('');
  };

  const switchMode = (m: Mode) => { setMode(m); setLastGuessId(null); setQuery(''); };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHighlight(h => Math.min(h + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { const s = suggestions[highlight]; if (s) { e.preventDefault(); submit(s); } }
    else if (e.key === 'Escape') setOpen(false);
  };

  const headCell: CSSProperties = { fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 800, letterSpacing: 1.5, color: 'var(--text-muted)', textAlign: 'center', paddingBottom: 4, borderBottom: '1px solid var(--border-lit)' };
  const aff = AFFINITY_CONFIG[getAffinityForId(target.id)];

  return (
    <PageScroll>
      <style>{`@keyframes dleFlip { from { opacity: 0; transform: perspective(400px) rotateX(-90deg); } to { opacity: 1; transform: none; } }`}</style>
      <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* En-tête */}
        <div className="panel panel--glow" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 4, height: 20, background: 'linear-gradient(180deg,#38bdf8,#0369a1)', borderRadius: 2, boxShadow: '0 0 8px #38bdf8' }} />
              <span style={{ fontFamily: 'var(--f-title)', fontSize: 20.5, fontWeight: 700, color: '#38bdf8', letterSpacing: '3px' }}>❓ GACHADLE</span>
            </div>
            <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14.4, color: 'var(--text-dim)', maxWidth: 480, lineHeight: 1.6 }}>
              Devine le personnage mystère ! Chaque proposition révèle si son <b>genre</b>, sa <b>rareté</b>, son <b>type</b>, son <b>univers</b> et son <b>nombre de formes</b> correspondent. ▲/▼ : le mystère a une valeur plus haute ou plus basse. Type en <b style={{ color: CLOSE.color }}>orange</b> : voisin dans le cycle des types.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <ModeButton active={mode === 'daily'} onClick={() => switchMode('daily')}>📅 DÉFI DU JOUR</ModeButton>
              <ModeButton active={mode === 'free'} onClick={() => switchMode('free')}>🎲 PARTIE LIBRE</ModeButton>
            </div>
            <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14, color: 'var(--text-dim)', textAlign: 'right' }}>
              🔥 Série : <b style={{ color: streak > 0 ? CLOSE.color : 'var(--text-dim)' }}>{streak}</b>
              {' · '}Défi du jour : <b style={{ color: dailyWon ? OK.color : '#38bdf8' }}>{dailyWon ? 'réussi ✓' : `+${getDleDailyReward(streak + 1)} 💎`}</b>
            </div>
          </div>
        </div>

        {/* Victoire */}
        {won && (
          <div className="panel panel--gold" style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', animation: 'fadeIn 0.5s 0.8s both' }}>
            <CharacterCardThumb templateId={target.id} name={target.name} rarity={target.rarity} width={72} height={98} />
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontFamily: 'var(--f-title)', fontSize: 18.5, fontWeight: 700, color: 'var(--gold-hi)', letterSpacing: 2 }}>🎉 BIEN JOUÉ !</div>
              <div style={{ fontFamily: 'var(--f-ui)', fontSize: 15.4, color: 'var(--text-sub)', marginTop: 4, lineHeight: 1.5 }}>
                C&apos;était <b style={{ color: RARITY_CONFIG[target.rarity].color }}>{target.name}</b> ({target.universe}, {aff.icon} {aff.label}),
                trouvé en <b>{guesses.length}</b> essai{guesses.length > 1 ? 's' : ''}.
              </div>
              {mode === 'daily' && (
                <div style={{ fontFamily: 'var(--f-ui)', fontSize: 14.4, color: 'var(--text-dim)', marginTop: 4 }}>
                  🔥 Série de <b style={{ color: CLOSE.color }}>{streak}</b> jour{streak > 1 ? 's' : ''}. Reviens dans <Countdown type="daily" /> pour un nouveau personnage mystère, en même temps que les quêtes journalières.
                </div>
              )}
            </div>
            <button type="button" className="btn-primary" onClick={newFreeGame} style={{ padding: '10px 16px', fontSize: 14.4 }}>
              {mode === 'daily' ? '🎲 JOUER EN LIBRE' : '🔄 NOUVELLE PARTIE'}
            </button>
          </div>
        )}

        {/* Saisie + propositions */}
        {!won && (
          <div style={{ position: 'relative' }}>
            <div className="panel" style={{ padding: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setHighlight(0); setOpen(true); }}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                onKeyDown={onKeyDown}
                placeholder="Tape le nom d'un personnage…"
                aria-label="Nom du personnage"
                autoComplete="off"
                style={{
                  flex: 1, minWidth: 0, padding: '11px 14px', borderRadius: 8,
                  background: 'var(--bg-deep)', border: '1px solid var(--border-lit)', outline: 'none',
                  fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 16.4, color: 'var(--text)',
                }}
              />
              <span style={{ fontFamily: 'var(--f-num)', fontSize: 14.4, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                {guesses.length} essai{guesses.length > 1 ? 's' : ''}
              </span>
            </div>

            {open && query.trim() && (
              <div role="listbox" style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 20,
                maxHeight: 360, overflowY: 'auto', borderRadius: 10,
                background: 'var(--bg-panel)', border: '1px solid var(--border-glow)', boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                animation: 'cfPop 0.12s both',
              }}>
                {suggestions.length === 0 ? (
                  <div style={{ padding: '12px 14px', fontFamily: 'var(--f-ui)', fontSize: 14.4, color: 'var(--text-dim)' }}>Aucun personnage trouvé.</div>
                ) : suggestions.map((s, i) => (
                  <div key={s.id} role="option" aria-selected={i === highlight}
                    // mousedown (et pas click) : se déclenche avant le blur de l'input qui fermerait la liste.
                    onMouseDown={e => { e.preventDefault(); submit(s); }}
                    onMouseEnter={() => setHighlight(i)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', cursor: 'pointer',
                      background: i === highlight ? 'var(--bg-hover)' : 'transparent',
                      borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                    <CharacterCardThumb templateId={s.id} name={s.name} rarity={s.rarity} width={32} height={44} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 15.4, color: 'var(--text)' }}>{s.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Propositions — la plus récente en haut */}
        {guesses.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 680, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 6 }}>
                <div style={headCell}>PERSONNAGE</div>
                <div style={headCell}>GENRE</div>
                <div style={headCell}>RARETÉ</div>
                <div style={headCell}>TYPE</div>
                <div style={headCell}>UNIVERS</div>
                <div style={headCell}>FORMES</div>
              </div>
              {[...guesses].reverse().map(id => {
                const tpl = getCharacterById(id);
                return tpl ? <GuessRow key={id} tpl={tpl} target={target} animate={id === lastGuessId} /> : null;
              })}
            </div>
          </div>
        )}

        {guesses.length === 0 && (
          <div style={{ textAlign: 'center', fontFamily: 'var(--f-ui)', fontSize: 14.4, color: 'var(--text-muted)', padding: '12px 0' }}>
            {DLE_POOL.length} personnages possibles. À toi de jouer !
          </div>
        )}

        <DleQuestsPanel />
      </div>
    </PageScroll>
  );
}
