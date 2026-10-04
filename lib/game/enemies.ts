import { Enemy } from '@/types/game';
import { type BigNum, bnMulScalar, bnPow } from './bignum';
import { PALIERS } from './paliers';

export const COIN_BASE = 60;
export const COIN_GROWTH = 1.13;
const HP_BASE = 120;
const HP_GROWTH = 1.12;

// PV bruts d'un ennemi (avant hpMult) pour un `global` donné — seule source
// de vérité de la courbe HP, réutilisée par generateEnemy() ET
// getPalierBossHp() pour ne jamais diverger l'une de l'autre.
function baseHpForGlobal(global: number): BigNum {
  return bnMulScalar(bnPow(HP_GROWTH, global - 1), HP_BASE);
}

interface EnemyDef {
  name:    string;
  sprite:  string;
  hpMult?: number;
  isBoss?: boolean;
}

// Même mécanisme que NEW_CARDS_ASSET_VERSION (lib/game/cardAssets.ts) : les
// sprites sont mis en cache 30 jours sous une URL fixe, incrémenter cette
// version force le retéléchargement après un remplacement de fichiers.
export const ENEMY_SPRITES_ASSET_VERSION = 4;

function sp(palier: number, id: string): string {
  return `sprites/enemies/palier${palier}/${id}.png`;
}

function getFallback(wave: number, palier: number): EnemyDef {
  return {
    name:   `Ennemi P${palier}-V${wave}`,
    sprite: sp(palier, `e${wave}`),
    hpMult: 1 + wave * 0.2,
    isBoss: wave === 10,
  };
}

