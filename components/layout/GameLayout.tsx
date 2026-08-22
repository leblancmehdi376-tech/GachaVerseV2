'use client';
import { useState, useEffect, useRef } from 'react';
import { useInstanceLock } from '@/hooks/useInstanceLock';
import { DuplicateTabScreen } from '@/components/system/DuplicateTabScreen';
import { SplashScreen } from '@/components/system/SplashScreen';
import { BattleZone } from '@/components/game/BattleZone';
import { UpgradesPage } from '@/components/pages/UpgradesPage';
import { CompanionsPage } from '@/components/pages/CompanionsPage';
import { GachaPage } from '@/components/pages/GachaPage';
import { QuestsPage } from '@/components/pages/QuestsPage';
import { ShopPage } from '@/components/pages/ShopPage';
import { CollectionPage } from '@/components/pages/CollectionPage';
import { EventPage } from '@/components/pages/EventPage';
import { SettingsPage } from '@/components/pages/SettingsPage';
import { LeaderboardPage } from '@/components/pages/LeaderboardPage';
import { MarketplacePage } from '@/components/pages/MarketplacePage';
import { ChampionInventoryPage } from '@/components/pages/ChampionInventoryPage';
import { AchievementsPage } from '@/components/pages/AchievementsPage';
import { ProfilePage } from '@/components/pages/ProfilePage';
import { ExpeditionsPage } from '@/components/pages/ExpeditionsPage';
import { ForgePage } from '@/components/pages/ForgePage';
import { EquipmentUpgradePage } from '@/components/pages/EquipmentUpgradePage';
import { PrestigePage } from '@/components/pages/PrestigePage';
import { AuthModal } from '@/components/layout/AuthModal';
import { UltAnimation } from '@/components/game/UltAnimation';
import { MusicPlayer } from '@/components/game/MusicPlayer';
import { useGameStore, getPalierPassGems } from '@/store/gameStore';
import { useAuth } from '@/hooks/useAuth';
import { useCloudSave } from '@/hooks/useCloudSave';
import { useDpsTick } from '@/hooks/useDpsTick';
import { formatNumber } from '@/lib/game/format';
import { getPalierConfig } from '@/types/game';
import { useIsMobile } from '@/hooks/useIsMobile';
import { WelcomeBackModal } from '@/components/game/WelcomeBackModal';

import type { OfflineGain } from '@/store/gameStore';
import { NAV_ICONS } from '@/components/ui/NavIcons';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { PageTransition } from '@/components/ui/PageTransition';
import { BossVictoryScreen } from '@/components/game/BossVictoryScreen';
import { toast } from '@/hooks/useToast';
import { useAchievementStore, trackBossKills, trackBossCrowns, trackPalier, trackCoins, trackDps, trackCollection, trackEquippedTeam, trackKills, trackQuestsCompleted, trackUpgrades, trackGems, trackPrestige, trackVoidOrbs, trackUnlockedTitles, trackGachaPulls, trackShinyEditions, trackRank7, trackSynergyMax } from '@/store/achievementStore';
import { makeInstanceKey } from '@/lib/game/editions';

type Page = 'home' | 'upgrades' | 'companions' | 'collection' | 'gacha' | 'shop' | 'quests' | 'events' | 'settings' | 'leaderboard' | 'marketplace' | 'champions' | 'achievements' | 'profile' | 'expeditions' | 'forge' | 'prestige' | 'equipment';

type NavItem = { id: Page; label: string; accent?: string };

// Navigation groupée par catégorie (barre latérale).
// CLASSEMENT / QUÊTES / PARAMÈTRES n'y figurent pas : ils sont déjà dans la
// barre du haut (et rajoutés ici uniquement sur mobile, où elle est masquée).
const NAV_GROUPS: { title?: string; items: NavItem[] }[] = [
  { items: [
    { id:'home',         label:'ACCUEIL',         accent:'var(--purple-glow)' },
  ]},
  { title:'ÉQUIPE', items: [
    { id:'companions',   label:'COMPAGNONS',      accent:'var(--purple-hi)'     },
    { id:'equipment',    label:'ÉQUIPEMENT',      accent:'#93c5fd'            },
    { id:'collection',   label:'COLLECTION',      accent:'#60a5fa'            },
  ]},
  { title:'PROGRESSION', items: [
    { id:'upgrades',     label:'AMÉLIORATIONS',   accent:'var(--gold)'          },
    { id:'prestige',     label:'PRESTIGE',        accent:'var(--purple-glow)'   },
    { id:'achievements', label:'SUCCÈS',          accent:'#fbbf24'            },
  ]},
  { title:'ACTIVITÉS', items: [
    { id:'events',       label:'ÉVÉNEMENTS',      accent:'#fbbf24'            },
    { id:'expeditions',  label:'EXPÉDITIONS',     accent:'#fb923c'            },
    { id:'champions',    label:'INV. CHAMPIONS',  accent:'#fbbf24'            },
  ]},
  { title:'ÉCONOMIE', items: [
    { id:'gacha',        label:'GACHA',           accent:'var(--cyan-hi)'       },
    { id:'shop',         label:'BOUTIQUE',        accent:'#4ade80'            },
    { id:'marketplace',  label:'HÔTEL DE VILLE',  accent:'#f97316'            },
    { id:'forge',        label:'FORGE',           accent:'#e879f9'            },
  ]},
  { title:'COMPTE', items: [
    { id:'profile',      label:'PROFIL',          accent:'var(--purple-glow)'   },
  ]},
];

