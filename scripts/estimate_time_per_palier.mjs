/* ── Comment lancer ce script ────────────────────────────────────────────
 *   node scripts/estimate_time_per_palier.mjs
 *
 * Aucune dépendance à installer (script Node pur). Options facultatives :
 *   node scripts/estimate_time_per_palier.mjs --rarity=C --paliers=20 --baseDps=45 --seed=42
 *     --rarity=    rareté de DÉPART de l'équipe C | U | R | E | L | M | S |
 *                  CO | P | T (défaut C) — avant le premier pull gacha
 *     --paliers=   nombre de paliers à simuler                             (défaut 50)
 *     --baseDps=   force un DPS de base identique à CHAQUE rareté au lieu
 *                  des valeurs par défaut (utile pour isoler l'effet du
 *                  seul changement de pow/rareté)
 *     --seed=      graine du tirage aléatoire (drops d'équipement ET pulls
 *                  gacha) (défaut 42) — MÊME seed = résultat identique à
 *                  chaque lancement ; change-la (ou lance plusieurs fois
 *                  avec des seeds différentes) pour voir la variance d'un
 *                  joueur malchanceux/chanceux au tirage.
 *     --chestLookahead=  horizon (en kills) utilisé pour juger si le
 *                  Coffre d'Or est plus rentable qu'un level-up MAINTENANT
 *                  (défaut 10) — voir spendPool. Plus grand = le Coffre
 *                  est acheté plus tôt (on suppose un farm plus long à
 *                  venir) ; 0 = jamais rentable face à un level-up (revient
 *                  à l'ancien comportement "toujours niveler en premier").
 *
 * Estime le temps moyen (idéalisé) passé par palier de combat, en simulant
 * une progression de joueur à partir des formules réelles du jeu :
 *   - PV ennemis / gains PixelCoins : lib/game/enemies.ts (generateEnemy)
 *   - DPS perso                     : lib/game/formulas.ts (calcCharDps)
 *   - Coût de niveau                : lib/game/formulas.ts (levelUpCost)
 *
 * MODÈLE (volontairement simplifié — donne une BORNE INFÉRIEURE du temps
 * réel, pas une prédiction exacte) :
 *   - Équipe de 4 (taille de store/gameStore.ts::equippedTeam) personnages,
 *     forme de base (pas d'évo), édition de base — aucune synergie ni buff
 *     d'event (les ultimes SONT simulés, voir plus bas ; le RANG aussi,
 *     voir juste après).
 *   - La rareté de l'équipe émerge de VRAIS PULLS GACHA (lib/game/gacha.ts::
 *     rollRarity/RARITY_GATES/getDynamicRates, copiés tels quels : taux par
 *     rareté débloqués progressivement par palier, interpolés entre
 *     rateAtUnlock et rateAtMax jusqu'au palier 40, normalisés à 100%).
 *     Chaque pull coûte 10 gemmes (GACHA_COSTS.single) ; le nombre de pulls
 *     n'est PAS libre, il dépend des gemmes réellement gagnables en jouant
 *     — voir "Budget de pulls" ci-dessous.
 *   - Rang (store/slices/gachaSlice.ts::addToCollection) : en jeu, un pull
 *     qui retombe sur EXACTEMENT le même perso (même templateId, même
 *     édition) déjà possédé monte son rang de +1 (plafond 7 : ×1 → ×1.4 →
 *     ×1.9 → ×2.6 → ×3.5 → ×5.5 → ×9, table RANK_MULT). Ce script ne suit
 *     pas de perso précis (seulement sa rareté), donc pour rester réaliste
 *     sur la fréquence des doublons, chaque membre de l'équipe se voit
 *     assigner une "identité" anonyme aléatoire dans le pool de sa rareté
 *     dès qu'il la rejoint (CHAR_POOL_SIZE_BY_RARITY, comptage réel des
 *     persos par rareté dans lib/game/characters.ts::BANNER_POOL) ; un
 *     pull n'est traité comme un doublon (rang +1) QUE s'il retombe sur la
 *     même rareté ET la même identité qu'un membre déjà en équipe
 *     (probabilité ≈ 1/taille du pool de cette rareté — ex: 1/3 pour un
 *     Transcendant, 1/38 pour un Commun) — sinon, si sa rareté dépasse
 *     celle du membre le moins rare de l'équipe, il REMPLACE ce membre
 *     (nouvelle identité, rang repart à 1, niveau déjà acquis CONSERVÉ) ;
 *     sinon il est perdu. La composition réelle de l'équipe (ex: "CCCU" =
 *     3 Communs + 1 Peu Commun) est affichée à chaque palier (colonne
 *     "Équipe"), le rang de chacun dans la colonne "Rangs" (même ordre), et
 *     le nombre cumulé de pulls dans la colonne "Pulls".
 *   - Budget de pulls (gemmes, choix de modélisation laissé à ce script,
 *     aucune règle du jeu ne le fixe explicitement) : les gemmes gagnées
 *     sont celles réellement données par le jeu à la progression — la
 *     récompense de palier franchi (getPalierPassGems = palier×10 👑,
 *     versée à chaque mort de boss, y compris en re-tentant), la gemme
 *     garantie de la vague 5 (gemsReward dans enemies.ts), les SUCCÈS
 *     (lib/game/achievements.ts) et les QUÊTES journalières/hebdomadaires
 *     (store/gameStoreHelpers.ts) dont le seuil est calculable à partir de
 *     compteurs déjà simulés ici (kills cumulés, boss vaincus, palier
 *     atteint, upgrades perso+Coffre d'Or, pulls gacha) — voir "Succès &
 *     quêtes" ci-dessous. 100% de ces gemmes sont dépensées en pulls
 *     simples dès que possible (même logique de réinvestissement immédiat
 *     que les PixelCoins) — ignore les autres sources de gemmes du jeu
 *     (coffres, achats, mine post-Prestige) : c'est donc un budget de
 *     pulls PLANCHER, pas le rythme réel d'un joueur qui dépense aussi
 *     ailleurs.
 *   - Succès & quêtes (gemmes) : SUCCÈS = paliers de seuils UNIQUES (une
 *     seule fois chacun) sur kills/boss/palier/upgrades/pulls cumulés,
 *     valeurs exactes copiées de lib/game/achievements.ts (voir
 *     ACHIEVEMENTS_* ci-dessous — le seuil upgrade "500" rapporte
 *     volontairement MOINS que le seuil "200" : c'est un vrai déséquilibre
 *     du jeu, pas une coquille de ce script). QUÊTES = journalières (cycle
 *     24h) et hebdomadaires (cycle 7j) sur les MÊMES compteurs remis à
 *     zéro à chaque cycle ; chacune a plusieurs variantes tirées au hasard
 *     au reset en jeu — ce script utilise la MOYENNE des variantes (seuil
 *     et récompense) pour rester déterministe sans ajouter un flux
 *     aléatoire de plus. Le reset réel dépend de l'horloge murale (2h du
 *     matin, Paris) ; ce script n'a que le temps de jeu SIMULÉ, donc le
 *     cycle est approximé par tranches de 24h/7j de ce temps simulé —
 *     réaliste pour un joueur qui joue en continu, optimiste si le joueur
 *     s'arrête souvent (les jours "off" ne comptent pas ici).
 *   - Équipement (lib/game/items.ts) : chaque perso a bien SES 5 emplacements
 *     propres (casque/plastron/pantalon/bottes/arme — pas un set partagé par
 *     l'équipe), soit ${TEAM_SIZE}×5=20 emplacements au total, tous affichés
 *     (colonne "Équipement", 4 groupes de 5 lettres). Chaque ennemi tué
 *     (mob ou boss, farm inclus) tente un VRAI tirage pondéré par rareté
 *     (copie exacte de getEquipmentDrop, EQUIP_RARITY_WEIGHT/
 *     EQUIP_RARITY_ORDER, limité aux raretés débloquées au palier courant
 *     — EQUIP_RARITY_MIN_PALIER) — la plupart des kills NE RAPPORTENT RIEN.
 *     Quand une pièce est obtenue, elle REMPLACE l'emplacement le plus
 *     faible parmi les 20 SEULEMENT si elle est meilleure (comparaison
 *     globale, pas par perso — un joueur optimal donne toujours sa
 *     meilleure pièce à l'emplacement qui en a le plus besoin) ; l'ancienne
 *     pièce déplacée (ou la pièce reçue si elle n'était pas assez bonne)
 *     devient fodder de fusion pour SA rareté. Fusion 10 pour 1 (comme en
 *     jeu, pickEquipmentUpgradeOutput) : 10 pièces fodder d'une rareté
 *     donnée fusionnent en 1 pièce de la rareté supérieure, qui retente
 *     aussitôt de remplacer l'emplacement le plus faible — en cascade si
 *     besoin. Contrairement au tirage, la FUSION n'est PAS plafonnée par le
 *     déblocage du palier (pickEquipmentUpgradeOutput n'a aucune contrainte
 *     de ce type en jeu). Multiplicateur de DPS d'un perso = produit des
 *     mult. de base (RARITY_BASE_MULT) de SES 5 pièces, appliqué à SON
 *     propre DPS (pas un multiplicateur plat sur toute l'équipe). Résultat
 *     désormais ALÉATOIRE (voir --seed).
 *   - 100% des PixelCoins gagnés sont réinjectés IMMÉDIATEMENT, ARBITRÉS
 *     entre niveler le perso le moins niveauté de l'équipe et acheter le
 *     niveau suivant du Coffre d'Or (store/slices/characterSlice.ts::
 *     upgradeGold — un multiplicateur ×1.2 PERMANENT sur tous les futurs
 *     gains de PixelCoins, débloqué progressivement, niveau max achetable
 *     = palier déjà atteint) : à chaque achat, on prend l'option la plus
 *     rentable PAR PIXELCOIN dépensé plutôt qu'une priorité rigide — le
 *     Coffre d'Or n'est PAS toujours moins bon qu'un level-up, notamment en
 *     tout début de farm prolongé où son bonus permanent a le temps de se
 *     rentabiliser plusieurs fois (voir spendPool, --chestLookahead). Le
 *     coût du coffre grimpe bien plus vite que le butin de base (voir
 *     GOLD_CHEST_COST_GROWTH ci-dessous) : il n'est PAS toujours achetable,
 *     l'achat n'a lieu que si le pool le permet.
 *     Un joueur réel dépense aussi en évolutions, forge, boutique, etc. →
 *     le temps réel est plus long.
 *   - Ultimes (lib/game/ultimates.ts) : tous identiques dans leur forme
 *     (×DPS pendant X secondes, cooldown 110s), seuls durée et
 *     multiplicateur dépendent de la rareté (RARITY_ULT — C:×1.2/8s ...
 *     T:×3.0/17s). On suppose les 4 ultimes de l'équipe DISPONIBLES au
 *     début de CHAQUE tentative de boss (cooldown 110s > durée d'un
 *     combat, idéalisation cohérente avec le reste du modèle) et
 *     enchaînés SANS chevauchement, le plus fort multiplicateur en premier
 *     (le joueur optimal grille ses plus gros bursts pendant que les PV du
 *     boss sont encore hauts). Exemple : 4 persos Stellaire → ×2.4 DPS
 *     pendant 14×4=56s, puis DPS normal sur le reste des 90s. Uniquement
 *     appliqué PENDANT le combat de boss (pas sur les vagues 1-9, où le
 *     cooldown 110s ne serait quasiment jamais dispo entre deux combats
 *     courts) — voir bossKillSecondsWithUlts.
 *   - Le timer de boss (90s, voir PalierConfig.bossTimerSeconds) EST une
 *     contrainte dure : si le boss ne peut pas être tué en moins de 90s au
 *     DPS courant (ultimes inclus), le joueur simulé re-farme les vagues
 *     1-9 du palier (comme le permet travelToPalier() en jeu) autant de
 *     fois que nécessaire pour gagner des PixelCoins, monter de niveau, et
 *     retenter le boss — jusqu'à passer sous les 90s. Ce temps de farm est
 *     compté dans le temps du palier (colonne "Farm"). Si aucune quantité
 *     de farm ne suffit (plafond de sécurité atteint), le palier est
 *     marqué INFRANCHISSABLE et la simulation s'arrête là.
 *
 * Ce script est un outil d'équilibrage (game design), pas un rapport sur
 * des données joueurs réelles.
 *
 * `simulate()` est exportée : scripts/sweep_time_per_palier.mjs (à la
 * racine du même dossier) l'importe pour relancer la simulation plusieurs
 * fois avec des seeds différentes sans repasser par le CLI.
 */