const PALIER_ENEMIES: Record<number, EnemyDef[]> = {
  // ── PALIER 1 : Dragon Ball Z — Arc Saiyan ────────────────────────────────
  1: [
    { name:'Raditz',         sprite: sp(1,'raditz')                              },
    { name:'Saibaman',       sprite: sp(1,'saibaman'),    hpMult:1.15             },
    { name:'Saibaman',       sprite: sp(1,'saibaman2'),   hpMult:1.3             },
    { name:'Saibaman',       sprite: sp(1,'saibaman3'),   hpMult:1.45             },
    { name:'Nappa',          sprite: sp(1,'nappa'),       hpMult:1.6             },
    { name:'Saibaman',       sprite: sp(1,'saibaman4'),   hpMult:1.75             },
    { name:'Saibaman',       sprite: sp(1,'saibaman5'),   hpMult:1.9             },
    { name:'Saibaman',       sprite: sp(1,'saibaman6'),   hpMult:2.05             },
    { name:'Végéta',         sprite: sp(1,'vegeta'),      hpMult:2.2             },
    { name:'Végéta Ozaru',   sprite: sp(1,'vegeta_ozaru'),isBoss:true, hpMult:10  },
  ],
  // ── PALIER 2 : One Piece — Saga East Blue ────────────────────────────────
  2: [
    { name:'Alvida',         sprite: sp(2,'alvida')                              },
    { name:'Morgan',         sprite: sp(2,'morgan'),      hpMult:1.15             },
    { name:'Baggy',          sprite: sp(2,'baggy'),       hpMult:1.3             },
    { name:'Kuro',           sprite: sp(2,'kuro'),        hpMult:1.45             },
    { name:'Don Krieg',      sprite: sp(2,'don_krieg'),   hpMult:1.6             },
    { name:'Mihawk',         sprite: sp(2,'mihawk'),      hpMult:1.75             },
    { name:'Arlong',         sprite: sp(2,'arlong'),      hpMult:1.9             },
    { name:'Baggy',          sprite: sp(2,'baggy2'),      hpMult:2.05             },
    { name:'Baggy',          sprite: sp(2,'baggy3'),      hpMult:2.2             },
    { name:'Smoker',         sprite: sp(2,'smoker'),      isBoss:true, hpMult:10  },
  ],
  // ── PALIER 3 : Naruto — Examen Chūnin ────────────────────────────────────
  3: [
    { name:'Mizuki',         sprite: sp(3,'mizuki')                              },
    { name:'Haku',           sprite: sp(3,'haku'),        hpMult:1.15             },
    { name:'Zabuza',         sprite: sp(3,'zabuza'),      hpMult:1.3             },
    { name:'Orochimaru',     sprite: sp(3,'orochimaru'),  hpMult:1.45             },
    { name:'Neji',           sprite: sp(3,'neji'),        hpMult:1.6             },
    { name:'Gaara',          sprite: sp(3,'gaara'),       hpMult:1.75             },
    { name:'Temari',         sprite: sp(3,'temari'),      hpMult:1.9             },
    { name:'Kabuto',         sprite: sp(3,'kabuto'),      hpMult:2.05             },
    { name:'Orochimaru',     sprite: sp(3,'orochimaru2'), hpMult:2.2             },
    { name:'Shukaku',        sprite: sp(3,'shukaku'),     isBoss:true, hpMult:10  },
  ],
  // ── PALIER 4 : Pokémon — Région de Kanto ─────────────────────────────────
  4: [
    { name:'Pierre & Onix',         sprite: sp(4,'pierre')                          },
    { name:'Ondine & Staross',      sprite: sp(4,'ondine'),     hpMult:1.15          },
    { name:'Bob & Raichu',          sprite: sp(4,'bob'),        hpMult:1.3          },
    { name:'Erika & Rafflesia',     sprite: sp(4,'erika'),      hpMult:1.45          },
    { name:'Koga & Smogogo',        sprite: sp(4,'koga'),       hpMult:1.6          },
    { name:'Morgane & Alakazam',    sprite: sp(4,'morgane'),    hpMult:1.75          },
    { name:'Auguste & Magmar',      sprite: sp(4,'auguste'),    hpMult:1.9          },
    { name:'Giovanni & Rhinéféros', sprite: sp(4,'giovanni'),   hpMult:2.05          },
    { name:'Blue & Roucarnage',     sprite: sp(4,'blue'),       hpMult:2.2          },
    { name:'Mewtwo',                sprite: sp(4,'mewtwo'),     isBoss:true, hpMult:10 },
  ],
  // ── PALIER 5 : Persona 5 — Palais de Tokyo ───────────────────────────────
  5: [
    { name:'Mona',           sprite: sp(5,'mona')                                },
    { name:'Skull',          sprite: sp(5,'skull'),       hpMult:1.15             },
    { name:'Panther',        sprite: sp(5,'panther'),     hpMult:1.3             },
    { name:'Fox',            sprite: sp(5,'fox'),         hpMult:1.45             },
    { name:'Queen',          sprite: sp(5,'queen'),       hpMult:1.6             },
    { name:'Navi',           sprite: sp(5,'navi'),        hpMult:1.75             },
    { name:'Noir',           sprite: sp(5,'noir'),        hpMult:1.9             },
    { name:'Violet',         sprite: sp(5,'violet'),      hpMult:2.05             },
    { name:'Crow',           sprite: sp(5,'crow'),        hpMult:2.2             },
    { name:'Joker',          sprite: sp(5,'joker'),       isBoss:true, hpMult:10  },
  ],
  // ── PALIER 6 : Poppy Playtime — Usine Playtime Co. ───────────────────────
  6: [
    { name:'Huggy Wuggy',      sprite: sp(6,'huggy_wuggy')                        },
    { name:'PJ Pugapillar',    sprite: sp(6,'pj_pugapillar'),  hpMult:1.15         },
    { name:'Mommy Long Legs',  sprite: sp(6,'mommy'),          hpMult:1.3         },
    { name:'Miss Delight',     sprite: sp(6,'miss_delight'),   hpMult:1.45         },
    { name:'Dog Day',          sprite: sp(6,'dog_day'),        hpMult:1.6         },
    { name:'CatNap',           sprite: sp(6,'catnap'),         hpMult:1.75         },
    { name:'The Doctor',       sprite: sp(6,'the_doctor'),     hpMult:1.9         },
    { name:'Doey',             sprite: sp(6,'doey'),           hpMult:2.05         },
    { name:'Lily Lovebraids',  sprite: sp(6,'lily'),           hpMult:2.2         },
    { name:'The Prototype',    sprite: sp(6,'prototype'),      isBoss:true, hpMult:10 },
  ],
  // ── PALIER 7 : Black Clover — Royaume de Clover ──────────────────────────
  7: [
    { name:'Revchi Salik',       sprite: sp(7,'revchi')                             },
    { name:'Mars',               sprite: sp(7,'mars'),          hpMult:1.15          },
    { name:'Rades Spirito',      sprite: sp(7,'rades'),         hpMult:1.3          },
    { name:'Vetto',              sprite: sp(7,'vetto'),         hpMult:1.45          },
    { name:'Ladros',             sprite: sp(7,'ladros'),        hpMult:1.6          },
    { name:'Patolli (Licht)',    sprite: sp(7,'patolli'),       hpMult:1.75          },
    { name:'Zagred (Le Démon)',  sprite: sp(7,'zagred'),        hpMult:1.9          },
    { name:'Vanica Zogratis',    sprite: sp(7,'vanica'),        hpMult:2.05          },
    { name:'Zenon Zogratis',     sprite: sp(7,'zenon'),         hpMult:2.2          },
    { name:'Dante Zogratis',     sprite: sp(7,'dante'),         isBoss:true, hpMult:10 },
  ],
  // ── PALIER 8 : Brotato — Terres de Brotato ───────────────────────────────
  8: [
    { name:'Baby Alien',        sprite: sp(8,'baby_alien')                          },
    { name:'Chaser',            sprite: sp(8,'chaser'),        hpMult:1.15           },
    { name:'Spitter',           sprite: sp(8,'spitter'),       hpMult:1.3           },
    { name:'Charger',           sprite: sp(8,'charger'),       hpMult:1.45           },
    { name:'Pursuer',           sprite: sp(8,'pursuer'),       hpMult:1.6           },
    { name:'Bruiser',           sprite: sp(8,'bruiser'),       hpMult:1.75           },
    { name:'Hornder Bruiser',   sprite: sp(8,'hornder'),       hpMult:1.9           },
    { name:'Slasher',           sprite: sp(8,'slasher'),       hpMult:2.05           },
    { name:'Invoker',           sprite: sp(8,'invoker'),       hpMult:2.2           },
    { name:'Dead Whale',        sprite: sp(8,'dead_whale'),    isBoss:true, hpMult:10 },
  ],
  // ── PALIER 9 : Slime Datta Ken — Monde de Jura Tempest ───────────────────
  9: [
    { name:'Gobelin',           sprite: sp(9,'gobelin')                             },
    { name:'Loup Tempête',      sprite: sp(9,'loup_tempete'),  hpMult:1.15           },
    { name:'Orc',               sprite: sp(9,'orc'),           hpMult:1.3           },
    { name:'Ogre',              sprite: sp(9,'ogre'),          hpMult:1.45           },
    { name:'Gabiru',            sprite: sp(9,'gabiru'),        hpMult:1.6           },
    { name:'Geld',              sprite: sp(9,'geld'),          hpMult:1.75           },
    { name:'Charybde',          sprite: sp(9,'charybde'),      hpMult:1.9           },
    { name:'Hinata',            sprite: sp(9,'hinata'),        hpMult:2.05           },
    { name:'Clayman',           sprite: sp(9,'clayman'),       hpMult:2.2           },
    { name:'Yuki',              sprite: sp(9,'yuki'),          isBoss:true, hpMult:10 },
  ],
  // ── PALIER 10 : Minecraft — Overworld ────────────────────────────────────
  10: [
    { name:'Zombie',            sprite: sp(10,'zombie')                              },
    { name:'Squelette',         sprite: sp(10,'squelette'),    hpMult:1.15            },
    { name:'Araignée',          sprite: sp(10,'araignee'),     hpMult:1.3            },
    { name:'Creeper',           sprite: sp(10,'creeper'),      hpMult:1.45            },
    { name:'Slime',             sprite: sp(10,'slime'),        hpMult:1.6            },
    { name:'Witch',             sprite: sp(10,'witch'),        hpMult:1.75            },
    { name:'Pillager',          sprite: sp(10,'pillager'),     hpMult:1.9            },
    { name:'Ravager',           sprite: sp(10,'ravager'),      hpMult:2.05            },
    { name:'Guardian',          sprite: sp(10,'guardian'),     hpMult:2.2            },
    { name:'Elder Guardian',    sprite: sp(10,'elder_guardian'),isBoss:true, hpMult:10 },
  ],
  // ── PALIER 11 : Subnautica — Planète 4546B ───────────────────────────────
  11: [
    { name:'Peeper',            sprite: sp(11,'peeper')                              },
    { name:'Gazopode',          sprite: sp(11,'gazopode'),     hpMult:1.15            },
    { name:'Rôdeur',            sprite: sp(11,'rodeur'),       hpMult:1.3            },
    { name:'Requin Cuirassé',   sprite: sp(11,'requin'),       hpMult:1.45            },
    { name:'Anguille Tesla',    sprite: sp(11,'anguille'),     hpMult:1.6            },
    { name:'Calmar Crabe',      sprite: sp(11,'calmar'),       hpMult:1.75            },
    { name:'Reefback Leviathan',sprite: sp(11,'reefback'),     hpMult:1.9            },
    { name:'Reaper Leviathan',  sprite: sp(11,'reaper_lev'),   hpMult:2.05            },
    { name:'Ghost Leviathan',   sprite: sp(11,'ghost_lev'),    hpMult:2.2            },
    { name:'Sea Emperor Leviathan',sprite:sp(11,'sea_emperor'),isBoss:true, hpMult:10 },
  ],
  // ── PALIER 12 : Bleach — Société des Âmes ────────────────────────────────
  12: [
    { name:'Hollow',            sprite: sp(12,'hollow')                              },
    { name:'Grand Fisher',      sprite: sp(12,'grand_fisher'), hpMult:1.15            },
    { name:'Ikkaku',            sprite: sp(12,'ikkaku'),       hpMult:1.3            },
    { name:'Renji',             sprite: sp(12,'renji'),        hpMult:1.45            },
    { name:'Kenpachi',          sprite: sp(12,'kenpachi'),     hpMult:1.6            },
    { name:'Byakuya',           sprite: sp(12,'byakuya'),      hpMult:1.75            },
    { name:'Grimmjow',          sprite: sp(12,'grimmjow'),     hpMult:1.9            },
    { name:'Ulquiorra',         sprite: sp(12,'ulquiorra'),    hpMult:2.05            },
    { name:'Aizen',             sprite: sp(12,'aizen'),        hpMult:2.2            },
    { name:'Yhwach',            sprite: sp(12,'yhwach'),       isBoss:true, hpMult:10 },
  ],
  // ── PALIER 13 : Fate — Guerre du Saint Graal ─────────────────────────────
  13: [
    { name:'Enkidu',                     sprite: sp(13,'enkidu')                          },
    { name:'Héraclès (Strange/Fake)',    sprite: sp(13,'hercules_sf'),  hpMult:1.15        },
    { name:'Mordred',                    sprite: sp(13,'mordred'),      hpMult:1.3        },
    { name:'Héraclès (UBW)',             sprite: sp(13,'hercules_ubw'), hpMult:1.45        },
    { name:'Karna',                      sprite: sp(13,'karna'),        hpMult:1.6        },
    { name:'Cu Chulainn',                sprite: sp(13,'cu_chulainn'),  hpMult:1.75        },
    { name:'Emiya Shirou',               sprite: sp(13,'emiya_shirou'), hpMult:1.9        },
    { name:'Achilles',                   sprite: sp(13,'achilles'),     hpMult:2.05        },
    { name:'Richard Coeur de Lion',      sprite: sp(13,'richard'),      hpMult:2.2        },
    { name:'Iskandar',                   sprite: sp(13,'iskandar'),     isBoss:true, hpMult:10 },
  ],
  // ── PALIER 14 : Zelda — Royaume du Crépuscule ────────────────────────────
  14: [
    // ⚠️ Sprite manquant : aucun fichier public/sprites/enemies/palier14/iria.*
    // n'existe encore — affiche un placeholder tant que l'image n'est pas ajoutée.
    { name:'Iria',                sprite: sp(14,'iria')                                },
    { name:'Telma',               sprite: sp(14,'telma'),         hpMult:1.15           },
    { name:'Machaon',             sprite: sp(14,'machaon'),       hpMult:1.3           },
    { name:'Link Loup',           sprite: sp(14,'link_wolf'),     hpMult:1.45           },
    { name:'Agent du Crépuscule', sprite: sp(14,'agent_crepusc'), hpMult:1.6           },
    { name:'Matornia (Maléfique)',sprite: sp(14,'matornia'),      hpMult:1.75           },
    { name:'Gor Cobalt',          sprite: sp(14,'gor_cobalt'),    hpMult:1.9           },
    { name:'Roi Bulbin',          sprite: sp(14,'roi_bulbin'),    hpMult:2.05           },
    { name:'Xanto',               sprite: sp(14,'xanto'),         hpMult:2.2           },
    { name:'Ganondorf',           sprite: sp(14,'ganondorf'),     isBoss:true, hpMult:10 },
  ],
  // ── PALIER 15 : R.E.P.O — Univers R.E.P.O ───────────────────────────────
  15: [
    { name:'Gnome',                     sprite: sp(15,'gnome')                            },
    { name:'Vélo',                      sprite: sp(15,'velo'),              hpMult:1.15    },
    { name:'Rugrat',                    sprite: sp(15,'rugrat'),            hpMult:1.3    },
    { name:'Folle du Bus',              sprite: sp(15,'folle_bus'),         hpMult:1.45    },
    { name:'Chasseur',                  sprite: sp(15,'chasseur'),          hpMult:1.6    },
    { name:'Moche qui Jète sa Tête',    sprite: sp(15,'moche_tete'),        hpMult:1.75    },
    { name:'Crane',                     sprite: sp(15,'crane'),             hpMult:1.9    },
    { name:'Laser',                     sprite: sp(15,'laser'),             hpMult:2.05    },
    { name:'Dress',                     sprite: sp(15,'dress'),             hpMult:2.2    },
    { name:'Nonne',                     sprite: sp(15,'nonne'),             isBoss:true, hpMult:10 },
  ],
  // ── PALIER 16 : Danganronpa — Académie Kibougamine ───────────────────────
  16: [
    { name:'Kirigiri',           sprite: sp(16,'kirigiri')                            },
    { name:'Chiaki',             sprite: sp(16,'chiaki'),        hpMult:1.15           },
    { name:'Fuyuhiko',           sprite: sp(16,'fuyuhiko'),      hpMult:1.3           },
    { name:'Miu',                sprite: sp(16,'miu'),           hpMult:1.45           },
    { name:'Peko',               sprite: sp(16,'peko'),          hpMult:1.6           },
    { name:'Korekiyo',           sprite: sp(16,'korekiyo'),      hpMult:1.75           },
    { name:'Celeste',            sprite: sp(16,'celeste'),       hpMult:1.9           },
    { name:'Kiibo',              sprite: sp(16,'kiibo'),         hpMult:2.05           },
    { name:'Rantaro',            sprite: sp(16,'rantaro'),       hpMult:2.2           },
    { name:'Maki',               sprite: sp(16,'maki'),          isBoss:true, hpMult:10 },
  ],
  // ── PALIER 17 : Digital Circus — Chapiteau du Cirque ─────────────────────
  17: [
    { name:'Ragatha',            sprite: sp(17,'ragatha')                             },
    { name:'Gangle',             sprite: sp(17,'gangle'),        hpMult:1.15           },
    { name:'Zooble',             sprite: sp(17,'zooble'),        hpMult:1.3           },
    { name:'Crappy',             sprite: sp(17,'crappy'),        hpMult:1.45           },
    { name:'Abel',               sprite: sp(17,'abel'),          hpMult:1.6           },
    { name:'Pomni',              sprite: sp(17,'pomni'),         hpMult:1.75           },
    { name:'Jax',               sprite: sp(17,'jax'),           hpMult:1.9           },
    { name:'Kinger',             sprite: sp(17,'kinger'),        hpMult:2.05           },
    { name:'Bubble',             sprite: sp(17,'bubble'),        hpMult:2.2           },
    { name:'Caine',              sprite: sp(17,'caine'),         isBoss:true, hpMult:10 },
  ],
  // ── PALIER 18 : Sword Art Online — Aincrad ───────────────────────────────
  18: [
    { name:'Illfang',                    sprite: sp(18,'illfang')                           },
    { name:'The Gleam Eyes',             sprite: sp(18,'gleam_eyes'),    hpMult:1.15         },
    { name:'Kuradeel',                   sprite: sp(18,'kuradeel'),      hpMult:1.3         },
    { name:'Rosalia',                    sprite: sp(18,'rosalia'),       hpMult:1.45         },
    { name:'Death Gun',                  sprite: sp(18,'death_gun'),     hpMult:1.6         },
    { name:'PoH',                        sprite: sp(18,'poh'),           hpMult:1.75         },
    { name:'Chudelkin',                  sprite: sp(18,'chudelkin'),     hpMult:1.9         },
    { name:'Quinella',                   sprite: sp(18,'quinella'),      hpMult:2.05         },
    { name:'Dark God Vecta (Gabriel)',   sprite: sp(18,'gabriel'),       hpMult:2.2         },
    { name:'Subtilizer (Forme Finale)',  sprite: sp(18,'subtilizer'),    isBoss:true, hpMult:10 },
  ],
  // ── PALIER 19 : Bungo Stray Dogs — Yokohama ──────────────────────────────
  19: [
    { name:'Naomie',             sprite: sp(19,'naomie')                              },
    { name:"Jun'ichi",           sprite: sp(19,'junichi'),       hpMult:1.15           },
    { name:'Ranpo',              sprite: sp(19,'ranpo'),         hpMult:1.3           },
    { name:'Kunikida',           sprite: sp(19,'kunikida'),      hpMult:1.45           },
    { name:'Kenji',              sprite: sp(19,'kenji'),         hpMult:1.6           },
    { name:'Kyouka',             sprite: sp(19,'kyouka'),        hpMult:1.75           },
    { name:'Mori',               sprite: sp(19,'mori'),          hpMult:1.9           },
    { name:'Atsushi',            sprite: sp(19,'atsushi'),       hpMult:2.05           },
    { name:'Akutagawa',          sprite: sp(19,'akutagawa'),     hpMult:2.2           },
    { name:'Fyodor',             sprite: sp(19,'fyodor'),        isBoss:true, hpMult:10 },
  ],
  // ── PALIER 20 : Overwatch — Maps Overwatch ───────────────────────────────
  20: [
    { name:'Sombra',             sprite: sp(20,'sombra')                              },
    { name:'Widow',              sprite: sp(20,'widow'),         hpMult:1.15           },
    { name:'Sigma',              sprite: sp(20,'sigma'),         hpMult:1.3           },
    { name:'Emre',               sprite: sp(20,'emre'),          hpMult:1.45           },
    { name:'Domina',             sprite: sp(20,'domina'),        hpMult:1.6           },
    { name:'Moira',              sprite: sp(20,'moira'),         hpMult:1.75           },
    { name:'Mauga',              sprite: sp(20,'mauga'),         hpMult:1.9           },
    { name:'Reaper',             sprite: sp(20,'reaper'),        hpMult:2.05           },
    { name:'Doomfist',           sprite: sp(20,'doomfist'),      hpMult:2.2           },
    { name:'Vendetta',           sprite: sp(20,'vendetta'),      isBoss:true, hpMult:10 },
  ],
  // ── PALIER 21 : Les Carnets de l'Apothicaire — Le Pavillon de Jade ───────
  21: [
    { name:'Lishu',              sprite: sp(21,'lishu')                               },
    { name:'Lihua',              sprite: sp(21,'lihua'),         hpMult:1.15           },
    { name:'Xiaolan',            sprite: sp(21,'xiaolan'),       hpMult:1.3           },
    { name:'Lihaku',             sprite: sp(21,'lihaku'),        hpMult:1.45           },
    { name:'Gyokyu',             sprite: sp(21,'gyokyu'),        hpMult:1.6           },
    { name:'Shisui',             sprite: sp(21,'shisui'),        hpMult:1.75           },
    { name:'Gaoshun',            sprite: sp(21,'gaoshun'),       hpMult:1.9           },
    { name:'Mao Mao',            sprite: sp(21,'mao_mao'),       hpMult:2.05           },
    { name:'Lakan',              sprite: sp(21,'lakan'),         hpMult:2.2           },
    { name:'Jinshi',             sprite: sp(21,'jinshi'),        isBoss:true, hpMult:10 },
  ],
  // ── PALIER 22 : Chainsaw Man — Secteur de la Sécurité Publique ───────────
  22: [
    { name:'Kobeni',             sprite: sp(22,'kobeni')                              },
    { name:'Beam',               sprite: sp(22,'beam'),          hpMult:1.15           },
    { name:'Démon Ange',         sprite: sp(22,'demon_ange'),    hpMult:1.3           },
    { name:'Himeno',             sprite: sp(22,'himeno'),        hpMult:1.45           },
    { name:'Katana',             sprite: sp(22,'katana'),        hpMult:1.6           },
    { name:'Reze',               sprite: sp(22,'reze'),          hpMult:1.75           },
    { name:'Power',              sprite: sp(22,'power'),         hpMult:1.9           },
    { name:'Aki',                sprite: sp(22,'aki'),           hpMult:2.05           },
    { name:'Pochita',            sprite: sp(22,'pochita'),       hpMult:2.2           },
    { name:'Makima',             sprite: sp(22,'makima'),        isBoss:true, hpMult:10 },
  ],
  // ── PALIER 23 : Spy x Family — Opération Strix ───────────────────────────
  23: [
    { name:'Becky',              sprite: sp(23,'becky')                               },
    { name:'Franky',             sprite: sp(23,'franky'),        hpMult:1.15           },
    { name:'Damian',             sprite: sp(23,'damian'),        hpMult:1.3           },
    { name:'Bond',               sprite: sp(23,'bond'),          hpMult:1.45           },
    { name:'Henry',              sprite: sp(23,'henry'),         hpMult:1.6           },
    { name:'Fiona',              sprite: sp(23,'fiona'),         hpMult:1.75           },
    { name:'Anya',               sprite: sp(23,'anya'),          hpMult:1.9           },
    { name:'Yuri',               sprite: sp(23,'yuri'),          hpMult:2.05           },
    { name:'Yor',                sprite: sp(23,'yor'),           hpMult:2.2           },
    { name:'Loid',               sprite: sp(23,'loid'),          isBoss:true, hpMult:10 },
  ],
  // ── PALIER 24 : Dragon Ball — Arc Namek ──────────────────────────────────
  24: [
    { name:'Soldat de Freezer',  sprite: sp(24,'soldat')                              },
    { name:'Dodoria',            sprite: sp(24,'dodoria'),       hpMult:1.15           },
    { name:'Zarbon',             sprite: sp(24,'zarbon'),        hpMult:1.3           },
    { name:'Reacoom',            sprite: sp(24,'reacoom'),       hpMult:1.45           },
    { name:'Jeice',              sprite: sp(24,'jeice'),         hpMult:1.6           },
    { name:'Burter',             sprite: sp(24,'burter'),        hpMult:1.75           },
    { name:'Guldo',              sprite: sp(24,'guldo'),         hpMult:1.9           },
    { name:'Ginyu',              sprite: sp(24,'ginyu'),         hpMult:2.05           },
    { name:'Freezer',            sprite: sp(24,'freezer'),       hpMult:2.2           },
    { name:'Freezer Forme Finale',sprite:sp(24,'freezer_final'),isBoss:true, hpMult:10 },
  ],
  // ── PALIER 25 : Demon Slayer — Infinite Castle ────────────────────────────
  25: [
    { name:'Kyogai',             sprite: sp(25,'kyogai')                              },
    { name:'Enmu',               sprite: sp(25,'enmu'),          hpMult:1.15           },
    { name:'Daki',               sprite: sp(25,'daki'),          hpMult:1.3           },
    { name:'Gyutaro',            sprite: sp(25,'gyutaro'),       hpMult:1.45           },
    { name:'Kaigaku',            sprite: sp(25,'kaigaku'),       hpMult:1.6           },
    { name:'Nakime',             sprite: sp(25,'nakime'),        hpMult:1.75           },
    { name:'Akaza',              sprite: sp(25,'akaza'),         hpMult:1.9           },
    { name:'Doma',               sprite: sp(25,'doma'),          hpMult:2.05           },
    { name:'Kokushibo',          sprite: sp(25,'kokushibo'),     hpMult:2.2           },
    { name:'Muzan Kibutsuji',    sprite: sp(25,'muzan'),         isBoss:true, hpMult:10 },
  ],
  // ── PALIER 26 : Fire Force — The Great Cataclysm ─────────────────────────
  26: [
    { name:'Ritsu',              sprite: sp(26,'ritsu')                               },
    { name:'Assault',            sprite: sp(26,'assault'),       hpMult:1.15           },
    { name:'Inca',               sprite: sp(26,'inca'),          hpMult:1.3           },
    { name:'Charon',             sprite: sp(26,'charon'),        hpMult:1.45           },
    { name:'Arrow',              sprite: sp(26,'arrow'),         hpMult:1.6           },
    { name:'Sumire',             sprite: sp(26,'sumire'),        hpMult:1.75           },
    { name:'Giovanni',           sprite: sp(26,'giovanni'),      hpMult:1.9           },
    { name:'Haumea',             sprite: sp(26,'haumea'),        hpMult:2.05           },
    { name:'Sho',                sprite: sp(26,'sho'),           hpMult:2.2           },
    { name:'Grand Predicator',   sprite: sp(26,'grand_pred'),    isBoss:true, hpMult:10 },
  ],
  // ── PALIER 27 : Fullmetal Alchemist Brotherhood — Amestris ───────────────
  27: [
    { name:'May Chang',          sprite: sp(27,'may_chang')                           },
    { name:'Winry Rockbell',     sprite: sp(27,'winry'),         hpMult:1.15           },
    { name:'Shou Tucker',        sprite: sp(27,'tucker'),        hpMult:1.3           },
    { name:'Lust',               sprite: sp(27,'lust'),          hpMult:1.45           },
    { name:'Sloth',              sprite: sp(27,'sloth'),         hpMult:1.6           },
    { name:'Greed',              sprite: sp(27,'greed'),         hpMult:1.75           },
    { name:'Scar',               sprite: sp(27,'scar'),          hpMult:1.9           },
    { name:'Father Cornello',    sprite: sp(27,'cornello'),      hpMult:2.05           },
    { name:'Selim Bradley',      sprite: sp(27,'selim'),         hpMult:2.2           },
    { name:'King Bradley',       sprite: sp(27,'king_bradley'),  isBoss:true, hpMult:10 },
  ],
  // ── PALIER 28 : League of Legends — La Faille de l'Invocateur ────────────
  28: [
    { name:'Diana',              sprite: sp(28,'diana')                               },
    { name:'Warwick',            sprite: sp(28,'warwick'),       hpMult:1.15           },
    { name:'Naafiri',            sprite: sp(28,'naafiri'),       hpMult:1.3           },
    { name:'Mundo',              sprite: sp(28,'mundo'),         hpMult:1.45           },
    { name:'Ezreal',             sprite: sp(28,'ezreal'),        hpMult:1.6           },
    { name:'Vi',                 sprite: sp(28,'vi'),            hpMult:1.75           },
    { name:'Zeri',               sprite: sp(28,'zeri'),          hpMult:1.9           },
    { name:'Irelia',             sprite: sp(28,'irelia'),        hpMult:2.05           },
    { name:'Jinx',               sprite: sp(28,'jinx'),          hpMult:2.2           },
    { name:'Aatrox',             sprite: sp(28,'aatrox'),        isBoss:true, hpMult:10 },
  ],
  // ── PALIER 29 : One Piece — Alabasta ─────────────────────────────────────
  29: [
    { name:'Miss Monday',        sprite: sp(29,'miss_monday')                         },
    { name:'Mr 9',               sprite: sp(29,'mr9'),           hpMult:1.15           },
    { name:'Mr 8',               sprite: sp(29,'mr8'),           hpMult:1.3           },
    { name:'Miss Valentine',     sprite: sp(29,'miss_valentine'),hpMult:1.45           },
    { name:'Miss GoldenWeek',    sprite: sp(29,'miss_goldenweek'),hpMult:1.6          },
    { name:'Mr 5',               sprite: sp(29,'mr5'),           hpMult:1.75           },
    { name:'Mr 3',               sprite: sp(29,'mr3'),           hpMult:1.9           },
    { name:'Mr 2 Bon Clay',      sprite: sp(29,'mr2'),           hpMult:2.05           },
    { name:'Mr 1',               sprite: sp(29,'mr1'),           hpMult:2.2           },
    { name:'Crocodile',          sprite: sp(29,'crocodile'),     isBoss:true, hpMult:10 },
  ],
  // ── PALIER 30 : Nos Animaux — Le Royaume des Animaux ─────────────────────
  // ⚠️ Sprites partiellement manquants : igloo/twix/maurice/horus/brume/isis
  // ont été dupliqués depuis leurs cartes compagnon (Nos Animaux, Evo0).
  // Osiris, Gardien Ancestral, Ombre Sacrée et Capuchon affichent un
  // placeholder tant qu'aucune image dédiée n'a été ajoutée.
  30: [
    { name:'Igloo',              sprite: sp(30,'igloo')                               },
    { name:'Twix',               sprite: sp(30,'twix'),          hpMult:1.15           },
    { name:'Maurice',            sprite: sp(30,'maurice'),       hpMult:1.3           },
    { name:'Osiris',             sprite: sp(30,'osiris'),        hpMult:1.45           },
    { name:'Les Deux Isis',      sprite: sp(30,'isis'),          hpMult:1.6           },
    { name:'Gardien Ancestral',  sprite: sp(30,'gardien'),       hpMult:1.75           },
    { name:'Ombre Sacrée',       sprite: sp(30,'ombre'),         hpMult:1.9           },
    { name:'Capuchon',           sprite: sp(30,'capuchon'),      hpMult:2.05           },
    { name:'Horus',              sprite: sp(30,'horus'),         hpMult:2.2           },
    { name:'Brume',              sprite: sp(30,'brume'),         isBoss:true, hpMult:10 },
  ],
  // ── PALIER 31 : Valkyrie Apocalypse — Le Royaume des Dieux ──────────────
  31: [
    { name:'Thor',               sprite: sp(31,'thor')                                },
    { name:'Zeus',               sprite: sp(31,'zeus'),          hpMult:1.15           },
    { name:'Poséidon',           sprite: sp(31,'poseidon'),      hpMult:1.3           },
    { name:'Hercule',            sprite: sp(31,'hercule'),       hpMult:1.45           },
    { name:'Shiva',              sprite: sp(31,'shiva'),         hpMult:1.6           },
    { name:'Zerofuku',           sprite: sp(31,'zerofuku'),      hpMult:1.75           },
    { name:'Hades',              sprite: sp(31,'hades'),         hpMult:1.9           },
    { name:'Belzébuth',          sprite: sp(31,'beelzebub'),     hpMult:2.05           },
    { name:'Apollon',            sprite: sp(31,'apollon'),       hpMult:2.2           },
    { name:'Loki',               sprite: sp(31,'loki'),          isBoss:true, hpMult:10 },
  ],
  // ── PALIER 32 : Hollow Knight — Le Royaume d'Hallownest ──────────────────
  32: [
    { name:'Le Faux Chevalier',    sprite: sp(32,'false_knight')                       },
    { name:'Sly',                  sprite: sp(32,'sly'),           hpMult:1.15          },
    { name:'Le Défenseur Bousiller',sprite:sp(32,'dung_defender'),  hpMult:1.3          },
    { name:'Le Vaisseau Corrompu', sprite: sp(32,'vessel_corrupt'), hpMult:1.45          },
    { name:'Hornet',               sprite: sp(32,'hornet'),         hpMult:1.6          },
    { name:"L'Hollow Knight",      sprite: sp(32,'hollow_knight'),  hpMult:1.75          },
    { name:'Zote le Redoutable',   sprite: sp(32,'zote'),           hpMult:1.9          },
    { name:'Le Vaisseau Pur',      sprite: sp(32,'pure_vessel'),    hpMult:2.05          },
    { name:'Nightmare Grimm',      sprite: sp(32,'grimm'),          hpMult:2.2          },
    { name:'Radiance Véritable',   sprite: sp(32,'radiance'),       isBoss:true, hpMult:10 },
  ],
  // ── PALIER 33 : L'Attaque des Titans — L'Île de Paradis ──────────────────
  33: [
    { name:'Titan Déviant',        sprite: sp(33,'titan_deviant')                       },
    { name:'Titan Féminin',        sprite: sp(33,'titan_feminin'), hpMult:1.15            },
    { name:'Titan Charrette',      sprite: sp(33,'titan_chariot'), hpMult:1.3            },
    { name:"Titan Marteau d'Armes",sprite: sp(33,'titan_marteau'), hpMult:1.45            },
    { name:'Titan Bestial',        sprite: sp(33,'titan_bestial'), hpMult:1.6            },
    { name:'Titan Machoir',        sprite: sp(33,'titan_machoir'), hpMult:1.75            },
    { name:'Titan Colossal',       sprite: sp(33,'titan_colossal'),hpMult:1.9            },
    { name:'Titan Cuirassé',       sprite: sp(33,'titan_cuirasse'),hpMult:2.05            },
    { name:'Titan Assaillant',     sprite: sp(33,'titan_assault'), hpMult:2.2            },
    { name:'Titan Originel',       sprite: sp(33,'titan_origin'),  isBoss:true, hpMult:10 },
  ],
  // ── PALIER 34 : Cuphead — Le Pays des Délices ────────────────────────────
  34: [
    { name:'Goopy Le Gluant',      sprite: sp(34,'goopy')                               },
    { name:'Hilda Berg',           sprite: sp(34,'hilda'),         hpMult:1.15            },
    { name:'Cagney Carnation',     sprite: sp(34,'cagney'),        hpMult:1.3            },
    { name:'Baroness Von Bon Bon', sprite: sp(34,'baroness'),      hpMult:1.45            },
    { name:'Grim Matchstick',      sprite: sp(34,'grim'),          hpMult:1.6            },
    { name:'Rumor Honeybottoms',   sprite: sp(34,'rumor'),         hpMult:1.75            },
    { name:"Dr. Kahl's Robot",     sprite: sp(34,'kahl_robot'),    hpMult:1.9            },
    { name:'Mr. Wheezy',           sprite: sp(34,'mr_wheezy'),     hpMult:2.05            },
    { name:'King Dice',            sprite: sp(34,'king_dice'),     hpMult:2.2            },
    { name:'Le Diable',            sprite: sp(34,'diable'),        isBoss:true, hpMult:10 },
  ],
  // ── PALIER 35 : Fate — Le Saint Graal ────────────────────────────────────
  35: [
    { name:'Emiya Kiritsugu',               sprite: sp(35,'kiritsugu')                           },
    { name:'Flat',                          sprite: sp(35,'flat'),            hpMult:1.15          },
    { name:'Gawain',                        sprite: sp(35,'gawain'),          hpMult:1.3          },
    { name:'Ozymandias',                    sprite: sp(35,'ozymandias'),      hpMult:1.45          },
    { name:'Rin Tohsaka',                   sprite: sp(35,'rin'),             hpMult:1.6          },
    { name:'Artoria Pendragon (Lancer)',    sprite: sp(35,'artoria_lancer'),  hpMult:1.75          },
    { name:"Jeanne d'Arc Alter",            sprite: sp(35,'jeanne_alter'),    hpMult:1.9          },
    { name:'Kirei Kotomine',                sprite: sp(35,'kotomine'),        hpMult:2.05          },
    { name:"Jack l'Éventreur",              sprite: sp(35,'jack'),            hpMult:2.2          },
    { name:'Waver Velvet',                  sprite: sp(35,'waver'),           isBoss:true, hpMult:10 },
  ],
  // ── PALIER 36 : Five Nights At Freddy's — Freddy's Fazbear Pizza ─────────
  36: [
    { name:'Freddy Fazbear',       sprite: sp(36,'freddy')                               },
    { name:'Chica',                sprite: sp(36,'chica'),         hpMult:1.15            },
    { name:'Bonnie',               sprite: sp(36,'bonnie'),        hpMult:1.3            },
    { name:'Foxy',                 sprite: sp(36,'foxy'),          hpMult:1.45            },
    { name:'Balloon Boy',          sprite: sp(36,'balloon_boy'),   hpMult:1.6            },
    { name:'Vanny',                sprite: sp(36,'vanny'),         hpMult:1.75            },
    { name:'Ennard',               sprite: sp(36,'ennard'),        hpMult:1.9            },
    { name:'Circus Baby',          sprite: sp(36,'circus_baby'),   hpMult:2.05            },
    { name:'Puppet',               sprite: sp(36,'puppet'),        hpMult:2.2            },
    { name:'Springtrap',           sprite: sp(36,'springtrap'),    isBoss:true, hpMult:10 },
  ],
  // ── PALIER 37 : Tekken — Le Tournoi du Roi du Poing ──────────────────────
  37: [
    { name:'Jun Kazama',           sprite: sp(37,'jun')                                  },
    { name:'Nina Williams',        sprite: sp(37,'nina'),          hpMult:1.15            },
    { name:'Panda',                sprite: sp(37,'panda'),         hpMult:1.3            },
    { name:'Paul Phoenix',         sprite: sp(37,'paul'),          hpMult:1.45            },
    { name:'Yoshimitsu',           sprite: sp(37,'yoshimitsu'),    hpMult:1.6            },
    { name:'King',                 sprite: sp(37,'king'),          hpMult:1.75            },
    { name:'Reina',                sprite: sp(37,'reina'),         hpMult:1.9            },
    { name:'Heihachi Mishima',     sprite: sp(37,'heihachi'),      hpMult:2.05            },
    { name:'Jin Kazama Evil',      sprite: sp(37,'jin_evil'),      hpMult:2.2            },
    { name:'Kazuya Mishima',       sprite: sp(37,'kazuya'),        isBoss:true, hpMult:10 },
  ],
  // ── PALIER 38 : Undertale — Le Monde Souterrain ──────────────────────────
  38: [
    { name:'Alphys',               sprite: sp(38,'alphys')                               },
    { name:'Papyrus',              sprite: sp(38,'papyrus'),       hpMult:1.15            },
    { name:'Toriel',               sprite: sp(38,'toriel'),        hpMult:1.3            },
    { name:'Mettaton',             sprite: sp(38,'mettaton'),      hpMult:1.45            },
    { name:'Undyne',               sprite: sp(38,'undyne'),        hpMult:1.6            },
    { name:'Frisk',                sprite: sp(38,'frisk'),         hpMult:1.75            },
    { name:'Asgore',               sprite: sp(38,'asgore'),        hpMult:1.9            },
    { name:'Asriel',               sprite: sp(38,'asriel'),        hpMult:2.05            },
    { name:'Sans',                 sprite: sp(38,'sans'),          hpMult:2.2            },
    { name:'Flowey',               sprite: sp(38,'flowey'),        isBoss:true, hpMult:10 },
  ],
  // ── PALIER 39 : Pokémon — Région de Johto ────────────────────────────────
  // NOTE : Ennemis non renseignés dans le doc → Arènes de Johto
  39: [
    { name:'Falkner & Aéroptéryx', sprite: sp(39,'falkner')                              },
    { name:'Bugsy & Scarhino',     sprite: sp(39,'bugsy'),         hpMult:1.15            },
    { name:'Whitney & Grodoudou',  sprite: sp(39,'whitney'),       hpMult:1.3            },
    { name:'Morty & Ectoplasma',   sprite: sp(39,'morty'),         hpMult:1.45            },
    { name:'Chuck & Tygnon',       sprite: sp(39,'chuck'),         hpMult:1.6            },
    { name:'Jasmine & Steelix',    sprite: sp(39,'jasmine'),       hpMult:1.75            },
    { name:'Pryce & Lakmécygne',   sprite: sp(39,'pryce'),         hpMult:1.9            },
    { name:'Clair & Drakély',      sprite: sp(39,'clair'),         hpMult:2.05            },
    { name:'Silver',               sprite: sp(39,'silver'),        hpMult:2.2            },
    { name:'Red',                  sprite: sp(39,'red'),           isBoss:true, hpMult:10 },
  ],
  // ── PALIER 40 : Elden Ring — Le Royaume de l'Entre-Terre ─────────────────
  40: [
    { name:'Margit',               sprite: sp(40,'margit')                               },
    { name:'Godrick',              sprite: sp(40,'godrick'),        hpMult:1.15            },
    { name:'Rennala',              sprite: sp(40,'rennala'),        hpMult:1.3            },
    { name:'Starscourge Radahn',   sprite: sp(40,'radahn'),         hpMult:1.45            },
    { name:'Rykard',               sprite: sp(40,'rykard'),         hpMult:1.6            },
    { name:'Morgott',              sprite: sp(40,'morgott'),        hpMult:1.75            },
    { name:'Mohg',                 sprite: sp(40,'mohg'),           hpMult:1.9            },
    { name:'Fire Giant',           sprite: sp(40,'fire_giant'),     hpMult:2.05            },
    { name:'Maliketh',             sprite: sp(40,'maliketh'),       hpMult:2.2           },
    { name:'Radagon',              sprite: sp(40,'radagon'),        isBoss:true, hpMult:10 },
  ],
  // ── PALIER 41 : Dark Souls 3 — Le Royaume de Lothric ─────────────────────
  41: [
    { name:'Iudex Gundyr',                  sprite: sp(41,'iudex_gundyr')                                          },
    { name:'Veilleurs des Abysses',         sprite: sp(41,'veilleur_des_abysses'),                    hpMult:1.15  },
    { name:'Chef Suprême Wolnir',           sprite: sp(41,'chef_supreme_wolnir'),                     hpMult:1.3   },
    { name:'Grand Maître Sulyvahn',         sprite: sp(41,'grand_maitre_sulyvahn'),                   hpMult:1.45  },
    { name:"Oceiros, le Roi Illuminé",      sprite: sp(41,'oceiros_le_roi_illumine'),                 hpMult:1.6   },
    { name:'Yhorm le Géant',                sprite: sp(41,'yhorm_le_geant'),                          hpMult:1.75  },
    { name:'Aldrich, Dévoreur des Dieux',   sprite: sp(41,'aldrich_le_devoreur_des_dieux'),           hpMult:1.9   },
    { name:'Lothric & Lorian',              sprite: sp(41,'lothric_prince_cadet_et_lorian_prince_aine'), hpMult:2.05 },
    { name:'Chevalier Esclave Gael',        sprite: sp(41,'chevalier_esclave_gael'),                  hpMult:2.2   },
    { name:"L'Âme des Cendres",             sprite: sp(41,'l_ame_des_cendres'),         isBoss:true, hpMult:10    },
  ],
  // ── PALIER 42 : Resident Evil — L'Incident d'Umbrella ────────────────────
  42: [
    { name:'Ashley Graham',        sprite: sp(42,'ashley_graham')                        },
    { name:'Sherry Birkin',        sprite: sp(42,'sherry_birkin'),   hpMult:1.15          },
    { name:'Ethan Winters',        sprite: sp(42,'ethan_winters'),   hpMult:1.3           },
    { name:'Claire Redfield',      sprite: sp(42,'claire_redfield'), hpMult:1.45          },
    { name:'Jill Valentine',       sprite: sp(42,'jill_valentine'),  hpMult:1.6           },
    { name:'HUNK',                 sprite: sp(42,'hunk'),            hpMult:1.75          },
    { name:'Ada Wong',             sprite: sp(42,'ada_wong'),        hpMult:1.9           },
    { name:'Chris Redfield',       sprite: sp(42,'chris_redfield'),  hpMult:2.05          },
    { name:'Leon S. Kennedy',      sprite: sp(42,'leon_s_kennedy'),  hpMult:2.2           },
    { name:'Albert Wesker',        sprite: sp(42,'albert_wesker'),   isBoss:true, hpMult:10 },
  ],
  // ── PALIER 43 : My Hero Academia — La Ligue des Vilains ──────────────────
  43: [
    { name:'Shuichi Iguchi',       sprite: sp(43,'shuichi_iguchi')                        },
    { name:'Jin Bubaigawara',      sprite: sp(43,'jin_bubaigawara'),  hpMult:1.15          },
    { name:'Blackmist',            sprite: sp(43,'blackmist'),        hpMult:1.3           },
    { name:'Himiko Toga',          sprite: sp(43,'himiko_toga'),      hpMult:1.45          },
    { name:'Stain',                sprite: sp(43,'stain'),            hpMult:1.6           },
    { name:'Kai Chisaki',          sprite: sp(43,'kai_chisaki'),      hpMult:1.75          },
    { name:'Brainless',            sprite: sp(43,'brainless'),        hpMult:1.9           },
    { name:'Dabi',                 sprite: sp(43,'dabi'),             hpMult:2.05          },
    { name:'Tomura Shigaraki',     sprite: sp(43,'tomura_shigaraki'), hpMult:2.2           },
    { name:'All For One',          sprite: sp(43,'all_for_one'),      isBoss:true, hpMult:10 },
  ],
  // ── PALIER 44 : Jujutsu Kaisen — Incident de Shibuya ─────────────────────
  44: [
    { name:'Takako Uro',           sprite: sp(44,'takako_uro')                           },
    { name:'Haruta Shigemo',       sprite: sp(44,'haruta_shigemo'),   hpMult:1.15          },
    { name:'Ogami',                sprite: sp(44,'ogami'),            hpMult:1.3           },
    { name:'Hanami',               sprite: sp(44,'hanami'),           hpMult:1.45          },
    { name:'Jogo',                 sprite: sp(44,'jogo'),             hpMult:1.6           },
    { name:'Choso',                sprite: sp(44,'choso'),            hpMult:1.75          },
    { name:'Mahito',               sprite: sp(44,'mahito'),           hpMult:1.9           },
    { name:'Toji Fushiguro',       sprite: sp(44,'toji_fushigoro'),   hpMult:2.05          },
    { name:'Suguru Geto',          sprite: sp(44,'suguru_geto'),      hpMult:2.2           },
    { name:'Ryomen Sukuna',        sprite: sp(44,'ryomen_sukuna'),    isBoss:true, hpMult:10 },
  ],
  // ── PALIER 45 : Darkest Dungeon — Le Manoir Ancestral ────────────────────
  45: [
    { name:'Brigand',              sprite: sp(45,'brigand')                              },
    { name:'Le Nécromancien',      sprite: sp(45,'necromancien'),     hpMult:1.15          },
    { name:'Shambler',             sprite: sp(45,'shambler'),         hpMult:1.3           },
    { name:'Shrieker',             sprite: sp(45,'shrieker'),         hpMult:1.45          },
    { name:'La Sirène',            sprite: sp(45,'sirene'),           hpMult:1.6           },
    { name:'Le Collectionneur',    sprite: sp(45,'collector'),        hpMult:1.75          },
    { name:'Le Prince Porc',       sprite: sp(45,'prince_porc'),      hpMult:1.9           },
    { name:'La Comtesse',          sprite: sp(45,'countess'),         hpMult:2.05          },
    { name:"L'Endormi",            sprite: sp(45,'l_endormi'),        hpMult:2.2           },
    { name:'Le Cœur Sombre',       sprite: sp(45,'le_coeur_sombre'),  isBoss:true, hpMult:10 },
  ],
  // ── PALIER 46 : Clair Obscur — Expédition 33 ─────────────────────────────
  46: [
    { name:"L'Évêque",             sprite: sp(46,'l_eveque')                             },
    { name:'Goblu',                sprite: sp(46,'goblu'),             hpMult:1.15         },
    { name:'Sakapatate Ultime',    sprite: sp(46,'sakapatate_ultime'), hpMult:1.3          },
    { name:'François',             sprite: sp(46,'francois'),          hpMult:1.45         },
    { name:'Maître des Lampes',    sprite: sp(46,'maitre_des_lampes'), hpMult:1.6          },
    { name:'Le Duelliste',         sprite: sp(46,'le_duelliste'),      hpMult:1.75         },
    { name:'Sirène',               sprite: sp(46,'sirene'),            hpMult:1.9          },
    { name:'Visage',               sprite: sp(46,'visage'),            hpMult:2.05         },
    { name:'La Peintresse',        sprite: sp(46,'la_peintresse'),     hpMult:2.2          },
    { name:'Renoir',               sprite: sp(46,'renoir'),            isBoss:true, hpMult:10 },
  ],
  // ── PALIER 47 : Shangri-La Frontier — Les Monstres Uniques ───────────────
  47: [
    { name:'Lapin Vorace',                  sprite: sp(47,'lapin_vorace')                                   },
    { name:'Gros Serpent Vorace',           sprite: sp(47,'gros_serpent_vorace'),            hpMult:1.15    },
    { name:'Gold Pion',                     sprite: sp(47,'gold_pion'),                      hpMult:1.3     },
    { name:'Lycaon, les Dents de la Nuit',  sprite: sp(47,'lycaon_les_dents_de_la_nuit'),    hpMult:1.45    },
    { name:'Vysache',                       sprite: sp(47,'vysache'),                        hpMult:1.6     },
    { name:'Kirin le Méchadestrier',        sprite: sp(47,'kirin_le_mechadestrier'),         hpMult:1.75    },
    { name:'Siegwurm, Maître des Cieux',    sprite: sp(47,'siegwurm_le_maitre_des_cieux'),   hpMult:1.9     },
    { name:"Orchestra, l'Écho Fatal",       sprite: sp(47,'orchestra_l_echo_fatal'),         hpMult:2.05    },
    { name:"Kthaanid des Abysses",          sprite: sp(47,'kthaanid_des_abysses'),           hpMult:2.2     },
    { name:'Wezaemon, Gardien du Tombeau',  sprite: sp(47,'wezaemon_le_gardien_du_tombeau'), isBoss:true, hpMult:10 },
  ],
  // ── PALIER 48 : Inazuma Eleven — Le Tournoi Mondial ──────────────────────
  48: [
    { name:'Dave Quagmire',        sprite: sp(48,'dave_quagmire')                        },
    { name:'Janus',                sprite: sp(48,'janus'),            hpMult:1.15          },
    { name:'Bryce Whitingale',     sprite: sp(48,'bryce_whitingale'), hpMult:1.3           },
    { name:'Claude Beacons',       sprite: sp(48,'claude_beacons'),   hpMult:1.45          },
    { name:'Caleb Stonewall',      sprite: sp(48,'caleb_stonwall'),   hpMult:1.6           },
    { name:'Byron Love',           sprite: sp(48,'byron_love'),       hpMult:1.75          },
    { name:'Xavier Foster',        sprite: sp(48,'xavier_foster'),    hpMult:1.9           },
    { name:'Bailong',              sprite: sp(48,'bailong'),          hpMult:2.05          },
    { name:'Jude Sharp',           sprite: sp(48,'jude_sharp'),       hpMult:2.2           },
    { name:'Ray Dark',             sprite: sp(48,'ray_dark'),         isBoss:true, hpMult:10 },
  ],
  // ── PALIER 49 : Okami — Le Retour d'Amaterasu ────────────────────────────
  49: [
    { name:'Tube Fox',             sprite: sp(49,'tube_fox')                             },
    { name:'Nagi',                 sprite: sp(49,'nagi'),             hpMult:1.15          },
    { name:'M. & Mme Cutter',      sprite: sp(49,'m_mme_cutter'),     hpMult:1.3           },
    { name:'Oki',                  sprite: sp(49,'oki'),              hpMult:1.45          },
    { name:'Rao le Maléfique',     sprite: sp(49,'rao_le_malefique'), hpMult:1.6           },
    { name:'Waka',                 sprite: sp(49,'waka'),             hpMult:1.75          },
    { name:'Lechku',               sprite: sp(49,'lechku'),           hpMult:1.9           },
    { name:'Nechku',               sprite: sp(49,'nechku'),           hpMult:2.05          },
    { name:'Ninetails',            sprite: sp(49,'ninetails'),        hpMult:2.2           },
    { name:'Yami',                 sprite: sp(49,'yami'),             isBoss:true, hpMult:10 },
  ],
  // ── PALIER 50 : Valorant — Le Protocole Valorant ─────────────────────────
  50: [
    { name:'Sage',                 sprite: sp(50,'sage')                                 },
    { name:'Phoenix',              sprite: sp(50,'phoenix'),          hpMult:1.15          },
    { name:'Jett',                 sprite: sp(50,'jett'),             hpMult:1.3           },
    { name:'Raze',                 sprite: sp(50,'raze'),             hpMult:1.45          },
    { name:'Breach',               sprite: sp(50,'breach'),           hpMult:1.6           },
    { name:'Deadlock',             sprite: sp(50,'deadlock'),         hpMult:1.75          },
    { name:'Neon',                 sprite: sp(50,'neon'),             hpMult:1.9           },
    { name:'Vyse',                 sprite: sp(50,'vyse'),             hpMult:2.05          },
    { name:'Omen',                 sprite: sp(50,'omen'),             hpMult:2.2           },
    { name:'Yoru',                 sprite: sp(50,'yoru'),             isBoss:true, hpMult:10 },
  ],
  // ── PALIER 51 : Frieren — L'Examen de Mage de 1re Classe ─────────────────
  51: [
    { name:'Qual',                 sprite: sp(51,'qual')                                 },
    { name:'Draht',                sprite: sp(51,'draht'),            hpMult:1.15          },
    { name:'Linie',                sprite: sp(51,'linie'),            hpMult:1.3           },
    { name:'Lügner',               sprite: sp(51,'lugner'),           hpMult:1.45          },
    { name:'Sein',                 sprite: sp(51,'sein'),             hpMult:1.6           },
    { name:'Genau',                sprite: sp(51,'genau'),            hpMult:1.75          },
    { name:'Aura',                 sprite: sp(51,'aura'),             hpMult:1.9           },
    { name:'Revolte',              sprite: sp(51,'revolte'),          hpMult:2.05          },
    { name:'Frieren Sombre',       sprite: sp(51,'dark_frieren'),     hpMult:2.2           },
    { name:'Serie',                sprite: sp(51,'serie'),            isBoss:true, hpMult:10 },
  ],
  // ── PALIER 52 : Dragon Ball Z — Arc Cell ─────────────────────────────────
  52: [
    { name:'C-19',                 sprite: sp(52,'c19')                                  },
    { name:'Dr Gero',              sprite: sp(52,'dr_gero'),          hpMult:1.15          },
    { name:'C-17',                 sprite: sp(52,'c17'),              hpMult:1.3           },
    { name:'C-18',                 sprite: sp(52,'c18'),              hpMult:1.45          },
    { name:'C-16',                 sprite: sp(52,'c16'),              hpMult:1.6           },
    { name:'Cell (1re forme)',     sprite: sp(52,'cell_1er_forme'),   hpMult:1.75          },
    { name:'Cell (2e forme)',      sprite: sp(52,'cell_2eme_forme'),  hpMult:1.9           },
    { name:'Cell Jr.',             sprite: sp(52,'cell_jr'),          hpMult:2.05          },
    { name:'Cell Parfait',         sprite: sp(52,'cell_parfait'),     hpMult:2.2           },
    { name:'Cell Parfait (Full Power)', sprite: sp(52,'cell_parfait_full_power'), isBoss:true, hpMult:10 },
  ],
  // ── PALIER 53 : One Piece — Baroque Works ────────────────────────────────
  53: [
    { name:'Miss Valentine',       sprite: sp(53,'miss_valentine')                       },
    { name:'Lassou',               sprite: sp(53,'lassou'),              hpMult:1.15       },
    { name:'Mister 4',             sprite: sp(53,'mister4'),             hpMult:1.3        },
    { name:'Miss Merry Christmas', sprite: sp(53,'miss_mery_christmas'), hpMult:1.45       },
    { name:'Mister 3',             sprite: sp(53,'mister3'),             hpMult:1.6        },
    { name:'Miss Doublefinger',    sprite: sp(53,'miss_doublefinger'),   hpMult:1.75       },
    { name:'Mister 2 Bon Clay',    sprite: sp(53,'mister2'),             hpMult:1.9        },
    { name:'Mister 1',             sprite: sp(53,'mister1'),             hpMult:2.05       },
    { name:'Nico Robin',           sprite: sp(53,'nico_robin'),          hpMult:2.2        },
    { name:'Crocodile',            sprite: sp(53,'crocodile'),           isBoss:true, hpMult:10 },
  ],
  // ── PALIER 54 : The Legend of Zelda — Ocarina of Time ────────────────────
  54: [
    { name:'Gohma',                sprite: sp(54,'gohma')                                },
    { name:'Roi Dodongo',          sprite: sp(54,'roi_dodongo'),      hpMult:1.15          },
    { name:'Barinade',             sprite: sp(54,'barinade'),         hpMult:1.3           },
    { name:'Ganon Spectral',       sprite: sp(54,'phantom_ganon'),    hpMult:1.45          },
    { name:'Volvagia',             sprite: sp(54,'volvagia'),         hpMult:1.6           },
    { name:'Morpha',               sprite: sp(54,'morpha'),           hpMult:1.75          },
    { name:'Dark Link',            sprite: sp(54,'dark_link'),        hpMult:1.9           },
    { name:'Bongo Bongo',          sprite: sp(54,'bongo_bongo'),      hpMult:2.05          },
    { name:'Twinrova',             sprite: sp(54,'twinrova'),         hpMult:2.2           },
    { name:'Ganondorf',            sprite: sp(54,'ganondorf'),        isBoss:true, hpMult:10 },
  ],
  // ── PALIER 55 : The Elusive Samurai — La Fuite de Tokiyuki ───────────────
  55: [
    { name:'Kazama Genba',         sprite: sp(55,'kazama_genba')                         },
    { name:'Fubuki',               sprite: sp(55,'fubuki'),              hpMult:1.15       },
    { name:'Mochizuki Ayako',      sprite: sp(55,'mochizuki_ayako'),     hpMult:1.3        },
    { name:'Suwa Yorishige',       sprite: sp(55,'suwa_yorishige'),      hpMult:1.45       },
    { name:'Hirano Shogen',        sprite: sp(55,'hirano_shogen'),       hpMult:1.6        },
    { name:'Mochizuki Shigenobu',  sprite: sp(55,'shigenobu_mochizuki'), hpMult:1.75       },
    { name:'Ichikawa Sukefusa',    sprite: sp(55,'ichikawa_sukefusa'),   hpMult:1.9        },
    { name:'Shibukawa Yoshisue',   sprite: sp(55,'yoshisue_shibukawa'),  hpMult:2.05       },
    { name:'Ogasawara Sadamune',   sprite: sp(55,'ogasawara_sadamune'),  hpMult:2.2        },
    { name:'Ashikaga Takauji',     sprite: sp(55,'ashikaga_takauji'),    isBoss:true, hpMult:10 },
  ],
  // ── PALIER 56 : Ravenswatch — Reverie ────────────────────────────────────
  56: [
    { name:"L'Ogre",                   sprite: sp(56,'l_ogre')                                  },
    { name:'La Mère Goule',            sprite: sp(56,'la_mere_goule'),            hpMult:1.15    },
    { name:'Karkinos',                 sprite: sp(56,'karkinos'),                 hpMult:1.3     },
    { name:'Abu al-Jann',              sprite: sp(56,'abu_al_jann'),              hpMult:1.45    },
    { name:'Stéropès',                 sprite: sp(56,'steropes'),                 hpMult:1.6     },
    { name:'Melion',                   sprite: sp(56,'melion'),                   hpMult:1.75    },
    { name:'Baba Yaga',                sprite: sp(56,'baba_yaga'),                hpMult:1.9     },
    { name:'Le Maître des Griffes',    sprite: sp(56,'le_maitre_des_griffes'),    hpMult:2.05    },
    { name:'Le Maître des Tentacules', sprite: sp(56,'le_maitre_des_tentacules'), hpMult:2.2     },
    { name:'Le Maître sans Visage',    sprite: sp(56,'le_maitre_sans_visage'),    isBoss:true, hpMult:10 },
  ],
  // ── PALIER 57 : Mario — Le Royaume Champignon ────────────────────────────
  57: [
    { name:'Goomba',               sprite: sp(57,'goomba')                               },
    { name:'Topi Taupe',           sprite: sp(57,'topi_taupe'),       hpMult:1.15          },
    { name:'Pom Pom',              sprite: sp(57,'pom_pom'),          hpMult:1.3           },
    { name:'Roi Bob-omb',          sprite: sp(57,'roi_bo_bomb'),      hpMult:1.45          },
    { name:'Méga Goomba',          sprite: sp(57,'mega_goomba'),      hpMult:1.6           },
    { name:'Roi Boo',              sprite: sp(57,'roi_boo'),          hpMult:1.75          },
    { name:'Petey Piranha',        sprite: sp(57,'petey_piranha'),    hpMult:1.9           },
    { name:'Kamek',                sprite: sp(57,'kamek'),            hpMult:2.05          },
    { name:'Bowser Jr.',           sprite: sp(57,'bowser_jr'),        hpMult:2.2           },
    { name:'Bowser',               sprite: sp(57,'bowser'),           isBoss:true, hpMult:10 },
  ],
  // ── PALIER 58 : Hell's Paradise — L'Île de Shinsenkyō ────────────────────
  58: [
    { name:'Chef Iwagakure',       sprite: sp(58,'chef_iwakagure')                        },
    { name:'Shugen Yamada Asaemon',sprite: sp(58,'shugen_yamada_asaemon'), hpMult:1.15     },
    { name:'Tao Fa',               sprite: sp(58,'ta_fa'),            hpMult:1.3           },
    { name:'Gui Fa',               sprite: sp(58,'gui_fa'),           hpMult:1.45          },
    { name:'Mu Dan',               sprite: sp(58,'mu_dan'),           hpMult:1.6           },
    { name:'Ju Fa',                sprite: sp(58,'ju_fa'),            hpMult:1.75          },
    { name:'Zhu Jin',              sprite: sp(58,'zhu_jin'),          hpMult:1.9           },
    { name:'Soshin',               sprite: sp(58,'soshin'),           hpMult:2.05          },
    { name:'Ran',                  sprite: sp(58,'ran'),              hpMult:2.2           },
    { name:'Rien',                 sprite: sp(58,'rien'),             isBoss:true, hpMult:10 },
  ],
  // ── PALIER 59 : Gachiakuta — Les Vandales ────────────────────────────────
  59: [
    { name:'Firefly',              sprite: sp(59,'Firefly')                              },
    { name:'Konza',                sprite: sp(59,'konza'),              hpMult:1.15        },
    { name:'Momoa Rukel',          sprite: sp(59,'momoa_rukel'),        hpMult:1.3         },
    { name:'Bundus Begalkeit',     sprite: sp(59,'bundus_begalkeit'),   hpMult:1.45        },
    { name:'Noerde Hew Amozo',     sprite: sp(59,'noerde_hew_amozo'),   hpMult:1.6         },
    { name:'Cthoni Andor',         sprite: sp(59,'cthoni_andor'),       hpMult:1.75        },
    { name:'Jabber Wonger',        sprite: sp(59,'jabber_wonger'),      hpMult:1.9         },
    { name:'Fu Orostor',           sprite: sp(59,'fu_orostor'),         hpMult:2.05        },
    { name:'Amo Empool',           sprite: sp(59,'amo_empool'),         hpMult:2.2         },
    { name:'Zodyl Render',         sprite: sp(59,'zodyl_render'),       isBoss:true, hpMult:10 },
  ],
  // ── PALIER 60 : To Be Hero X — Le Classement de la Confiance ─────────────
  60: [
    { name:'Little Johnny',        sprite: sp(60,'little_johnny')                        },
    { name:'Qui Shi',              sprite: sp(60,'qui_shi'),          hpMult:1.15          },
    { name:'Ahu',                  sprite: sp(60,'ahu'),              hpMult:1.3           },
    { name:'Loli',                 sprite: sp(60,'loli'),             hpMult:1.45          },
    { name:'Ling Lin',             sprite: sp(60,'ling_lin'),         hpMult:1.6           },
    { name:'E-Soul',               sprite: sp(60,'e_soul'),           hpMult:1.75          },
    { name:'Dragon Boy',           sprite: sp(60,'dragon_boy'),       hpMult:1.9           },
    { name:'Smile',                sprite: sp(60,'smile'),            hpMult:2.05          },
    { name:'Nice',                 sprite: sp(60,'nice'),             hpMult:2.2           },
    { name:'X',                    sprite: sp(60,'x'),                isBoss:true, hpMult:10 },
  ],
  // ── PALIER 61 : Death Note — L'Affaire Kira ──────────────────────────────
  61: [
    { name:'Anthony Rester',       sprite: sp(61,'anthony_rester')                       },
    { name:'Dalil Guillohrtha',    sprite: sp(61,'dalil_guillohrtha'), hpMult:1.15         },
    { name:'Matt',                 sprite: sp(61,'matt'),              hpMult:1.3          },
    { name:'Misa Amane',           sprite: sp(61,'misa_amane'),        hpMult:1.45         },
    { name:'Mello',                sprite: sp(61,'melio'),             hpMult:1.6          },
    { name:'Near',                 sprite: sp(61,'nate_river'),        hpMult:1.75         },
    { name:'Rem',                  sprite: sp(61,'rem'),               hpMult:1.9          },
    { name:'Ryuk',                 sprite: sp(61,'ryuk'),              hpMult:2.05         },
    { name:'L',                    sprite: sp(61,'l'),                 hpMult:2.2          },
    { name:'Light Yagami',         sprite: sp(61,'light_yagami'),      isBoss:true, hpMult:10 },
  ],
  // ── PALIER 62 : Evangelion — Tokyo-3 ─────────────────────────────────────
  62: [
    { name:'Pen Pen',              sprite: sp(62,'pen_pen')                              },
    { name:'Toji Suzuhara',        sprite: sp(62,'toji_suzuhara'),       hpMult:1.15       },
    { name:'Misato Katsuragi',     sprite: sp(62,'misato_katsuragi'),    hpMult:1.3        },
    { name:'Ritsuko Akagi',        sprite: sp(62,'ritsuko_akagi'),       hpMult:1.45       },
    { name:'Ryoji Kaji',           sprite: sp(62,'ryoji_kaji'),          hpMult:1.6        },
    { name:'Asuka Soryu Langley',  sprite: sp(62,'asuka_soryu_langley'), hpMult:1.75       },
    { name:'Rei Ayanami',          sprite: sp(62,'rei_ayanami'),         hpMult:1.9        },
    { name:'Shinji Ikari',         sprite: sp(62,'shinji_ikari'),        hpMult:2.05       },
    { name:'Kaworu Nagisa',        sprite: sp(62,'kaworu_nagisa'),       hpMult:2.2        },
    { name:'Gendo Ikari',          sprite: sp(62,'gendo_ikari'),         isBoss:true, hpMult:10 },
  ],
  // ── PALIER 63 : JoJo's Bizarre Adventure — L'Héritage des Joestar ────────
  63: [
    { name:'Rudol von Stroheim',   sprite: sp(63,'rudol_von_strheim')                    },
    { name:'Yukako Yamagishi',     sprite: sp(63,'yukako_yamagishi'), hpMult:1.15          },
    { name:'Rohan Kishibe',        sprite: sp(63,'rohan_kishibe'),    hpMult:1.3           },
    { name:'Risotto Nero',         sprite: sp(63,'risotto_nero'),     hpMult:1.45          },
    { name:'Kars',                 sprite: sp(63,'kars'),             hpMult:1.6           },
    { name:'Yoshikage Kira',       sprite: sp(63,'kira'),             hpMult:1.75          },
    { name:'Funny Valentine',      sprite: sp(63,'funny_valentine'),  hpMult:1.9           },
    { name:'Diavolo',              sprite: sp(63,'diavolo'),          hpMult:2.05          },
    { name:'Enrico Pucci',         sprite: sp(63,'enrico_pucci'),     hpMult:2.2           },
    { name:'Dio Brando',           sprite: sp(63,'dio_brando'),       isBoss:true, hpMult:10 },
  ],
  // ── PALIER 64 : Soul Eater — L'Académie Shibusen ─────────────────────────
  64: [
    { name:'Eruka Frog',           sprite: sp(64,'eruka_frog')                           },
    { name:'Famille Mizune',       sprite: sp(64,'mizune_family'),        hpMult:1.15      },
    { name:'Free',                 sprite: sp(64,'free'),                 hpMult:1.3       },
    { name:'Masamune Nakatsukasa', sprite: sp(64,'masamune_nakatsukasa'), hpMult:1.45      },
    { name:'Giriko',               sprite: sp(64,'giriko'),               hpMult:1.6       },
    { name:'Mosquito',             sprite: sp(64,'mosquito'),             hpMult:1.75      },
    { name:'Mifune',               sprite: sp(64,'mifune'),               hpMult:1.9       },
    { name:'Chrona',               sprite: sp(64,'chrona'),               hpMult:2.05      },
    { name:'Arachne Gorgon',       sprite: sp(64,'arachne_gorgon'),       hpMult:2.2       },
    { name:'Medusa Gorgon',        sprite: sp(64,'medusa_gorgon'),        isBoss:true, hpMult:10 },
  ],
  // ── PALIER 65 : Hunter x Hunter — Les Fourmis Chimères ───────────────────
  65: [
    { name:'Shizuku Murasaki',     sprite: sp(65,'shizuku_murasaki')                     },
    { name:'Machi Komacine',       sprite: sp(65,'machi_komachine'),  hpMult:1.15          },
    { name:'Shalnark',             sprite: sp(65,'sharmalk'),         hpMult:1.3           },
    { name:'Feitan Portor',        sprite: sp(65,'feitan_pohtoh'),    hpMult:1.45          },
    { name:'Silva Zoldyck',        sprite: sp(65,'silva_zoldyck'),    hpMult:1.6           },
    { name:'Hisoka',               sprite: sp(65,'hisoka'),           hpMult:1.75          },
    { name:'Chrollo Lucilfer',     sprite: sp(65,'kuroro_lucifer'),   hpMult:1.9           },
    { name:'Shaiapouf',            sprite: sp(65,'shauapfufu'),       hpMult:2.05          },
    { name:'Neferpitou',           sprite: sp(65,'neferpitot'),       hpMult:2.2           },
    { name:'Meruem',               sprite: sp(65,'meruem'),           isBoss:true, hpMult:10 },
  ],
};

