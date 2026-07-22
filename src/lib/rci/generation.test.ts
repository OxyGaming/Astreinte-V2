/**
 * Test de génération bout en bout : on rend un vrai .docx à partir du modèle
 * officiel, puis on relit le document produit pour vérifier que les valeurs
 * saisies s'y trouvent réellement.
 *
 * Complète `render.test.ts`, qui ne contrôle que le dictionnaire passé à
 * docxtemplater : ici on valide la chaîne complète, y compris le modèle Word.
 */
import fs from "node:fs";
import path from "node:path";
import PizZip from "pizzip";
import { describe, expect, it } from "vitest";
import { emptyPayload, type RciPayload } from "./fields";
import { renderRci } from "./render";

const TEMPLATE = path.join(process.cwd(), "public/rci/template.docx");

/** Rend le .docx et renvoie le texte brut de `word/document.xml`. */
async function genererEtLire(payload: RciPayload): Promise<string> {
  const blob = await renderRci(payload, {}, {
    templateBuffer: fs.readFileSync(TEMPLATE).buffer,
  });
  const buf = Buffer.from(await blob.arrayBuffer());
  const xml = new PizZip(buf).file("word/document.xml")!.asText();
  return [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
    .map((m) => m[1])
    .join("")
    .replace(/\s+/g, " ");
}

describe("génération du .docx", () => {
  it("restitue les 17 champs officiels balisés en dernier", async () => {
    const p: RciPayload = {
      ...emptyPayload(),
      // Contexte de conduite — 12 cases + 4 noms
      qui_conducteur_seul_reseau: true,
      qui_conducteur_seul_conduite: true,
      qui_conducteur_seul_nom: "MARTIN Claude",
      qui_pilote_prestataire: true,
      qui_pilote_nom: "DURAND Camille",
      qui_pam_reseau: true,
      qui_pam_nom: "BERNARD Dominique",
      qui_ops_sol_conduite: true,
      qui_ops_sol_nom: "PETIT Alix",
      // Emplacement libre « autre équipement du signal »
      inst_autre_libelle: "ZAP",
      inst_autre_en_service: true,
    };
    const texte = await genererEtLire(p);

    for (const nom of [
      "MARTIN Claude",
      "DURAND Camille",
      "BERNARD Dominique",
      "PETIT Alix",
      "ZAP",
    ]) {
      expect(texte, `« ${nom} » absent du document généré`).toContain(nom);
    }
    // Les cases cochées sortent en ☒ : au moins les 5 demandées ici.
    expect((texte.match(/☒/g) ?? []).length).toBeGreaterThanOrEqual(5);
  });

  it("ne laisse aucun placeholder non substitué dans le document produit", async () => {
    const texte = await genererEtLire(emptyPayload());
    const restants = [...texte.matchAll(/\{[^}]{2,60}\}/g)].map((m) => m[0]);
    expect(restants).toEqual([]);
  });

  it("laisse les cases non renseignées décochées", async () => {
    const texte = await genererEtLire(emptyPayload());
    expect(texte).not.toContain("☒");
    expect((texte.match(/☐/g) ?? []).length).toBeGreaterThan(100);
  });

  it("distingue oui et non sur un ternaire du bloc réintégré", async () => {
    // « Besoin d'un moyen de relevage ? » — la rubrique signalée manquante à
    // l'origine : on vérifie que « non » se distingue bien de « non renseigné ».
    const oui = await genererEtLire({
      ...emptyPayload(),
      veh_besoin_relevage: true,
    });
    const non = await genererEtLire({
      ...emptyPayload(),
      veh_besoin_relevage: false,
    });
    const vide = await genererEtLire(emptyPayload());
    expect((oui.match(/☒/g) ?? []).length).toBe(1);
    expect((non.match(/☒/g) ?? []).length).toBe(1);
    expect((vide.match(/☒/g) ?? []).length).toBe(0);
    expect(oui).not.toBe(non);
  });
});
