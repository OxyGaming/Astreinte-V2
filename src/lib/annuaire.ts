/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ANNUAIRE — FORMAT PIVOT OFFICIEL & NORMALISATION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * FORMAT PIVOT : AnnuaireEntry[]
 * Toute donnée annuaire stockée en DB DOIT être dans ce format.
 * Toute donnée en entrée (import, seed, API POST) DOIT passer par normalizeAnnuaire().
 *
 * FORMATS HISTORIQUES supportés en lecture uniquement :
 *   • Legacy AnnuaireSection[] — [{ titre: string, contacts: ContactPoste[] }]
 *     Utilisé par les seeds initiaux avant migration (juin 2026).
 *     Converti automatiquement → AnnuaireEntry[] par le normalizer.
 *
 * RÈGLE D'OR :
 *   READ  → normalizeAnnuaire() convertit tout format vers AnnuaireEntry[]
 *   WRITE → toujours écrire AnnuaireEntry[] en DB
 *   DISPLAY → entriesToSections() convertit AnnuaireEntry[] → AnnuaireSection[]
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { AnnuaireEntry } from "./types";

// ─── Types internes ───────────────────────────────────────────────────────────

/** Format legacy (seed initial) */
interface LegacySection {
  titre?: string;
  contacts?: Array<{
    nom?: string;
    role?: string;
    fonction?: string;
    telephone?: string;
    email?: string;
    note?: string;
  }>;
}

// ─── Export métier (résolution live des contacts liés) ────────────────────────

/** Entrée annuaire telle que vue par l'utilisateur (contacts résolus depuis la DB) */
export interface AnnuaireEntryMetier {
  /** Indice d'ordre */
  ordre: number;
  /** Section de regroupement */
  section?: string;
  /** Nom affiché (label override → nom contact → nom snapshot) */
  nom: string;
  /** Rôle / fonction */
  role?: string;
  /** Téléphone principal (toujours à jour si lié) */
  telephone?: string;
  /** Téléphone alternatif (uniquement si lié + contact résolu) */
  telephoneAlt?: string;
  /** Disponibilité (uniquement si lié + contact résolu) */
  disponibilite?: string;
  /** Note locale */
  note?: string;
  /** Email (uniquement si libre) */
  email?: string;
  /** Mode de l'entrée */
  mode: "libre" | "lié";
  /** contactId si lié */
  contactId?: string;
  /** Statut de résolution si lié */
  statut?: "résolu" | "introuvable";
}

// ─── Normalisation ────────────────────────────────────────────────────────────

/**
 * Normalise n'importe quelle entrée annuaire vers le format pivot AnnuaireEntry[].
 *
 * Tolère :
 *  - null / undefined / non-array      → []
 *  - AnnuaireSection[] (legacy)        → conversion automatique
 *  - AnnuaireEntry[] (format courant)  → nettoyage + réindexation
 *  - Entrées avec champs manquants     → fields omis proprement
 *  - Entrées invalides sans nom ni contactId → sautées silencieusement
 *  - contactId fourni mais inexistant  → inclus (orphan détecté à l'affichage)
 */
export function normalizeAnnuaire(raw: unknown): AnnuaireEntry[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const first = raw[0] as Record<string, unknown>;

  // ── Format legacy AnnuaireSection[] ──────────────────────────────────────
  if ("titre" in first || "contacts" in first) {
    return normalizeLegacy(raw as LegacySection[]);
  }

  // ── Format pivot AnnuaireEntry[] ─────────────────────────────────────────
  return normalizePivot(raw as Partial<AnnuaireEntry>[]);
}

function normalizeLegacy(sections: LegacySection[]): AnnuaireEntry[] {
  const entries: AnnuaireEntry[] = [];
  let ordre = 0;

  for (const section of sections) {
    const titre = section.titre?.trim();
    for (const c of section.contacts ?? []) {
      const nom = c.nom?.trim() ?? "";
      // Entrée libre uniquement (legacy ne connaît pas contactId)
      if (!nom) continue; // skip invalide
      entries.push({
        ordre: ordre++,
        nom,
        ...(titre                              ? { section:   titre                     } : {}),
        ...(c.role?.trim() || c.fonction?.trim()
                                               ? { fonction:  (c.role ?? c.fonction ?? "").trim() } : {}),
        ...(c.telephone?.trim()                ? { telephone: c.telephone.trim()        } : {}),
        ...(c.email?.trim()                    ? { email:     c.email.trim()            } : {}),
        ...(c.note?.trim()                     ? { note:      c.note.trim()             } : {}),
      });
    }
  }

  return entries;
}

