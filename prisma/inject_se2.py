import json

with open('prisma/data/postes.json', 'r', encoding='utf-8') as f:
    postes = json.load(f)

postes = [p for p in postes if p.get('slug') != 'chateaucreux-p2']

annuaire = [
    {"titre": "Postes encadrants", "contacts": [
        {"nom": "Chateaucreux P1 (SE1)", "telephone": "04 77 47 46 08"},
        {"nom": "Pont de l'Ane P2 (PAN P2)", "telephone": "04 77 47 42 38"}
    ]},
    {"titre": "Postes voisins", "contacts": [
        {"nom": "Givors Ville", "telephone": "04 37 60 13 08"},
        {"nom": "Givors Canal", "telephone": "04 37 60 13 09"}
    ]},
    {"titre": "Regulation et supervision", "contacts": [
        {"nom": "Supervision", "telephone": "04 26 21 18 44"},
        {"nom": "Supervision (interne)", "telephone": "708406"}
    ]},
    {"titre": "Astreintes", "contacts": [
        {"nom": "Astreinte Gier / RDN", "telephone": "06 19 56 36 55"}
    ]},
    {"titre": "Encadrement", "contacts": [
        {"nom": "DPX - Laurent NIEL", "telephone": "07 77 16 26 74"},
        {"nom": "Ass. DPX - MASSON Erwan", "telephone": "06 16 67 01 02"}
    ]},
    {"titre": "CPS", "contacts": [
        {"nom": "Agent CPS - Claude JOUVE", "telephone": "06 19 24 59 24", "note": "cps@eicral.fr"}
    ]},
    {"titre": "Informatique", "contacts": [
        {"nom": "Informatique bureautique", "telephone": "0980 980 321"},
        {"nom": "Informatique metier (OLERON code 653)", "telephone": "707070"}
    ]}
]

circuitsVoie = [
    {"designation": "VP 1 et 2", "voie": "Voies principales Chateaucreux P2", "note": "Surveillance reguliere obligatoire"},
    {"designation": "Voie 3 Tiroir", "voie": "Voie de service CHTx P2", "note": ""},
    {"designation": "Voie 5 Circulation", "voie": "Liaison CHTx P2 <-> PAN P2", "note": "Utilisable pour voyageurs (EIC RA CM 01133 art. 4.2 DC7226)"},
    {"designation": "Voie 13 Circulation", "voie": "Liaison CHTx P2 <-> CHTx P1 (SE1)", "note": "Utilisable pour voyageurs (EIC RA CM 01133 art. 4.3 DC7226)"},
    {"designation": "Voies 17-45 faisceau", "voie": "Faisceau de service CHTx P2", "note": "Voies 17 et 19 aptes TE uniquement - MD interdites voies 4, 4T, 43, 45"},
    {"designation": "Voies depot cote Lyon", "voie": "Acces depot", "note": "Voies du depot non electrifiees - attention pantographes bimodaux"},
    {"designation": "Itineraire 28/29 (communication)", "voie": "Circuit de voie a vigiler", "delai_max": "72h", "note": "Anticiper avec l'escale - EIC RA DC07092 - itineraires cat. C"}
]

pnSensibles = [
    {"numero": "IS Poste M", "contact": "04 77 47 46 09", "note": "IS simple - commutateur A/I pour voies 17-21 et 25-33 - liaison tel directe P1 et P2"},
    {"numero": "IS Poste H", "contact": "04 77 47 46 09", "note": "IS simple"},
    {"numero": "Chantier Lavage", "contact": "04 77 47 46 09", "note": "IS simple - acces voies lavage cote Lyon"}
]

