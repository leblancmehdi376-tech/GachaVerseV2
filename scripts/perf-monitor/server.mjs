// Moniteur de performances graphiques en direct (outil de dev local).
//
//   npm run perf        → moniteur seul sur http://localhost:4321
//   npm run dev:perf    → moniteur + `next dev` en même temps
//   npm run start:perf  → moniteur + build de production instrumenté + `next start`
//
// Le jeu (en dev) charge components/system/PerfReporter.tsx qui envoie un
// échantillon par seconde sur POST /ingest ; le tableau de bord les reçoit en
// direct via Server-Sent Events (GET /events). Aucune dépendance npm.

import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PORT = Number(process.env.PERF_MONITOR_PORT || 4321);
const HISTORY = 600; // échantillons gardés par session (~10 min)
const here = dirname(fileURLToPath(import.meta.url));
const dashboardPath = join(here, 'dashboard.html');

/** @type {Map<string, object[]>} */
const sessions = new Map();
/** @type {Set<import('node:http').ServerResponse>} */
const clients = new Set();

function broadcast(sample) {
  const msg = `data: ${JSON.stringify(sample)}\n\n`;
  for (const res of clients) res.write(msg);
}

const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }

  if (req.method === 'POST' && url.pathname === '/ingest') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try {
        const sample = JSON.parse(body);
        if (!sample.sessionId) throw new Error('sessionId manquant');
        const list = sessions.get(sample.sessionId) ?? [];
        list.push(sample);
        if (list.length > HISTORY) list.shift();
        sessions.set(sample.sessionId, list);
        broadcast(sample);
        res.writeHead(204).end();
      } catch {
        res.writeHead(400).end();
      }
    });
    return;
  }

  if (url.pathname === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    // Rejoue l'historique pour qu'un onglet rouvert retrouve ses courbes
    for (const list of sessions.values()) for (const s of list) res.write(`data: ${JSON.stringify(s)}\n\n`);
    clients.add(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 15000);
    req.on('close', () => { clearInterval(ping); clients.delete(res); });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/reset') {
    sessions.clear();
    res.writeHead(204).end();
    return;
  }

  if (url.pathname === '/export') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="perf-${new Date().toISOString().replace(/[:.]/g, '-')}.json"`,
    });
    res.end(JSON.stringify(Object.fromEntries(sessions), null, 2));
    return;
  }

  if (url.pathname === '/') {
    // Relu à chaque requête : modifier le dashboard ne demande pas de redémarrer
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(readFileSync(dashboardPath));
    return;
  }

  res.writeHead(404).end();
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    if (process.argv.some(a => a === '--with-dev' || a === '--with-prod')) {
      console.log(`[perf] Un moniteur tourne déjà sur http://localhost:${PORT} : il est réutilisé.`);
      return;
    }
    console.error(`[perf] Le port ${PORT} est déjà utilisé (moniteur déjà lancé ?). Changez-le avec PERF_MONITOR_PORT.`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[perf] Moniteur de performances : http://localhost:${PORT}`);
  if (PORT !== 4321) console.log(`[perf] Pensez à NEXT_PUBLIC_PERF_MONITOR_URL=http://localhost:${PORT} côté jeu.`);
});

// Lance une commande npm à côté du moniteur ; le moniteur s'arrête avec elle.
function runAlongside(script, env = {}) {
  const child = spawn('npm', ['run', script], { stdio: 'inherit', shell: true, env: { ...process.env, ...env } });
  const stop = () => { child.kill(); process.exit(0); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  return child;
}

if (process.argv.includes('--with-dev')) {
  runAlongside('dev', { NEXT_PUBLIC_PERF_MONITOR: '1' }).on('exit', code => process.exit(code ?? 0));
}

// Build de production avec le capteur (NEXT_PUBLIC_PERF_MONITOR est figé
// dans le code au build), puis `next start`. Un build normal le retire.
if (process.argv.includes('--with-prod')) {
  const env = { NEXT_PUBLIC_PERF_MONITOR: '1' };
  console.log('[perf] Build de production avec le capteur…');
  runAlongside('build', env).on('exit', code => {
    if (code !== 0) {
      console.error('[perf] Échec du build (un `npm run dev` tourne-t-il encore sur ce dossier ?).');
      process.exit(code ?? 1);
    }
    console.log('[perf] Build terminé : jeu sur http://localhost:3000');
    runAlongside('start', env).on('exit', c => process.exit(c ?? 0));
  });
}
