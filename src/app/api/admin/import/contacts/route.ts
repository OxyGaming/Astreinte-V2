import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface ContactData {
  nom: string;
  role: string;
  categorie: string;
  telephone: string;
  telephoneAlt?: string;
  note?: string;
  disponibilite?: string;
}

const CATEGORIES = ["urgence", "astreinte", "encadrement", "externe"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const contacts: ContactData[] = body.contacts;
    const mode: "create" | "upsert" = body.mode === "create" ? "create" : "upsert";

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ error: "Aucun contact à importer." }, { status: 400 });
    }

    let created = 0;
    let updated = 0;
    let rejected = 0;
    const details: { nom: string; status: "created" | "updated" | "rejected"; reason?: string }[] = [];

    for (const c of contacts) {
      try {
        if (!c.nom?.trim() || !c.role?.trim() || !c.telephone?.trim()) {
          rejected++;
          details.push({ nom: c.nom || "?", status: "rejected", reason: "Champs obligatoires manquants (nom, role, telephone)" });
          continue;
        }
        if (!CATEGORIES.includes(c.categorie)) {
          rejected++;
          details.push({ nom: c.nom, status: "rejected", reason: `Catégorie invalide "${c.categorie}"` });
          continue;
        }

        const existing = await prisma.contact.findFirst({
          where: { nom: { equals: c.nom.trim() } },
        });

        const data = {
          nom: c.nom.trim(),
          role: c.role.trim(),
          categorie: c.categorie.trim(),
          telephone: c.telephone.trim(),
          telephoneAlt: c.telephoneAlt?.trim() || null,
          note: c.note?.trim() || null,
          disponibilite: c.disponibilite?.trim() || null,
        };

        if (existing) {
          if (mode === "create") {
            rejected++;
            details.push({ nom: c.nom, status: "rejected", reason: "Contact déjà existant (même nom)" });
            continue;
          }
          await prisma.contact.update({ where: { id: existing.id }, data });
          updated++;
          details.push({ nom: c.nom, status: "updated" });
        } else {
          await prisma.contact.create({ data });
          created++;
          details.push({ nom: c.nom, status: "created" });
        }
      } catch (e: unknown) {
        rejected++;
        details.push({ nom: c.nom || "?", status: "rejected", reason: e instanceof Error ? e.message : "Erreur inconnue" });
      }
    }

    return NextResponse.json({ created, updated, rejected, details });
  } catch {
    return NextResponse.json({ error: "Erreur serveur lors de l'import des contacts." }, { status: 500 });
  }
}
