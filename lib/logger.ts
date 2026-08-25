// Logger centralisé — remplace les console.* épars. Les logs de debug (log)
// sont coupés en production pour éviter les fuites d'infos (payloads de sauvegarde,
// détails de session...) ; warn/error restent toujours actifs (diagnostics utiles
// même en prod).
const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  log:   (...args: unknown[]) => { if (isDev) console.log(...args); },
  warn:  (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};
