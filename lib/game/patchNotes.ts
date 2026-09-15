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
