import json

with open('prisma/data/postes.json', 'r', encoding='utf-8') as f:
    postes = json.load(f)

# Remove any existing PAN P2 entry to avoid duplicate
postes = [p for p in postes if p.get('slug') != 'pont-de-lane-p2']

annuaire = [
    {"titre": "Postes encadrants", "contacts": [
        {"nom": "Givors Ville (fixe)", "telephone": "04 37 60 13 08"},
        {"nom": "Givors Ville (portable)", "telephone": "06 21 70 71 02"},
        {"nom": "Givors Canal", "telephone": "04 37 60 13 09"},
        {"nom": "Chateaucreux P2", "telephone": "04 77 47 23 89", "note": "Poste encadrant sud"}
    ]},
    {"titre": "Regulation et supervision", "contacts": [
        {"nom": "Supervision", "telephone": "04 26 21 18 44"},
        {"nom": "Supervision (interne GIV)", "telephone": "708406"}
    ]},
    {"titre": "Astreintes", "contacts": [
        {"nom": "Astreinte Gier / RDN", "telephone": "06 19 56 36 55"}
    ]},
    {"titre": "Encadrement", "contacts": [
        {"nom": "DPX - Laurent NIEL", "telephone": "07 77 16 26 74"},
        {"nom": "Ass. DPX - MASSON Erwan", "telephone": "06 16 67 01 02"}
    ]},
    {"titre": "CPS", "contacts": [
        {"nom": "Agent CPS - Nathalie TIERCE", "telephone": "06 21 06 75 45", "note": "cps@eicral.fr"}
    ]},
    {"titre": "Informatique", "contacts": [
        {"nom": "Informatique bureautique", "telephone": "0980 980 321"},
        {"nom": "Informatique metier (OLERON code 653)", "telephone": "707070"}
    ]}
]

circuitsVoie = [
    {"designation": "VP 1 et 2", "voie": "Voies principales PAN P2", "note": "Surveillance reguliere obligatoire"},
    {"designation": "Voie 5 circulation", "voie": "PAN P2 - utilisable pour voyageurs (EIC RA CM 01133 fiche 10)", "note": "Logigramme fiche 10 obligatoire"},
    {"designation": "Faisceaux Reception (3-13), Plateau (7-11), Poste K (15-23bis)", "voie": "Voies de service PAN P2", "note": "Voies 25-37 hors RFN"},
    {"designation": "VP 1 et 2 - St Chamond", "voie": "Zone telecommandee St Chamond", "note": "Surveillance reguliere obligatoire"},
    {"designation": "VP 1 et 2 - Rive de Gier", "voie": "Zone telecommandee RdG", "note": "Itineraires categorie C a vigiler - delai 72h max"},
    {"designation": "Voies 3 et 5 garage - RdG", "voie": "Garages Rive de Gier", "note": "Munies de TLC (conditions allumage annexe 10)"},
    {"designation": "Voies 19-27 - RdG", "voie": "Faisceau impair Rive de Gier", "note": "Ouverture C103/Cv105 necessite concours Point A; Cv114 voies 19-27 necessite Point B"}
]

pnSensibles = [
    {"numero": "ITE Couzon Loire", "contact": "---", "note": "km 526,5 - VCm + DAMC + transmetteur - manoeuvre a pied d'oeuvre"},
    {"numero": "ITE Grand-Croix", "contact": "---", "note": "Embt km 518,1 - C161 : conditions particulieres art. 308 CR"},
    {"numero": "Zones filets Treves", "contact": "Supervision 04 26 21 18 44", "note": "DBC Treves-Burel - application consigne EIC RA DC1050"}
]