function normalizePivot(entries: Partial<AnnuaireEntry>[]): AnnuaireEntry[] {
  const result: AnnuaireEntry[] = [];
  let ordre = 0;

  for (const e of entries) {
    const isLinked = typeof e.contactId === "string" && e.contactId.trim() !== "";

    if (isLinked) {
      // Entrée liée : contactId obligatoire, nom = snapshot pour fallback orphelin
      result.push({
        ordre: ordre++,
        nom: e.nom?.trim() ?? "",           // snapshot (peut être vide si contact récemment lié)
        contactId: (e.contactId as string).trim(),
        ...(e.label?.trim()     ? { label:    e.label.trim()     } : {}),
        ...(e.section?.trim()   ? { section:  e.section.trim()   } : {}),
        ...(e.telephone?.trim() ? { telephone: e.telephone.trim() } : {}),  // snapshot
        ...(e.note?.trim()      ? { note:     e.note.trim()      } : {}),
      });
    } else {
      // Entrée libre : nom obligatoire
      const nom = e.nom?.trim() ?? "";
      if (!nom) continue; // skip invalide sans contactId ni nom
      result.push({
        ordre: ordre++,
        nom,
        ...(e.section?.trim()   ? { section:   e.section.trim()   } : {}),
        ...(e.fonction?.trim()  ? { fonction:  e.fonction.trim()  } : {}),
        ...(e.telephone?.trim() ? { telephone: e.telephone.trim() } : {}),
        ...(e.email?.trim()     ? { email:     e.email.trim()     } : {}),
        ...(e.note?.trim()      ? { note:      e.note.trim()      } : {}),
      });
    }
  }

  return result;
}

// ─── Export métier (résolution live) ─────────────────────────────────────────

/** Shape minimale d'un contact résolu depuis la DB */
interface ResolvedContact {
  id: string;
  nom: string;
  role: string;
  telephone: string;
  telephoneAlt: string | null;
  disponibilite: string | null;
}

/**
 * Résout les entrées liées en données live depuis la DB.
 *
 * @param entries  AnnuaireEntry[] (format pivot)
 * @param contacts Contacts récupérés depuis la DB pour les contactIds présents
 * @returns AnnuaireEntryMetier[] — données telles que vues par l'utilisateur
 */
export function resolveAnnuaireMetier(
  entries: AnnuaireEntry[],
  contacts: ResolvedContact[]
): AnnuaireEntryMetier[] {
  const map = new Map(contacts.map((c) => [c.id, c]));

  return entries.map((e, i) => {
    if (!e.contactId) {
      // ── Entrée libre ────────────────────────────────────────────────────
      return {
        ordre: i,
        section: e.section,
        nom: e.nom,
        role: e.fonction,
        telephone: e.telephone,
        email: e.email,
        note: e.note,
        mode: "libre" as const,
      };
    }

    const contact = map.get(e.contactId);

    if (!contact) {
      // ── Entrée liée — contact introuvable (supprimé) ────────────────────
      return {
        ordre: i,
        section: e.section,
        nom: e.label?.trim() || e.nom || "(contact supprimé)",
        telephone: e.telephone || undefined, // snapshot fallback
        note: e.note,
        mode: "lié" as const,
        contactId: e.contactId,
        statut: "introuvable" as const,
      };
    }

    // ── Entrée liée — contact résolu ────────────────────────────────────
    return {
      ordre: i,
      section: e.section,
      nom: e.label?.trim() || contact.nom,
      role: contact.role,
      telephone: contact.telephone || e.telephone || undefined,
      telephoneAlt: contact.telephoneAlt ?? undefined,
      disponibilite: contact.disponibilite ?? undefined,
      note: e.note,
      mode: "lié" as const,
      contactId: e.contactId,
      statut: "résolu" as const,
    };
  });
}

// ─── Validation (non-bloquante) ───────────────────────────────────────────────

export interface AnnuaireWarning {
  index: number;
  type: "email_invalide" | "nom_vide" | "contact_inconnu";
  detail: string;
}

/**
 * Valide un tableau AnnuaireEntry[] normalisé et retourne des warnings (non-bloquants).
 * N'empêche pas la sauvegarde — sert à informer l'appelant.
 *
 * @param entries            Entrées normalisées
 * @param knownContactIds    Set des contactIds existant réellement en DB
 */
export function validateAnnuaire(
  entries: AnnuaireEntry[],
  knownContactIds?: Set<string>
): AnnuaireWarning[] {
  const warnings: AnnuaireWarning[] = [];

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];

    if (!e.contactId && !e.nom) {
      warnings.push({ index: i, type: "nom_vide", detail: `Entrée ${i + 1} : nom manquant` });
    }

    if (e.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.email)) {
      warnings.push({ index: i, type: "email_invalide", detail: `Entrée ${i + 1} : email "${e.email}" invalide` });
    }

    if (e.contactId && knownContactIds && !knownContactIds.has(e.contactId)) {
      warnings.push({
        index: i,
        type: "contact_inconnu",
        detail: `Entrée ${i + 1} : contactId "${e.contactId}" introuvable dans la DB`,
      });
    }
  }

  return warnings;
}