// PV du boss d'un palier (vague 10, hpMult:10) — exposé pour calibrer d'autres
// systèmes (ex: seuils de DPS d'expédition dans expeditions.ts) sur la même
// courbe de puissance que le combat, sans dupliquer les constantes.
export function getPalierBossHp(palier: number): BigNum {
  const global = (palier - 1) * 10 + 10;
  return bnMulScalar(baseHpForGlobal(global), 10);
}

export function generateEnemy(wave: number, palier: number, maxPalierReached: number = palier): Enemy {
  // Au-delà du dernier palier défini, on cycle sur les mondes précédents pour
  // le thème (sprite/nom des mobs) — même cycle que getPalierConfig/PalierBg.
  // Seul themePalier sert au lookup ci-dessous, tout le reste (PV, coins,
  // gemmes, id) continue d'utiliser le VRAI palier.
  const themePalier = ((palier - 1) % PALIERS.length) + 1;
  const defs   = PALIER_ENEMIES[themePalier];
  const def    = defs ? defs[wave - 1] : getFallback(wave, themePalier);
  const isBoss = def.isBoss ?? (wave === 10);
  const hpMult = def.hpMult ?? 1;
  const global = (palier - 1) * 10 + wave;

  // HP : 120 × 1.12^(global-1)
  const maxHp = bnMulScalar(baseHpForGlobal(global), hpMult);

  // Coins : base × growth^(global-1), boss × bossMult
  // On applique en plus un scale global pour calibrer la vitesse d'obtention des coins.
  //on retrouve base et growth en export tout en haut de ce fichier, pour calibrer d'autres systèmes sur la même courbe.
  const COIN_BOSS_MULT = 12;

  const pixelCoins = bnMulScalar(bnPow(COIN_GROWTH, global - 1), COIN_BASE * (isBoss ? COIN_BOSS_MULT : 1));

  // Gemme garantie du "mini-boss" (vague 5) : uniquement lors d'une vraie
  // progression, jamais en re-farmant un palier déjà validé — sinon c'est un
  // robinet infini de gemmes en boucle.
  const isFarming = palier < maxPalierReached;
  const gemsReward = isBoss ? palier : (wave === 5 && !isFarming ? 1 : 0);

  return {
    id:    `p${palier}_w${wave}`,
    name:  isBoss ? `★ BOSS — ${def.name}` : def.name,
    wave, palier, maxHp, currentHp: maxHp,
    spritePath: `/${def.sprite}`,
    pixelCoinsReward: pixelCoins,
    gemsReward,
    isBoss,
  };
}