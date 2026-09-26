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

// Perso de boss de raid : la forme N requiert les N premiers objets
// d'évolution du perso (ex: [a,b,c] -> forme1:[a], forme2:[a,b], forme3:[a,b,c]).
function cumulative(items: string[], stage: number): string[] {
  return items.slice(0, stage);
}

// ══════════════════════════════════════════════════════════════════════════
// BANNIÈRE VOL.2 — nouveaux personnages, tirables sur leur propre bannière
// (BANNER_POOL_VOL2) ET sur la bannière Vol.1 (BANNER_POOL, qui contient tout).
// ══════════════════════════════════════════════════════════════════════════
export const BANNER_VOL2_CHARACTERS: CharacterTemplate[] = [

  // ── COMMUNS ───────────────────────────────────────────────────────────────
  c('boo',                       'Boo',                             'C',    7, 'Mario'),
  c('nurugai',                   'Nurugai',                         'C',    9, "Hell's Paradise"),
  c('foxy_op',                   'Foxy',                            'C',   12, 'One Piece'),
  c('henry_legolant',            'Henry Legolant',                  'C',    9, 'Black Clover'),
  c('sekke_bronzazza',           'Sekke Bronzazza',                 'C',    7, 'Black Clover'),
  c('anguille_tesla',            'Anguille Tesla',                  'C',    8, 'Subnautica'),
  c('shinji_fate',               'Shinji',                          'C',    9, 'Fate'),
  c('aoi_asahina',               'Aoi Asahina',                     'C',    8, 'Danganronpa'),
  c('klein',                     'Klein',                           'C',   10, 'Sword Art Online'),
  c('beam',                      'Beam',                            'C',   11, 'Chainsaw Man'),
  c('kishibe',                   'Kishibe',                         'C',   10, 'Chainsaw Man'),
  c('hikage',                    'Hikage',                          'C',   13, 'Fire Force'),
  c('hinata_ff',                 'Hinata',                          'C',   11, 'Fire Force'),
  c('takehisa_hinawa',           'Takehisa Hinawa',                 'C',   12, 'Fire Force'),
  c('shao_may',                  'Shao May',                        'C',    8, 'Fullmetal Alchemist Brotherhood'),
  c('braum',                     'Braum',                           'C',    8, 'League of Legends'),
  c('jack_eventreur',            "Jack l'Éventreur",                'C',   12, 'Valkyrie Apocalypse'),
  c('lu_bu',                     'Lü Bu',                           'C',    9, 'Valkyrie Apocalypse'),
  c('pixis',                     'Pixis',                           'C',    9, 'Attaque des Titans'),
  c('circus_baby',               'Circus Baby',                     'C',   10, "Five Nights At Freddy's"),
  c('toriel',                    'Toriel',                          'C',   11, 'Undertale'),
  c('loup_cramoisi',             'Loup Cramoisi de Radagon',        'C',   13, 'Elden Ring'),
  c('emboutisseur_moussu',       'Emboutisseur Moussu',             'C',   13, 'Hollow Knight'),

  // ── UNCOMMUNS ─────────────────────────────────────────────────────────────
  c('champion_gravetender',      'Champion Gravetender',            'U',   23, 'Dark Souls 3'),
  c('tsuyu_asui',                'Tsuyu Asui',                      'U',   19, 'My Hero Academia'),
  c('pillarde_dd',               'Pillarde',                        'U',   17, 'Darkest Dungeon'),
  c('lune',                      'Lune',                            'U',   22, 'Clair Obscur'),
  c('emul',                      'Emul',                            'U',   19, 'Shangri-La Frontier'),
  c('zanark',                    'Zanark',                          'U',   20, 'Inazuma Eleven'),
  c('okikurumi',                 'Okikurumi',                       'U',   21, 'Okami'),
  c('phoenix_valo',              'Phoenix',                         'U',   18, 'Valorant'),
  c('toadette',                  'Toadette',                        'U',   20, 'Mario'),
  c('misa_amane',                'Misa Amane',                      'U',   20, 'Death Note'),
  c('rei_ayanami',               'Rei Ayanami',                     'U',   22, 'Evangelion'),
  c('polnareff',                 'Jean-Pierre Polnareff',           'U',   21, "JoJo's Bizarre Adventure"),
  c('maka_albarn',               'Maka Albarn',                     'U',   23, 'Soul Eater'),
  c('leolio',                    'Leolio',                          'U',   17, 'Hunter x Hunter'),
  c('ten_shin_han',              'Ten Shin Han',                    'U',   21, 'Dragon Ball Z'),
  c('pappag',                    'Pappag',                          'U',   22, 'One Piece'),
  c('gordon_agrippa',            'Gordon Agrippa',                  'U',   19, 'Black Clover'),
  c('momo_hinamori',             'Momo Hinamori',                   'U',   22, 'Bleach'),
  c('peko_pekoyama',             'Peko Pekoyama',                   'U',   23, 'Danganronpa'),
  c('gangle',                    'Gangle',                          'U',   20, 'Digital Circus'),
  c('aoi_kanzaki',               'Aoi Kanzaki',                     'U',   22, 'Demon Slayer'),
  c('shaco',                     'Shaco',                           'U',   22, 'League of Legends'),
  c('jack_8',                    'Jack-8',                          'U',   17, 'Tekken'),
  c('leroy_smith',               'Leroy Smith',                     'U',   20, 'Tekken'),
  c('muffet',                    'Muffet',                          'U',   18, 'Undertale'),
  c('faux_chevalier',            'Faux Chevalier',                  'U',   21, 'Hollow Knight'),

  // ── RARES ─────────────────────────────────────────────────────────────────
  c('sherry_birkin',             'Sherry Birkin',                   'R',   28, 'Resident Evil'),
  c('eijiro_kirishima',          'Eijiro Kirishima',                'R',   30, 'My Hero Academia'),
  c('aoi_todo',                  'Aoi Todo',                        'R',   33, 'Jujutsu Kaisen'),
  c('brigand_dd',                'Brigand',                         'R',   32, 'Darkest Dungeon'),
  c('arthur_pencilgon',          'Arthur Pencilgon',                'R',   29, 'Shangri-La Frontier'),
  c('xavier_foster',             'Xavier Foster',                   'R',   29, 'Inazuma Eleven'),
  c('issun',                     'Issun',                           'R',   28, 'Okami'),
  c('viper',                     'Viper',                           'R',   29, 'Valorant'),
  c('fern',                      'Fern',                            'R',   27, 'Frieren'),
  c('kojiro',                    'Kojiro',                          'R',   29, 'The Elusive Samurai'),
  c('carmilla',                  'Carmilla',                        'R',   31, 'Ravenswatch'),
  c('yoshi',                     'Yoshi',                           'R',   28, 'Mario'),
  c('riyo_reaper',               'Riyo Reaper',                     'R',   31, 'Gachiakuta'),
  c('aza_chobe',                 'Aza Chobe',                       'R',   31, "Hell's Paradise"),
  c('lucky_cyan',                'Lucky Cyan',                      'R',   30, 'To Be Hero X'),
  c('ryuk',                      'Ryuk',                            'R',   32, 'Death Note'),
  c('shinji_ikari',              'Shinji Ikari',                    'R',   29, 'Evangelion'),
  c('asura_se',                  'Asura',                           'R',   27, 'Soul Eater'),
  c('kurapika',                  'Kurapika',                        'R',   28, 'Hunter x Hunter'),
  c('sakura',                    'Sakura',                          'R',   27, 'Naruto'),
  c('temari',                    'Temari',                          'R',   30, 'Naruto'),
  c('hexagide',                  'Hexagide',                        'R',   32, 'Pokémon'),
  c('ryuji_sakamoto',            'Ryuji Sakamoto',                  'R',   30, 'Persona 5'),
  c('demon_brotato',             'Démon',                           'R',   29, 'Brotato'),
  c('soei',                      'Soei',                            'R',   29, 'Tensei Slime'),
  c('golem_de_fer',              'Golem de Fer',                    'R',   29, 'Minecraft'),
  c('piaf',                      'Piaf',                            'R',   32, 'The Legend of Zelda'),
  c('akutagawa',                 'Akutagawa',                       'R',   31, 'Bungou Stray Dogs'),
  c('ritsu',                     'Ritsu',                           'R',   33, 'Fire Force'),
  c('zeri',                      'Zeri',                            'R',   29, 'League of Legends'),
  c('kenny',                     'Kenny',                           'R',   33, 'Attaque des Titans'),
  c('ymir',                      'Ymir',                            'R',   32, 'Attaque des Titans'),
  c('foxy_fnaf',                 'Foxy',                            'R',   27, "Five Nights At Freddy's"),
  c('asuka_kazama',              'Asuka Kazama',                    'R',   30, 'Tekken'),
  c('papyrus',                   'Papyrus',                         'R',   29, 'Undertale'),
  c('annerose',                  'Annerose Fucianas',               'R',   31, 'The Eminence in Shadow'),
  c('alice_leywin',              'Alice Leywin',                    'R',   27, 'Tbate'),
  c('yoo_jin_ho',                'Yoo Jin Ho',                      'R',   28, 'Solo Leveling'),

  // ── ÉPIQUES ───────────────────────────────────────────────────────────────
  c('danseuse_vallee_boreale',   'La Danseuse de la Vallée Boréale', 'E',   39, 'Dark Souls 3'),
  c('megumi_fushiguro',          'Megumi Fushiguro',                'E',   41, 'Jujutsu Kaisen'),
  c('renoir',                    'Renoir',                          'E',   37, 'Clair Obscur'),
  c('himmel',                    'Himmel',                          'E',   40, 'Frieren'),
  c('fubuki',                    'Fubuki',                          'E',   39, 'The Elusive Samurai'),
  c('romeo',                     'Roméo',                           'E',   41, 'Ravenswatch'),
  c('peach',                     'Peach',                           'E',   40, 'Mario'),
  c('zanka_nijiku',              'Zanka Nijiku',                    'E',   37, 'Gachiakuta'),
  c('yuzuriha',                  'Yuzuriha',                        'E',   42, "Hell's Paradise"),
  c('l_dn',                      'L',                               'E',   37, 'Death Note'),
  c('maya_ibuki',                'Maya Ibuki',                      'E',   40, 'Evangelion'),
  c('broly',                     'Broly',                           'E',   37, 'Dragon Ball Z'),
  c('yamato',                    'Yamato',                          'E',   43, 'One Piece'),
  c('nico_robin',                'Nico Robin',                      'E',   41, 'One Piece'),
  c('shikamaru',                 'Shikamaru Nara',                  'E',   38, 'Naruto'),
  c('vanessa_enoteca',           'Vanessa Enoteca',                 'E',   39, 'Black Clover'),
  c('orihime_inoue',             'Orihime Inoue',                   'E',   40, 'Bleach'),
  c('emiya_shirou',              'Emiya Shirou',                    'E',   37, 'Fate'),
  c('fuyuhiko_kuzuryu',          'Fuyuhiko Kuzuryu',                'E',   41, 'Danganronpa'),
  c('rosalia',                   'Rosalia',                         'E',   41, 'Sword Art Online'),
  c('kyoka_izumi',               'Kyôka Izumi',                     'E',   38, 'Bungou Stray Dogs'),
  c('himeno',                    'Himeno',                          'E',   42, 'Chainsaw Man'),
  c('damian_desmond',            'Damian Desmond',                  'E',   43, 'Spy x Family'),
  c('maki_oze',                  'Maki Oze',                        'E',   42, 'Fire Force'),
  c('armin',                     'Armin',                           'E',   37, 'Attaque des Titans'),
  c('mangle',                    'Mangle',                          'E',   43, "Five Nights At Freddy's"),
  c('defenseur_bousier',         'Défenseur Bousier',               'E',   41, 'Hollow Knight'),
  c('beta_eis',                  'Beta',                            'E',   40, 'The Eminence in Shadow'),
  c('capuchon',                  'Capuchon',                        'E',   40, 'Nos Animaux'),
  c('dragon_cuphead',            'Dragon',                          'E',   42, 'Cuphead'),

  // ── LÉGENDAIRES ───────────────────────────────────────────────────────────
  c('jill_valentine',            'Jill Valentine',                  'L',   51, 'Resident Evil'),
  c('shoto_todoroki',            'Shoto Todoroki',                  'L',   52, 'My Hero Academia'),
  c('bouffon_dd',                'Bouffon',                         'L',   49, 'Darkest Dungeon'),
  c('paolo_bianchi',             'Paolo Bianchi',                   'L',   52, 'Inazuma Eleven'),
  ce('ushiwaka', 'Ushiwaka', 'L', 49, 'Okami', [
    f('ushiwaka_base', 'Ushiwaka', 'ushiwaka'),
    f('ushiwaka_evo1', 'Ushiwaka — Lame Lunaire', 'ushiwaka'),
  ]),
  c('fade',                      'Fade',                            'L',   48, 'Valorant'),
  c('sun_wukong',                'Sun Wukong',                      'L',   48, 'Ravenswatch'),
  c('mario',                     'Mario',                           'L',   53, 'Mario'),
  c('nice_tbhx',                 'Nice',                            'L',   52, 'To Be Hero X'),
  c('jolyne_joestar',            'Jolyne Joestar',                  'L',   52, "JoJo's Bizarre Adventure"),
  c('death_the_kid',             'Death the Kid',                   'L',   51, 'Soul Eater'),
  c('kirua_zoldyck',             'Kirua Zoldyck',                   'L',   51, 'Hunter x Hunter'),
  c('latias',                    'Latias',                          'L',   50, 'Pokémon'),
  c('lily_lovebraids',           'Lily Lovebraids',                 'L',   47, 'Poppy Playtime'),
  c('benimaru_ts',               'Benimaru',                        'L',   51, 'Tensei Slime'),
  c('machaon',                   'Machaon',                         'L',   49, 'The Legend of Zelda'),
  c('death_gun',                 'Death Gun',                       'L',   50, 'Sword Art Online'),
  c('shisui_ap',                 'Shisui',                          'L',   48, "Les Carnets de l'Apothicaire"),
  c('kanao_tsuyuri',             'Kanao Tsuyuri',                   'L',   50, 'Demon Slayer'),
  c('paul_phoenix',              'Paul Phoenix',                    'L',   49, 'Tekken'),
  c('sly',                       'Sly',                             'L',   52, 'Hollow Knight'),
  c('deux_isis',                 'Les deux Isis',                   'L',   50, 'Nos Animaux'),
  c('tessia_eralith',            'Tessia Eralith',                  'L',   49, 'Tbate'),
  c('baek_yoon_ho',              'Baek Yoon Ho',                    'L',   49, 'Solo Leveling'),

  // ── MYTHIQUES ─────────────────────────────────────────────────────────────
  c('sage_de_cristal',           'Sage de Cristal',                 'M',   58, 'Dark Souls 3'),
  c('ada_wong',                  'Ada Wong',                        'M',   61, 'Resident Evil'),
  c('medecin_de_peste',          'Médecin de Peste',                'M',   60, 'Darkest Dungeon'),
  c('sciel',                     'Sciel',                           'M',   63, 'Clair Obscur'),
  c('psyger_0',                  'Psyger-0',                        'M',   62, 'Shangri-La Frontier'),
  ce('amaterasu', 'Amaterasu', 'M', 63, 'Okami', [
    f('amaterasu_base', 'Amaterasu', 'amaterasu'),
    f('amaterasu_evo1', 'Amaterasu — Shiranui', 'amaterasu'),
  ]),
  c('hojo_tokiyuki',             'Hojo Tokiyuki',                   'M',   57, 'The Elusive Samurai'),
  c('juliette',                  'Juliette',                        'M',   63, 'Ravenswatch'),
  c('amo_empool',                'Amo Empool',                      'M',   62, 'Gachiakuta'),
  c('faucheur_tbhx',             'Faucheur',                        'M',   60, 'To Be Hero X'),
  c('light_yagami',              'Light Yagami',                    'M',   60, 'Death Note'),
  c('josuke_joestar',            'Josuke Joestar',                  'M',   62, "JoJo's Bizarre Adventure"),
  c('soul_evans',                'Soul Evans',                      'M',   59, 'Soul Eater'),
  c('gon_freecss',               'Gon Freecss',                     'M',   60, 'Hunter x Hunter'),
  c('emolga',                    'Emolga',                          'M',   61, 'Pokémon'),
  c('doey',                      'Doey',                            'M',   58, 'Poppy Playtime'),
  c('guy_crimson',               'Guy Crimson',                     'M',   62, 'Tensei Slime'),
  c('iskandar',                  'Iskandar',                        'M',   62, 'Fate'),
  c('burns',                     'Burns',                           'M',   60, 'Fire Force'),
  c('envy',                      'Envy',                            'M',   60, 'Fullmetal Alchemist Brotherhood'),
  c('amumu',                     'Amumu',                           'M',   62, 'League of Legends'),
  c('alpha_eis',                 'Alpha',                           'M',   61, 'The Eminence in Shadow'),

  // ── STELLAIRES ────────────────────────────────────────────────────────────
  c('katsuki_bakugo',            'Katsuki Bakugo',                  'S',   69, 'My Hero Academia'),
  c('yuta_okkotsu',              'Yuta Okkotsu',                    'S',   67, 'Jujutsu Kaisen'),
  ce('maelle', 'Maelle', 'S', 71, 'Clair Obscur', [
    f('maelle_base', 'Maelle', 'maelle'),
    f('maelle_evo1', 'Maelle — Position Virtuose', 'maelle'),
    f('maelle_evo2', 'Maelle — Alicia', 'maelle'),
  ]),
  ce('axel_blaze', 'Axel Blaze', 'S', 69, 'Inazuma Eleven', [
    f('axel_blaze_base', 'Axel Blaze', 'axel_blaze'),
    f('axel_blaze_evo1', 'Axel Blaze — Raimon', 'axel_blaze'),
    f('axel_blaze_evo2', 'Axel Blaze — Attaquant de Feu Ultime', 'axel_blaze'),
  ]),
  ce('jett', 'Jett', 'S', 70, 'Valorant', [
    f('jett_base', 'Jett', 'jett'),
    f('jett_evo1', 'Jett — Blade Storm', 'jett'),
  ]),
  ce('suwa_yorishige', 'Suwa Yorishige', 'S', 73, 'The Elusive Samurai', [
    f('suwa_yorishige_base', 'Suwa Yorishige', 'suwa_yorishige'),
    f('suwa_yorishige_evo1', 'Suwa Yorishige — Divin', 'suwa_yorishige'),
  ]),
  c('gabimaru',                  'Gabimaru',                        'S',   69, "Hell's Paradise"),
  ce('queen_tbhx', 'Queen', 'S', 70, 'To Be Hero X', [
    f('queen_tbhx_base', 'Queen', 'queen_tbhx'),
    f('queen_tbhx_evo1', 'Queen — Souveraine Absolue', 'queen_tbhx'),
  ]),
  c('dio_brando',                'Dio Brando',                      'S',   67, "JoJo's Bizarre Adventure"),
  ce('gohan', 'Gohan', 'S', 72, 'Dragon Ball Z', [
    f('gohan_base', 'Gohan', 'gohan'),
    f('gohan_evo1', 'Gohan — Super Saiyen 2', 'gohan'),
    f('gohan_evo2', 'Gohan — Ultime', 'gohan'),
    f('gohan_evo3', 'Gohan — Beast', 'gohan'),
  ]),
  ce('morgana', 'Morgana', 'S', 72, 'Persona 5', [
    f('morgana_base', 'Morgana', 'morgana'),
    f('morgana_evo1', 'Morgana — Voleur Fantôme', 'morgana'),
  ]),
  ce('nero_bc', 'Nero', 'S', 69, 'Black Clover', [
    f('nero_bc_base', 'Nero', 'nero_bc'),
    f('nero_bc_evo1', 'Nero — Forme Humaine', 'nero_bc'),
  ]),
  ce('leviathan_tenebreux', 'Léviathan Ténébreux', 'S', 68, 'Subnautica', [
    f('leviathan_tenebreux_base', 'Léviathan Ténébreux', 'leviathan_tenebreux'),
    f('leviathan_tenebreux_evo1', 'Léviathan Ténébreux — Abysses', 'leviathan_tenebreux'),
  ]),
  ce('kisuke_urahara', 'Kisuke Urahara', 'S', 67, 'Bleach', [
    f('kisuke_urahara_base', 'Kisuke Urahara', 'kisuke_urahara'),
    f('kisuke_urahara_evo1', 'Kisuke Urahara — Capitaine', 'kisuke_urahara'),
    f('kisuke_urahara_evo2', 'Kisuke Urahara — Bankai', 'kisuke_urahara'),
  ]),
  c('bella_repo',                'Bella',                           'S',   71, 'R.E.P.O'),
  ce('bastion', 'Bastion', 'S', 69, 'Overwatch', [
    f('bastion_base', 'Bastion', 'bastion'),
    f('bastion_evo1', 'Bastion — Mode Tourelle', 'bastion'),
  ]),
  c('ahri',                      'Ahri',                            'S',   69, 'League of Legends'),

  // ── COSMIQUES ─────────────────────────────────────────────────────────────
  ce('roi_sans_nom', 'Le Roi sans Nom', 'CO', 83, 'Dark Souls 3', [
    f('roi_sans_nom_base', 'Le Roi sans Nom', 'roi_sans_nom'),
    f('roi_sans_nom_evo1', 'Le Roi sans Nom — Seigneur des Tempêtes', 'roi_sans_nom'),
  ]),
  ce('leon_kennedy', 'Leon S. Kennedy', 'CO', 78, 'Resident Evil', [
    f('leon_kennedy_base', 'Leon S. Kennedy', 'leon_kennedy'),
    f('leon_kennedy_evo1', 'Leon S. Kennedy — Agent Vétéran', 'leon_kennedy'),
  ]),
  ce('izuku_midoriya', 'Izuku Midoriya', 'CO', 79, 'My Hero Academia', [
    f('izuku_midoriya_base', 'Izuku Midoriya', 'izuku_midoriya'),
    f('izuku_midoriya_evo1', 'Izuku Midoriya — Héros', 'izuku_midoriya'),
    f('izuku_midoriya_evo2', 'Izuku Midoriya — Vigilante', 'izuku_midoriya'),
    f('izuku_midoriya_evo3', 'Izuku Midoriya — Combat Final', 'izuku_midoriya'),
  ]),
  ce('ryomen_sukuna', 'Ryomen Sukuna', 'CO', 82, 'Jujutsu Kaisen', [
    f('ryomen_sukuna_base', 'Ryomen Sukuna', 'ryomen_sukuna'),
    f('ryomen_sukuna_evo1', 'Ryomen Sukuna — 10 Doigts', 'ryomen_sukuna'),
    f('ryomen_sukuna_evo2', 'Ryomen Sukuna — 20 Doigts', 'ryomen_sukuna'),
  ]),
  ce('verso', 'Verso', 'CO', 83, 'Clair Obscur', [
    f('verso_base', 'Verso', 'verso'),
    f('verso_evo1', 'Verso — Perfection A', 'verso'),
    f('verso_evo2', 'Verso — Perfection S', 'verso'),
  ]),
  ce('sunraku', 'Sunraku', 'CO', 78, 'Shangri-La Frontier', [
    f('sunraku_base', 'Sunraku', 'sunraku'),
    f('sunraku_evo1', "Sunraku — Tête d'Oiseau", 'sunraku'),
    f('sunraku_evo2', 'Sunraku — Lapin Vorpal', 'sunraku'),
  ]),
  ce('reyna', 'Reyna', 'CO', 83, 'Valorant', [
    f('reyna_base', 'Reyna', 'reyna'),
    f('reyna_evo1', 'Reyna — Empress', 'reyna'),
  ]),
  ce('stark', 'Stark', 'CO', 81, 'Frieren', [
    f('stark_base', 'Stark', 'stark'),
    f('stark_evo1', 'Stark — Héros de Clearsdorf', 'stark'),
  ]),
  ce('rudo_surebrec', 'Rudo Surebrec', 'CO', 82, 'Gachiakuta', [
    f('rudo_surebrec_base', 'Rudo Surebrec', 'rudo_surebrec'),
    f('rudo_surebrec_evo1', 'Rudo Surebrec — Nettoyeur', 'rudo_surebrec'),
  ]),
  ce('joseph_joestar', 'Joseph Joestar', 'CO', 80, "JoJo's Bizarre Adventure", [
    f('joseph_joestar_base', 'Joseph Joestar', 'joseph_joestar'),
    f('joseph_joestar_evo1', 'Joseph Joestar — Hermit Purple', 'joseph_joestar'),
  ]),
  ce('kuroro_lucifer', 'Kuroro Lucifer', 'CO', 79, 'Hunter x Hunter', [
    f('kuroro_lucifer_base', 'Kuroro Lucifer', 'kuroro_lucifer'),
    f('kuroro_lucifer_evo1', 'Kuroro Lucifer — Maître des Stratagèmes', 'kuroro_lucifer'),
    f('kuroro_lucifer_evo2', 'Kuroro Lucifer — Orchestre de la Mort', 'kuroro_lucifer'),
  ]),
  ce('sasuke', 'Sasuke', 'CO', 78, 'Naruto', [
    f('sasuke_base', 'Sasuke', 'sasuke'),
    f('sasuke_evo1', 'Sasuke — Marque Maudite', 'sasuke'),
    f('sasuke_evo2', 'Sasuke — Mangekyo Sharingan', 'sasuke'),
    f('sasuke_evo3', 'Sasuke — Rinnegan', 'sasuke'),
  ]),
  ce('luminus_valentine', 'Luminus Valentine', 'CO', 83, 'Tensei Slime', [
    f('luminus_valentine_base', 'Luminus Valentine', 'luminus_valentine'),
    f('luminus_valentine_evo1', 'Luminus Valentine — Déesse', 'luminus_valentine'),
    f('luminus_valentine_evo2', 'Luminus Valentine — Roi Démon', 'luminus_valentine'),
  ]),
  ce('ender_dragon', 'Ender Dragon', 'CO', 78, 'Minecraft', [
    f('ender_dragon_base', 'Ender Dragon', 'ender_dragon'),
    f('ender_dragon_evo1', 'Ender Dragon — Souffle du Néant', 'ender_dragon'),
  ]),
  c('junko_enoshima',            'Junko Enoshima',                  'CO',  78, 'Danganronpa'),
  ce('kinger', 'Kinger', 'CO', 83, 'Digital Circus', [
    f('kinger_base', 'Kinger', 'kinger'),
    f('kinger_evo1', 'Kinger — Roi Déchu', 'kinger'),
  ]),
  ce('yui_sao', 'Yui', 'CO', 80, 'Sword Art Online', [
    f('yui_sao_base', 'Yui', 'yui_sao'),
    f('yui_sao_evo1', 'Yui — Cœur du Système', 'yui_sao'),
  ]),
  ce('mori_ogai', 'Mori Ogai', 'CO', 78, 'Bungou Stray Dogs', [
    f('mori_ogai_base', 'Mori Ogai', 'mori_ogai'),
    f('mori_ogai_evo1', 'Mori Ogai — Stratège', 'mori_ogai'),
  ]),
  c('gyokuyo',                   'Gyokuyô',                         'CO',  78, "Les Carnets de l'Apothicaire"),
  ce('reze', 'Reze', 'CO', 82, 'Chainsaw Man', [
    f('reze_base', 'Reze', 'reze'),
    f('reze_evo1', 'Reze — Démon Bombe', 'reze'),
  ]),
  ce('giyu_tomioka', 'Giyu Tomioka', 'CO', 82, 'Demon Slayer', [
    f('giyu_tomioka_base', 'Giyu Tomioka', 'giyu_tomioka'),
    f('giyu_tomioka_evo1', "Giyu Tomioka — Souffle de l'Eau", 'giyu_tomioka'),
    f('giyu_tomioka_evo2', 'Giyu Tomioka — Onzième Mouvement', 'giyu_tomioka'),
  ]),
  c('pride',                     'Pride',                           'CO',  79, 'Fullmetal Alchemist Brotherhood'),
  c('hades_va',                  'Hadès',                           'CO',  82, 'Valkyrie Apocalypse'),
  ce('puppet', 'Puppet', 'CO', 83, "Five Nights At Freddy's", [
    f('puppet_base', 'Puppet', 'puppet'),
    f('puppet_evo1', 'Puppet — Marionnette Vengeresse', 'puppet'),
  ]),

  // ── PRIMORDIAUX ───────────────────────────────────────────────────────────
  ce('shawn_frost', 'Shawn Frost', 'P', 89, 'Inazuma Eleven', [
    f('shawn_frost_base', 'Shawn Frost', 'shawn_frost'),
    f('shawn_frost_evo1', 'Shawn Frost — Frénésie', 'shawn_frost'),
    f('shawn_frost_evo2', 'Shawn Frost — Éternel Blizzard', 'shawn_frost'),
  ]),
  ce('frieren', 'Frieren', 'P', 87, 'Frieren', [
    f('frieren_base', 'Frieren', 'frieren'),
    f('frieren_evo1', 'Frieren — Archiviste des Flammes', 'frieren'),
  ]),
  ce('enjin', 'Enjin', 'P', 89, 'Gachiakuta', [
    f('enjin_base', 'Enjin', 'enjin'),
    f('enjin_evo1', 'Enjin — Astral', 'enjin'),
  ]),
  ce('garp', 'Garp', 'P', 91, 'One Piece', [
    f('garp_base', 'Garp', 'garp'),
    f('garp_evo1', 'Garp — Héros de la Marine', 'garp'),
    f('garp_evo2', 'Garp — Galaxy Impact', 'garp'),
  ]),
  ce('archer_fate', 'Archer', 'P', 91, 'Fate', [
    f('archer_fate_base', 'Archer', 'archer_fate'),
    f('archer_fate_evo1', 'Archer — Unlimited Blade Works', 'archer_fate'),
  ]),
  ce('chiaki_nanami', 'Chiaki Nanami', 'P', 91, 'Danganronpa', [
    f('chiaki_nanami_base', 'Chiaki Nanami', 'chiaki_nanami'),
    f('chiaki_nanami_evo1', 'Chiaki Nanami — Gameuse Ultime', 'chiaki_nanami'),
    f('chiaki_nanami_evo2', 'Chiaki Nanami — Espoir', 'chiaki_nanami'),
  ]),
  ce('makima', 'Makima', 'P', 91, 'Chainsaw Man', [
    f('makima_base', 'Makima', 'makima'),
    f('makima_evo1', 'Makima — Démon de la Domination', 'makima'),
    f('makima_evo2', 'Makima — Nayuta', 'makima'),
  ]),
  ce('maliketh', 'Maliketh', 'P', 92, 'Elden Ring', [
    f('maliketh_base', 'Maliketh', 'maliketh'),
    f('maliketh_evo1', 'Maliketh — Lame Noire', 'maliketh'),
  ]),

  // ── TRANSCENDANTS ─────────────────────────────────────────────────────────
  ce('satoru_gojo', 'Satoru Gojo', 'T', 97, 'Jujutsu Kaisen', [
    f('satoru_gojo_base', 'Satoru Gojo', 'satoru_gojo'),
    f('satoru_gojo_evo1', 'Satoru Gojo — Infini', 'satoru_gojo'),
    f('satoru_gojo_evo2', 'Satoru Gojo — Extension du Territoire', 'satoru_gojo'),
  ]),
  ce('nightmare_grimm', 'Nightmare Grimm', 'T', 97, 'Hollow Knight', [
    f('nightmare_grimm_base', 'Nightmare Grimm', 'nightmare_grimm'),
    f('nightmare_grimm_evo1', 'Nightmare Grimm — Roi du Cauchemar', 'nightmare_grimm'),
  ]),
];

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
  })()),
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
  ]),
  ce('jinwoo', 'Sung Jin Woo', 'S', 71, 'Solo Leveling', (() => {
    const items = ['elixir_vie', 'manteau_ombre', 'beru'];
    return [
      f('jinwoo_base', 'Sung Jin Woo',                      'jinwoo'),
      f('jinwoo_evo1', 'Sung Jin Woo — Monarque Éveillé',   'jinwoo',  cumulative(items, 1)),
      f('jinwoo_evo2', 'Sung Jin Woo — Seigneur des Ombres','jinwoo', cumulative(items, 2)),
      f('jinwoo_evo3', 'Sung Jin Woo — Monarque des Ombres','jinwoo', cumulative(items, 3)),
    ];
  })()),

  ce('cid_kagenou', 'Cid Kagenou', 'CO', 83, 'The Eminence in Shadow', (() => {
    const items = ['masque_cid', 'epee_slime', 'slime_eminence'];
    return [
      f('cid_kagenou_base', 'Cid Kagenou', 'cid_kagenou'),
      f('cid_kagenou_evo1', 'Shadow',      'cid_kagenou',  cumulative(items, 1)),
      f('cid_kagenou_evo2', 'John Smith',  'cid_kagenou', cumulative(items, 2)),
      f('cid_kagenou_evo3', 'Cid Kagenou — L’Éminence des Ombres', 'cid_kagenou', cumulative(items, 3)),
    ];
  })()),
  ce('rokoul_ayro', 'Rokoul & Ayro', 'CO', 82, 'Chill&Cool', (() => {
    const items = ['rokoul_item1', 'rokoul_item2', 'rokoul_item3'];
    return [
      f('rokoul_ayro_base', 'Rokoul & Ayro',        'rokoul_ayro'),
      f('rokoul_ayro_evo1', 'Rokoul & Ayro — Evo 1', 'rokoul_ayro', cumulative(items, 1)),
      f('rokoul_ayro_evo2', 'Rokoul & Ayro — Evo 2', 'rokoul_ayro', cumulative(items, 2)),
      f('rokoul_ayro_evo3', 'Rokoul & Ayro — Evo 3', 'rokoul_ayro', cumulative(items, 3)),
    ];
  })()),

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
  ]),

  // ── TRANSCENDANT ─────────────────────────────────────────────────────────
  ce('nekoz', 'NekoZ', 'T', 102, 'Chill&Cool', [
    f('nekoz_base', 'NekoZ',             'nekoz'),
    f('nekoz_evo1', 'NekoZ — Mode Divin','nekoz'),
  ]),
  ce('niyunishi', 'Niyunishi', 'T', 103, 'Nos Animaux', [
    f('niyunishi_base', 'Niyunishi',                     'niyunishi'),
    f('niyunishi_evo1', 'Niyunishi — Regard Ancien',     'niyunishi'),
    f('niyunishi_evo2', 'Niyunishi — Esprit de la Forêt','niyunishi'),
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
  ]),
  ce('rayquaza', 'Rayquaza', 'P', 88, 'Pokémon', [
    f('rayquaza_base',      'Rayquaza',                    'rayquaza'),
    f('rayquaza_mega',      'Méga Rayquaza',               'rayquaza'),
  ]),
  ce('ouchuu', 'Ouchuu', 'P', 93, "Chill&Cool", [
    f('ouchuu_base',     'Ouchuu',               'ouchuu'),
    f('ouchuu_dep',      'Ouchuu Dépression Max','ouchuu'),
  ]),

  // ── TRANSCENDANTS V2 ────────────────────────────────────────────────────
  ce('qin_shi_huang', 'Qin Shi Huang', 'T', 101, 'Valkyrie Apocalypse', [
    f('qin_shi_base',    'Qin Shi Huang',        'qin_shi_huang'),
    f('qin_shi_roi',     'Roi de Chine',         'qin_shi_huang'),
  ]),

  // ── BANNIÈRE VOL.2 (voir BANNER_VOL2_CHARACTERS ci-dessus) ─────────────
  ...BANNER_VOL2_CHARACTERS,

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
  ]),
  c('elfuzzion', 'ElFuZzion',                   'M', 62, 'Chill&Cool'),
];

