import { CharacterTemplate, EvoForm } from '@/types/game';

// ── Stub héros (conservé pour compatibilité gameStore — Kael supprimé) ────
export const HERO_TEMPLATE: CharacterTemplate = {
  id: 'hero_main', name: 'Héros', rarity: 'L', baseDps: 1,
  spritePath: '/sprites/heroes/hero_main.png',
  description: 'Héros principal.', isHero: true, universe: 'Gacha Verse',
  forms: [
    { formId:'hero_base', name:'Héros', spritePath:'/sprites/heroes/hero_main.png', dpsFormMult:1, description:'Forme de base.' },
  ] as EvoForm[],
};

// ── Helpers ────────────────────────────────────────────────────────────────
function c(id: string, name: string, rarity: CharacterTemplate['rarity'], baseDps: number, universe: string): CharacterTemplate {
  return { id, name, rarity, baseDps, universe, description: name, spritePath: `/sprites/allies/${id}.png` };
}
// Le multiplicateur de forme (dpsFormMult) ne dépend jamais du personnage :
// c'est toujours sa position (forme 1 = ×1, forme 2 = ×2, ...) — voir
// calcCharDps() dans types/game.ts. f() ne le prend donc plus en paramètre ;
// ce() le calcule seul à partir de la position dans le tableau `forms`.
type FormInput = Omit<EvoForm, 'dpsFormMult'>;
function ce(id: string, name: string, rarity: CharacterTemplate['rarity'], baseDps: number, universe: string, forms: FormInput[], noEvoStones?: boolean): CharacterTemplate {
  const numberedForms = forms.map((form, i) => ({ ...form, dpsFormMult: i + 1 }));
  return { id, name, rarity, baseDps, universe, description: name, spritePath: `/sprites/allies/${id}.png`, forms: numberedForms, noEvoStones };
}
function f(formId: string, name: string, id: string, requiredItemIds?: string[]): FormInput {
  const tag = formId.replace(`${id}_`, '');
  const sprite = tag === 'base' ? `/sprites/allies/${id}.png` : `/sprites/allies/${id}_${tag}.png`;
  return { formId, name, spritePath: sprite, description: name, requiredItemIds };
}

// Perso de boss d'événement : la forme N requiert les N premiers objets
// d'évolution du perso (ex: [a,b,c] -> forme1:[a], forme2:[a,b], forme3:[a,b,c]).
function cumulative(items: string[], stage: number): string[] {
  return items.slice(0, stage);
}

