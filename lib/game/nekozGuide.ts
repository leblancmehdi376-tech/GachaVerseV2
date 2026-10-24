// NekoZ-guide — le personnage cliquable de l'accueil (voir docs/lore-nekoz-bible.md
// pour le lore). Ce fichier ne contient que des données et des fonctions pures :
// répliques, chaîne de quêtes et choix de la réplique à afficher. L'état
// (quête en cours, répliques uniques déjà vues...) vit dans le store, sous
// `nekozGuide`, et n'est JAMAIS remis à zéro par le Prestige (voir doPrestige,
// qui ne liste pas ce champ).
import { STAT } from './achievements';
import { parseInstanceKey } from './editions';
import { PRESTIGE_UNLOCK_PALIER } from './prestige';

export interface GuideState {
  arrivalPrestige: number | null; // null = le joueur n'a jamais encore cliqué sur le guide
  lastPrestige: number;           // dernier Prestige auquel le guide a déjà réagi
  questIndex: number;             // index dans GUIDE_QUESTS (>= longueur : chaîne terminée)
  questBaseline: number;          // valeur du compteur de la quête à son activation
  seen: string[];                 // répliques uniques déjà dites
}

export const initialGuideState = (): GuideState => ({
  arrivalPrestige: null, lastPrestige: 0, questIndex: 0, questBaseline: 0, seen: [],
});

// Une réplique = une ou plusieurs bulles, enchaînées au clic.
export interface GuideLine { id: string; parts: string[] }

// Sous-ensemble du store lu par le guide (gardé étroit pour les tests).
export interface GuideView {
  nekozGuide: GuideState;
  prestigeLevel: number;
  maxPalierReached: number;
  runPeakPalier: number | null;
  equippedTeam: (string | null)[];
  compadexCharactersSeen: Record<string, true>;
  achievementStats: Record<string, number>;
  totalUpgradesPerformed: number;
  nakimeTotals: { floors: number };
}

export const CHILL_COOL_IDS = ['nekoz', 'ouchuu', 'elfuzzion', 'rokoul_ayro'] as const;

// Cumul de victoires contre un boss de raid précis (achievementStats, synchronisé
// et jamais remis à zéro — voir RaidBattle).
export const raidKillsStat = (bossId: string) => `raidKills:${bossId}`;

// ── Quêtes ─────────────────────────────────────────────────────────────────
// Chaque quête compte sa progression À PARTIR de son activation (questBaseline),
// pour qu'un joueur déjà avancé ne les valide pas toutes d'un coup. Exception :
// 'chillTeam', un état à atteindre maintenant (pas un cumul).
export type GuideQuestMetric = 'expeditions' | 'raidRokoul' | 'nakimeFloors' | 'upgrades' | 'chillTeam';

export interface GuideQuestDef {
  id: string;
  icon: string;
  label: string;
  metric: GuideQuestMetric;
  target: number;
  reward: number; // gemmes
  intro: GuideLine;
  outro: GuideLine;
}

export const GUIDE_QUESTS: GuideQuestDef[] = [
  {
    id: 'g1_expeditions', icon: '🧭', label: 'Terminer 3 expéditions', metric: 'expeditions', target: 3, reward: 50,
    intro: { id: 'quest:g1', parts: ["Envoie quelqu'un loin. Trois fois.", "Il reviendra. C'est rare, les choses qui reviennent."] },
    outro: { id: 'done:g1', parts: ['Ils sont tous revenus ?', '… Bien. Ici, ils reviennent.'] },
  },
  {
    id: 'g2_rokoul', icon: '👥', label: 'Vaincre le raid Rokoul & Ayro', metric: 'raidRokoul', target: 1, reward: 75,
    intro: { id: 'quest:g2', parts: ['Rokoul et Ayro. En raid.', 'Je veux voir si ces deux-là tiennent ensemble.'] },
    outro: { id: 'done:g2', parts: ["Toujours ensemble. Même en perdant.", "… C'est bien. Garde-les comme ça."] },
  },
  {
    id: 'g3_nakime', icon: '🏯', label: 'Franchir 5 étages du Château de Nakime', metric: 'nakimeFloors', target: 5, reward: 100,
    intro: { id: 'quest:g3', parts: ["Le Château de Nakime. Monte un peu.", "Ça t'occupera. C'est bien, d'être occupé."] },
    outro: { id: 'done:g3', parts: ["Ce Château ne s'efface pas quand tu recommences.", "Il te faut des choses qui restent."] },
  },
  {
    id: 'g4_upgrades', icon: '⬆', label: 'Améliorer tes personnages 200 fois', metric: 'upgrades', target: 200, reward: 100,
    intro: { id: 'quest:g4', parts: ['Renforce ce que tu as, avant de chercher plus loin.'] },
    outro: { id: 'done:g4', parts: ['Plus forts. Bien.', "… Ne me regarde pas comme ça. C'était un vrai conseil. En partie."] },
  },
  {
    id: 'g5_chill', icon: '😎', label: 'Placer un personnage Chill&Cool dans ton équipe', metric: 'chillTeam', target: 1, reward: 150,
    intro: { id: 'quest:g5', parts: ['Une équipe, ça se choisit.', '… Mets-en un. Un Chill&Cool. Ne demande pas pourquoi.'] },
    outro: { id: 'done:g5', parts: ['…', 'Merci.', "Oublie que j'ai dit ça."] },
  },
];

