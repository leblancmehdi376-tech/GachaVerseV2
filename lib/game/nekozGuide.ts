// NekoZ-guide — le personnage cliquable de l'accueil (voir docs/lore-nekoz-bible.md
// pour le lore). Ce fichier ne contient que des données et des fonctions pures :
// répliques, chaîne de quêtes et choix de la réplique à afficher. L'état
// (quête en cours, répliques uniques déjà vues...) vit dans le store, sous
// `nekozGuide`, et n'est JAMAIS remis à zéro par le Prestige (voir doPrestige,
// qui ne liste pas ce champ).
import { STAT, type CharMastery } from './achievements';
import { BONDS, countDiscoveredBonds } from './bonds';
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

// Une réplique = une ou plusieurs bulles, enchaînées au clic. Une bulle est dite
// par le guide (texte seul) ou, à partir de l'acte 3, par un Chill&Cool de
// l'équipe (`by` = templateId, affiché avec le portrait de sa carte).
export type GuidePart = string | { by: string; text: string };
export interface GuideLine { id: string; parts: GuidePart[] }

export const partText = (p: GuidePart): string => (typeof p === 'string' ? p : p.text);
export const partSpeaker = (p: GuidePart): string | null => (typeof p === 'string' ? null : p.by);

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
  collection: Record<string, { currentForm: number }>;
  charMastery: Record<string, CharMastery>;
  discoveredBonds: Record<string, true>;
  prestigeRankRecoveryLevel: number;
}

export const CHILL_COOL_IDS = ['nekoz', 'ouchuu', 'elfuzzion', 'rokoul_ayro'] as const;

// Cumul de victoires contre un boss de raid précis (achievementStats, synchronisé
// et jamais remis à zéro — voir RaidBattle).
export const raidKillsStat = (bossId: string) => `raidKills:${bossId}`;

// ── Quêtes ─────────────────────────────────────────────────────────────────
// Chaque quête compte sa progression À PARTIR de son activation (questBaseline),
// pour qu'un joueur déjà avancé ne les valide pas toutes d'un coup. Exceptions
// (STATE_METRICS) : des états à atteindre maintenant, pas des cumuls.
// Aucune quête ne s'appuie sur un événement temporaire (Grand Périple...) :
// la chaîne serait bloquée une fois l'événement terminé.
export type GuideQuestMetric =
  | 'expeditions' | 'raidRokoul' | 'nakimeFloors' | 'upgrades' | 'chillTeam'
  | 'nekozDivine' | 'anomalyRerolls' | 'ouchuuKills' | 'bonds' | 'playMinutes' | 'prestige' | 'stoneMemory'
  | 'elfuzzionKills' | 'rokoulBossWins' | 'ouchuuNekozTeam' | 'chill3Team';

const STATE_METRICS: ReadonlySet<GuideQuestMetric> = new Set(['chillTeam', 'nekozDivine', 'stoneMemory', 'ouchuuNekozTeam', 'chill3Team']);