particularites = [
    "Poste a table Saxby 60 leviers dont 8 reserves (PLI) - DC3858 - PAS de PRS telecommande",
    "Pas de RST (Radio Sol Train) au poste",
    "AC = COSIT - gere les blocs A, B, C, D, E, F, G, H, I, J, K et M",
    "Limites d'action definies par ZEP type G de CHTx P1 et PAN P2 (pas de ZEP type L)",
    "Aiguilles motorisees : 32a, 32b, 33a et 33b - manoeuvre a main : cles S sous coupon (cle MAE)",
    "Rechauffeurs d'aiguilles : 39, 44a, 44b, 45a et 45b - commandes par commutateur au P2",
    "Assistance hydraulique leviers : 30, 35, 38, 39, 43, 44 et 45 - annulable par commutateur (individuel ou global) - ATTENTION par temps de neige",
    "Bouton poussoir S240 pour reception sur voie 13 occupee",
    "Signaux munis de detonateurs : C221 et C240 - amortir carnet suivi + avis supervision en cas d'explosion",
    "Cv201 et Cv211 equipes de TLD",
    "Cv201 pour sortie voies 49, 51 et 53 : equipe TIP (action sur bouton poussoir)",
    "Poste M : voyants indicateurs voies 17-21 (allumage blanc si itineraire prepare et aiguilles correctes) - test ne garantit PAS le collage effectif des aiguilles",
    "Commutateur A/I du Poste M : position I par defaut - position A pour acces voies 25-33 ou voies 17-21 - prise autorisee par P2 eteint le voyant au poste M",
    "Commutateur de consignation poste M : position C bloque l'allumage du voyant - a remettre en normal avant restitution de bloc",
    "Voies du depot non electrifiees - attention aux pantographes des bimodaux",
    "Mesures de protection S11 'Poste M en campagne' : certaines delegues a l'AC du P2 CHTx",
    "Voies 17 et 19 seules aptes TE - MD interdites sur voies 4, 4T, 43 et 45",
    "Voie 5 circulation (CHTx P2 <-> PAN P2) et voie 13 (CHTx P2 <-> SE1) : utilisables pour voyageurs (art. 4.2 et 4.3 DC7226)",
    "Incompatibilites entre ZEP notamment lors de delegations de mesures a M&T - utiliser ANGe systematiquement",
    "Suivi circuits de voie DC07092 : itineraire comm 28/29 a vigiler - anticiper avec escale - delai max 72h",
    "Programme theorique travaux disponible sur SharePoint : https://sncf.sharepoint.com/sites/attributiondelacapaciteEICRAL",
    "Code portail parking rue Puits Thibaud : 1345A - Code porte poste : 14321",
    "IS Simples : Poste M, Poste H, acces chantier Lavage - CLE OP 54740"
]

proceduresCles = [
    {"titre": "Table Saxby - Exploitation PLI", "description": "Consigne d'exploitation de la table Saxby 60 leviers", "reference": "DC3858"},
    {"titre": "Consigne UTIL CHTx P2", "description": "Organisation du service de la circulation - attributions AC et COSIT", "reference": "EIC RA DC7226"},
    {"titre": "Consigne Rose CHTx P2", "description": "Consigne d'exploitation des installations", "reference": "EIC RA IN00488"},
    {"titre": "CLE CHTx P2", "description": "Classification locale des emprises", "reference": "OP54740"},
    {"titre": "Reprise / cessation CHTx P2", "description": "Reprise et cessation exceptionnelle du poste", "reference": "EIC RA DC7279"},
    {"titre": "Reprise / cessation PAN P2", "description": "Procedure poste encadrant PAN P2", "reference": "EIC RA DC7263"},
    {"titre": "Reprise / cessation CHTx P1", "description": "Procedure poste encadrant CHTx P1", "reference": "EIC RA DC1132"},
    {"titre": "Circulation voyageurs sur VS", "description": "Voies 5 (vers PAN P2) et 13 (vers SE1) - art. 4.2 et 4.3", "reference": "EIC RA CM 01133 / EIC RA DC7226"},
    {"titre": "Suivi circuits de voie", "description": "Itineraire 28/29 a vigiler - delai max 72h - cat. C", "reference": "EIC RA DC07092"},
    {"titre": "Consigne bleue - S11", "description": "Habilitation electrique - mesures S11 Poste M deleguees au P2", "reference": "EIC RA IN00624 / DC08043"},
    {"titre": "Consigne de protection", "description": "Protection du personnel - DFV - verification incompatibilites ZEP", "reference": "EIC RA CM07029"},
    {"titre": "Mode operatoire DFV", "description": "Utilisation obligatoire lors de toute DFV - identifier mesures a autres agents", "reference": "DC03969 / DC03978"},
    {"titre": "Autocontrole ANGe", "description": "Autocontrole S6, S9, S11 - utilisation systematique pour detecter incompatibilites ZEP", "reference": "ANGe"},
    {"titre": "Situations perturbees / ODICEO", "description": "Manuel incidents - utilisation systematique ODICEO", "reference": "DC1503 / DC8183 / EIC RA DC07441"},
    {"titre": "Transports avec particularites", "description": "Voies 17 et 19 aptes TE - MD interdites voies 4, 4T, 43, 45", "reference": "EIC RA DC1090 / EIC RA DC1092"},
    {"titre": "DATIS - Extinction signal", "description": "DATIS sur C240 : depêche obligatoire a la gare amont avant accord - DC3858 fiche 415.3", "reference": "DC3858 fiche 415.3"},
    {"titre": "Panne OLERON / imprimante", "description": "En cas de panne OLERON ou imprimante", "reference": "DC2081 art. 5"},
    {"titre": "Nettoyage rames voie 4", "description": "Procedure nettoyage rames sur voie 4", "reference": "OP00909"},
    {"titre": "Trains desherbeurs", "description": "Avis de passage trains desherbeurs", "reference": "EIC RA DC01224"},
    {"titre": "Habilitations TES/TSAE", "description": "TES A + TES B requises - Formation ASE obligatoire", "reference": "DC01475 / EIC RA DC01003"}
]

