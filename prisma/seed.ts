import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const rawUrl = process.env["DATABASE_URL"] ?? "file:./prisma/dev.db";
const dbPath = rawUrl.replace(/^file:/, "");
const url = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath);
const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter });

// ─── Données issues des fichiers statiques ────────────────────────────────────

const contactsData = [
  { id: "suge", nom: "SUGE", role: "Sûreté ferroviaire", categorie: "urgence", telephone: "04 78 65 52 53", telephoneAlt: "19", note: "19 depuis un poste fixe", disponibilite: "24h/24" },
  { id: "supervision", nom: "Supervision", role: "Centre de supervision", categorie: "urgence", telephone: "04 26 21 18 44", disponibilite: "24h/24" },
  { id: "crc-cil", nom: "CRC ligne CIL", role: "Coordinateur Régional des Circulations — ligne CIL", categorie: "urgence", telephone: "04 26 21 78 18", disponibilite: "24h/24" },
  { id: "astreinte-loire", nom: "Astreinte Loire", role: "Astreinte secteur Loire", categorie: "astreinte", telephone: "06 10 46 30 65", disponibilite: "Période d'astreinte" },
  { id: "astreinte-gier", nom: "Astreinte Gier", role: "Astreinte secteur Gier / Rive Droite Nord", categorie: "astreinte", telephone: "06 19 56 36 55", disponibilite: "Période d'astreinte" },
  { id: "astreinte-nord", nom: "Astreinte Nord", role: "Astreinte secteur Nord", categorie: "astreinte", telephone: "06 17 28 21 64", disponibilite: "Période d'astreinte" },
  { id: "dti", nom: "DTI", role: "Dirigeant Territorial Infra", categorie: "encadrement", telephone: "06 09 73 40 20", disponibilite: "Astreinte" },
  { id: "dto", nom: "DTO", role: "Dirigeant Territorial Opérations", categorie: "encadrement", telephone: "06 24 95 69 90", disponibilite: "Astreinte" },
  { id: "soutien-psy", nom: "Pôle soutien psychologique", role: "Soutien psychologique agents", categorie: "urgence", telephone: "0800 39 17 87", note: "Numéro gratuit — disponible 24h/24", disponibilite: "24h/24" },
  { id: "gendarmerie-irigny", nom: "Gendarmerie Irigny", role: "Autorités — PN 363 (D36)", categorie: "externe", telephone: "04 78 50 30 33", note: "Aviser en cas de raté d'ouverture PN 363" },
  { id: "gendarmerie-ampuis", nom: "Gendarmerie Ampuis", role: "Autorités — PN 16, 17, 18 (RN 86 Condrieu)", categorie: "externe", telephone: "04 74 56 10 26", note: "Aviser en cas de raté d'ouverture PN 16, 17, 18" },
  { id: "gendarmerie-serrieres", nom: "Gendarmerie Serrières", role: "Autorités — PN 29 (RN 86 Limony)", categorie: "externe", telephone: "04 75 34 02 02", note: "Aviser en cas de raté d'ouverture PN 29" },
  { id: "gendarmerie-andance", nom: "Gendarmerie Andance", role: "Autorités — PN 37 (RN 86 Andance)", categorie: "externe", telephone: "04 75 34 21 44", note: "Aviser en cas de raté d'ouverture PN 37" },
  { id: "cnr-condrieu", nom: "Compagnie Nationale du Rhône", role: "Gestionnaire voies CNR — Condrieu", categorie: "externe", telephone: "04 74 78 38 80", note: "Z.A. de Vérenay BP 77, 69420 Condrieu" },
];

