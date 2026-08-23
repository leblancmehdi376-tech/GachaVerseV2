// Écran spécial affiché juste avant qu'une carte Primordiale ou Transcendante
// ne se retourne lors d'une invocation. Phrase de personnage + emplacement
// pour un fichier son (soundboard fourni séparément, voir getCharacterSoundPath).

// Temps avant que la carte de dos ne commence à se retourner (le joueur a le
// temps de lire la phrase), puis durée totale de l'écran (dos + flip + face
// tenue un moment avant fermeture).
export const FLIP_DELAY_MS = 3000;
export const REVEAL_TEASER_MS = 5200;

export const CHARACTER_QUOTES: Record<string, string> = {
  arthur_leywin: 'Je protégerai ceux que j’aime, peu importe le prix.',
  goku:          'I AM THE SUPER SAYEN, SON GOKU',
  limule:        'Je ne suis pas un slime méchant !',
  nekoz:         'Nan, Jpeut pas jouer j’ai la reine de ce monde !',
  brume:         'La brume se lève... Il est temps de disparaître',
  steve:         'Salut a tous, c’est fuze !',
  dva:           'Mode expert activé !',
  benimaru:      'Je vais m’occuper de ce feu-là. À Asakusa, c’est nous qui décidons.',
  aatrox_lol:    'Je ne suis pas un roi, je ne suis pas un dieu... Je suis le Darkin !',
  the_knight:    '…',
  eren:          'Je les détruirai tous... Jusqu’au dernier !',
  rayquaza:      'ROAR !',
  ouchuu:        'Marche ou Crève, C’est mieux de crever',
  qin_shi_huang: 'Quel genre de roi a besoin de regarder derrière lui ?',
  vegeto:        'Qu’est-ce qu’il y a ? Tu trouves que mes mouvements sont trop rapides pour toi ?',
  gogeta:        'Je ne suis ni Goku ni Vegeta... Je vais t’anéantir !',
  aizen_t:       'Personne n’a jamais siégé au sommet des cieux... À partir de maintenant, ce sera moi.',
  yoriichi:      'As-tu déjà vu le véritable éclat du Soleil ?',
  brunhilde:     'Il est grand temps de montrer aux dieux la terreur qu’inspire l’humanité.',
  chara:         'Greetings. I am',
  shanks:        'Je suis venu... pour mettre fin à cette guerre !',
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
