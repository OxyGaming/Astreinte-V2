import type { Secteur } from "@/lib/types";

export const secteurs: Secteur[] = [
  {
    id: "s01",
    slug: "pierre-benite-badan",
    nom: "Pierre-Bénite / Badan",
    ligne: "750000",
    trajet: "Pierre-Bénite → Badan",
    description: "Section incluant les postes de Badan P1 et P2, la TVP de Vernaison, les PN 361 et 363.",
    points_acces: [
      {
        nom: "Passerelle Irigny Yvours",
        note: "Souterrain/passerelle — procédure DC07446 Fiche 2.2. En cas d'impraticabilité, aviser uniquement le COGC.",
      },
      {
        nom: "TVP de Vernaison",
        note: "Surveillance complémentaire par prestataire : lun-ven 15h30–20h30. En l'absence du prestataire, AC CCGOL et Badan/Givors Canal prennent les mesures.",
      },
      {
        nom: "Traversée des voies km 541,287",
        note: "Voyant blanc = aucune circulation en approche. Voyant rouge = circulation en approche (zones 201, 203, 204, 206 occupées). En cas de dérangement : aviser Supervision + intervenants sur site.",
      },
      {
        nom: "Souterrain Grigny-Le-Sablon",
        adresse: "76 avenue Marcelin Berthelot, 69500 Grigny",
        note: "Procédure identique à la passerelle Irigny Yvours (DC07446 Fiche 2.2).",
      },
    ],
    procedures: [
      {
        titre: "C2314",
        description: "Le signal C2314 est commandé par CCGOL.",
      },
      {
        titre: "Particularité arrêt prolongé Vernaison (PL)",
        description: "L'arrêt prolongé sur la voie 2 maintient le PN363 fermé. Voir procédure PN363.",
        critique: true,
      },
      {
        titre: "Reprise et cessation P2 de Badan (DC7294)",
        description: "L'aiguilleur cesse et reprend le service aux heures prévues. En son absence, aucun train ne peut être receptionné ou expédié depuis le P2 de Badan.",
        reference: "DC7294",
      },
      {
        titre: "Fiches opératoires IS de Badan (OP56529)",
        description: "Seules les voies 202, 204 et 216 du faisceau appartiennent au SGC. L'astreinteur utilise ces procédures uniquement pour dégager le RFN.",
        reference: "OP56529",
        etapes: [
          "Du C3 ou du Cv4 vers voies 202, 204 ou 216 — NÉCESSITE REPRISE DU SERVICE P2",
          "Manœuvre voie 216 vers voie impasse B",
          "Manœuvre voie 216 vers voie 2 — NÉCESSITE REPRISE DU SERVICE P2",
          "Cessation et reprise Badan P1 (DC7292)",
        ],
      },
      {
        titre: "Cessation du service Badan P1 (DC7292)",
        description: "Conditions requises avant cessation : P2 doit avoir cessé, aucune circulation engagée sur V1 entre Perrache P24 et Badan, tous trains terminus passés ou supprimés.",
        reference: "DC7292",
        etapes: [
          "Aviser verbalement le Régulateur de la cessation prochaine",
          "Mettre tous les leviers en position normale (+)",
          "Mettre les leviers 16, 30 et 53 en position renversée (-) pour continuité V1 et V2",
          "Ouvrir les carrés : V1 — carré 55 (levier 55), carré 3² (levier 51) | V2 — carré 9 (levier 9)",
          "Annuler la fermeture automatique des carrés",
          "Aviser par dépêche les postes encadrants",
          "Aviser verbalement le Régulateur ou CRC",
          "Mettre HS le commutateur des contrôles d'alimentation",
          "Choisir le scénario exploitation sur téléphone CTFU",
        ],
        critique: true,
      },
      {
        titre: "Répartition des blocs de Badan",
        description: "Voies 202, 204 et 216 appartiennent au SGC. Manœuvres possibles listées dans l'annexe 2 de la Consigne Rose de Badan.",
        etapes: [
          "Du C9 vers voie 216",
          "Tête à queue : passer par bloc M (bloc spatio-temporel), retour par voie 202 ou 204",
          "Du Cv61 ou Cv62 vers Lozanne — dégager le Cv8 (derrière Cv8 : voie partiellement électrifiée, 2 machines max)",
          "Du Cv8 vers voie 216",
        ],
      },
    ],
    pn: [
      {
        numero: "PN 363",
        axe: "Route D36 — axe fréquenté — impact fort si raté d'ouverture",
        contact_urgence: "Gendarmerie Irigny : 04 78 50 30 33",
        note: "Aviser la gendarmerie d'Irigny en plus des avis réglementaires.",
      },
      {
        numero: "PN 361",
        note: "Normalement fermé — Ouverture Sur Demande Préalable. Portails cadenassés. Ouverture uniquement après demande à l'UP Voie. GPS: 45.63053, 4.80389. Si indûment ouvert : appliquer DC1503 Fiche 8.4.",
      },
    ],
  },
  {
    id: "s02",
    slug: "givors-canal",
    nom: "Givors Canal",
    ligne: "750000",
    trajet: "Section Givors Canal",
    description: "Section Givors Canal avec accès particuliers spécifiques.",
    points_acces: [
      {
        nom: "Accès côté avenue Marcelin Berthelot",
        adresse: "76 avenue Marcelin Berthelot, 69500 Grigny",
      },
      {
        nom: "Accès Tunnel de Givors côté Givors",
        adresse: "35 rue de Pieroux, 69700 Givors",
        gps: "45°34'54''N 4°46'12''E",
        note: "Parking du poste de Givors Canal pour accès côté opposé.",
      },
    ],
    procedures: [],
  },
  {
    id: "s03",
    slug: "givors-peyraud",
    nom: "Givors Canal / Peyraud",
    ligne: "800000",
    trajet: "Givors Canal → Peyraud",
    description: "Section Ligne 800000 incluant le Point A, Point S, la manœuvre de Condrieu et les PN 16/17/18/29.",
    points_acces: [
      {
        nom: "Point A — km 541,8",
        adresse: "543 RD 386, Saint Romain En Gal",
        note: "En cas de dérangement Enclenchement d'Approche : envoyer agent habilité EIC. Agent doit prendre le carnet de coupon du poste de Givors Canal. Commande manuelle PN5 disponible.",
        reference: "OP54730",
      } as const,
      {
        nom: "Point S — km 538,4",
        adresse: "Saint Romain En Gal (69560)",
        gps: "45.5476641, 4.8261883",
        reference: "OP54730",
      } as const,
      {
        nom: "Point de manœuvre Condrieu",
        adresse: "Condrieu",
        note: "ATr 1: km 552,082 | ATr 2: km 552,012 | ATr 3: km 553,100 | ATr 4: km 553,178. Capots fermés par serrure à clé de berne.",
        reference: "OP54721",
      } as const,
      {
        nom: "Accès particulier Serrières",
        adresse: "159 rue Joseph Roche, 07340 Serrières",
      } as const,
    ],
    procedures: [
      {
        titre: "Compagnie Nationale du Rhône (CNR)",
        description: "Les voies CNR à Condrieu appartiennent à la CNR. Contact : 04 74 78 38 80. Adresse : Z.A. de Vérenay BP 77, 69420 Condrieu.",
      },
      {
        titre: "Manœuvres de Condrieu (OP54721)",
        description: "Trois types de manœuvres possibles : Cv31 vers Voie 4, C41 vers Voie A Tiroir, Cv31 vers Voie A Tiroir via aiguille B.",
        reference: "OP54721",
        etapes: [
          "Du Cv31 vers Voie 4 : procédure standard",
          "Du C41 vers Voie A Tiroir : impasse machine depuis voie 1 terminus voie A pour retour Givors Canal",
          "Du Cv31 vers Voie A Tiroir via aiguille B : impasse machine depuis voie 2 terminus voie A pour retour Peyraud",
        ],
      },
    ],
    pn: [
      {
        numero: "PN 16",
        axe: "RN 86 à Condrieu",
        contact_urgence: "Gendarmerie Ampuis : 04 74 56 10 26",
        note: "Aviser en plus des avis réglementaires si raté d'ouverture.",
      },
      {
        numero: "PN 17",
        axe: "RN 86 à Condrieu",
        contact_urgence: "Gendarmerie Ampuis : 04 74 56 10 26",
      },
      {
        numero: "PN 18",
        axe: "RN 86 à Condrieu",
        contact_urgence: "Gendarmerie Ampuis : 04 74 56 10 26",
      },
      {
        numero: "PN 29",
        axe: "RN 86 à Limony",
        contact_urgence: "Gendarmerie Serrières : 04 75 34 02 02",
        note: "Aviser en plus des avis réglementaires si raté d'ouverture.",
      },
    ],
  },
  {
    id: "s04",
    slug: "peyraud",
    nom: "Peyraud",
    ligne: "800000",
    trajet: "Section Peyraud",
    description: "Section terminale ligne 800000 incluant le Point F et le PN 37.",
    points_acces: [
      {
        nom: "Accès Peyraud",
        note: "Le chemin longe le RAC Nord.",
      },
    ],
    procedures: [
      {
        titre: "Manœuvre Point F",
        description: "Manœuvres possibles au Point F : Cv12 vers Voie Principale, Cv12 vers voies 3 et 5.",
        etapes: [
          "Du Cv1 vers voie 2bis : Cv1 s'ouvre avec clé Cv12b si voie 2bis occupée et train a attaqué la pédale",
          "Si voie 2bis libre : Cv1 ne s'ouvre pas — bulletin CBA délivré par PRS",
          "Au-F : permet de prendre clé C13 (ouverture carré 13) et clé Cv12p",
          "Du Cv12 vers VP : Prendre Au F, ouvrir Cv12 avec clé Cv12P",
          "Du Cv12 vers voies 3 et 5 : Prendre Au F, tracer itinéraire avec clé Cv12P, les 2 leviers renversés libèrent clé Cv12F",
        ],
        critique: false,
      },
      {
        titre: "Réception occupée V1bis côté SUD",
        description: "Un bouton poussoir situé sur le C11 permet la réception occupée V1bis côté SUD.",
        critique: false,
      },
    ],
    pn: [
      {
        numero: "PN 35",
        axe: "Section Peyraud",
        note: "En cas d'arrêt au carré 578,7 : PN 35 maintenu fermé — voir art. 204 consigne rose.",
      },
      {
        numero: "PN 37",
        axe: "RN 86 à Andance",
        contact_urgence: "Gendarmerie Andance : 04 75 34 21 44",
        note: "Aviser en plus des avis réglementaires si raté d'ouverture.",
      },
    ],
  },
  {
    id: "s05",
    slug: "givors-ville-treves-burel",
    nom: "Givors Ville / Trèves-Burel",
    ligne: "750000",
    trajet: "Givors Ville → Trèves-Burel",
    description: "Section incluant l'EP Couzon, la commande locale de Trèves-Burel et les détecteurs de chute de rochers.",
    points_acces: [
      {
        nom: "EP Couzon",
        adresse: "Route des étangs, 42800 Chateauneuf",
        gps: "45.538259, 4.644833",
      },
      {
        nom: "Poste de Trèves-Burel",
        adresse: "km 528,775 — Ligne 750000",
        gps: "45.545420, 4.670380",
        note: "Clé d'accès au poste à récupérer à Givors Ville. Prendre également une clé de parcours pour le portail. Parking — accès côté voie 2.",
      },
    ],
    procedures: [
      {
        titre: "Reprise en commandes locales de Trèves-Burel",
        description: "Procédure de reprise en commandes locales depuis le poste de Trèves-Burel.",
        critique: true,
        etapes: [
          "Récupérer la clé d'accès à Givors Ville + clé de parcours pour portail",
          "Prendre l'impasse à gauche pour accéder au parking",
          "Allumer le TCO : interrupteur sur côté droit du PRS",
          "ATTENTION lors de la bascule : le clapet ferme à fleur des boutons — éviter pression trop forte (risque d'appuyer à nouveau sur les boutons)",
          "Vérifier le voyant avant de recouponer",
          "Givors Ville télécommande Trèves-Burel dans ce mode",
          "Avant de partir : remettre le téléphone hors service et éteindre le TCO",
        ],
      },
      {
        titre: "Détecteurs de chute de rochers",
        description: "Descriptions et procédures dans la consigne EIC RA DC 7441.",
        reference: "EIC RA DC 7441",
      },
    ],
  },
  {
    id: "s06",
    slug: "rive-de-gier-chateaucreux",
    nom: "Rive De Gier / Châteaucreux P2",
    ligne: "750000",
    trajet: "Rive De Gier → Châteaucreux P2",
    description: "Section incluant Châteaucreux P2, Pont de l'Ane P2, Tunnel de Terrenoire, Souterrain de St Chamond et Rive De Gier.",
    points_acces: [
      {
        nom: "Châteaucreux P2",
        adresse: "Rue Achille Haubtmann, St Etienne",
        note: "Parking à proximité prévu courant 2024.",
      },
      {
        nom: "Pont de l'Ane P2 — Clé extérieure",
        note: "En cas de cessation : clé dans boîtier extérieur entre les deux blocs de climatisation. CODE : 3842",
        code: "3842",
      },
      {
        nom: "Tunnel de Terrenoire — côté St Etienne",
        adresse: "Accès depuis parking de Pont de l'Ane P2",
      },
      {
        nom: "Tunnel de Terrenoire — côté Lyon",
        adresse: "Rue Bertrand Russel, Terrenoire",
        gps: "45.434856, 4.442631",
        note: "Clé de parcours pour le portillon. En cas de transbordement : escalier à la sortie du tunnel remonte sur place Jean et Hippolyte Vial à Terrenoire.",
      },
      {
        nom: "Souterrain St Chamond — Pas d'IPCS",
        adresse: "Rue du Tonkin, 42207 St Chamond",
      },
      {
        nom: "Aiguille 1 Rive De Gier",
        adresse: "Impasse de Château, 42800 Rive De Gier",
        note: "Clé de parcours pour ouvrir le portail.",
      },
    ],
    procedures: [
      {
        titre: "Souterrain de St Chamond — Impraticabilité",
        description: "En cas d'impraticabilité du souterrain, appliquer EIC RA DC7441 et DC1503.",
        reference: "EIC RA DC7441 + DC1503",
        etapes: [
          "Prendre les mesures prévues à la fiche 10.4 de la DC01503",
          "L'AC d'un des postes encadrants est avisé par dépêche du rétablissement par G&C",
          "Lever les mesures conformément à la fiche 10.4 de la DC01503",
        ],
      },
      {
        titre: "Transbordement au Tunnel de Terrenoire côté Lyon",
        description: "Un escalier à la sortie du tunnel remonte sur la place Jean et Hippolyte Vial à Terrenoire. Clé de parcours requise.",
        etapes: [
          "Accès côté Lyon : Rue Bertrand Russel à Terrenoire (GPS: 45.434856, 4.442631)",
          "Clé de parcours ouvre le portillon",
          "Escalier permet la montée sur la place publique",
        ],
      },
      {
        titre: "Orage violent — Pont de l'Ane P2 (DC07066)",
        description: "En cas d'orages et pluies importantes, alerter immédiatement via le centre de supervision le Chef d'UP Voie ou le cadre d'astreinte.",
        reference: "EIC RA DC07066",
        critique: true,
        etapes: [
          "Si eau sort des regards sous le pont côté parking agent : risque d'inondation de la plateforme",
          "L'AC constatant cela prend les mesures correspondant à un obstacle",
          "Châteaucreux P2 avise le COGC (régulateur ou CRC) pour préavis DRI + Supervision",
          "Châteaucreux P2 avise l'astreinte Circulation St Etienne pour surveillance du site",
          "Sur demande de l'astreinte ou de l'agent Inframaintenance : prendre mesures pour arrêter circulations vers Pont de l'Ane P2",
          "Aviser Givors Ville pour mêmes mesures",
          "La restitution à vitesse normale ne peut être prononcée que par un cadre Voie (Chef UP Voie, Dirigeant astreinte ou autre dirigeant présent)",
        ],
      },
    ],
  },
];