const secteursData = [
  {
    id: "s01", slug: "pierre-benite-badan", nom: "Pierre-Bénite / Badan", ligne: "750000",
    trajet: "Pierre-Bénite → Badan",
    description: "Section incluant les postes de Badan P1 et P2, la TVP de Vernaison, les PN 361 et 363.",
    pointsAcces: JSON.stringify([
      { nom: "Passerelle Irigny Yvours", note: "Souterrain/passerelle — procédure DC07446 Fiche 2.2. En cas d'impraticabilité, aviser uniquement le COGC." },
      { nom: "TVP de Vernaison", note: "Surveillance complémentaire par prestataire : lun-ven 15h30–20h30." },
      { nom: "Traversée des voies km 541,287", note: "Voyant blanc = aucune circulation en approche. Voyant rouge = circulation en approche." },
      { nom: "Souterrain Grigny-Le-Sablon", adresse: "76 avenue Marcelin Berthelot, 69500 Grigny", note: "Procédure identique à la passerelle Irigny Yvours (DC07446 Fiche 2.2)." },
    ]),
    procedures: JSON.stringify([
      { titre: "C2314", description: "Le signal C2314 est commandé par CCGOL." },
      { titre: "Particularité arrêt prolongé Vernaison (PL)", description: "L'arrêt prolongé sur la voie 2 maintient le PN363 fermé.", critique: true },
      { titre: "Reprise et cessation P2 de Badan (DC7294)", description: "L'aiguilleur cesse et reprend le service aux heures prévues.", reference: "DC7294" },
      { titre: "Fiches opératoires IS de Badan (OP56529)", description: "Seules les voies 202, 204 et 216 du faisceau appartiennent au SGC.", reference: "OP56529", etapes: ["Du C3 ou du Cv4 vers voies 202, 204 ou 216", "Manœuvre voie 216 vers voie impasse B", "Cessation et reprise Badan P1 (DC7292)"] },
      { titre: "Cessation du service Badan P1 (DC7292)", description: "Conditions requises avant cessation : P2 doit avoir cessé.", reference: "DC7292", critique: true, etapes: ["Aviser verbalement le Régulateur", "Mettre tous les leviers en position normale (+)", "Mettre les leviers 16, 30 et 53 en position renversée (-)", "Ouvrir les carrés V1 et V2", "Aviser par dépêche les postes encadrants"] },
    ]),
    pn: JSON.stringify([
      { numero: "PN 363", axe: "Route D36 — axe fréquenté", contact_urgence: "Gendarmerie Irigny : 04 78 50 30 33", note: "Aviser la gendarmerie d'Irigny en plus des avis réglementaires." },
      { numero: "PN 361", note: "Normalement fermé — Ouverture Sur Demande Préalable. Portails cadenassés." },
    ]),
  },
  {
    id: "s02", slug: "givors-canal", nom: "Givors Canal", ligne: "750000",
    trajet: "Section Givors Canal",
    description: "Section Givors Canal avec accès particuliers spécifiques.",
    pointsAcces: JSON.stringify([
      { nom: "Accès côté avenue Marcelin Berthelot", adresse: "76 avenue Marcelin Berthelot, 69500 Grigny" },
      { nom: "Accès Tunnel de Givors côté Givors", adresse: "35 rue de Pieroux, 69700 Givors", gps: "45°34'54''N 4°46'12''E" },
    ]),
    procedures: JSON.stringify([]),
    pn: null,
  },
  {
    id: "s03", slug: "givors-peyraud", nom: "Givors Canal / Peyraud", ligne: "800000",
    trajet: "Givors Canal → Peyraud",
    description: "Section Ligne 800000 incluant le Point A, Point S, la manœuvre de Condrieu et les PN 16/17/18/29.",
    pointsAcces: JSON.stringify([
      { nom: "Point A — km 541,8", adresse: "543 RD 386, Saint Romain En Gal" },
      { nom: "Point S — km 538,4", adresse: "Saint Romain En Gal (69560)", gps: "45.5476641, 4.8261883" },
      { nom: "Point de manœuvre Condrieu", adresse: "Condrieu" },
    ]),
    procedures: JSON.stringify([
      { titre: "Compagnie Nationale du Rhône (CNR)", description: "Les voies CNR à Condrieu appartiennent à la CNR. Contact : 04 74 78 38 80." },
      { titre: "Manœuvres de Condrieu (OP54721)", description: "Trois types de manœuvres possibles.", reference: "OP54721", etapes: ["Du Cv31 vers Voie 4", "Du C41 vers Voie A Tiroir", "Du Cv31 vers Voie A Tiroir via aiguille B"] },
    ]),
    pn: JSON.stringify([
      { numero: "PN 16", axe: "RN 86 à Condrieu", contact_urgence: "Gendarmerie Ampuis : 04 74 56 10 26" },
      { numero: "PN 17", axe: "RN 86 à Condrieu", contact_urgence: "Gendarmerie Ampuis : 04 74 56 10 26" },
      { numero: "PN 18", axe: "RN 86 à Condrieu", contact_urgence: "Gendarmerie Ampuis : 04 74 56 10 26" },
      { numero: "PN 29", axe: "RN 86 à Limony", contact_urgence: "Gendarmerie Serrières : 04 75 34 02 02" },
    ]),
  },
  {
    id: "s04", slug: "peyraud", nom: "Peyraud", ligne: "800000",
    trajet: "Section Peyraud",
    description: "Section terminale ligne 800000 incluant le Point F et le PN 37.",
    pointsAcces: JSON.stringify([{ nom: "Accès Peyraud", note: "Le chemin longe le RAC Nord." }]),
    procedures: JSON.stringify([
      { titre: "Manœuvre Point F", description: "Manœuvres possibles au Point F.", etapes: ["Du Cv12 vers VP", "Du Cv12 vers voies 3 et 5"] },
    ]),
    pn: JSON.stringify([
      { numero: "PN 35", axe: "Section Peyraud", note: "En cas d'arrêt au carré 578,7 : PN 35 maintenu fermé." },
      { numero: "PN 37", axe: "RN 86 à Andance", contact_urgence: "Gendarmerie Andance : 04 75 34 21 44" },
    ]),
  },
  {
    id: "s05", slug: "givors-ville-treves-burel", nom: "Givors Ville / Trèves-Burel", ligne: "750000",
    trajet: "Givors Ville → Trèves-Burel",
    description: "Section incluant l'EP Couzon, la commande locale de Trèves-Burel et les détecteurs de chute de rochers.",
    pointsAcces: JSON.stringify([
      { nom: "EP Couzon", adresse: "Route des étangs, 42800 Chateauneuf", gps: "45.538259, 4.644833" },
      { nom: "Poste de Trèves-Burel", adresse: "km 528,775 — Ligne 750000", gps: "45.545420, 4.670380", note: "Clé d'accès au poste à récupérer à Givors Ville." },
    ]),
    procedures: JSON.stringify([
      { titre: "Reprise en commandes locales de Trèves-Burel", description: "Procédure de reprise en commandes locales depuis le poste de Trèves-Burel.", critique: true, etapes: ["Récupérer la clé d'accès à Givors Ville", "Allumer le TCO : interrupteur sur côté droit du PRS", "Givors Ville télécommande Trèves-Burel dans ce mode"] },
      { titre: "Détecteurs de chute de rochers", description: "Descriptions et procédures dans la consigne EIC RA DC 7441.", reference: "EIC RA DC 7441" },
    ]),
    pn: null,
  },
  {
    id: "s06", slug: "rive-de-gier-chateaucreux", nom: "Rive De Gier / Châteaucreux P2", ligne: "750000",
    trajet: "Rive De Gier → Châteaucreux P2",
    description: "Section incluant Châteaucreux P2, Pont de l'Ane P2, Tunnel de Terrenoire, Souterrain de St Chamond et Rive De Gier.",
    pointsAcces: JSON.stringify([
      { nom: "Châteaucreux P2", adresse: "Rue Achille Haubtmann, St Etienne" },
      { nom: "Pont de l'Ane P2 — Clé extérieure", note: "CODE : 3842", code: "3842" },
      { nom: "Tunnel de Terrenoire — côté Lyon", adresse: "Rue Bertrand Russel, Terrenoire", gps: "45.434856, 4.442631" },
      { nom: "Aiguille 1 Rive De Gier", adresse: "Impasse de Château, 42800 Rive De Gier" },
    ]),
    procedures: JSON.stringify([
      { titre: "Souterrain de St Chamond — Impraticabilité", description: "En cas d'impraticabilité du souterrain, appliquer EIC RA DC7441 et DC1503.", reference: "EIC RA DC7441 + DC1503" },
      { titre: "Orage violent — Pont de l'Ane P2 (DC07066)", description: "En cas d'orages et pluies importantes, alerter immédiatement via le centre de supervision.", reference: "EIC RA DC07066", critique: true },
    ]),
    pn: null,
  },
];