// Premières quêtes des actes 2 (les fissures) et 3 (le nom) : débloquent aussi de nouvelles répliques.
export const ACT_2_FIRST_QUEST = 5;
export const ACT_3_FIRST_QUEST = 12;

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
  // ── Acte 2 — Les fissures ──
  {
    id: 'g6_divine', icon: '✨', label: 'Faire évoluer NekoZ en Mode Divin', metric: 'nekozDivine', target: 1, reward: 150,
    intro: { id: 'quest:g6', parts: ['Ton NekoZ. Fais-le évoluer.', 'Le Mode Divin. … Disons que ça peut servir. Un jour.'] },
    outro: { id: 'done:g6', parts: ['Il brille, hein ?', 'Garde-le comme ça. Ce genre de lumière, ça protège.', "… Je l'ai lu quelque part."] },
  },
  {
    id: 'g7_anomaly', icon: '🌀', label: 'Relancer tes anomalies', metric: 'anomalyRerolls', target: 1, reward: 150,
    intro: { id: 'quest:g7', parts: ["Tu sais ce que c'est, une anomalie ?", 'Un endroit où le monde ne tient pas tout à fait.', 'Relance les tiennes. Je veux vérifier quelque chose.'] },
    outro: { id: 'done:g7', parts: ["Rien d'anormal. … Enfin, rien de plus que d'habitude.", 'Bien. Ce monde tient encore.'] },
  },
  {
    id: 'g8_ouchuu', icon: '☄️', label: "Vaincre 500 monstres avec Ouchuu dans l'équipe", metric: 'ouchuuKills', target: 500, reward: 200,
    intro: { id: 'quest:g8', parts: ['Elle. Dans ton équipe.', 'Fais-la combattre. Beaucoup.', '… Pour les dégâts. Évidemment.'] },
    outro: { id: 'done:g8', parts: ['Elle a tenu.', 'Ne la laisse jamais porter tout le poids toute seule.', "… Les météores, c'est lourd."] },
  },
  {
    id: 'g9_bond', icon: '🔗', label: 'Découvrir un nouveau Lien légendaire', metric: 'bonds', target: 1, reward: 200,
    intro: { id: 'quest:g9', parts: ["Il paraît que certains se retrouvent toujours. D'un monde à l'autre.", 'Trouve-moi un de ces liens.'] },
    outro: { id: 'done:g9', parts: ['Tu vois ? Certains liens tiennent.', '… Pas tous.'] },
  },
  {
    id: 'g10_stay', icon: '🕯️', label: 'Jouer 30 minutes', metric: 'playMinutes', target: 30, reward: 200,
    intro: { id: 'quest:g10', parts: ["Celle-là, elle n'a pas de but.", "Reste un peu. C'est tout.", "… Oublie. C'est idiot. Fais-le quand même."] },
    outro: { id: 'done:g10', parts: ["Merci d'être resté.", "Ça faisait longtemps que quelqu'un ne restait pas."] },
  },
  {
    id: 'g11_prestige', icon: '⭐', label: 'Faire un Prestige', metric: 'prestige', target: 1, reward: 300,
    intro: { id: 'quest:g11', parts: ['Je vais te demander un truc bizarre.', 'Fais un Prestige.', 'Je veux voir si, cette fois, tout le monde revient.'] },
    outro: { id: 'done:g11', parts: ['… Ils sont revenus.', 'Tous. Tu as compté ? Moi, oui.'] },
  },
  {
    id: 'g12_stones', icon: '🪨', label: 'Débloquer la Mémoire des Pierres (page Prestige)', metric: 'stoneMemory', target: 1, reward: 300,
    intro: { id: 'quest:g12', parts: ['Les pierres se souviennent. Tu le savais ?', 'Donne-leur un peu de mémoire.', "Il faut que quelqu'un se souvienne. Que ce ne soit pas toujours la même personne."] },
    outro: { id: 'done:g12', parts: ['Voilà. Maintenant, elles se souviennent un peu pour toi.', '… Et pour elle.'] },
  },
  // ── Acte 3 — Le nom : chaque Chill&Cool portait seul un morceau de la catastrophe ──
  {
    id: 'g13_elfuzzion', icon: '🎛️', label: "Vaincre 300 monstres avec ElFuZzion dans l'équipe", metric: 'elfuzzionKills', target: 300, reward: 250,
    intro: { id: 'quest:g13', parts: ['Ton ElFuZzion. Fais-le jouer. Fort.', "Je veux entendre s'il grésille."] },
    outro: { id: 'done:g13', parts: ['Là-bas, il entendait un bruit. Très loin. Entre les mondes.', 'Il en a fait un remix. On a tous dansé dessus.', '… Moi le premier.'] },
  },
  {
    id: 'g14_rokoul', icon: '👥', label: "Vaincre 5 boss de palier avec Rokoul & Ayro dans l'équipe", metric: 'rokoulBossWins', target: 5, reward: 250,
    intro: { id: 'quest:g14', parts: ['Rokoul et Ayro. Contre des boss, cette fois.', 'Ensemble. Toujours ensemble.'] },
    outro: { id: 'done:g14', parts: ["Quand tout s'est brisé, ils se tenaient ensemble.", "Le monde s'est coupé pile entre les deux.", "… Voilà. Maintenant tu sais pourquoi j'insiste."] },
  },
  {
    id: 'g15_name', icon: '👑', label: "Placer Ouchuu et NekoZ ensemble dans l'équipe", metric: 'ouchuuNekozTeam', target: 1, reward: 300,
    intro: { id: 'quest:g15', parts: ['Mets-les ensemble. Elle, et lui.', 'Juste… pour voir.'] },
    outro: { id: 'done:g15', parts: ['…', 'Ouchuu.', "Je connaissais quelqu'un qui s'appelait comme ça. La reine d'un monde.", "Je ne viens pas d'ici. Tu t'en doutais, non ?"] },
  },
  {
    id: 'g16_prestige', icon: '⭐', label: 'Faire un Prestige', metric: 'prestige', target: 1, reward: 400,
    intro: { id: 'quest:g16', parts: ["Dans mon monde, quelqu'un a tout recommencé une fois de trop.", 'Alors je vais te demander de le refaire. Une fois.', 'Je dois savoir.'] },
    outro: { id: 'done:g16', parts: ["Rien ne s'est brisé.", "… Alors pourquoi j'ai si peur ?", 'Peut-être que je me suis trompé. Sur quoi, je ne sais pas encore.'] },
  },
  {
    id: 'g17_together', icon: '😎', label: "Placer 3 personnages Chill&Cool dans l'équipe", metric: 'chill3Team', target: 1, reward: 500,
    intro: { id: 'quest:g17', parts: ['Réunis-les. Au moins trois.', 'Je veux les voir ensemble.', '… Une dernière fois, pour moi. Une première fois, pour toi.'] },
    outro: { id: 'done:g17', parts: ["Ce jour-là, ils m'ont poussé dehors. Tous. Pas seulement elle.", 'Chacun portait un morceau du problème. Tout seul.', 'Ne refais pas ça. Ne les laisse pas tout porter seuls.'] },
  },
];

