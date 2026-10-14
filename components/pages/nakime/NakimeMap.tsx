'use client';
import { useEffect, useRef } from 'react';
import { getCharacterById } from '@/lib/game/characters';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';
import { generateActMap, reachableCols, NAKIME_NODE_INFO, NAKIME_ACT_FLOORS, type NakimeRun } from '@/lib/game/nakime';

const ROW_H = 74;
const PAD = 44;          // marge haute (boss)
const PAD_BOTTOM = 76;   // marge basse : place pour le pion au départ de l'acte

// Carte de l'acte en cours : rangées du bas (1er étage) vers le haut (boss).
// Les liens sont tracés en SVG, les nœuds sont de vrais boutons HTML posés
// par-dessus (cibles tactiles confortables, texte lisible).
export function NakimeMap({ run, selected, onSelect }: { run: NakimeRun; selected: number | null; onSelect: (col: number) => void }) {
  const map = generateActMap(run.seed, run.act);
  const reach = new Set(reachableCols(run));
  const height = (NAKIME_ACT_FLOORS - 1) * ROW_H + PAD + PAD_BOTTOM;
  const rowY = (r: number) => height - PAD_BOTTOM - r * ROW_H;
  const pos = (r: number, i: number) => ({ x: ((i + 0.5) / map[r].length) * 100, y: rowY(r) });
  // Pion : le portrait du chef d'équipe, sur la salle actuelle (ou au pied de l'acte).
  const leader = run.members.find(m => m.hp > 0) ?? run.members[0];
  const leaderTpl = leader ? getCharacterById(leader.templateId) : undefined;
  const pawn = run.row >= 0 ? pos(run.row, run.col) : { x: 50, y: height - 26 };
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextRow = run.row + 1;
  const floorBase = (run.act - 1) * NAKIME_ACT_FLOORS;

  // Garde la rangée jouable visible.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const y = height - PAD_BOTTOM - nextRow * ROW_H;
    el.scrollTop = Math.max(0, y - el.clientHeight * 0.6);
  }, [height, nextRow, run.act]);

  return (
    <div className="nk-map" ref={scrollRef}>
      <div className="nk-map__inner" style={{ height }}>
        <svg className="nk-map__edges" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden>
          {map.slice(0, -1).map((row, r) => row.map((node, i) => {
            const a = pos(r, i);
            const out = [];
            for (let j = node.lo; j <= node.hi; j++) {
              const b = pos(r + 1, j);
              const taken = run.path[r] === i && run.path[r + 1] === j;
              const open = r === run.row && run.col === i;
              out.push(
                <line key={`${r}-${i}-${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} vectorEffect="non-scaling-stroke"
                  className={taken ? 'is-taken' : open ? 'is-open' : ''} />,
              );
            }
            return out;
          }))}
        </svg>
        {map.map((row, r) => (
          <div key={r} className="nk-map__floor" style={{ top: rowY(r) }}>{floorBase + r + 1}</div>
        ))}
        {map.map((row, r) => row.map((node, i) => {
          const p = pos(r, i);
          const info = NAKIME_NODE_INFO[node.kind];
          const visited = run.path[r] === i;
          const current = r === run.row && run.col === i;
          const playable = r === nextRow && reach.has(i);
          const past = r < nextRow && !visited;
          const cls = ['nk-node', `nk-node--${node.kind}`, visited && 'is-visited', current && 'is-current', playable && 'is-playable',
            past && 'is-past', playable && selected === i && 'is-selected'].filter(Boolean).join(' ');
          return (
            <button key={`${r}-${i}`} className={cls} style={{ left: `${p.x}%`, top: p.y, ['--node' as string]: info.color }}
              disabled={!playable} onClick={() => onSelect(i)}
              aria-label={`Étage ${floorBase + r + 1} : ${info.label}${playable ? '' : visited ? ' (visité)' : ' (inaccessible)'}`}>
              <span aria-hidden>{info.icon}</span>
            </button>
          );
        }))}
        {leaderTpl && (
          <div className={`nk-pawn${run.row < 0 ? ' is-start' : ''}`} style={{ left: `${pawn.x}%`, top: pawn.y }} aria-hidden>
            <CharacterCardThumb templateId={leaderTpl.id} name={leaderTpl.name} rarity={leaderTpl.rarity} width={34} height={47} />
          </div>
        )}
      </div>
    </div>
  );
}
