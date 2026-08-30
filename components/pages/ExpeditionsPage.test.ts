import { describe, it, expect } from 'vitest';
import { fmtDuration, fmtDurationLabel, tabOf } from './ExpeditionsPage';
import { EXPEDITION_DEFS } from '@/lib/game/expeditions';

describe('fmtDuration', () => {
  it('affiche secondes seules sous la minute', () => {
    expect(fmtDuration(42)).toBe('42s');
  });

  it('affiche minutes + secondes sous l’heure', () => {
    expect(fmtDuration(65)).toBe('1m 05s');
  });

  it('affiche heures + minutes au-delà de l’heure (sans les secondes)', () => {
    expect(fmtDuration(3725)).toBe('1h 02m');
  });
});

describe('fmtDurationLabel', () => {
  it('affiche juste les minutes sous l’heure', () => {
    expect(fmtDurationLabel(45 * 60)).toBe('45m');
  });

  it('affiche heures + minutes sous 24h', () => {
    expect(fmtDurationLabel(3 * 3600 + 30 * 60)).toBe('3h30');
  });

  it('affiche heures seules quand les minutes sont nulles', () => {
    expect(fmtDurationLabel(5 * 3600)).toBe('5h');
  });

  it('affiche jours + heures au-delà de 24h', () => {
    expect(fmtDurationLabel(26 * 3600)).toBe('1j 2h');
  });
});

// On s'appuie sur le vrai contenu du jeu (EXPEDITION_DEFS) sans coder en dur
// d'id précis — cf. convention de CompanionsPage.test.ts.
describe('tabOf', () => {
  it("classe en 'special' toute expédition marquée isSpecialItem, peu importe le reste", () => {
    const special = EXPEDITION_DEFS.find(d => d.isSpecialItem);
    expect(special).toBeDefined();
    expect(tabOf(special!)).toBe('special');
  });

  it("classe en 'equipment' une expédition qui débloque une rareté d'équipement (fusion ou drop)", () => {
    const equip = EXPEDITION_DEFS.find(d => !d.isSpecialItem && (d.unlocksEquipRarity || d.unlocksEquipDropRarity));
    expect(equip).toBeDefined();
    expect(tabOf(equip!)).toBe('equipment');
  });

  it("classe en 'forge' toute expédition restante (ni spéciale, ni déblocage d'équipement)", () => {
    const forge = EXPEDITION_DEFS.find(d => !d.isSpecialItem && !d.unlocksEquipRarity && !d.unlocksEquipDropRarity);
    expect(forge).toBeDefined();
    expect(tabOf(forge!)).toBe('forge');
  });
});
