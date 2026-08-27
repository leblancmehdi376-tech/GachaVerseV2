'use client';
import { useState, useEffect, useMemo } from 'react';
import { useGameStore, bumpBossQuests } from '@/store/gameStore';
import { EVENT_BOSSES, rollEventDrop, getEventBossMaxHp, DropResult } from '@/lib/game/eventBoss';
import { getItemDef } from '@/lib/game/items';
import { Affinity, AFFINITY_CONFIG } from '@/lib/game/affinities';
import { calculateEquippedTeamDps } from '@/lib/game/dpsCalculation';
import { formatNumber } from '@/lib/game/format';
import { requestUrgentSave } from '@/hooks/useCloudSave';
import { MAX_EVENT_COMPANIONS, Dmg, rollBossAffinity, computeDurationMult } from './eventBattleHelpers';
import { CompanionSelector } from './CompanionSelector';
import { EventBg, BossSprite } from './EventSprites';
import { DropPopup } from './DropPopup';

export function EventBattle({ bossId, onBack }: { bossId: string; onBack: () => void }) {
  const { addItem, nekoGems, bossCrowns, collection, equippedTeam, getActiveEnemyDamageTakenMultiplier, unlockedTitles } = useGameStore();

  const boss = useMemo(() => EVENT_BOSSES.find(b => b.id === bossId) ?? EVENT_BOSSES[0], [bossId]);
  const totalEquippedDps = useMemo(() => calculateEquippedTeamDps(equippedTeam, collection), [equippedTeam, collection]);

  // Type du boss : tiré au hasard à chaque nouveau lancement (entrée + chaque
  // respawn après un kill — voir respawn() plus bas), pas déterministe.
  const [bossAffinity, setBossAffinity] = useState<Affinity>(() => rollBossAffinity());
  const [companionIds, setCompanionIds] = useState<string[]>([]);
  const [showCompanions, setShowCompanions] = useState(false);
  const durationMult = useMemo(() => computeDurationMult(companionIds, bossAffinity), [companionIds, bossAffinity]);
  const toggleCompanion = (id: string) => setCompanionIds(prev =>
    prev.includes(id) ? prev.filter(x => x !== id)
      : prev.length < MAX_EVENT_COMPANIONS ? [...prev, id]
      : prev
  );

  const [maxHp, setMaxHp] = useState(() => getEventBossMaxHp(boss, totalEquippedDps, durationMult));
  const [hp, setHp] = useState(maxHp);
  const [dmgs, setDmgs] = useState<Dmg[]>([]);
  const [drops, setDrops] = useState<DropResult[] | null>(null);
  const [dead, setDead] = useState(false);
  const [kills, setKills] = useState(0);
  const now = Date.now();

  useEffect(() => {
    const freshMax = getEventBossMaxHp(boss, totalEquippedDps, durationMult);
    setMaxHp(freshMax); setHp(freshMax); setDead(false); setDrops(null);
  }, [boss, totalEquippedDps, durationMult]);

  // ── Combat automatique : dégâts du DPS d'équipe chaque seconde, avec
  // un pop-up de dégâts flottant pour le retour visuel (plus de clic).
  useEffect(() => {
    if (dead) return;
    const dps = totalEquippedDps * getActiveEnemyDamageTakenMultiplier();
    if (dps <= 0) return;
    const id = setInterval(() => {
      setHp(h => Math.max(0, h - dps));
      const d: Dmg = {
        id: Date.now() + Math.random(),
        x: 60 + Math.random() * 120,
        y: 40 + Math.random() * 120,
        val: Math.floor(dps),
        crit: false,
      };
      setDmgs(p => [...p, d]);
      setTimeout(() => setDmgs(p => p.filter(x => x.id !== d.id)), 800);
    }, 1000);
    return () => clearInterval(id);
  }, [dead, totalEquippedDps, getActiveEnemyDamageTakenMultiplier]);

  useEffect(() => {
    if (hp <= 0 && !dead) {
      setDead(true);
      const results = rollEventDrop(boss.id, useGameStore.getState().unlockedTitles);
      const gemsGained  = results.filter(r => r.type === 'gems').reduce((s, r) => s + (r.qty ?? 0), 0);
      const crownsGained = results.filter(r => r.type === 'bossCrowns').reduce((s, r) => s + (r.qty ?? 0), 0);
      useGameStore.setState(s => {
        const questUpdate = bumpBossQuests(s.quests, s.weeklyQuests, s.eventQuests);
        return {
          quests: questUpdate.quests,
          weeklyQuests: questUpdate.weeklyQuests,
          eventQuests: questUpdate.eventQuests,
          totalBossKills: s.totalBossKills + 1,
          nekoGems: s.nekoGems + gemsGained,
          bossCrowns: s.bossCrowns + crownsGained,
          totalBossCrownsEarned: (s.totalBossCrownsEarned ?? 0) + crownsGained,
        };
      });
      for (const r of results) {
        if (r.type === 'item' && r.id) addItem(r.id, r.qty ?? 1);
        if (r.type === 'title' && r.id) useGameStore.getState().unlockTitle(r.id);
      }
      setTimeout(() => setDrops(results), 800);
      // Événement majeur : sauvegarde immédiate pour ne jamais perdre la
      // récompense d'un boss d'event (pas d'attente du prochain cycle périodique).
      requestUrgentSave('event_boss');
    }
  }, [hp, dead, addItem, boss]);

  const respawn = () => {
    // Nouveau type de boss à chaque nouveau lancement — calculé directement
    // avec la nouvelle valeur (le state bossAffinity ne sera à jour qu'au
    // prochain rendu, donc on ne peut pas relire durationMult ici).
    const nextAffinity = rollBossAffinity();
    setBossAffinity(nextAffinity);
    const freshMax = getEventBossMaxHp(boss, totalEquippedDps, computeDurationMult(companionIds, nextAffinity));
    setMaxHp(freshMax); setHp(freshMax); setDead(false); setDrops(null); setKills(k => k + 1);
  };

  const hpPct   = Math.max(0, hp / maxHp * 100);
  const hpColor = hpPct > 50 ? '#c084fc' : hpPct > 20 ? '#f87171' : '#ff4040';

  return (
    <div className="boss-event" style={{
      height:'100%',
      overflow:'hidden',
      position:'relative',
      display:'flex',
      flexDirection:'column'
    }}>
      <EventBg boss={boss} />

      {drops && (
        <DropPopup
          drops={drops}
          onClose={() => {
            setDrops(null);
            respawn();
          }}
        />
      )}

      {showCompanions && (
        <CompanionSelector
          bossAffinity={bossAffinity}
          selected={companionIds}
          onToggle={toggleCompanion}
          onClose={() => setShowCompanions(false)}
        />
      )}

      {/* ================= HEADER ================= */}
      <div
        className="boss-header"
        style={{
          position:'relative',
          padding:'10px 16px',
          borderBottom:'1px solid rgba(192,132,252,0.12)',
          background:'rgba(0,0,0,0.45)',
          flexShrink:0,
          display:'flex',
          alignItems:'center',
          gap:14
        }}
      >
        <button
          onClick={onBack}
          className="boss-back"
          style={{
            background:'rgba(255,255,255,0.06)',
            border:'1px solid rgba(255,255,255,0.15)',
            borderRadius:8,
            padding:'7px 14px',
            cursor:'pointer',
            color:'rgba(255,255,255,0.7)',
            fontFamily:'var(--f-ui)',
            fontWeight:700,
            fontSize:12.4,
            letterSpacing:1,
            display:'flex',
            alignItems:'center',
            gap:6,
            flexShrink:0,
            transition:'all 0.15s'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background='rgba(255,255,255,0.12)';
            e.currentTarget.style.color='white';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background='rgba(255,255,255,0.06)';
            e.currentTarget.style.color='rgba(255,255,255,0.7)';
          }}
        >
          ← <span className="desktop-only">ÉVÉNEMENTS</span>
        </button>

        {/* Infos boss */}
        <div
          className="boss-title-area"
          style={{
            flex:1,
            minWidth:0
          }}
        >
          <div
            className="boss-title-row"
            style={{
              display:'flex',
              alignItems:'center',
              gap:8,
              minWidth:0
            }}
          >
            <div
              style={{
                width:6,
                height:6,
                minWidth:6,
                borderRadius:'50%',
                background:boss.availableUntil > now ? '#4ade80' : '#f87171',
                animation:'pulse 2s infinite'
              }}
            />

            <span
              className="boss-name"
              style={{
                fontFamily:'var(--f-title)',
                fontSize:16.5,
                fontWeight:900,
                color:'white',
                letterSpacing:2,
                whiteSpace:'nowrap',
                overflow:'hidden',
                textOverflow:'ellipsis'
              }}
            >
              {boss.name.toUpperCase()}
            </span>

            <span
              className="boss-subtitle"
              style={{
                fontFamily:'var(--f-ui)',
                fontSize:12,
                color:'rgba(255,255,255,0.4)',
                fontWeight:600,
                whiteSpace:'nowrap',
                overflow:'hidden',
                textOverflow:'ellipsis'
              }}
            >
              {boss.subtitle}
            </span>

            <span
              className="boss-affinity"
              title="Type du boss (aléatoire à chaque combat)"
              style={{
                display:'inline-flex',
                alignItems:'center',
                gap:4,
                background:`${AFFINITY_CONFIG[bossAffinity].color}22`,
                border:`1px solid ${AFFINITY_CONFIG[bossAffinity].color}55`,
                borderRadius:999,
                padding:'2px 9px',
                fontFamily:'var(--f-ui)',
                fontWeight:700,
                fontSize:12,
                color:AFFINITY_CONFIG[bossAffinity].color,
                whiteSpace:'nowrap',
                flexShrink:0
              }}
            >
              {AFFINITY_CONFIG[bossAffinity].icon}{' '}
              {AFFINITY_CONFIG[bossAffinity].label}
            </span>
          </div>
        </div>

        {/* Compagnons */}
        <button
          onClick={() => setShowCompanions(true)}
          className="companion-button"
          style={{
            background:companionIds.length > 0
              ? 'rgba(192,132,252,0.15)'
              : 'rgba(255,255,255,0.06)',
            border:`1px solid ${
              companionIds.length > 0
                ? 'rgba(192,132,252,0.5)'
                : 'rgba(255,255,255,0.15)'
            }`,
            borderRadius:8,
            padding:'7px 14px',
            cursor:'pointer',
            color:companionIds.length > 0
              ? '#c084fc'
              : 'rgba(255,255,255,0.7)',
            fontFamily:'var(--f-ui)',
            fontWeight:700,
            fontSize:12.4,
            letterSpacing:1,
            display:'flex',
            alignItems:'center',
            gap:6,
            flexShrink:0,
            transition:'all 0.15s'
          }}
        >
          🤝 <span className="desktop-only">COMPAGNONS </span>
          ({companionIds.length}/{MAX_EVENT_COMPANIONS})
        </button>

        {/* Stats */}
        <div
          className="boss-stats"
          style={{
            display:'flex',
            gap:16,
            flexShrink:0
          }}
        >
          {[
            { icon:'⚔', val:kills, label:'Victoires' },
            { icon:'👑', val:bossCrowns, label:'Crowns' },
            { icon:'💎', val:formatNumber(nekoGems), label:'Gemmes' },
          ].map(s => (
            <div
              key={s.label}
              style={{
                textAlign:'center'
              }}
            >
              <div
                style={{
                  fontFamily:'var(--f-num)',
                  fontWeight:900,
                  fontSize:15.5,
                  color:'white',
                  whiteSpace:'nowrap'
                }}
              >
                {s.icon} {s.val}
              </div>

              <div
                className="stat-label"
                style={{
                  fontFamily:'var(--f-ui)',
                  fontSize:12,
                  color:'rgba(255,255,255,0.35)'
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>


      {/* ================= ZONE BOSS ================= */}
      <div
        className="boss-main"
        style={{
          position:'relative',
          flex:1,
          minHeight:0,
          display:'flex',
          flexDirection:'column',
          alignItems:'center',
          justifyContent:'center',
          padding:'0 24px',
          gap:24,
          overflow:'hidden'
        }}
      >
        {/* HP */}
        <div
          className="boss-hp"
          style={{
            width:'100%',
            maxWidth:600
          }}
        >
          <div
            style={{
              display:'flex',
              justifyContent:'space-between',
              marginBottom:6
            }}
          >
            <span
              style={{
                fontFamily:'var(--f-ui)',
                fontWeight:700,
                fontSize:13.4,
                color:'white'
              }}
            >
              {boss.name}
            </span>

            <span
              style={{
                fontFamily:'var(--f-ui)',
                fontWeight:700,
                fontSize:13.4,
                color:hpColor,
                whiteSpace:'nowrap'
              }}
            >
              {formatNumber(Math.max(0, hp))} / {formatNumber(maxHp)}
            </span>
          </div>

          <div
            style={{
              height:16,
              background:'rgba(255,255,255,0.08)',
              borderRadius:8,
              overflow:'hidden',
              border:'1px solid rgba(255,255,255,0.1)'
            }}
          >
            <div
              style={{
                height:'100%',
                width:`${hpPct}%`,
                background:`linear-gradient(90deg,${hpColor}aa,${hpColor})`,
                borderRadius:8,
                transition:'width 0.3s ease',
                boxShadow:`0 0 12px ${hpColor}66`
              }}
            />
          </div>

          {durationMult !== 1 && (
            <div
              style={{
                marginTop:6,
                textAlign:'center',
                fontFamily:'var(--f-ui)',
                fontWeight:700,
                fontSize:12,
                color:durationMult < 1 ? '#4ade80' : '#f87171'
              }}
            >
              {durationMult < 1 ? '▲' : '▼'}{' '}
              {durationMult < 1 ? '-' : '+'}
              {Math.round(Math.abs(1 - durationMult) * 100)}%
              {' '}durée grâce aux compagnons
            </div>
          )}
        </div>


        {/* Boss */}
        <div
          className="boss-sprite"
          style={{
            position:'relative',
            userSelect:'none',
            filter:dead
              ? 'grayscale(1) brightness(0.3)'
              : 'none',
            transition:'filter 0.1s',
            maxWidth:'80vw',
            maxHeight:'55vh'
          }}
        >
          <BossSprite boss={boss} deadStyle={dead} />

          {dmgs.map(d => (
            <div
              key={d.id}
              style={{
                position:'absolute',
                left:d.x,
                top:d.y,
                pointerEvents:'none',
                fontFamily:'var(--f-ui)',
                fontWeight:900,
                fontSize:d.crit ? 20 : 14,
                color:d.crit ? '#fbbf24' : '#c084fc',
                textShadow:d.crit
                  ? '0 0 10px #fbbf24'
                  : '0 0 6px #c084fc',
                animation:'floatUp 0.8s ease forwards',
                whiteSpace:'nowrap',
                zIndex:10
              }}
            >
              {d.crit ? '⚡ ' : ''}
              {formatNumber(d.val)}
            </div>
          ))}

          {dead && (
            <div
              style={{
                position:'absolute',
                inset:0,
                display:'flex',
                flexDirection:'column',
                alignItems:'center',
                justifyContent:'center',
                gap:8
              }}
            >
              <div
                style={{
                  fontFamily:'var(--f-title)',
                  fontWeight:900,
                  fontSize:22.7,
                  color:'#c084fc',
                  textShadow:'0 0 20px #c084fc',
                  letterSpacing:2
                }}
              >
                VAINCU
              </div>
            </div>
          )}
        </div>

        {dead && !drops && (
          <div
            style={{
              fontFamily:'var(--f-ui)',
              fontWeight:700,
              fontSize:13.4,
              color:'rgba(255,255,255,0.5)',
              animation:'pulse 1s infinite'
            }}
          >
            Calcul des récompenses...
          </div>
        )}

        {!dead && (
          <div
            className="attack-hint"
            style={{
              fontFamily:'var(--f-ui)',
              fontSize:12,
              color:'rgba(255,255,255,0.3)',
              textAlign:'center'
            }}
          >
            Tes alliés attaquent automatiquement
          </div>
        )}
      </div>


      {/* ================= RÉCOMPENSES ================= */}
      <div
        className="boss-rewards"
        style={{
          position:'relative',
          padding:'10px 24px 14px',
          borderTop:'1px solid rgba(255,255,255,0.05)',
          background:'rgba(0,0,0,0.3)',
          flexShrink:0
        }}
      >
        <div
          style={{
            fontFamily:'var(--f-ui)',
            fontSize:12,
            color:'rgba(255,255,255,0.3)',
            marginBottom:8,
            letterSpacing:1
          }}
        >
          RÉCOMPENSES POSSIBLES
        </div>

        <div
          className="reward-list"
          style={{
            display:'flex',
            gap:10,
            flexWrap:'wrap'
          }}
        >
          {boss.dropTable
            .filter(e =>
              e.result.type !== 'nothing' &&
              !(
                e.result.type === 'title' &&
                e.result.id &&
                unlockedTitles.includes(e.result.id)
              )
            )
            .map((entry, i, pool) => {

              const totalWeight = pool.reduce(
                (s, x) => s + x.weight,
                0
              );

              const rate =
                `${Math.round(entry.weight / totalWeight * 1000) / 10}%`;

              const r = entry.result;

              const item =
                r.type === 'item' && r.id
                  ? getItemDef(r.id)
                  : null;

              const icon =
                r.type === 'gems'
                  ? '💎'
                  : r.type === 'bossCrowns'
                    ? '👑'
                    : r.type === 'title'
                      ? '🏆'
                      : (item?.icon ?? '📦');

              const label =
                r.type === 'title'
                  ? `Titre : ${r.id}`
                  : item?.name ??
                    (
                      r.type === 'gems'
                        ? `Gemmes ×${r.qty}`
                        : r.type === 'bossCrowns'
                          ? `Crowns ×${r.qty}`
                          : 'Objet'
                    );

              const color =
                r.type === 'gems'
                  ? 'var(--cyan-hi)'
                  : r.type === 'bossCrowns' || r.type === 'title'
                    ? '#fbbf24'
                    : (item?.color ?? '#c084fc');

              return (
                <div
                  key={i}
                  className="reward-item"
                  style={{
                    display:'flex',
                    alignItems:'center',
                    gap:5,
                    background:'rgba(255,255,255,0.04)',
                    borderRadius:8,
                    padding:'4px 10px',
                    border:`1px solid ${color}33`,
                    minWidth:0
                  }}
                >
                  <span style={{ fontSize:14.4 }}>
                    {icon}
                  </span>

                  <span
                    style={{
                      fontFamily:'var(--f-ui)',
                      fontWeight:700,
                      fontSize:12,
                      color,
                      whiteSpace:'nowrap',
                      overflow:'hidden',
                      textOverflow:'ellipsis'
                    }}
                  >
                    {label}
                  </span>

                  <span
                    style={{
                      fontFamily:'var(--f-ui)',
                      fontSize:12,
                      color:'rgba(255,255,255,0.3)',
                      whiteSpace:'nowrap'
                    }}
                  >
                    {rate} · 🪙+{entry.coinQty}
                  </span>
                </div>
              );
            })}
        </div>
      </div>


      {/* ================= RESPONSIVE ================= */}
      <style>{`
        @keyframes floatUp {
          0% {
            opacity:1;
            transform:translateY(0) scale(1)
          }
          100% {
            opacity:0;
            transform:translateY(-60px) scale(1.3)
          }
        }

        @keyframes pulse {
          0%,100% {
            opacity:1
          }
          50% {
            opacity:0.5
          }
        }

        /* TABLET */
        @media (max-width: 900px) {
          .boss-header {
            gap:8px !important;
            padding:8px 10px !important;
          }

          .boss-stats {
            gap:10px !important;
          }

          .boss-main {
            padding:0 14px !important;
            gap:14px !important;
          }

          .boss-rewards {
            padding:8px 12px 10px !important;
          }
        }

        /* MOBILE */
        @media (max-width: 600px) {
          .boss-header {
            flex-wrap:wrap !important;
            align-items:center !important;
            padding:7px 8px !important;
            gap:6px !important;
          }

          .boss-back {
            padding:6px 9px !important;
            font-size:11px !important;
          }

          /* Ligne 1 : retour + boss */
          .boss-title-area {
            order:1;
            flex:1 1 calc(100% - 110px) !important;
            min-width:0 !important;
          }

          .boss-title-row {
            gap:5px !important;
          }

          .boss-name {
            font-size:14px !important;
            letter-spacing:1px !important;
          }

          .boss-subtitle {
            display:none !important;
          }

          .boss-affinity {
            font-size:10px !important;
            padding:2px 6px !important;
          }

          /* Ligne 2 : compagnons */
          .companion-button {
            order:2;

            /* Taille PC conservée */
            padding:7px 14px !important;
            font-size:12.4px !important;
            letter-spacing:1px !important;

            /* Nouvelle ligne complète */
            width:100% !important;
            justify-content:center !important;
            box-sizing:border-box !important;
          }

          /* Ligne 3 : statistiques */
          .boss-stats {
            order:3;
            width:100%;
            justify-content:space-around;
            padding-top:4px;
            border-top:1px solid rgba(255,255,255,0.05);
          }

          .stat-label {
            font-size:10px !important;
          }

          .boss-main {
            padding:8px 10px !important;
            gap:10px !important;
            justify-content:center !important;
          }

          .boss-hp {
            max-width:100% !important;
          }

          .boss-sprite {
            max-width:85vw !important;
            max-height:45vh !important;
          }

          .attack-hint {
            font-size:10px !important;
          }

          .boss-rewards {
            padding:7px 8px 9px !important;
          }

          .reward-list {
            flex-wrap:nowrap !important;
            overflow-x:auto !important;
            padding-bottom:3px;
            scrollbar-width:thin;
          }

          .reward-item {
            flex:0 0 auto !important;
            max-width:75vw;
          }

          .desktop-only {
            display:none !important;
          }
        }

        /* TRÈS PETIT MOBILE */
        @media (max-width: 300px) {

          .boss-header {
            padding:5px 6px !important;
          }

          .boss-name {
            font-size:12.5px !important;
          }

          .boss-affinity {
            font-size:9px !important;
          }

          .companion-button {
            font-size:9px !important;
            padding:5px 7px !important;
          }

          .boss-stats {
            gap:4px !important;
          }

          .boss-stats > div > div:first-child {
            font-size:12px !important;
          }

          .boss-main {
            gap:7px !important;
            padding:5px 7px !important;
          }

          .boss-sprite {
            max-width:90vw !important;
            max-height:40vh !important;
          }

          .boss-rewards {
            font-size:10px;
          }
        }
      `}</style>
    </div>
  );
}