particularites = [
    "Poste a table Vignier 30 leviers (PLI) + PRS telecommandes St Chamond et Rive de Gier - DC3858 (PLI) + DC1560 (PRS)",
    "Aiguilles motorisees PAN P2 : 15a, 15b, 20a, 20b, Ia, Ib, Ba et Bd - manoeuvre a main : cles S sous coupon + commutateurs terrain",
    "Rechauffeurs d'aiguilles Ia, Ib, Ba, Bb - commutateur sous le TCO",
    "Cv41 normalement eteint, s'allume au renversement du levier A",
    "Cv37 fixe (ferme)",
    "Signaux munis de detonateurs PAN P2 : C4, 21, 25, 26, 28, 29 et 30",
    "Signaux munis de detonateurs St Chamond : 303, 304, 305 et 306",
    "Signaux munis de detonateurs RdG : C101, 103, 112, 113, 118 et 120",
    "En cas d'explosion : amortir le carnet de suivi + avis supervision",
    "TECS extinction -> rate ouverture signal origine (non note CR) -> DC1567/1568 fiche 308",
    "Conditions particulieres de franchissement : C511,7 -> C511,8 V2 -> C507,4 V2 (art. 408 CR)",
    "Aiguilles fictives xC et xG RdG - art. 310 CR",
    "Ouverture Cv116 pour refoulements voie 1 RdG : bouton 'AuRF1G' (pres du C113)",
    "Bouton substitution RdG pour reception sur voies 3 ou 5 occupee",
    "DPGr prises par l'aiguilleur sous responsabilite de l'AC",
    "Aucune voie de garage apte aux TE - seules voies 3G RdG et 15 de PAN aptes aux MD",
    "Voie 5 circulation PAN P2 : utilisable pour trains voyageurs - logigramme EIC RA CM 01133 fiche 10",
    "DBC Treves-Burel a vigiler - application EIC RA DC1050",
    "IPCS : 3 pas - meme agent (DC01568 ch.6 CR) et agents distincts (DC01567+DC01568 ch.5 CR)",
    "Sens secours IPCS : activer le sens secours du dernier sens etabli ou du poste qui recoit le mouvement",
    "Circuits de voie a vigiler EIC RA DC7295 art.9 - depassement 72h = considerer en derangement (itineraires cat. C)",
    "Code portail : 1432A - Code batiment : 1432 - GPS : 44.4442395, 4.4203180"
]

proceduresCles = [
    {"titre": "Table Vignier - Exploitation PLI", "description": "Consigne d'exploitation de la table Vignier 30 leviers", "reference": "DC3858"},
    {"titre": "PRS St Chamond et RdG - Exploitation", "description": "Consigne d'exploitation PRS pour les zones telecommandees", "reference": "DC01560"},
    {"titre": "Consigne UTIL PAN P2", "description": "Organisation du service de la circulation de PAN P2", "reference": "EIC RA DC7220"},
    {"titre": "Consigne Rose PAN P2", "description": "Consigne d'exploitation IS - Pont de l'Ane", "reference": "EIC RA IN00489"},
    {"titre": "Consigne Rose St Chamond", "description": "Consigne d'exploitation IS - St Chamond", "reference": "EIC RA IN00484"},
    {"titre": "Consigne Rose Rive de Gier", "description": "Consigne d'exploitation IS - Rive de Gier", "reference": "EIC RA IN00473"},
    {"titre": "Reprise / cessation PAN P2", "description": "Reprise et cessation exceptionnelle du poste", "reference": "EIC RA DC7263"},
    {"titre": "Reprise / cessation GIV", "description": "Procedure poste encadrant nord", "reference": "EIC RA DC7291"},
    {"titre": "Reprise / cessation Chateaucreux P2", "description": "Procedure poste encadrant sud", "reference": "EIC RA DC7279"},
    {"titre": "IPCS - meme agent", "description": "IPCS commandes par le meme agent", "reference": "DC01568 / Chapitre 5 et 6 CR"},
    {"titre": "IPCS - agents distincts", "description": "IPCS commandes par agents distincts", "reference": "DC01567 + DC01568 / Chapitre 5 CR"},
    {"titre": "Suivi circuits de voie", "description": "Itineraires a vigiler - delai max 72h - cat. C", "reference": "EIC RA DC7295 art.9"},
    {"titre": "DBC Treves-Burel", "description": "Surveillance et gestion du DBC de Treves", "reference": "EIC RA DC1050"},
    {"titre": "Consigne bleue - S11", "description": "AC PAN P2 = Agent E - Manoeuvre sectionneur a vide uniquement", "reference": "EIC RA IN00653 / DC08043"},
    {"titre": "Protection du personnel", "description": "Consigne de protection PAN P2", "reference": "EIC RA CM07012"},
    {"titre": "Circulation voyageurs sur VS", "description": "Voie 5 circulation et voie 3 RdG - logigramme fiche 10", "reference": "EIC RA CM 01133"},
    {"titre": "Situations perturbees / ODICEO", "description": "Manuel incidents + utilisation systematique ODICEO", "reference": "DC1503 / DC8183 / EIC RA DC07441"},
    {"titre": "Transports avec particularites", "description": "Seules voies 3G RdG et 15 PAN aptes aux MD - aucune voie apte aux TE", "reference": "EIC RA DC1090 / EIC RA DC1092"},
    {"titre": "Panne OLERON / imprimante", "description": "En cas de panne OLERON ou imprimante", "reference": "DC2081 art. 5"},
    {"titre": "GSM-R", "description": "Application fiche 16.1 DC1503", "reference": "EIC RA DC01212"},
    {"titre": "Trains desherbeurs", "description": "Procedure trains desherbeurs", "reference": "EIC RA DC01224"},
    {"titre": "Habilitations TES/TSAE", "description": "TES A + TES B requises - Formation ASE obligatoire", "reference": "DC01475 / EIC RA DC01003"}
]

