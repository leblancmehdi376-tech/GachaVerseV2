import { describe, it, expect } from 'vitest';
import { normalizeAccessRequest } from './accessRequests';

// Ces tests couvrent la compatibilité avec les documents Firestore déjà en
// base AVANT le renommage discordUsername -> discordHandle : aucun script de
// migration n'a été écrit, normalizeAccessRequest doit donc convertir les
// anciens documents à la lecture, pour toujours.
describe('normalizeAccessRequest', () => {
  it('lit discordHandle sur un document déjà migré', () => {
    const r = normalizeAccessRequest('uid1', {
      email: 'a@b.com', username: 'Neko', discordHandle: 'neko#1234',
      approved: true, createdAt: 42,
    });
    expect(r).toEqual({
      uid: 'uid1', email: 'a@b.com', username: 'Neko', discordHandle: 'neko#1234',
      approved: true, createdAt: 42,
    });
  });

  it('retombe sur l\'ancien champ discordUsername si discordHandle est absent (doc pré-renommage)', () => {
    const r = normalizeAccessRequest('uid2', {
      email: 'a@b.com', username: 'Neko', discordUsername: 'neko#1234',
      approved: true, createdAt: 42,
    });
    expect(r.discordHandle).toBe('neko#1234');
  });

  it('préfère discordHandle à discordUsername si les deux sont présents', () => {
    const r = normalizeAccessRequest('uid3', {
      discordHandle: 'nouveau', discordUsername: 'ancien',
    });
    expect(r.discordHandle).toBe('nouveau');
  });

  it('renvoie des valeurs par défaut sûres pour un document vide ou incomplet', () => {
    const r = normalizeAccessRequest('uid4', {});
    expect(r).toEqual({
      uid: 'uid4', email: '', username: '', discordHandle: '',
      approved: false, createdAt: 0,
    });
  });
});
