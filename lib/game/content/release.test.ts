import { describe, it, expect } from 'vitest';
import { parseContent, bumpReleaseVersion, compareReleaseVersions, CONTENT_SCHEMA } from './schema';
import { firestoreSafe } from './store';

describe('majs du configurateur', () => {
  it('incrémente le dernier nombre', () => {
    expect(bumpReleaseVersion('2.8.2.14')).toBe('2.8.2.15');
    expect(bumpReleaseVersion('2.9')).toBe('2.10');
  });

  it('compare les versions nombre par nombre', () => {
    expect(compareReleaseVersions('2.10.0', '2.9.9')).toBeGreaterThan(0);
    expect(compareReleaseVersions('2.8.2', '2.8.2.0')).toBe(0);
    expect(compareReleaseVersions('2.8.1', '2.8.2.14')).toBeLessThan(0);
  });

  it('lit la maj en préparation et les majs publiées', () => {
    const { content } = parseContent({
      schema: CONTENT_SCHEMA,
      release: { version: '2.9.0', title: 'Wano', notes: ['Nouveau perso : **Luffy**.', '', 42] },
      releases: [{ version: '2.8.3', notes: ['a'], publishedAt: 1000 }, { version: 'pas une version', notes: [], publishedAt: 5 }],
    });
    expect(content?.release).toEqual({ version: '2.9.0', title: 'Wano', notes: ['Nouveau perso : **Luffy**.'] });
    expect(content?.releases).toEqual([{ version: '2.8.3', notes: ['a'], publishedAt: 1000 }]);
  });

  it('garde une maj en préparation au numéro en cours de saisie, mais pas une maj publiée invalide', () => {
    const { content } = parseContent({ schema: CONTENT_SCHEMA, release: { version: '2.9.', notes: [] }, releases: [{ version: 'v2', notes: [], publishedAt: 5 }] });
    expect(content?.release?.version).toBe('2.9.');
    expect(content?.releases).toEqual([]);
  });

  it('retire les champs undefined avant l’envoi à Firestore', () => {
    const safe = firestoreSafe({ banners: { b: { name: 'x', startsAt: undefined } }, enemies: { 1: [{ name: 'e', hpMult: undefined }] } });
    expect(safe).toEqual({ banners: { b: { name: 'x' } }, enemies: { 1: [{ name: 'e' }] } });
  });
});