rex = [
    "REX 14/02/2022 - DATIS signal C240 accordee sans mesures de protection : depêche a la gare amont (PAN P2) obligatoire meme sans circulation prevue - DC3858 fiche 415.3. Enseignement : prendre systematiquement les mesures liees au derangement avant tout accord DATIS.",
    "REX 21/05/2025 - Accord 2 DFV sur ZEP avec mesures de protection incompatibles (aig 152 direction gauche vs aig 5 direction droite). L'AC a detecte l'incompatibilite apres accord. Enseignement : utiliser DC3978 et ANGe systematiquement pour identifier si d'autres agents sont concernes.",
    "REX 03/02/2025 - DMP S9 sur ZEP 503+504 : oubli 2 jours de suite de demander les mesures au P1. Mention en gras non vue (couleur similaire bleu/vert). Enseignement : ANGe + surlignage consigne de protection quand autre intervenant concerne.",
    "BONNE PRATIQUE Juin 2024 - Gestion du doute : AC detecte incompatibilite ZEP 354 et 352+353 avant accord DFV, n'hesite pas a appeler l'encadrant et demande l'annulation des DFV au RPTx. CNT : Gestion du doute + Rigueur professionnelle + Prise de decision."
]

dbc = None

se2 = {
    "id": "se2-poste-001",
    "slug": "chateaucreux-p2",
    "nom": "St Etienne Chateaucreux P2",
    "typePoste": "PLI (table Saxby 60 leviers)",
    "lignes": '["750000"]',
    "adresse": "Rue du Petit Cabaret, 42000 Saint-Etienne (parking acces : 20 rue Puits Thibaud, code 1345A)",
    "horaires": "24h/24 - 7j/7 - Agent seul 3x8 : Matin 05h-13h / Soir 13h-21h / Nuit 21h-05h",
    "electrification": "1500V CC - Regulateur sous-station de Lyon. Voies depot NON electrifiees - attention pantographes bimodaux. Certaines mesures S11 'Poste M en campagne' deleguees au P2.",
    "systemeBlock": "BAL - PAS de RST. Pas de PRS telecommande. Encadre par CHTx P1 et PAN P2.",
    "annuaire": json.dumps(annuaire, ensure_ascii=False),
    "circuitsVoie": json.dumps(circuitsVoie, ensure_ascii=False),
    "pnSensibles": json.dumps(pnSensibles, ensure_ascii=False),
    "particularites": json.dumps(particularites, ensure_ascii=False),
    "proceduresCles": json.dumps(proceduresCles, ensure_ascii=False),
    "dbc": None,
    "rex": json.dumps(rex, ensure_ascii=False),
    "secteurId": "s06"
}

postes.append(se2)

with open('prisma/data/postes.json', 'w', encoding='utf-8') as f:
    json.dump(postes, f, ensure_ascii=False, indent=2)

print("OK - Poste SE2 (Chateaucreux P2) ajoute")
print("Secteur:", se2["secteurId"])
print("Slug:", se2["slug"])
print("Annuaire sections:", [s["titre"] for s in annuaire])
print("REX:", len(rex), "entrees")