// ══════════════════════════════════════════════════════════════════════════
export const CHARACTER_POOL: CharacterTemplate[] = [

  // ── COMMUNS ─────────────────────────────────────────────────────────────
  c('canarticho',  'Canarticho',      'C',  9,  'Pokémon'),
  c('cyborg',      'Cyborg',          'C',  8,  'Brotato'),
  c('slime',       'Slime',           'C',  12,  'Minecraft'),
  c('axolotl',     'Axolotl',         'C',  9,  'Minecraft'),
  c('garry_fish',  'Garry Fish',      'C',  12,  'Digital Circus'),
  c('birthday_boy','Birthday Boy',    'C',  12,  'R.E.P.O'),
  c('gummigoo',    'Gummigoo',        'C',  11,  'Digital Circus'),
  c('yamcha',      'Yamcha',          'C',  10,  'Dragon Ball Z'),
  c('korogu',      'Korogu Zelda',    'C',  7,  'The Legend of Zelda'),
  c('bangers',     'Bangers',         'C',  11,  'R.E.P.O'),
  c('bubba',       'Bubba Bubbaphant','C',  7,  'Poppy Playtime'),
  c('tentacool',   'Tentacool',       'C',  13,  'Pokémon'),
  c('chenipan',    'Chenipan',        'C',  9,  'Pokémon'),
  c('mr_popo',     'Mr Popo',         'C',  7,  'Dragon Ball Z'),

  // ── UNCOMMUNS ────────────────────────────────────────────────────────────
  c('prince_lars', 'Prince Lars',     'U', 18,  'The Legend of Zelda'),
  c('eugeo',       'Eugeo',           'U', 19,  'Sword Art Online'),
  c('angie',       'Angie',           'U', 23,  'Danganronpa'),
  c('gobuta',      'Gobuta',          'U', 20,  'Tensei Slime'),
  c('vogue_merry', 'Vogue Merry',     'U', 18,  'One Piece'),

  // ── RARES ────────────────────────────────────────────────────────────────
  ce('salamèche', 'Salamèche', 'R', 30, 'Pokémon', [
    f('salamèche_base', 'Salamèche',  'salamèche'),
    f('salamèche_evo1', 'Reptincel',  'salamèche'),
    f('salamèche_evo2', 'Dracaufeu',  'salamèche'),
  ]),
  ce('carapuce', 'Carapuce', 'R', 32, 'Pokémon', [
    f('carapuce_base', 'Carapuce',  'carapuce'),
    f('carapuce_evo1', 'Carabaffe', 'carapuce'),
    f('carapuce_evo2', 'Tortank',   'carapuce'),
  ]),
  ce('bulbizarre', 'Bulbizarre', 'R', 27, 'Pokémon', [
    f('bulbizarre_base', 'Bulbizarre', 'bulbizarre'),
    f('bulbizarre_evo1', 'Herbizarre', 'bulbizarre'),
    f('bulbizarre_evo2', 'Florizarre', 'bulbizarre'),
  ]),
  c('kissy_missy', 'Kissy Missy',     'R', 27,  'Poppy Playtime'),
  ce('yuno', 'Yuno', 'R', 30, 'Black Clover', [
    f('yuno_base', 'Yuno',                  'yuno'),
    f('yuno_evo1', 'Yuno — Esprit du Vent', 'yuno'),
  ]),
  c('the_dress',   'The Dress',       'R', 33,  'R.E.P.O'),
  c('kirito',      'Kirito',          'R', 28,  'Sword Art Online'),

  // ── ÉPIQUES ─────────────────────────────────────────────────────────────
  c('arsene',           'Arsène',           'E',  43, 'Persona 5'),
  c('huggy_wuggy',      'Huggy Wuggy',      'E',  41, 'Poppy Playtime'),
  c('diablo',           'Diablo',           'E',  38, 'Tensei Slime'),
  c('reaper_leviathan', 'Reaper Leviathan', 'E',  37, 'Subnautica'),
  c('reinhardt',        'Reinhardt',        'E',  43, 'Overwatch'),

  // ── LÉGENDAIRES ──────────────────────────────────────────────────────────
  ce('sanji', 'Sanji', 'L', 48, 'One Piece', [
    f('sanji_base', 'Sanji',            'sanji'),
    f('sanji_evo1', 'Sanji — Raid Suit','sanji'),
  ]),
  ce('asta', 'Asta', 'L', 47, 'Black Clover', [
    f('asta_base', 'Asta',              'asta'),
    f('asta_evo1', 'Asta — Démon Noir', 'asta'),
  ]),
  c('taureau',     'Taureau',          'L', 51, 'R.E.P.O'),
  ce('kioraku', 'Kyoraku', 'L', 48, 'Bleach', [
    f('kioraku_base', 'Kyoraku',          'kioraku'),
    f('kioraku_evo1', 'Kyoraku — Bankai', 'kioraku'),
  ]),
  c('arthur_pandragon', 'Arthur Pandragon', 'L', 50, 'Fate'),
  ce('arthur_leywin', 'Arthur Leywin', 'P', 91, 'Tbate', (() => {
    const items = ['cristal_ether', 'epee_ether', 'sylvia'];
    return [
      f('arthur_leywin_base', 'Arthur Leywin',           'arthur_leywin'),
      f('arthur_leywin_evo1', 'Arthur Leywin — Lame d’Éther',   'arthur_leywin',  cumulative(items, 1)),
      f('arthur_leywin_evo2', 'Arthur Leywin — Épée de l’Aube', 'arthur_leywin', cumulative(items, 2)),
      f('arthur_leywin_evo3', 'Arthur Leywin — Roi du Soleil',  'arthur_leywin', cumulative(items, 3)),
    ];
  })(), true),
  ce('nagito_komaeda', 'Nagito Komaeda', 'L', 48, 'Danganronpa', [
    f('nagito_komaeda_base', 'Nagito Komaeda',         'nagito_komaeda'),
    f('nagito_komaeda_evo1', 'Nagito — Espoir Ultime', 'nagito_komaeda'),
  ]),
  c('chuuya',      'Chuuya',           'L', 53, 'Bungou Stray Dogs'),

  // ── MYTHIQUES ────────────────────────────────────────────────────────────
  ce('ren_m', 'Ren', 'M', 63, 'Persona 5', [
    f('ren_m_base', 'Ren',   'ren_m'),
    f('ren_m_evo1', 'Joker', 'ren_m'),
  ]),
  ce('ichigo', 'Ichigo', 'M', 58, 'Bleach', [
    f('ichigo_base', 'Ichigo',          'ichigo'),
    f('ichigo_evo1', 'Ichigo — Bankai', 'ichigo'),
    f('ichigo_evo2', 'Ichigo — Vasto',  'ichigo'),
  ]),
  c('ouma',  'Kokichi Ouma', 'M', 62, 'Danganronpa'),
  c('jax',   'Jax',          'M', 61, 'Digital Circus'),
  c('dazai', 'Dazai',        'M', 58, 'Bungou Stray Dogs'),

  // ── STELLAIRES ───────────────────────────────────────────────────────────
  ce('naruto', 'Naruto', 'S', 70, 'Naruto', [
    f('naruto_base', 'Naruto',                 'naruto'),
    f('naruto_evo1', 'Naruto — Mode Sage',     'naruto'),
    f('naruto_evo2', 'Naruto — Chakra Kyuubi', 'naruto'),
    f('naruto_evo3', 'Naruto — Mode Baryon',   'naruto'),
  ]),
  ce('luffy', 'Luffy', 'CO', 81, 'One Piece', [
    f('luffy_base', 'Luffy',          'luffy'),
    f('luffy_evo1', 'Luffy — Gear 2', 'luffy'),
    f('luffy_evo2', 'Luffy — Gear 4', 'luffy'),
    f('luffy_evo3', 'Luffy — Gear 5', 'luffy'),
  ]),

  // ── COSMIQUES ────────────────────────────────────────────────────────────
  ce('vegeta', 'Végéta', 'CO', 83, 'Dragon Ball Z', [
    f('vegeta_base', 'Végéta',            'vegeta'),
    f('vegeta_evo1', 'Végéta SS',         'vegeta'),
    f('vegeta_evo2', 'Végéta SS Divin',   'vegeta'),
    f('vegeta_evo3', 'Végéta SS Blue',    'vegeta'),
  ]),
  ce('minato', 'Minato', 'S', 73, 'Naruto', [
    f('minato_base', 'Minato',              'minato'),
    f('minato_evo1', 'Minato — 4ème Hokage','minato'),
  ]),
  ce('gilgamesh', 'Gilgamesh', 'CO', 77, 'Fate', [
    f('gilgamesh_base', 'Gilgamesh',               'gilgamesh'),
    f('gilgamesh_evo1', 'Gilgamesh — Roi des Héros','gilgamesh'),
  ]),
  ce('link_midona', 'Link & Midona', 'CO', 80, 'The Legend of Zelda', [
    f('link_midona_base', 'Link & Midona',                     'link_midona'),
    f('link_midona_evo1', 'Link Loup & Midona',                'link_midona'),
    f('link_midona_evo2', 'Link & Midona — Princesse Twili',   'link_midona'),
  ]),
  ce('jinwoo', 'Sung Jin Woo', 'S', 71, 'Solo Leveling', (() => {
    const items = ['elixir_vie', 'manteau_ombre', 'beru'];
    return [
      f('jinwoo_base', 'Sung Jin Woo',                      'jinwoo'),
      f('jinwoo_evo1', 'Sung Jin Woo — Monarque Éveillé',   'jinwoo',  cumulative(items, 1)),
      f('jinwoo_evo2', 'Sung Jin Woo — Seigneur des Ombres','jinwoo', cumulative(items, 2)),
      f('jinwoo_evo3', 'Sung Jin Woo — Monarque des Ombres','jinwoo', cumulative(items, 3)),
    ];
  })(), true),

  ce('cid_kagenou', 'Cid Kagenou', 'CO', 83, 'The Eminence in Shadow', (() => {
    const items = ['masque_cid', 'epee_slime', 'slime_eminence'];
    return [
      f('cid_kagenou_base', 'Cid Kagenou', 'cid_kagenou'),
      f('cid_kagenou_evo1', 'Shadow',      'cid_kagenou',  cumulative(items, 1)),
      f('cid_kagenou_evo2', 'John Smith',  'cid_kagenou', cumulative(items, 2)),
      f('cid_kagenou_evo3', 'Cid Kagenou — L’Éminence des Ombres', 'cid_kagenou', cumulative(items, 3)),
    ];
  })(), true),

  // ── PRIMORDIAUX ──────────────────────────────────────────────────────────
  ce('goku', 'Goku', 'P', 87, 'Dragon Ball Z', [
    f('goku_base', 'Goku',                'goku'),
    f('goku_evo1', 'Goku Super Saiyen',   'goku'),
    f('goku_evo2', 'Goku Super Saiyen 3', 'goku'),
    f('goku_evo3', 'Goku SS Divin',       'goku'),
    f('goku_evo4', 'Goku SS Blue',        'goku'),
    f('goku_evo5', 'Goku Signe UI',       'goku'),
    f('goku_evo6', 'Goku Ultra Instinct', 'goku'),
  ]),
  ce('limule', 'Limule', 'P', 93, 'Tensei Slime', [
    f('limule_base', 'Limule',            'limule'),
    f('limule_evo1', 'Limule Évoluée',    'limule'),
    f('limule_evo2', 'Limule Ancestrale', 'limule'),
    f('limule_evo3', 'Limule Divine',     'limule'),
  ]),

  // ── TRANSCENDANT ─────────────────────────────────────────────────────────
  ce('nekoz', 'NekoZ', 'T', 102, 'Chill&Cool', [
    f('nekoz_base', 'NekoZ',             'nekoz'),
    f('nekoz_evo1', 'NekoZ — Mode Divin','nekoz'),
    f('nekoz_evo2', 'NekoZ — Transcendance Totale','nekoz'),
  ]),


  // ══════════════════════════════════════════════════════════════════════════
  // BANNIÈRE V2 — Personnages exacts selon le document GachaVerse.yaml
  // ══════════════════════════════════════════════════════════════════════════

  // ── COMMUNS V2 ─────────────────────────────────────────────────────────
  c('violet_p5',         'Violet',               'C',  9,  'Persona 5'),
  c('zooble',            'Zooble',               'C',  13,  'Digital Circus'),
  c('bond',              'Bond',                 'C',  8,  'Spy x Family'),
  c('murata',            'Murata',               'C',  12,  'Demon Slayer'),
  c('grubs',             'Grubs',                'C',  9,  'League of Legends'),
  c('moris',             'Moris',                'C',  11,  'Nos Animaux'),
  c('corayon',           'Corayon',              'C',  13,  'Pokémon'),
  c('qwilfish',          'Qwilfish',             'C',  10,  'Pokémon'),
  c('queulorior',        'Queulorior',           'C',  9,  'Pokémon'),
  c('sombra_ow',         'Sombra',               'C',  8,  'Overwatch'),
  c('connie',            'Connie',               'C',  11,  'Attaque des Titans'),
  c('silverfish',        'SilverFish',           'C',  10,  'Minecraft'),
  c('spider_mc',         'Spider',               'C',  7,  'Minecraft'),
  c('cochon',            'Cochon',               'C',  13,  'Minecraft'),
  c('kiba',              'Kiba',                 'C',  11,  'Naruto'),
  c('caribou',           'Caribou',              'C',  13,  'One Piece'),
  c('wapol',             'Wapol',                'C',  13,  'One Piece'),
  c('mizuki_naruto',     'Mizuki',               'C',  8,  'Naruto'),
  c('oolong',            'Oolong',               'C',  11,  'Dragon Ball Z'),
  c('teuchi',            'Teuchi',               'C',  13,  'Naruto'),
  c('kasugaigarasu',     'Kasugaigarasu',        'C',  8,  'Demon Slayer'),
  c('ribby_croaks',      'Ribby & Croaks',       'C',  7,  'Cuphead'),
  c('sbire',             'Sbire',                'C',  12,  'League of Legends'),
  c('mr_satan',          'Mr Satan',             'C',  9,  'Dragon Ball Z'),

  // ── UNCOMMONS V2 ────────────────────────────────────────────────────────
  c('konohamaru',        'Konohamaru',           'U', 19,  'Naruto'),
  c('goron',             'Goron',                'U', 18,  'The Legend of Zelda'),
  c('repo_char',         'R.E.P.O',              'U', 22,  'R.E.P.O'),
  c('tracer',            'Tracer',               'U', 20,  'Overwatch'),
  c('lishu_ap',          'Lishu',                'U', 20,  "Les Carnets de l'Apothicaire"),
  c('xiaolan_ap',        'Xiaolan',              'U', 20,  "Les Carnets de l'Apothicaire"),
  c('kobeni',            'Kobeni',               'U', 23,  'Chainsaw Man'),
  c('haumea_ff',         'Haumea',               'U', 20,  'Fire Force'),
  c('riza',              'Riza',                 'U', 21,  'Fullmetal Alchemist Brotherhood'),
  c('twix',              'Twix',                 'U', 19,  'Nos Animaux'),
  c('zote',              'Zote',                 'U', 18,  'Hollow Knight'),
  c('jean_aot',          'Jean',                 'U', 17,  'Attaque des Titans'),
  c('mugman',            'Mugman',               'U', 23,  'Cuphead'),
  c('chica_fnaf',        'Chica',                'U', 17,  "Five Nights At Freddy's"),
  c('poulet',            'Poulet',               'U', 20,  'Minecraft'),
  c('tenten',            'Tenten',               'U', 20,  'Naruto'),
  c('hanataro',          'Yamada Hanatarô',      'U', 17,  'Bleach'),
  c('kon',               'Kon',                  'U', 19,  'Bleach'),
  c('don_kanonji',       'Don Kanonji',          'U', 18,  'Bleach'),
  c('silica',            'Silica',               'U', 21,  'Sword Art Online'),
  c('laboon',            'Laboon',               'U', 21,  'One Piece'),
  c('fantome',           'Fantome',              'U', 17,  'Brotato'),
  c('sisigou',           'Sisigou Kairi',        'U', 17,  'Fate'),
  c('melina',            'Melina',               'U', 21,  'Elden Ring'),

  // ── RARES V2 ────────────────────────────────────────────────────────────
  c('boa_hancock',       'Boa Hancock',          'R', 28,  'One Piece'),
  c('finral',            'Finral',               'R', 29,  'Black Clover'),
  c('enderman',          'Enderman',             'R', 31,  'Minecraft'),
  c('sabito',            'Sabito',               'R', 33,  'Demon Slayer'),
  c('k1bo',              'K1-BO',                'R', 32,  'Danganronpa'),
  c('yasutora_sado',     'Yasutora Sado',        'R', 27,  'Bleach'),

  // ── ÉPIQUES V2 ──────────────────────────────────────────────────────────
  c('catnap',            'CatNap',               'E', 42,  'Poppy Playtime'),
  c('warden',            'Warden',               'E', 37,  'Minecraft'),
  c('reaper_ow',         'Reaper',               'E', 41,  'Overwatch'),
  c('lihua_ap',          'Lihua',                'E', 40,  "Les Carnets de l'Apothicaire"),
  c('anya_spy',          'Anya',                 'E', 42,  'Spy x Family'),
  c('maitre_yi',         'Maître Yi',            'E', 41,  'League of Legends'),
  c('herald',            'Hérald',               'E', 39,  'League of Legends'),
  ce('loki_va', 'Loki', 'E', 41, 'Valkyrie Apocalypse', [
    f('loki_va_base',    'Loki',                 'loki_va'),
    f('loki_va_god',     'Loki — Forme de Dieu', 'loki_va'),
  ]),
  c('kirigiri',          'Kirigiri',             'E', 42,  'Danganronpa'),
  c('asriel_ut',         'Asriel',               'E', 41,  'Undertale'),
  c('bonny_fnaf',        'Bonny',                'E', 42,  "Five Nights At Freddy's"),
  c('panda_tekken',      'Panda',                'E', 43,  'Tekken'),
  ce('margith', 'Margith', 'E', 39, 'Elden Ring', [
    f('margith_base',    'Margith',              'margith'),
    f('margith_p2',      'Margith P2',           'margith'),
  ]),

  // ── LÉGENDAIRES V2 ──────────────────────────────────────────────────────
  ce('piccolo', 'Piccolo', 'L', 53, 'Dragon Ball Z', [
    f('piccolo_base',    'Piccolo',              'piccolo'),
    f('piccolo_kami',    'Fusion avec Kami',     'piccolo'),
    f('piccolo_orange',  'Orange Piccolo',       'piccolo'),
  ]),
  ce('kakashi', 'Kakashi', 'L', 47, 'Naruto', [
    f('kakashi_base',    'Kakashi',              'kakashi'),
    f('kakashi_sharingan','Sharingan',           'kakashi'),
    f('kakashi_mangekyo','Mangekyo Sharingan',   'kakashi'),
  ]),
  ce('aki_csm', 'Aki Hayakawa', 'L', 50, 'Chainsaw Man', [
    f('aki_csm_base',    'Aki Hayakawa',         'aki_csm'),
    f('aki_csm_beast',   'Beast Devil',          'aki_csm'),
  ]),
  ce('arthur_ff', 'Arthur', 'L', 51, 'Fire Force', [
    f('arthur_ff_base',  'Arthur',               'arthur_ff'),
    f('arthur_ff_ima',   'Imagination',          'arthur_ff'),
  ]),
  ce('alphonse', 'Alphonse', 'L', 48, 'Fullmetal Alchemist Brotherhood', [
    f('alphonse_base',   'Alphonse',             'alphonse'),
    f('alphonse_armor',  'Armure',               'alphonse'),
  ]),
  ce('karma_lol', 'Karma', 'L', 48, 'League of Legends', [
    f('karma_lol_base',  'Karma',                'karma_lol'),
    f('karma_lol_6',     'Karma Level 6',        'karma_lol'),
  ]),
  ce('jinx_lol', 'Jinx', 'L', 51, 'League of Legends', [
    f('jinx_lol_base',   'Jinx',                 'jinx_lol'),
    f('jinx_lol_6',      'Jinx Level 6',         'jinx_lol'),
  ]),
  c('igloo_na',          'Igloo',                'L', 52, 'Nos Animaux'),
  ce('thor_va', 'Thor', 'L', 53, 'Valkyrie Apocalypse', [
    f('thor_va_base',    'Thor',                 'thor_va'),
    f('thor_va_god',     'Thor — Forme de Dieu', 'thor_va'),
  ]),
  ce('mikasa', 'Mikasa', 'L', 50, 'Attaque des Titans', [
    f('mikasa_base',     'Mikasa',               'mikasa'),
    f('mikasa_batail',   "Bataillon d'Exploration",'mikasa'),
  ]),
  c('cuphead_char',      'Cuphead',              'L', 52, 'Cuphead'),
  c('emiya_kiri',        'Emiya Kiritsugu',      'L', 47, 'Fate'),
  ce('flowey_ut', 'Flowey', 'L', 49, 'Undertale', [
    f('flowey_ut_base',  'Flowey',               'flowey_ut'),
    f('flowey_ut_omega', 'Omega Flowey',         'flowey_ut'),
  ]),
  ce('godrick_er', 'Godrick', 'L', 53, 'Elden Ring', [
    f('godrick_er_base', 'Godrick',              'godrick_er'),
    f('godrick_er_p2',   'Godrick P2',           'godrick_er'),
  ]),

  // ── MYTHIQUES V2 ────────────────────────────────────────────────────────
  ce('trunks', 'Trunks', 'M', 62, 'Dragon Ball Z', [
    f('trunks_base',     'Trunks',               'trunks'),
    f('trunks_ss',       'Super Saiyan',         'trunks'),
    f('trunks_ss2',      'Super Saiyan 2',       'trunks'),
  ]),
  ce('explorer', 'Explorer', 'M', 61, 'Brotato', [
    f('explorer_base',   'Explorer',             'explorer'),
    f('explorer_tree',   'Explorer — With Tree', 'explorer'),
  ]),
  ce('sea_emperor', 'Sea Emperor', 'M', 62, 'Subnautica', [
    f('sea_emperor_base','Sea Emperor',          'sea_emperor'),
    f('sea_emperor_adult','Sea Emperor Adulte',  'sea_emperor'),
  ]),
  c('zelda_char',        'Zelda',                'M', 62, 'The Legend of Zelda'),
  ce('clown_repo', 'Clown', 'M', 58, 'R.E.P.O', [
    f('clown_repo_base', 'Clown',                'clown_repo'),
    f('clown_repo_laser','Clown — Laser',        'clown_repo'),
  ]),
  ce('asuna', 'Asuna', 'M', 60, 'Sword Art Online', [
    f('asuna_base',      'Asuna',                'asuna'),
    f('asuna_elfe',      "Armure de l'Elfe",     'asuna'),
    f('asuna_cheat',     'Cheat Activate',       'asuna'),
  ]),
  ce('power_csm', 'Power', 'M', 60, 'Chainsaw Man', [
    f('power_csm_base',  'Power',                'power_csm'),
    f('power_csm_blood', 'Blood Devil',          'power_csm'),
  ]),
  ce('yor', 'Yor', 'M', 62, 'Spy x Family', [
    f('yor_base',        'Yor Forger',           'yor'),
    f('yor_assassin',    'Assassin',             'yor'),
  ]),
  ce('nezuko', 'Nezuko', 'M', 63, 'Demon Slayer', [
    f('nezuko_base',     'Nezuko',               'nezuko'),
    f('nezuko_demon',    'Forme Démoniaque',     'nezuko'),
  ]),
  ce('zenitsu', 'Zenitsu', 'M', 61, 'Demon Slayer', [
    f('zenitsu_base',    'Zenitsu',              'zenitsu'),
    f('zenitsu_maquille','Zenitsu Maquillé',     'zenitsu'),
    f('zenitsu_marque',  'Zenitsu — Marque',     'zenitsu'),
  ]),
  ce('jinshi_ap', 'Jinshi', 'M', 59, "Les Carnets de l'Apothicaire", [
    f('jinshi_ap_base',  'Jinshi',               'jinshi_ap'),
    f('jinshi_ap_jade',  'Armure de Jade',       'jinshi_ap'),
  ]),
  c('adam_va',           'Adam',                 'M', 61, 'Valkyrie Apocalypse'),
  ce('hornet_hk', 'Hornet', 'M', 61, 'Hollow Knight', [
    f('hornet_hk_base',  'Hornet',               'hornet_hk'),
    f('hornet_hk_needle',"Forme de l'Aiguille",  'hornet_hk'),
  ]),
  ce('claudio', 'Claudio', 'M', 57, 'Tekken', [
    f('claudio_base',    'Claudio',              'claudio'),
    f('claudio_burst',   'Claudio — Burst',      'claudio'),
  ]),
  c('celeste_drp',       'Celeste',              'M', 59, 'Danganronpa'),

  // ── STELLAIRES V2 ───────────────────────────────────────────────────────
  ce('zoro', 'Zoro', 'S', 72, 'One Piece', [
    f('zoro_base',       'Zoro',                 'zoro'),
    f('zoro_eclipse',    'Post Éclipse',         'zoro'),
    f('zoro_wano',       'Post Wano',            'zoro'),
  ]),
  ce('madara', 'Madara', 'S', 73, 'Naruto', [
    f('madara_base',     'Madara',               'madara'),
    f('madara_rinnegan', 'Rinnegan',             'madara'),
    f('madara_susanoo',  'Susanoo',              'madara'),
  ]),
  ce('millim', 'Millim', 'S', 68, 'Tensei Slime', [
    f('millim_base',     'Millim',               'millim'),
    f('millim_slime',    'Millim — Slime',       'millim'),
  ]),
  ce('byakuya', 'Byakuya', 'S', 69, 'Bleach', [
    f('byakuya_base',    'Byakuya',              'byakuya'),
    f('byakuya_shikai',  'Shikai',               'byakuya'),
    f('byakuya_bankai',  'Bankai',               'byakuya'),
  ]),
  ce('richard_coeur', 'Richard Cœur de Lion', 'S', 71, 'Fate', [
    f('richard_coeur_base','Richard Cœur de Lion','richard_coeur'),
    f('richard_coeur_armor','Armure de Lion',    'richard_coeur'),
  ]),
  ce('ganondorf_char', 'Ganondorf', 'S', 67, 'The Legend of Zelda', [
    f('ganondorf_char_base','Ganondorf',         'ganondorf_char'),
    f('ganondorf_char_hum','Forme Humaine',      'ganondorf_char'),
    f('ganondorf_char_dem','Forme Démoniaque',   'ganondorf_char'),
  ]),
  ce('pomni', 'Pomni', 'S', 72, 'Digital Circus', [
    f('pomni_base',      'Pomni',                'pomni'),
    f('pomni_prime',     'Pomni — Prime',        'pomni'),
  ]),
  ce('alice_sao', 'Alice', 'S', 68, 'Sword Art Online', [
    f('alice_sao_base',  'Alice',                'alice_sao'),
    f('alice_sao_armor', 'Armure Légendaire',    'alice_sao'),
    f('alice_sao_max',   'Puissance Maximale',   'alice_sao'),
  ]),
  ce('atsushi',           'Atsushi',              'S', 73, 'Bungou Stray Dogs', [
    f('atsushi_base', 'Atsushi', 'atsushi'),
    f('atsushi_evo1', 'Atsushi — Bête', 'atsushi'),
  ]),
  ce('mao_mao_ap', 'Mao Mao', 'S', 72, "Les Carnets de l'Apothicaire", [
    f('mao_mao_ap_base', 'Mao Mao',             'mao_mao_ap'),
    f('mao_mao_ap_maqui','Maquillage',          'mao_mao_ap'),
  ]),
  ce('denji', 'Denji', 'S', 68, 'Chainsaw Man', [
    f('denji_base',      'Denji',                'denji'),
    f('denji_pochita',   'Pochita',              'denji'),
    f('denji_chainsaw',  'Chainsaw Devil',       'denji'),
  ]),
  ce('loid', 'Loid Forger', 'S', 70, 'Spy x Family', [
    f('loid_base',       'Loid Forger',          'loid'),
    f('loid_espion',     'Espion',               'loid'),
  ]),
  ce('tanjiro', 'Tanjiro', 'S', 70, 'Demon Slayer', [
    f('tanjiro_base',    'Tanjiro',              'tanjiro'),
    f('tanjiro_eau',     "Forme de l'Eau",       'tanjiro'),
    f('tanjiro_feu',     'Forme du Feu',         'tanjiro'),
  ]),
  ce('edward', 'Edward', 'S', 73, 'Fullmetal Alchemist Brotherhood', [
    f('edward_base',     'Edward',               'edward'),
    f('edward_alchi',    'Alchimiste',           'edward'),
    f('edward_automail', 'Automail',             'edward'),
  ]),
  ce('roy', 'Roy Mustang', 'S', 68, 'Fullmetal Alchemist Brotherhood', [
    f('roy_base',        'Roy Mustang',          'roy'),
    f('roy_flame',       'Flame Alchemist',      'roy'),
  ]),
  ce('horus_na', 'Horus', 'S', 72, 'Nos Animaux', [
    f('horus_na_base',   'Horus',                'horus_na'),
    f('horus_na_celeste','Forme Céleste',        'horus_na'),
  ]),
  ce('livai', 'Livai', 'S', 67, 'Attaque des Titans', [
    f('livai_base',      'Livai',                'livai'),
    f('livai_caporal',   'Caporal',              'livai'),
  ]),
  ce('freddy_fnaf', 'Freddy', 'S', 73, "Five Nights At Freddy's", [
    f('freddy_fnaf_base','Freddy Fazbear',       'freddy_fnaf'),
    f('freddy_fnaf_toy', 'Freddy Toy',           'freddy_fnaf'),
    f('freddy_fnaf_gold','Freddy Golden',        'freddy_fnaf'),
  ]),
  ce('sans_ut', 'Sans', 'S', 67, 'Undertale', [
    f('sans_ut_base',    'Sans',                 'sans_ut'),
    f('sans_ut_genocide','Sans — Mode Génocide', 'sans_ut'),
  ]),
  ce('pichu', 'Pichu', 'S', 69, 'Pokémon', [
    f('pichu_base',      'Pichu',                'pichu'),
    f('pichu_pikachu',   'Pikachu',              'pichu'),
    f('pichu_raichu',    'Raichu',               'pichu'),
    f('pichu_mega',      'Méga Raichu',          'pichu'),
  ]),

  // ── COSMIQUES V2 ────────────────────────────────────────────────────────
  ce('yami', 'Yami', 'CO', 81, 'Black Clover', [
    f('yami_base',       'Yami',                 'yami'),
    f('yami_adult',      'Yami Adulte',          'yami'),
    f('yami_slash',      'Dimensional Slash',    'yami'),
  ]),
  ce('aizen', 'Aizen', 'CO', 83, 'Bleach', [
    f('aizen_base',      'Aizen',                'aizen'),
    f('aizen_shikai',    'Aizen Shikai',         'aizen'),
    f('aizen_bankai',    'Aizen Bankai',         'aizen'),
    f('aizen_hogyoku',   'Aizen Hogyoku',        'aizen'),
  ]),
  ce('shinra', 'Shinra', 'CO', 83, 'Fire Force', [
    f('shinra_base',     'Shinra',               'shinra'),
    f('shinra_8e',       '8ème Brigade',         'shinra'),
    f('shinra_adora',    'Adora Burst',          'shinra'),
  ]),
  ce('jin_tekken', 'Jin Kazama', 'CO', 77, 'Tekken', [
    f('jin_tekken_base', 'Jin Kazama',           'jin_tekken'),
    f('jin_tekken_evil', 'Jin — Evil',           'jin_tekken'),
    f('jin_tekken_devil', 'Devil Jin',           'jin_tekken'),
  ]),
  ce('zorua', 'Zorua', 'CO', 80, 'Pokémon', [
    f('zorua_base',      'Zorua',                'zorua'),
    f('zorua_hisui',     "Zorua d'Hisui",        'zorua'),
    f('zorua_zoroark',   'Zoroark',              'zorua'),
    f('zorua_hisui2',    "Zoroark d'Hisui",      'zorua'),
  ]),
  ce('brume', 'Brume', 'P', 91, 'Nos Animaux', [
    f('brume_base',      'Brume',                'brume'),
    f('brume_sacree',    'Brume Sacrée',         'brume'),
    f('brume_ultime',    'Brume Ultime',         'brume'),
  ]),

  // ── PRIMORDIAUX V2 ──────────────────────────────────────────────────────
  ce('steve', 'Steve', 'P', 92, 'Minecraft', [
    f('steve_base',      'Steve',                'steve'),
    f('steve_diamond',   'Armure en Diamant',    'steve'),
    f('steve_netherite', 'Armure en Netherite',  'steve'),
  ]),
  ce('dva', 'D.Va', 'P', 88, 'Overwatch', [
    f('dva_base',        'D.Va',                 'dva'),
    f('dva_mech',        'D.Va — Mech',          'dva'),
  ]),
  ce('benimaru', 'Benimaru', 'P', 89, 'Fire Force', [
    f('benimaru_base',   'Benimaru',             'benimaru'),
    f('benimaru_prime',  'Benimaru — Prime',     'benimaru'),
  ]),
  ce('aatrox_lol', 'Aatrox', 'P', 91, 'League of Legends', [
    f('aatrox_lol_base', 'Aatrox',              'aatrox_lol'),
    f('aatrox_lol_6',    'Aatrox Level 6',      'aatrox_lol'),
    f('aatrox_lol_20',   'Aatrox Level 20',     'aatrox_lol'),
  ]),
  ce('the_knight', 'The Knight', 'P', 87, 'Hollow Knight', [
    f('the_knight_base', 'The Knight',          'the_knight'),
    f('the_knight_lvl1', 'Aiguillon Lvl 1',     'the_knight'),
    f('the_knight_lvl2', 'Aiguillon Lvl 2',     'the_knight'),
    f('the_knight_lvl3', 'Aiguillon Lvl 3',     'the_knight'),
  ]),
  ce('eren', 'Eren', 'P', 93, 'Attaque des Titans', [
    f('eren_base',       'Eren',                 'eren'),
    f('eren_adult',      'Eren Adulte',          'eren'),
    f('eren_assaillant', 'Titan Assaillant',     'eren'),
    f('eren_originel',   'Titan Originel',       'eren'),
  ]),
  ce('rayquaza', 'Rayquaza', 'P', 88, 'Pokémon', [
    f('rayquaza_base',      'Rayquaza',                    'rayquaza'),
    f('rayquaza_mega',      'Méga Rayquaza',               'rayquaza'),
    f('rayquaza_ascension', 'Rayquaza — Ascension Céleste','rayquaza'),
  ]),
  ce('ouchuu', 'Ouchuu', 'P', 93, "Chill&Cool", [
    f('ouchuu_base',     'Ouchuu',               'ouchuu'),
    f('ouchuu_dep',      'Ouchuu Dépression Max','ouchuu'),
  ]),

  // ── TRANSCENDANTS V2 ────────────────────────────────────────────────────
  ce('qin_shi_huang', 'Qin Shi Huang', 'T', 101, 'Valkyrie Apocalypse', [
    f('qin_shi_base',    'Qin Shi Huang',        'qin_shi_huang'),
    f('qin_shi_roi',     'Roi de Chine',         'qin_shi_huang'),
    f('qin_shi_immortel','Empereur Immortel',    'qin_shi_huang'),
  ]),

  // ══════════════════════════════════════════════════════════════════════════
  // PERSONNAGES CRAFTABLES — Obtenus uniquement via la Forge
  // ══════════════════════════════════════════════════════════════════════════
  ce('vegeto', 'Végéto', 'P', 90, 'Dragon Ball Z', [
    f('vegeto_base',     'Végéto',               'vegeto'),
    f('vegeto_ss',       'Végéto Super Saiyen',  'vegeto'),
    f('vegeto_ssblue',   'Végéto SS Blue',       'vegeto'),
  ]),
  ce('gogeta', 'Gogeta', 'P', 90, 'Dragon Ball Z', [
    f('gogeta_base',     'Gogeta',               'gogeta'),
    f('gogeta_ss',       'Gogeta Super Saiyen',  'gogeta'),
    f('gogeta_ssblue',   'Gogeta SS Blue',       'gogeta'),
  ]),
  ce('aizen_t', 'Aizen Transcendant', 'P', 89, 'Bleach', [
    f('aizen_t_base',    'Aizen Transcendant',   'aizen_t'),
    f('aizen_t_fusion',  'Fusion Complète',      'aizen_t'),
  ]),
  ce('yoriichi', 'Yoriichi Tsugikuni', 'P', 92, 'Demon Slayer', [
    f('yoriichi_base',   'Yoriichi',             'yoriichi'),
    f('yoriichi_sun',    'Danse du Soleil',      'yoriichi'),
  ]),
  c('brunhilde',   'Brunhilde',                  'P', 89, 'Valkyrie Apocalypse'),
  ce('chara', 'Chara', 'P', 93, 'Undertale', [
    f('chara_base',      'Chara',                'chara'),
    f('chara_genocide',  'Route Génocide',       'chara'),
  ]),
  ce('shanks', 'Shanks le Roux', 'T', 97, 'One Piece', [
    f('shanks_base',      'Shanks le Roux',      'shanks'),
    f('shanks_conqueror', 'Haki du Conquérant',  'shanks'),
    f('shanks_god',       'Dieu du Haki',        'shanks'),
    f('shanks_pirateking','Roi des Pirates',     'shanks'),
  ]),
];

