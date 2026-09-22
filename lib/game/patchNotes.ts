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