const fichesData = [
  { id: "f01", slug: "dirigeant-enquete", numero: 1, titre: "Dirigeant d'enquête (OP522)", categorie: "incident", priorite: "urgente", mnemonique: "CAMMI CoCo RR", resume: "Protocole à appliquer lorsque vous êtes désigné Dirigeant d'enquête par le COGC suite à un événement de sécurité.", etapes: JSON.stringify([{ ordre: 1, titre: "Désignation par le COGC", description: "Le COGC vous désigne Dirigeant d'enquête. Vérifier la validité de votre attestation DE (valable 3 ans).", actions: ["Confirmer votre désignation au COGC", "Vérifier la validité de l'attestation DE"] }, { ordre: 2, titre: "Mesures d'urgence (MU)", description: "Vérifier l'intégrité des personnes, des biens et de l'environnement.", critique: true, actions: ["Évaluer l'état des personnes impliquées", "Déclencher les secours si nécessaire (15 / 18 / 17)"] }, { ordre: 3, titre: "Mesures conservatoires (MC)", description: "Si risque grave ou imminent : aviser COGC → CNOC → EPSF + EF.", critique: true }, { ordre: 4, titre: "Conduire l'investigation (HIPE)", description: "Recueillir les éléments factuels selon HIPE : Humains, Infrastructure, Procédures, Environnement." }, { ordre: 5, titre: "Rédaction du RCI", description: "3 premiers feuillets sous 12h, distribution finale sous 72h.", critique: true }]), contacts: ["supervision", "crc-cil"], references: JSON.stringify(["OP522"]), avisObligatoires: JSON.stringify(["COGC", "CNOC si MC", "EPSF + EF si MC"]) },
  { id: "f02", slug: "accident-personne", numero: 2, titre: "Accident de personne", categorie: "accident", priorite: "urgente", mnemonique: "FIMERMO + CARBEMI", resume: "Conduite à tenir lors d'un accident impliquant une ou plusieurs personnes sur ou à proximité des voies.", etapes: JSON.stringify([{ ordre: 1, titre: "Protection immédiate de la voie", description: "Protéger immédiatement la voie et établir une Zone Dangereuse (ZD).", critique: true }, { ordre: 2, titre: "Déclencher les secours", description: "Appeler immédiatement le 15 (SAMU), 18 (Pompiers) ou 17 (Police).", critique: true }, { ordre: 3, titre: "Aviser la hiérarchie", description: "Aviser COGC, CRC, et toute la chaîne." }, { ordre: 4, titre: "CARBEMI à l'arrivée sur site", description: "Appliquer le protocole CARBEMI à l'arrivée." }]), contacts: ["supervision", "crc-cil", "suge"], references: JSON.stringify(["OP522"]), avisObligatoires: JSON.stringify(["COGC", "CRC", "SUGE", "Secours 15/18/17"]) },
  { id: "f03", slug: "accident-pn", numero: 3, titre: "Accident à un PN", categorie: "accident", priorite: "urgente", mnemonique: "FCCCA CCR SVPFE", resume: "Procédure à suivre en cas d'accident ou d'incident à un passage à niveau.", etapes: JSON.stringify([{ ordre: 1, titre: "Figer et protéger", description: "Figer immédiatement la situation et protéger le PN.", critique: true }, { ordre: 2, titre: "Aviser COGC et CRC", description: "Aviser immédiatement COGC et CRC.", critique: true }, { ordre: 3, titre: "Contacter la gendarmerie locale", description: "Aviser la gendarmerie du secteur concerné." }, { ordre: 4, titre: "Sécuriser la zone", description: "Établir un périmètre de sécurité autour du PN." }]), contacts: ["supervision", "crc-cil"], references: JSON.stringify(["DC1503"]), avisObligatoires: JSON.stringify(["COGC", "CRC", "Gendarmerie locale"]) },
  { id: "f04", slug: "deraillement", numero: 4, titre: "Déraillement / Talonnage / Bi-voie", categorie: "accident", priorite: "urgente", mnemonique: "FIMERMO", resume: "Conduite à tenir en cas de déraillement, talonnage d'aiguille ou mise bi-voie d'un engin.", etapes: JSON.stringify([{ ordre: 1, titre: "Figer la situation", description: "Ne modifier aucun élément avant constatation.", critique: true }, { ordre: 2, titre: "Protéger les voies concernées", description: "Établir les protections réglementaires sur toutes les voies impliquées.", critique: true }, { ordre: 3, titre: "Aviser la hiérarchie", description: "COGC, CRC, DTI selon gravité." }, { ordre: 4, titre: "Relevé des positions", description: "Noter les positions des leviers et éléments de preuve pour le RCI." }]), contacts: ["supervision", "crc-cil", "dti"], references: JSON.stringify(["OP522"]), avisObligatoires: JSON.stringify(["COGC", "CRC", "DTI"]) },
  { id: "f05", slug: "colis-suspect", numero: 5, titre: "Colis suspect", categorie: "securite", priorite: "urgente", mnemonique: "FCCCA CCR SVPFE", resume: "Conduite à tenir face à un colis suspect ou un objet abandonné sur l'infrastructure ferroviaire.", etapes: JSON.stringify([{ ordre: 1, titre: "Ne pas toucher", description: "Ne jamais toucher, déplacer ou ouvrir le colis suspect.", critique: true }, { ordre: 2, titre: "Évacuer la zone", description: "Établir un périmètre de sécurité immédiatement.", critique: true }, { ordre: 3, titre: "Aviser COGC et SUGE", description: "Transmettre une description précise du colis et de sa localisation." }, { ordre: 4, titre: "Attendre les autorités", description: "Ne reprendre les circulations qu'après accord des autorités compétentes." }]), contacts: ["suge", "supervision"], references: JSON.stringify([]), avisObligatoires: JSON.stringify(["COGC", "SUGE", "Police/Gendarmerie"]) },
  { id: "f06", slug: "incendie-abords-voies", numero: 6, titre: "Incendie aux abords des voies", categorie: "securite", priorite: "urgente", mnemonique: "FCCCA CCR SVPFE", resume: "Conduite à tenir en cas d'incendie à proximité ou sur l'infrastructure ferroviaire.", etapes: JSON.stringify([{ ordre: 1, titre: "Évaluer le danger", description: "Évaluer si l'incendie menace l'infrastructure ou les circulations.", critique: true }, { ordre: 2, titre: "Aviser COGC", description: "Aviser immédiatement le COGC avec localisation précise." }, { ordre: 3, titre: "Déclencher les secours", description: "Appeler le 18 (Pompiers).", critique: true }, { ordre: 4, titre: "Protéger si nécessaire", description: "Prendre les mesures de protection si l'incendie menace la voie." }]), contacts: ["supervision", "crc-cil"], references: JSON.stringify([]), avisObligatoires: JSON.stringify(["COGC", "Pompiers 18"]) },
  { id: "f07", slug: "franchissement-signal", numero: 7, titre: "Franchissement signal", categorie: "incident", priorite: "urgente", mnemonique: "CAMMI CoCo RR", resume: "Procédure de gestion d'un franchissement de signal fermé (RSF, RSATC, etc.).", etapes: JSON.stringify([{ ordre: 1, titre: "Figer la situation", description: "Arrêter immédiatement toute circulation susceptible d'être en conflit.", critique: true }, { ordre: 2, titre: "Localiser le train", description: "Déterminer la position exacte du train concerné." }, { ordre: 3, titre: "Aviser COGC et CRC", description: "Transmettre tous les renseignements utiles.", critique: true }, { ordre: 4, titre: "Désigner un DE si nécessaire", description: "Si l'événement le justifie, le COGC désigne un Dirigeant d'enquête." }]), contacts: ["supervision", "crc-cil"], references: JSON.stringify(["OP522"]), avisObligatoires: JSON.stringify(["COGC", "CRC", "DE si désigné"]) },
  { id: "f08", slug: "agression-agent", numero: 8, titre: "Agression d'un agent", categorie: "gestion-agent", priorite: "urgente", mnemonique: "FCCCA CCR SVPFE", resume: "Conduite à tenir en cas d'agression physique ou verbale grave d'un agent.", etapes: JSON.stringify([{ ordre: 1, titre: "Sécuriser l'agent", description: "Assurer la sécurité immédiate de l'agent agressé.", critique: true }, { ordre: 2, titre: "Appeler les secours", description: "15 si urgence médicale, 17 pour intervention police.", critique: true }, { ordre: 3, titre: "Aviser SUGE et hiérarchie", description: "Aviser la SUGE, le COGC et la hiérarchie." }, { ordre: 4, titre: "Soutien psychologique", description: "Proposer le soutien psychologique dès que possible." }]), contacts: ["suge", "supervision", "soutien-psy"], references: JSON.stringify([]), avisObligatoires: JSON.stringify(["COGC", "SUGE", "Hiérarchie"]) },
  { id: "f09", slug: "evacuation-train", numero: 9, titre: "Évacuation d'un train", categorie: "evacuation", priorite: "urgente", mnemonique: "FIMERMO + CARBEMI", resume: "Procédure d'évacuation d'un train en ligne ou en gare.", etapes: JSON.stringify([{ ordre: 1, titre: "Évaluer la situation", description: "Déterminer si l'évacuation est nécessaire et urgente.", critique: true }, { ordre: 2, titre: "Coordonner avec l'EF", description: "Coordonner l'évacuation avec le conducteur et l'EF." }, { ordre: 3, titre: "Sécuriser le périmètre", description: "Protéger les voies adjacentes avant évacuation.", critique: true }, { ordre: 4, titre: "Guider les voyageurs", description: "Organiser l'évacuation vers un lieu sûr." }]), contacts: ["supervision", "crc-cil"], references: JSON.stringify([]), avisObligatoires: JSON.stringify(["COGC", "CRC", "EF"]) },
  { id: "f10", slug: "derangement-pn", numero: 10, titre: "Dérangement d'un PN", categorie: "incident", priorite: "urgente", mnemonique: "FCCCA CCR SVPFE", resume: "Procédure à appliquer lors d'un dérangement d'un passage à niveau (non-ouverture, non-fermeture, etc.).", etapes: JSON.stringify([{ ordre: 1, titre: "Identifier le dérangement", description: "Déterminer la nature précise du dérangement (non-fermeture, non-ouverture, blocage)." }, { ordre: 2, titre: "Protéger le PN", description: "Prendre les mesures de protection réglementaires.", critique: true }, { ordre: 3, titre: "Aviser la gendarmerie locale", description: "Contacter la gendarmerie territorialement compétente." }, { ordre: 4, titre: "Aviser COGC et maintenance", description: "Aviser le COGC et demander l'intervention de la maintenance PN." }]), contacts: ["supervision", "crc-cil"], references: JSON.stringify(["DC1503"]), avisObligatoires: JSON.stringify(["COGC", "CRC", "Gendarmerie locale", "Maintenance PN"]) },
  { id: "f11", slug: "obstacle-voie", numero: 11, titre: "Obstacle sur la voie", categorie: "securite", priorite: "urgente", mnemonique: "FCCCA CCR SVPFE", resume: "Conduite à tenir en présence d'un obstacle sur la voie ferrée.", etapes: JSON.stringify([{ ordre: 1, titre: "Protéger immédiatement", description: "Arrêter toute circulation susceptible de rencontrer l'obstacle.", critique: true }, { ordre: 2, titre: "Identifier et localiser", description: "Localiser précisément l'obstacle et en estimer les dimensions et la nature." }, { ordre: 3, titre: "Aviser COGC", description: "Transmettre tous les renseignements au COGC." }, { ordre: 4, titre: "Dégager si possible", description: "Si sans danger, faire dégager l'obstacle par un agent habilité." }]), contacts: ["supervision", "crc-cil"], references: JSON.stringify([]), avisObligatoires: JSON.stringify(["COGC", "CRC"]) },
  { id: "f12", slug: "personne-voie", numero: 12, titre: "Personne sur la voie", categorie: "securite", priorite: "urgente", mnemonique: "FCCCA CCR SVPFE", resume: "Conduite à tenir en cas de présence d'une personne sur la voie ferrée.", etapes: JSON.stringify([{ ordre: 1, titre: "Arrêter toute circulation", description: "Figer immédiatement toutes les circulations en direction de la personne.", critique: true }, { ordre: 2, titre: "Tenter le contact", description: "Essayer d'entrer en contact verbal avec la personne si possible en sécurité." }, { ordre: 3, titre: "Appeler les secours", description: "15/18/17 selon la situation.", critique: true }, { ordre: 4, titre: "Aviser COGC et SUGE", description: "Transmettre la situation avec localisation précise." }]), contacts: ["suge", "supervision", "crc-cil"], references: JSON.stringify([]), avisObligatoires: JSON.stringify(["COGC", "SUGE", "Secours"]) },
  { id: "f13", slug: "incident-traction-electrique", numero: 13, titre: "Incident traction électrique", categorie: "incident", priorite: "urgente", mnemonique: "FCCCA CCR SVPFE", resume: "Conduite à tenir en cas d'incident sur l'alimentation électrique de traction.", etapes: JSON.stringify([{ ordre: 1, titre: "Identifier la coupure", description: "Identifier la zone impactée par la coupure ou le dérangement." }, { ordre: 2, titre: "Aviser COGC et RSS", description: "Aviser immédiatement COGC et le Régulateur Sous-Station.", critique: true }, { ordre: 3, titre: "Mesures sur les circulations", description: "Prendre les mesures nécessaires pour les circulations en ligne." }, { ordre: 4, titre: "Suivre les instructions", description: "Appliquer les instructions du COGC et du RSS." }]), contacts: ["supervision", "crc-cil"], references: JSON.stringify([]), avisObligatoires: JSON.stringify(["COGC", "RSS"]) },
  { id: "f14", slug: "derangement-signalisation", numero: 14, titre: "Dérangement signalisation", categorie: "incident", priorite: "normale", mnemonique: "FCCCA CCR SVPFE", resume: "Procédure à appliquer lors d'un dérangement des installations de signalisation.", etapes: JSON.stringify([{ ordre: 1, titre: "Identifier le dérangement", description: "Identifier précisément quelle installation est défaillante." }, { ordre: 2, titre: "Mesures de protection", description: "Prendre les mesures réglementaires pour la sécurité des circulations.", critique: true }, { ordre: 3, titre: "Aviser COGC et maintenance", description: "Aviser le COGC et demander l'intervention de la maintenance signalisation." }, { ordre: 4, titre: "Mesures d'exploitation", description: "Appliquer les mesures d'exploitation adaptées (marche à vue, etc.)." }]), contacts: ["supervision", "crc-cil"], references: JSON.stringify([]), avisObligatoires: JSON.stringify(["COGC", "CRC", "Maintenance signalisation"]) },
  { id: "f15", slug: "alerte-meteo", numero: 15, titre: "Alerte météo", categorie: "securite", priorite: "normale", mnemonique: "FIMERMO", resume: "Conduite à tenir lors d'une alerte météorologique impactant l'infrastructure ferroviaire.", etapes: JSON.stringify([{ ordre: 1, titre: "Prendre connaissance de l'alerte", description: "Lire attentivement le bulletin météo et les instructions associées." }, { ordre: 2, titre: "Renforcer la vigilance", description: "Renforcer la surveillance des sections sensibles identifiées." }, { ordre: 3, titre: "Appliquer les consignes", description: "Appliquer strictement les consignes prévues dans la procédure météo." }, { ordre: 4, titre: "Rendre compte", description: "Rendre compte régulièrement au COGC de la situation." }]), contacts: ["supervision", "crc-cil"], references: JSON.stringify(["EIC RA DC07066"]), avisObligatoires: JSON.stringify(["COGC"]) },
  { id: "f16", slug: "agent-incapacite", numero: 16, titre: "Agent en incapacité", categorie: "gestion-agent", priorite: "urgente", mnemonique: "CETRO ARSD", resume: "Procédure à suivre lorsqu'un agent en poste de sécurité présente des signes d'incapacité.", etapes: JSON.stringify([{ ordre: 1, titre: "Évaluer l'état de l'agent", description: "Observer discrètement l'agent et évaluer objectivement sa capacité à tenir son poste.", critique: true }, { ordre: 2, titre: "Sécuriser les circulations", description: "Prendre immédiatement les mesures nécessaires pour la sécurité.", critique: true }, { ordre: 3, titre: "Appliquer CETRO ARSD", description: "Dérouler le protocole CETRO ARSD." }, { ordre: 4, titre: "Aviser la hiérarchie", description: "Aviser DTO, DTI et RH selon les procédures." }]), contacts: ["dto", "dti", "supervision"], references: JSON.stringify([]), avisObligatoires: JSON.stringify(["COGC", "DTO", "DTI"]) },
];

