// Genre de chaque personnage du roster (utilisé par le GachaDle).
// 'other' = sans genre ou genre volontairement ambigu (créatures, objets,
// robots, Pokémon en tant qu'espèce, personnages dont l'auteur n'a jamais
// tranché : Mangle, Chara, Zooble, Limule...). 'mixed' = duo homme + femme.
// IMPORTANT : tout nouveau personnage doit être ajouté ici (un test vérifie
// que chaque personnage de CHARACTER_POOL a un genre).

export type Gender = 'male' | 'female' | 'mixed' | 'other';

export const GENDER_CONFIG: Record<Gender, { label: string; icon: string; color: string }> = {
  male:   { label: 'Masculin', icon: '♂', color: '#60a5fa' },
  female: { label: 'Féminin',  icon: '♀', color: '#f472b6' },
  mixed:  { label: 'Mixte',    icon: '⚥', color: '#c084fc' },
  other:  { label: 'Autre',    icon: '∅', color: '#94a3b8' },
};

const MALE: string[] = [
  // Dragon Ball Z
  'yamcha', 'mr_popo', 'vegeta', 'goku', 'oolong', 'mr_satan', 'piccolo', 'trunks', 'ten_shin_han', 'broly', 'gohan', 'vegeto', 'gogeta',
  // One Piece
  'sanji', 'luffy', 'caribou', 'wapol', 'laboon', 'zoro', 'foxy_op', 'pappag', 'garp', 'shanks',
  // Naruto
  'naruto', 'minato', 'kiba', 'mizuki_naruto', 'teuchi', 'konohamaru', 'kakashi', 'madara', 'shikamaru', 'sasuke',
  // Bleach
  'kioraku', 'ichigo', 'hanataro', 'kon', 'don_kanonji', 'yasutora_sado', 'byakuya', 'aizen', 'kisuke_urahara', 'aizen_t',
  // Demon Slayer
  'murata', 'sabito', 'zenitsu', 'tanjiro', 'giyu_tomioka', 'yoriichi',
  // Fate
  'arthur_pandragon', 'gilgamesh', 'sisigou', 'emiya_kiri', 'richard_coeur', 'shinji_fate', 'emiya_shirou', 'iskandar', 'archer_fate',
  // Sword Art Online
  'eugeo', 'kirito', 'klein', 'death_gun',
  // Black Clover
  'yuno', 'asta', 'finral', 'yami', 'henry_legolant', 'sekke_bronzazza', 'gordon_agrippa',
  // Danganronpa
  'nagito_komaeda', 'ouma', 'k1bo', 'fuyuhiko_kuzuryu',
  // Persona 5
  'arsene', 'ren_m', 'ryuji_sakamoto', 'morgana',
  // Bungou Stray Dogs
  'chuuya', 'dazai', 'atsushi', 'akutagawa', 'mori_ogai',
  // Tensei Slime
  'gobuta', 'diablo', 'soei', 'benimaru_ts', 'guy_crimson',
  // The Legend of Zelda
  'prince_lars', 'goron', 'ganondorf_char', 'piaf',
  // Solo Leveling / Tbate / Eminence in Shadow
  'jinwoo', 'yoo_jin_ho', 'baek_yoon_ho', 'arthur_leywin', 'cid_kagenou',
  // Attaque des Titans
  'connie', 'jean_aot', 'livai', 'eren', 'pixis', 'kenny', 'armin',
  // Spy x Family
  'bond', 'loid', 'damian_desmond',
  // Chainsaw Man
  'aki_csm', 'denji', 'beam', 'kishibe',
  // Fire Force
  'arthur_ff', 'shinra', 'benimaru', 'takehisa_hinawa', 'burns',
  // Fullmetal Alchemist Brotherhood
  'alphonse', 'edward', 'roy', 'pride',
  // Les Carnets de l'Apothicaire
  'jinshi_ap',
  // Overwatch
  'reinhardt', 'reaper_ow',
  // League of Legends
  'maitre_yi', 'braum', 'shaco', 'aatrox_lol', 'amumu',
  // Valkyrie Apocalypse
  'loki_va', 'thor_va', 'adam_va', 'qin_shi_huang', 'jack_eventreur', 'lu_bu', 'hades_va',
  // Tekken
  'claudio', 'jin_tekken', 'jack_8', 'leroy_smith', 'paul_phoenix',
  // Undertale
  'asriel_ut', 'flowey_ut', 'sans_ut', 'papyrus',
  // Five Nights at Freddy's (la Marionnette est désignée au masculin en jeu)
  'bonny_fnaf', 'freddy_fnaf', 'foxy_fnaf', 'puppet',
  // Elden Ring
  'margith', 'godrick_er', 'maliketh',
  // Hollow Knight
  'zote', 'faux_chevalier', 'defenseur_bousier', 'sly', 'nightmare_grimm',
  // Cuphead (Ribby & Croaks sont deux frères)
  'ribby_croaks', 'mugman', 'cuphead_char', 'dragon_cuphead',
  // Minecraft
  'steve',
  // Digital Circus
  'garry_fish', 'gummigoo', 'jax', 'kinger',
  // Poppy Playtime
  'bubba', 'huggy_wuggy', 'catnap', 'doey',
  // R.E.P.O
  'birthday_boy', 'clown_repo',
  // Brotato (le héros est « le Bro-tato », décliné en plusieurs personnages)
  'cyborg', 'fantome', 'explorer', 'demon_brotato',
  // Mario
  'yoshi', 'mario',
  // Hell's Paradise
  'aza_chobe', 'gabimaru',
  // Dark Souls 3
  'champion_gravetender', 'sage_de_cristal', 'roi_sans_nom',
  // Darkest Dungeon
  'brigand_dd', 'bouffon_dd',
  // Clair Obscur
  'renoir', 'verso',
  // Shangri-La Frontier
  'sunraku',
  // Inazuma Eleven
  'zanark', 'xavier_foster', 'paolo_bianchi', 'axel_blaze', 'shawn_frost',
  // Okami
  'okikurumi', 'issun', 'ushiwaka',
  // Valorant
  'phoenix_valo',
  // Death Note
  'ryuk', 'l_dn', 'light_yagami',
  // Evangelion
  'shinji_ikari',
  // JoJo's Bizarre Adventure
  'polnareff', 'josuke_joestar', 'dio_brando', 'joseph_joestar',
  // Soul Eater
  'asura_se', 'death_the_kid', 'soul_evans',
  // Hunter x Hunter
  'leolio', 'kurapika', 'kirua_zoldyck', 'gon_freecss', 'kuroro_lucifer',
  // My Hero Academia
  'eijiro_kirishima', 'shoto_todoroki', 'katsuki_bakugo', 'izuku_midoriya',
  // Jujutsu Kaisen
  'aoi_todo', 'megumi_fushiguro', 'yuta_okkotsu', 'ryomen_sukuna', 'satoru_gojo',
  // Frieren
  'himmel', 'stark',
  // The Elusive Samurai
  'kojiro', 'fubuki', 'hojo_tokiyuki', 'suwa_yorishige',
  // Ravenswatch
  'romeo', 'sun_wukong',
  // Gachiakuta
  'zanka_nijiku', 'rudo_surebrec', 'enjin',
  // To Be Hero X (le Faucheur = Ghostblade)
  'nice_tbhx', 'faucheur_tbhx',
  // Chill&Cool
  'nekoz', 'elfuzzion',
  // Resident Evil
  'leon_kennedy',
];

