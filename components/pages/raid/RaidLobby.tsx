'use client';
import { useGameStore } from '@/store/gameStore';
import { RAID_BOSSES, RaidBossDef, DropEntry } from '@/lib/game/raidBoss';
import { getItemDef } from '@/lib/game/items';
import { getCharacterById } from '@/lib/game/characters';
import { RARITY_CONFIG } from '@/types/game';
import { formatNumber } from '@/lib/game/format';
import { useFallbackImage, buildImageCandidates, stripKnownExtension } from '@/lib/image-fallback';

const COMING_SOON_RAIDS = [
  { id:'coming_3', name:'COMING SOON', subtitle:'Prochain raid à venir...', accentColor:'rgba(255,255,255,0.2)', bgGradient:'linear-gradient(135deg,#0a0a14,#14101e)' },
];

// Recadrages ponctuels par raid — les artworks sources n'ont pas toutes
// le même cadrage/aspect ratio, ces réglages compensent au cas par cas
// (ex: tête coupée en haut, illustration de fond qui ne monte pas assez haut).
const BG_ART_OVERRIDES: Record<string, { scale?: number }> = {
  // cid_kagenou_bg.webp a une bordure grise imprimée directement dans le
  // fichier (mockup type "planche encadrée") : object-position ne peut rien
  // y faire vu que object-fit:cover comble déjà exactement la hauteur sans
  // marge à recadrer — il faut zoomer pour faire sortir cette bordure du cadre.
  eminence_shadow: { scale: 1.4 },
};
const HERO_ART_OVERRIDES: Record<string, { height?: string; right?: number }> = {
  shadow_monarch: { height: '92%' },  // Jinwoo dépassait du cadre (tête coupée) à 106%
  arthur_leywin:  { right: -22 },     // léger décalage vers la droite
};

// Fond illustré de la carte raid (chute vers bgGradient si l'image est absente).
function RaidCardBg({ raid }: { raid: RaidBossDef }) {
  const { src, failed, onError } = useFallbackImage(buildImageCandidates(raid.bgImagePath));
  if (failed || !src) return <div style={{ position:'absolute', inset:0, background: raid.bgGradient }} />;
  const override = BG_ART_OVERRIDES[raid.id];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" onError={onError}
      style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover',
        transform: override?.scale ? `scale(${override.scale})` : undefined }} />
  );
}

// Artwork du personnage, en surimpression à droite de la carte, fondu vers la
// gauche pour laisser le texte lisible (voir mask-image ci-dessous).
function RaidCardHero({ raid }: { raid: RaidBossDef }) {
  const { src, failed, onError } = useFallbackImage(buildImageCandidates(stripKnownExtension(raid.spritePath)));
  if (failed || !src) return null;
  const fade = 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.5) 20%, black 45%)';
  const override = HERO_ART_OVERRIDES[raid.id];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={raid.name} onError={onError}
      style={{
        position:'absolute', right: override?.right ?? -8, bottom:0, height: override?.height ?? '106%', maxWidth:'64%', objectFit:'contain',
        imageRendering:'pixelated', pointerEvents:'none',
        filter: `drop-shadow(0 0 26px ${raid.accentColor}aa)`,
        WebkitMaskImage: fade, maskImage: fade,
      }} />
  );
}

// Sélectionne les récompenses les plus rares de la table de drop (poids
// croissant = plus rare) pour les mettre en avant, plutôt que les gains
// communs (gemmes/couronnes) qui apparaissaient en premier dans le tableau.
function pickRareDrops(dropTable: DropEntry[]): DropEntry[] {
  return dropTable
    .filter(e => e.result.type !== 'nothing')
    .slice()
    .sort((a, b) => a.weight - b.weight)
    .slice(0, 4);
}