const mnemoniquesData = [
  { id: "fccca", acronyme: "FCCCA CCR SVPFE", titre: "Détection — Avis — Appel", description: "Protocole général de détection d'un écart, lancement des avis et appel des ressources.", contexte: "À appliquer dès détection d'une anomalie susceptible de mettre en péril la sécurité du système ferroviaire.", couleur: "blue", lettres: JSON.stringify([{ lettre: "F", signification: "Figeage", detail: "Figer la situation pour éviter qu'elle ne s'aggrave." }, { lettre: "C", signification: "COGC", detail: "Aviser le COGC immédiatement." }, { lettre: "C", signification: "CRC", detail: "Aviser le CRC et coordonner les circulations." }, { lettre: "C", signification: "Chef de file", detail: "Identifier et aviser le chef de file compétent." }, { lettre: "A", signification: "Astreinte", detail: "Aviser les astreintes concernées." }, { lettre: "C", signification: "Constatations", detail: "Prendre les mesures utiles pour les constatations immédiates." }, { lettre: "C", signification: "CRC", detail: "Confirmer les avis au CRC." }, { lettre: "R", signification: "Renseignements", detail: "Recueillir les renseignements utiles." }, { lettre: "S", signification: "Secours", detail: "Déclencher les secours si nécessaire." }, { lettre: "V", signification: "Vérification", detail: "Vérifier les mesures prises." }, { lettre: "P", signification: "Protection", detail: "Confirmer la protection de la voie et des personnes." }, { lettre: "F", signification: "Figeage", detail: "Confirmer le figeage de la situation." }, { lettre: "E", signification: "Estimation délai", detail: "Estimer le délai d'arrivée et le fournir au CRC." }]) },
  { id: "fimermo", acronyme: "FIMERMO", titre: "Mesures d'urgence locales", description: "Mesures immédiates prises par les OPS pour éviter que la situation ne s'aggrave.", contexte: "Applicable en cas d'incident ou de personnel ne satisfaisant pas aux conditions requises.", couleur: "red", lettres: JSON.stringify([{ lettre: "Fi", signification: "Figeage", detail: "Figer la situation." }, { lettre: "M", signification: "Mesures bien prises", detail: "S'assurer que les mesures d'urgence locales sont en place." }, { lettre: "E", signification: "Estimation", detail: "Estimer le délai d'arrivée." }, { lettre: "R", signification: "Renseignements utiles", detail: "Recueillir et transmettre les renseignements." }, { lettre: "M", signification: "Matériels", detail: "CCLET : Chasuble, Clé, Lampe, EPI, Téléphone." }, { lettre: "O", signification: "Organisation", detail: "Organiser : Personnes, Matériel, Point d'accès." }]) },
  { id: "carbemi", acronyme: "CARBEMI", titre: "Protocole d'arrivée CIL", description: "Actions à effectuer à l'arrivée sur site en tant que Chef Incident Local.", contexte: "Appliquer systématiquement à l'arrivée sur le lieu d'un incident.", couleur: "amber", lettres: JSON.stringify([{ lettre: "C", signification: "Chasuble CIL", detail: "Revêtir le chasuble CIL." }, { lettre: "A", signification: "Avis CRC", detail: "Aviser le CRC." }, { lettre: "R", signification: "Reprise mesures", detail: "Reprendre les mesures de protections en cours." }, { lettre: "B", signification: "Bouclage", detail: "Vérifier Mesures et Avis." }, { lettre: "E", signification: "État des lieux", detail: "Réaliser un état des lieux rapide." }, { lettre: "M", signification: "Mesures conservatoires", detail: "Prendre les mesures conservatoires (OP522)." }, { lettre: "I", signification: "Identification", detail: "Recenser les personnes présentes." }]) },
  { id: "sici", acronyme: "SICI IPSI ART VR", titre: "Missions du CIL", description: "Ensemble des missions incombant au Chef Incident Local sur le terrain.", contexte: "Missions CIL — à coordonner avec COS et OPJ.", couleur: "blue", lettres: JSON.stringify([{ lettre: "S", signification: "Sécurité", detail: "Reprendre les mesures de sécurité." }, { lettre: "I", signification: "Interface autorités", detail: "Demander les prévisions d'intervention aux autorités." }, { lettre: "C", signification: "Coordination", detail: "Coordonner les acteurs présents." }, { lettre: "I", signification: "Information", detail: "Informer les échelons supérieurs." }]) },
  { id: "adidaa", acronyme: "ADIDAA", titre: "Avant reprise des circulations", description: "Vérifications obligatoires à effectuer avant d'autoriser la reprise des circulations.", contexte: "Checklist systématique à valider avant toute reprise de circulation après un incident.", couleur: "red", lettres: JSON.stringify([{ lettre: "A", signification: "Autorisation secours et OPJ", detail: "Avoir l'autorisation de reprise des secours et de l'OPJ." }, { lettre: "D", signification: "Dégagement gabarit", detail: "S'assurer que le gabarit est dégagé." }, { lettre: "I", signification: "Installations sécurité", detail: "Vérifier que les installations de sécurité sont en fonctionnement." }, { lettre: "D", signification: "Dégagement agents", detail: "S'assurer du dégagement de tous les agents." }, { lettre: "A", signification: "Autorise reprise", detail: "Autoriser les AC à reprendre la circulation." }, { lettre: "A", signification: "Avis COGC", detail: "Donner l'avis au COGC de la fin de son intervention." }]) },
  { id: "cammi", acronyme: "CAMMI CoCo RR", titre: "Protocole enquête — Dirigeant d'enquête", description: "Étapes à suivre lorsque l'agent est désigné Dirigeant d'enquête (DE) suite à un événement.", contexte: "Applicable si désigné DE par le COGC (attestation valable 3 ans).", couleur: "purple", lettres: JSON.stringify([{ lettre: "C", signification: "COGC désigne DE", detail: "Le COGC désigne le Dirigeant d'enquête." }, { lettre: "A", signification: "Attestation", detail: "Attestation valable 3 ans." }, { lettre: "M", signification: "MU", detail: "Vérifier l'intégrité des personnes, biens et environnement." }, { lettre: "M", signification: "MC", detail: "Si risque grave : COGC → CNOC → EPSF + EF." }, { lettre: "I", signification: "Mesures enquête", detail: "Prendre les mesures pour les besoins de l'enquête FSRR." }, { lettre: "Co", signification: "Conduire investigation", detail: "HIPE : Humains, Infrastructure, Procédures, Environnement." }, { lettre: "Co", signification: "Collecter éléments", detail: "Documents, bandes, photos, témoignages." }, { lettre: "R", signification: "Requiert expert", detail: "Requérir un expert si nécessaire." }, { lettre: "R", signification: "Rédaction RCI", detail: "3 premiers feuillets sous 12h, distribution finale sous 72h." }]) },
  { id: "cetro", acronyme: "CETRO ARSD", titre: "Gestion agent — Intervention sur le vif", description: "Protocole de gestion d'un agent lors d'un constat sur le vif (K sur le vif).", contexte: "Si constat d'un écart de comportement d'un agent en poste de sécurité.", couleur: "amber", lettres: JSON.stringify([{ lettre: "C", signification: "Constat sur le vif", detail: "Informer l'opérateur, observer sans interférer." }, { lettre: "E", signification: "Explication et ressenti", detail: "Expliquer la situation, demander le ressenti." }, { lettre: "T", signification: "Test alcool et psychoactif", detail: "Procéder aux tests." }, { lettre: "R", signification: "Recueil déclarations", detail: "Recueillir les déclarations et témoignages." }, { lettre: "O", signification: "Organisation service RH", detail: "Organiser le service et contacter RH." }, { lettre: "A", signification: "Accompagnement fin de service", detail: "Accompagner l'agent jusqu'en fin de service." }, { lettre: "R", signification: "Remplacement", detail: "Organiser le remplacement." }, { lettre: "S", signification: "Suspension habilitations", detail: "Suspension des habilitations Icare + courrier." }, { lettre: "D", signification: "Durée de travail", detail: "Vérifier la durée de travail effectif et l'amplitude." }]) },
  { id: "rabac", acronyme: "RABAC", titre: "Suite de la veille", description: "Actions de suivi après la détection et le traitement d'un écart de veille.", contexte: "Boucle de bouclage de la veille rénovée.", couleur: "green", lettres: JSON.stringify([{ lettre: "R", signification: "Redressement", detail: "Rappel à la règle dès que possible après l'écart." }, { lettre: "A", signification: "Adapter la veille", detail: "F — MPA — KA = IMPACT VRL." }, { lettre: "B", signification: "Bouclage", detail: "Bouclage 30 à 60 jours." }, { lettre: "A", signification: "AA si pas OK", detail: "Lancer une Action d'Amélioration si nécessaire." }, { lettre: "C", signification: "Consolidation bouclage", detail: "Consolidation sur 3 à 6 mois." }]) },
];

