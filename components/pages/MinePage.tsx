'use client';
import { useGameStore, MINE_PURCHASE_COST_CROWNS, MINE_BASE_RATE_PER_HOUR, MINE_CAP_TIERS, MINE_SPEED_MULT_TIERS } from '@/store/gameStore';
import { formatNumber } from '@/lib/game/format';
import { PageScroll } from '@/components/ui/Page';

function UpgradeRow({ icon, label, current, next, cost, affordable, onBuy }: {
  icon: string; label: string; current: string; next: string | null; cost: number | null; affordable: boolean; onBuy: () => void;
}) {
  const maxed = cost === null;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', background:'rgba(255,255,255,0.02)', border:'1px solid var(--border)', borderRadius:'10px' }}>
      <span style={{ fontSize:'20.6px' }}>{icon}</span>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12.4px', color:'var(--text)' }}>{label}</div>
        <div style={{ fontFamily:'var(--f-num)', fontSize:'12.4px', color:'var(--text-sub)', marginTop:'2px' }}>
          <span style={{ color:'var(--green)' }}>{current}</span>{next && !maxed && <span style={{ color:'var(--text-dim)' }}> → {next}</span>}
        </div>
      </div>
      <button onClick={onBuy} disabled={maxed || !affordable}
        className={affordable ? 'btn-primary' : 'btn-secondary'}
        style={{ padding:'8px 14px', fontSize:'12.4px', opacity: maxed ? 0.5 : 1, cursor: maxed || !affordable ? 'not-allowed' : 'pointer', whiteSpace:'nowrap' }}>
        {maxed ? 'MAX' : <>👑 {cost}</>}
      </button>
    </div>
  );
}