function metricValue(v: GuideView, metric: GuideQuestMetric): number {
  switch (metric) {
    case 'expeditions':  return v.achievementStats[STAT.expeditionsDone] ?? 0;
    case 'raidRokoul':   return v.achievementStats[raidKillsStat('rokoul_ayro')] ?? 0;
    case 'nakimeFloors': return v.nakimeTotals?.floors ?? 0;
    case 'upgrades':     return v.totalUpgradesPerformed ?? 0;
    case 'chillTeam':    return hasInTeam(v, ...CHILL_COOL_IDS) ? 1 : 0;
  }
}

export function currentGuideQuest(v: GuideView): { def: GuideQuestDef; current: number; claimable: boolean } | null {
  const def = GUIDE_QUESTS[v.nekozGuide.questIndex];
  if (!def || v.nekozGuide.arrivalPrestige === null) return null;
  const raw = metricValue(v, def.metric);
  const progress = def.metric === 'chillTeam' ? raw : raw - v.nekozGuide.questBaseline;
  const current = Math.max(0, Math.min(def.target, progress));
  return { def, current, claimable: current >= def.target };
}

// Valeur de référence d'une quête au moment où elle devient active.
export function questBaselineFor(v: Omit<GuideView, 'nekozGuide'>, questIndex: number): number {
  const def = GUIDE_QUESTS[questIndex];
  return def ? metricValue(v as GuideView, def.metric) : 0;
}

// ── Répliques ──────────────────────────────────────────────────────────────
export function arrivalLine(prestigeLevel: number): GuideLine {
  if (prestigeLevel >= 30) return { id: 'arrival', parts: ["… J'arrive tard.", "Évidemment que j'arrive tard."] };
  if (prestigeLevel >= 10) return { id: 'arrival', parts: ['Combien de fois tu as tout recommencé ?', '… Ne réponds pas. Je vois.'] };
  if (prestigeLevel >= 1)  return { id: 'arrival', parts: ["Tu as déjà commencé. Bon.", "Ce n'est pas grave. Pas encore."] };
  return { id: 'arrival', parts: ['… Tiens. Encore un.', 'Non, rien. Je parlais tout seul.'] };
}

const POST_PRESTIGE: GuideLine = { id: 'post_prestige', parts: ["… Bon. C'est fait.", 'Tout le monde est revenu ? Compte-les quand même.'] };

// Réactions uniques, à la première visite qui suit la découverte du personnage.
const CHILL_REACTIONS: { charId: string; line: GuideLine }[] = [
  { charId: 'nekoz', line: { id: 'meet:nekoz', parts: ['… Il a de la chance.', "De pouvoir encore croire que demain sera différent d'aujourd'hui.", 'Prends soin de lui. Ne me demande pas pourquoi.'] } },
  { charId: 'ouchuu', line: { id: 'meet:ouchuu', parts: ['…', 'Je ne la connais pas.'] } },
  { charId: 'rokoul_ayro', line: { id: 'meet:rokoul_ayro', parts: ['Ces deux-là, ne les sépare jamais. Jamais.', "… C'est un conseil de stratégie."] } },
  { charId: 'elfuzzion', line: { id: 'meet:elfuzzion', parts: ['Des dragons primordiaux. Ouais. Des poules, oui.', "… Pardon. C'est une vieille blague. Pas la mienne."] } },
];

const BASE_LINES: GuideLine[] = [
  { id: 'b1', parts: ['Tu frappes. Ils tombent. Tu montes.', "C'est simple, hein ? Profite tant que c'est simple."] },
  { id: 'b2', parts: ["Pas trop vite. Ton équipe n'est pas prête.", "… Personne ne l'est jamais."] },
  { id: 'b3', parts: ['Moi ? Je surveille.', 'Quoi ? … Toi. Le décor. Rien.'] },
  { id: 'b4', parts: ['Ce monde a des règles.', 'Je les connais mieux que tu ne crois.'] },
  { id: 'b5', parts: ['Tu veux un conseil ? Va plus lentement.', 'Tu veux un autre conseil ? Ignore le premier, de toute façon tu le feras.'] },
  { id: 'b6', parts: ["Quelqu'un a dessiné chaque palier. Pour qu'on puisse aller au bout.", "Et j'ai vu ce qu'il y avait au bout."] },
];