dbc = [
    {"designation": "DBC Treves-Burel", "voie": "Ligne 750000 - section TBU", "note": "Application consigne EIC RA DC1050 - surveillance obligatoire"}
]

rex = [
    "TECS extinction -> rate ouverture signal origine : condition non notee dans la consigne rose - se referer a DC1567/1568 fiche 308",
    "En cas d'explosion : amortir systematiquement le carnet de suivi + avis supervision",
    "Sens secours IPCS : activer le sens secours du dernier sens etabli (ex : SN2TB -> SS2TB) ou du poste qui recoit le mouvement",
    "Assurer le bloc restitue avant accord d'une DFV - verifier les mesures a faire prendre a un autre agent"
]

pan = {
    "id": "pan-poste-001",
    "slug": "pont-de-lane-p2",
    "nom": "Pont de l'Ane P2",
    "typePoste": "PLI + PRS telecommandes (St Chamond et Rive de Gier)",
    "lignes": '["750000"]',
    "adresse": "Rue Jean HUSS, 42000 Saint-Etienne (acces depuis le chemin en face du 95 rue Jean HUSS)",
    "horaires": "24h/24 - 7j/7 - AC 3x8 : Matin 05h-13h / Soir 13h-21h / Nuit 21h-05h | Aiguilleur lun-ven 2x8 : Matin 04h15-12h15 / Soir 14h15-22h15",
    "electrification": "1500V CC - Regulateur sous-station de Lyon. AC PAN P2 = Agent E (habilite S11).",
    "systemeBlock": "BAL - Voies banalisees PAN P2 <-> Terrenoire (V1&V2). IPCS Terrenoire <-> Givors (3 pas d'IPCS). GSM-R sur l'ensemble de la ligne.",
    "annuaire": json.dumps(annuaire, ensure_ascii=False),
    "circuitsVoie": json.dumps(circuitsVoie, ensure_ascii=False),
    "pnSensibles": json.dumps(pnSensibles, ensure_ascii=False),
    "particularites": json.dumps(particularites, ensure_ascii=False),
    "proceduresCles": json.dumps(proceduresCles, ensure_ascii=False),
    "dbc": json.dumps(dbc, ensure_ascii=False),
    "rex": json.dumps(rex, ensure_ascii=False),
    "secteurId": "s06"
}

postes.append(pan)

with open('prisma/data/postes.json', 'w', encoding='utf-8') as f:
    json.dump(postes, f, ensure_ascii=False, indent=2)

print("OK - Poste PAN P2 ajoute")
print("Secteur:", pan["secteurId"])
print("Slug:", pan["slug"])
print("Annuaire sections:", [s["titre"] for s in annuaire])