export function MinePage() {
  const {
    prestigeLevel, bossCrowns, mineOwned, mineCapLevel, mineSpeedLevel, mineGems,
    getMineCap, getMineRatePerHour, getMineCapUpgradeCost, getMineSpeedUpgradeCost,
    buyMine, upgradeMineCap, upgradeMineSpeed, collectMineGems,
  } = useGameStore();

  // ── Verrouillée avant le premier Prestige ──────────────────────────────
  if (prestigeLevel < 1) {
    return (
      <PageScroll>
        <div style={{ maxWidth:640, margin:'60px auto 0', textAlign:'center' }}>
          <div className="panel" style={{ padding:'32px 28px' }}>
            <div style={{ fontSize:'44px', marginBottom:'12px', opacity:0.6 }}>🔒</div>
            <div style={{ fontFamily:'var(--f-title)', fontSize:'18.5px', fontWeight:900, color:'var(--text)', letterSpacing:'2px', marginBottom:'10px' }}>MINE VERROUILLÉE</div>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:'13.4px', color:'var(--text-dim)', lineHeight:1.6 }}>
              Débloque la Mine de Gemmes en atteignant ton premier Prestige.
            </div>
          </div>
        </div>
      </PageScroll>
    );
  }

  const cap         = mineOwned ? getMineCap() : MINE_CAP_TIERS[0];
  const ratePerHour = mineOwned ? getMineRatePerHour() : 0;
  const stored      = Math.floor(mineGems);
  const fillPct     = mineOwned ? Math.min(100, (mineGems / cap) * 100) : 0;
  const capCost     = getMineCapUpgradeCost();
  const speedCost   = getMineSpeedUpgradeCost();
  const nextCap     = MINE_CAP_TIERS[mineCapLevel + 1] ?? null;
  const nextSpeedMult = MINE_SPEED_MULT_TIERS[mineSpeedLevel + 1] ?? null;
  const nextRate    = nextSpeedMult ? MINE_BASE_RATE_PER_HOUR * nextSpeedMult : null;

  return (
    <PageScroll>
      <div style={{ maxWidth:900, margin:'0 auto', display:'flex', flexDirection:'column', gap:22 }}>

        {/* Header */}
        <div className="panel panel--glow" style={{ padding:'22px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:20, flexWrap:'wrap' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
              <div style={{ width:4, height:20, background:'linear-gradient(180deg,#22d3ee,#0891b2)', borderRadius:2, boxShadow:'0 0 8px #22d3ee' }} />
              <span style={{ fontFamily:'var(--f-title)', fontSize:18.5, fontWeight:700, color:'var(--cyan-hi)', letterSpacing:'3px' }}>⛏️ MINE DE GEMMES</span>
            </div>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:12.4, color:'var(--text-dim)', maxWidth:460, lineHeight:1.6 }}>
              Produit des gemmes en continu jusqu&apos;à son plafond de stockage, même hors-ligne (dans la limite de tes quotas AFK). Améliore le plafond et la vitesse avec des BossCrowns.
            </div>
          </div>
          <div style={{ fontFamily:'var(--f-num)', fontSize:'14.4px', fontWeight:700, color:'var(--cyan-hi)', flexShrink:0 }}>👑 {bossCrowns}</div>
        </div>

        {!mineOwned ? (
          <div className="panel" style={{ padding:'24px', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
            <div style={{ fontSize:'40px' }}>⛏️</div>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:'13.4px', color:'var(--text-dim)', maxWidth:420, lineHeight:1.6 }}>
              Achète la Mine pour qu&apos;elle commence à produire des gemmes automatiquement — 10 gemmes/h au départ, plafonnées à 50 gemmes stockées.
            </div>
            <button onClick={buyMine} disabled={bossCrowns < MINE_PURCHASE_COST_CROWNS} className={bossCrowns >= MINE_PURCHASE_COST_CROWNS ? 'btn-primary' : 'btn-secondary'}
              style={{ padding:'14px 28px', fontSize:15.5, letterSpacing:1, cursor: bossCrowns >= MINE_PURCHASE_COST_CROWNS ? 'pointer' : 'not-allowed', opacity: bossCrowns >= MINE_PURCHASE_COST_CROWNS ? 1 : 0.5 }}>
              ⛏️ ACHETER — 👑 {MINE_PURCHASE_COST_CROWNS}
            </button>
          </div>
        ) : (
          <>
            {/* Stockage */}
            <div className="panel panel--gold" style={{ padding:'18px 20px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
                <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12px', color:'var(--cyan-hi)', letterSpacing:'2px' }}>💎 STOCK DE LA MINE</div>
                <div style={{ fontFamily:'var(--f-num)', fontSize:'12.4px', color:'var(--text-dim)' }}>{formatNumber(ratePerHour)} gemmes/h</div>
              </div>
              <div style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:'26.8px', color:'var(--cyan-hi)', marginBottom:'8px' }}>
                {formatNumber(stored)} <span style={{ fontSize:'14.4px', color:'var(--text-dim)' }}>/ {formatNumber(cap)}</span>
              </div>
              <div className="prog-track" style={{ marginBottom:'14px' }}>
                <div className="prog-fill" style={{ width:`${fillPct}%`, background: fillPct >= 100 ? 'linear-gradient(90deg,#0891b2,#22d3ee)' : undefined }} />
              </div>
              <button onClick={collectMineGems} disabled={stored <= 0} className={stored > 0 ? 'btn-primary' : 'btn-secondary'}
                style={{ width:'100%', padding:'12px', fontSize:14.4, cursor: stored > 0 ? 'pointer' : 'not-allowed', opacity: stored > 0 ? 1 : 0.4 }}>
                💎 COLLECTER {stored > 0 ? `+${formatNumber(stored)}` : ''}
              </button>
            </div>

            {/* Améliorations */}
            <div>
              <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:12, color:'var(--text-dim)', letterSpacing:2, marginBottom:12 }}>AMÉLIORATIONS</div>
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                <UpgradeRow icon="📦" label="Plafond de stockage" current={`${formatNumber(cap)} gemmes`} next={nextCap ? `${formatNumber(nextCap)} gemmes` : null}
                  cost={capCost} affordable={capCost !== null && bossCrowns >= capCost} onBuy={upgradeMineCap} />
                <UpgradeRow icon="⚡" label="Vitesse de production" current={`${formatNumber(ratePerHour)} gemmes/h`} next={nextRate ? `${formatNumber(nextRate)} gemmes/h` : null}
                  cost={speedCost} affordable={speedCost !== null && bossCrowns >= speedCost} onBuy={upgradeMineSpeed} />
              </div>
            </div>
          </>
        )}

      </div>
    </PageScroll>
  );
}
