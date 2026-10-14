'use client';
import { Fragment, useMemo, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { getCharacterById, getCharFormName } from '@/lib/game/characters';
import { parseInstanceKey, editionTier, EDITION_CONFIG } from '@/lib/game/editions';
import { computeSynergyProgress } from '@/lib/game/synergies';
import {
  NAKIME_TEAM_SIZE, NAKIME_ROLES, ROLE_INFO, NAKIME_META_STAT_PCT, nakimeSynergyAtkPct, editionStatMult, memberStats, teamPower, getNakimeRole, rarityIdx,
  type NakimeRole,
} from '@/lib/game/nakime';
import { RARITY_CONFIG, RARITY_ORDER_ASC, type CharacterTemplate, type OwnedCharacter, type Rarity } from '@/types/game';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';
import { formatNumber } from '@/lib/game/format';
import { RoleTag, TypeTag, fmtEntries } from './NakimeBits';

// Dernière équipe composée, mémorisée sur cet appareil.
const TEAM_KEY = 'gv_nakime_team';
function loadTeam(collection: Record<string, OwnedCharacter>): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(TEAM_KEY) ?? '[]');
    if (Array.isArray(raw)) return raw.filter((k): k is string => typeof k === 'string' && !!collection[k]).slice(0, NAKIME_TEAM_SIZE);
  } catch { /* stockage indisponible */ }
  return [];
}

const PAGE = 60;

type SortMode = 'rarity' | 'universe' | 'name';
const SORT_KEY = 'gv_nakime_sort';
function loadSort(): SortMode {
  try {
    const v = localStorage.getItem(SORT_KEY);
    if (v === 'rarity' || v === 'universe' || v === 'name') return v;
  } catch { /* stockage indisponible */ }
  return 'rarity';
}
const uni = (e: { tpl: CharacterTemplate }) => e.tpl.universe ?? 'Autres';

interface Entry { key: string; tpl: CharacterTemplate; owned: OwnedCharacter; role: NakimeRole }

