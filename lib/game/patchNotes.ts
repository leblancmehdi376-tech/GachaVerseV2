// Historique des mises à jour affiché dans la popup Patch Notes (voir
// components/layout/PatchNotesModal.tsx). Entrées triées de la plus récente
// à la plus ancienne — ajouter les nouvelles en tête de tableau.
// IMPORTANT : à chaque changement notable apporté au jeu, ajouter une entrée
// ici (voir AGENTS.md, section "Patch notes").
// Dans les textes, **mot** s'affiche en gras.
export interface PatchNoteSection {
  icon: string;
  title: string;
  changes: string[];
}

export interface PatchNoteEntry {
  date: string;   // affiché tel quel (ex: '13/09/2026')
  title: string;
  changes?: string[];
  sections?: PatchNoteSection[];   // pour les grosses mises à jour
}

export const PATCH_NOTES: PatchNoteEntry[] = [
  {
    date: '30/09/2026',
    title: 'Maj v2.7.6',
    changes: [
      "**Sauvegarde cloud** : correction d'un **retour en arrière de la progression** en changeant d'appareil.",
      "Un vieil onglet resté ouvert sur un autre appareil ne peut plus **écraser** la progression faite ailleurs.",
      "Quand un autre appareil a sauvegardé plus récemment, sa sauvegarde est désormais **toujours reprise**.",
      "Le statut de synchro n'affiche plus **Synchronisé** quand la sauvegarde cloud a échoué : il passe en **rouge** jusqu'au prochain essai réussi.",
    ],
  },
  {
    date: '30/09/2026',
    title: 'Maj v2.7.5',
    changes: [
      "**Gains hors-ligne** corrigés : ils pouvaient donner des **millions de gemmes et de coins** quand ton DPS dépassait largement les PV de l'ennemi.",
      "Hors-ligne, tes compagnons tuent désormais au maximum **1 ennemi par seconde**, comme quand tu joues.",
      "Ça s'applique aussi à la récompense quotidienne **heures de gains hors ligne**.",
      "**Amélioration** : nouveau bouton **×100** pour monter jusqu'à 100 niveaux d'un coup.",
      "**Amélioration** sur téléphone : les alliés s'affichent en **cartes horizontales** pleine largeur, avec des boutons plus grands.",
    ],
  },
  {
    date: '30/09/2026',
    title: 'Maj v2.7.4',
    changes: [
      "Le menu déroulant de **recherche d'univers** s'affiche désormais **au-dessus** des pastilles d'évolution et d'édition des cartes.",
      "**Boutique du jour** : nouvel interrupteur **Alerte perso inédit** à côté du bouton Reroll, pour activer ou couper la confirmation quand la boutique contient un personnage que tu n'as pas encore.",
    ],
  },
  {
    date: '30/09/2026',
    title: 'Maj v2.7.3',
    changes: [
      "La **Boutique** a été entièrement redessinée : même contenu, mêmes prix, présentation plus claire.",
      "Nouveau titre **BOUTIQUE** avec tes soldes de **BossCrowns** et d'**Orbes du Néant** en haut de page.",
      "Les sections sont maintenant **côte à côte** sur grand écran pour éviter de faire défiler une longue liste.",
      "**Boutique du jour** et **Personnages de raid** : cartes plus grandes, avec nom, rareté et prix bien visibles.",
      "Les chances des **coffres d'équipement** sont regroupées dans un **tableau comparatif**, à côté des coffres.",
      "Les boutons d'achat gardent la **couleur de leur monnaie** même quand tu n'as pas assez pour acheter.",
      "Le **Coffre Commun** devient le **Coffre Peu Commun**, désormais en **vert** (chances inchangées).",
    ],
  },
  {
    date: '30/09/2026',
    title: 'Maj v2.7.2',
    sections: [
      {
        icon: '📱',
        title: 'Affichage sur téléphone',
        changes: [
          "**GachaDle** : la page n'est plus coupée sur la droite après ta première proposition.",
          "**Récompenses journalières** : le calendrier passe à **4 jours par ligne**, plus aucun jour coupé.",
          "**Boutique** : le bouton **+1 emplacement** d'expédition ne dépasse plus de sa carte.",
          "**Barre du haut** : sur les petits écrans, le logo devient **GV** pour que les gemmes et le calendrier restent visibles.",
          "**Accueil** : les **4 slots de compagnons** tiennent en entier dans la barre.",
          "**Infobulles** (cohésion, affinités, compétences, DPS, butin) : elles s'ouvrent d'un appui et se ferment en touchant ailleurs, au lieu de rester bloquées à l'écran.",
          "**Barre Synergies / Butin / DPS** : quand elle manque de place, ses cases passent à la ligne au lieu de sortir de l'écran.",
          "Les fenêtres de détail de cette barre (**synergies**, **butin**, **DPS**, **cohésion**) restent toujours **entièrement visibles**, et défilent au doigt si elles sont plus hautes que l'écran.",
          "Au doigt, un **appui sur la fenêtre** la referme.",
          "**Quêtes** : en-tête et cartes réorganisés, le bouton **Récupérer** passe en pleine largeur.",
          "**Expéditions** : les onglets passent à la ligne au lieu de sortir de l'écran.",
          "**Expéditions**, **Raids**, **Améliorations** et **Inventaire des champions** : plus aucune carte ne dépasse sur les très petits écrans.",
          "**Compadex** et **Maîtrise** : le bouton d'inversion du tri reste visible.",
          "**Classement** : les blocs **Pseudo** et **Progression** s'empilent.",
          "Marges réduites sur la **Boutique**, la **Forge**, les **Expéditions**, les **Paramètres** et les **Améliorations**.",
          "Zones tactiles agrandies (filtres des **Succès**, repli des quêtes de l'accueil, fermeture du calendrier).",
        ],
      },
    ],
  },
  {
    date: '29/09/2026',
    title: 'Maj v2.7.1',
    changes: [
      "**GachaDle** : la **partie libre** en cours est maintenant sauvegardée, tu la retrouves en revenant sur la page.",
    ],
  },
  {
    date: '29/09/2026',
    title: 'Maj v2.7.0',
    sections: [
      {
        icon: '🔎',
        title: 'Nouvelle activité : GachaDle',
        changes: [
          "Nouvelle page **GachaDle** dans **Activités** : devine le personnage mystère !",
          "À chaque essai, la **rareté**, le **type** et l'**univers** s'affichent en **vert** (correct) ou **rouge** (faux).",
          "Case **Genre** : masculin, féminin, mixte (duo) ou autre (créatures, robots, objets...).",
          "Le **type** passe en **orange** quand il est voisin de celui du mystère dans le cycle des types (il le bat ou se fait battre par lui).",
          "Case **Formes** : le nombre de formes du personnage (1 s'il n'évolue pas).",
          "Pour la rareté et les formes, une flèche **▲/▼** indique si le mystère a une valeur plus haute ou plus basse.",
          "En tapant un nom, des **propositions** apparaissent au fur et à mesure (flèches + Entrée pour choisir).",
          "**Défi du jour** : le même personnage pour tout le monde, renouvelé chaque jour à **2h**, en même temps que les **quêtes journalières**. **Partie libre** : autant de parties que tu veux.",
        ],
      },
      {
        icon: '📅',
        title: 'Défi du jour',
        changes: [
          "Réussir le **défi du jour** rapporte **100 💎**.",
          "Enchaîne les jours pour faire monter ta **série 🔥** : la récompense grimpe jusqu'à **150 💎** à partir de **5 jours** d'affilée.",
          "Rater un jour remet la série à zéro.",
          "Ta progression du défi du jour est **sauvegardée dans le cloud**.",
        ],
      },
      {
        icon: '📜',
        title: 'Quêtes GachaDle',
        changes: [
          "**26 quêtes** à accomplir directement sur la page **GachaDle**, chacune réclamable une seule fois.",
          "**Séries** de 3 à 30 jours, victoires en **moins de 10, 6, 3 ou 2 essais**, **1 à 30 parties** jouées.",
          "Trouve un personnage de **chaque rareté**, de Commun à **Transcendant**.",
          "Accomplis-les toutes pour un bonus de **900 💎**.",
          "Seuls les **défis du jour** réussis comptent : les **parties libres** ne font pas progresser les quêtes.",
        ],
      },
      {
        icon: '🏆',
        title: 'Classement et succès',
        changes: [
          "Nouvel onglet **GachaDle du jour** dans le **Classement** : les joueurs sont classés selon le **nombre d'essais** pour trouver le personnage du jour.",
          "Moins d'essais = meilleure place ; les **ex æquo** partagent le même rang. Le classement repart à zéro en même temps que les **quêtes journalières**.",
          "Ta victoire est envoyée tout de suite : elle apparaît dans le classement dès la prochaine actualisation.",
          "Bascule **Aujourd'hui / Hier** pour revoir le classement du défi de la veille.",
          "Nouveau succès **Pro du GachaverseDLE** : termine toutes les quêtes GachaDle pour débloquer le titre du même nom (**+10 %** d'or).",
        ],
      },
      {
        icon: '🧭',
        title: 'Expéditions',
        changes: [
          "Expédition **Monde des Douzes** : chance d'obtenir un **Œuf de Dragon Primordial** réduite de **75 %** à **25 %**.",
        ],
      },
      {
        icon: '🙈',
        title: 'Anti-spoil',
        changes: [
          "Pour un univers coché, les personnages gardent désormais l'illustration de leur **forme de base**, quelle que soit leur évolution (avant : seulement la forme précédente).",
          "Les cartes de la **bannière du Gacha** respectent maintenant aussi l'anti-spoil.",
          "Chaque univers de la liste affiche le **logo de sa synergie**.",
        ],
      },
    ],
  },
  {
    date: '29/09/2026',
    title: 'Maj v2.6.8',
    changes: [
      "Nouveau cadrage de la carte **Makima — Démon de la Domination** : image dézoomée et recentrée, le visage est maintenant visible en entier.",
    ],
  },
  {
    date: '28/09/2026',
    title: 'Maj v2.6.7',
    changes: [
      "Le **pourcentage de maîtrise** ne compte plus que les paliers **validés** et le **palier suivant** de chaque catégorie.",
      "Exemple : au **niveau 1300**, les paliers 500, 1000 et 1500 comptent, mais pas 2000 et plus tant que 1500 n'est pas validé.",
    ],
  },
  {
    date: '28/09/2026',
    title: 'Maj v2.6.6',
    changes: [
      "Nouvelle **notation alphabétique** dans les **Paramètres**, spécialement pour **Blocky Block** !",
      "Une lettre de plus tous les **3 de puissance** : **A** (10^3), **B** (10^6)... **Z**, puis **AA**, **AB**... **ZZ**, puis **AAA**, **AAB**...",
    ],
  },
  {
    date: '28/09/2026',
    title: 'Maj v2.6.5',
    changes: [
      "**Rokoul & Ayro** : ses évolutions affichent désormais son visuel de base au lieu d'une carte vide, en attendant leurs illustrations.",
      "Même correctif pour tout perso dont une **évolution n'a pas encore d'illustration**.",
      "**Cliquer sur la bande pour accélérer** fonctionne de nouveau lors des tirages de **Prestige** et de l'ouverture des **coffres d'équipement**.",
      "**Nouvelles unités** pour les très grands nombres : après **No**, place à **Dc**, **UDc**, **Vg**... jusqu'à **Ce** (10^303), puis **aa**, **ab**...",
      "Nouvelle option dans les **Paramètres** : afficher les nombres en **notation scientifique** (ex : **1.50e15**).",
    ],
  },
  {
    date: '28/09/2026',
    title: 'Maj v2.6.4',
    changes: [
      "**Ardeur** : le boost plafonnait à **×1.98** à cause d'un bug, le **×2** est désormais atteignable.",
      "**Ardeur** : une fois la jauge pleine, elle **reste au max** tant que tu continues de frapper.",
    ],
  },
  {
    date: '28/09/2026',
    title: 'Maj v2.6.3',
    changes: [
      "**Navigation plus réactive** : changer de page répond jusqu'à **3x plus vite**.",
      "Le jeu consomme **~40 % de processeur en moins** pendant le combat.",
      "Le fond et l'ennemi sont préchargés pendant l'écran de chargement : **arrivée en jeu plus rapide**.",
      "**Compadex** et **Profil** s'ouvrent sans gel, même avec une très grande collection.",
      "Les pages **Compadex**, **Profil** et **Équipement** ne se recalculent plus à chaque seconde de combat.",
    ],
  },
  {
    date: '28/09/2026',
    title: 'Maj v2.6.2',
    changes: [
      "**Optimisation des performances**.",
    ],
  },
  {
    date: '28/09/2026',
    title: 'Maj v2.6.1',
    sections: [
      {
        icon: '🏆',
        title: 'Succès',
        changes: [
          "Page **Succès** refaite : **10 catégories**, rangs **Bronze à Platine**, cartes **à niveaux** avec récompense à chaque palier.",
          "**65 nouveaux succès**, dont des succès **secrets**, et **4 nouveaux titres**.",
          "Recherche, tri et filtres revus, bouton **Tout récupérer**. Ta progression est **conservée**.",
        ],
      },
      {
        icon: '🎖️',
        title: 'Maîtrise & Trophées',
        changes: [
          "Nouvelle **Maîtrise** par personnage : jusqu'à **+20 % de DPS**, conservée après un **Prestige**.",
          "Nouvelle **vitrine de Trophées** (5 succès) sur ton profil.",
          "Clique sur un joueur du **Classement** pour voir son **profil**.",
        ],
      },
      {
        icon: '📊',
        title: 'Combat & or',
        changes: [
          "Survole ton **DPS**, le **BUTIN** ou les **SYNERGIES** en combat pour voir le **détail de chaque bonus**.",
          "Le **bonus d'or** de **tous tes titres débloqués** s'additionne désormais.",
        ],
      },
      {
        icon: '🔍',
        title: 'Filtres de collection',
        changes: [
          "Filtres du **Compadex**, des **Compagnons** et des **Améliorations** redessinés : recherche, pastilles, tri **RARETÉ / DPS / NOM / MAÎTRISE**.",
        ],
      },
      {
        icon: '🐛',
        title: 'Corrections',
        changes: [
          "Le **bonus d'or du prestige** n'est plus compté deux fois **hors-ligne**.",
          "Page **Succès** plus fluide pendant les combats.",
        ],
      },
    ],
  },
  {
    date: '27/09/2026',
    title: 'Forge, expéditions & confort',
    sections: [
      {
        icon: '⚗️',
        title: 'Forge',
        changes: [
          "Forger un personnage déclenche désormais une **animation de révélation** : cercle runique, flash, puis apparition de la carte.",
          "Le statut **Prêt à forger** s'affiche maintenant dans un badge violet discret, sans le halo doré qui bavait autour.",
        ],
      },
      {
        icon: '🧭',
        title: 'Expéditions',
        changes: [
          "L'expédition **Esplanade de Tempest** (Tensei Slime) dure désormais **2h** au lieu de **8h**.",
        ],
      },
      {
        icon: '⭐',
        title: 'Prestige',
        changes: [
          "Nouveau bouton **Utiliser 5 jetons** : 5 roulettes tournent en même temps.",
        ],
      },
      {
        icon: '🎰',
        title: 'Gacha',
        changes: [
          "Le **volume de gacha** sélectionné est mémorisé : en revenant sur la page, tu retombes sur le dernier volume ouvert.",
        ],
      },
    ],
  },
  {
    date: '27/09/2026',
    title: 'Maj v2.6',
    sections: [
      {
        icon: '🎰',
        title: 'Gacha',
        changes: [
          "Nouvelle bannière **Gacha Verse Vol.2** : **214 personnages** et **22 nouveaux univers**, avec leurs synergies.",
          "Deux nouveaux Transcendants : **Satoru Gojo** et **Nightmare Grimm**.",
          "Page Gacha refaite : nouveaux visuels et une couleur propre à chaque bannière.",
        ],
      },
      {
        icon: '⚔️',
        title: 'Combat',
        changes: [
          "**Paliers 41 à 65** : 25 nouveaux mondes avec leurs ennemis, boss et décors.",
          "**Cohésion d'équipe** : des compagnons de niveaux proches donnent jusqu'à **+20 % de DPS**, un gros écart ou un slot vide jusqu'à −20 %.",
          "Les **ultis** lancés pendant un autre se mettent en file d'attente au lieu de l'annuler.",
          "Raids : le boss suivant apparaît automatiquement après une victoire.",
        ],
      },
      {
        icon: '✨',
        title: 'Personnages & objets',
        changes: [
          "**Rokoul & Ayro** (Cosmique) : nouveau boss de raid.",
          "**ElFuZzion** (Mythique) : à forger avec des Œufs de Dragon, via l'expédition « Monde des Douzes » (Twix et Igloo).",
          "**Benimaru** : uniquement à la Forge, contre 30 Cornes de Kijin. Les Éclats de Duplication sont convertis en Cornes.",
          "**31 nouvelles armes spéciales** : 3 Transcendantes, 8 Primordiales, 20 Cosmiques.",
          "Les coffres d'équipement s'ouvrent avec une **roue de tirage animée**.",
        ],
      },
      {
        icon: '🛠️',
        title: 'Confort & correctifs',
        changes: [
          "Toutes les synergies ont leur logo.",
          "Expéditions, recettes de Forge et « Mes drops » triés par rareté.",
          "Les boss peuvent enfin faire tomber de l'équipement.",
          "Les animations Primordiales et Transcendantes ne sont plus sautées.",
          "Barres de taux de drop et Compadex corrigés.",
          "Fini le **lag** en spammant **LVL UP** : chaque amélioration ne recharge plus que **sa carte**.",
          "Le bouton **×10** applique ses 10 niveaux d'un coup.",
        ],
      },
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
