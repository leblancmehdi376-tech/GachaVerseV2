import { CharacterTemplate, EvoForm } from '@/types/game';

// ── Stub héros (conservé pour compatibilité gameStore — Kael supprimé) ────
export const HERO_TEMPLATE: CharacterTemplate = {
  id: 'hero_main', name: 'Héros', rarity: 'L', baseDps: 1,
  spritePath: '/sprites/heroes/hero_main.png',
  description: 'Héros principal.', isHero: true, universe: 'Gacha Verse',
  forms: [
    { formId:'hero_base', name:'Héros', spritePath:'/sprites/heroes/hero_main.png', levelCap:100, dpsFormMult:1, description:'Forme de base.' },
  ] as EvoForm[],
};

// ── Helpers ────────────────────────────────────────────────────────────────
function c(id: string, name: string, rarity: CharacterTemplate['rarity'], baseDps: number, universe: string): CharacterTemplate {
  return { id, name, rarity, baseDps, universe, description: name, spritePath: `/sprites/allies/${id}.png` };
}
function ce(id: string, name: string, rarity: CharacterTemplate['rarity'], baseDps: number, universe: string, forms: EvoForm[]): CharacterTemplate {
  return { id, name, rarity, baseDps, universe, description: name, spritePath: `/sprites/allies/${id}.png`, forms };
}
function f(formId: string, name: string, id: string, levelCap: number, mult: number, requiredItemId?: string): EvoForm {
  const tag = formId.replace(`${id}_`, '');
  const sprite = tag === 'base' ? `/sprites/allies/${id}.png` : `/sprites/allies/${id}_${tag}.png`;
  return { formId, name, spritePath: sprite, levelCap, dpsFormMult: mult, description: name, requiredItemId };
}

