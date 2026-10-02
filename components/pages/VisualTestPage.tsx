'use client';
// Onglet "Test visuels" (dev local / admins) : banc d'essai des visuels
// d'édition avant de les intégrer au jeu — propositions de logos, cartes et
// jauges d'édition rendues avec les vrais composants.
import { useState } from 'react';
import { CharacterCardThumb } from '@/components/ui/CharacterCardThumb';
import { EditionBadge, EditionGauge, EditionGaugeMini } from '@/components/ui/EditionBadge';
import { EditionLogo, EDITION_LOGO_VARIANTS, LOGO_EDITIONS, type EditionLogoVariant } from '@/components/ui/EditionLogo';
import { CHARACTER_POOL } from '@/lib/game/characters';
import { EDITION_CONFIG, EDITION_ORDER, editionFromPoints } from '@/lib/game/editions';
import { RARITY_CONFIG, RARITY_ORDER_ASC } from '@/types/game';

// Un perso d'exemple par rareté (premier du pool), pour voir les logos sur chaque cadre.
const SAMPLES = RARITY_ORDER_ASC
  .map(r => CHARACTER_POOL.find(c => c.rarity === r && !c.isHero))
  .filter((c): c is typeof CHARACTER_POOL[number] => !!c);

const GAUGE_SAMPLES = [1, 3, 6, 13, 27, 50, 100, 128];

const sectionStyle = { display: 'flex', flexDirection: 'column', gap: 12 } as const;
const titleStyle = { fontFamily: 'var(--f-title)', fontSize: 17, letterSpacing: 1, color: 'var(--text)' } as const;
const hintStyle = { fontFamily: 'var(--f-ui)', fontSize: 14.4, color: 'var(--text-dim)', lineHeight: 1.5 } as const;

export function VisualTestPage() {
  const [sampleId, setSampleId] = useState(SAMPLES.find(c => c.rarity === 'L')?.id ?? SAMPLES[0]?.id);
  const [chosen, setChosen] = useState<EditionLogoVariant | null>(null);
  const sample = SAMPLES.find(c => c.id === sampleId) ?? SAMPLES[0];

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ ...hintStyle, margin: 0, maxWidth: 560 }}>
            Banc d&apos;essai des visuels d&apos;édition. Rien ici ne modifie ta partie. Choisis un personnage d&apos;exemple pour voir chaque proposition sur son cadre de rareté.
          </p>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--f-ui)', fontSize: 14.4, color: 'var(--text-sub)' }}>
            Carte d&apos;exemple
            <select value={sample?.id} onChange={e => setSampleId(e.target.value)}
              style={{ minHeight: 40, padding: '6px 10px', borderRadius: 8, background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', fontFamily: 'var(--f-ui)' }}>
              {SAMPLES.map(c => <option key={c.id} value={c.id}>{RARITY_CONFIG[c.rarity].label} · {c.name}</option>)}
            </select>
          </label>
        </div>

        {/* ── Propositions de logos ─────────────────────────────────────── */}
        <section style={sectionStyle}>
          <div style={titleStyle}>LOGOS D&apos;ÉDITION — PROPOSITIONS</div>
          {EDITION_LOGO_VARIANTS.map(v => {
            const isChosen = chosen === v.id;
            return (
              <div key={v.id} className="panel" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, borderColor: isChosen ? 'var(--purple-hi)' : undefined }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{ fontFamily: 'var(--f-ui)', fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>{v.label}</span>
                    <span style={hintStyle}>{v.description}</span>
                  </div>
                  <button onClick={() => setChosen(isChosen ? null : v.id)}
                    style={{ minHeight: 40, padding: '6px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--f-ui)', fontWeight: 700, fontSize: 14.4,
                      background: isChosen ? 'var(--purple-hi)' : 'rgba(255,255,255,0.04)', color: isChosen ? '#fff' : 'var(--text-sub)', border: '1px solid var(--border)' }}>
                    {isChosen ? '★ Favori' : 'Marquer favori'}
                  </button>
                </div>

                {/* Les 7 logos en grand */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(78px, 1fr))', gap: 10 }}>
                  {LOGO_EDITIONS.map(ed => (
                    <div key={ed} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '8px 4px', borderRadius: 10, background: 'rgba(0,0,0,0.25)' }}>
                      <EditionLogo edition={ed} variant={v.id} size={40} />
                      <span style={{ fontFamily: 'var(--f-ui)', fontSize: 14, fontWeight: 700, color: EDITION_CONFIG[ed].color, textAlign: 'center' }}>{EDITION_CONFIG[ed].label}</span>
                    </div>
                  ))}
                </div>

                {/* Sur la carte d'exemple */}
                {sample && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, paddingTop: 6 }}>
                    {LOGO_EDITIONS.map(ed => (
                      <CharacterCardThumb key={ed} templateId={sample.id} name={sample.name} rarity={sample.rarity} edition={ed}
                        width={78} height={108} frameOverlay badge={size => <EditionLogo edition={ed} variant={v.id} size={size} />} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* ── Rendu actuel des cartes ──────────────────────────────────── */}
        <section style={sectionStyle}>
          <div style={titleStyle}>CARTES — RENDU ACTUEL PAR ÉDITION</div>
          {sample && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 16 }}>
              {EDITION_ORDER.map(ed => (
                <div key={ed} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <CharacterCardThumb templateId={sample.id} name={sample.name} rarity={sample.rarity} edition={ed} width={100} height={138} frameOverlay />
                  {ed === 'base'
                    ? <span style={{ ...hintStyle, fontWeight: 700 }}>Normale</span>
                    : <EditionBadge edition={ed} />}
                  <span style={{ fontFamily: 'var(--f-num)', fontSize: 14, color: 'var(--text-muted)' }}>×{EDITION_CONFIG[ed].statMult} · +{EDITION_CONFIG[ed].powBonus.toFixed(4)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Jauges d'édition ─────────────────────────────────────────── */}
        <section style={sectionStyle}>
          <div style={titleStyle}>JAUGES D&apos;ÉDITION</div>
          <p style={{ ...hintStyle, margin: 0 }}>Version détaillée (fiche du perso) et version compacte (grilles du Compadex et des Compagnons), à différents niveaux de remplissage.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {GAUGE_SAMPLES.map(points => {
              const owned = { editionPoints: points, edition: editionFromPoints(points) };
              return (
                <div key={points} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <EditionGauge owned={owned} />
                  <EditionGaugeMini owned={owned} />
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
