import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";
import { resetRateLimit } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/admin/users/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, nom: true, prenom: true, role: true, actif: true, status: true, email: true, poste: true, motif: true, createdAt: true },
  });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  return NextResponse.json(user);
}

/**
 * Vérifie qu'une désactivation (ou rétrogradation d'ADMIN) n'orphelinerait
 * pas le back-office, ni l'auteur lui-même. Retourne null si l'opération
 * est autorisée, sinon une NextResponse 409 prête à renvoyer.
 *
 * targetUser doit refléter l'état AVANT la modification.
 * change décrit l'état APRÈS : `becomingInactive` ou `losingAdmin` à true
 * déclenchent les vérifications associées.
 */
async function guardUserDeactivation(
  targetUser: { id: string; role: string; actif: boolean },
  change: { becomingInactive: boolean; losingAdmin: boolean },
): Promise<NextResponse | null> {
  // 1) Auto-action interdite (l'admin connecté agit sur son propre compte)
  const current = await getCurrentUser();
  if (current && current.id === targetUser.id) {
    if (change.becomingInactive) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas désactiver votre propre compte." },
        { status: 409 },
      );
    }
    if (change.losingAdmin) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas retirer votre propre rôle administrateur." },
        { status: 409 },
      );
    }
  }

  // 2) Dernier admin actif : interdit de désactiver / rétrograder
  if ((change.becomingInactive || change.losingAdmin) && targetUser.role === "ADMIN" && targetUser.actif) {
    const otherActiveAdmins = await prisma.user.count({
      where: { role: "ADMIN", actif: true, status: "approved", id: { not: targetUser.id } },
    });
    if (otherActiveAdmins === 0) {
      return NextResponse.json(
        { error: "Impossible — c'est le dernier administrateur actif." },
        { status: 409 },
      );
    }
  }

  // 3) Sessions de fiche encore ouvertes
  if (change.becomingInactive) {
    const activeSessions = await prisma.ficheSession.count({
      where: { createdByUserId: targetUser.id, status: "active" },
    });
    if (activeSessions > 0) {
      return NextResponse.json(
        {
          error:
            `Impossible — ${activeSessions} session(s) de fiche encore ouverte(s). ` +
            "Archivez-les d'abord ou attendez leur clôture.",
          activeSessions,
        },
        { status: 409 },
      );
    }
  }

  return null;
}

// PUT /api/admin/users/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { username, email, password, nom, prenom, role, actif, status } = await req.json();

  // État actuel — nécessaire pour les vérifications de cohérence
  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, actif: true, status: true, email: true },
  });
  if (!target) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  // Calcul de l'état après modification
  const nextActif =
    actif !== undefined ? !!actif :
    status === "approved" ? true :
    status === "rejected" ? false :
    target.actif;
  const nextRole = role !== undefined ? String(role) : target.role;
  const becomingInactive = target.actif && !nextActif;
  const losingAdmin = target.role === "ADMIN" && nextRole !== "ADMIN";
  if (becomingInactive || losingAdmin) {
    const guard = await guardUserDeactivation(target, { becomingInactive, losingAdmin });
    if (guard) return guard;
  }

  const data: Record<string, unknown> = {};
  if (username !== undefined) {
    const clash = await prisma.user.findFirst({ where: { username, NOT: { id } } });
    if (clash) return NextResponse.json({ error: "Identifiant déjà utilisé" }, { status: 409 });
    data.username = username;
  }
  if (email !== undefined) {
    if (email !== null && email !== "") {
      const normalizedEmail = email.trim().toLowerCase();
      const clash = await prisma.user.findFirst({ where: { email: normalizedEmail, NOT: { id } } });
      if (clash) return NextResponse.json({ error: "Adresse e-mail déjà utilisée" }, { status: 409 });
      data.email = normalizedEmail;
    } else {
      data.email = null;
    }
  }
  if (nom !== undefined) data.nom = nom;
  if (prenom !== undefined) data.prenom = prenom;
  if (role !== undefined) data.role = role;
  if (actif !== undefined) data.actif = actif;
  if (password) data.password = await bcrypt.hash(password, 12);
  if (status !== undefined) {
    if (!["pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }
    data.status = status;
    // Quand on approuve : activer le compte ; quand on rejette : désactiver
    if (status === "approved") data.actif = true;
    if (status === "rejected") data.actif = false;
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, username: true, nom: true, prenom: true, role: true, actif: true, status: true },
  });

  // Si le mot de passe a été réinitialisé par l'admin, on lève le rate-limit
  // login:email:* du user — sinon il reste bloqué jusqu'à 15 min même avec le bon
  // nouveau mdp (c'est typiquement l'utilisateur qui a vidé son quota en oubliant
  // son mdp et qui vient de demander une réinitialisation).
  if (password) {
    if (target.email) resetRateLimit(`login:email:${target.email}`);
    if (typeof data.email === "string" && data.email !== target.email) {
      resetRateLimit(`login:email:${data.email}`);
    }
  }

  return NextResponse.json(user);
}

/**
 * DELETE /api/admin/users/[id]
 *
 * Désactivation logique (actif=false). On NE supprime jamais physiquement
 * un compte qui a participé à des sessions, des logs ou des contributions :
 * l'historique opérationnel et les contraintes FK doivent être préservés.
 *
 * Garde-fous appliqués (cf. guardUserDeactivation) :
 *   - pas d'auto-désactivation
 *   - pas de désactivation du dernier ADMIN actif
 *   - pas de désactivation tant qu'il reste des FicheSession status="active"
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, actif: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  }
  if (!target.actif) {
    return NextResponse.json({ error: "Compte déjà désactivé." }, { status: 409 });
  }

  const guard = await guardUserDeactivation(target, { becomingInactive: true, losingAdmin: false });
  if (guard) return guard;

  await prisma.user.update({ where: { id }, data: { actif: false } });
  return NextResponse.json({ ok: true, deactivated: true });
}