export function NakimeTeamBuilder({ entriesLeft, entriesMax }: { entriesLeft: number; entriesMax: number }) {
  const collection = useGameStore(s => s.collection);
  const meta = useGameStore(s => s.nakimeMeta);
  const [team, setTeam] = useState<string[]>(() => loadTeam(collection));
  const [focus, setFocus] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [rarity, setRarity] = useState<Rarity | null>(null);
  const [role, setRole] = useState<NakimeRole | null>(null);
  const [universe, setUniverse] = useState<string>('');
  const [sort, setSort] = useState<SortMode>(loadSort);
  const [limit, setLimit] = useState(PAGE);
  const [error, setError] = useState<string | null>(null);

  const entries = useMemo<Entry[]>(() => Object.entries(collection)
    .map(([key, owned]) => {
      const tpl = getCharacterById(parseInstanceKey(key).templateId);
      return tpl && !tpl.isHero ? { key, owned, tpl, role: getNakimeRole(tpl.id) } : null;
    })
    .filter((e): e is Entry => !!e)
    .sort((a, b) => rarityIdx(b.tpl.rarity) - rarityIdx(a.tpl.rarity) || a.tpl.name.localeCompare(b.tpl.name)),
  [collection]);
  const byKey = useMemo(() => new Map(entries.map(e => [e.key, e])), [entries]);
  const rarities = useMemo(() => RARITY_ORDER_ASC.filter(r => entries.some(e => e.tpl.rarity === r)).reverse(), [entries]);
  // Univers présents dans la collection (avec le nombre de cartes), triés par nom.
  const universes = useMemo(() => {
    const count = new Map<string, number>();
    for (const e of entries) count.set(uni(e), (count.get(uni(e)) ?? 0) + 1);
    return [...count].sort((a, b) => a[0].localeCompare(b[0], 'fr'));
  }, [entries]);

  const q = query.trim().toLowerCase();
  const filtered = entries.filter(e => (!rarity || e.tpl.rarity === rarity) && (!role || e.role === role) && (!universe || uni(e) === universe)
    && (!q || e.tpl.name.toLowerCase().includes(q) || uni(e).toLowerCase().includes(q)));
  if (sort === 'universe') filtered.sort((a, b) => uni(a).localeCompare(uni(b), 'fr') || rarityIdx(b.tpl.rarity) - rarityIdx(a.tpl.rarity) || a.tpl.name.localeCompare(b.tpl.name));
  else if (sort === 'name') filtered.sort((a, b) => a.tpl.name.localeCompare(b.tpl.name, 'fr'));
  const changeSort = (m: SortMode) => {
    setSort(m);
    try { localStorage.setItem(SORT_KEY, m); } catch { /* stockage indisponible */ }
  };
  const teamTids = new Set(team.map(k => parseInstanceKey(k).templateId));
  const synergies = useMemo(() => computeSynergyProgress(team), [team]);
  const synPct = useMemo(() => nakimeSynergyAtkPct(team), [team]);
  const bonus = { atkPct: 0, hpPct: 0, energy: 0, metaAtkPct: (meta?.team_atk ?? 0) * NAKIME_META_STAT_PCT, metaHpPct: (meta?.team_hp ?? 0) * NAKIME_META_STAT_PCT };
  const power = teamPower(team, bonus, Object.fromEntries(team.map(k => [k, collection[k]?.edition])));
  const roles = new Set(team.map(k => byKey.get(k)?.role));

  const save = (next: string[]) => {
    setTeam(next);
    setError(null);
    try { localStorage.setItem(TEAM_KEY, JSON.stringify(next)); } catch { /* stockage indisponible */ }
  };
  const toggle = (key: string) => {
    if (team.includes(key)) { setFocus(null); return save(team.filter(k => k !== key)); }
    if (team.length >= NAKIME_TEAM_SIZE || teamTids.has(parseInstanceKey(key).templateId)) return;
    save([...team, key]);
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= team.length) return;
    const next = [...team];
    [next[from], next[to]] = [next[to], next[from]];
    save(next);
    setFocus(to);
  };
  // Remplit les places libres avec les meilleures raretés, en variant les rôles.
  const autoFill = () => {
    const next = [...team];
    const tids = new Set(next.map(k => parseInstanceKey(k).templateId));
    const used = new Set(next.map(k => byKey.get(k)?.role));
    for (const pass of [0, 1]) {
      for (const e of entries) {
        if (next.length >= NAKIME_TEAM_SIZE) break;
        if (tids.has(e.tpl.id) || (pass === 0 && used.has(e.role))) continue;
        next.push(e.key);
        tids.add(e.tpl.id);
        used.add(e.role);
      }
    }
    // Gardiens devant, soigneurs derrière.
    const order: Record<NakimeRole, number> = { gardien: 0, assaillant: 1, assassin: 2, mage: 3, soigneur: 4 };
    next.sort((a, b) => order[byKey.get(a)!.role] - order[byKey.get(b)!.role]);
    save(next);
  };
  const start = () => setError(useGameStore.getState().startNakimeRun(team));

  return (
    <section className="panel nk-builder">
      <div className="nk-builder__head">
        <h2>Ton équipe</h2>
        <span className="chip">Puissance <b style={{ color: 'var(--gold-hi)' }}>{formatNumber(power)}</b></span>
      </div>
      <p className="nk-muted">Les places 1 et 2 forment le <b>front</b> : elles sont visées deux fois plus souvent. Touche une carte de l&apos;équipe pour la déplacer ou la retirer.</p>

      <div className="nk-slots">
        {Array.from({ length: NAKIME_TEAM_SIZE }, (_, i) => {
          const key = team[i];
          const e = key ? byKey.get(key) : undefined;
          const pos = i < 2 ? 'Front' : 'Arrière';
          if (!e) return <div key={i} className="nk-slot nk-slot--empty"><span className="nk-slot__pos">{pos}</span>Place {i + 1}</div>;
          const st = memberStats({ templateId: e.tpl.id, level: 1, weapon: 0, armor: 0, edition: e.owned.edition }, [], synPct[key] ?? 0, bonus);
          return (
            <button key={key} className={`nk-slot${focus === i ? ' is-focus' : ''}`} onClick={() => setFocus(focus === i ? null : i)}
              aria-label={`${e.tpl.name}, place ${i + 1}`} style={{ ['--rar' as string]: RARITY_CONFIG[e.tpl.rarity].color }}>
              <span className="nk-slot__pos">{pos}</span>
              <CharacterCardThumb templateId={e.tpl.id} formIndex={e.owned.currentForm} name={getCharFormName(e.tpl, e.owned.currentForm)}
                rarity={e.tpl.rarity} edition={e.owned.edition} width={72} height={99} />
              <span className="nk-slot__name">{e.tpl.name}</span>
              <span className="nk-slot__tags"><RoleTag role={e.role} short /><TypeTag affinity={st.affinity} short /></span>
              <span className="nk-slot__stats">❤️ {formatNumber(st.maxHp)} · ⚔️ {formatNumber(st.atk)}</span>
              {editionTier(e.owned.edition) > 0 && (
                <span className="nk-tag nk-edition-tag" style={{ color: EDITION_CONFIG[e.owned.edition!].color }}>
                  {EDITION_CONFIG[e.owned.edition!].icon} +{Math.round((editionStatMult(e.owned.edition) - 1) * 100)} %
                </span>
              )}
            </button>
          );
        })}
      </div>

      {focus !== null && team[focus] && (
        <div className="nk-slot-tools">
          <div className="nk-slot-tools__info">
            <b>{byKey.get(team[focus])?.tpl.name}</b> · {ROLE_INFO[byKey.get(team[focus])!.role].icon} {ROLE_INFO[byKey.get(team[focus])!.role].label} — {ROLE_INFO[byKey.get(team[focus])!.role].text}
          </div>
          <div className="nk-slot-tools__btns">
            <button className="btn-secondary nk-btn" disabled={focus === 0} onClick={() => move(focus, focus - 1)}>◀ Avancer</button>
            <button className="btn-secondary nk-btn" disabled={focus === team.length - 1} onClick={() => move(focus, focus + 1)}>Reculer ▶</button>
            <button className="btn-secondary nk-btn" onClick={() => toggle(team[focus])}>Retirer</button>
          </div>
        </div>
      )}

      <div className="nk-synergies">
        {synergies.map(s => (
          <button key={s.def.id} type="button" className="chip nk-syn-chip" title="Afficher les cartes de cet univers"
            onClick={() => { setUniverse(s.def.universe); setLimit(PAGE); }}
            style={{ color: s.active ? s.def.color : 'var(--text-dim)', borderColor: s.active ? `${s.def.color}88` : undefined }}>
            {s.def.icon} {s.def.label} {s.count}/{s.thresholds[s.thresholds.length - 1].count}
            {s.active && <> · +{s.active.dpsBonus}% ATQ{s.active.globalBonus > 0 ? ` (+${s.active.globalBonus}% équipe)` : ''}</>}
          </button>
        ))}
        {team.length > 0 && !roles.has('soigneur') && <span className="chip nk-hint">💡 Aucun soigneur : les PV ne remonteront qu&apos;aux repos.</span>}
        {team.length > 0 && !roles.has('gardien') && <span className="chip nk-hint">💡 Aucun gardien : ton front encaissera tout.</span>}
      </div>

      <div className="nk-builder__actions">
        <button className="btn-primary nk-btn" disabled={team.length !== NAKIME_TEAM_SIZE || entriesLeft <= 0} onClick={start}>
          {entriesLeft > 0 ? `ENTRER DANS LE CHÂTEAU (${fmtEntries(entriesLeft)}/${fmtEntries(entriesMax)})` : 'PLUS D\'ENTRÉE AUJOURD\'HUI'}
        </button>
        <button className="btn-secondary nk-btn" onClick={autoFill} disabled={team.length >= NAKIME_TEAM_SIZE}>Compléter auto</button>
        {team.length > 0 && <button className="btn-secondary nk-btn" onClick={() => { save([]); setFocus(null); }}>Vider</button>}
      </div>
      {error && <p className="nk-error">{error}</p>}

      <div className="nk-picker__head">
        <h3>Ta collection</h3>
        <input className="nk-search" type="search" placeholder="Nom ou univers…" value={query}
          onChange={e => { setQuery(e.target.value); setLimit(PAGE); }} />
      </div>
      <div className="nk-selects">
        <label className="nk-select">
          <span>Univers</span>
          <select value={universe} onChange={e => { setUniverse(e.target.value); setLimit(PAGE); }}>
            <option value="">Tous les univers ({entries.length})</option>
            {universes.map(([u, n]) => <option key={u} value={u}>{u} ({n})</option>)}
          </select>
        </label>
        <label className="nk-select">
          <span>Trier par</span>
          <select value={sort} onChange={e => changeSort(e.target.value as SortMode)}>
            <option value="rarity">Rareté</option>
            <option value="universe">Univers</option>
            <option value="name">Nom</option>
          </select>
        </label>
        {universe && <button className="btn-secondary nk-btn" onClick={() => setUniverse('')}>✕ {universe}</button>}
      </div>
      <div className="nk-filters">
        <button className={`nk-filter${!rarity ? ' is-on' : ''}`} onClick={() => setRarity(null)}>Toutes</button>
        {rarities.map(r => (
          <button key={r} className={`nk-filter${rarity === r ? ' is-on' : ''}`} style={{ ['--rar' as string]: RARITY_CONFIG[r].color }}
            onClick={() => { setRarity(rarity === r ? null : r); setLimit(PAGE); }}>{RARITY_CONFIG[r].label}</button>
        ))}
      </div>
      <div className="nk-filters">
        <button className={`nk-filter${!role ? ' is-on' : ''}`} onClick={() => setRole(null)}>Tous les rôles</button>
        {NAKIME_ROLES.map(r => (
          <button key={r} className={`nk-filter${role === r ? ' is-on' : ''}`} style={{ ['--rar' as string]: ROLE_INFO[r].color }}
            onClick={() => { setRole(role === r ? null : r); setLimit(PAGE); }}>{ROLE_INFO[r].icon} {ROLE_INFO[r].label}</button>
        ))}
      </div>
      {role && <p className="nk-muted">{ROLE_INFO[role].icon} <b>{ROLE_INFO[role].label}</b> : {ROLE_INFO[role].text}</p>}

      {filtered.length === 0 ? (
        <p className="nk-muted">Aucune carte trouvée.</p>
      ) : (
        <div className="nk-picker">
          {filtered.slice(0, limit).map((e, i, list) => {
            const header = sort === 'universe' && (i === 0 || uni(list[i - 1]) !== uni(e))
              ? <h4 key={`h-${uni(e)}`} className="nk-group">{uni(e)}</h4> : null;
            const selected = team.includes(e.key);
            const blocked = !selected && (team.length >= NAKIME_TEAM_SIZE || teamTids.has(e.tpl.id));
            return (
              <Fragment key={e.key}>
              {header}
              <button className={`nk-pick${selected ? ' is-selected' : ''}`} disabled={blocked} onClick={() => toggle(e.key)}
                style={{ ['--rar' as string]: RARITY_CONFIG[e.tpl.rarity].color }}>
                <CharacterCardThumb templateId={e.tpl.id} formIndex={e.owned.currentForm} name={getCharFormName(e.tpl, e.owned.currentForm)}
                  rarity={e.tpl.rarity} edition={e.owned.edition} width={72} height={99} />
                <span className="nk-pick__name">{e.tpl.name}</span>
                <span className="nk-pick__role" style={{ color: ROLE_INFO[e.role].color }}>{ROLE_INFO[e.role].icon} {ROLE_INFO[e.role].label}</span>
              </button>
              </Fragment>
            );
          })}
        </div>
      )}
      {filtered.length > limit && (
        <button className="btn-secondary nk-btn nk-more" onClick={() => setLimit(l => l + PAGE)}>Voir plus ({filtered.length - limit})</button>
      )}
    </section>
  );
}