const abreviationsData = [
  { sigle: "AC", definition: "Agent Circulation" }, { sigle: "CIL", definition: "Chef Incident Local" },
  { sigle: "CRC", definition: "Coordinateur Régional des Circulations" }, { sigle: "DTI", definition: "Dirigeant Territorial Infra" },
  { sigle: "DTO", definition: "Dirigeant Territorial Opérations" }, { sigle: "MD", definition: "Marchandises Dangereuses" },
  { sigle: "PMR", definition: "Personne à Mobilité Réduite" }, { sigle: "PN", definition: "Passage à Niveau" },
  { sigle: "RO", definition: "Responsable des Opérations" }, { sigle: "RSS", definition: "Régulateur Sous-Station" },
  { sigle: "UOC", definition: "Unité Opérationnelle Circulation" }, { sigle: "ZD", definition: "Zone Dangereuse" },
  { sigle: "COGC", definition: "Centre Opérationnel de Gestion des Circulations" }, { sigle: "CNOC", definition: "Centre National des Opérations de Circulation" },
  { sigle: "SUGE", definition: "Sûreté Générale" }, { sigle: "EF", definition: "Entreprise Ferroviaire" },
  { sigle: "EPSF", definition: "Établissement Public de Sécurité Ferroviaire" }, { sigle: "TVP", definition: "Traversée de Voies Principales" },
  { sigle: "DE", definition: "Dirigeant d'Enquête" }, { sigle: "RCI", definition: "Rapport de Compte-rendu d'Incident" },
  { sigle: "COS", definition: "Commandant des Opérations de Secours" }, { sigle: "OPJ", definition: "Officier de Police Judiciaire" },
  { sigle: "RFN", definition: "Réseau Ferré National" }, { sigle: "SGC", definition: "Service de la Gestion des Circulations" },
  { sigle: "MU", definition: "Mesures d'Urgence" }, { sigle: "MC", definition: "Mesures Conservatoires" },
  { sigle: "ECP", definition: "Épreuve de Contrôle des Performances" },
];

