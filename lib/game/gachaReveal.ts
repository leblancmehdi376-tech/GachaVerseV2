// Écran spécial affiché juste avant qu'une carte Primordiale ou Transcendante
// ne se retourne lors d'une invocation. Phrase de personnage + emplacement
// pour un fichier son (soundboard fourni séparément, voir getCharacterSoundPath).

// Temps avant que la carte de dos ne commence à se retourner (le joueur a le
// temps de lire la phrase), puis durée totale de l'écran (dos + flip + face
// tenue un moment avant fermeture).
export const FLIP_DELAY_MS = 3000;
export const REVEAL_TEASER_MS = 5200;

export const CHARACTER_QUOTES: Record<string, string> = {
  arthur_leywin: 'Je deviendrai plus fort, quel qu’en soit le prix.',
  goku:          'Je me bats pour dépasser mes limites, encore et encore !',
  limule:        'Rien ne sert de fuir son destin... autant le dominer.',
  nekoz:         'La transcendance n’attend que ceux qui osent tout risquer.',
  brume:         'Silencieuse comme le vent, implacable comme l’orage.',
  steve:         'Un bloc à la fois, je façonne mon propre monde.',
  dva:           'Prête à en découdre, à fond les watts !',
  benimaru:      'Mon feu ne s’éteindra jamais.',
  aatrox_lol:    'L’épée qui m’a créé sera celle de ma vengeance.',
  the_knight:    'Dans le silence des abysses, je persévère.',
  eren:          'Je continuerai d’avancer, jusqu’à ce que je sois libre.',
  rayquaza:      'Gardien des cieux, je veille sur l’équilibre du monde.',
  ouchuu:        'L’espace n’a de limites que celles qu’on s’impose.',
  qin_shi_huang: 'Un seul empire, un seul empereur, une seule éternité.',
  vegeto:        'La fusion parfaite pour un pouvoir absolu.',
  gogeta:        'Ensemble, nous sommes invincibles.',
  aizen_t:       'Tout n’était que théâtre... jusqu’à cet instant.',
  yoriichi:      'Ma lame ne connaît pas la défaite.',
  brunhilde:     'Au nom des Valkyries, je porte le jugement.',
  chara:         'Determination.',
  shanks:        'Je n’ai qu’un seul bras, mais une volonté sans limites.',
};

const FALLBACK_QUOTES: Record<'P' | 'T', string[]> = {
  P: [
    'Une puissance primordiale s’éveille...',
    'L’essence même du pouvoir prend forme.',
  ],
  T: [
    'Une force qui transcende ce monde...',
    'L’ultime frontière vient d’être franchie.',
  ],
};

export function getCharacterQuote(templateId: string, rarity: 'P' | 'T'): string {
  return CHARACTER_QUOTES[templateId] ?? FALLBACK_QUOTES[rarity][Math.floor(Math.random() * FALLBACK_QUOTES[rarity].length)];
}

// Les fichiers audio ne sont pas fournis avec le code : ils doivent être
// déposés dans /public/sounds/gacha/<templateId>.mp3. Si le fichier est
// absent, la lecture échoue silencieusement (voir PrimordialRevealScreen).
export function getCharacterSoundPath(templateId: string): string {
  return `/sounds/gacha/${templateId}.mp3`;
}
