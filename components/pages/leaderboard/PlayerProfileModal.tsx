'use client';
import { useEffect, type CSSProperties } from 'react';
import type { LeaderboardEntry } from '@/lib/firebase/leaderboard';
import { AvatarVisual } from '@/components/layout/AvatarVisual';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';
import { getCharacterById, CHARACTER_POOL } from '@/lib/game/characters';
import { getPalierConfig } from '@/lib/game/paliers';
import { formatNumber } from '@/lib/game/format';
import { hasAvatarPulse } from '@/lib/game/avatarAura';
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID, MAX_SHOWCASED_TROPHIES, TIER_META, getAchievementTier } from '@/lib/game/achievements';
import { tierVars } from '@/components/pages/achievements/achievementUi';
import { RARITY_CONFIG } from '@/types/game';

interface Props {
  entry: LeaderboardEntry;
  rank: number;           // 1-based
  rankColor: string;
  isMe: boolean;
  onClose: () => void;
}

// Profil public d'un joueur du classement — rendu uniquement à partir de
// LeaderboardEntry (déjà chargé par getTopLeaderboard) : aucune lecture
// Firestore à l'ouverture.
export function PlayerProfileModal({ entry, rank, rankColor, isMe, onClose }: Props) {
  const { profile } = entry;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const avatarTpl = entry.selectedAvatarChampionId ? getCharacterById(entry.selectedAvatarChampionId) : null;
  const trophies = profile.showcasedTrophies.map(id => ACHIEVEMENT_BY_ID.get(id)).filter(a => a !== undefined);
  const team = profile.team
    .map(m => ({ ...m, tpl: getCharacterById(m.templateId) }))
    .filter(m => m.tpl);

  const stats = [
    { label:'PALIER MAX',   val: String(entry.maxPalierReached),                        color:'#c084fc' },
    { label:'PALIER ACTUEL', val: `${profile.palier} — ${getPalierConfig(Math.max(1, profile.palier)).name}`, color:'var(--purple-glow)', small:true },
    { label:'PRESTIGE',     val: String(entry.prestigeLevel),                            color:'#a855f7' },
    { label:'DPS TOTAL',    val: `${formatNumber(entry.totalDps)}/s`,                    color:'var(--green)' },
    { label:'PIXEL-COINS',  val: formatNumber(entry.pixelCoins),                         color:'var(--gold)' },
    { label:'PERSONNAGES',  val: `${profile.ownedCharCount} / ${CHARACTER_POOL.length}`, color:'#60a5fa' },
    { label:'SUCCÈS',       val: `${profile.achievementsCount} / ${ACHIEVEMENTS.length}`, color:'#fbbf24' },
    { label:'BOSS VAINCUS', val: formatNumber(profile.totalBossKills),                   color:'#f87171' },
    { label:'INVOCATIONS',  val: formatNumber(profile.totalGachaPulls),                  color:'var(--cyan-hi)' },
  ];

  const sectionTitle: CSSProperties = { fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color:'var(--text-dim)', letterSpacing:2, marginBottom:10 };

  return (
    <div
      onClick={onClose}
      style={{ position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16, background:'rgba(3,2,8,0.88)' }}
    >
      <div
        role="dialog" aria-modal="true" aria-label={`Profil de ${entry.username}`}
        onClick={e => e.stopPropagation()}
        style={{ width:'min(620px, 100%)', maxHeight:'90vh', overflowY:'auto', borderRadius:14, border:'1px solid var(--border-lit)', background:'#0f0c20', boxShadow:'0 20px 60px rgba(0,0,0,0.6)', padding:'20px 22px', display:'flex', flexDirection:'column', gap:18 }}
      >
        {/* En-tête */}
        <div style={{ display:'flex', alignItems:'center', gap:18, position:'relative' }}>
          <AvatarVisual
            size={72}
            champion={avatarTpl ? { templateId: avatarTpl.id, formIndex: entry.avatarFormIndex, name: avatarTpl.name, rarity: avatarTpl.rarity } : null}
            fallbackLetter={entry.username.charAt(0).toUpperCase()}
            maxPalierReached={entry.maxPalierReached}
            pulse={hasAvatarPulse(profile.achievementsCount)}
            tooltip={avatarTpl?.name ?? entry.username}
          />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'baseline', gap:10, flexWrap:'wrap' }}>
              <span style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:15, color:rankColor }}>#{rank}</span>
              <span style={{ fontFamily:'var(--f-title)', fontSize:21, fontWeight:900, color: isMe ? '#c084fc' : 'var(--text)', letterSpacing:1.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {entry.username}{isMe && ' (toi)'}
              </span>
            </div>
            {entry.activeTitle && (
              <div style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop:6, background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.3)', borderRadius:6, padding:'3px 10px' }}>
                <span style={{ fontSize:12 }}>👑</span>
                <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color:'#fbbf24', letterSpacing:1 }}>« {entry.activeTitle} »</span>
              </div>
            )}
            <div style={{ marginTop:6, fontFamily:'var(--f-ui)', fontSize:12, fontWeight:700, color:'var(--text-dim)' }}>
              🏆 {profile.achievementsCount} succès · 👑 {profile.titlesCount} titre{profile.titlesCount > 1 ? 's' : ''}
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer"
            style={{ position:'absolute', top:-6, right:-8, background:'none', border:'none', color:'var(--text-dim)', fontSize:20, cursor:'pointer', lineHeight:1 }}>✕</button>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))', gap:8 }}>
          {stats.map(s => (
            <div key={s.label} style={{ padding:'10px 12px', background:'rgba(255,255,255,0.03)', border:'1px solid var(--border)', borderRadius:8, minWidth:0 }}>
              <div style={{ fontFamily:'var(--f-ui)', fontSize:11, fontWeight:700, color:'var(--text-dim)', letterSpacing:1.2 }}>{s.label}</div>
              <div style={{ fontFamily: s.small ? 'var(--f-ui)' : 'var(--f-num)', fontWeight:900, fontSize: s.small ? 13 : 17, color:s.color, marginTop:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={s.val}>
                {s.val}
              </div>
            </div>
          ))}
        </div>

        {/* Équipe */}
        <div>
          <div style={sectionTitle}>👥 ÉQUIPE ACTIVE</div>
          {team.length === 0 ? (
            <div style={{ fontFamily:'var(--f-ui)', fontSize:12.4, color:'var(--text-muted)' }}>Aucune équipe équipée.</div>
          ) : (
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {team.map((m, i) => (
                <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, width:76 }}>
                  <CharacterCardThumb templateId={m.templateId} formIndex={m.formIndex} name={m.tpl!.name} rarity={m.tpl!.rarity} edition={m.edition} width={72} height={99} frameOverlay />
                  <div style={{ fontFamily:'var(--f-ui)', fontSize:11, fontWeight:700, color:RARITY_CONFIG[m.tpl!.rarity].color, maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={m.tpl!.name}>
                    {m.tpl!.name}
                  </div>
                  <div style={{ fontFamily:'var(--f-num)', fontSize:10.5, color:'var(--text-dim)' }}>Niv. {m.level}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vitrine */}
        <div className="trophy-stage" style={{ padding:'16px 14px 14px' }}>
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:10, marginBottom:12 }}>
            <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color:'var(--gold-hi)', letterSpacing:2 }}>🏆 TROPHÉES EXPOSÉS</div>
            <div style={{ fontFamily:'var(--f-num)', fontSize:12, color:'var(--text-dim)' }}>{trophies.length} / {MAX_SHOWCASED_TROPHIES}</div>
          </div>
          {trophies.length === 0 ? (
            <div style={{ fontFamily:'var(--f-ui)', fontSize:12.4, color:'var(--text-dim)', textAlign:'center', padding:'8px 0' }}>Aucun trophée exposé.</div>
          ) : (
            <div className="trophy-shelf">
              {trophies.map((a, i) => (
                <div key={a.id} className="trophy-slot" style={{ ...tierVars(a), ['--i' as string]: i, minHeight:130, cursor:'default' } as CSSProperties}>
                  <span className="trophy-slot__icon" style={{ fontSize:30 }}>{a.icon}</span>
                  <span className="trophy-slot__name">{a.name}</span>
                  <span className="ach-tier">{TIER_META[getAchievementTier(a)].label}</span>
                  <span className="trophy-slot__plinth" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
