'use client';
import { useState, useEffect, useRef, lazy, Suspense, useTransition } from 'react';
import { preload } from 'react-dom';
import { useInstanceLock } from '@/hooks/useInstanceLock';
import { DuplicateTabScreen } from '@/components/system/DuplicateTabScreen';
import { SplashScreen } from '@/components/system/SplashScreen';
import { BattleZone } from '@/components/game/BattleZone';
import { AuthModal } from '@/components/layout/AuthModal';
import { PlayerAvatar } from '@/components/layout/PlayerAvatar';
import { UltAnimation } from '@/components/game/UltAnimation';
import { AchievementUnlockBanner } from '@/components/game/AchievementUnlockBanner';
import { SecretsLayer } from '@/components/game/SecretsLayer';
import { EGG, pageStatKey } from '@/lib/game/achievements';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore, type Quest } from '@/store/gameStore';
import { useDisplaySettingsStore } from '@/store/displaySettingsStore';
import { getCompadexProgress } from '@/lib/game/compadex';
import { useAuth } from '@/hooks/useAuth';
import { useCloudSave } from '@/hooks/useCloudSave';
import { formatSyncStatus } from '@/lib/firebase/cloudSaveSync';
import { useDpsTick } from '@/hooks/useDpsTick';
import { useGameHydration } from '@/hooks/useGameHydration';
import { useOfflineGainCheck } from '@/hooks/useOfflineGainCheck';
import { useBossVictoryWatcher } from '@/hooks/useBossVictoryWatcher';
import { useGameToasts } from '@/hooks/useGameToasts';
import { useAchievementTrackers } from '@/hooks/useAchievementTrackers';
import { useCompadexTracker } from '@/hooks/useCompadexTracker';
import { formatNumber } from '@/lib/game/format';
import { getPalierConfig } from '@/lib/game/paliers';
import { useIsMobile } from '@/hooks/useIsMobile';
import { WelcomeBackModal } from '@/components/game/WelcomeBackModal';
import { DailyRewardsModal } from '@/components/game/DailyRewardsModal';
import { PatchNotesModal } from '@/components/layout/PatchNotesModal';
import { PATCH_NOTES } from '@/lib/game/patchNotes';

import { NAV_ICONS } from '@/components/ui/NavIcons';
import { getSpriteCandidates } from '@/components/ui/PixelSprite';
import { getPalierBgCandidates } from '@/components/game/battle-zone/PalierBg';
import { ENEMY_SPRITES_ASSET_VERSION } from '@/lib/game/enemies';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { PageTransition } from '@/components/ui/PageTransition';
import { BossVictoryScreen } from '@/components/game/BossVictoryScreen';
import { ProgressCard } from '@/components/layout/combatSidebar/ProgressCard';
import { QuestsCard } from '@/components/layout/combatSidebar/QuestsCard';
import { StatsCard } from '@/components/layout/combatSidebar/StatsCard';