const PRESTIGE_READY_LINES: GuideLine[] = [
  { id: 'p1', parts: ['Tout effacer pour revenir plus fort.', "Ça a l'air génial, présenté comme ça."] },
  { id: 'p2', parts: ['Tu as encore tellement à faire ici.', 'Les raids, le Périple, Nakime… Rien ne presse.'] },
];

const VETERAN_LINES: GuideLine[] = [
  { id: 'v1', parts: ["Tu sens que c'est plus lourd, à chaque fois ?", "Non ? … Quelqu'un le sent pour toi."] },
  { id: 'v2', parts: ['Pas trop vite.', "… S'il te plaît."] },
];

const OUCHUU_TEAM_LINE: GuideLine = { id: 'o1', parts: ['Elle dort bien, en ce moment ?', '… Pour rien.'] };
const NEKOZ_TEAM_LINE: GuideLine = { id: 'n1', parts: ['Il rit beaucoup, celui-là.', "… C'est bien. Qu'il continue."] };
const ANGEL_LINE: GuideLine = { id: 'angel', parts: ["Il manque quelqu'un, ici.", "Elle n'est pas là. … Pas encore."] };
const ANGEL_CHANCE = 1 / 15;

function hasInTeam(v: Pick<GuideView, 'equippedTeam'>, ...ids: readonly string[]): boolean {
  return v.equippedTeam.some(k => !!k && ids.includes(parseInstanceKey(k).templateId));
}

// Réplique que le guide a "à dire" (arrivée, réaction au Prestige, nouvelle
// quête, découverte d'un Chill&Cool), dans cet ordre — null s'il n'a rien de neuf.
export function pendingGuideLine(v: GuideView): GuideLine | null {
  const g = v.nekozGuide;
  if (g.arrivalPrestige === null) return arrivalLine(v.prestigeLevel);
  if (v.prestigeLevel > g.lastPrestige) return POST_PRESTIGE;

  const quest = GUIDE_QUESTS[g.questIndex];
  if (quest && !g.seen.includes(quest.intro.id)) return quest.intro;

  for (const r of CHILL_REACTIONS) {
    if (v.compadexCharactersSeen?.[r.charId] && !g.seen.includes(r.line.id)) return r.line;
  }
  return null;
}

// Réplique à dire au prochain clic : celle en attente, sinon une réplique au
// hasard parmi celles que la situation autorise, sans répéter `previousId`.
export function nextGuideLine(v: GuideView, previousId: string | null, rnd: () => number = Math.random): GuideLine {
  const pending = pendingGuideLine(v);
  if (pending) return pending;

  if (rnd() < ANGEL_CHANCE && previousId !== ANGEL_LINE.id) return ANGEL_LINE;

  const pool = [...BASE_LINES];
  if ((v.runPeakPalier ?? v.maxPalierReached) >= PRESTIGE_UNLOCK_PALIER) pool.push(...PRESTIGE_READY_LINES);
  if (v.prestigeLevel >= 10) pool.push(...VETERAN_LINES);
  if (hasInTeam(v, 'ouchuu')) pool.push(OUCHUU_TEAM_LINE);
  if (hasInTeam(v, 'nekoz')) pool.push(NEKOZ_TEAM_LINE);
  const choices = pool.filter(l => l.id !== previousId);
  return choices[Math.floor(rnd() * choices.length)] ?? pool[0];
}

// Répliques dites une seule fois : à mémoriser dans `seen` une fois affichées.
export function isOneShotLine(id: string): boolean {
  return id.startsWith('quest:') || id.startsWith('meet:');
}

// Fusion cloud : la chaîne de quêtes ne doit jamais reculer (sinon une
// récompense pourrait être réclamée deux fois), et une réplique unique déjà
// vue ne doit jamais redevenir "à dire".
export function mergeGuideState(local: GuideState, remote: unknown): GuideState {
  if (!remote || typeof remote !== 'object') return local;
  const r = remote as Partial<GuideState>;
  const rIndex = typeof r.questIndex === 'number' ? r.questIndex : 0;
  const ahead = rIndex > local.questIndex;
  const arrivals = [local.arrivalPrestige, typeof r.arrivalPrestige === 'number' ? r.arrivalPrestige : null]
    .filter((x): x is number => x !== null);
  return {
    arrivalPrestige: arrivals.length ? Math.min(...arrivals) : null,
    lastPrestige: Math.max(local.lastPrestige, typeof r.lastPrestige === 'number' ? r.lastPrestige : 0),
    questIndex: ahead ? rIndex : local.questIndex,
    questBaseline: ahead && typeof r.questBaseline === 'number' ? r.questBaseline : local.questBaseline,
    seen: [...new Set([...local.seen, ...(Array.isArray(r.seen) ? r.seen.filter(s => typeof s === 'string') : [])])],
  };
}
