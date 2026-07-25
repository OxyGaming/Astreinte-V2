/**
 * Domaine **triangle Session ↔ RCI ↔ Livret CIL** — point d'entrée unique.
 *
 * Regroupe les règles métier du triangle :
 *  - `reconcile` : cohérence des FK au rattachement (referme les arêtes déductibles) ;
 *  - `delete`    : analyse d'impact et suppression physique gardée (admin-only),
 *                  avec protection des éléments probants et jeton d'obsolescence.
 *
 * Le barrel préserve les imports historiques `@/lib/triangle`.
 */
export {
  reconcileTriangle,
  TriangleConflictError,
  type TriangleAnchor,
  type Tx,
} from "./reconcile";

export {
  analyzeDeletion,
  executeDeletion,
  ProbativeBlockError,
  StaleStateError,
  TriangleEntityNotFoundError,
  type TriangleEntityKind,
  type ImpactSeverity,
  type BlockerReason,
  type DeletionBlocker,
  type SeveredLink,
  type DeletionImpact,
  type DeletionActor,
} from "./delete";

export { deletionErrorResponse, parseDeletionBody } from "./http";
