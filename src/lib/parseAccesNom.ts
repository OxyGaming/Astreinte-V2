/**
 * Parsing métier du nom brut d'un point d'accès ferroviaire.
 *
 * Format attendu : "{ligne}-{voie} {pk} [{type} [{identifiant/nom libre}]]"
 * Exemples :
 *   "750000-1 389+364 PN 178-2"         → ligne=750000, pk=389+364, type=PN, identifiant=178-2
 *   "750000-1 386+400 TUN St-Martin"    → ligne=750000, pk=386+400, type=TUN, identifiant=St-Martin
 *   "750000-1 388+523 St-Martin Poste"  → ligne=750000, pk=388+523, identifiant=St-Martin Poste
 *   "750000-1 387"                      → ligne=750000, pk=387
 */

export interface ParsedNom {
  ligne: string;
  pk: string;
  type?: string;
  identifiant?: string;
  nomAffiche: string;
  nomComplet: string;
}

/**
 * Tokens reconnus comme "type" ferroviaire (majuscules, 1–6 lettres uniquement).
 * La heuristique générale (/^[A-Z]{1,6}$/) couvre les types courants et inconnus.
 */
function isTypeToken(token: string): boolean {
  return /^[A-Z]{1,6}$/.test(token);
}

export function parseAccesNom(rawNom: string): ParsedNom {
  // Nettoyage CDATA éventuel
  const nom = rawNom.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
  const parts = nom.split(/\s+/).filter(Boolean);

  let idx = 0;
  let ligne = "";
  let pk = "";
  let type: string | undefined;
  let identifiant: string | undefined;

  // Token 0 : "{ligne}-{voie}" ex: "750000-1"
  if (idx < parts.length && /^\d+-\d+$/.test(parts[idx])) {
    ligne = parts[idx].split("-")[0];
    idx++;
  }

  // Token 1 : PK ex: "389+364" ou "387" ou "2"
  if (idx < parts.length && /^\d+(\+\d+)?$/.test(parts[idx])) {
    pk = parts[idx];
    idx++;
  }

  // Tokens restants : type + identifiant (ou nom libre)
  if (idx < parts.length) {
    const candidate = parts[idx];
    if (isTypeToken(candidate)) {
      type = candidate;
      idx++;
      if (idx < parts.length) {
        identifiant = parts.slice(idx).join(" ");
      }
    } else {
      // Pas de type structuré → tout le reste est le nom/identifiant
      identifiant = parts.slice(idx).join(" ");
    }
  }

  // Construction du nomAffiche
  let nomAffiche: string;
  if (type && identifiant) {
    nomAffiche = `${type} ${identifiant}`;
  } else if (type) {
    nomAffiche = type;
  } else if (identifiant) {
    nomAffiche = identifiant;
  } else if (pk) {
    nomAffiche = `PK ${pk}`;
  } else {
    nomAffiche = nom;
  }

  return { ligne, pk, type, identifiant, nomAffiche, nomComplet: nom };
}