const FEMALE: string[] = [
  // One Piece (Yamato se présente comme Oden, mais est une femme)
  'boa_hancock', 'yamato', 'nico_robin',
  // Naruto
  'tenten', 'sakura', 'temari',
  // Bleach
  'momo_hinamori', 'orihime_inoue',
  // Demon Slayer
  'nezuko', 'aoi_kanzaki', 'kanao_tsuyuri',
  // Sword Art Online
  'silica', 'asuna', 'alice_sao', 'rosalia', 'yui_sao',
  // Black Clover
  'vanessa_enoteca', 'nero_bc',
  // Danganronpa
  'angie', 'kirigiri', 'celeste_drp', 'aoi_asahina', 'peko_pekoyama', 'junko_enoshima', 'chiaki_nanami',
  // Persona 5
  'violet_p5',
  // Bungou Stray Dogs
  'kyoka_izumi',
  // Tensei Slime
  'millim', 'luminus_valentine',
  // The Legend of Zelda
  'zelda_char', 'machaon',
  // Tbate / Eminence in Shadow
  'alice_leywin', 'tessia_eralith', 'annerose', 'beta_eis', 'alpha_eis',
  // Attaque des Titans
  'mikasa', 'ymir',
  // Spy x Family
  'anya_spy', 'yor',
  // Chainsaw Man
  'kobeni', 'power_csm', 'himeno', 'reze', 'makima',
  // Fire Force
  'haumea_ff', 'hikage', 'hinata_ff', 'ritsu', 'maki_oze',
  // Fullmetal Alchemist Brotherhood
  'riza', 'shao_may',
  // Les Carnets de l'Apothicaire
  'lishu_ap', 'xiaolan_ap', 'lihua_ap', 'mao_mao_ap', 'shisui_ap', 'gyokuyo',
  // Overwatch
  'sombra_ow', 'tracer', 'dva',
  // League of Legends
  'karma_lol', 'jinx_lol', 'zeri', 'ahri',
  // Valkyrie Apocalypse
  'brunhilde',
  // Tekken
  'panda_tekken', 'asuka_kazama',
  // Undertale
  'toriel', 'muffet',
  // Five Nights at Freddy's
  'chica_fnaf', 'circus_baby',
  // Elden Ring
  'melina',
  // Hollow Knight
  'hornet_hk',
  // Digital Circus
  'pomni', 'gangle',
  // Poppy Playtime
  'kissy_missy', 'lily_lovebraids',
  // R.E.P.O
  'bella_repo',
  // Pokémon (espèce exclusivement femelle)
  'latias',
  // Mario
  'toadette', 'peach',
  // Hell's Paradise
  'nurugai', 'yuzuriha',
  // Dark Souls 3
  'danseuse_vallee_boreale',
  // Darkest Dungeon
  'pillarde_dd', 'medecin_de_peste',
  // Clair Obscur
  'lune', 'sciel', 'maelle',
  // Shangri-La Frontier
  'emul', 'arthur_pencilgon', 'psyger_0',
  // Okami
  'amaterasu',
  // Valorant
  'viper', 'fade', 'jett', 'reyna',
  // Death Note
  'misa_amane',
  // Evangelion
  'rei_ayanami', 'maya_ibuki',
  // JoJo's Bizarre Adventure
  'jolyne_joestar',
  // Soul Eater
  'maka_albarn',
  // My Hero Academia
  'tsuyu_asui',
  // Frieren
  'fern', 'frieren',
  // Ravenswatch
  'carmilla', 'juliette',
  // Gachiakuta
  'riyo_reaper', 'amo_empool',
  // To Be Hero X
  'lucky_cyan', 'queen_tbhx',
  // Nos Animaux / Chill&Cool
  'niyunishi', 'ouchuu',
  // Resident Evil
  'sherry_birkin', 'jill_valentine', 'ada_wong',
];

