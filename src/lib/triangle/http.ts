/**
 * triangle/http — adaptateur HTTP des erreurs métier de suppression.
 * Traduit les exceptions du domaine en réponses lisibles par l'UI, **sans jamais
 * exposer de détail technique Prisma**.
 */
import { NextResponse } from "next/server";
import {
  ProbativeBlockError,
  StaleStateError,
  TriangleEntityNotFoundError,
} from "./delete";

/**
 * Mappe une exception de suppression vers une réponse HTTP. Renvoie `null` si
 * l'erreur n'est pas une erreur métier connue (l'appelant la relaie ⇒ 500).
 */
export function deletionErrorResponse(e: unknown): NextResponse | null {
  if (e instanceof TriangleEntityNotFoundError) {
    return NextResponse.json({ error: "Ressource introuvable" }, { status: 404 });
  }
  if (e instanceof StaleStateError) {
    return NextResponse.json({ error: e.message, code: "STALE_STATE" }, { status: 409 });
  }
  if (e instanceof ProbativeBlockError) {
    return NextResponse.json(
      { error: e.message, code: "PROBATIVE_BLOCK", blockers: e.blockers },
      { status: 409 },
    );
  }
  return null;
}

/**
 * Lit le corps d'une requête DELETE du triangle : `stateToken` (jeton
 * d'obsolescence, obligatoire) et `motif` (facultatif). Tolère un corps absent
 * ou invalide (renvoie un `stateToken` vide, que la route rejette en 400).
 */
export async function parseDeletionBody(
  req: Request,
): Promise<{ stateToken: string; motif: string | null }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const rec = (body ?? {}) as Record<string, unknown>;
  return {
    stateToken: typeof rec.stateToken === "string" ? rec.stateToken : "",
    motif: typeof rec.motif === "string" ? rec.motif : null,
  };
}
