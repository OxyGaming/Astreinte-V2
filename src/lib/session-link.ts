/**
 * session-link — rattachement d'une session déjà créée au RCI / Livret CIL
 * d'origine du mode « + Session ».
 *
 * Partagé par le démarrage de session en ligne ET par le drain de la file hors
 * ligne (cf. FicheSessionView). Isolé ici pour être testable sans monter le
 * composant. Règle d'or : **ne jamais annoncer un succès non enregistré** — on
 * remonte l'erreur réelle de l'API (RCI finalisé, conflit de triangle, session
 * inaccessible…) au lieu d'un faux « rattaché ».
 */

export type SessionLinkResult =
  | { ok: true; label: string }
  | { ok: false; error: string };

/**
 * @returns `null` si aucun rattachement n'est demandé (ni RCI ni Livret) ;
 *          sinon le résultat réel du PATCH.
 */
export async function patchSessionLink(
  linkRci: string | null | undefined,
  linkCil: string | null | undefined,
  newSessionId: string,
): Promise<SessionLinkResult | null> {
  const target = linkRci
    ? {
        url: `/api/rci/${linkRci}`,
        body: { sessionId: newSessionId },
        label: "Session rattachée au RCI",
      }
    : linkCil
      ? {
          url: `/api/cil/${linkCil}`,
          body: { action: "link-session", sessionId: newSessionId },
          label: "Session rattachée au Livret CIL",
        }
      : null;
  if (!target) return null;
  try {
    const res = await fetch(target.url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(target.body),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return { ok: false, error: (j as { error?: string }).error || "Rattachement impossible" };
    }
    return { ok: true, label: target.label };
  } catch {
    return { ok: false, error: "Rattachement impossible (réseau)" };
  }
}