import { pathToFileURL } from 'node:url';

// ── Constantes recopiées des fichiers de formules (sources ci-dessus) ──────
const HP_BASE = 120, HP_GROWTH = 1.12;
const COIN_BASE = 60, COIN_GROWTH = 1.13, COIN_BOSS_MULT = 12;
const LEVEL_COST_BASE = 60, LEVEL_COST_GROWTH = 1.05;
// Coffre d'Or (store/gameStoreHelpers.ts::getGoldChestCost/getGoldChestMultiplier) :
// coût = GOLD_CHEST_COST_GROWTH^(niveau*10-1) × GOLD_CHEST_COST_BASE × GOLD_CHEST_MULT_GROWTH^niveau
// multiplicateur de gains = GOLD_CHEST_MULT_GROWTH^niveau. Niveau max achetable
// = palier déjà atteint (store/slices/characterSlice.ts::upgradeGold).
const GOLD_CHEST_COST_BASE   = COIN_BASE * 50;   // = 3000
const GOLD_CHEST_COST_GROWTH = COIN_GROWTH + 0.02; // = 1.15, croît plus vite que le butin de base
const GOLD_CHEST_MULT_GROWTH = 1.2;
// Horizon (en nombre de kills) utilisé pour évaluer si acheter le Coffre
// d'Or MAINTENANT est plus rentable que niveler un perso — voir spendPool
// et --chestLookahead en tête de fichier.
const DEFAULT_GOLD_CHEST_LOOKAHEAD_KILLS = 10;
const TEAM_SIZE = 4;
const BOSS_TIMER_SECONDS = 90;
// Nombre max de passages de farm (re-clear vagues 1-9) tentés par palier
// avant d'abandonner et de marquer le palier comme infranchissable dans ce
// modèle (garde-fou anti-boucle infinie : voir tête de fichier).
const MAX_FARM_PASSES = 2000;

// Multiplicateur de PV par vague (1..10), identique pour les 40 paliers
// définis dans lib/game/enemies.ts::PALIER_ENEMIES (vague 10 = boss ×10).
const WAVE_HP_MULT = [1, 1.15, 1.3, 1.45, 1.6, 1.75, 1.9, 2.05, 2.2, 10];

