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
    f('salamèche_base', 'Salamèche',  'salamèche', 100, 1),
    f('salamèche_evo1', 'Reptincel',  'salamèche', 200, 3),
    f('salamèche_evo2', 'Dracaufeu',  'salamèche', 300, 8),
  ]),
  ce('carapuce', 'Carapuce', 'R', 32, 'Pokémon', [
    f('carapuce_base', 'Carapuce',  'carapuce', 100, 1),
    f('carapuce_evo1', 'Carabaffe', 'carapuce', 200, 3),
    f('carapuce_evo2', 'Tortank',   'carapuce', 300, 8),
  ]),
  ce('bulbizarre', 'Bulbizarre', 'R', 27, 'Pokémon', [
    f('bulbizarre_base', 'Bulbizarre', 'bulbizarre', 100, 1),
    f('bulbizarre_evo1', 'Herbizarre', 'bulbizarre', 200, 3),
    f('bulbizarre_evo2', 'Florizarre', 'bulbizarre', 300, 8),
  ]),
  c('kissy_missy', 'Kissy Missy',     'R', 27,  'Poppy Playtime'),
  ce('yuno', 'Yuno', 'R', 30, 'Black Clover', [
    f('yuno_base', 'Yuno',                  'yuno', 100, 1),
    f('yuno_evo1', 'Yuno — Esprit du Vent', 'yuno', 200, 4),
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
    f('sanji_base', 'Sanji',            'sanji', 100, 1),
    f('sanji_evo1', 'Sanji — Raid Suit','sanji', 200, 5),
  ]),
  ce('asta', 'Asta', 'L', 47, 'Black Clover', [
    f('asta_base', 'Asta',              'asta', 100, 1),
    f('asta_evo1', 'Asta — Démon Noir', 'asta', 200, 5),
  ]),
  c('taureau',     'Taureau',          'L', 51, 'R.E.P.O'),
  ce('kioraku', 'Kyoraku', 'L', 48, 'Bleach', [
    f('kioraku_base', 'Kyoraku',          'kioraku', 100, 1),
    f('kioraku_evo1', 'Kyoraku — Bankai', 'kioraku', 200, 5),
  ]),
  c('arthur_pandragon', 'Arthur Pandragon', 'L', 50, 'Fate'),
  ce('arthur_leywin', 'Arthur Leywin', 'P', 91, 'Tbate', [
    f('arthur_leywin_base', 'Arthur Leywin',           'arthur_leywin', 100, 1),
    f('arthur_leywin_evo1', 'Arthur Leywin — Lame d’Éther', 'arthur_leywin', 200, 10,  'cristal_ether'),
    f('arthur_leywin_evo2', 'Arthur Leywin — Épée de l’Aube', 'arthur_leywin', 300, 112, 'epee_ether'),
    f('arthur_leywin_evo3', 'Arthur Leywin — Roi du Soleil',  'arthur_leywin', 400, 550, 'sylvia'),
  ]),
  ce('nagito_komaeda', 'Nagito Komaeda', 'L', 48, 'Danganronpa', [
    f('nagito_komaeda_base', 'Nagito Komaeda',         'nagito_komaeda', 100, 1),
    f('nagito_komaeda_evo1', 'Nagito — Espoir Ultime', 'nagito_komaeda', 200, 4.5),
  ]),
  c('chuuya',      'Chuuya',           'L', 53, 'Bungou Stray Dogs'),

  // ── MYTHIQUES ────────────────────────────────────────────────────────────
  ce('ren_m', 'Ren', 'M', 63, 'Persona 5', [
    f('ren_m_base', 'Ren',   'ren_m', 100, 1),
    f('ren_m_evo1', 'Joker', 'ren_m', 200, 7),
  ]),
  ce('ichigo', 'Ichigo', 'M', 58, 'Bleach', [
    f('ichigo_base', 'Ichigo',          'ichigo', 100, 1),
    f('ichigo_evo1', 'Ichigo — Bankai', 'ichigo', 200, 5.5),
    f('ichigo_evo2', 'Ichigo — Vasto',  'ichigo', 300, 17.5),
  ]),
  c('ouma',  'Kokichi Ouma', 'M', 62, 'Danganronpa'),
  c('jax',   'Jax',          'M', 61, 'Digital Circus'),
  c('dazai', 'Dazai',        'M', 58, 'Bungou Stray Dogs'),

  // ── STELLAIRES ───────────────────────────────────────────────────────────
  ce('naruto', 'Naruto', 'S', 70, 'Naruto', [
    f('naruto_base', 'Naruto',                 'naruto', 100, 1),
    f('naruto_evo1', 'Naruto — Mode Sage',     'naruto', 200, 5),
    f('naruto_evo2', 'Naruto — Chakra Kyuubi', 'naruto', 300, 18),
    f('naruto_evo3', 'Naruto — Mode Baryon',   'naruto', 400, 65),
  ]),
  ce('luffy', 'Luffy', 'CO', 81, 'One Piece', [
    f('luffy_base', 'Luffy',          'luffy', 100, 1),
    f('luffy_evo1', 'Luffy — Gear 2', 'luffy', 200, 5),
    f('luffy_evo2', 'Luffy — Gear 4', 'luffy', 300, 18),
    f('luffy_evo3', 'Luffy — Gear 5', 'luffy', 400, 65),
  ]),

  // ── COSMIQUES ────────────────────────────────────────────────────────────
  ce('vegeta', 'Végéta', 'CO', 83, 'Dragon Ball Z', [
    f('vegeta_base', 'Végéta',            'vegeta', 100, 1),
    f('vegeta_evo1', 'Végéta SS',         'vegeta', 200, 8),
    f('vegeta_evo2', 'Végéta SS Divin',   'vegeta', 300, 26),
    f('vegeta_evo3', 'Végéta SS Blue',    'vegeta', 400, 90),
  ]),
  ce('minato', 'Minato', 'S', 73, 'Naruto', [
    f('minato_base', 'Minato',              'minato', 100, 1),
    f('minato_evo1', 'Minato — 4ème Hokage','minato', 200, 6.5),
  ]),
  ce('gilgamesh', 'Gilgamesh', 'CO', 77, 'Fate', [
    f('gilgamesh_base', 'Gilgamesh',               'gilgamesh', 100, 1),
    f('gilgamesh_evo1', 'Gilgamesh — Roi des Héros','gilgamesh', 200, 9.5),
  ]),
  ce('link_midona', 'Link & Midona', 'CO', 80, 'The Legend of Zelda', [
    f('link_midona_base', 'Link & Midona',                     'link_midona', 100, 1),
    f('link_midona_evo1', 'Link Loup & Midona',                'link_midona', 200, 7.5),
    f('link_midona_evo2', 'Link & Midona — Princesse Twili',   'link_midona', 300, 20),
  ]),
  ce('jinwoo', 'Sung Jin Woo', 'CO', 77, 'Solo Leveling', [
    f('jinwoo_base', 'Sung Jin Woo',                     'jinwoo', 100, 1),
    f('jinwoo_evo1', 'Sung Jin Woo — Monarque Éveillé',  'jinwoo', 200, 7,  'elixir_vie'),
    f('jinwoo_evo2', 'Sung Jin Woo — Seigneur des Ombres','jinwoo', 300, 16, 'manteau_ombre'),
    f('jinwoo_evo3', 'Sung Jin Woo — Monarque des Ombres','jinwoo', 400, 50, 'beru'),
  ]),

  ce('cid_kagenou', 'Cid Kagenou', 'CO', 83, 'The Eminence in Shadow', [
    f('cid_kagenou_base', 'Cid Kagenou', 'cid_kagenou', 100, 1),
    f('cid_kagenou_evo1', 'Shadow',      'cid_kagenou', 200, 7,  'masque_cid'),
    f('cid_kagenou_evo2', 'John Smith',  'cid_kagenou', 300, 16, 'epee_slime'),
  ]),

  // ── PRIMORDIAUX ──────────────────────────────────────────────────────────
  ce('goku', 'Goku', 'P', 87, 'Dragon Ball Z', [
    f('goku_base', 'Goku',                'goku', 100,  1),
    f('goku_evo1', 'Goku Super Saiyen',   'goku', 200,  7),
    f('goku_evo2', 'Goku Super Saiyen 3', 'goku', 300,  38),
    f('goku_evo3', 'Goku SS Divin',       'goku', 400,  60),
    f('goku_evo4', 'Goku SS Blue',        'goku', 500,  100),
    f('goku_evo5', 'Goku Signe UI',       'goku', 600,  170),
    f('goku_evo6', 'Goku Ultra Instinct', 'goku', 700,  400),
  ]),
  ce('limule', 'Limule', 'P', 93, 'Tensei Slime', [
    f('limule_base', 'Limule',            'limule', 100,  1),
    f('limule_evo1', 'Limule Évoluée',    'limule', 200,  7),
    f('limule_evo2', 'Limule Ancestrale', 'limule', 300, 65),
    f('limule_evo3', 'Limule Divine',     'limule', 400, 180),
  ]),

  // ── TRANSCENDANT ─────────────────────────────────────────────────────────
  ce('nekoz', 'NekoZ', 'T', 102, 'Chill&Cool', [
    f('nekoz_base', 'NekoZ',             'nekoz', 100, 1),
    f('nekoz_evo1', 'NekoZ — Mode Divin','nekoz', 200, 11),
    f('nekoz_evo2', 'NekoZ — Transcendance Totale','nekoz', 300, 30),
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
    f('loki_va_base',    'Loki',                 'loki_va',  100, 1),
    f('loki_va_god',     'Loki — Forme de Dieu', 'loki_va',  200, 4),
  ]),
  c('kirigiri',          'Kirigiri',             'E', 42,  'Danganronpa'),
  c('asriel_ut',         'Asriel',               'E', 41,  'Undertale'),
  c('bonny_fnaf',        'Bonny',                'E', 42,  "Five Nights At Freddy's"),
  c('panda_tekken',      'Panda',                'E', 43,  'Tekken'),
  ce('margith', 'Margith', 'E', 39, 'Elden Ring', [
    f('margith_base',    'Margith',              'margith', 100, 1),
    f('margith_p2',      'Margith P2',           'margith', 200, 5),
  ]),

  // ── LÉGENDAIRES V2 ──────────────────────────────────────────────────────
  ce('piccolo', 'Piccolo', 'L', 53, 'Dragon Ball Z', [
    f('piccolo_base',    'Piccolo',              'piccolo', 100, 1),
    f('piccolo_kami',    'Fusion avec Kami',     'piccolo', 200, 4),
    f('piccolo_orange',  'Orange Piccolo',       'piccolo', 300, 9),
  ]),
  ce('kakashi', 'Kakashi', 'L', 47, 'Naruto', [
    f('kakashi_base',    'Kakashi',              'kakashi', 100, 1),
    f('kakashi_sharingan','Sharingan',           'kakashi', 200, 4.5),
    f('kakashi_mangekyo','Mangekyo Sharingan',   'kakashi', 300, 10),
  ]),
  ce('aki_csm', 'Aki Hayakawa', 'L', 50, 'Chainsaw Man', [
    f('aki_csm_base',    'Aki Hayakawa',         'aki_csm', 100, 1),
    f('aki_csm_beast',   'Beast Devil',          'aki_csm', 200, 5),
  ]),
  ce('arthur_ff', 'Arthur', 'L', 51, 'Fire Force', [
    f('arthur_ff_base',  'Arthur',               'arthur_ff', 100, 1),
    f('arthur_ff_ima',   'Imagination',          'arthur_ff', 200, 5),
  ]),
  ce('alphonse', 'Alphonse', 'L', 48, 'Fullmetal Alchemist Brotherhood', [
    f('alphonse_base',   'Alphonse',             'alphonse', 100, 1),
    f('alphonse_armor',  'Armure',               'alphonse', 200, 5),
  ]),
  ce('karma_lol', 'Karma', 'L', 48, 'League of Legends', [
    f('karma_lol_base',  'Karma',                'karma_lol', 100, 1),
    f('karma_lol_6',     'Karma Level 6',        'karma_lol', 200, 5),
  ]),
  ce('jinx_lol', 'Jinx', 'L', 51, 'League of Legends', [
    f('jinx_lol_base',   'Jinx',                 'jinx_lol', 100, 1),
    f('jinx_lol_6',      'Jinx Level 6',         'jinx_lol', 200, 5),
  ]),
  c('igloo_na',          'Igloo',                'L', 52, 'Nos Animaux'),
  ce('thor_va', 'Thor', 'L', 53, 'Valkyrie Apocalypse', [
    f('thor_va_base',    'Thor',                 'thor_va', 100, 1),
    f('thor_va_god',     'Thor — Forme de Dieu', 'thor_va', 200, 5),
  ]),
  ce('mikasa', 'Mikasa', 'L', 50, 'Attaque des Titans', [
    f('mikasa_base',     'Mikasa',               'mikasa', 100, 1),
    f('mikasa_batail',   "Bataillon d'Exploration",'mikasa', 200, 5),
  ]),
  c('cuphead_char',      'Cuphead',              'L', 52, 'Cuphead'),
  c('emiya_kiri',        'Emiya Kiritsugu',      'L', 47, 'Fate'),
  ce('flowey_ut', 'Flowey', 'L', 49, 'Undertale', [
    f('flowey_ut_base',  'Flowey',               'flowey_ut', 100, 1),
    f('flowey_ut_omega', 'Omega Flowey',         'flowey_ut', 200, 5),
  ]),
  ce('godrick_er', 'Godrick', 'L', 53, 'Elden Ring', [
    f('godrick_er_base', 'Godrick',              'godrick_er', 100, 1),
    f('godrick_er_p2',   'Godrick P2',           'godrick_er', 200, 5),
  ]),

  // ── MYTHIQUES V2 ────────────────────────────────────────────────────────
  ce('trunks', 'Trunks', 'M', 62, 'Dragon Ball Z', [
    f('trunks_base',     'Trunks',               'trunks', 100, 1),
    f('trunks_ss',       'Super Saiyan',         'trunks', 200, 5.5),
    f('trunks_ss2',      'Super Saiyan 2',       'trunks', 300, 13),
  ]),
  ce('explorer', 'Explorer', 'M', 61, 'Brotato', [
    f('explorer_base',   'Explorer',             'explorer', 100, 1),
    f('explorer_tree',   'Explorer — With Tree', 'explorer', 200, 5),
  ]),
  ce('sea_emperor', 'Sea Emperor', 'M', 62, 'Subnautica', [
    f('sea_emperor_base','Sea Emperor',          'sea_emperor', 100, 1),
    f('sea_emperor_adult','Sea Emperor Adulte',  'sea_emperor', 200, 5.5),
  ]),
  c('zelda_char',        'Zelda',                'M', 62, 'The Legend of Zelda'),
  ce('clown_repo', 'Clown', 'M', 58, 'R.E.P.O', [
    f('clown_repo_base', 'Clown',                'clown_repo', 100, 1),
    f('clown_repo_laser','Clown — Laser',        'clown_repo', 200, 5),
  ]),
  ce('asuna', 'Asuna', 'M', 60, 'Sword Art Online', [
    f('asuna_base',      'Asuna',                'asuna', 100, 1),
    f('asuna_elfe',      "Armure de l'Elfe",     'asuna', 200, 5),
    f('asuna_cheat',     'Cheat Activate',       'asuna', 300, 12),
  ]),
  ce('power_csm', 'Power', 'M', 60, 'Chainsaw Man', [
    f('power_csm_base',  'Power',                'power_csm', 100, 1),
    f('power_csm_blood', 'Blood Devil',          'power_csm', 200, 5.5),
  ]),
  ce('yor', 'Yor', 'M', 62, 'Spy x Family', [
    f('yor_base',        'Yor Forger',           'yor', 100, 1),
    f('yor_assassin',    'Assassin',             'yor', 200, 5.5),
  ]),
  ce('nezuko', 'Nezuko', 'M', 63, 'Demon Slayer', [
    f('nezuko_base',     'Nezuko',               'nezuko', 100, 1),
    f('nezuko_demon',    'Forme Démoniaque',     'nezuko', 200, 5.5),
  ]),
  ce('zenitsu', 'Zenitsu', 'M', 61, 'Demon Slayer', [
    f('zenitsu_base',    'Zenitsu',              'zenitsu', 100, 1),
    f('zenitsu_maquille','Zenitsu Maquillé',     'zenitsu', 200, 5),
    f('zenitsu_marque',  'Zenitsu — Marque',     'zenitsu', 300, 12),
  ]),
  ce('jinshi_ap', 'Jinshi', 'M', 59, "Les Carnets de l'Apothicaire", [
    f('jinshi_ap_base',  'Jinshi',               'jinshi_ap', 100, 1),
    f('jinshi_ap_jade',  'Armure de Jade',       'jinshi_ap', 200, 5),
  ]),
  c('adam_va',           'Adam',                 'M', 61, 'Valkyrie Apocalypse'),
  ce('hornet_hk', 'Hornet', 'M', 61, 'Hollow Knight', [
    f('hornet_hk_base',  'Hornet',               'hornet_hk', 100, 1),
    f('hornet_hk_needle',"Forme de l'Aiguille",  'hornet_hk', 200, 5),
  ]),
  ce('claudio', 'Claudio', 'M', 57, 'Tekken', [
    f('claudio_base',    'Claudio',              'claudio', 100, 1),
    f('claudio_burst',   'Claudio — Burst',      'claudio', 200, 5.5),
  ]),
  c('celeste_drp',       'Celeste',              'M', 59, 'Danganronpa'),

  // ── STELLAIRES V2 ───────────────────────────────────────────────────────
  ce('zoro', 'Zoro', 'S', 72, 'One Piece', [
    f('zoro_base',       'Zoro',                 'zoro', 100, 1),
    f('zoro_eclipse',    'Post Éclipse',         'zoro', 200, 6.5),
    f('zoro_wano',       'Post Wano',            'zoro', 300, 17),
  ]),
  ce('madara', 'Madara', 'S', 73, 'Naruto', [
    f('madara_base',     'Madara',               'madara', 100, 1),
    f('madara_rinnegan', 'Rinnegan',             'madara', 200, 4.5),
    f('madara_susanoo',  'Susanoo',              'madara', 300, 12),
  ]),
  ce('millim', 'Millim', 'S', 68, 'Slime Datta Ken', [
    f('millim_base',     'Millim',               'millim', 100, 1),
    f('millim_slime',    'Millim — Slime',       'millim', 200, 5),
  ]),
  ce('byakuya', 'Byakuya', 'S', 69, 'Bleach', [
    f('byakuya_base',    'Byakuya',              'byakuya', 100, 1),
    f('byakuya_shikai',  'Shikai',               'byakuya', 200, 4),
    f('byakuya_bankai',  'Bankai',               'byakuya', 300, 10),
  ]),
  ce('richard_coeur', 'Richard Cœur de Lion', 'S', 71, 'Fate', [
    f('richard_coeur_base','Richard Cœur de Lion','richard_coeur', 100, 1),
    f('richard_coeur_armor','Armure de Lion',    'richard_coeur', 200, 5),
  ]),
  ce('ganondorf_char', 'Ganondorf', 'S', 67, 'The Legend of Zelda', [
    f('ganondorf_char_base','Ganondorf',         'ganondorf_char', 100, 1),
    f('ganondorf_char_hum','Forme Humaine',      'ganondorf_char', 200, 4),
    f('ganondorf_char_dem','Forme Démoniaque',   'ganondorf_char', 300, 11),
  ]),
  ce('pomni', 'Pomni', 'S', 72, 'Digital Circus', [
    f('pomni_base',      'Pomni',                'pomni', 100, 1),
    f('pomni_prime',     'Pomni — Prime',        'pomni', 200, 6),
  ]),
  ce('alice_sao', 'Alice', 'S', 68, 'Sword Art Online', [
    f('alice_sao_base',  'Alice',                'alice_sao', 100, 1),
    f('alice_sao_armor', 'Armure Légendaire',    'alice_sao', 200, 6.5),
    f('alice_sao_max',   'Puissance Maximale',   'alice_sao', 300, 20),
  ]),
  ce('atsushi',           'Atsushi',              'S', 73, 'Bungou Stray Dogs', [
    f('atsushi_base', 'Atsushi', 'atsushi', 100, 1),
    f('atsushi_evo1', 'Atsushi — Bête', 'atsushi', 200, 7.5),
  ]),
  ce('mao_mao_ap', 'Mao Mao', 'S', 72, "Les Carnets de l'Apothicaire", [
    f('mao_mao_ap_base', 'Mao Mao',             'mao_mao_ap', 100, 1),
    f('mao_mao_ap_maqui','Maquillage',          'mao_mao_ap', 200, 7),
  ]),
  ce('denji', 'Denji', 'S', 68, 'Chainsaw Man', [
    f('denji_base',      'Denji',                'denji', 100, 1),
    f('denji_pochita',   'Pochita',              'denji', 200, 4.5),
    f('denji_chainsaw',  'Chainsaw Devil',       'denji', 300, 13.5),
  ]),
  ce('loid', 'Loid Forger', 'S', 70, 'Spy x Family', [
    f('loid_base',       'Loid Forger',          'loid', 100, 1),
    f('loid_espion',     'Espion',               'loid', 200, 5),
  ]),
  ce('tanjiro', 'Tanjiro', 'S', 70, 'Demon Slayer', [
    f('tanjiro_base',    'Tanjiro',              'tanjiro', 100, 1),
    f('tanjiro_eau',     "Forme de l'Eau",       'tanjiro', 200, 4.5),
    f('tanjiro_feu',     'Forme du Feu',         'tanjiro', 300, 13),
  ]),
  ce('edward', 'Edward', 'S', 73, 'Fullmetal Alchemist Brotherhood', [
    f('edward_base',     'Edward',               'edward', 100, 1),
    f('edward_alchi',    'Alchimiste',           'edward', 200, 4.5),
    f('edward_automail', 'Automail',             'edward', 300, 12),
  ]),
  ce('roy', 'Roy Mustang', 'S', 68, 'Fullmetal Alchemist Brotherhood', [
    f('roy_base',        'Roy Mustang',          'roy', 100, 1),
    f('roy_flame',       'Flame Alchemist',      'roy', 200, 5),
  ]),
  ce('horus_na', 'Horus', 'S', 72, 'Nos Animaux', [
    f('horus_na_base',   'Horus',                'horus_na', 100, 1),
    f('horus_na_celeste','Forme Céleste',        'horus_na', 200, 5),
  ]),
  ce('livai', 'Livai', 'S', 67, 'Attaque des Titans', [
    f('livai_base',      'Livai',                'livai', 100, 1),
    f('livai_caporal',   'Caporal',              'livai', 200, 5.5),
  ]),
  ce('freddy_fnaf', 'Freddy', 'S', 73, "Five Nights At Freddy's", [
    f('freddy_fnaf_base','Freddy Fazbear',       'freddy_fnaf', 100, 1),
    f('freddy_fnaf_toy', 'Freddy Toy',           'freddy_fnaf', 200, 4.5),
    f('freddy_fnaf_gold','Freddy Golden',        'freddy_fnaf', 300, 11),
  ]),
  ce('sans_ut', 'Sans', 'S', 67, 'Undertale', [
    f('sans_ut_base',    'Sans',                 'sans_ut', 100, 1),
    f('sans_ut_genocide','Sans — Mode Génocide', 'sans_ut', 200, 6),
  ]),
  ce('pichu', 'Pichu', 'S', 69, 'Pokémon', [
    f('pichu_base',      'Pichu',                'pichu', 100, 1),
    f('pichu_pikachu',   'Pikachu',              'pichu', 200, 3.5),
    f('pichu_raichu',    'Raichu',               'pichu', 300, 8),
    f('pichu_mega',      'Méga Raichu',          'pichu', 400, 45),
  ]),

  // ── COSMIQUES V2 ────────────────────────────────────────────────────────
  ce('yami', 'Yami', 'CO', 81, 'Black Clover', [
    f('yami_base',       'Yami',                 'yami', 100, 1),
    f('yami_adult',      'Yami Adulte',          'yami', 200, 7),
    f('yami_slash',      'Dimensional Slash',    'yami', 300, 28),
  ]),
  ce('aizen', 'Aizen', 'CO', 83, 'Bleach', [
    f('aizen_base',      'Aizen',                'aizen', 100, 1),
    f('aizen_shikai',    'Aizen Shikai',         'aizen', 200, 6),
    f('aizen_bankai',    'Aizen Bankai',         'aizen', 300, 19),
    f('aizen_hogyoku',   'Aizen Hogyoku',        'aizen', 400, 60),
  ]),
  ce('shinra', 'Shinra', 'CO', 83, 'Fire Force', [
    f('shinra_base',     'Shinra',               'shinra', 100, 1),
    f('shinra_8e',       '8ème Brigade',         'shinra', 200, 7),
    f('shinra_adora',    'Adora Burst',          'shinra', 300, 30),
  ]),
  ce('jin_tekken', 'Jin Kazama', 'CO', 77, 'Tekken', [
    f('jin_tekken_base', 'Jin Kazama',           'jin_tekken', 100, 1),
    f('jin_tekken_evil', 'Jin — Evil',           'jin_tekken', 200, 9.5),
    f('jin_tekken_devil', 'Devil Jin',           'jin_tekken', 300, 26),
  ]),
  ce('zorua', 'Zorua', 'CO', 80, 'Pokémon', [
    f('zorua_base',      'Zorua',                'zorua', 100, 1),
    f('zorua_hisui',     "Zorua d'Hisui",        'zorua', 200, 5),
    f('zorua_zoroark',   'Zoroark',              'zorua', 300, 17),
    f('zorua_hisui2',    "Zoroark d'Hisui",      'zorua', 400, 55),
  ]),
  ce('brume', 'Brume', 'P', 91, 'Nos Animaux', [
    f('brume_base',      'Brume',                'brume', 100, 1),
    f('brume_sacree',    'Brume Sacrée',         'brume', 200, 7),
    f('brume_ultime',    'Brume Ultime',         'brume', 300, 31),
  ]),

  // ── PRIMORDIAUX V2 ──────────────────────────────────────────────────────
  ce('steve', 'Steve', 'P', 92, 'Minecraft', [
    f('steve_base',      'Steve',                'steve', 100, 1),
    f('steve_diamond',   'Armure en Diamant',    'steve', 200, 8),
    f('steve_netherite', 'Armure en Netherite',  'steve', 300, 22),
  ]),
  ce('dva', 'D.Va', 'P', 88, 'Overwatch', [
    f('dva_base',        'D.Va',                 'dva', 100, 1),
    f('dva_mech',        'D.Va — Mech',          'dva', 200, 8.5),
  ]),
  ce('benimaru', 'Benimaru', 'P', 89, 'Fire Force', [
    f('benimaru_base',   'Benimaru',             'benimaru', 100, 1),
    f('benimaru_prime',  'Benimaru — Prime',     'benimaru', 200, 14),
  ]),
  ce('aatrox_lol', 'Aatrox', 'P', 91, 'League of Legends', [
    f('aatrox_lol_base', 'Aatrox',              'aatrox_lol', 100, 1),
    f('aatrox_lol_6',    'Aatrox Level 6',      'aatrox_lol', 200, 7),
    f('aatrox_lol_20',   'Aatrox Level 20',     'aatrox_lol', 300, 20),
  ]),
  ce('the_knight', 'The Knight', 'P', 87, 'Hollow Knight', [
    f('the_knight_base', 'The Knight',          'the_knight', 100, 1),
    f('the_knight_lvl1', 'Aiguillon Lvl 1',     'the_knight', 200, 7),
    f('the_knight_lvl2', 'Aiguillon Lvl 2',     'the_knight', 300, 18),
    f('the_knight_lvl3', 'Aiguillon Lvl 3',     'the_knight', 400, 50),
  ]),
  ce('eren', 'Eren', 'P', 93, 'Attaque des Titans', [
    f('eren_base',       'Eren',                 'eren', 100, 1),
    f('eren_adult',      'Eren Adulte',          'eren', 200, 7),
    f('eren_assaillant', 'Titan Assaillant',     'eren', 300, 20),
    f('eren_originel',   'Titan Originel',       'eren', 400, 55),
  ]),
  ce('rayquaza', 'Rayquaza', 'P', 88, 'Pokémon', [
    f('rayquaza_base',      'Rayquaza',                    'rayquaza', 100, 1),
    f('rayquaza_mega',      'Méga Rayquaza',               'rayquaza', 200, 15),
    f('rayquaza_ascension', 'Rayquaza — Ascension Céleste','rayquaza', 300, 32),
  ]),
  ce('ouchuu', 'Ouchuu', 'P', 93, "Chill&Cool", [
    f('ouchuu_base',     'Ouchuu',               'ouchuu', 100, 1),
    f('ouchuu_dep',      'Ouchuu Dépression Max','ouchuu', 200, 10),
  ]),

  // ── TRANSCENDANTS V2 ────────────────────────────────────────────────────
  ce('qin_shi_huang', 'Qin Shi Huang', 'T', 101, 'Valkyrie Apocalypse', [
    f('qin_shi_base',    'Qin Shi Huang',        'qin_shi_huang', 100, 1),
    f('qin_shi_roi',     'Roi de Chine',         'qin_shi_huang', 200, 10),
    f('qin_shi_immortel','Empereur Immortel',    'qin_shi_huang', 300, 35),
  ]),

  // ══════════════════════════════════════════════════════════════════════════
  // PERSONNAGES CRAFTABLES — Obtenus uniquement via la Forge
  // ══════════════════════════════════════════════════════════════════════════
  ce('vegeto', 'Végéto', 'P', 90, 'Dragon Ball Z', [
    f('vegeto_base',     'Végéto',               'vegeto', 100, 1),
    f('vegeto_ss',       'Végéto Super Saiyen',  'vegeto', 200, 6),
    f('vegeto_ssblue',   'Végéto SS Blue',       'vegeto', 300, 18),
  ]),
  ce('gogeta', 'Gogeta', 'P', 89, 'Dragon Ball Z', [
    f('gogeta_base',     'Gogeta',               'gogeta', 100, 1),
    f('gogeta_ss',       'Gogeta Super Saiyen',  'gogeta', 200, 6),
    f('gogeta_ssblue',   'Gogeta SS Blue',       'gogeta', 300, 17),
  ]),
  ce('aizen_t', 'Aizen Transcendant', 'P', 89, 'Bleach', [
    f('aizen_t_base',    'Aizen Transcendant',   'aizen_t', 100, 1),
    f('aizen_t_fusion',  'Fusion Complète',      'aizen_t', 200, 10),
  ]),
  ce('yoriichi', 'Yoriichi Tsugikuni', 'P', 92, 'Demon Slayer', [
    f('yoriichi_base',   'Yoriichi',             'yoriichi', 100, 1),
    f('yoriichi_sun',    'Danse du Soleil',      'yoriichi', 200, 11),
  ]),
  c('brunhilde',   'Brunhilde',                  'P', 89, 'Valkyrie Apocalypse'),
  ce('chara', 'Chara', 'P', 93, 'Undertale', [
    f('chara_base',      'Chara',                'chara', 100, 1),
    f('chara_genocide',  'Route Génocide',       'chara', 200, 10),
  ]),
  ce('shanks', 'Shanks le Roux', 'T', 97, 'One Piece', [
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