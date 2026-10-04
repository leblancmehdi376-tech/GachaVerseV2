// Garde-fous de performance de la page Succès : le memo des cartes doit
// ignorer la progression des AUTRES succès, et le rendu ne doit pas changer.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ACHIEVEMENT_ENTRIES, type AchievementEntry } from '@/lib/game/achievements';
import { useGameStore } from '@/store/gameStore';
import { AchievementCard, sameCardProps, type AchievementCardProps } from './AchievementCard';
import { AchievementsPage } from '../AchievementsPage';

const series = ACHIEVEMENT_ENTRIES.find(e => e.levels.length > 1 && !e.levels.some(a => a.secret || a.category === 'secrets'))!;
const other = ACHIEVEMENT_ENTRIES.find(e => e !== series && !e.levels.some(a => series.levels.includes(a)))!;
const noop = () => {};

function props(entry: AchievementEntry, over: Partial<AchievementCardProps> = {}): AchievementCardProps {
  return { entry, progress: {}, unlocked: {}, claimed: {}, revealed: new Set(), index: 0, onClaim: noop, onRevealed: noop, ...over };
}

describe('sameCardProps (memo des cartes)', () => {
  const [lv1, lv2] = series.levels;
  const base = props(series, { progress: { [lv1.id]: 3 } });

  it('ignore la progression des autres succès (nouvelles maps, mêmes valeurs pour la carte)', () => {
    const otherId = other.levels[0].id;
    expect(sameCardProps(base, {
      ...base,
      progress: { ...base.progress, [otherId]: 42 },
      unlocked: { [otherId]: true },
      claimed: { [otherId]: true },
    })).toBe(true);
  });

  it('re-rend si un niveau de la carte change', () => {
    expect(sameCardProps(base, { ...base, progress: { [lv1.id]: 4 } })).toBe(false);
    expect(sameCardProps(base, { ...base, progress: { ...base.progress, [lv2.id]: 1 } })).toBe(false);
    expect(sameCardProps(base, { ...base, unlocked: { [lv1.id]: true } })).toBe(false);
    expect(sameCardProps(base, { ...base, claimed: { [lv2.id]: true } })).toBe(false);
  });

  it('re-rend si les autres props changent', () => {
    expect(sameCardProps(base, { ...base, entry: other })).toBe(false);
    expect(sameCardProps(base, { ...base, index: 1 })).toBe(false);
    expect(sameCardProps(base, { ...base, revealed: new Set() })).toBe(false);
    expect(sameCardProps(base, { ...base, onClaim: () => {} })).toBe(false);
    expect(sameCardProps(base, { ...base, onRevealed: () => {} })).toBe(false);
  });
});

describe('AchievementCard (rendu)', () => {
  const lv1 = series.levels[0];
  const render = (p: AchievementCardProps) => renderToStaticMarkup(createElement(AchievementCard, p));

  it('barre vide : reflet désactivé (is-empty)', () => {
    expect(render(props(series))).toContain('ach-prog__fill is-empty');
  });

  it('barre entamée : reflet conservé', () => {
    const html = render(props(series, { progress: { [lv1.id]: Math.max(1, Math.floor(lv1.target / 2)) } }));
    expect(html).toContain('class="ach-prog__fill"');
    expect(html).not.toContain('is-empty');
  });

  it('niveau débloqué non réclamé : bouton RÉCUPÉRER', () => {
    const html = render(props(series, { progress: { [lv1.id]: lv1.target }, unlocked: { [lv1.id]: true } }));
    expect(html).toContain('is-claimable');
    expect(html).toContain('RÉCUPÉRER');
  });
});

describe('AchievementsPage (rendu)', () => {
  it('affiche une carte par entrée, memo compris', () => {
    useGameStore.setState({ achievementProgress: {}, achievementUnlocked: {}, achievementsClaimed: {} });
    const html = renderToStaticMarkup(createElement(AchievementsPage));
    expect(html.match(/class="ach-card /g)?.length).toBe(ACHIEVEMENT_ENTRIES.length);
    expect(html).toContain(`${ACHIEVEMENT_ENTRIES.length} résultats`);
  });
});

describe('CSS de la page Succès', () => {
  const css = readFileSync(path.resolve(__dirname, '../../../app/globals.css'), 'utf8');
  const keyframes = (name: string) => css.match(new RegExp(`@keyframes ${name} \\{[^\\n]*`))?.[0] ?? '';

  it('les balayages animent transform, pas left (mise en page à chaque frame)', () => {
    for (const name of ['achHeroSweep', 'achCardSweepHover']) {
      expect(keyframes(name)).toContain('transform');
      expect(keyframes(name)).not.toMatch(/\bleft\b/);
    }
  });

  it("pas d'animation en boucle permanente sur chaque carte (seulement au survol)", () => {
    // Des dizaines de cartes à l'écran : une boucle par carte = des centaines
    // d'animations actives (mesuré : ~170 à l'ouverture de la page).
    for (const sel of ['.ach-card.is-done::after', '.ach-card.is-done .ach-medal__icon', '.ach-prog__fill::after']) {
      const start = css.indexOf(`\n${sel} {`);
      const rule = start === -1 ? '' : css.slice(start, css.indexOf('}', start) + 1);
      expect(rule).not.toMatch(/infinite/);
    }
  });

  it('les cartes hors écran ne sont pas rendues', () => {
    const card = css.match(/\n\.ach-card \{[^}]*\}/)?.[0] ?? '';
    expect(card).toContain('content-visibility: auto');
    expect(card).toContain('contain-intrinsic-size');
  });
});