// dpsMultiplier par rareté (lib/game/formulas.ts::RARITY_CONFIG), et un
// baseDps "représentatif" par rareté, échantillonné dans lib/game/characters.ts
// (les vrais persos varient un peu autour de ces valeurs).
const RARITY = {
  C:  { pow: 1.024, baseDps: 10  },
  U:  { pow: 1.025, baseDps: 20  },
  R:  { pow: 1.026, baseDps: 30  },
  E:  { pow: 1.027, baseDps: 40  },
  L:  { pow: 1.028, baseDps: 50  },
  M:  { pow: 1.029, baseDps: 60  },
  S:  { pow: 1.030, baseDps: 70  },
  CO: { pow: 1.031, baseDps: 80  },
  P:  { pow: 1.032, baseDps: 90  },
  T:  { pow: 1.033, baseDps: 100 },
};
const RARITY_KEYS = Object.keys(RARITY); // ordre croissant C -> T

// Rang (lib/game/formulas.ts::RARITY_CONFIG rankMult) : multiplicateur de
// DPS par rang, indexé sur min(rang-1, 6) — rang 1..7, plafond ×9 au rang 7.
const RANK_MULT = [1, 1.4, 1.9, 2.6, 3.5, 5.5, 9.0];
function rankMultFor(rank) { return RANK_MULT[Math.min(rank - 1, RANK_MULT.length - 1)]; }

// Nombre réel de persos jouables par rareté (comptage dans
// lib/game/characters.ts::BANNER_POOL) — sert à estimer la probabilité
// qu'un pull soit un DOUBLON exact d'un membre déjà en équipe (voir tête de
// fichier, section "Rang"). Approximatif : inclut quelques persos exclusifs
// aux events (normalement retirés du pool gacha par GACHA_EXCLUDED_IDS),
// négligeable pour l'usage qu'on en fait ici.
const CHAR_POOL_SIZE_BY_RARITY = { C: 38, U: 29, R: 13, E: 18, L: 21, M: 20, S: 23, CO: 10, P: 18, T: 3 };

// Équipement (lib/game/items.ts) : palier minimum pour débloquer chaque
// rareté d'équipement (EQUIP_RARITY_MIN_PALIER), et multiplicateur de DPS
// de base par emplacement pour cette rareté (RARITY_BASE_MULT). Un set
// complet = 5 emplacements (casque/plastron/pantalon/bottes/arme).
const EQUIP_RARITY_MIN_PALIER = { C:1, U:3, R:5, E:7, L:9, M:11, S:13, CO:15, P:17, T:19 };
const EQUIP_RARITY_BASE_MULT  = { C:1.05, U:1.08, R:1.12, E:1.17, L:1.23, M:1.3, S:1.38, CO:1.47, P:1.57, T:1.68 };
const EQUIP_SLOT_COUNT = 5;
// Craft d'équipement (lib/game/items.ts::pickEquipmentUpgradeOutput) : 10
// pièces fodder d'un emplacement+rareté → 1 pièce de la rareté supérieure.
const EQUIPMENT_FUSE_SIZE = 10;

// Taux de drop d'équipement (copie exacte de lib/game/items.ts) : poids par
// rareté (% par kill, avant filtrage des raretés non débloquées) et ordre
// de test des bandes cumulées (du plus rare au plus commun).
const EQUIP_RARITY_WEIGHT = { C: 33, U: 1, R: 0.5, E: 0.2, L: 0.1, M: 0.05, S: 0.025, CO: 0.0125, P: 0.00625, T: 0.003125 };
const EQUIP_RARITY_ORDER = ['T', 'P', 'CO', 'S', 'M', 'L', 'E', 'R', 'U', 'C'];

// Ultimes (lib/game/ultimates.ts::RARITY_ULT) : durée (s) et multiplicateur
// de DPS par rareté — identiques pour tous les persos de cette rareté,
// cooldown 110s partout (jamais la contrainte ici, voir tête de fichier).
const ULT_BY_RARITY = {
  C:  { duration: 8,  mult: 1.2 },
  U:  { duration: 9,  mult: 1.4 },
  R:  { duration: 10, mult: 1.6 },
  E:  { duration: 11, mult: 1.8 },
  L:  { duration: 12, mult: 2.0 },
  M:  { duration: 13, mult: 2.2 },
  S:  { duration: 14, mult: 2.4 },
  CO: { duration: 15, mult: 2.6 },
  P:  { duration: 16, mult: 2.8 },
  T:  { duration: 17, mult: 3.0 },
};

// Gacha (lib/game/gacha.ts) : coût d'un pull simple (GACHA_COSTS.single), et
// seuils de déblocage/taux par rareté (RARITY_GATES) — copie exacte. Le taux
// de chaque rareté débloquée interpole linéairement entre rateAtUnlock (à
// unlockPalier) et rateAtMax (au palier 40), puis tout est normalisé à 100%.
const GACHA_PULL_COST = 10;
const GACHA_MAX_PALIER = 40;
const GACHA_RARITY_GATES = {
  C:  { unlockPalier: 1,  rateAtUnlock: 100.0000, rateAtMax: 30.000 },
  U:  { unlockPalier: 3,  rateAtUnlock: 5.0000,  rateAtMax: 20.000 },
  R:  { unlockPalier: 5,  rateAtUnlock: 2.0000,  rateAtMax: 15.000 },
  E:  { unlockPalier: 7,  rateAtUnlock: 0.5000,  rateAtMax: 10.000 },
  L:  { unlockPalier: 9,  rateAtUnlock: 0.1500,  rateAtMax: 4.000 },
  M:  { unlockPalier: 11, rateAtUnlock: 0.0300,  rateAtMax: 1.500 },
  S:  { unlockPalier: 13, rateAtUnlock: 0.0060,  rateAtMax: 0.500 },
  CO: { unlockPalier: 15, rateAtUnlock: 0.0015,  rateAtMax: 0.100 },
  P:  { unlockPalier: 17, rateAtUnlock: 0.0006,  rateAtMax: 0.050 },
  T:  { unlockPalier: 19, rateAtUnlock: 0.0002,  rateAtMax: 0.010 },
};
// Récompenses en gemmes qui financent les pulls (voir tête de fichier) :
// palier franchi (lib/game/gameStoreHelpers.ts::getPalierPassGems = palier×10)
// et gemme garantie de la vague 5 (lib/game/enemies.ts::generateEnemy).
const PALIER_PASS_GEMS_PER_LEVEL = 10;
const WAVE5_GEM_REWARD = 1;

// Succès (lib/game/achievements.ts) qui rapportent des gemmes, indexés sur
// des compteurs déjà simulés ici. Paires [seuil, gemmes], triées croissant,
// chaque palier ne se déclenche qu'UNE fois (voir claimAchievements).
const ACHIEVEMENTS_KILLS   = [[500, 15], [5000, 50], [50000, 150], [500000, 500], [1000000, 1000]];
const ACHIEVEMENTS_BOSS    = [[1, 10], [5, 25], [20, 100], [100, 250]];
const ACHIEVEMENTS_PALIER  = [[5, 20], [10, 50], [15, 100], [20, 500], [40, 1000]];
// Le seuil 500 rapporte moins (50) que le seuil 200 (300) : vrai déséquilibre
// du jeu (lib/game/achievements.ts::upgrade_50/upgrade_200), pas une erreur.
const ACHIEVEMENTS_UPGRADE = [[50, 10], [200, 300], [500, 50]];
const ACHIEVEMENTS_PULLS   = [[1, 5], [10, 10], [100, 30], [500, 150], [1000, 400], [5000, 1000]];