function nekozForm(v: GuideView): number {
  let form = -1;
  for (const [key, owned] of Object.entries(v.collection ?? {})) {
    if (parseInstanceKey(key).templateId === 'nekoz') form = Math.max(form, owned.currentForm);
  }
  return form;
}

function metricValue(v: GuideView, metric: GuideQuestMetric): number {
  switch (metric) {
    case 'expeditions':  return v.achievementStats[STAT.expeditionsDone] ?? 0;
    case 'raidRokoul':   return v.achievementStats[raidKillsStat('rokoul_ayro')] ?? 0;
    case 'nakimeFloors': return v.nakimeTotals?.floors ?? 0;
    case 'upgrades':     return v.totalUpgradesPerformed ?? 0;
    case 'chillTeam':    return hasInTeam(v, ...CHILL_COOL_IDS) ? 1 : 0;
    case 'nekozDivine':  return nekozForm(v) >= 1 ? 1 : 0;
    case 'anomalyRerolls': return v.achievementStats[STAT.anomalyRerolls] ?? 0;
    case 'ouchuuKills':  return v.charMastery?.ouchuu?.k ?? 0;
    case 'bonds':        return countDiscoveredBonds(v.discoveredBonds ?? {});
    case 'playMinutes':  return Math.floor((v.achievementStats[STAT.playtimeSec] ?? 0) / 60);
    case 'prestige':     return v.prestigeLevel;
    case 'stoneMemory':  return (v.prestigeRankRecoveryLevel ?? 0) >= 1 ? 1 : 0;
    case 'elfuzzionKills': return v.charMastery?.elfuzzion?.k ?? 0;
    case 'rokoulBossWins': return v.charMastery?.rokoul_ayro?.w ?? 0;
    case 'ouchuuNekozTeam': return hasInTeam(v, 'ouchuu') && hasInTeam(v, 'nekoz') ? 1 : 0;
    case 'chill3Team':   return CHILL_COOL_IDS.filter(id => hasInTeam(v, id)).length >= 3 ? 1 : 0;
  }
}

