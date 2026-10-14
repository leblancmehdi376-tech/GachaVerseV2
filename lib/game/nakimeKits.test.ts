import { describe, it, expect } from 'vitest';
import { CHARACTER_POOL, BANNER_VOL2_CHARACTERS, getCharacterById } from './characters';
import { NAKIME_KIT_IDS, getCharacterKit } from './nakimeKits';
import { ABILITIES, abilityCount, abilityName, cardAbilities, NAKIME_ROLES, getNakimeRole } from './nakime';

describe('Château de Nakime — vraies techniques', () => {
  it('chaque kit vise un vrai personnage, avec des mécaniques valides et le bon nombre de techniques', () => {
    const problems: string[] = [];
    for (const id of NAKIME_KIT_IDS) {
      const tpl = getCharacterById(id);
      const kit = getCharacterKit(id)!;
      if (!tpl) { problems.push(`${id} : personnage inconnu`); continue; }
      if (!NAKIME_ROLES.includes(kit.role)) problems.push(`${id} : rôle ${kit.role}`);
      const n = abilityCount(tpl.rarity);
      if (kit.moves.length !== n) problems.push(`${id} (${tpl.rarity}) : ${kit.moves.length} techniques au lieu de ${n}`);
      kit.moves.forEach((m, i) => {
        const def = ABILITIES[m.ability];
        if (!def || m.ability.startsWith('e_') || m.ability === 'basic') problems.push(`${id} : mécanique ${m.ability}`);
        else if (!!def.ult !== (i === 2)) problems.push(`${id} : ${m.name} ${def.ult ? 'est un ultime mal placé' : 'devrait être un ultime'}`);
        if (!m.name.trim()) problems.push(`${id} : nom vide`);
      });
      if (new Set(kit.moves.map(m => m.ability)).size !== kit.moves.length) problems.push(`${id} : mécanique en double`);
    }
    expect(problems).toEqual([]);
  });

  it('tous les personnages jouables ont leurs vraies techniques', () => {
    const all = [...CHARACTER_POOL, ...BANNER_VOL2_CHARACTERS].filter(c => !c.isHero);
    const missing = [...new Set(all.map(c => c.id))].filter(id => !getCharacterKit(id));
    expect(missing).toEqual([]);
  });

  it('Goku lance un Kamehameha, Luffy un Gomu Gomu no Pistol', () => {
    const goku = cardAbilities('goku', 'P');
    expect(goku.map(id => abilityName(id, 'goku'))).toEqual(['Kamehameha', 'Kaïoken', 'Genkidama']);
    expect(abilityName(cardAbilities('luffy', 'CO')[0], 'luffy')).toBe('Gomu Gomu no Pistol');
    expect(getNakimeRole('goku')).toBe('assaillant');
  });
});
