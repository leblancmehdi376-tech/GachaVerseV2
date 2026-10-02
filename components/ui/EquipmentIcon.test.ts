import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { EQUIPMENT_DEFS } from '@/lib/game/items';
import { getEquipmentIconSrc } from './EquipmentIcon';

const items = Object.values(EQUIPMENT_DEFS);

describe('getEquipmentIconSrc', () => {
  it('chaque équipement a son SVG dans public/ (sinon : le dessiner dans scripts/equipment-unique-art.mjs et relancer scripts/generate-equipment-icons.mjs)', () => {
    const missing = items.filter(item => !existsSync(join(process.cwd(), 'public', getEquipmentIconSrc(item)))).map(i => i.id);
    expect(missing).toEqual([]);
  });

  it('un objet personnalisé a sa propre icône, un générique partage celle de son emplacement × rareté', () => {
    for (const item of items) {
      const src = getEquipmentIconSrc(item);
      expect(src).toBe(item.bonusFor ? `/sprites/equipment/${item.id}.svg` : `/sprites/equipment/${item.slot}_${item.rarity}.svg`);
    }
  });

  it('aucune icône partagée entre deux objets', () => {
    const srcs = items.map(getEquipmentIconSrc);
    expect(new Set(srcs).size).toBe(srcs.length);
  });
});