export function currentGuideQuest(v: GuideView): { def: GuideQuestDef; current: number; claimable: boolean } | null {
  const def = GUIDE_QUESTS[v.nekozGuide.questIndex];
  if (!def || v.nekozGuide.arrivalPrestige === null) return null;
  const raw = metricValue(v, def.metric);
  // Tous les liens déjà découverts à l'activation : plus rien à trouver, quête offerte.
  const nothingLeft = def.metric === 'bonds' && v.nekozGuide.questBaseline >= BONDS.length;
  const progress = nothingLeft ? def.target : STATE_METRICS.has(def.metric) ? raw : raw - v.nekozGuide.questBaseline;
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
// Acte 2 : des souvenirs lui échappent. Toujours sans dire « Ouchuu » ni « dernier Prestige ».
const ACT_2_LINES: GuideLine[] = [
  { id: 'f1', parts: ['Avant, on était cinq à rire trop fort.', '… Avant quoi ? Laisse tomber.'] },
  { id: 'f2', parts: ["Tu as déjà oublié quelqu'un ?", "Moi, jamais. C'est bien ça, le problème."] },
  { id: 'f3', parts: ['Il y avait une fille qui dessinait tout le temps.', '… Je ne sais pas pourquoi je te dis ça.'] },
  { id: 'f4', parts: ['Ne laisse personne seul trop longtemps.', 'Les gens seuls finissent par entendre des choses.'] },
  { id: 'f5', parts: ['Ton NekoZ dort comme une pierre.', "Le mien… L'autre, je veux dire. … Rien."] },
];

// Acte 3 : les Chill&Cool de cette réalité se souviennent par fragments, et
// le disent quand ils sont dans l'équipe. Le guide ne sait pas quoi répondre.
function echoLines(v: GuideView): GuideLine[] {
  const lines: GuideLine[] = [];
  if (hasInTeam(v, 'ouchuu') && v.prestigeLevel >= 2) {
    lines.push({ id: 'e_ouchuu2', parts: [{ by: 'ouchuu', text: `Tu as déjà eu l'impression d'avoir vécu une journée en entier… ${v.prestigeLevel} fois ?` }, '…', 'Oui.'] });
  }
  if (hasInTeam(v, 'elfuzzion')) {
    lines.push({ id: 'e_elfuzzion1', parts: [{ by: 'elfuzzion', text: "T'entends pas un bruit, toi ? Genre un grésillement, très loin." }, 'Non.', '… Si. Depuis longtemps.'] });
    lines.push({ id: 'e_elfuzzion2', parts: [{ by: 'elfuzzion', text: "J'ai un son dans la tête. Je l'ai jamais entendu, et pourtant je connais la fin." }, 'Ne le finis pas.'] });
  }
  if (hasInTeam(v, 'rokoul_ayro')) {
    lines.push({ id: 'e_rokoul1', parts: [{ by: 'rokoul_ayro', text: 'Pourquoi tu nous regardes toujours comme si on allait disparaître ?' }, 'Parce que vous êtes deux.', '… Restez-le.'] });
  }
  if (hasInTeam(v, 'nekoz')) {
    lines.push({ id: 'e_nekoz1', parts: [{ by: 'nekoz', text: "Hé. Pourquoi t'as mes cornes, toi ?" }, "C'est toi qui as les miennes."] });
  }
  return lines;
}

// La nuit (0 h – 5 h), à partir de l'acte 2. Le jeu a déjà « L'Heure des Chats » (3 h 33).
const NIGHT_LINE: GuideLine = { id: 'night', parts: ['Tu devrais dormir.', '… Elle non plus, elle ne dormait plus.'] };

// Rencontre secrète du Château de Nakime (« Un chat à cornes ») : le choix du
// joueur y est mémorisé dans `seen` ('nakime:sit' / 'nakime:ask'), et le guide
// y réagit une fois sur l'accueil, en niant y avoir jamais mis les pieds.
export const NAKIME_GUIDE_EVENT_ID = 'chat_cornes';
export const nakimeChoiceMark = (optionIndex: number) => (optionIndex === 0 ? 'nakime:sit' : 'nakime:ask');
const NAKIME_REACTIONS: { mark: string; line: GuideLine }[] = [
  { mark: 'nakime:sit', line: { id: 'react:nakime', parts: ["Tu t'es assis à côté de moi. Dans ce couloir.", "… Quoi ? Non. Je n'ai jamais mis les pieds dans ce Château."] } },
  { mark: 'nakime:ask', line: { id: 'react:nakime', parts: ['Il paraît que tu as posé des questions à un chat, au Château.', "Les chats ne répondent pas. C'est pour ça qu'on les aime."] } },
];

// Fin de la chaîne de quêtes actuelle : le joueur sait que la suite viendra.
const CHAIN_END_LINE: GuideLine = { id: 'end:chain', parts: ["C'est tout pour l'instant.", '… Je ne vais nulle part. Promis.'] };

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
  if (!quest && !g.seen.includes(CHAIN_END_LINE.id)) return CHAIN_END_LINE;

  for (const r of CHILL_REACTIONS) {
    if (v.compadexCharactersSeen?.[r.charId] && !g.seen.includes(r.line.id)) return r.line;
  }
  for (const r of NAKIME_REACTIONS) {
    if (g.seen.includes(r.mark) && !g.seen.includes(r.line.id)) return r.line;
  }
  return null;
}