// Quêtes journalières/hebdomadaires (store/gameStoreHelpers.ts) qui
// rapportent des gemmes sur les mêmes compteurs, remis à zéro à chaque
// cycle. Chaque quête a plusieurs variantes tirées au hasard en jeu ; on
// prend la MOYENNE (seuil, récompense) de chaque — voir tête de fichier.
const DAY_SECONDS = 86400;
const WEEK_SECONDS = 7 * DAY_SECONDS;
// d_kills {250→12, 500→18, 1000→28}
const DAILY_KILLS_TARGET = 583.33, DAILY_KILLS_REWARD = 19.33;
// d_upgrade {100→15} — variante unique
const DAILY_UPGRADE_TARGET = 100, DAILY_UPGRADE_REWARD = 15;
// d_boss_palier {1→20, 2→35}
const DAILY_BOSS_TARGET = 1.5, DAILY_BOSS_REWARD = 27.5;
// d_gacha {50→20, 100→35}
const DAILY_GACHA_TARGET = 75, DAILY_GACHA_REWARD = 27.5;
// w_kills {5000→70, 7500→100, 10000→140}
const WEEKLY_KILLS_TARGET = 7500, WEEKLY_KILLS_REWARD = 103.33;
// w_upgrade {1000→60, 1500→85, 2000→110}
const WEEKLY_UPGRADE_TARGET = 1500, WEEKLY_UPGRADE_REWARD = 85;
// w_boss_palier {5→90, 8→130, 10→160}
const WEEKLY_BOSS_TARGET = 7.67, WEEKLY_BOSS_REWARD = 126.67;
// w_gacha {750→100, 1000→130, 1250→160, 1500→190}
const WEEKLY_GACHA_TARGET = 1125, WEEKLY_GACHA_REWARD = 145;

// Quête d'event permanente (EVENT_QUESTS::e_palier_20, store/gameStoreHelpers.ts) :
// une seule fois, à l'atteinte du palier 20.
const EVENT_PALIER20_GEMS = 300;

// Taux (bruts, non normalisés) de chaque rareté débloquée à ce palier — le
// total sert de dénominateur pour un tirage direct sans étape de
// normalisation séparée (équivalent, moins de calcul flottant inutile).
function gachaRawRatesForPalier(palier) {
  const clamped = Math.min(palier, GACHA_MAX_PALIER);
  const raw = {};
  let total = 0;
  for (const key of RARITY_KEYS) {
    const gate = GACHA_RARITY_GATES[key];
    if (clamped < gate.unlockPalier) continue;
    const range = GACHA_MAX_PALIER - gate.unlockPalier;
    const progress = range <= 0 ? 1 : (clamped - gate.unlockPalier) / range;
    raw[key] = Math.max(0, gate.rateAtUnlock + (gate.rateAtMax - gate.rateAtUnlock) * progress);
    total += raw[key];
  }
  return { raw, total };
}

function rollGachaRarityIndex(rng, palier) {
  const { raw, total } = gachaRawRatesForPalier(palier);
  if (total <= 0) return 0; // sécurité (C est toujours débloqué dès le palier 1)
  const roll = rng() * total;
  let acc = 0;
  for (const key of RARITY_KEYS) {
    if (!(key in raw)) continue;
    acc += raw[key];
    if (roll < acc) return RARITY_KEYS.indexOf(key);
  }
  return RARITY_KEYS.indexOf('C');
}

// Temps pour tuer le boss en tenant compte des 4 ultimes d'équipe : chacune
// boost le DPS de base pendant sa durée propre, enchaînées sans
// chevauchement, la plus forte en premier (voir tête de fichier). Retourne
// le temps réel — au-delà du cumul des durées d'ulti, retombe sur baseDps.
function bossKillSecondsWithUlts(hp, baseDps, memberRarityIdx) {
  const segments = memberRarityIdx
    .map(idx => ULT_BY_RARITY[RARITY_KEYS[idx]])
    .sort((a, b) => b.mult - a.mult);
  let hpLeft = hp;
  let elapsed = 0;
  for (const seg of segments) {
    const dps = baseDps * seg.mult;
    const dmg = dps * seg.duration;
    if (dmg >= hpLeft) return elapsed + hpLeft / dps;
    hpLeft -= dmg;
    elapsed += seg.duration;
  }
  return elapsed + hpLeft / baseDps;
}

function parseArgs(argv) {
  const out = { rarity: 'C', paliers: 50, baseDps: null, seed: 42, chestLookahead: DEFAULT_GOLD_CHEST_LOOKAHEAD_KILLS };
  for (const arg of argv) {
    const [key, val] = arg.replace(/^--/, '').split('=');
    if (key === 'rarity') out.rarity = val.toUpperCase();
    else if (key === 'paliers') out.paliers = parseInt(val, 10);
    else if (key === 'baseDps') out.baseDps = parseFloat(val);
    else if (key === 'seed') out.seed = parseInt(val, 10);
    else if (key === 'chestLookahead') out.chestLookahead = parseFloat(val);
  }
  return out;
}

// PRNG seedé (mulberry32) — déterministe : la même seed reproduit toujours
// le même tirage de drops, contrairement à Math.random() utilisé en jeu.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Tirage d'un drop d'équipement (copie du comportement de getEquipmentDrop) :
// roule sur 100, ne considère que les raretés d'index ≤ maxUnlockedIdx,
// retourne l'index de rareté obtenu ou -1 si aucun drop ce kill (cas le
// plus fréquent — les poids sont des % par kill, pas garantis).
function rollEquipmentDropIndex(rng, maxUnlockedIdx) {
  const roll = rng() * 100;
  let acc = 0;
  for (const key of EQUIP_RARITY_ORDER) {
    const idx = RARITY_KEYS.indexOf(key);
    if (idx > maxUnlockedIdx) continue;
    acc += EQUIP_RARITY_WEIGHT[key];
    if (roll < acc) return idx;
  }
  return -1;
}

// Meilleure rareté d'équipement débloquée à ce palier (mêmes seuils que le
// jeu — voir EQUIP_RARITY_MIN_PALIER ci-dessus).
function equipRarityForPalier(palier) {
  let best = RARITY_KEYS[0];
  for (const key of RARITY_KEYS) if (EQUIP_RARITY_MIN_PALIER[key] <= palier) best = key;
  return best;
}

function levelUpCost(level) {
  return LEVEL_COST_BASE * Math.pow(LEVEL_COST_GROWTH, level - 1);
}

// Coût pour passer le Coffre d'Or de `level` à `level+1` (voir formule en
// tête de fichier — copie exacte de getGoldChestCost dans gameStoreHelpers.ts).
function goldChestCost(level) {
  return Math.pow(GOLD_CHEST_COST_GROWTH, level * 10 - 1) * GOLD_CHEST_COST_BASE * Math.pow(GOLD_CHEST_MULT_GROWTH, level);
}

function goldChestMultiplier(level) {
  return Math.pow(GOLD_CHEST_MULT_GROWTH, level);
}

// Reproduit calcCharDps() (formulas.ts) : MAX(courbe exponentielle, +1/niveau).
function rawDpsAtLevel(pow, baseDps, level, rankMult) {
  const tierMult = Math.round(level / 100) + 1; // palier tous les 100 niveaux
  return Math.pow(pow, level - 1) * baseDps * tierMult * rankMult;
}