const MIXED: string[] = [
  'link_midona',
];

const OTHER: string[] = [
  // Pokémon (espèces, pas d'individu genré)
  'canarticho', 'tentacool', 'chenipan', 'salamèche', 'carapuce', 'bulbizarre', 'corayon', 'qwilfish', 'queulorior',
  'pichu', 'zorua', 'rayquaza', 'hexagide', 'emolga',
  // Minecraft
  'slime', 'axolotl', 'silverfish', 'spider_mc', 'cochon', 'poulet', 'enderman', 'warden', 'golem_de_fer', 'ender_dragon',
  // Subnautica (espèces sans genre ; l'Empereur des Mers est canoniquement sans genre)
  'reaper_leviathan', 'sea_emperor', 'anguille_tesla', 'leviathan_tenebreux',
  // R.E.P.O (robots et monstres)
  'repo_char', 'bangers', 'the_dress', 'taureau',
  // League of Legends (monstres / sbires)
  'grubs', 'sbire', 'herald',
  // Objets, créatures et genres volontairement ambigus
  'korogu', 'vogue_merry', 'kasugaigarasu', 'boo', 'bastion', 'the_knight', 'emboutisseur_moussu',
  'loup_cramoisi', 'limule', 'envy', 'zooble', 'mangle', 'chara',

  // À CONFIRMER — introuvables en ligne (animaux de la communauté / streamers).
  // Nos Animaux
  'moris', 'twix', 'igloo_na', 'horus_na', 'brume', 'capuchon', 'deux_isis',
  // Chill&Cool
  'rokoul_ayro',
];

export const CHARACTER_GENDERS: Record<string, Gender> = Object.fromEntries([
  ...MALE.map(id => [id, 'male'] as const),
  ...FEMALE.map(id => [id, 'female'] as const),
  ...MIXED.map(id => [id, 'mixed'] as const),
  ...OTHER.map(id => [id, 'other'] as const),
]);

export function getCharacterGender(id: string): Gender {
  return CHARACTER_GENDERS[id] ?? 'other';
}
