/* ── Comment lancer ce script ────────────────────────────────────────────
 *   node scripts/sweep_time_per_palier.mjs
 *
 * Relance scripts/estimate_time_per_palier.mjs::simulate() PLUSIEURS FOIS
 * (import direct, pas de sous-processus) avec des seeds différentes — et
 * affiche le résultat à UN palier donné (défaut 40) pour chaque run. Sert
 * à juger un paramètre (ex: --chestLookahead) sur sa MOYENNE sur plusieurs
 * tirages plutôt que sur une seule seed, dont le résultat peut être
 * chanceux ou malchanceux (voir tête de fichier de
 * estimate_time_per_palier.mjs — deux flux aléatoires indépendants pour
 * les drops d'équipement et les pulls gacha, mais aucune seed unique n'est
 * "représentative" à elle seule).
 *
 * Options facultatives :
 *   node scripts/sweep_time_per_palier.mjs --runs=20 --palier=40 --rarity=C --chestLookahead=10
 *     --runs=          nombre de seeds à essayer, 1..runs (défaut 20)
 *     --seedStart=     première seed de la plage runs (défaut 1)
 *     --seeds=1,7,42   liste EXPLICITE de seeds (remplace --runs/--seedStart
 *                      si fournie)
 *     --palier=        palier dont on affiche le résultat pour chaque run
 *                      (défaut 40)
 *     --paliers=       jusqu'où simuler (défaut = max(--palier, 40)) —
 *                      relevé automatiquement si < --palier
 *     --rarity=        transmis tel quel à simulate() (défaut C)
 *     --baseDps=       transmis tel quel à simulate()
 *     --chestLookahead= transmis tel quel à simulate() (défaut 10, voir
 *                      estimate_time_per_palier.mjs)
 *
 * Un run qui devient INFRANCHISSABLE avant d'atteindre --palier est compté
 * à part (voir le résumé en bas) plutôt que d'entrer dans la moyenne.
 */
import { simulate } from './estimate_time_per_palier.mjs';

function parseArgs(argv) {
  const out = { runs: 20, seedStart: 1, seeds: null, palier: 40, paliers: null, rarity: 'C', baseDps: null, chestLookahead: 10 };
  for (const arg of argv) {
    const [key, val] = arg.replace(/^--/, '').split('=');
    if (key === 'runs') out.runs = parseInt(val, 10);
    else if (key === 'seedStart') out.seedStart = parseInt(val, 10);
    else if (key === 'seeds') out.seeds = val.split(',').map(s => parseInt(s.trim(), 10));
    else if (key === 'palier') out.palier = parseInt(val, 10);
    else if (key === 'paliers') out.paliers = parseInt(val, 10);
    else if (key === 'rarity') out.rarity = val.toUpperCase();
    else if (key === 'baseDps') out.baseDps = parseFloat(val);
    else if (key === 'chestLookahead') out.chestLookahead = parseFloat(val);
  }
  if (out.paliers == null || out.paliers < out.palier) out.paliers = out.palier;
  return out;
}

function fmtTime(seconds) {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}min`;
  return `${(seconds / 3600).toFixed(2)}h`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const seeds = args.seeds ?? Array.from({ length: args.runs }, (_, i) => args.seedStart + i);

  console.log(`\nSweep — ${seeds.length} run(s), résultat au palier ${args.palier} (rareté départ ${args.rarity}, chestLookahead=${args.chestLookahead}, simulé jusqu'au palier ${args.paliers})\n`);
  console.log('  Seed |   Équipe |    Rangs | Pulls | Coffre | Temps du palier | Cumulé au palier | Statut');
  console.log('-------|----------|----------|-------|--------|-----------------|-------------------|------------------------------');

  const okResults = [];
  let blockedCount = 0;

  for (const seed of seeds) {
    const rows = simulate({ rarity: args.rarity, paliers: args.paliers, baseDps: args.baseDps, seed, chestLookahead: args.chestLookahead });
    const row = rows.find(r => r.palier === args.palier && !r.blocked);
    const blockedRow = rows.find(r => r.blocked);

    if (row) {
      okResults.push(row);
      console.log(
        `${String(seed).padStart(6)} | ${row.teamLabel.padStart(8)} | ${row.rankLabel.padStart(8)} | ${String(row.pullsDone).padStart(5)} | ${String(row.goldLevel).padStart(6)} | ${fmtTime(row.seconds).padStart(15)} | ${fmtTime(row.cumulativeSeconds).padStart(17)} | OK`
      );
    } else if (blockedRow) {
      blockedCount += 1;
      console.log(`${String(seed).padStart(6)} | INFRANCHISSABLE au palier ${blockedRow.palier} — jamais atteint le palier ${args.palier}`);
    } else {
      // Ne devrait pas arriver (args.paliers >= args.palier garanti par parseArgs).
      console.log(`${String(seed).padStart(6)} | palier ${args.palier} non simulé (augmente --paliers)`);
    }
  }

  console.log(`\n${okResults.length}/${seeds.length} run(s) ont atteint le palier ${args.palier} sans devenir infranchissables avant.`);
  if (blockedCount > 0) {
    console.log(`⚠ ${blockedCount} run(s) bloqué(s) avant le palier ${args.palier} (exclus des moyennes ci-dessous).`);
  }

  if (okResults.length > 0) {
    const cumuls = okResults.map(r => r.cumulativeSeconds).sort((a, b) => a - b);
    const avgCumul = cumuls.reduce((a, b) => a + b, 0) / cumuls.length;
    const avgPulls = okResults.reduce((a, r) => a + r.pullsDone, 0) / okResults.length;
    const avgGold  = okResults.reduce((a, r) => a + r.goldLevel, 0) / okResults.length;
    console.log(`\nTemps cumulé au palier ${args.palier} — moyenne: ${fmtTime(avgCumul)} | médiane: ${fmtTime(cumuls[Math.floor(cumuls.length / 2)])} | min: ${fmtTime(cumuls[0])} | max: ${fmtTime(cumuls[cumuls.length - 1])}`);
    console.log(`Pulls gacha au palier ${args.palier} — moyenne: ${avgPulls.toFixed(1)}   |   Coffre d'Or — moyenne: ${avgGold.toFixed(1)}`);
  }

  console.log(`
── Comment lire ce résultat ────────────────────────────────────────────
Chaque ligne = une seed différente, mêmes autres paramètres (--rarity,
--chestLookahead, etc.) — donc la SEULE source de variation entre les
lignes est le tirage aléatoire (drops d'équipement, pulls gacha).
"Temps du palier" et "Cumulé" reprennent les colonnes du même nom du
script principal, capturées au palier demandé (--palier, défaut 40).

Pour comparer un paramètre (ex: l'effet de --chestLookahead), relance ce
script deux fois avec les mêmes seeds mais des valeurs différentes de ce
paramètre, et compare les moyennes/médianes plutôt que des runs seed à
seed — au-delà de quelques paliers, les tirages divergent entre les deux
configs (nombre de kills/pulls différent, voir tête de fichier de
estimate_time_per_palier.mjs), donc une seed individuelle n'isole plus
proprement l'effet du paramètre.
`);
}

main();