function fmtTime(seconds) {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}min`;
  return `${(seconds / 3600).toFixed(2)}h`;
}

export function simulate({ rarity, paliers, baseDps, seed, chestLookahead }) {
  const startCfg = RARITY[rarity];
  if (!startCfg) throw new Error(`Rareté inconnue: ${rarity} (attendu: ${RARITY_KEYS.join(', ')})`);
  const startIdx = RARITY_KEYS.indexOf(rarity);
  // Deux flux aléatoires INDÉPENDANTS (dérivés de la même seed, mais avec
  // des graines différentes) plutôt qu'un seul partagé : sinon, comparer
  // deux runs qui ne diffèrent QUE par --chestLookahead (ou tout autre
  // paramètre qui change le rythme de DPS) déciderait aussi, en cascade,
  // du nombre de kills/pulls à chaque instant → décale TOUS les tirages
  // suivants sur un flux unique, et mélange l'effet mesuré avec du bruit
  // RNG. Avec deux flux séparés, tant que le nombre de tirages d'un type
  // donné (drops d'équipement, pulls gacha) reste identique entre deux
  // runs, leurs résultats restent identiques sur ce flux — seule une VRAIE
  // divergence (plus/moins de kills ou de pulls) fait diverger un flux, à
  // partir du point de divergence seulement.
  const rngEquip = mulberry32(seed);
  const rngGacha = mulberry32(seed ^ 0x9e3779b9);

  // Rareté/pow/base/rang/identité INDIVIDUELS par membre de l'équipe (index
  // 0..TEAM_SIZE-1) : chacun peut être à une rareté et un rang différents,
  // voir gainGems (pulls gacha) et resolvePull. memberIdentity = position
  // anonyme dans le pool de sa rareté (voir tête de fichier, section "Rang")
  // — sert uniquement à détecter les doublons, pas affiché.
  const memberRarityIdx = new Array(TEAM_SIZE).fill(startIdx);
  const memberPow  = new Array(TEAM_SIZE).fill(startCfg.pow);
  const memberBase = new Array(TEAM_SIZE).fill(baseDps ?? startCfg.baseDps);
  const memberRank = new Array(TEAM_SIZE).fill(1);
  const memberIdentity = new Array(TEAM_SIZE)
    .fill(0)
    .map(() => Math.floor(rngGacha() * CHAR_POOL_SIZE_BY_RARITY[rarity]));

  const levels = new Array(TEAM_SIZE).fill(1);
  const charDps = memberPow.map((p, i) => rawDpsAtLevel(p, memberBase[i], 1, rankMultFor(memberRank[i])));
  let coinPool = 0;
  let goldLevel = 0;
  let cumulativeSeconds = 0;

  // Un pull gacha résolu (voir tête de fichier, section "Rang") :
  //  1) DOUBLON exact (même rareté ET même identité qu'un membre déjà en
  //     équipe) → rang +1 (plafond 7), niveau et identité inchangés.
  //  2) sinon, si meilleur que le membre le moins rare de l'équipe →
  //     REMPLACE ce membre (nouvelle rareté/identité, rang repart à 1,
  //     niveau déjà acquis conservé).
  //  3) sinon → perdu.
  const resolvePull = (rolledIdx) => {
    const poolSize = CHAR_POOL_SIZE_BY_RARITY[RARITY_KEYS[rolledIdx]];
    const rolledIdentity = Math.floor(rngGacha() * poolSize);

    for (let i = 0; i < TEAM_SIZE; i++) {
      if (memberRarityIdx[i] === rolledIdx && memberIdentity[i] === rolledIdentity) {
        if (memberRank[i] < RANK_MULT.length) {
          memberRank[i] += 1;
          charDps[i] = Math.max(charDps[i], rawDpsAtLevel(memberPow[i], memberBase[i], levels[i], rankMultFor(memberRank[i])));
        } // sinon : rang déjà max (7), doublon perdu (comme championInventory en jeu)
        return;
      }
    }

    let worst = 0;
    for (let i = 1; i < TEAM_SIZE; i++) if (memberRarityIdx[i] < memberRarityIdx[worst]) worst = i;
    if (rolledIdx > memberRarityIdx[worst]) {
      memberRarityIdx[worst] = rolledIdx;
      memberIdentity[worst] = rolledIdentity;
      memberRank[worst] = 1;
      const key = RARITY_KEYS[rolledIdx];
      const cfg = RARITY[key];
      memberPow[worst] = cfg.pow;
      memberBase[worst] = baseDps ?? cfg.baseDps;
      charDps[worst] = Math.max(charDps[worst], rawDpsAtLevel(memberPow[worst], memberBase[worst], levels[worst], rankMultFor(memberRank[worst])));
    } // sinon : rareté insuffisante et pas un doublon → perdu
  };

  // Gemmes accumulées puis dépensées en pulls gacha dès que possible (voir
  // tête de fichier — "Budget de pulls").
  let gemsPool = 0;
  let pullsDone = 0;
  const gainGems = (amount, palier) => {
    gemsPool += amount;
    while (gemsPool >= GACHA_PULL_COST) {
      gemsPool -= GACHA_PULL_COST;
      pullsDone += 1;
      dayPulls += 1; weekPulls += 1;
      claimAchievements(ACHIEVEMENTS_PULLS, achClaimed.pulls, pullsDone, palier);
      resolvePull(rollGachaRarityIndex(rngGacha, palier));
    }
  };

  // Succès (une fois par seuil franchi, voir ACHIEVEMENTS_* en tête de
  // fichier) : achClaimed[cat] = index du prochain seuil non réclamé.
  const achClaimed = { kills: 0, boss: 0, palier: 0, upgrade: 0, pulls: 0 };
  const claimAchievements = (pairs, claimedRef, counterValue, palier) => {
    while (claimedRef.i < pairs.length && counterValue >= pairs[claimedRef.i][0]) {
      const reward = pairs[claimedRef.i][1];
      claimedRef.i += 1; // AVANT gainGems : sinon un appel ré-entrant (gainGems -> claimAchievements
      gainGems(reward, palier); // via un autre succès) reverrait le même seuil non réclamé → boucle infinie
    }
  };
  // Enveloppe chaque compteur de succès dans un objet {i} pour permettre la
  // mutation par référence dans claimAchievements (sinon un index primitif
  // passé par valeur ne pourrait pas être incrémenté depuis l'intérieur).
  for (const k of Object.keys(achClaimed)) achClaimed[k] = { i: 0 };

  // Compteurs cumulés + compteurs de cycle (jour/semaine, remis à zéro à
  // chaque cycle) pour les succès et quêtes — voir tête de fichier.
  let totalKills = 0, totalBossKillsCount = 0, totalUpgrades = 0;
  let clockSeconds = 0, dayCycleStart = 0, weekCycleStart = 0;
  let dayKills = 0, dayUpgrades = 0, dayBossKills = 0, dayPulls = 0;
  let weekKills = 0, weekUpgrades = 0, weekBossKills = 0, weekPulls = 0;
  let claimedPalier20 = false;

  // Évalue et réclame les quêtes journalières/hebdomadaires dont le cycle
  // vient de s'écouler (approximé sur le temps de jeu SIMULÉ, voir tête de
  // fichier) ; remet les compteurs de cycle à zéro que la quête ait été
  // complétée ou non (comme en jeu — pas de report).
  const settleQuestCycles = (palier) => {
    while (clockSeconds - dayCycleStart >= DAY_SECONDS) {
      if (dayKills     >= DAILY_KILLS_TARGET)   gainGems(DAILY_KILLS_REWARD, palier);
      if (dayUpgrades  >= DAILY_UPGRADE_TARGET) gainGems(DAILY_UPGRADE_REWARD, palier);
      if (dayBossKills >= DAILY_BOSS_TARGET)    gainGems(DAILY_BOSS_REWARD, palier);
      if (dayPulls     >= DAILY_GACHA_TARGET)   gainGems(DAILY_GACHA_REWARD, palier);
      dayCycleStart += DAY_SECONDS;
      dayKills = dayUpgrades = dayBossKills = dayPulls = 0;
    }
    while (clockSeconds - weekCycleStart >= WEEK_SECONDS) {
      if (weekKills     >= WEEKLY_KILLS_TARGET)   gainGems(WEEKLY_KILLS_REWARD, palier);
      if (weekUpgrades  >= WEEKLY_UPGRADE_TARGET) gainGems(WEEKLY_UPGRADE_REWARD, palier);
      if (weekBossKills >= WEEKLY_BOSS_TARGET)    gainGems(WEEKLY_BOSS_REWARD, palier);
      if (weekPulls     >= WEEKLY_GACHA_TARGET)   gainGems(WEEKLY_GACHA_REWARD, palier);
      weekCycleStart += WEEK_SECONDS;
      weekKills = weekUpgrades = weekBossKills = weekPulls = 0;
    }
  };

  // Un ennemi tué (mob ou boss) : drop d'équipement + tous les compteurs de
  // succès/quêtes liés aux kills. `killSeconds` avance l'horloge simulée
  // qui pilote les cycles de quêtes.
  const onKill = (killSeconds, palier) => {
    gainEquipmentDrop();
    totalKills += 1;
    dayKills += 1; weekKills += 1;
    clockSeconds += killSeconds;
    claimAchievements(ACHIEVEMENTS_KILLS, achClaimed.kills, totalKills, palier);
    settleQuestCycles(palier);
  };

  // Le boss vient d'être vaincu : compte aussi comme un kill (comme en jeu,
  // totalKills inclut les boss), plus les succès/quêtes propres au boss et
  // la quête d'event "atteindre le palier 20".
  const onBossKillSuccess = (bossSeconds, palier) => {
    onKill(bossSeconds, palier);
    totalBossKillsCount += 1;
    dayBossKills += 1; weekBossKills += 1;
    claimAchievements(ACHIEVEMENTS_BOSS, achClaimed.boss, totalBossKillsCount, palier);
    claimAchievements(ACHIEVEMENTS_PALIER, achClaimed.palier, palier, palier);
    if (palier >= 20 && !claimedPalier20) { claimedPalier20 = true; gainGems(EVENT_PALIER20_GEMS, palier); }
  };

  // Une montée de niveau perso OU Coffre d'Or (comme totalUpgradesPerformed
  // en jeu, qui combine les deux) : succès/quêtes d'upgrade.
  const onUpgradePerformed = (palier) => {
    totalUpgrades += 1;
    dayUpgrades += 1; weekUpgrades += 1;
    claimAchievements(ACHIEVEMENTS_UPGRADE, achClaimed.upgrade, totalUpgrades, palier);
  };

  // Équipement : ${TEAM_SIZE}×${EQUIP_SLOT_COUNT}=20 emplacements INDIVIDUELS (voir tête de
  // fichier) — itemSlots[m*5+s] = rareté (index) de l'emplacement s du
  // membre m, démarre à Commun (dispo dès le palier 1 comme dans le jeu).
  // fodder[r] = pièces de rareté r en attente de fusion (10 pour 1).
  // equipUnlockCapIdx limite uniquement QUELLES raretés peuvent sortir au
  // TIRAGE (déblocage réel du jeu, EQUIP_RARITY_MIN_PALIER) — la fusion
  // elle-même n'a pas de plafond (voir tête de fichier).
  const itemSlots = new Array(TEAM_SIZE * EQUIP_SLOT_COUNT).fill(0);
  const fodder = new Array(RARITY_KEYS.length).fill(0);
  const memberEquipMult = new Array(TEAM_SIZE).fill(1);
  let equipUnlockCapIdx = RARITY_KEYS.indexOf(equipRarityForPalier(1));

  const recomputeMemberEquipMult = (memberIdx) => {
    let mult = 1;
    for (let s = 0; s < EQUIP_SLOT_COUNT; s++) {
      mult *= EQUIP_RARITY_BASE_MULT[RARITY_KEYS[itemSlots[memberIdx * EQUIP_SLOT_COUNT + s]]];
    }
    memberEquipMult[memberIdx] = mult;
  };
  for (let m = 0; m < TEAM_SIZE; m++) recomputeMemberEquipMult(m);

  const teamDps = () => charDps.reduce((sum, dps, i) => sum + dps * memberEquipMult[i], 0);

  // Une pièce de rareté `rarityIdx` est reçue (par tirage ou par fusion) :
  // remplace l'emplacement le plus faible des 20 SEULEMENT si elle est
  // meilleure (comparaison globale — un joueur optimal équipe toujours
  // l'emplacement qui en a le plus besoin) ; l'ancienne pièce déplacée (ou
  // la nouvelle si elle n'était pas assez bonne) part en fodder de fusion.
  const receiveEquipmentItem = (rarityIdx) => {
    let worst = 0;
    for (let i = 1; i < itemSlots.length; i++) if (itemSlots[i] < itemSlots[worst]) worst = i;
    if (rarityIdx > itemSlots[worst]) {
      const displaced = itemSlots[worst];
      itemSlots[worst] = rarityIdx;
      recomputeMemberEquipMult(Math.floor(worst / EQUIP_SLOT_COUNT));
      addEquipmentFodder(displaced);
    } else {
      addEquipmentFodder(rarityIdx);
    }
  };
  // eslint n'aime pas les fonctions mutuellement récursives déclarées en
  // `const` dans le désordre : on utilise `function` pour permettre l'appel
  // croisé receiveEquipmentItem <-> addEquipmentFodder sans souci d'ordre.
  function addEquipmentFodder(rarityIdx) {
    fodder[rarityIdx] += 1;
    if (fodder[rarityIdx] >= EQUIPMENT_FUSE_SIZE && rarityIdx < RARITY_KEYS.length - 1) {
      fodder[rarityIdx] -= EQUIPMENT_FUSE_SIZE;
      receiveEquipmentItem(rarityIdx + 1); // pièce fusionnée : retente aussitôt de s'équiper
    }
  }

  // Un ennemi tué = 1 tentative de drop d'équipement (tirage pondéré réel,
  // parmi les raretés débloquées au palier courant) — la plupart des kills
  // ne rapportent rien.
  const gainEquipmentDrop = () => {
    const dropIdx = rollEquipmentDropIndex(rngEquip, equipUnlockCapIdx);
    if (dropIdx === -1) return; // pas de drop ce kill
    receiveEquipmentItem(dropIdx);
  };

  // Relève le plafond de déblocage (quelles raretés peuvent sortir au
  // tirage) pour ce palier.
  const applyEquipCapForPalier = (palier) => {
    equipUnlockCapIdx = RARITY_KEYS.indexOf(equipRarityForPalier(palier));
  };

  // Tous les emplacements d'équipement, groupés par membre (ex: pour 4
  // membres : "CCCCU/CCCCC/CCCUU/CCCCC").
  const equipmentLabel = () => {
    const groups = [];
    for (let m = 0; m < TEAM_SIZE; m++) {
      let g = '';
      for (let s = 0; s < EQUIP_SLOT_COUNT; s++) g += RARITY_KEYS[itemSlots[m * EQUIP_SLOT_COUNT + s]];
      groups.push(g);
    }
    return groups.join('/');
  };

  // Ordre d'affichage commun aux colonnes "Équipe" et "Rangs" : membres
  // triés par rareté croissante, pour que le n-ième caractère de chaque
  // colonne désigne toujours le même membre.
  const displayOrder = () => [...Array(TEAM_SIZE).keys()].sort((a, b) => memberRarityIdx[a] - memberRarityIdx[b]);

  // Composition actuelle de l'équipe, triée et compactée (ex: "CCCU").
  const teamCompositionLabel = () => displayOrder().map(i => RARITY_KEYS[memberRarityIdx[i]]).join('');

  // Rang de chaque membre, MÊME ORDRE que teamCompositionLabel (ex: "1231").
  const ranksLabel = () => displayOrder().map(i => String(memberRank[i])).join('');

  // Réinvestissement immédiat, mais ARBITRÉ (pas de priorité rigide) entre
  // niveler le perso le moins niveauté et acheter le niveau suivant du
  // Coffre d'Or : à chaque itération, on achète l'option la plus rentable
  // PAR PIXELCOIN DÉPENSÉ, tant que l'une des deux est abordable.
  //  - Niveau perso : rentabilité = DPS gagné / coût (immédiat, direct).
  //  - Coffre d'Or : son gain n'est pas du DPS mais un ×1.2 PERMANENT sur
  //    tous les futurs gains de PixelCoins — pas directement comparable.
  //    On le convertit en DPS-équivalent via une hypothèse d'horizon fixe
  //    (--chestLookahead kills, défaut 10) : "combien de PixelCoins en plus
  //    ce cran de coffre rapporterait sur les N prochains kills, si ces
  //    PixelCoins étaient eux-mêmes réinvestis au taux de rentabilité
  //    ACTUEL du level-up le moins cher". Plus l'horizon est long, plus le
  //    coffre — qui rapporte pour le reste de la partie, pas juste N kills —
  //    est sous-évalué par cette heuristique ; un horizon plus grand
  //    (--chestLookahead) le fait ressortir plus tôt, comme un joueur qui
  //    anticipe un long farm à venir. Le coût grimpe bien plus vite que les
  //    gains, donc l'achat de coffre n'a pas lieu à chaque appel.
  const spendPool = (maxGoldLevel, baseCoinPerKill) => {
    for (;;) {
      let idx = 0;
      for (let i = 1; i < TEAM_SIZE; i++) if (levels[i] < levels[idx]) idx = i;
      const levelCost = levelUpCost(levels[idx]);
      const newCharDps = Math.max(rawDpsAtLevel(memberPow[idx], memberBase[idx], levels[idx] + 1, rankMultFor(memberRank[idx])), charDps[idx] + 1);
      const levelEfficiency = (newCharDps - charDps[idx]) / levelCost; // DPS gagné / PixelCoin

      const chestUnlocked = goldLevel < maxGoldLevel;
      const chestCost = chestUnlocked ? goldChestCost(goldLevel) : Infinity;
      let chestEfficiency = -1; // -1 : jamais choisi si non débloqué
      if (chestUnlocked) {
        const multGain = goldChestMultiplier(goldLevel + 1) - goldChestMultiplier(goldLevel);
        const lookaheadCoins = baseCoinPerKill * multGain * chestLookahead;
        chestEfficiency = (lookaheadCoins * levelEfficiency) / chestCost; // DPS-équivalent / PixelCoin
      }

      const canLevel = coinPool >= levelCost;
      const canChest = coinPool >= chestCost;
      if (!canLevel && !canChest) break;

      if (canChest && (!canLevel || chestEfficiency > levelEfficiency)) {
        coinPool -= chestCost;
        goldLevel += 1;
        onUpgradePerformed(maxGoldLevel);
      } else {
        coinPool -= levelCost;
        levels[idx] += 1;
        charDps[idx] = newCharDps;
        onUpgradePerformed(maxGoldLevel);
      }
    }
  };

  // Un passage sur les vagues 1-9 d'un palier (farmable à volonté via
  // travelToPalier() en jeu, sans jamais relancer le boss chronométré) :
  // tue les 9 mobs, encaisse leurs PixelCoins (boostés par le Coffre d'Or
  // courant), réinvestit. Retourne le temps écoulé pour ce passage.
  const farmWaves1to9 = (palier) => {
    let seconds = 0;
    for (let wave = 1; wave <= 9; wave++) {
      const global = (palier - 1) * 10 + wave;
      const hp = HP_BASE * Math.pow(HP_GROWTH, global - 1) * WAVE_HP_MULT[wave - 1];
      const killSeconds = hp / teamDps();
      seconds += killSeconds;
      const baseCoins = COIN_BASE * Math.pow(COIN_GROWTH, global - 1);
      coinPool += baseCoins * goldChestMultiplier(goldLevel);
      spendPool(palier, baseCoins);
      onKill(killSeconds, palier);
      if (wave === 5) gainGems(WAVE5_GEM_REWARD, palier);
    }
    return seconds;
  };

  const rows = [];

  for (let palier = 1; palier <= paliers; palier++) {
    applyEquipCapForPalier(palier);
    const equipLabel = equipmentLabel(); // état en entrée de ce palier, pour l'affichage
    const teamLabel = teamCompositionLabel(); // état en entrée de ce palier, pour l'affichage
    const rankLabel = ranksLabel(); // état en entrée de ce palier, pour l'affichage
    const waveSeconds = farmWaves1to9(palier);

    const bossGlobal = (palier - 1) * 10 + 10;
    const bossHp = HP_BASE * Math.pow(HP_GROWTH, bossGlobal - 1) * WAVE_HP_MULT[9];

    // Le timer de boss (90s) est une contrainte dure : tant qu'il ne peut
    // pas être battu à temps, on re-farme les vagues 1-9 (comme en jeu, où
    // retenter le boss après un échec ne rapporte rien tant qu'on n'a pas
    // regagné en puissance ailleurs).
    let farmSeconds = 0;
    let farmPasses = 0;
    let bossSeconds = bossKillSecondsWithUlts(bossHp, teamDps(), memberRarityIdx);
    let blocked = false;
    while (bossSeconds > BOSS_TIMER_SECONDS) {
      if (farmPasses >= MAX_FARM_PASSES) { blocked = true; break; }
      farmSeconds += farmWaves1to9(palier);
      farmPasses += 1;
      bossSeconds = bossKillSecondsWithUlts(bossHp, teamDps(), memberRarityIdx);
    }

    const avgLevel = levels.reduce((a, b) => a + b, 0) / TEAM_SIZE;

    if (blocked) {
      rows.push({ palier, teamLabel, rankLabel, equipLabel, blocked: true, waveSeconds, farmSeconds, farmPasses, avgLevel, goldLevel, pullsDone });
      break; // au-delà, la simulation n'a plus de sens dans ce modèle
    }

    const bossBaseCoins = COIN_BASE * Math.pow(COIN_GROWTH, bossGlobal - 1) * COIN_BOSS_MULT;
    coinPool += bossBaseCoins * goldChestMultiplier(goldLevel);
    spendPool(palier, bossBaseCoins);
    onBossKillSuccess(bossSeconds, palier);
    gainGems(palier * PALIER_PASS_GEMS_PER_LEVEL, palier);

    const palierSeconds = waveSeconds + farmSeconds + bossSeconds;
    cumulativeSeconds += palierSeconds;
    rows.push({
      palier,
      teamLabel,
      rankLabel,
      equipLabel,
      blocked: false,
      waveSeconds,
      farmSeconds,
      farmPasses,
      bossSeconds,
      seconds: palierSeconds,
      avgLevel: levels.reduce((a, b) => a + b, 0) / TEAM_SIZE,
      goldLevel,
      pullsDone,
      cumulativeSeconds,
    });
  }

  return rows;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rows = simulate(args);
  const okRows = rows.filter(r => !r.blocked);
  const blockedRow = rows.find(r => r.blocked);

  console.log(`\nSimulation — équipe de ${TEAM_SIZE} perso(s), rareté de départ ${args.rarity}, rareté ensuite tirée au gacha (10💎/pull), réinvestissement à 100%, boss toujours battu en < ${BOSS_TIMER_SECONDS}s, tirages seed=${args.seed} (voir en-tête du script pour les hypothèses)\n`);
  console.log('Palier |   Équipe |    Rangs |                                 Équipement | Pulls | Vagues 1-9 |           Farm | Boss (<90s) | Temps total | Niveau moy. | Coffre | Cumulé');
  console.log('-------|----------|----------|-------------------------------------------|-------|------------|-----------------|-------------|-------------|-------------|--------|----------');
  for (const r of okRows) {
    const farmLabel = r.farmPasses > 0 ? `${fmtTime(r.farmSeconds)} (×${r.farmPasses})` : '—';
    console.log(
      `${String(r.palier).padStart(6)} | ${r.teamLabel.padStart(8)} | ${r.rankLabel.padStart(8)} | ${r.equipLabel.padStart(43)} | ${String(r.pullsDone).padStart(5)} | ${fmtTime(r.waveSeconds).padStart(10)} | ${farmLabel.padStart(15)} | ${fmtTime(r.bossSeconds).padStart(11)} | ${fmtTime(r.seconds).padStart(11)} | ${r.avgLevel.toFixed(0).padStart(11)} | ${String(r.goldLevel).padStart(6)} | ${fmtTime(r.cumulativeSeconds).padStart(8)}`
    );
  }
  if (blockedRow) {
    console.log(`${String(blockedRow.palier).padStart(6)} | ${blockedRow.teamLabel.padStart(8)} | ${blockedRow.rankLabel.padStart(8)} | ${blockedRow.equipLabel.padStart(43)} | ${String(blockedRow.pullsDone).padStart(5)} | INFRANCHISSABLE — ${MAX_FARM_PASSES} passages de farm n'ont pas suffi à passer le boss sous ${BOSS_TIMER_SECONDS}s (niveau moy. équipe: ${blockedRow.avgLevel.toFixed(0)}, Coffre d'Or: ${blockedRow.goldLevel})`);
  }

  const avg = okRows.reduce((a, r) => a + r.seconds, 0) / okRows.length;
  console.log(`\nTemps moyen par palier (${okRows.length} palier(s) franchis) : ${fmtTime(avg)}`);
  if (blockedRow) {
    console.log(`⛔ La simulation s'est arrêtée au palier ${blockedRow.palier} : infranchissable dans ce modèle (voir légende ci-dessous).`);
  }

  console.log(`
── Comment lire ce résultat ────────────────────────────────────────────
Équipe         Rareté de CHACUN des ${TEAM_SIZE} membres de l'équipe à ce palier,
               triée par rareté croissante (ex: "CCCU" = 3 Communs + 1 Peu
               Commun) — émerge des VRAIS pulls gacha (lib/game/gacha.ts),
               pas d'un calendrier fixe : un pull remplace le membre le
               moins rare de l'équipe UNIQUEMENT si sa rareté est meilleure
               (voir colonne "Rangs" pour les doublons). Démarre à
               ${args.rarity} (--rarity) avant le tout premier pull.
Rangs          Rang de CHAQUE membre (1 à 7, MÊME ORDRE que "Équipe") à
               l'entrée de ce palier. Un pull gacha qui retombe EXACTEMENT
               sur le même perso qu'un membre déjà en équipe (même rareté +
               même "identité" anonyme, probabilité ≈1/taille du pool de
               cette rareté — voir tête de fichier) monte son rang de +1 au
               lieu de remplacer un membre, jusqu'au plafond 7 (×9 DPS).
               Un changement de rareté d'un membre repart à rang 1 (nouveau
               perso), le niveau déjà acquis reste conservé.
Équipement     Les 20 emplacements d'équipement à l'entrée de ce palier
               (5 par perso — casque/plastron/pantalon/bottes/arme), un
               groupe de 5 lettres par membre séparé par "/", DANS L'ORDRE
               de la colonne "Équipe". Chaque ennemi tué tente un VRAI
               tirage pondéré (copie de getEquipmentDrop, lib/game/items.ts)
               parmi les raretés débloquées au palier courant
               (EQUIP_RARITY_MIN_PALIER) — la plupart des kills ne
               rapportent rien. Une pièce obtenue REMPLACE l'emplacement le
               plus faible des 20 seulement si elle est meilleure ;
               l'ancienne pièce (ou la nouvelle si pas assez bonne) part en
               fodder — 10 pièces fodder d'une rareté fusionnent en 1 pièce
               de la rareté sup. (comme en jeu), qui retente aussitôt de
               s'équiper. Résultat aléatoire, voir --seed.
Pulls          Nombre CUMULÉ de pulls gacha effectués depuis le début,
               financés par les gemmes de progression (palier×10 au boss,
               +1 à la vague 5), les SUCCÈS (kills/boss/palier/upgrades/
               pulls cumulés) et les QUÊTES journalières/hebdomadaires —
               voir "Budget de pulls" et "Succès & quêtes" en tête de
               fichier — dépensées à 10💎/pull dès que possible.
Vagues 1-9     Temps pour tuer les 9 premiers mobs du palier, au DPS du
               moment (pas encore de contrainte de timer sur ces vagues).
Farm           Temps additionnel passé à re-tuer les vagues 1-9 (sans
               jamais relancer le boss) pour gagner assez de PixelCoins et
               monter de niveau AVANT de retenter le boss — nécessaire
               uniquement si le DPS ne suffit pas encore à le battre en
               moins de ${BOSS_TIMER_SECONDS}s. "×N" = nombre de passages de farm complets.
Boss (<90s)    Temps du kill du boss lui-même, TOUJOURS ≤ ${BOSS_TIMER_SECONDS}s : c'est la
               contrainte dure imposée par le timer réel du jeu
               (PalierConfig.bossTimerSeconds). Inclut le burst des 4
               ultimes d'équipe (×DPS selon la rareté, enchaînées sans
               chevauchement — voir tête de fichier).
Temps total    Vagues 1-9 + Farm + Boss = temps total pour boucler ce palier.
Niveau moy.    Niveau moyen des 4 perso(s) une fois le palier bouclé.
Coffre         Niveau du Coffre d'Or (×1.2 de gains PixelCoins par niveau)
               une fois le palier bouclé. PAS de priorité rigide avec les
               level-up perso : à chaque PixelCoin disponible, on achète
               l'option la plus rentable (DPS gagné/coin pour un level-up,
               vs coins futurs gagnés/coin — sur --chestLookahead kills —
               pour le coffre), et seulement si abordable et débloqué
               (niveau max achetable = palier déjà atteint) — il stagne
               souvent plusieurs paliers d'affilée quand le coût dépasse le
               pool, mais peut aussi être acheté AVANT un level-up quand
               c'est la meilleure affaire du moment (voir tête de fichier).
Cumulé         Temps total écoulé depuis le palier 1 jusqu'à la fin de
               celui-ci.

"Temps moyen par palier" = moyenne simple de la colonne "Temps total" sur
les paliers effectivement franchis — PAS un temps de jeu réel : voir les
hypothèses du modèle en tête de fichier (équipe et équipement pilotés par
de vrais tirages aléatoires (rang inclus), sans évolution/synergie, réinvestissement
à 100%).

Si la colonne "Farm" grossit vite (beaucoup de passages ×N) ou si la
simulation finit par afficher INFRANCHISSABLE, c'est un signal
d'équilibrage : même avec les pulls gacha financés par la progression, le
DPS ne suit plus la courbe de PV des ennemis. Relance avec --rarity plus
haut (roster de départ plus fort) ou --seed différente (variance du
tirage) pour voir l'effet.
`);
}

// N'exécute le CLI que si ce fichier est lancé directement (node ...mjs),
// pas quand simulate() est importé par un autre script (ex: sweep_time_per_palier.mjs).
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main();
}