// Pages chargées à la demande : leur code sort du bundle initial (hydratation
// plus rapide au lancement), puis est préchargé en arrière-plan une fois le
// splash terminé pour que le premier clic n'attende pas le réseau.
const PAGE_LOADERS = {
  UpgradesPage: () => import('@/components/pages/UpgradesPage').then(m => ({ default: m.UpgradesPage })),
  CompanionsPage: () => import('@/components/pages/CompanionsPage').then(m => ({ default: m.CompanionsPage })),
  GachaPage: () => import('@/components/pages/GachaPage').then(m => ({ default: m.GachaPage })),
  QuestsPage: () => import('@/components/pages/QuestsPage').then(m => ({ default: m.QuestsPage })),
  ShopPage: () => import('@/components/pages/ShopPage').then(m => ({ default: m.ShopPage })),
  CollectionPage: () => import('@/components/pages/CollectionPage').then(m => ({ default: m.CollectionPage })),
  RaidPage: () => import('@/components/pages/RaidPage').then(m => ({ default: m.RaidPage })),
  SettingsPage: () => import('@/components/pages/SettingsPage').then(m => ({ default: m.SettingsPage })),
  LeaderboardPage: () => import('@/components/pages/LeaderboardPage').then(m => ({ default: m.LeaderboardPage })),
  MarketplacePage: () => import('@/components/pages/MarketplacePage').then(m => ({ default: m.MarketplacePage })),
  ChampionInventoryPage: () => import('@/components/pages/ChampionInventoryPage').then(m => ({ default: m.ChampionInventoryPage })),
  AchievementsPage: () => import('@/components/pages/AchievementsPage').then(m => ({ default: m.AchievementsPage })),
  ProfilePage: () => import('@/components/pages/ProfilePage').then(m => ({ default: m.ProfilePage })),
  ExpeditionsPage: () => import('@/components/pages/ExpeditionsPage').then(m => ({ default: m.ExpeditionsPage })),
  ForgePage: () => import('@/components/pages/ForgePage').then(m => ({ default: m.ForgePage })),
  EquipmentUpgradePage: () => import('@/components/pages/EquipmentUpgradePage').then(m => ({ default: m.EquipmentUpgradePage })),
  PrestigePage: () => import('@/components/pages/PrestigePage').then(m => ({ default: m.PrestigePage })),
  MinePage: () => import('@/components/pages/MinePage').then(m => ({ default: m.MinePage })),
  AnomaliePage: () => import('@/components/pages/AnomaliePage').then(m => ({ default: m.AnomaliePage })),
  MasteryPage: () => import('@/components/pages/MasteryPage').then(m => ({ default: m.MasteryPage })),
  GachaDlePage: () => import('@/components/pages/GachaDlePage').then(m => ({ default: m.GachaDlePage })),
};
const UpgradesPage = lazy(PAGE_LOADERS.UpgradesPage);
const CompanionsPage = lazy(PAGE_LOADERS.CompanionsPage);
const GachaPage = lazy(PAGE_LOADERS.GachaPage);
const QuestsPage = lazy(PAGE_LOADERS.QuestsPage);
const ShopPage = lazy(PAGE_LOADERS.ShopPage);
const CollectionPage = lazy(PAGE_LOADERS.CollectionPage);
const RaidPage = lazy(PAGE_LOADERS.RaidPage);
const SettingsPage = lazy(PAGE_LOADERS.SettingsPage);
const LeaderboardPage = lazy(PAGE_LOADERS.LeaderboardPage);
const MarketplacePage = lazy(PAGE_LOADERS.MarketplacePage);
const ChampionInventoryPage = lazy(PAGE_LOADERS.ChampionInventoryPage);
const AchievementsPage = lazy(PAGE_LOADERS.AchievementsPage);
const ProfilePage = lazy(PAGE_LOADERS.ProfilePage);
const ExpeditionsPage = lazy(PAGE_LOADERS.ExpeditionsPage);
const ForgePage = lazy(PAGE_LOADERS.ForgePage);
const EquipmentUpgradePage = lazy(PAGE_LOADERS.EquipmentUpgradePage);
const PrestigePage = lazy(PAGE_LOADERS.PrestigePage);
const MinePage = lazy(PAGE_LOADERS.MinePage);
const AnomaliePage = lazy(PAGE_LOADERS.AnomaliePage);
const MasteryPage = lazy(PAGE_LOADERS.MasteryPage);
const GachaDlePage = lazy(PAGE_LOADERS.GachaDlePage);