export function RaidLobby({ onSelect }: { onSelect: (id: string) => void }) {
  const { bossCrowns, nekoGems } = useGameStore();
  return (
    <div style={{ height:'100%', overflowY:'auto', position:'relative' }}>
      <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 20%,rgba(147,51,234,0.08),transparent 60%)', pointerEvents:'none' }} />
      <div style={{ position:'relative', maxWidth:1000, margin:'0 auto', padding:'28px 24px', display:'flex', flexDirection:'column', gap:28 }}>

        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
            <div style={{ width:4, height:20, background:'linear-gradient(180deg,#fbbf24,#f59e0b)', borderRadius:2, boxShadow:'0 0 8px #fbbf24' }} />
            <span style={{ fontFamily:'var(--f-title)', fontSize:20.6, fontWeight:700, color:'#fbbf24', letterSpacing:'3px' }}>RAIDS</span>
          </div>
          <div style={{ fontFamily:'var(--f-ui)', fontSize:12.4, color:'var(--text-dim)' }}>
            Choisis un raid et affronte les boss pour obtenir des récompenses exclusives
          </div>
        </div>

        <div style={{ display:'flex', gap:10 }}>
          {[
            { icon:'👑', val:bossCrowns, label:'Boss Crowns', color:'#fbbf24' },
            { icon:'💎', val:formatNumber(nekoGems), label:'Neko-Gemmes', color:'var(--cyan-hi)' },
          ].map((s,i) => (
            <div key={i} className="panel" style={{ padding:'10px 18px', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:22.7 }}>{s.icon}</span>
              <div>
                <div style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:18.5, color:s.color }}>{s.val}</div>
                <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'var(--text-dim)', fontWeight:700 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div>
          <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color:'var(--text-dim)', letterSpacing:2, marginBottom:14 }}>RAIDS DISPONIBLES</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16 }}>
            {RAID_BOSSES.map(raid => {
              const charTpl   = getCharacterById(raid.characterId);
              const charRare  = charTpl ? RARITY_CONFIG[charTpl.rarity] : null;
              const rareDrops = pickRareDrops(raid.dropTable);
              return (
                <div key={raid.id}
                  style={{ borderRadius:16, overflow:'hidden', position:'relative', cursor:'pointer',
                    border:`1px solid ${raid.accentColor}66`,
                    boxShadow: `0 0 24px ${raid.accentColor}22, 0 8px 32px rgba(0,0,0,0.4)`,
                    transition:'transform 0.2s, box-shadow 0.2s',
                  }}
                  onClick={() => onSelect(raid.id)}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='translateY(-4px)';(e.currentTarget as HTMLElement).style.boxShadow=`0 0 44px ${raid.accentColor}55, 0 16px 40px rgba(0,0,0,0.5)`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform='translateY(0)';(e.currentTarget as HTMLElement).style.boxShadow=`0 0 24px ${raid.accentColor}22, 0 8px 32px rgba(0,0,0,0.4)`; }}>
                  <RaidCardBg raid={raid} />
                  <RaidCardHero raid={raid} />
                  <div style={{ position:'absolute', inset:0,
                    background: `linear-gradient(90deg, rgba(4,4,10,0.92) 0%, rgba(4,4,10,0.68) 42%, rgba(4,4,10,0.18) 78%), linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.8) 100%)` }} />
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:3,
                    background:`linear-gradient(90deg,transparent,${raid.accentColor},transparent)`,
                    animation: 'topGlow 2.4s ease-in-out infinite' }} />
                  <div style={{ position:'relative', padding:'22px 20px 20px', display:'flex', flexDirection:'column', gap:11, minHeight:280 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(74,222,128,0.15)', border:'1px solid rgba(74,222,128,0.4)', borderRadius:6, padding:'3px 10px' }}>
                        <div style={{ width:6, height:6, borderRadius:'50%', background:'#4ade80', animation:'pulse 2s infinite' }} />
                        <span style={{ fontFamily:'var(--f-ui)', fontSize:12, fontWeight:700, color:'#4ade80', letterSpacing:1 }}>ACTIF</span>
                      </div>
                      <span style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'rgba(255,255,255,0.4)', fontWeight:600 }}>⏰ Permanent</span>
                    </div>
                    <div>
                      <div style={{ fontFamily:'var(--f-title)', fontSize:20.6, fontWeight:900, color:'white', letterSpacing:2, marginBottom:5, textShadow:`0 0 20px ${raid.accentColor}bb` }}>{raid.name}</div>
                      <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'rgba(255,255,255,0.55)', fontWeight:700, letterSpacing:1, marginBottom:6 }}>{raid.subtitle}</div>
                      <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'rgba(255,255,255,0.68)', lineHeight:1.6, maxWidth:'88%' }}>{raid.description}</div>
                    </div>

                    {charTpl && charRare && (
                      <div style={{ display:'inline-flex', alignItems:'center', gap:8, alignSelf:'flex-start',
                        background:`linear-gradient(90deg, ${charRare.color}22, transparent)`, border:`1px solid ${charRare.color}88`,
                        borderRadius:8, padding:'5px 10px', boxShadow:`0 0 14px ${charRare.glow}33` }}>
                        <span style={{ fontSize:14 }}>🎁</span>
                        <span style={{ fontFamily:'var(--f-ui)', fontSize:11.5, fontWeight:800, color:charRare.color, letterSpacing:0.5 }}>{charTpl.name}</span>
                        <span style={{ fontFamily:'var(--f-ui)', fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.6)', letterSpacing:1, textTransform:'uppercase' }}>{charRare.label}</span>
                      </div>
                    )}

                    <div>
                      <div style={{ fontFamily:'var(--f-ui)', fontSize:10.5, fontWeight:700, color:'rgba(255,255,255,0.4)', letterSpacing:1.5, marginBottom:6 }}>MEILLEURS BUTINS</div>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        {rareDrops.map((entry, i) => {
                          const r = entry.result;
                          const item = r.type==='item'&&r.id ? getItemDef(r.id) : null;
                          const isTitle = r.type === 'title';
                          const icon = isTitle ? '🏆' : r.type==='gems'?'💎':r.type==='bossCrowns'?'👑':(item?.icon ?? '📦');
                          const label = isTitle ? r.id : (item?.name ?? (r.type==='gems'?`${r.qty}💎`:r.type==='bossCrowns'?`${r.qty}👑`:'Objet'));
                          const color = isTitle ? '#fbbf24' : (item?.color ?? 'rgba(255,255,255,0.7)');
                          const isRarest = i === 0;
                          return (
                            <div key={i} style={{ display:'flex', alignItems:'center', gap:5,
                              background: isRarest ? `linear-gradient(90deg, ${color}33, ${color}11)` : 'rgba(255,255,255,0.08)',
                              border:`1px solid ${color}${isRarest?'aa':'44'}`, borderRadius:6,
                              padding: isRarest ? '5px 10px' : '3px 8px',
                              boxShadow: isRarest ? `0 0 12px ${color}55` : 'none',
                              animation: isRarest ? 'rareGlow 1.8s ease-in-out infinite' : 'none' }}>
                              <span style={{ fontSize: isRarest ? 14 : 12 }}>{icon}</span>
                              <span style={{ fontFamily:'var(--f-ui)', fontSize: isRarest ? 12.5 : 12, fontWeight:800, color }}>{label}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ fontFamily:'var(--f-ui)', fontSize:10.5, color:'rgba(255,255,255,0.35)', marginTop:6 }}>+ Gemmes & Couronnes garanties à chaque victoire</div>
                    </div>

                    <button onClick={e => { e.stopPropagation(); onSelect(raid.id); }}
                      className="btn-primary"
                      style={{ marginTop:'auto', padding:'12px', fontSize:14.4, letterSpacing:2, display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer' }}>
                      ⚔ ENTRER
                    </button>
                  </div>
                </div>
              );
            })}

            {COMING_SOON_RAIDS.map(ev => (
              <div key={ev.id} style={{ borderRadius:16, overflow:'hidden', position:'relative', border:'1px solid rgba(255,255,255,0.08)', background:'linear-gradient(135deg,#0a0a14,#14101e)', minHeight:220, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14 }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)' }} />
                <span style={{ fontSize:41.2, opacity:0.3 }}>🔒</span>
                <div style={{ textAlign:'center', padding:'0 20px' }}>
                  <div style={{ fontFamily:'var(--f-title)', fontSize:16.5, fontWeight:700, color:'rgba(255,255,255,0.25)', letterSpacing:3, marginBottom:8 }}>COMING SOON</div>
                  <div style={{ fontFamily:'var(--f-ui)', fontSize:12, color:'rgba(255,255,255,0.2)' }}>Prochain raid bientôt disponible...</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes topGlow{0%,100%{opacity:0.6}50%{opacity:1}}
        @keyframes rareGlow{0%,100%{filter:brightness(1)}50%{filter:brightness(1.35)}}
      `}</style>
    </div>
  );
}