// Index id → template, construit une seule fois. Évite un scan linéaire sur les
// ~400 personnages à CHAQUE appel (fonction appelée en boucle : combat chaque
// seconde, rendu de la collection, synergies, équipe...).
const CHARACTER_BY_ID: Map<string, CharacterTemplate> = new Map(
  CHARACTER_POOL.map(c => [c.id, c])
);

export function getCharacterById(id: string): CharacterTemplate | undefined {
  return CHARACTER_BY_ID.get(id);
}

// Personnages obtenables UNIQUEMENT via la Forge ou les Boss de Raid —
// ne doivent jamais apparaître au gacha, sinon leur exclusivité n'a plus de sens.
export const GACHA_EXCLUDED_IDS = new Set([
  // Récompenses de recettes de Forge (lib/game/expeditions.ts)
  'vegeto', 'gogeta', 'aizen_t', 'yoriichi', 'brunhilde', 'chara', 'shanks', 'elfuzzion',
  // Drops de boss de raid (lib/game/raidBoss.ts)
  'jinwoo', 'arthur_leywin', 'cid_kagenou', 'rokoul_ayro',
]);

export const BANNER_POOL = CHARACTER_POOL.filter(c => !c.isHero && !GACHA_EXCLUDED_IDS.has(c.id));

// Bannière Vol.2 : uniquement les nouveaux personnages (ils restent aussi
// tirables sur la bannière Vol.1, dont le pool couvre tout le roster).
export const BANNER_POOL_VOL2 = BANNER_VOL2_CHARACTERS.filter(c => !c.isHero && !GACHA_EXCLUDED_IDS.has(c.id));

export function getCharFormName(tpl: CharacterTemplate, formIndex: number): string {
  if (!tpl.forms || tpl.forms.length === 0) return tpl.name;
  return tpl.forms[formIndex]?.name ?? tpl.name;
}