// Index id → template, construit une seule fois. Évite un scan linéaire sur les
// ~193 personnages à CHAQUE appel (fonction appelée en boucle : combat chaque
// seconde, rendu de la collection, synergies, équipe...).
const CHARACTER_BY_ID: Map<string, CharacterTemplate> = new Map(
  CHARACTER_POOL.map(c => [c.id, c])
);

export function getCharacterById(id: string): CharacterTemplate | undefined {
  return CHARACTER_BY_ID.get(id);
}

// Personnages obtenables UNIQUEMENT via la Forge ou les Boss d'Événement —
// ne doivent jamais apparaître au gacha, sinon leur exclusivité n'a plus de sens.
export const GACHA_EXCLUDED_IDS = new Set([
  // Récompenses de recettes de Forge (lib/game/expeditions.ts)
  'vegeto', 'gogeta', 'aizen_t', 'yoriichi', 'brunhilde', 'chara', 'shanks',
  // Drops de boss d'événement (lib/game/eventBoss.ts)
  'jinwoo', 'arthur_leywin', 'cid_kagenou',
]);

export const BANNER_POOL = CHARACTER_POOL.filter(c => !c.isHero && !GACHA_EXCLUDED_IDS.has(c.id));

export function getCharFormName(tpl: CharacterTemplate, formIndex: number): string {
  if (!tpl.forms || tpl.forms.length === 0) return tpl.name;
  return tpl.forms[formIndex]?.name ?? tpl.name;
}