// Réplique à dire au prochain clic : celle en attente, sinon une réplique au
// hasard parmi celles que la situation autorise, sans répéter `previousId`.
export function nextGuideLine(v: GuideView, previousId: string | null, rnd: () => number = Math.random, now: Date = new Date()): GuideLine {
  const pending = pendingGuideLine(v);
  if (pending) return pending;

  if (rnd() < ANGEL_CHANCE && previousId !== ANGEL_LINE.id) return ANGEL_LINE;

  const pool = [...BASE_LINES];
  if ((v.runPeakPalier ?? v.maxPalierReached) >= PRESTIGE_UNLOCK_PALIER) pool.push(...PRESTIGE_READY_LINES);
  if (v.prestigeLevel >= 10) pool.push(...VETERAN_LINES);
  if (v.nekozGuide.questIndex >= ACT_2_FIRST_QUEST) pool.push(...ACT_2_LINES);
  if (v.nekozGuide.questIndex >= ACT_3_FIRST_QUEST) pool.push(...echoLines(v));
  if (v.nekozGuide.questIndex >= ACT_2_FIRST_QUEST && now.getHours() < 5) pool.push(NIGHT_LINE);
  if (hasInTeam(v, 'ouchuu')) pool.push(OUCHUU_TEAM_LINE);
  if (hasInTeam(v, 'nekoz')) pool.push(NEKOZ_TEAM_LINE);
  const choices = pool.filter(l => l.id !== previousId);
  return choices[Math.floor(rnd() * choices.length)] ?? pool[0];
}

// Répliques dites une seule fois : à mémoriser dans `seen` une fois affichées.
export function isOneShotLine(id: string): boolean {
  return id.startsWith('quest:') || id.startsWith('meet:') || id.startsWith('end:') || id.startsWith('react:');
}

// ── Indices discrets dans les autres pages ─────────────────────────────────
// Chaque indice n'apparaît qu'après la quête qui lui donne du sens (`after`),
// ou dès l'arrivée du guide (`after: null`). Aucun ne change une règle du jeu.
export const GUIDE_CLUES = {
  raidRokoul:      { after: 'g14_rokoul',    text: 'Et ne les séparez jamais.' },
  elfuzzionEggs:   { after: 'g13_elfuzzion', text: '… Et pourquoi ils grésillent ?' },
  stoneMemory:     { after: 'g12_stones',    text: "Les pierres se souviennent. Quelqu'un d'autre aussi." },
  prestigeConfirm: { after: null,            text: 'Tout le monde reviendra. … Compte-les quand même.' },
  anomalies:       { after: 'g7_anomaly',    text: 'Certaines anomalies ne sont pas des bonus.' },
  credits:         { after: 'g15_name',      text: 'guide' },
} as const satisfies Record<string, { after: string | null; text: string }>;
export type GuideClue = keyof typeof GUIDE_CLUES;

export function isClueVisible(g: GuideState | undefined, clue: GuideClue): boolean {
  if (!g || g.arrivalPrestige === null) return false;
  const after = GUIDE_CLUES[clue].after;
  return after === null || g.questIndex > GUIDE_QUESTS.findIndex(q => q.id === after);
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
