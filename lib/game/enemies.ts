import { Enemy } from '@/types/game';

export const COIN_BASE = 60;
export const COIN_GROWTH = 1.13;

interface EnemyDef {
  name:    string;
  sprite:  string;
  hpMult?: number;
  isBoss?: boolean;
}

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
  // ⚠️ Sprites manquants : le dossier public/sprites/enemies/palier30/ n'existe
  // pas du tout — les 10 ennemis de ce palier affichent un placeholder tant
  // qu'aucune image n'a été ajoutée.
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
};

// PV du boss d'un palier (vague 10, hpMult:10) — exposé pour calibrer d'autres
// systèmes (ex: seuils de DPS d'expédition dans expeditions.ts) sur la même
// courbe de puissance que le combat, sans dupliquer les constantes.
export function getPalierBossHp(palier: number): number {
  const global = (palier - 1) * 10 + 10;
  const baseHp = Math.floor(120 * Math.pow(1.12, global - 1));
  return Math.floor(baseHp * 10);
}

export function generateEnemy(wave: number, palier: number, maxPalierReached: number = palier): Enemy {
  // Au-delà du palier 40, on cycle sur les mondes précédents pour le thème
  // (sprite/nom des mobs) — seul themePalier sert au lookup ci-dessous, tout
  // le reste (PV, coins, gemmes, id) continue d'utiliser le VRAI palier.
  const themePalier = ((palier - 1) % 40) + 1;
  const defs   = PALIER_ENEMIES[themePalier];
  const def    = defs ? defs[wave - 1] : getFallback(wave, themePalier);
  const isBoss = def.isBoss ?? (wave === 10);
  const hpMult = def.hpMult ?? 1;
  const global = (palier - 1) * 10 + wave;

  // HP : 120 × 1.12^(global-1)
  const baseHp = Math.floor(120 * Math.pow(1.12, global - 1));
  const maxHp  = Math.floor(baseHp * hpMult);

  // Coins : base × growth^(global-1), boss × bossMult
  // On applique en plus un scale global pour calibrer la vitesse d'obtention des coins.
  //on retrouve base et growth en export tout en haut de ce fichier, pour calibrer d'autres systèmes sur la même courbe.
  const COIN_BOSS_MULT = 12;

  const rawCoins = isBoss
    ? Math.floor(COIN_BASE * Math.pow(COIN_GROWTH, global - 1) * COIN_BOSS_MULT)
    : Math.floor(COIN_BASE * Math.pow(COIN_GROWTH, global - 1));
  const pixelCoins = Math.max(0, Math.floor(rawCoins));

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