// ══════════════════════════════════════════════════════════════════════════
export const CHARACTER_POOL: CharacterTemplate[] = [

  // ── COMMUNS ─────────────────────────────────────────────────────────────
  c('canarticho',  'Canarticho',      'C',  5,  'Pokémon'),
  c('cyborg',      'Cyborg',          'C',  6,  'Brotato'),
  c('slime',       'Slime',           'C',  5,  'Minecraft'),
  c('axolotl',     'Axolotl',         'C',  4,  'Minecraft'),
  c('garry_fish',  'Garry Fish',      'C',  5,  'Digital Circus'),
  c('birthday_boy','Birthday Boy',    'C',  4,  'R.E.P.O'),
  c('gummigoo',    'Gummigoo',        'C',  5,  'Digital Circus'),
  c('yamcha',      'Yamcha',          'C',  5,  'Dragon Ball Z'),
  c('korogu',      'Korogu Zelda',    'C',  4,  'The Legend of Zelda'),
  c('bangers',     'Bangers',         'C',  5,  'R.E.P.O'),
  c('bubba',       'Bubba Bubbaphant','C',  5,  'Poppy Playtime'),
  c('tentacool',   'Tentacool',       'C',  4,  'Pokémon'),
  c('chenipan',    'Chenipan',        'C',  3,  'Pokémon'),
  c('mr_popo',     'Mr Popo',         'C',  5,  'Dragon Ball Z'),

  // ── UNCOMMUNS ────────────────────────────────────────────────────────────
  c('prince_lars', 'Prince Lars',     'U', 14,  'The Legend of Zelda'),
  c('eugeo',       'Eugeo',           'U', 15,  'Sword Art Online'),
  c('angie',       'Angie',           'U', 14,  'Danganronpa'),
  c('gobuta',      'Gobuta',          'U', 16,  'Tensei Slime'),
  c('vogue_merry', 'Vogue Merry',     'U', 13,  'One Piece'),

  // ── RARES ────────────────────────────────────────────────────────────────
  ce('salamèche', 'Salamèche', 'R', 27, 'Pokémon', [
    f('salamèche_base', 'Salamèche',  'salamèche', 100, 1),
    f('salamèche_evo1', 'Reptincel',  'salamèche', 200, 3),
    f('salamèche_evo2', 'Dracaufeu',  'salamèche', 300, 8),
  ]),
  ce('carapuce', 'Carapuce', 'R', 26, 'Pokémon', [
    f('carapuce_base', 'Carapuce',  'carapuce', 100, 1),
    f('carapuce_evo1', 'Carabaffe', 'carapuce', 200, 3),
    f('carapuce_evo2', 'Tortank',   'carapuce', 300, 8),
  ]),
  ce('bulbizarre', 'Bulbizarre', 'R', 26, 'Pokémon', [
    f('bulbizarre_base', 'Bulbizarre', 'bulbizarre', 100, 1),
    f('bulbizarre_evo1', 'Herbizarre', 'bulbizarre', 200, 3),
    f('bulbizarre_evo2', 'Florizarre', 'bulbizarre', 300, 8),
  ]),
  c('kissy_missy', 'Kissy Missy',     'R', 22,  'Poppy Playtime'),
  ce('yuno', 'Yuno', 'R', 24, 'Black Clover', [
    f('yuno_base', 'Yuno',                  'yuno', 100, 1),
    f('yuno_evo1', 'Yuno — Esprit du Vent', 'yuno', 200, 4),
  ]),
  c('the_dress',   'The Dress',       'R', 23,  'R.E.P.O'),
  c('kirito',      'Kirito',          'R', 25,  'Sword Art Online'),

  // ── ÉPIQUES ─────────────────────────────────────────────────────────────
  c('arsene',           'Arsène',           'E',  76, 'Persona 5'),
  c('huggy_wuggy',      'Huggy Wuggy',      'E',  81, 'Poppy Playtime'),
  c('diablo',           'Diablo',           'E',  78, 'Tensei Slime'),
  c('reaper_leviathan', 'Reaper Leviathan', 'E',  92, 'Subnautica'),
  c('reinhardt',        'Reinhardt',        'E',  86, 'Overwatch'),

  // ── LÉGENDAIRES ──────────────────────────────────────────────────────────
  ce('sanji', 'Sanji', 'L', 227, 'One Piece', [
    f('sanji_base', 'Sanji',            'sanji', 100, 1),
    f('sanji_evo1', 'Sanji — Raid Suit','sanji', 200, 5),
  ]),
  ce('asta', 'Asta', 'L', 216, 'Black Clover', [
    f('asta_base', 'Asta',              'asta', 100, 1),
    f('asta_evo1', 'Asta — Démon Noir', 'asta', 200, 5),
  ]),
  c('taureau',     'Taureau',          'L', 211, 'R.E.P.O'),
  ce('kioraku', 'Kyoraku', 'L', 227, 'Bleach', [
    f('kioraku_base', 'Kyoraku',          'kioraku', 100, 1),
    f('kioraku_evo1', 'Kyoraku — Bankai', 'kioraku', 200, 5),
  ]),
  c('arthur_pandragon', 'Arthur Pandragon', 'L', 216, 'Fate'),
  ce('arthur_leywin', 'Arthur Leywin', 'P', 5837, 'Tbate', [
    f('arthur_leywin_base', 'Arthur Leywin',           'arthur_leywin', 100, 1),
    f('arthur_leywin_evo1', 'Arthur Leywin — Lame d’Éther', 'arthur_leywin', 200, 10,  'cristal_ether'),
    f('arthur_leywin_evo2', 'Arthur Leywin — Épée de l’Aube', 'arthur_leywin', 300, 112, 'epee_ether'),
    f('arthur_leywin_evo3', 'Arthur Leywin — Roi du Soleil',  'arthur_leywin', 400, 550, 'sylvia'),
  ]),
  ce('nagito_komaeda', 'Nagito Komaeda', 'L', 221, 'Danganronpa', [
    f('nagito_komaeda_base', 'Nagito Komaeda',         'nagito_komaeda', 100, 1),
    f('nagito_komaeda_evo1', 'Nagito — Espoir Ultime', 'nagito_komaeda', 200, 4.5),
  ]),
  c('chuuya',      'Chuuya',           'L', 232, 'Bungou Stray Dogs'),

  // ── MYTHIQUES ────────────────────────────────────────────────────────────
  ce('ren_m', 'Ren', 'M', 599, 'Persona 5', [
    f('ren_m_base', 'Ren',   'ren_m', 100, 1),
    f('ren_m_evo1', 'Joker', 'ren_m', 200, 7),
  ]),
  ce('ichigo', 'Ichigo', 'M', 640, 'Bleach', [
    f('ichigo_base', 'Ichigo',          'ichigo', 100, 1),
    f('ichigo_evo1', 'Ichigo — Bankai', 'ichigo', 200, 5.5),
    f('ichigo_evo2', 'Ichigo — Vasto',  'ichigo', 300, 17.5),
  ]),
  c('ouma',  'Kokichi Ouma', 'M', 1199, 'Danganronpa'),
  c('jax',   'Jax',          'M', 816, 'Digital Circus'),
  c('dazai', 'Dazai',        'M', 696, 'Bungou Stray Dogs'),

  // ── STELLAIRES ───────────────────────────────────────────────────────────
  ce('naruto', 'Naruto', 'S', 1972, 'Naruto', [
    f('naruto_base', 'Naruto',                 'naruto', 100, 1),
    f('naruto_evo1', 'Naruto — Mode Sage',     'naruto', 200, 5),
    f('naruto_evo2', 'Naruto — Chakra Kyuubi', 'naruto', 300, 18),
    f('naruto_evo3', 'Naruto — Mode Baryon',   'naruto', 400, 65),
  ]),
  ce('luffy', 'Luffy', 'CO', 6100, 'One Piece', [
    f('luffy_base', 'Luffy',          'luffy', 100, 1),
    f('luffy_evo1', 'Luffy — Gear 2', 'luffy', 200, 5),
    f('luffy_evo2', 'Luffy — Gear 4', 'luffy', 300, 18),
    f('luffy_evo3', 'Luffy — Gear 5', 'luffy', 400, 65),
  ]),

  // ── COSMIQUES ────────────────────────────────────────────────────────────
  ce('vegeta', 'Végéta', 'CO', 6105, 'Dragon Ball Z', [
    f('vegeta_base', 'Végéta',            'vegeta', 100, 1),
    f('vegeta_evo1', 'Végéta SS',         'vegeta', 200, 8),
    f('vegeta_evo2', 'Végéta SS Divin',   'vegeta', 300, 26),
    f('vegeta_evo3', 'Végéta SS Blue',    'vegeta', 400, 90),
  ]),
  ce('minato', 'Minato', 'S', 1950, 'Naruto', [
    f('minato_base', 'Minato',              'minato', 100, 1),
    f('minato_evo1', 'Minato — 4ème Hokage','minato', 200, 6.5),
  ]),
  ce('gilgamesh', 'Gilgamesh', 'CO', 6547, 'Fate', [
    f('gilgamesh_base', 'Gilgamesh',               'gilgamesh', 100, 1),
    f('gilgamesh_evo1', 'Gilgamesh — Roi des Héros','gilgamesh', 200, 9.5),
  ]),
  ce('link_midona', 'Link & Midona', 'CO', 5836, 'The Legend of Zelda', [
    f('link_midona_base', 'Link & Midona',                     'link_midona', 100, 1),
    f('link_midona_evo1', 'Link Loup & Midona',                'link_midona', 200, 7.5),
    f('link_midona_evo2', 'Link & Midona — Princesse Twili',   'link_midona', 300, 20),
  ]),
  ce('jinwoo', 'Sung Jin Woo', 'CO', 5949, 'Solo Leveling', [
    f('jinwoo_base', 'Sung Jin Woo',                     'jinwoo', 100, 1),
    f('jinwoo_evo1', 'Sung Jin Woo — Monarque Éveillé',  'jinwoo', 200, 7,  'elixir_vie'),
    f('jinwoo_evo2', 'Sung Jin Woo — Seigneur des Ombres','jinwoo', 300, 16, 'manteau_ombre'),
    f('jinwoo_evo3', 'Sung Jin Woo — Monarque des Ombres','jinwoo', 400, 50, 'beru'),
  ]),

  ce('cid_kagenou', 'Cid Kagenou', 'CO', 6981, 'The Eminence in Shadow', [
    f('cid_kagenou_base', 'Cid Kagenou', 'cid_kagenou', 100, 1),
    f('cid_kagenou_evo1', 'Shadow',      'cid_kagenou', 200, 7,  'masque_cid'),
    f('cid_kagenou_evo2', 'John Smith',  'cid_kagenou', 300, 16, 'epee_slime'),
  ]),

  // ── PRIMORDIAUX ──────────────────────────────────────────────────────────
  ce('goku', 'Goku', 'P', 10247, 'Dragon Ball Z', [
    f('goku_base', 'Goku',                'goku', 100,  1),
    f('goku_evo1', 'Goku Super Saiyen',   'goku', 200,  7),
    f('goku_evo2', 'Goku Super Saiyen 3', 'goku', 300,  38),
    f('goku_evo3', 'Goku SS Divin',       'goku', 400,  60),
    f('goku_evo4', 'Goku SS Blue',        'goku', 500,  100),
    f('goku_evo5', 'Goku Signe UI',       'goku', 600,  170),
    f('goku_evo6', 'Goku Ultra Instinct', 'goku', 700,  400),
  ]),
  ce('limule', 'Limule', 'P', 12197, 'Tensei Slime', [
    f('limule_base', 'Limule',            'limule', 100,  1),
    f('limule_evo1', 'Limule Évoluée',    'limule', 200,  7),
    f('limule_evo2', 'Limule Ancestrale', 'limule', 300, 65),
    f('limule_evo3', 'Limule Divine',     'limule', 400, 180),
  ]),

  // ── TRANSCENDANT ─────────────────────────────────────────────────────────
  ce('nekoz', 'NekoZ', 'T', 15525, 'Chill&Cool', [
    f('nekoz_base', 'NekoZ',             'nekoz', 100, 1),
    f('nekoz_evo1', 'NekoZ — Mode Divin','nekoz', 200, 11),
    f('nekoz_evo2', 'NekoZ — Transcendance Totale','nekoz', 300, 30),
  ]),


  // ══════════════════════════════════════════════════════════════════════════
  // BANNIÈRE V2 — Personnages exacts selon le document GachaVerse.yaml
  // ══════════════════════════════════════════════════════════════════════════

  // ── COMMUNS V2 ─────────────────────────────────────────────────────────
  c('violet_p5',         'Violet',               'C',  5,  'Persona 5'),
  c('zooble',            'Zooble',               'C',  5,  'Digital Circus'),
  c('bond',              'Bond',                 'C',  4,  'Spy x Family'),
  c('murata',            'Murata',               'C',  5,  'Demon Slayer'),
  c('grubs',             'Grubs',                'C',  5,  'League of Legends'),
  c('moris',             'Moris',                'C',  5,  'Nos Animaux'),
  c('corayon',           'Corayon',              'C',  5,  'Pokémon'),
  c('qwilfish',          'Qwilfish',             'C',  4,  'Pokémon'),
  c('queulorior',        'Queulorior',           'C',  5,  'Pokémon'),
  c('sombra_ow',         'Sombra',               'C',  6,  'Overwatch'),
  c('connie',            'Connie',               'C',  5,  'Attaque des Titans'),
  c('silverfish',        'SilverFish',           'C',  4,  'Minecraft'),
  c('spider_mc',         'Spider',               'C',  4,  'Minecraft'),
  c('cochon',            'Cochon',               'C',  4,  'Minecraft'),
  c('kiba',              'Kiba',                 'C',  5,  'Naruto'),
  c('caribou',           'Caribou',              'C',  5,  'One Piece'),
  c('wapol',             'Wapol',                'C',  5,  'One Piece'),
  c('mizuki_naruto',     'Mizuki',               'C',  5,  'Naruto'),
  c('oolong',            'Oolong',               'C',  4,  'Dragon Ball Z'),
  c('teuchi',            'Teuchi',               'C',  4,  'Naruto'),
  c('kasugaigarasu',     'Kasugaigarasu',        'C',  4,  'Demon Slayer'),
  c('ribby_croaks',      'Ribby & Croaks',       'C',  5,  'Cuphead'),
  c('sbire',             'Sbire',                'C',  4,  'League of Legends'),
  c('mr_satan',          'Mr Satan',             'C',  6,  'Dragon Ball Z'),

  // ── UNCOMMONS V2 ────────────────────────────────────────────────────────
  c('konohamaru',        'Konohamaru',           'U', 15,  'Naruto'),
  c('goron',             'Goron',                'U', 14,  'The Legend of Zelda'),
  c('repo_char',         'R.E.P.O',              'U', 15,  'R.E.P.O'),
  c('tracer',            'Tracer',               'U', 16,  'Overwatch'),
  c('lishu_ap',          'Lishu',                'U', 13,  "Les Carnets de l'Apothicaire"),
  c('xiaolan_ap',        'Xiaolan',              'U', 14,  "Les Carnets de l'Apothicaire"),
  c('kobeni',            'Kobeni',               'U', 14,  'Chainsaw Man'),
  c('haumea_ff',         'Haumea',               'U', 15,  'Fire Force'),
  c('riza',              'Riza',                 'U', 14,  'Fullmetal Alchemist Brotherhood'),
  c('twix',              'Twix',                 'U', 14,  'Nos Animaux'),
  c('zote',              'Zote',                 'U', 13,  'Hollow Knight'),
  c('jean_aot',          'Jean',                 'U', 15,  'Attaque des Titans'),
  c('mugman',            'Mugman',               'U', 14,  'Cuphead'),
  c('chica_fnaf',        'Chica',                'U', 15,  "Five Nights At Freddy's"),
  c('poulet',            'Poulet',               'U', 14,  'Minecraft'),
  c('tenten',            'Tenten',               'U', 15,  'Naruto'),
  c('hanataro',          'Yamada Hanatarô',      'U', 14,  'Bleach'),
  c('kon',               'Kon',                  'U', 14,  'Bleach'),
  c('don_kanonji',       'Don Kanonji',          'U', 15,  'Bleach'),
  c('silica',            'Silica',               'U', 14,  'Sword Art Online'),
  c('laboon',            'Laboon',               'U', 15,  'One Piece'),
  c('fantome',           'Fantome',              'U', 15,  'Brotato'),
  c('sisigou',           'Sisigou Kairi',        'U', 15,  'Fate'),
  c('melina',            'Melina',               'U', 15,  'Elden Ring'),

  // ── RARES V2 ────────────────────────────────────────────────────────────
  c('boa_hancock',       'Boa Hancock',          'R', 27,  'One Piece'),
  c('finral',            'Finral',               'R', 26,  'Black Clover'),
  c('enderman',          'Enderman',             'R', 26,  'Minecraft'),
  c('sabito',            'Sabito',               'R', 26,  'Demon Slayer'),
  c('k1bo',              'K1-BO',                'R', 26,  'Danganronpa'),
  c('yasutora_sado',     'Yasutora Sado',        'R', 27,  'Bleach'),

  // ── ÉPIQUES V2 ──────────────────────────────────────────────────────────
  c('catnap',            'CatNap',               'E', 76,  'Poppy Playtime'),
  c('warden',            'Warden',               'E', 81,  'Minecraft'),
  c('reaper_ow',         'Reaper',               'E', 78,  'Overwatch'),
  c('lihua_ap',          'Lihua',                'E', 70,  "Les Carnets de l'Apothicaire"),
  c('anya_spy',          'Anya',                 'E', 70,  'Spy x Family'),
  c('maitre_yi',         'Maître Yi',            'E', 76,  'League of Legends'),
  c('herald',            'Hérald',               'E', 78,  'League of Legends'),
  ce('loki_va', 'Loki', 'E', 78, 'Valkyrie Apocalypse', [
    f('loki_va_base',    'Loki',                 'loki_va',  100, 1),
    f('loki_va_god',     'Loki — Forme de Dieu', 'loki_va',  200, 4),
  ]),
  c('kirigiri',          'Kirigiri',             'E', 76,  'Danganronpa'),
  c('asriel_ut',         'Asriel',               'E', 78,  'Undertale'),
  c('bonny_fnaf',        'Bonny',                'E', 73,  "Five Nights At Freddy's"),
  c('panda_tekken',      'Panda',                'E', 70,  'Tekken'),
  ce('margith', 'Margith', 'E', 76, 'Elden Ring', [
    f('margith_base',    'Margith',              'margith', 100, 1),
    f('margith_p2',      'Margith P2',           'margith', 200, 5),
  ]),

  // ── LÉGENDAIRES V2 ──────────────────────────────────────────────────────
  ce('piccolo', 'Piccolo', 'L', 227, 'Dragon Ball Z', [
    f('piccolo_base',    'Piccolo',              'piccolo', 100, 1),
    f('piccolo_kami',    'Fusion avec Kami',     'piccolo', 200, 4),
    f('piccolo_orange',  'Orange Piccolo',       'piccolo', 300, 9),
  ]),
  ce('kakashi', 'Kakashi', 'L', 232, 'Naruto', [
    f('kakashi_base',    'Kakashi',              'kakashi', 100, 1),
    f('kakashi_sharingan','Sharingan',           'kakashi', 200, 4.5),
    f('kakashi_mangekyo','Mangekyo Sharingan',   'kakashi', 300, 10),
  ]),
  ce('aki_csm', 'Aki Hayakawa', 'L', 216, 'Chainsaw Man', [
    f('aki_csm_base',    'Aki Hayakawa',         'aki_csm', 100, 1),
    f('aki_csm_beast',   'Beast Devil',          'aki_csm', 200, 5),
  ]),
  ce('arthur_ff', 'Arthur', 'L', 227, 'Fire Force', [
    f('arthur_ff_base',  'Arthur',               'arthur_ff', 100, 1),
    f('arthur_ff_ima',   'Imagination',          'arthur_ff', 200, 5),
  ]),
  ce('alphonse', 'Alphonse', 'L', 227, 'Fullmetal Alchemist Brotherhood', [
    f('alphonse_base',   'Alphonse',             'alphonse', 100, 1),
    f('alphonse_armor',  'Armure',               'alphonse', 200, 5),
  ]),
  ce('karma_lol', 'Karma', 'L', 216, 'League of Legends', [
    f('karma_lol_base',  'Karma',                'karma_lol', 100, 1),
    f('karma_lol_6',     'Karma Level 6',        'karma_lol', 200, 5),
  ]),
  ce('jinx_lol', 'Jinx', 'L', 221, 'League of Legends', [
    f('jinx_lol_base',   'Jinx',                 'jinx_lol', 100, 1),
    f('jinx_lol_6',      'Jinx Level 6',         'jinx_lol', 200, 5),
  ]),
  c('igloo_na',          'Igloo',                'L', 205, 'Nos Animaux'),
  ce('thor_va', 'Thor', 'L', 238, 'Valkyrie Apocalypse', [
    f('thor_va_base',    'Thor',                 'thor_va', 100, 1),
    f('thor_va_god',     'Thor — Forme de Dieu', 'thor_va', 200, 5),
  ]),
  ce('mikasa', 'Mikasa', 'L', 216, 'Attaque des Titans', [
    f('mikasa_base',     'Mikasa',               'mikasa', 100, 1),
    f('mikasa_batail',   "Bataillon d'Exploration",'mikasa', 200, 5),
  ]),
  c('cuphead_char',      'Cuphead',              'L', 211, 'Cuphead'),
  c('emiya_kiri',        'Emiya Kiritsugu',      'L', 216, 'Fate'),
  ce('flowey_ut', 'Flowey', 'L', 238, 'Undertale', [
    f('flowey_ut_base',  'Flowey',               'flowey_ut', 100, 1),
    f('flowey_ut_omega', 'Omega Flowey',         'flowey_ut', 200, 5),
  ]),
  ce('godrick_er', 'Godrick', 'L', 216, 'Elden Ring', [
    f('godrick_er_base', 'Godrick',              'godrick_er', 100, 1),
    f('godrick_er_p2',   'Godrick P2',           'godrick_er', 200, 5),
  ]),

  // ── MYTHIQUES V2 ────────────────────────────────────────────────────────
  ce('trunks', 'Trunks', 'M', 594, 'Dragon Ball Z', [
    f('trunks_base',     'Trunks',               'trunks', 100, 1),
    f('trunks_ss',       'Super Saiyan',         'trunks', 200, 5.5),
    f('trunks_ss2',      'Super Saiyan 2',       'trunks', 300, 13),
  ]),
  ce('explorer', 'Explorer', 'M', 540, 'Brotato', [
    f('explorer_base',   'Explorer',             'explorer', 100, 1),
    f('explorer_tree',   'Explorer — With Tree', 'explorer', 200, 5),
  ]),
  ce('sea_emperor', 'Sea Emperor', 'M', 626, 'Subnautica', [
    f('sea_emperor_base','Sea Emperor',          'sea_emperor', 100, 1),
    f('sea_emperor_adult','Sea Emperor Adulte',  'sea_emperor', 200, 5.5),
  ]),
  c('zelda_char',        'Zelda',                'M', 583, 'The Legend of Zelda'),
  ce('clown_repo', 'Clown', 'M', 562, 'R.E.P.O', [
    f('clown_repo_base', 'Clown',                'clown_repo', 100, 1),
    f('clown_repo_laser','Clown — Laser',        'clown_repo', 200, 5),
  ]),
  ce('asuna', 'Asuna', 'M', 605, 'Sword Art Online', [
    f('asuna_base',      'Asuna',                'asuna', 100, 1),
    f('asuna_elfe',      "Armure de l'Elfe",     'asuna', 200, 5),
    f('asuna_cheat',     'Cheat Activate',       'asuna', 300, 12),
  ]),
  ce('power_csm', 'Power', 'M', 594, 'Chainsaw Man', [
    f('power_csm_base',  'Power',                'power_csm', 100, 1),
    f('power_csm_blood', 'Blood Devil',          'power_csm', 200, 5.5),
  ]),
  ce('yor', 'Yor', 'M', 605, 'Spy x Family', [
    f('yor_base',        'Yor Forger',           'yor', 100, 1),
    f('yor_assassin',    'Assassin',             'yor', 200, 5.5),
  ]),
  ce('nezuko', 'Nezuko', 'M', 583, 'Demon Slayer', [
    f('nezuko_base',     'Nezuko',               'nezuko', 100, 1),
    f('nezuko_demon',    'Forme Démoniaque',     'nezuko', 200, 5.5),
  ]),
  ce('zenitsu', 'Zenitsu', 'M', 464, 'Demon Slayer', [
    f('zenitsu_base',    'Zenitsu',              'zenitsu', 100, 1),
    f('zenitsu_maquille','Zenitsu Maquillé',     'zenitsu', 200, 5),
    f('zenitsu_marque',  'Zenitsu — Marque',     'zenitsu', 300, 12),
  ]),
  ce('jinshi_ap', 'Jinshi', 'M', 551, "Les Carnets de l'Apothicaire", [
    f('jinshi_ap_base',  'Jinshi',               'jinshi_ap', 100, 1),
    f('jinshi_ap_jade',  'Armure de Jade',       'jinshi_ap', 200, 5),
  ]),
  c('adam_va',           'Adam',                 'M', 648, 'Valkyrie Apocalypse'),
  ce('hornet_hk', 'Hornet', 'M', 583, 'Hollow Knight', [
    f('hornet_hk_base',  'Hornet',               'hornet_hk', 100, 1),
    f('hornet_hk_needle',"Forme de l'Aiguille",  'hornet_hk', 200, 5),
  ]),
  ce('claudio', 'Claudio', 'M', 605, 'Tekken', [
    f('claudio_base',    'Claudio',              'claudio', 100, 1),
    f('claudio_burst',   'Claudio — Burst',      'claudio', 200, 5.5),
  ]),
  c('celeste_drp',       'Celeste',              'M', 562, 'Danganronpa'),

  // ── STELLAIRES V2 ───────────────────────────────────────────────────────
  ce('zoro', 'Zoro', 'S', 1612, 'One Piece', [
    f('zoro_base',       'Zoro',                 'zoro', 100, 1),
    f('zoro_eclipse',    'Post Éclipse',         'zoro', 200, 6.5),
    f('zoro_wano',       'Post Wano',            'zoro', 300, 17),
  ]),
  ce('madara', 'Madara', 'S', 1620, 'Naruto', [
    f('madara_base',     'Madara',               'madara', 100, 1),
    f('madara_rinnegan', 'Rinnegan',             'madara', 200, 4.5),
    f('madara_susanoo',  'Susanoo',              'madara', 300, 12),
  ]),
  ce('millim', 'Millim', 'S', 1512, 'Slime Datta Ken', [
    f('millim_base',     'Millim',               'millim', 100, 1),
    f('millim_slime',    'Millim — Slime',       'millim', 200, 5),
  ]),
  ce('byakuya', 'Byakuya', 'S', 1620, 'Bleach', [
    f('byakuya_base',    'Byakuya',              'byakuya', 100, 1),
    f('byakuya_shikai',  'Shikai',               'byakuya', 200, 4),
    f('byakuya_bankai',  'Bankai',               'byakuya', 300, 10),
  ]),
  ce('richard_coeur', 'Richard Cœur de Lion', 'S', 1512, 'Fate', [
    f('richard_coeur_base','Richard Cœur de Lion','richard_coeur', 100, 1),
    f('richard_coeur_armor','Armure de Lion',    'richard_coeur', 200, 5),
  ]),
  ce('ganondorf_char', 'Ganondorf', 'S', 1728, 'The Legend of Zelda', [
    f('ganondorf_char_base','Ganondorf',         'ganondorf_char', 100, 1),
    f('ganondorf_char_hum','Forme Humaine',      'ganondorf_char', 200, 4),
    f('ganondorf_char_dem','Forme Démoniaque',   'ganondorf_char', 300, 11),
  ]),
  ce('pomni', 'Pomni', 'S', 1458, 'Digital Circus', [
    f('pomni_base',      'Pomni',                'pomni', 100, 1),
    f('pomni_prime',     'Pomni — Prime',        'pomni', 200, 6),
  ]),
  ce('alice_sao', 'Alice', 'S', 1666, 'Sword Art Online', [
    f('alice_sao_base',  'Alice',                'alice_sao', 100, 1),
    f('alice_sao_armor', 'Armure Légendaire',    'alice_sao', 200, 6.5),
    f('alice_sao_max',   'Puissance Maximale',   'alice_sao', 300, 20),
  ]),
  ce('atsushi',           'Atsushi',              'S', 1470, 'Bungou Stray Dogs', [
    f('atsushi_base', 'Atsushi', 'atsushi', 100, 1),
    f('atsushi_evo1', 'Atsushi — Bête', 'atsushi', 200, 7.5),
  ]),
  ce('mao_mao_ap', 'Mao Mao', 'S', 1590, "Les Carnets de l'Apothicaire", [
    f('mao_mao_ap_base', 'Mao Mao',             'mao_mao_ap', 100, 1),
    f('mao_mao_ap_maqui','Maquillage',          'mao_mao_ap', 200, 7),
  ]),
  ce('denji', 'Denji', 'S', 1640, 'Chainsaw Man', [
    f('denji_base',      'Denji',                'denji', 100, 1),
    f('denji_pochita',   'Pochita',              'denji', 200, 4.5),
    f('denji_chainsaw',  'Chainsaw Devil',       'denji', 300, 13.5),
  ]),
  ce('loid', 'Loid Forger', 'S', 1534, 'Spy x Family', [
    f('loid_base',       'Loid Forger',          'loid', 100, 1),
    f('loid_espion',     'Espion',               'loid', 200, 5),
  ]),
  ce('tanjiro', 'Tanjiro', 'S', 1620, 'Demon Slayer', [
    f('tanjiro_base',    'Tanjiro',              'tanjiro', 100, 1),
    f('tanjiro_eau',     "Forme de l'Eau",       'tanjiro', 200, 4.5),
    f('tanjiro_feu',     'Forme du Feu',         'tanjiro', 300, 13),
  ]),
  ce('edward', 'Edward', 'S', 1566, 'Fullmetal Alchemist Brotherhood', [
    f('edward_base',     'Edward',               'edward', 100, 1),
    f('edward_alchi',    'Alchimiste',           'edward', 200, 4.5),
    f('edward_automail', 'Automail',             'edward', 300, 12),
  ]),
  ce('roy', 'Roy Mustang', 'S', 1512, 'Fullmetal Alchemist Brotherhood', [
    f('roy_base',        'Roy Mustang',          'roy', 100, 1),
    f('roy_flame',       'Flame Alchemist',      'roy', 200, 5),
  ]),
  ce('horus_na', 'Horus', 'S', 1512, 'Nos Animaux', [
    f('horus_na_base',   'Horus',                'horus_na', 100, 1),
    f('horus_na_celeste','Forme Céleste',        'horus_na', 200, 5),
  ]),
  ce('livai', 'Livai', 'S', 1728, 'Attaque des Titans', [
    f('livai_base',      'Livai',                'livai', 100, 1),
    f('livai_caporal',   'Caporal',              'livai', 200, 5.5),
  ]),
  ce('freddy_fnaf', 'Freddy', 'S', 1512, "Five Nights At Freddy's", [
    f('freddy_fnaf_base','Freddy Fazbear',       'freddy_fnaf', 100, 1),
    f('freddy_fnaf_toy', 'Freddy Toy',           'freddy_fnaf', 200, 4.5),
    f('freddy_fnaf_gold','Freddy Golden',        'freddy_fnaf', 300, 11),
  ]),
  ce('sans_ut', 'Sans', 'S', 1836, 'Undertale', [
    f('sans_ut_base',    'Sans',                 'sans_ut', 100, 1),
    f('sans_ut_genocide','Sans — Mode Génocide', 'sans_ut', 200, 6),
  ]),
  ce('pichu', 'Pichu', 'S', 1458, 'Pokémon', [
    f('pichu_base',      'Pichu',                'pichu', 100, 1),
    f('pichu_pikachu',   'Pikachu',              'pichu', 200, 3.5),
    f('pichu_raichu',    'Raichu',               'pichu', 300, 8),
    f('pichu_mega',      'Méga Raichu',          'pichu', 400, 45),
  ]),

  // ── COSMIQUES V2 ────────────────────────────────────────────────────────
  ce('yami', 'Yami', 'CO', 6210, 'Black Clover', [
    f('yami_base',       'Yami',                 'yami', 100, 1),
    f('yami_adult',      'Yami Adulte',          'yami', 200, 7),
    f('yami_slash',      'Dimensional Slash',    'yami', 300, 28),
  ]),
  ce('aizen', 'Aizen', 'CO', 6831, 'Bleach', [
    f('aizen_base',      'Aizen',                'aizen', 100, 1),
    f('aizen_shikai',    'Aizen Shikai',         'aizen', 200, 6),
    f('aizen_bankai',    'Aizen Bankai',         'aizen', 300, 19),
    f('aizen_hogyoku',   'Aizen Hogyoku',        'aizen', 400, 60),
  ]),
  ce('shinra', 'Shinra', 'CO', 6210, 'Fire Force', [
    f('shinra_base',     'Shinra',               'shinra', 100, 1),
    f('shinra_8e',       '8ème Brigade',         'shinra', 200, 7),
    f('shinra_adora',    'Adora Burst',          'shinra', 300, 30),
  ]),
  ce('jin_tekken', 'Jin Kazama', 'CO', 6458, 'Tekken', [
    f('jin_tekken_base', 'Jin Kazama',           'jin_tekken', 100, 1),
    f('jin_tekken_evil', 'Jin — Evil',           'jin_tekken', 200, 9.5),
    f('jin_tekken_devil', 'Devil Jin',           'jin_tekken', 300, 26),
  ]),
  ce('zorua', 'Zorua', 'CO', 6831, 'Pokémon', [
    f('zorua_base',      'Zorua',                'zorua', 100, 1),
    f('zorua_hisui',     "Zorua d'Hisui",        'zorua', 200, 5),
    f('zorua_zoroark',   'Zoroark',              'zorua', 300, 17),
    f('zorua_hisui2',    "Zoroark d'Hisui",      'zorua', 400, 55),
  ]),
  ce('brume', 'Brume', 'P', 6547, 'Nos Animaux', [
    f('brume_base',      'Brume',                'brume', 100, 1),
    f('brume_sacree',    'Brume Sacrée',         'brume', 200, 7),
    f('brume_ultime',    'Brume Ultime',         'brume', 300, 31),
  ]),

  // ── PRIMORDIAUX V2 ──────────────────────────────────────────────────────
  ce('steve', 'Steve', 'P', 9138, 'Minecraft', [
    f('steve_base',      'Steve',                'steve', 100, 1),
    f('steve_diamond',   'Armure en Diamant',    'steve', 200, 8),
    f('steve_netherite', 'Armure en Netherite',  'steve', 300, 22),
  ]),
  ce('dva', 'D.Va', 'P', 9237, 'Overwatch', [
    f('dva_base',        'D.Va',                 'dva', 100, 1),
    f('dva_mech',        'D.Va — Mech',          'dva', 200, 8.5),
  ]),
  ce('benimaru', 'Benimaru', 'P', 9237, 'Fire Force', [
    f('benimaru_base',   'Benimaru',             'benimaru', 100, 1),
    f('benimaru_prime',  'Benimaru — Prime',     'benimaru', 200, 14),
  ]),
  ce('aatrox_lol', 'Aatrox', 'P', 9337, 'League of Legends', [
    f('aatrox_lol_base', 'Aatrox',              'aatrox_lol', 100, 1),
    f('aatrox_lol_6',    'Aatrox Level 6',      'aatrox_lol', 200, 7),
    f('aatrox_lol_20',   'Aatrox Level 20',     'aatrox_lol', 300, 20),
  ]),
  ce('the_knight', 'The Knight', 'P', 9138, 'Hollow Knight', [
    f('the_knight_base', 'The Knight',          'the_knight', 100, 1),
    f('the_knight_lvl1', 'Aiguillon Lvl 1',     'the_knight', 200, 7),
    f('the_knight_lvl2', 'Aiguillon Lvl 2',     'the_knight', 300, 18),
    f('the_knight_lvl3', 'Aiguillon Lvl 3',     'the_knight', 400, 50),
  ]),
  ce('eren', 'Eren', 'P', 9237, 'Attaque des Titans', [
    f('eren_base',       'Eren',                 'eren', 100, 1),
    f('eren_adult',      'Eren Adulte',          'eren', 200, 7),
    f('eren_assaillant', 'Titan Assaillant',     'eren', 300, 20),
    f('eren_originel',   'Titan Originel',       'eren', 400, 55),
  ]),
  ce('rayquaza', 'Rayquaza', 'P', 9337, 'Pokémon', [
    f('rayquaza_base',      'Rayquaza',                    'rayquaza', 100, 1),
    f('rayquaza_mega',      'Méga Rayquaza',               'rayquaza', 200, 15),
    f('rayquaza_ascension', 'Rayquaza — Ascension Céleste','rayquaza', 300, 32),
  ]),
  ce('ouchuu', 'Ouchuu', 'P', 9138, "Chill&Cool", [
    f('ouchuu_base',     'Ouchuu',               'ouchuu', 100, 1),
    f('ouchuu_dep',      'Ouchuu Dépression Max','ouchuu', 200, 10),
  ]),

  // ── TRANSCENDANTS V2 ────────────────────────────────────────────────────
  ce('qin_shi_huang', 'Qin Shi Huang', 'T', 59616, 'Valkyrie Apocalypse', [
    f('qin_shi_base',    'Qin Shi Huang',        'qin_shi_huang', 100, 1),
    f('qin_shi_roi',     'Roi de Chine',         'qin_shi_huang', 200, 10),
    f('qin_shi_immortel','Empereur Immortel',    'qin_shi_huang', 300, 35),
  ]),

  // ══════════════════════════════════════════════════════════════════════════
  // PERSONNAGES CRAFTABLES — Obtenus uniquement via la Forge
  // ══════════════════════════════════════════════════════════════════════════
  ce('vegeto', 'Végéto', 'P', 9533, 'Dragon Ball Z', [
    f('vegeto_base',     'Végéto',               'vegeto', 100, 1),
    f('vegeto_ss',       'Végéto Super Saiyen',  'vegeto', 200, 6),
    f('vegeto_ssblue',   'Végéto SS Blue',       'vegeto', 300, 18),
  ]),
  ce('gogeta', 'Gogeta', 'P', 9434, 'Dragon Ball Z', [
    f('gogeta_base',     'Gogeta',               'gogeta', 100, 1),
    f('gogeta_ss',       'Gogeta Super Saiyen',  'gogeta', 200, 6),
    f('gogeta_ssblue',   'Gogeta SS Blue',       'gogeta', 300, 17),
  ]),
  ce('aizen_t', 'Aizen Transcendant', 'P', 12900, 'Bleach', [
    f('aizen_t_base',    'Aizen Transcendant',   'aizen_t', 100, 1),
    f('aizen_t_fusion',  'Fusion Complète',      'aizen_t', 200, 10),
  ]),
  ce('yoriichi', 'Yoriichi Tsugikuni', 'P', 8570, 'Demon Slayer', [
    f('yoriichi_base',   'Yoriichi',             'yoriichi', 100, 1),
    f('yoriichi_sun',    'Danse du Soleil',      'yoriichi', 200, 11),
  ]),
  c('brunhilde',   'Brunhilde',                  'P', 8297, 'Valkyrie Apocalypse'),
  ce('chara', 'Chara', 'P', 12701, 'Undertale', [
    f('chara_base',      'Chara',                'chara', 100, 1),
    f('chara_genocide',  'Route Génocide',       'chara', 200, 10),
  ]),
  ce('shanks', 'Shanks le Roux', 'T', 74520, 'One Piece', [
    f('shanks_base',      'Shanks le Roux',      'shanks', 100, 1),
    f('shanks_conqueror', 'Haki du Conquérant',  'shanks', 200, 10),
    f('shanks_god',       'Dieu du Haki',        'shanks', 300, 28),
    f('shanks_pirateking','Roi des Pirates',     'shanks', 400, 75),
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
const GACHA_EXCLUDED_IDS = new Set([
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

export function getCharSprite(tpl: CharacterTemplate, formIndex: number): string {
  if (!tpl.forms || tpl.forms.length === 0) return tpl.spritePath;
  return tpl.forms[formIndex]?.spritePath ?? tpl.spritePath;
}