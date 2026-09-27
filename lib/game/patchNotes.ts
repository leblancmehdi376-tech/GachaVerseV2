// Historique des mises à jour affiché dans la popup Patch Notes (voir
// components/layout/PatchNotesModal.tsx). Entrées triées de la plus récente
// à la plus ancienne — ajouter les nouvelles en tête de tableau.
// IMPORTANT : à chaque changement notable apporté au jeu, ajouter une entrée
// ici (voir AGENTS.md, section "Patch notes").
export interface PatchNoteEntry {
  date: string;   // affiché tel quel (ex: '13/09/2026')
  title: string;
  changes: string[];
}

export const PATCH_NOTES: PatchNoteEntry[] = [
  {
    date: '27/09/2026',
    title: 'Nouveaux logos de synergies',
    changes: [
      "25 synergies affichent désormais le logo de leur univers au lieu d'un emoji : Clair Obscur, Darkest Dungeon, Dark Souls, Death Note, Evangelion, Frieren, Gachiakuta, Hell's Paradise, Hunter x Hunter, Inazuma Eleven, JoJo, Jujutsu Kaisen, Mario, My Hero Academia, Okami, Ravenswatch, Resident Evil, Shangri-La Frontier, Solo Leveling, Soul Eater, The Beginning After The End, The Eminence in Shadow, The Elusive Samurai, To Be Hero X et Valorant.",
      "Toutes les synergies ont maintenant leur logo.",    ],
  },
  {
    date: '27/09/2026',
    title: "Nouveau : cohésion d'équipe",
    changes: [
      "Le DPS du combat de l'accueil dépend désormais de la cohésion de ton équipe : plus les niveaux de tes 4 compagnons sont proches, plus tu gagnes de DPS (jusqu'à +20 %).",
      "Tant que l'écart moyen de niveau avec ton compagnon le plus haut reste de 10 niveaux ou moins, tu profites du bonus maximal de +20 %.",
      "Un gros écart de niveau entre tes compagnons donne un malus (jusqu'à −20 %). Ce malus est très léger en début de partie et devient plus exigeant quand ton équipe monte en niveau.",
      "Un slot de compagnon vide compte comme un compagnon de niveau 0 : remplis tes 4 slots !",
      "La cohésion s'affiche sous le DPS d'équipe dans le combat, l'onglet Améliorations et l'onglet Compagnons : un smiley content 😄 en cas de bonus, un smiley rouge de colère 😡 en cas de malus.",
      "Survole la cohésion pour voir le détail : jauge, niveau le plus haut, écart moyen, écart toléré, slots vides et un conseil pour l'améliorer.",
      "La cohésion ne s'applique ni aux raids ni aux expéditions.",
    ],
  },
  {
    date: '27/09/2026',
    title: "Correctif : drop d'équipement sur tous les ennemis",
    changes: [
      "Les boss et le dernier ennemi avant la vague 10 peuvent désormais eux aussi faire tomber de l'équipement (auparavant, ils n'en donnaient jamais).",
    ],
  },
  {
    date: '27/09/2026',
    title: 'Raids : relance automatique',
    changes: [
      "Après la victoire contre un boss de raid, le suivant apparaît automatiquement : le combat continue en arrière-plan pendant l'affichage des récompenses, plus besoin de fermer le pop-up.",
      "Le pop-up de récompenses du raid se ferme bien tout seul au bout de 5 secondes.",
    ],
  },
  {
    date: '27/09/2026',
    title: 'Compadex : comptage fiabilisé',
    changes: [
      "Le Compadex ne compte plus les personnages ou équipements qui n'existent plus dans le jeu (renommés ou retirés) : les succès « Compadex Complet » et « Compadex Absolu » exigent désormais vraiment tout ce qui existe actuellement.",
    ],
  },
  {
    date: '27/09/2026',
    title: 'Benimaru rejoint la Forge',
    changes: [
      "Nouveau personnage à forger : Benimaru (Légendaire, Tensei Slime), obtenu contre 30 Cornes de Kijin. Recette débloquée dès le palier 9, bien plus accessible que les recettes Primordiales.",
      "L'expédition « Esplanade de Tempest » ramène désormais des Cornes de Kijin au lieu des Éclats de Duplication.",
      "Benimaru (Tensei Slime) n'est plus obtenable dans les bannières : il s'obtient uniquement à la Forge.",
      "Les Éclats de Duplication sont supprimés (ainsi que leur recette « Invocation Divine ») : ceux que tu possédais ont été convertis en Cornes de Kijin, 1 pour 1.",
      "Les expéditions sont désormais triées par rareté (de ce qu'elles permettent d'obtenir), de la plus commune à la plus rare.",
      "Les recettes de la Forge et l'onglet « Mes drops » sont eux aussi triés par rareté du personnage à forger.",
    ],
  },
  {
    date: '27/09/2026',
    title: '31 nouvelles armes spéciales',
    changes: [
      "3 armes Transcendantes : Épée cauchemardesque (Nightmare Grimm), Sixième Œil (Satoru Gojo) et Truite Saumonée (Niyunishi).",
      "8 armes Primordiales pour Shawn Frost, Frieren, Enjin, Garp, Archer, Chiaki Nanami, Makima et Maliketh.",
      "20 armes Cosmiques pour les nouveaux personnages Cosmiques de la bannière Vol.2, Rokoul & Ayro et Ushiwaka.",
      "Elles peuvent tomber en combat, dans les coffres, en fusion d'équipement et en fusion d'armes spéciales, et donnent un gros bonus au personnage associé.",
    ],
  },
  {
    date: '27/09/2026',
    title: 'Monde des Douzes réservé à Twix et Igloo',
    changes: [
      "L'expédition « S'aventurer dans le monde des Douzes » ne peut désormais être faite que par Twix ou Igloo (seuls ou ensemble), au lieu d'exiger un type tiré au hasard.",
    ],
  },
  {
    date: '27/09/2026',
    title: 'Correctif : animation des cartes Primordiales et Transcendantes',
    changes: [
      "L'animation spéciale des cartes Primordiales et Transcendantes est désormais toujours jouée, même si tu cliques sur « Voir le résumé » pendant l'invocation.",
      "Si tu en obtiens plusieurs dans le même tirage, leurs animations s'enchaînent une par une avant d'afficher le résumé.",
    ],
  },
  {
    date: '27/09/2026',
    title: 'Correctif : barres de taux de drop',
    changes: [
      "Les barres des taux de drop du Gacha sont désormais proportionnelles aux probabilités : la rareté la plus probable a une barre pleine, les autres s'ajustent par rapport à elle.",
    ],
  },
  {
    date: '27/09/2026',
    title: 'Bannière Vol.2 : 214 nouveaux personnages',
    changes: [
      "Nouvelle bannière « Gacha Verse Vol.2 » : elle ne contient que les 214 nouveaux personnages. Choisis ta bannière en haut de la page Gacha (même coût et mêmes taux que la Vol.1).",
      "Les nouveaux personnages peuvent aussi être obtenus sur la bannière Vol.1.",
      "22 nouveaux univers : Dark Souls 3, Resident Evil, My Hero Academia, Jujutsu Kaisen, Darkest Dungeon, Clair Obscur, Shangri-La Frontier, Inazuma Eleven, Okami, Valorant, Frieren, The Elusive Samurai, Ravenswatch, Mario, Gachiakuta, Hell's Paradise, To Be Hero X, Death Note, Evangelion, JoJo's Bizarre Adventure, Soul Eater et Hunter x Hunter.",
      "Des renforts pour les univers existants : One Piece, Naruto, Dragon Ball, Bleach, Chainsaw Man, Hollow Knight, Pokémon, et bien d'autres.",
      "Nouvelles synergies pour tous ces univers, ainsi que pour The Eminence in Shadow, Tbate et Solo Leveling.",
      "Deux nouveaux Transcendants : Satoru Gojo et Nightmare Grimm.",
      "Plusieurs nouveaux personnages ont des évolutions (Gohan, Sasuke et Izuku jusqu'à 4 formes).",
      "Les nouveaux Primordiaux et Transcendants ont leur propre réplique lors de leur invocation, tout comme Niyunishi.",
      "Kanao Tsuyuri, Les deux Isis et Capuchon n'ont pas encore de visuel : il arrive bientôt.",
    ],
  },
  {
    date: '26/09/2026',
    title: 'Deux nouveaux personnages Chill&Cool',
    changes: [
      "Nouveau boss de raid : Rokoul & Ayro (Cosmique, Chill&Cool). Ses pièces s'échangent en Boutique contre le personnage, et il fait tomber ses 3 objets d'évolution (Item 1, Item 2, Item 3).",
      "Nouveau personnage à forger : ElFuZzion (Mythique, Chill&Cool), obtenu contre 6 Œufs de Dragon Primordiaux.",
      "Nouvelle expédition « S'aventurer dans le monde des Douzes » (1h, débloquée au palier 11) : 75% de chance de ramener un Œuf de Dragon Primordial.",
      "Les visuels de ces deux personnages arrivent bientôt : leurs initiales sont affichées en attendant.",
    ],
  },
  {
    date: '26/09/2026',
    title: 'Enchaînement des ultis',
    changes: [
      "Activer un ulti pendant qu'un autre est déjà en cours ne l'annule plus : il est mis en file d'attente et se lance automatiquement dès que le précédent se termine.",
      "Plusieurs ultis peuvent être stackés à la suite ; leur position dans la file s'affiche sur la carte du compagnon (« EN FILE #1 », « EN FILE #2 »…).",
      "Le cooldown d'un ulti en file ne démarre qu'au moment où il se lance réellement.",
      "Cliquer à nouveau sur un ulti en file le retire de la file d'attente.",
    ],
  },
  {
    date: '25/09/2026',
    title: 'Popup « Boss majeur atteint » refermable',
    changes: [
      "Le message « Boss majeur atteint » qui s'affiche quand un événement est interrompu par un boss peut désormais être fermé d'un simple clic.",
    ],
  },
  {
    date: '24/09/2026',
    title: 'Correction : ventes disparaissant de l\'Hôtel de Ville',
    changes: [
      "Correction d'un bug d'affichage dans « Mes annonces » de l'Hôtel de Ville : une vente tout juste conclue pouvait, dans certains cas, ne pas apparaître comme « Vendu » (et empêcher d'encaisser la monnaie due), en particulier pour les vendeurs ayant beaucoup d'annonces closes dans leur historique.",
    ],
  },
  {
    date: '24/09/2026',
    title: 'Buff des Anomalies',
    changes: [
      "Les 6 types de bonus d'Anomalie (Boost Synergie, Dégâts de Type, Gain de Gold, DPS Global, Réduc. Coût Gacha, Réduc. Coût Amélioration) ont un tout nouveau barème, sensiblement à la hausse à toutes les raretés — jusqu'à +600% en Boost Synergie et +100% en DPS Global pour une Anomalie Transcendante.",
      "La Réduction de Coût Gacha et la Réduction de Coût d'Amélioration ne sont plus des valeurs fixes par rareté : elles sont désormais tirées dans une plage, identique pour les deux, avec un maximum de 15% en rareté Transcendant.",
      "Correction : deux raretés voisines pouvaient partager la même valeur limite sur la Réduction de Coût Gacha/Amélioration (ex: Stellaire et Cosmique pouvaient toutes les deux tirer +5%) — chaque rareté a maintenant sa propre plage bien distincte.",
    ],
  },
  {
    date: '23/09/2026',
    title: 'Tri des avatars par rareté',
    changes: [
      "Dans le sélecteur d'avatar de la page Profil, tes personnages débloqués sont désormais triés de la rareté la plus élevée à la plus faible.",
    ],
  },
  {
    date: '23/09/2026',
    title: 'Meilleur cadrage des illustrations de personnages',
    changes: [
      "Les illustrations de carte sont mieux recadrées : le personnage occupe désormais mieux la fenêtre visible du cadre de rareté, sans zone gaspillée sous le bandeau du nom.",
      "Recadrage retouché à la main pour une centaine de personnages dont le cadrage automatique n'était pas optimal (tête ou corps mal positionné dans l'image).",
    ],
  },
  {
    date: '23/09/2026',
    title: 'Avatar personnalisable',
    changes: [
      "Tu peux désormais choisir l'avatar affiché en haut du jeu, sur ta page Profil et dans l'onglet Options parmi tes personnages débloqués (section \"Avatar\" de la page Profil) — l'avatar utilise la vraie illustration de la carte du personnage.",
      "L'avatar arbore une bordure/lueur qui évolue selon le palier max que tu as atteint (bronze, argent, or, diamant, prisme), et se met à pulser une fois un grand nombre de succès débloqués.",
      "L'avatar (header, Profil, Options) est désormais toujours identique partout dans le jeu.",
      "Le classement affiche maintenant l'avatar de chaque joueur à côté de son pseudo.",
    ],
  },
  {
    date: '22/09/2026',
    title: 'Rééquilibrage des synergies d\'équipe',
    changes: [
      "Corrigé un bug qui faisait coexister deux bonus différents pour la synergie Sword Art Online : elle est désormais unifiée (+21% à 2 personnages, +35% et +5% global à 4).",
      "Ajout d'un palier supplémentaire (3 ou 4 personnages) aux synergies Minecraft, Zelda, R.E.P.O, Digital Circus, Overwatch, Attaque des Titans, Les Carnets de l'Apothicaire, Valkyrie Apocalypse, Spy x Family, Hollow Knight, Chainsaw Man, Elden Ring, Brotato et Bungou Stray Dogs, pour récompenser les équipes qui rassemblent plus de personnages d'un même univers.",
      "Légèrement augmenté le bonus de base des synergies R.E.P.O (+14% → +19%) et Digital Circus (+15% → +20%), qui étaient nettement en retrait par rapport aux autres univers.",
    ],
  },
  {
    date: '22/09/2026',
    title: 'Icônes de synergie manquantes ajoutées',
    changes: [
      "Ajout des icônes manquantes pour les synergies League of Legends, Demon Slayer, Cuphead, Nos Animaux, Spy x Family, Valkyrie Apocalypse, Attaque des Titans, Hollow Knight, Chainsaw Man, Elden Ring, Tekken, Les Carnets de l'Apothicaire, Undertale, Five Nights At Freddy's, Fire Force et Fullmetal Alchemist Brotherhood (elles s'affichaient auparavant en image cassée dans la barre d'équipe et la page Compagnons).",
    ],
  },
  {
    date: '22/09/2026',
    title: 'Correctif de transparence sur les visuels du palier 33',
    changes: [
      "Corrigé la transparence de plusieurs visuels d'ennemis du palier 33 (fond visible autour des personnages).",
    ],
  },
  {
    date: '22/09/2026',
    title: "Protection des équipements spéciaux lors de la fusion",
    changes: [
      "Page Équipement : la fusion consomme désormais en priorité les équipements génériques avant de piocher dans les équipements spéciaux (liés à un personnage précis).",
      "Un avertissement s'affiche si le stock sélectionné pour la fusion contient des équipements spéciaux, pour éviter de les fusionner par erreur.",
      "Le nombre d'équipements spéciaux est maintenant affiché à côté de chaque groupe d'équipement et de la rareté actuellement sélectionnée.",
    ],
  },
  {
    date: '21/09/2026',
    title: 'Amélioration des drops de raid',
    changes: [
      "Augmenté le taux de drop des objets d'évolution des boss de raid : l'objet à 1% passe à 1,4% et l'objet à 0,8% passe à 0,95%.",
      "Légèrement réduit le taux de drop de gemmes en contrepartie, pour garder un total de 100% de chances de récompense par combat.",
    ],
  },
  {
    date: '21/09/2026',
    title: 'Correctif : annonces manquantes dans "Mes annonces"',
    changes: [
      "Corrigé un bug de l'Hôtel de Ville où une annonce fraîchement publiée pouvait ne pas apparaître dans l'onglet \"Mes annonces\" si tu avais déjà publié beaucoup d'annonces par le passé.",
    ],
  },
  {
    date: '20/09/2026',
    title: 'Confirmation avant reroll de la boutique du jour',
    changes: [
      "Une confirmation est désormais demandée avant de reroll la boutique du jour si elle contient un personnage que tu ne possèdes pas encore, pour éviter de le perdre par erreur.",
    ],
  },
  {
    date: '20/09/2026',
    title: 'Forge : les personnages de fusion sont reforgeables',
    changes: [
      "Les recettes de personnage (Végéto, Gogeta, Aizen Transcendant, Yoriichi, Chara, Shanks, Brunhilde...) restent désormais forgeables après la première obtention : reforger consomme à nouveau les ingrédients et donne un doublon du personnage.",
    ],
  },
  {
    date: '15/09/2026',
    title: 'Visuels des ennemis du Royaume des Animaux',
    changes: [
      "Igloo, Twix, Maurice, Horus et Brume affichent maintenant leur visage au palier 30 au lieu d'un simple pictogramme (Osiris, les Deux Isis, le Gardien Ancestral, l'Ombre Sacrée et Capuchon restent à illustrer).",
    ],
  },
  {
    date: '15/09/2026',
    title: 'Rattrapage AFK en changeant d\'onglet',
    changes: [
      "Le combat se met désormais en pause quand l'onglet est en arrière-plan (au lieu d'avancer au ralenti de façon incohérente) : plus de perte de temps de boss injuste si tu changes d'onglet en plein combat.",
      "Le temps passé sur un autre onglet est maintenant crédité comme du temps AFK : la popup de gains hors-ligne s'affiche aussi en revenant sur l'onglet, pas seulement en rouvrant le jeu.",
    ],
  },
  {
    date: '14/09/2026',
    title: 'Affichage du multiplicateur de type arrondi',
    changes: [
      "Le multiplicateur de type affiché sur les cartes compagnons de l'écran d'accueil est désormais limité à deux chiffres après la virgule.",
    ],
  },
  {
    date: '14/09/2026',
    title: 'Nettoyage de l\'onglet Options',
    changes: [
      "Le suivi du nombre de clics totaux, qui n'était plus utilisé nulle part, a été entièrement retiré (il n'apparaissait déjà plus dans l'onglet Options).",
    ],
  },
  {
    date: '14/09/2026',
    title: 'Meilleure lisibilité des cartes compagnons',
    changes: [
      "Sur les très grands écrans, les informations (niveau, rang, ulti, base, type, DPS) des cartes compagnons de l'écran d'accueil s'affichent désormais à droite de l'illustration plutôt qu'en dessous, pour une lecture plus claire.",
      "En dessous de cette largeur, l'affichage reste inchangé.",
    ],
  },
  {
    date: '14/09/2026',
    title: 'Correctif : quêtes de boss encore intitulées « événement »',
    changes: [
      "Les quêtes « Vaincre des boss d'événement » restées bloquées sous leur ancien nom depuis le passage aux Raids sont maintenant bien renommées en « Vaincre des boss de raid », sans perte de progression.",
    ],
  },
  {
    date: '13/09/2026',
    title: 'Les Raids sont permanents',
    changes: [
      "Suppression du compte à rebours « Xj restants » dans le lobby des Raids : les boss de raid n'ont plus de date de fin, ils sont bien permanents.",
    ],
  },
  {
    date: '13/09/2026',
    title: 'Les Événements deviennent des Raids',
    changes: [
      "La section « Événements » est renommée « Raids » : boss, quêtes, titres et personnages exclusifs sont désormais des « boss de raid », « quêtes de raid », etc.",
      'Ajout des Patch Notes : la popup de la barre latérale est remplacée par un accès aux notes de mise à jour.',
    ],
  },
];