// ─── Seed principal ──────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Démarrage du seed...");

  // Vider les tables dans l'ordre pour respecter les contraintes FK
  await prisma.ficheContact.deleteMany();
  await prisma.ficheSecteur.deleteMany();
  await prisma.fiche.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.secteur.deleteMany();
  await prisma.mnemonique.deleteMany();
  await prisma.abreviation.deleteMany();
  await prisma.adminUser.deleteMany();
  console.log("  ✓ Tables vidées");

  // Contacts
  for (const c of contactsData) {
    await prisma.contact.create({
      data: { id: c.id, nom: c.nom, role: c.role, categorie: c.categorie, telephone: c.telephone, telephoneAlt: c.telephoneAlt ?? null, note: c.note ?? null, disponibilite: c.disponibilite ?? null },
    });
  }
  console.log(`  ✓ ${contactsData.length} contacts insérés`);

  // Secteurs
  for (const s of secteursData) {
    await prisma.secteur.create({
      data: { id: s.id, slug: s.slug, nom: s.nom, ligne: s.ligne, trajet: s.trajet, description: s.description, pointsAcces: s.pointsAcces, procedures: s.procedures, pn: s.pn ?? null },
    });
  }
  console.log(`  ✓ ${secteursData.length} secteurs insérés`);

  // Fiches + relations contacts
  for (const f of fichesData) {
    await prisma.fiche.create({
      data: {
        id: f.id, slug: f.slug, numero: f.numero, titre: f.titre, categorie: f.categorie,
        priorite: f.priorite, mnemonique: f.mnemonique ?? null, resume: f.resume,
        etapes: f.etapes, references: f.references ?? null, avisObligatoires: f.avisObligatoires ?? null,
      },
    });
    for (const contactId of (f.contacts ?? [])) {
      await prisma.ficheContact.create({ data: { ficheId: f.id, contactId } });
    }
  }
  console.log(`  ✓ ${fichesData.length} fiches insérées`);

  // Mnémoniques
  for (const m of mnemoniquesData) {
    await prisma.mnemonique.create({
      data: { id: m.id, acronyme: m.acronyme, titre: m.titre, description: m.description, lettres: m.lettres, contexte: m.contexte ?? null, couleur: m.couleur ?? null },
    });
  }
  console.log(`  ✓ ${mnemoniquesData.length} mnémoniques insérés`);

  // Abréviations
  for (const a of abreviationsData) {
    await prisma.abreviation.create({ data: { sigle: a.sigle, definition: a.definition } });
  }
  console.log(`  ✓ ${abreviationsData.length} abréviations insérées`);

  // Admin user par défaut
  const adminPassword = process.env.ADMIN_PASSWORD || "admin2025";
  const hash = await bcrypt.hash(adminPassword, 12);
  await prisma.adminUser.create({ data: { username: "admin", password: hash } });
  console.log("  ✓ Compte admin créé (user: admin, pass: variable ADMIN_PASSWORD ou 'admin2025')");

  console.log("\n✅ Seed terminé avec succès !");
}

main()
  .catch((e) => { console.error("❌ Erreur seed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