type Page = 'home' | 'upgrades' | 'companions' | 'collection' | 'gacha' | 'shop' | 'quests' | 'raids' | 'settings' | 'leaderboard' | 'marketplace' | 'champions' | 'achievements' | 'profile' | 'expeditions' | 'forge' | 'prestige' | 'equipment' | 'mine' | 'anomalie' | 'mastery' | 'gachadle';

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
    { id:'champions',    label:'INV. CHAMPIONS',  accent:'#fbbf24'            },
    { id:'equipment',    label:'ÉQUIPEMENT',      accent:'#93c5fd'            },
    { id:'collection',   label:'COMPADEX',        accent:'#60a5fa'            },
    { id:'mastery',      label:'MAÎTRISE',        accent:'#f472b6'            },
  ]},
  { title:'PROGRESSION', items: [
    { id:'upgrades',     label:'AMÉLIORATIONS',   accent:'var(--gold)'          },
    { id:'prestige',     label:'PRESTIGE',        accent:'var(--purple-glow)'   },
    { id:'anomalie',     label:'ANOMALIE',        accent:'#e879f9'            },
    { id:'mine',         label:'MINE',            accent:'var(--cyan-hi)'       },
    { id:'achievements', label:'SUCCÈS',          accent:'#fbbf24'            },
  ]},
  { title:'ACTIVITÉS', items: [
    { id:'raids',        label:'RAIDS',           accent:'#fbbf24'            },
    { id:'expeditions',  label:'EXPÉDITIONS',     accent:'#fb923c'            },
    { id:'gachadle',     label:'GACHADLE',        accent:'#38bdf8'            },
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
  // Abonnement à la notation des nombres (Paramètres) : re-rend l'interface
  // dès qu'elle change, formatNumber lisant la valeur directement.
  useDisplaySettingsStore(s => s.numberNotation);
  const { status: instanceStatus, requestTakeover } = useInstanceLock();
  const [page,          setPage]          = useState<Page>('home');
  const [showAuth,      setShowAuth]      = useState(false);
  const [showDailyRewards, setShowDailyRewards] = useState(false);
  const [showPatchNotes, setShowPatchNotes] = useState(false);
  const latestPatchNote = PATCH_NOTES[0];
  const [splashDone,    setSplashDone]    = useState(false);
  const isMobile = useIsMobile();
  // Palier intermédiaire (desktop resserré) : la barre du haut (logo + avatar
  // + ressources + fil d'ariane + 4 icônes labellisées) ne tient plus sur une
  // ligne bien avant le vrai breakpoint mobile (820px) — sans ce palier, les
  // icônes finissent par chevaucher le fil d'ariane/les ressources. On
  // libère de la place en masquant le fil d'ariane et en repassant les
  // icônes en mode icône seule (comme sur mobile) plutôt qu'en tentant de
  // les faire rétrécir (flexbox ne les laisserait pas descendre sous leur
  // contenu minimal sans wrap/overflow, d'où le chevauchement observé).
  const isCompactHeader = useIsMobile(1250);
  // Téléphones étroits (≤400px) : même en mode mobile, logo + avatar + 2
  // ressources + calendrier dépassent la largeur de l'écran (~11px à 375px,
  // ~70px à 320px) et le calendrier finit hors champ. Le logo passe alors en
  // monogramme « GV » (toujours cliquable pour le passage secret).
  const isNarrowHeader = useIsMobile(400);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Sélectionne une page et referme le tiroir mobile
  // `page` (menu, fil d'ariane) change tout de suite pour un retour visuel
  // immédiat ; `contentPage` (contenu central, lourd à monter) suit dans une
  // transition React interruptible, pour ne pas geler le clic.
  const [contentPage, setContentPage] = useState<Page>('home');
  const [, startPageTransition] = useTransition();
  const goToPage = (p: Page) => {
    setPage(p);
    setDrawerOpen(false);
    startPageTransition(() => setContentPage(p));
  };
  useEffect(() => {
    if (!splashDone) return;
    const prefetch = () => { for (const load of Object.values(PAGE_LOADERS)) load().catch(() => {}); };
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(prefetch, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(prefetch, 1500);
    return () => clearTimeout(t);
  }, [splashDone]);
  // Exploration : chaque section visitée compte pour "Tour du Propriétaire".
  useEffect(() => { useGameStore.getState().discover(pageStatKey(page)); }, [page]);
  // Passage secret : 7 clics rapides sur le logo.
  const logoClicks = useRef<number[]>([]);
  const [logoFlash, setLogoFlash] = useState(0);
  const clickLogo = () => {
    const now = Date.now();
    logoClicks.current = [...logoClicks.current.filter(t => now - t < 3000), now];
    if (logoClicks.current.length < 7) return;
    logoClicks.current = [];
    useGameStore.getState().discover(EGG.passage);
    setLogoFlash(now);
  };
  // Le layout englobe toute l'appli (et la page ouverte) : il ne s'abonne
  // qu'à des valeurs qui changent rarement. Ce qui bouge à chaque kill
  // (pièces, vague, quêtes, succès) vit dans de petits composants dédiés
  // (CurrencyPills, PalierWaveLabel, CombatSidebar, GameWatchers).
  const { username, focusedExpeditionId, dailyRewardClaimedToday, compadexCharactersSeen, compadexEquipmentSeen } = useGameStore(useShallow(s => ({
    username: s.username,
    focusedExpeditionId: s.focusedExpeditionId,
    dailyRewardClaimedToday: s.dailyRewardClaimedToday,
    compadexCharactersSeen: s.compadexCharactersSeen,
    compadexEquipmentSeen: s.compadexEquipmentSeen,
  })));
  const { count: compadexCount, total: compadexTotal } = getCompadexProgress(compadexCharactersSeen, compadexEquipmentSeen);
  const { user, logout, kickedOut, dismissKickedOut } = useAuth();
  const { forceSave, loaded: cloudLoaded, syncStatus, lastSyncedAt } = useCloudSave(user?.uid ?? null);

  const hasHydrated = useGameHydration(cloudLoaded);
  const { offlineGain, claimOfflineGain } = useOfflineGainCheck(hasHydrated, cloudLoaded);
  const { victory, dismissVictory } = useBossVictoryWatcher();
  const claimable = useGameStore(s => countClaimableQuests(s.quests) + countClaimableQuests(s.weeklyQuests) + countClaimableQuests(s.raidQuests));

  // Navigation Forge → Expéditions : dès qu'un ingrédient à récolter est
  // "focusé", on bascule automatiquement sur la page Expéditions (qui se
  // charge ensuite d'afficher le bon onglet et de surligner la carte).
  useEffect(() => {
    if (focusedExpeditionId) goToPage('expeditions');
  }, [focusedExpeditionId]);

  const isCombat = COMBAT_PAGES.includes(contentPage);
  const currentNav = NAV.find(n => n.id === page)!;
  const contentNav = NAV.find(n => n.id === contentPage)!;

  // Bloquer les multi-instances
  if (instanceStatus === 'duplicate' || instanceStatus === 'takeover') {
    return <DuplicateTabScreen onTakeover={requestTakeover} isTakingOver={instanceStatus === 'takeover'} />;
  }

  // Session conflict : plusieurs appareils/ navigateurs utilisent le même compte.
  // Ne PAS conditionner sur `user` — le handler de conflit (useAuth.tsx) appelle
  // signOut() en même temps que setKickedOut(true), ce qui met `user` à null
  // quasi immédiatement. Si cet écran dépendait de `user`, il disparaîtrait
  // (ou ne s'afficherait jamais) dès que le signOut aboutit, laissant l'appareil
  // "perdant" retomber silencieusement en mode local/invité — pleinement
  // jouable — au lieu d'être vraiment bloqué. `kickedOut` seul reste vrai
  // jusqu'à ce que le joueur clique sur le bouton ci-dessous (dismissKickedOut).
  if (kickedOut) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'radial-gradient(circle at center, rgba(168,85,247,0.18), rgba(2,6,23,1) 52%)', padding:'24px' }}>
        <div style={{ width:'min(560px, 92vw)', background:'rgba(12,10,30,0.92)', border:'1px solid rgba(192,132,252,0.45)', borderRadius:'20px', boxShadow:'0 0 40px rgba(168,85,247,0.35)', padding:'28px 26px', textAlign:'center' }}>
          <div style={{ fontSize:'56px', marginBottom:'14px' }}>🚫</div>
          <div style={{ fontFamily:'var(--f-title)', fontSize:'32px', fontWeight:900, letterSpacing:'2px', color:'#f5d0fe', marginBottom:'12px' }}>CONNEXION BLOQUÉE</div>
          <div style={{ fontFamily:'var(--f-ui)', fontSize:'18px', lineHeight:1.6, color:'var(--text-sub)', marginBottom:'22px' }}>
            Ce compte est déjà actif sur un autre appareil ou navigateur.<br />
            Pour éviter les doubles sessions, l’accès au jeu est refusé tant que la session conflictuelle reste ouverte.
          </div>
          <button
            onClick={async () => { dismissKickedOut(); await logout(); }}
            style={{ background:'linear-gradient(135deg,#7c3aed,#a855f7)', border:'none', borderRadius:'12px', padding:'14px 22px', fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'16px', color:'white', cursor:'pointer', boxShadow:'0 12px 28px rgba(168,85,247,0.35)' }}
          >
            SE DÉCONNECTER ET REESSAYER
          </button>
        </div>
      </div>
    );
  }

  // Splash screen au premier chargement
  if (!splashDone) {
    // Le fond du palier et le sprite de l'ennemi sont les plus gros éléments
    // affichés à la sortie du splash : on les télécharge pendant l'animation
    // plutôt qu'après.
    preload(getPalierBgCandidates(useGameStore.getState().palier)[0], { as: 'image', fetchPriority: 'high' });
    const enemySprite = useGameStore.getState().currentEnemy?.spritePath;
    if (enemySprite) preload(getSpriteCandidates(enemySprite, ENEMY_SPRITES_ASSET_VERSION)[0], { as: 'image', fetchPriority: 'high' });
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
          onClose={dismissVictory}
        />
      )}

      {/* ══ TOAST NOTIFICATIONS ══════════════════════════════════════════ */}
      <ToastContainer />
      <AchievementUnlockBanner />
      <SecretsLayer />

      {/* ══ TOP BAR ══════════════════════════════════════════════════════ */}
      <header style={{ height:'56px', flexShrink:0, display:'flex', alignItems:'center', background:'linear-gradient(180deg,#0a0818,var(--bg-dark))', borderBottom:'1px solid var(--border)', padding:isMobile?'0 10px':'0 20px', gap:isMobile?'8px':isCompactHeader?'16px':'22px', zIndex:30, boxShadow:'0 2px 24px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.03)', position:'relative',
        // Filet de sécurité : sur les très petits écrans (<~360px), même les
        // marges déjà réduites ci-dessous peuvent ne pas suffire. Plutôt que
        // de laisser les éléments se chevaucher (voir bug ressources/calendrier
        // : un flex-item avec minWidth:0 se laisse rétrécir par son parent en
        // dessous de la taille de SON PROPRE contenu, qui déborde alors par-
        // dessus le voisin suivant), on préfère un défilement horizontal —
        // jamais de superposition visuelle, dans le pire des cas on scrolle.
        overflowX:'auto', overflowY:'hidden' }}>
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'1px', background:'linear-gradient(90deg,transparent,rgba(147,51,234,0.3),transparent)' }} />

        {/* Hamburger (mobile) */}
        {isMobile && (
          <button onClick={() => setDrawerOpen(v => !v)} aria-label="Menu"
            style={{ flexShrink:0, width:38, height:38, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,0.04)', border:'1px solid var(--border-lit)', borderRadius:'8px', cursor:'pointer', color:'var(--purple-glow)', fontSize:20, lineHeight:1 }}>
            ☰
          </button>
        )}

        {/* Logo */}
        <div style={{ width:isMobile?'auto':'216px', flexShrink:0 }}>
          <div key={logoFlash} onClick={clickLogo} className={logoFlash ? 'gv-logo-secret' : undefined} style={{ cursor:'default', userSelect:'none', fontFamily:'var(--f-title)', fontSize:isMobile?'14px':'18px', fontWeight:900, letterSpacing:isMobile?'0.5px':'3px', background:'linear-gradient(90deg,#e879f9,#c084fc,#9333ea)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', lineHeight:1, filter:'drop-shadow(0 0 12px rgba(147,51,234,0.35))', whiteSpace:'nowrap' }}>
            {isNarrowHeader ? 'GV' : 'GACHAVERSE'}
          </div>
          {!isMobile && <div style={{ fontFamily:'var(--f-num)', fontSize:'14px', color:'var(--text-muted)', letterSpacing:'1px', marginTop:'4px', lineHeight:1 }}>MULTIVERS RPG</div>}
        </div>

        {/* Avatar / Bouton connexion */}
        <button onClick={() => setShowAuth(true)}
          style={{ display:'flex', alignItems:'center', gap:'10px',
            background: user ? 'var(--bg-card)' : 'linear-gradient(135deg,#3b0764,#6d28d9)',
            border: user ? '1px solid var(--border)' : '1px solid #c084fc',
            borderRadius:'10px', padding: isMobile?'5px':'5px 14px 5px 6px', cursor:'pointer',
            transition:'all 0.15s', flexShrink:0,
            boxShadow: user ? 'none' : '0 0 16px rgba(168,85,247,0.4)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.filter = 'brightness(1.15)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.filter = 'none'}>
          <PlayerAvatar size={36} tooltip={formatSyncStatus(syncStatus, lastSyncedAt).label}>
            {/* Badge de synchro cloud — confirme d'un coup d'œil si CET appareil
                est bien à jour avec le cloud, sans avoir à ouvrir la console. */}
            <div style={{ position:'absolute', bottom:-2, right:-2, width:11, height:11, borderRadius:'50%',
              background: formatSyncStatus(syncStatus, lastSyncedAt).color,
              border:'2px solid var(--bg-dark)',
              boxShadow: syncStatus === 'synced' ? '0 0 6px rgba(74,222,128,0.7)' : 'none',
              transition:'background 0.3s' }} />
          </PlayerAvatar>
          {!isMobile && <div style={{ textAlign:'left' }}>
            {user ? (<>
              <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'16px', color:'var(--text)', lineHeight:1.2 }}>{username || user.email?.split('@')[0]}</div>
              <PalierWaveLabel />
            </>) : (<>
              <div style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'16px', color:'#e9d5ff', lineHeight:1.2, letterSpacing:'0.5px' }}>SE CONNECTER</div>
              <div style={{ fontFamily:'var(--f-ui)', fontSize:'14px', color:'rgba(233,213,255,0.6)', lineHeight:1 }}>ou créer un compte</div>
            </>)}
          </div>}
        </button>

        {/* Ressources — flexShrink:0 : sans ça, le flex parent peut réduire cette
            boîte SOUS la taille naturelle de son propre contenu (les 2 pastilles,
            elles-mêmes sans minWidth:0), qui déborde alors visuellement par-dessus
            le bouton calendrier juste après (voir bug rapporté : chevauchement
            sur petit écran). flexShrink:0 force le layout à respecter sa vraie
            largeur — au pire ça déborde à droite du header, jamais de superposition. */}
        <div style={{ display:'flex', gap:isMobile?'4px':'8px', marginLeft:isMobile?'auto':undefined, flexShrink:0 }}>
          <CurrencyPills isMobile={isMobile} />
        </div>

        {/* Calendrier (mobile) — icône seule, la barre d'icônes complète est desktop-only */}
        {isMobile && (
          <button onClick={() => setShowDailyRewards(true)} aria-label="Récompenses journalières"
            style={{ position:'relative', flexShrink:0, width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)', borderRadius:'8px', cursor:'pointer', color:'var(--text-dim)' }}>
            <NAV_ICONS.dailyReward size={16} color="currentColor" />
            {!dailyRewardClaimedToday && (
              <div style={{ position:'absolute', top:-2, right:-2, width:9, height:9, background:'#ef4444', borderRadius:'50%', border:'1px solid var(--bg-dark)' }} />
            )}
          </button>
        )}

        {/* Breadcrumb page — masqué en mode compact pour laisser la place aux icônes */}
        {!isMobile && !isCompactHeader && <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'5px 14px', background:'rgba(255,255,255,0.03)', border:'1px solid var(--border)', borderRadius:'8px' }}>
          {(() => { const Icon = NAV_ICONS[currentNav.id]; return Icon ? <Icon size={14} color={currentNav.accent ?? 'var(--text-sub)'} /> : null; })()}
          <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'14px', color: currentNav.accent ?? 'var(--text-sub)', letterSpacing:'1px' }}>{currentNav.label}</span>
        </div>}

        {/* Icônes droite */}
        {!isMobile && <div style={{ marginLeft:'auto', display:'flex', gap:'6px', alignItems:'center' }}>
          <button onClick={() => setShowDailyRewards(true)}
            style={{ background:'none', border:'1px solid transparent', borderRadius:'8px', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:'2px', padding: isCompactHeader?'6px 8px':'5px 10px', color:'var(--text-dim)', transition:'all 0.15s', position:'relative' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color='var(--text-sub)'; (e.currentTarget as HTMLElement).style.borderColor='var(--border)'; (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.03)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color='var(--text-dim)'; (e.currentTarget as HTMLElement).style.borderColor='transparent'; (e.currentTarget as HTMLElement).style.background='none'; }}>
            <NAV_ICONS.dailyReward size={18} color="currentColor" />
            {!isCompactHeader && <span style={{ fontFamily:'var(--f-ui)', fontSize:'14px', fontWeight:600, letterSpacing:'0.5px' }}>CALENDRIER</span>}
            {!dailyRewardClaimedToday && (
              <div style={{ position:'absolute', top:'2px', right:'2px', width:10, height:10, background:'#ef4444', borderRadius:'50%', border:'1px solid var(--bg-dark)' }} />
            )}
          </button>
          {([
            { id:'leaderboard', label:'CLASSEMENT' },
            { id:'quests',      label:'QUÊTES'     },
            { id:'settings',    label:'OPTIONS'    },
          ] as { id: Page; label: string }[]).map(n => {
            const Icon = NAV_ICONS[n.id];
            return (
            <button key={n.label} onClick={() => goToPage(n.id)}
              style={{ background:'none', border:'1px solid transparent', borderRadius:'8px', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:'2px', padding: isCompactHeader?'6px 8px':'5px 10px', color:'var(--text-dim)', transition:'all 0.15s', position:'relative' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color='var(--text-sub)'; (e.currentTarget as HTMLElement).style.borderColor='var(--border)'; (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.03)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color='var(--text-dim)'; (e.currentTarget as HTMLElement).style.borderColor='transparent'; (e.currentTarget as HTMLElement).style.background='none'; }}>
              {Icon && <Icon size={18} color="currentColor" />}
              {!isCompactHeader && <span style={{ fontFamily:'var(--f-ui)', fontSize:'14px', fontWeight:600, letterSpacing:'0.5px' }}>{n.label}</span>}
              {n.id === 'quests' && claimable > 0 && (
                <div style={{ position:'absolute', top:'1px', right:'1px', minWidth:16, height:16, padding:'0 3px', boxSizing:'border-box', lineHeight:1, background:'#ef4444', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--f-num)', fontWeight:700, fontSize:'14px', color:'white', border:'1px solid var(--bg-dark)' }}>
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
            width:'236px', flexShrink:0,
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
                <div style={{ fontFamily:'var(--f-ui)', fontSize:14, fontWeight:700, letterSpacing:2, color:'var(--text-muted)', padding:'10px 12px 4px', textTransform:'uppercase' }}>
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
                  {/* Progression Compadex */}
                  {item.id === 'collection' && (
                    <span style={{ marginLeft:'auto', fontFamily:'var(--f-num)', fontWeight:700, fontSize:'14px', color: isActive ? item.accent ?? '#60a5fa' : 'var(--text-muted)' }}>
                      {compadexCount}/{compadexTotal}
                    </span>
                  )}
                  {/* Badge quêtes */}
                  {item.id === 'quests' && claimable > 0 && (
                    <div style={{ position:'absolute', right:'10px', minWidth:22, height:22, padding:'0 5px', boxSizing:'border-box', background:'linear-gradient(135deg,#dc2626,#ef4444)', borderRadius:'11px', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--f-num)', fontWeight:700, fontSize:14, color:'white', boxShadow:'0 0 8px rgba(239,68,68,0.6)' }}>{claimable}</div>
                  )}
                </div>
                );
              })}
            </div>
          ))}

          <div style={{ flex:1 }} />

          {/* Patch Notes — flexShrink:0 : ce bloc a overflow:hidden (pour clipper le
              cercle décoratif), ce qui retire sa protection de taille minimale en
              flexbox. Sans flexShrink:0, quand le contenu de la sidebar dépasse la
              hauteur dispo, ce bloc se fait écraser (quelques px) par l'algorithme
              de shrink au lieu de garder sa taille et de laisser le scroll (aside,
              overflowY:auto) le révéler entièrement — d'où le bug "scroll ne va
              pas jusqu'au bout de l'info patch notes". */}
          <div onClick={() => setShowPatchNotes(true)}
            style={{ flexShrink:0, cursor:'pointer', background:'linear-gradient(160deg,#150a28,#1e0e38)', border:'1px solid var(--border-glow)', borderRadius:'12px', padding:'14px', marginTop:'8px', position:'relative', overflow:'hidden', boxShadow:'0 0 20px rgba(124,58,237,0.08), inset 0 1px 0 rgba(255,255,255,0.04)', transition:'filter 0.15s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.filter = 'brightness(1.15)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.filter = 'none'}>
            <div style={{ position:'absolute', top:'-15px', right:'-15px', width:'80px', height:'80px', background:'radial-gradient(circle,rgba(168,85,247,0.16),transparent)', borderRadius:'50%' }} />
            <div style={{ fontFamily:'var(--f-ui)', fontSize:'14px', color:'var(--purple-glow)', fontWeight:700, letterSpacing:'2px', marginBottom:'5px' }}>📋 PATCH NOTES</div>
            <div style={{ fontFamily:'var(--f-title)', fontSize:'14px', color:'var(--text)', fontWeight:700, letterSpacing:'1px', marginBottom:'6px', lineHeight:1.3 }}>{latestPatchNote.title}</div>
            <div style={{ fontFamily:'var(--f-ui)', fontSize:'14px', color:'var(--text-dim)', lineHeight:1.5 }}>Découvre les dernières nouveautés du jeu</div>
            <div style={{ marginTop:'8px', fontFamily:'var(--f-ui)', fontSize:'14px', color:'var(--text-dim)', display:'flex', alignItems:'center', gap:'5px' }}>
              <span>🕒</span><span>{latestPatchNote.date}</span>
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
              <aside style={{ width:isMobile?'100%':'244px', flexShrink:0, display:'flex', flexDirection:'column', gap:'10px', overflowY:isMobile?'visible':'auto' }}>
                <CombatSidebar />
              </aside>
            </div>
          ) : (
            /* Pages */
            <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
              {/* Page header */}
              <div style={{ padding:isMobile?'12px 16px 10px':'16px 28px 12px', borderBottom:'1px solid var(--border)', background:'linear-gradient(180deg,var(--bg-dark),transparent)', flexShrink:0, display:'flex', alignItems:'center', gap:'10px' }}>
                <div style={{ width:'4px', height:'18px', background:`linear-gradient(180deg,${contentNav.accent??'var(--purple-hi)'},transparent)`, borderRadius:'2px', boxShadow:`0 0 8px ${contentNav.accent??'var(--purple-hi)'}` }} />
                {(() => { const Icon = NAV_ICONS[contentNav.id]; return Icon ? <span style={{ color: contentNav.accent ?? 'var(--purple-hi)', display:'flex' }}><Icon size={20} color="currentColor" /></span> : null; })()}
                <span className="page-title" style={{ color:contentNav.accent??'var(--text)' }}>{contentNav.label}</span>
              </div>
              <div style={{ flex:1, overflow:'hidden' }}>
                <Suspense fallback={null}>
                <PageTransition pageKey={contentPage}>
                  {contentPage === 'upgrades'   && <UpgradesPage />}
                  {contentPage === 'companions' && <CompanionsPage />}
                  {contentPage === 'collection' && <CollectionPage />}
                  {contentPage === 'gacha'      && <GachaPage />}
                  {contentPage === 'shop'       && <ShopPage />}
                  {contentPage === 'quests'     && <QuestsPage />}
                  {contentPage === 'raids'      && <RaidPage />}
                  {contentPage === 'settings'     && <SettingsPage onForceSave={forceSave} syncStatus={syncStatus} lastSyncedAt={lastSyncedAt} />}
                  {contentPage === 'leaderboard'  && <LeaderboardPage />}
                  {contentPage === 'marketplace'  && <MarketplacePage />}
                  {contentPage === 'champions'    && <ChampionInventoryPage />}
                  {contentPage === 'achievements' && <AchievementsPage />}
                  {contentPage === 'expeditions' && <ExpeditionsPage />}
                  {contentPage === 'forge'       && <ForgePage />}
                  {contentPage === 'equipment'   && <EquipmentUpgradePage />}
                  {contentPage === 'prestige'    && <PrestigePage />}
                  {contentPage === 'mine'        && <MinePage />}
                  {contentPage === 'anomalie'    && <AnomaliePage />}
                  {contentPage === 'mastery'     && <MasteryPage />}
                  {contentPage === 'gachadle'    && <GachaDlePage />}
                  {contentPage === 'profile'     && <ProfilePage />}
                </PageTransition>
                </Suspense>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {showDailyRewards && <DailyRewardsModal onClose={() => setShowDailyRewards(false)} />}
      {showPatchNotes && <PatchNotesModal onClose={() => setShowPatchNotes(false)} />}
      {offlineGain && <WelcomeBackModal gain={offlineGain} onClose={claimOfflineGain} />}
      <UltAnimation />
      <GameWatchers />
    </div>
  );
}

const countClaimableQuests = (list: Quest[] | undefined) => (list ?? []).filter(q => q.current >= q.target && !q.done).length;

// Suivi des succès, du Compadex et toasts de quêtes/butin : ces hooks
// s'abonnent à des champs qui changent à chaque kill. Ils vivent dans ce
// composant sans rendu pour ne pas re-rendre tout le layout avec eux.
function GameWatchers() {
  useGameToasts();
  useAchievementTrackers();
  useCompadexTracker();
  return null;
}

function CurrencyPills({ isMobile }: { isMobile: boolean }) {
  const pixelCoins = useGameStore(s => s.pixelCoins);
  const nekoGems = useGameStore(s => s.nekoGems);
  return [
    { icon:'🪙', val:formatNumber(pixelCoins), color:'var(--gold)',  bg:'rgba(120,53,15,0.22)',  border:'rgba(245,158,11,0.35)'  },
    { icon:'💎', val:formatNumber(nekoGems),   color:'var(--cyan-hi)',  bg:'rgba(6,182,212,0.15)',    border:'rgba(34,211,238,0.35)' },
  ].map((r,i) => (
    <div key={i} style={{ display:'flex', alignItems:'center', gap:isMobile?'4px':'7px', background:r.bg, border:`1px solid ${r.border}`, borderRadius:'20px', padding:isMobile?'4px 7px':'5px 16px', cursor:'pointer', transition:'all 0.15s', boxShadow:`inset 0 1px 0 rgba(255,255,255,0.06)` }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.filter = 'brightness(1.2)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.filter = 'none'}>
      <span style={{ fontSize:isMobile?'14px':'16px' }}>{r.icon}</span>
      <span style={{ fontFamily:'var(--f-num)', fontWeight:700, fontSize:'14px', color:r.color }}>{r.val}</span>
      {!isMobile && <span style={{ fontFamily:'var(--f-ui)', fontWeight:700, fontSize:'16px', color:r.color, opacity:0.45 }}>+</span>}
    </div>
  ));
}

function PalierWaveLabel() {
  const palier = useGameStore(s => s.palier);
  const wave = useGameStore(s => s.wave);
  return <div style={{ fontFamily:'var(--f-ui)', fontSize:'14px', color:'var(--text-dim)', lineHeight:1 }}>Palier {palier} — Vague {wave}/10</div>;
}

function CombatSidebar() {
  const { palier, wave, maxPalierReached, quests } = useGameStore(useShallow(s => ({
    palier: s.palier, wave: s.wave, maxPalierReached: s.maxPalierReached, quests: s.quests,
  })));
  return (
    <>
      <ProgressCard palier={palier} wave={wave} progressPct={Math.round((wave / 10) * 100)} cfg={getPalierConfig(palier)} />
      <QuestsCard quests={quests} claimQuest={useGameStore.getState().claimQuest} />
      <StatsCard maxPalierReached={maxPalierReached} />
    </>
  );
}