// Raccourcis ajoutés à la barre latérale uniquement sur mobile.
const NAV_MOBILE_EXTRA: NavItem[] = [
  { id:'quests',       label:'QUÊTES',          accent:'#34d399'            },
  { id:'leaderboard',  label:'CLASSEMENT',      accent:'#fbbf24'            },
  { id:'settings',     label:'PARAMÈTRES',      accent:'var(--text-sub)'    },
];

// Liste à plat : sert à retrouver le libellé/accent de la page courante.
const NAV: NavItem[] = [...NAV_GROUPS.flatMap(g => g.items), ...NAV_MOBILE_EXTRA];

// Pages qui affichent la zone de combat (pas de panel central)
const COMBAT_PAGES: Page[] = ['home'];

export function GameLayout() {
  useDpsTick();
  const { status: instanceStatus, requestTakeover } = useInstanceLock();
  const [page,          setPage]          = useState<Page>('home');
  const [showAuth,      setShowAuth]      = useState(false);
  const [splashDone,    setSplashDone]    = useState(false);
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Sélectionne une page et referme le tiroir mobile
  const goToPage = (p: Page) => { setPage(p); setDrawerOpen(false); };
  const [victory, setVictory] = useState<{ palier: number; gems: number; coins: number } | null>(null);
  const { pixelCoins, nekoGems, palier, wave, maxPalierReached, quests, ensureDailyQuests, ensureWeeklyQuests, username, lastEquipmentDrop, setLastEquipmentDrop, lastBossVictory, clearBossVictory, focusedExpeditionId } = useGameStore();
  const { user, logout, kickedOut, dismissKickedOut } = useAuth();
  const { forceSave, loaded: cloudLoaded } = useCloudSave(user?.uid ?? null);

  // Navigation Forge → Expéditions : dès qu'un ingrédient à récolter est
  // "focusé", on bascule automatiquement sur la page Expéditions (qui se
  // charge ensuite d'afficher le bon onglet et de surligner la carte).
  useEffect(() => {
    if (focusedExpeditionId) goToPage('expeditions');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedExpeditionId]);

  const cfg = getPalierConfig(palier);
  const isCombat = COMBAT_PAGES.includes(page);
  const progressPct = Math.round((wave / 10) * 100);
  const currentNav = NAV.find(n => n.id === page)!;

  // Quêtes réclamables
  const claimable = (quests ?? []).filter((q: { current: number; target: number; done: boolean }) => q.current >= q.target && !q.done).length;

  // ── Réhydratation locale (Zustand persist / localStorage) ─────────────────
  const [hasHydrated, setHasHydrated] = useState(() => useGameStore.persist?.hasHydrated?.() ?? false);
  useEffect(() => {
    if (hasHydrated) return;
    if (!useGameStore.persist) { setHasHydrated(true); return; } // pas de persist (SSR/fallback) : ne bloque rien
    const unsub = useGameStore.persist.onFinishHydration(() => setHasHydrated(true));
    // Sécurité : si la réhydratation était déjà finie entre le calcul initial
    // du useState et le montage de cet effet, on ne resterait pas bloqué.
    if (useGameStore.persist.hasHydrated()) setHasHydrated(true);
    return unsub;
  }, [hasHydrated]);

  // Vérifie/réinitialise les quêtes quotidiennes et hebdomadaires une fois au montage
  // (couvre toutes les pages). IMPORTANT : on attend hasHydrated ET cloudLoaded avant
  // de comparer questsDayKey à la date du jour — sinon, sur un appareil qui a déjà une
  // sauvegarde locale périmée (questsDayKey d'hier), ce check se déclenche AVANT que la
  // vraie progression cloud n'ait été appliquée, réinitialise les quêtes localement, et
  // ce reset est ensuite re-synchronisé vers le cloud en écrasant la progression réelle.
  useEffect(() => {
    if (!hasHydrated || !cloudLoaded) return;
    ensureDailyQuests();
    ensureWeeklyQuests();
  }, [hasHydrated, cloudLoaded, ensureDailyQuests, ensureWeeklyQuests]);

  // ── Gains hors-ligne : calcul unique une fois le splash terminé ───────────
  // IMPORTANT : on attend aussi la fin de la réhydratation Zustand (localStorage),
  // sinon lastActiveAt peut encore valoir sa valeur par défaut ("maintenant") au
  // lieu de la vraie dernière session — le calcul croirait alors qu'on vient de
  // jouer il y a une seconde, et ne renverrait jamais de récap.
  // On attend AUSSI la fin du chargement cloud (cloudLoaded) : sinon le crédit
  // hors-ligne (pixelCoins/nekoGems) peut être écrasé juste après par
  // loadAndApply si celui-ci résout après coup — le joueur voyait alors la
  // popup de récompense sans jamais recevoir le gain affiché.
  const [offlineGain, setOfflineGain] = useState<OfflineGain | null>(null);
  const offlineClaimedRef = useRef(false);
  useEffect(() => {
    if (!hasHydrated || !cloudLoaded || offlineClaimedRef.current) return;
    offlineClaimedRef.current = true;
    const g = useGameStore.getState().claimOfflineEarnings();
    if (g && (g.coins > 0 || g.gems > 0 || g.kills > 0)) setOfflineGain(g);
  }, [hasHydrated, cloudLoaded]);

  // Écran de victoire : piloté par un VRAI événement de kill de boss émis par le
  // store (et non par une surveillance du palier, qui se déclenchait à tort au
  // rechargement de la sauvegarde).
  useEffect(() => {
    if (!lastBossVictory) return;
    setVictory({ palier: lastBossVictory.palier, gems: lastBossVictory.gems, coins: lastBossVictory.coins });
    clearBossVictory();
  }, [lastBossVictory, clearBossVictory]);

  // Watch equipment drops → toast
  useEffect(() => {
    if (!lastEquipmentDrop) return;
    toast.loot('Équipement trouvé !', lastEquipmentDrop);
    setLastEquipmentDrop(null);
  }, [lastEquipmentDrop, setLastEquipmentDrop]);

  // Watch quest completions → toast
  const prevClaimableRef = useRef(claimable);
  useEffect(() => {
    if (claimable > prevClaimableRef.current) {
      toast.quest('Quête accomplie !', 'Récupère ta récompense →');
    }
    prevClaimableRef.current = claimable;
  }, [claimable]);

  // ── Achievement trackers ─────────────────────────────────────────────────
  const totalDps = useGameStore(s => s.getTotalDps());
  const { collection: col, equippedTeam, totalKills, totalQuestsCompleted, totalUpgradesPerformed, totalGachaPulls, totalBossKills, totalBossCrownsEarned, totalVoidOrbsEarned } = useGameStore();
  const { CHARACTER_POOL: charPool } = require('@/lib/game/characters');
  const { computeActiveSynergies } = require('@/lib/game/synergies');
  const { usePrestigeStore } = require('@/store/prestigeStore');
  const { useAchievementStore: useAchStoreForTitles } = require('@/store/achievementStore');
  const prestigeLevel = usePrestigeStore((s: { level: number }) => s.level);
  const unlockedTitlesCount = useAchStoreForTitles((s: { unlockedTitles: string[] }) => s.unlockedTitles.length);
  useEffect(() => { trackBossKills(totalBossKills); }, [totalBossKills]);
  useEffect(() => { trackBossCrowns(totalBossCrownsEarned); }, [totalBossCrownsEarned]);
  useEffect(() => { trackPalier(maxPalierReached); }, [maxPalierReached]);
  useEffect(() => { trackCoins(pixelCoins); }, [pixelCoins]);
  useEffect(() => { trackGems(nekoGems); }, [nekoGems]);
  useEffect(() => { trackPrestige(prestigeLevel); }, [prestigeLevel]);
  useEffect(() => { trackVoidOrbs(totalVoidOrbsEarned); }, [totalVoidOrbsEarned]);
  useEffect(() => { trackUnlockedTitles(unlockedTitlesCount); }, [unlockedTitlesCount]);
  useEffect(() => { trackGachaPulls(totalGachaPulls); }, [totalGachaPulls]);
  useEffect(() => {
    const active = computeActiveSynergies(equippedTeam);
    const hasMax = active.some((a: { def: { thresholds: unknown[] }; threshold: unknown }) =>
      a.threshold === a.def.thresholds[a.def.thresholds.length - 1]
    );
    trackSynergyMax(hasMax);
  }, [equippedTeam]);
  useEffect(() => { trackDps(totalDps); }, [totalDps]);
  useEffect(() => { trackKills(totalKills); }, [totalKills]);
  useEffect(() => { trackQuestsCompleted(totalQuestsCompleted); }, [totalQuestsCompleted]);
  useEffect(() => { trackUpgrades(totalUpgradesPerformed); }, [totalUpgradesPerformed]);
  useEffect(() => {
    // Possédé si N'IMPORTE QUELLE édition l'est (Base/Or/Diamant) — sinon un
    // perso obtenu uniquement en shiny ne compterait pas pour ces succès.
    const owned = charPool.filter((c: {id: string}) =>
      (['base', 'gold', 'diamond'] as const).some(ed => !!col[makeInstanceKey(c.id, ed)])
    );
    const hasL  = owned.some((c: {rarity: string}) => ['L','M','S','CO','P','T'].includes(c.rarity));
    const hasT  = owned.some((c: {rarity: string}) => c.rarity === 'T');
    const transcendantCount = owned.filter((c: {rarity: string}) => c.rarity === 'T').length;
    trackCollection(owned.length, hasL, hasT, charPool.length, transcendantCount);
    trackEquippedTeam(equippedTeam.filter(Boolean).length);

    // Éditions shiny : scan direct des instances de collection (les clés
    // composites "id::gold"/"id::diamond" encodent déjà l'édition).
    const instances = Object.values(col) as { templateId: string; edition?: string; rank: number }[];
    const goldOrDiamond = instances.filter(o => o.edition === 'gold' || o.edition === 'diamond');
    const hasGold    = instances.some(o => o.edition === 'gold');
    const hasDiamond = instances.some(o => o.edition === 'diamond');
    const diamondTemplates = new Set(instances.filter(o => o.edition === 'diamond').map(o => o.templateId));
    // Trio parfait : un templateId présent avec ses 3 éditions à la fois.
    const byTemplate: Record<string, Set<string>> = {};
    for (const o of instances) (byTemplate[o.templateId] ??= new Set()).add(o.edition ?? 'base');
    const trioTemplates = Object.values(byTemplate).filter(s => s.has('base') && s.has('gold') && s.has('diamond'));
    const hasTrio = trioTemplates.length > 0;
    trackShinyEditions(goldOrDiamond.length, hasGold, hasDiamond, diamondTemplates.size, hasTrio, trioTemplates.length);

    // Rangs 7★ : combien de personnages DIFFÉRENTS au rang max (dédupliqué par
    // templateId, une même carte en plusieurs éditions ne doit compter qu'une
    // fois), et l'équipe entière l'est-elle ?
    const count7Star = new Set(instances.filter(o => o.rank >= 7).map(o => o.templateId)).size;
    const fullTeamRank7 = equippedTeam.length === 4 && equippedTeam.every(id => id && col[id]?.rank >= 7);
    trackRank7(count7Star, fullTeamRank7);
  }, [col, equippedTeam, charPool]);

  // Bloquer les multi-instances
  if (instanceStatus === 'duplicate' || instanceStatus === 'takeover') {
    return <DuplicateTabScreen onTakeover={requestTakeover} isTakingOver={instanceStatus === 'takeover'} />;
  }

  // Session conflict : plusieurs appareils/ navigateurs utilisent le même compte.
  if (user && kickedOut) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'radial-gradient(circle at center, rgba(168,85,247,0.18), rgba(2,6,23,1) 52%)', padding:'24px' }}>
        <div style={{ width:'min(560px, 92vw)', background:'rgba(12,10,30,0.92)', border:'1px solid rgba(192,132,252,0.45)', borderRadius:'20px', boxShadow:'0 0 40px rgba(168,85,247,0.35)', padding:'28px 26px', textAlign:'center' }}>
          <div style={{ fontSize:'51.5px', marginBottom:'14px' }}>🚫</div>
          <div style={{ fontFamily:'var(--f-title)', fontSize:'28.8px', fontWeight:900, letterSpacing:'2px', color:'#f5d0fe', marginBottom:'12px' }}>CONNEXION BLOQUÉE</div>
          <div style={{ fontFamily:'var(--f-ui)', fontSize:'16.5px', lineHeight:1.6, color:'var(--text-sub)', marginBottom:'22px' }}>
            Ce compte est déjà actif sur un autre appareil ou navigateur.<br />
            Pour éviter les doubles sessions, l’accès au jeu est refusé tant que la session conflictuelle reste ouverte.
          </div>
          <button
            onClick={async () => { dismissKickedOut(); await logout(); }}
            style={{ background:'linear-gradient(135deg,#7c3aed,#a855f7)', border:'none', borderRadius:'12px', padding:'14px 22px', fontFamily:'var(--f-ui)', fontWeight:800, fontSize:'14.4px', color:'white', cursor:'pointer', boxShadow:'0 12px 28px rgba(168,85,247,0.35)' }}
          >
            SE DÉCONNECTER ET REESSAYER
          </button>
        </div>
      </div>
    );
  }

  // Splash screen au premier chargement
  if (!splashDone) {
    return <SplashScreen onComplete={() => setSplashDone(true)} />;
  }

  return (
    <div className="cosmic-bg" style={{ width:'100vw', height:'100dvh', display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>

      {/* Champ d'étoiles ambiant (derrière tout le contenu) */}
      <div className="starfield" style={{ position:'absolute', inset:0, zIndex:0, pointerEvents:'none' }} />

      {/* ══ VICTORY SCREEN ═══════════════════════════════════════════════ */}
      {victory && (
        <BossVictoryScreen
          palier={victory.palier}
          gemsEarned={victory.gems}
          coinsEarned={victory.coins}
          onClose={() => setVictory(null)}
        />
      )}

      {/* ══ TOAST NOTIFICATIONS ══════════════════════════════════════════ */}
      <ToastContainer />

      {/* ══ TOP BAR ══════════════════════════════════════════════════════ */}
      <header style={{ height:'56px', flexShrink:0, display:'flex', alignItems:'center', background:'linear-gradient(180deg,#0a0818,var(--bg-dark))', borderBottom:'1px solid var(--border)', padding:isMobile?'0 12px':'0 20px', gap:isMobile?'10px':'16px', zIndex:30, boxShadow:'0 2px 24px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.03)', position:'relative' }}>
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'1px', background:'linear-gradient(90deg,transparent,rgba(147,51,234,0.3),transparent)' }} />

        {/* Hamburger (mobile) */}
        {isMobile && (
          <button onClick={() => setDrawerOpen(v => !v)} aria-label="Menu"
            style={{ flexShrink:0, width:38, height:38, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,0.04)', border:'1px solid var(--border-lit)', borderRadius:'8px', cursor:'pointer', color:'var(--purple-glow)', fontSize:18.5, lineHeight:1 }}>
            ☰
          </button>
        )}

        {/* Logo */}
        <div style={{ width:isMobile?'auto':'200px', flexShrink:0 }}>
          <div style={{ fontFamily:'var(--f-title)', fontSize:isMobile?'15.5px':'18.5px', fontWeight:900, letterSpacing:isMobile?'1.5px':'3px', background:'linear-gradient(90deg,#e879f9,#c084fc,#9333ea)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', lineHeight:1, filter:'drop-shadow(0 0 12px rgba(147,51,234,0.35))' }}>
            GACHAVERSE
          </div>
          {!isMobile && <div style={{ fontFamily:'var(--f-num)', fontSize:'12px', color:'var(--text-muted)', letterSpacing:'4px', marginTop:'3px' }}>MULTIVERS RPG</div>}
        </div>

        {/* Avatar / Bouton connexion */}
        <button onClick={() => setShowAuth(true)}
          style={{ display:'flex', alignItems:'center', gap:'10px',
            background: user ? 'var(--bg-card)' : 'linear-gradient(135deg,#3b0764,#6d28d9)',
            border: user ? '1px solid var(--border)' : '1px solid #c084fc',
            borderRadius:'10px', padding:'5px 14px 5px 6px', cursor:'pointer',
            transition:'all 0.15s', flexShrink:0,
            boxShadow: user ? 'none' : '0 0 16px rgba(168,85,247,0.4)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.filter = 'brightness(1.15)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.filter = 'none'}>
          <div style={{ width:36, height:36, background:'linear-gradient(135deg,#3b0764,#6d28d9)', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18.5px', border:'1px solid var(--purple-dim)', boxShadow:'0 0 12px rgba(109,40,217,0.35)', flexShrink:0 }}>🐱</div>
          {!isMobile && <div style={{ textAlign:'left' }}>
            {user ? (<>
              <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'13.4px', color:'var(--text)', lineHeight:1.2 }}>{username || user.email?.split('@')[0]}</div>
              <div style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-dim)', lineHeight:1 }}>Palier {palier} — Vague {wave}/10</div>
            </>) : (<>
              <div style={{ fontFamily:'var(--f-ui)', fontWeight:800, fontSize:'13.4px', color:'#e9d5ff', lineHeight:1.2, letterSpacing:'0.5px' }}>SE CONNECTER</div>
              <div style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'rgba(233,213,255,0.6)', lineHeight:1 }}>ou créer un compte</div>
            </>)}
          </div>}
        </button>

        {/* Ressources */}
        <div style={{ display:'flex', gap:isMobile?'6px':'8px', marginLeft:isMobile?'auto':undefined, minWidth:0 }}>
          {[
            { icon:'🪙', val:formatNumber(pixelCoins), color:'var(--gold)',  bg:'rgba(120,53,15,0.22)',  border:'rgba(245,158,11,0.35)'  },
            { icon:'💎', val:formatNumber(nekoGems),   color:'var(--cyan-hi)',  bg:'rgba(6,182,212,0.15)',    border:'rgba(34,211,238,0.35)' },
          ].map((r,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:isMobile?'4px':'7px', background:r.bg, border:`1px solid ${r.border}`, borderRadius:'20px', padding:isMobile?'4px 10px':'5px 16px', cursor:'pointer', transition:'all 0.15s', boxShadow:`inset 0 1px 0 rgba(255,255,255,0.06)` }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.filter = 'brightness(1.2)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.filter = 'none'}>
              <span style={{ fontSize:isMobile?'13.4px':'15.5px' }}>{r.icon}</span>
              <span style={{ fontFamily:'var(--f-num)', fontWeight:700, fontSize:isMobile?'12.4px':'14.4px', color:r.color }}>{r.val}</span>
              {!isMobile && <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'15.5px', color:r.color, opacity:0.45 }}>+</span>}
            </div>
          ))}
        </div>

        {/* Breadcrumb page */}
        {!isMobile && <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'5px 14px', background:'rgba(255,255,255,0.03)', border:'1px solid var(--border)', borderRadius:'8px' }}>
          {(() => { const Icon = NAV_ICONS[currentNav.id]; return Icon ? <Icon size={14} color={currentNav.accent ?? 'var(--text-sub)'} /> : null; })()}
          <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12.4px', color: currentNav.accent ?? 'var(--text-sub)', letterSpacing:'1px' }}>{currentNav.label}</span>
        </div>}

        {/* Icônes droite */}
        {!isMobile && <div style={{ marginLeft:'auto', display:'flex', gap:'6px', alignItems:'center' }}>
          {([
            { id:'leaderboard', label:'CLASSEMENT' },
            { id:'quests',      label:'QUÊTES'     },
            { id:'settings',    label:'OPTIONS'    },
          ] as { id: Page; label: string }[]).map(n => {
            const Icon = NAV_ICONS[n.id];
            return (
            <button key={n.label} onClick={() => setPage(n.id)}
              style={{ background:'none', border:'1px solid transparent', borderRadius:'8px', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:'2px', padding:'5px 10px', color:'var(--text-dim)', transition:'all 0.15s', position:'relative' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color='var(--text-sub)'; (e.currentTarget as HTMLElement).style.borderColor='var(--border)'; (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.03)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color='var(--text-dim)'; (e.currentTarget as HTMLElement).style.borderColor='transparent'; (e.currentTarget as HTMLElement).style.background='none'; }}>
              {Icon && <Icon size={18} color="currentColor" />}
              <span style={{ fontFamily:'var(--f-ui)', fontSize:'12px', fontWeight:600, letterSpacing:'0.5px' }}>{n.label}</span>
              {n.id === 'quests' && claimable > 0 && (
                <div style={{ position:'absolute', top:'2px', right:'2px', width:14, height:14, background:'#ef4444', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--f-num)', fontWeight:700, fontSize:'12px', color:'white', border:'1px solid var(--bg-dark)' }}>
                  {claimable}
                </div>
              )}
            </button>
            );
          })}
        </div>}
      </header>

      {/* ══ MAIN ══════════════════════════════════════════════════════════ */}
      <div style={{ flex:1, display:'flex', overflow:'hidden', position:'relative', zIndex:1 }}>

        {/* Backdrop du tiroir (mobile) */}
        {isMobile && drawerOpen && (
          <div onClick={() => setDrawerOpen(false)}
            style={{ position:'absolute', inset:0, zIndex:40, background:'rgba(3,2,8,0.78)' }} />
        )}

        {/* ── SIDEBAR GAUCHE (tiroir sur mobile) ─────────────────────────── */}
        <aside style={{
            width:'210px', flexShrink:0,
            background:'linear-gradient(180deg,var(--bg-dark) 0%,var(--bg-void) 100%)',
            borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column',
            padding:'10px 8px', gap:'2px', overflowY:'auto',
            boxShadow: isMobile ? '4px 0 30px rgba(0,0,0,0.6)' : 'inset -1px 0 0 rgba(255,255,255,0.02)',
            ...(isMobile ? {
              position:'absolute' as const, top:0, bottom:0, left:0, zIndex:41,
              transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition:'transform 0.25s ease',
            } : {}),
          }}>
          {(isMobile ? [...NAV_GROUPS, { title:'RACCOURCIS', items: NAV_MOBILE_EXTRA }] : NAV_GROUPS).map((group, gi) => (
            <div key={gi} style={{ display:'flex', flexDirection:'column', gap:2 }}>
              {group.title && (
                <div style={{ fontFamily:'var(--f-ui)', fontSize:12, fontWeight:800, letterSpacing:2, color:'var(--text-muted)', padding:'10px 12px 4px', textTransform:'uppercase' }}>
                  {group.title}
                </div>
              )}
              {group.items.map(item => {
                const Icon = NAV_ICONS[item.id];
                const isActive = page === item.id;
                return (
                <div key={item.id} className={`nav-item${isActive?' active':''}`}
                  onClick={() => goToPage(item.id)}
                  style={{ position:'relative' }}>
                  <span style={{ width:'22px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color: isActive ? item.accent ?? 'var(--purple-glow)' : 'currentColor', transition:'color 0.15s' }}>
                    {Icon && <Icon size={17} color="currentColor" />}
                  </span>
                  <span>{item.label}</span>
                  {/* Badge quêtes */}
                  {item.id === 'quests' && claimable > 0 && (
                    <div style={{ position:'absolute', right:'10px', width:18, height:18, background:'linear-gradient(135deg,#dc2626,#ef4444)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--f-num)', fontWeight:700, fontSize:12, color:'white', boxShadow:'0 0 8px rgba(239,68,68,0.6)' }}>{claimable}</div>
                  )}
                </div>
                );
              })}
            </div>
          ))}

          <div style={{ flex:1 }} />

          {/* Événement */}
          <div style={{ background:'linear-gradient(160deg,#150a28,#1e0e38)', border:'1px solid var(--border-glow)', borderRadius:'12px', padding:'14px', marginTop:'8px', position:'relative', overflow:'hidden', boxShadow:'0 0 20px rgba(124,58,237,0.08), inset 0 1px 0 rgba(255,255,255,0.04)' }}>
            <div style={{ position:'absolute', top:'-15px', right:'-15px', width:'80px', height:'80px', background:'radial-gradient(circle,rgba(168,85,247,0.16),transparent)', borderRadius:'50%' }} />
            <div style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--purple-glow)', fontWeight:700, letterSpacing:'1.5px', marginBottom:'5px' }}>★ ÉVÉNEMENT</div>
            <div style={{ fontFamily:'var(--f-title)', fontSize:'12.4px', color:'var(--text)', fontWeight:700, letterSpacing:'1px', marginBottom:'6px', lineHeight:1.3 }}>BOSS DES OMBRES</div>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-dim)', lineHeight:1.5 }}>Vaincs le boss de chaque palier pour des récompenses exclusives</div>
            <div style={{ marginTop:'8px', fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-dim)', display:'flex', alignItems:'center', gap:'5px' }}>
              <span>⏰</span><span>Permanent</span>
            </div>
          </div>
        </aside>

        {/* ── CONTENU CENTRAL ───────────────────────────────────────────── */}
        <div style={{ flex:'1 1 0', minWidth:0, display:'flex', overflow:'hidden' }}>

          {/* Zone combat — visible seulement en Accueil */}
          {isCombat ? (
            <div style={{ flex:1, display:'flex', flexDirection:isMobile?'column':'row', gap:'10px', padding:isMobile?'8px':'10px', overflow:isMobile?'auto':'hidden' }}>
              {/* Combat */}
              <div style={{ flex:isMobile?'none':'1 1 0', minWidth:0, minHeight:isMobile?'62vh':undefined }}>
                <BattleZone />
              </div>
              {/* Sidebar droite de combat (passe en dessous sur mobile) */}
              <aside style={{ width:isMobile?'100%':'260px', flexShrink:0, display:'flex', flexDirection:'column', gap:'10px', overflowY:isMobile?'visible':'auto' }}>
                <ProgressCard palier={palier} wave={wave} progressPct={progressPct} cfg={cfg} />
                <QuestsCard quests={quests} claimQuest={useGameStore.getState().claimQuest} />
                <StatsCard maxPalierReached={maxPalierReached} />
              </aside>
            </div>
          ) : (
            /* Pages */
            <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
              {/* Page header */}
              <div style={{ padding:isMobile?'12px 16px 10px':'16px 28px 12px', borderBottom:'1px solid var(--border)', background:'linear-gradient(180deg,var(--bg-dark),transparent)', flexShrink:0, display:'flex', alignItems:'center', gap:'10px' }}>
                <div style={{ width:'4px', height:'18px', background:`linear-gradient(180deg,${currentNav.accent??'var(--purple-hi)'},transparent)`, borderRadius:'2px', boxShadow:`0 0 8px ${currentNav.accent??'var(--purple-hi)'}` }} />
                {(() => { const Icon = NAV_ICONS[currentNav.id]; return Icon ? <span style={{ color: currentNav.accent ?? 'var(--purple-hi)', display:'flex' }}><Icon size={20} color="currentColor" /></span> : null; })()}
                <span style={{ fontFamily:'var(--f-title)', fontSize:'16.5px', fontWeight:700, color:currentNav.accent??'var(--text)', letterSpacing:'2px' }}>{currentNav.label}</span>
              </div>
              <div style={{ flex:1, overflow:'hidden' }}>
                <PageTransition pageKey={page}>
                  {page === 'upgrades'   && <UpgradesPage />}
                  {page === 'companions' && <CompanionsPage />}
                  {page === 'collection' && <CollectionPage />}
                  {page === 'gacha'      && <GachaPage />}
                  {page === 'shop'       && <ShopPage />}
                  {page === 'quests'     && <QuestsPage />}
                  {page === 'events'     && <EventPage />}
                  {page === 'settings'     && <SettingsPage onForceSave={forceSave} />}
                  {page === 'leaderboard'  && <LeaderboardPage />}
                  {page === 'marketplace'  && <MarketplacePage />}
                  {page === 'champions'    && <ChampionInventoryPage />}
                  {page === 'achievements' && <AchievementsPage />}
                  {page === 'expeditions' && <ExpeditionsPage />}
                  {page === 'forge'       && <ForgePage />}
                  {page === 'equipment'   && <EquipmentUpgradePage />}
                  {page === 'prestige'    && <PrestigePage />}
                  {page === 'profile'     && <ProfilePage />}
                </PageTransition>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {offlineGain && <WelcomeBackModal gain={offlineGain} onClose={() => setOfflineGain(null)} />}
      <UltAnimation />
      <MusicPlayer />
    </div>
  );
}

/* ── Sous-composants sidebar droite combat ─────────────────────────── */
function ProgressCard({ palier, wave, progressPct, cfg }: { palier: number; wave: number; progressPct: number; cfg: ReturnType<typeof getPalierConfig> }) {
  return (
    <div className="panel" style={{ padding:'14px', flexShrink:0 }}>
      <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12px', color:'var(--text-dim)', letterSpacing:'2px', marginBottom:'10px' }}>PROGRESSION</div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
        <div>
          <div style={{ fontFamily:'var(--f-num)', fontSize:'12px', color:'var(--text-dim)', fontWeight:700 }}>PALIER {palier}</div>
          <div style={{ fontFamily:'var(--f-title)', fontSize:'14.4px', color:'var(--text)', fontWeight:700, letterSpacing:'1px', marginTop:'2px', lineHeight:1.2 }}>{cfg.name}</div>
        </div>
        <div style={{ width:40, height:40, background:`${cfg.accentColor}18`, border:`1px solid ${cfg.accentColor}44`, borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20.6px' }}>📦</div>
      </div>
      <div className="prog-track" style={{ marginBottom:'6px' }}>
        <div className="prog-fill" style={{ width:`${progressPct}%` }} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
        <span style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-dim)', fontWeight:600 }}>Vague {wave}/10</span>
        <span style={{ fontFamily:'var(--f-num)', fontSize:'12.4px', color:'var(--purple-glow)', fontWeight:700 }}>{progressPct}%</span>
      </div>
      <div style={{ background:'rgba(255,255,255,0.025)', border:'1px solid var(--border)', borderRadius:'6px', padding:'6px 10px', display:'flex', alignItems:'center', gap:'8px' }}>
        <span style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-dim)' }}>Récompense :</span>
        <span style={{ fontFamily:'var(--f-num)', fontWeight:700, fontSize:'13.4px', color:'var(--cyan-hi)' }}>💎 ×{getPalierPassGems(palier)}</span>
      </div>
    </div>
  );
}

function QuestsCard({ quests, claimQuest }: { quests: { id:string; icon:string; label:string; current:number; target:number; reward:number; rewardType:string; done:boolean }[]; claimQuest: (id: string) => void }) {
  return (
    <div className="panel" style={{ padding:'14px', flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
      <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12px', color:'var(--text-dim)', letterSpacing:'2px', marginBottom:'10px', flexShrink:0 }}>QUÊTES QUOTIDIENNES</div>
      <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'8px' }}>
        {(quests ?? []).map(q => {
          const pct = Math.min((q.current/q.target)*100, 100);
          const canClaim = q.current >= q.target && !q.done;
          return (
            <div key={q.id} style={{ background:'var(--bg-card)', border:`1px solid ${canClaim?'rgba(168,85,247,0.4)':q.done?'rgba(74,222,128,0.2)':'var(--border)'}`, borderRadius:'8px', padding:'10px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'7px', gap:'8px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'6px', flex:1, minWidth:0 }}>
                  <span style={{ fontSize:'14.4px', flexShrink:0 }}>{q.icon}</span>
                  <span style={{ fontFamily:'var(--f-ui)', fontWeight:600, fontSize:'12.4px', color:'var(--text-sub)', lineHeight:1.3 }}>{q.label}</span>
                </div>
                {q.done ? <span style={{ fontSize:'16.5px', flexShrink:0 }}>✅</span>
                  : canClaim ? (
                    <button onClick={() => claimQuest(q.id)}
                      style={{ background:'linear-gradient(135deg,#3b0764,#5b21b6)', border:'1px solid var(--purple)', borderRadius:'6px', padding:'4px 10px', cursor:'pointer', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12px', color:'white', flexShrink:0, boxShadow:'0 0 8px rgba(124,58,237,0.35)', whiteSpace:'nowrap' }}>
                      RÉCUP
                    </button>
                  ) : (
                    <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12px', color:'var(--gold)', background:'rgba(245,166,35,0.1)', border:'1px solid rgba(245,166,35,0.2)', padding:'2px 7px', borderRadius:'5px', flexShrink:0, whiteSpace:'nowrap' }}>
                      {q.rewardType==='gems'?'💎':'🪙'} {q.reward}
                    </span>
                  )
                }
              </div>
              <div style={{ height:'5px', background:'rgba(255,255,255,0.05)', borderRadius:'3px', overflow:'hidden', marginBottom:'4px' }}>
                <div style={{ height:'100%', width:`${pct}%`, background:q.done?'linear-gradient(90deg,#166534,#4ade80)':'linear-gradient(90deg,#4c1d95,#a855f7)', borderRadius:'3px', transition:'width 0.3s', boxShadow:canClaim?'0 0 6px #a855f766':undefined }} />
              </div>
              <div style={{ fontFamily:'var(--f-ui)', fontSize:'12px', color:'var(--text-dim)', textAlign:'right', fontWeight:600 }}>{q.current}/{q.target}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatsCard({ maxPalierReached }: { maxPalierReached: number }) {
  return (
    <div className="panel" style={{ padding:'12px', flexShrink:0 }}>
      <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'12px', color:'var(--text-dim)', letterSpacing:'2px', marginBottom:'8px' }}>STATISTIQUES</div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 0', borderTop:'1px solid var(--border)' }}>
        <span style={{ fontFamily:'var(--f-ui)', fontSize:'12.4px', color:'var(--text-dim)' }}>Palier max atteint</span>
        <span style={{ fontFamily:'var(--f-num)', fontWeight:900, fontSize:'16.5px', color:'var(--purple-glow)' }}>{maxPalierReached}</span>
      </div>
    </div>
  );
}

function PlaceholderPage({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'16px', opacity:0.5 }}>
      <span style={{ fontSize:'57.7px' }}>{icon}</span>
      <span style={{ fontFamily:'var(--f-title)', fontSize:'18.5px', color:'var(--text-dim)', letterSpacing:'2px' }}>{title}</span>
      <span style={{ fontFamily:'var(--f-ui)', fontSize:'13.4px', color:'var(--text-muted)', maxWidth:'300px', textAlign:'center', lineHeight:1.6 }}>{desc}</span>
    </div>
  );
}
