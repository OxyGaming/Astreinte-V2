import fs from "node:fs";
import path from "node:path";
import PizZip from "pizzip";
import { describe, expect, it } from "vitest";
import { META_KEYS, emptyPayload } from "./fields";
import { buildTemplateData } from "./render";

/** Tags réellement présents dans le modèle Word officiel. */
function templateTags(): string[] {
  const buf = fs.readFileSync(
    path.join(process.cwd(), "public/rci/template.docx"),
  );
  const xml = new PizZip(buf).file("word/document.xml")!.asText();
  return [...new Set([...xml.matchAll(/\{([^{}]+)\}/g)].map((m) => m[1]))]
    .filter((t) => /^[%#^/]?(txt_|check_|photo_|sig_)/.test(t))
    .map((t) => t.replace(/^[%#^/]/, ""));
}

describe("buildTemplateData", () => {
  it("alimente chaque tag du modèle officiel", () => {
    const data = buildTemplateData(emptyPayload(), {});
    // `photo_schema_succinct` n'est fourni que si une image est jointe :
    // l'ImageModule gère l'absence, contrairement aux signatures.
    const missing = templateTags().filter(
      (t) => t !== "photo_schema_succinct" && !(t in data),
    );
    expect(missing).toEqual([]);
  });

  it("toute clé du payload possède un placeholder dans le modèle", () => {
    // Sens inverse du test précédent : une clé saisissable dont la valeur
    // n'atterrirait nulle part dans le .docx est pire qu'un champ absent —
    // l'agent croit avoir renseigné le RCI.
    const tags = new Set(templateTags());
    const meta = new Set(META_KEYS as readonly string[]);
    const orphelines = Object.keys(emptyPayload()).filter((k) => {
      if (meta.has(k)) return false;
      return ![`txt_${k}`, `check_${k}`, `check_${k}_oui`, `photo_${k}`, k].some(
        (t) => tags.has(t),
      );
    });
    expect(orphelines).toEqual([]);
  });

  it("ne conserve aucun reliquat sans contrepartie officielle", () => {
    // Retirées après audit contre le RCI officiel : le bloc « Qui ? » n'a
    // qu'une EF, « évolution » n'existe pas, et « activité convois du GI » est
    // un en-tête de sous-tableau, pas une case à cocher.
    const keys = Object.keys(emptyPayload());
    for (const mort of [
      "ef2_nom",
      "ef2_pour_elle_meme",
      "ef2_sous_traitant",
      "ef2_utilisatrice_nom",
      "train_evolution_numero",
      "qui_maintenance_travaux_convois_gi",
    ]) {
      expect(keys, mort).not.toContain(mort);
    }
    // Les blocs EF n°2 réellement prévus par le RCI officiel restent, eux.
    expect(keys).toContain("po_ef2_present");
    expect(keys).toContain("sig_ef2_nom_fonction");
  });

  it("n'expose pas la typologie d'événement au Word", () => {
    // `event_type` pilote le guidage de saisie : c'est une aide au
    // remplissage, elle n'a rien à faire dans le document produit.
    const data = buildTemplateData(emptyPayload(), {});
    expect("txt_event_type" in data).toBe(false);
    expect(Object.keys(data).some((k) => k.includes("event_type"))).toBe(false);
  });

  it("rend le besoin de relevage comme deux cases distinctes", () => {
    const oui = buildTemplateData(
      { ...emptyPayload(), veh_besoin_relevage: true },
      {},
    );
    expect(oui.check_veh_besoin_relevage_oui).toBe("☒");
    expect(oui.check_veh_besoin_relevage_non).toBe("☐");

    const non = buildTemplateData(
      { ...emptyPayload(), veh_besoin_relevage: false },
      {},
    );
    expect(non.check_veh_besoin_relevage_oui).toBe("☐");
    expect(non.check_veh_besoin_relevage_non).toBe("☒");

    // Non renseigné : aucune case cochée, comme sur le formulaire papier.
    const vide = buildTemplateData(emptyPayload(), {});
    expect(vide.check_veh_besoin_relevage_oui).toBe("☐");
    expect(vide.check_veh_besoin_relevage_non).toBe("☐");
  });

  it("alimente les 17 champs officiels balisés en dernier", () => {
    // 12 cases du contexte de conduite + 4 noms + l'emplacement libre
    // « autre équipement du signal » (libellé + état en service).
    const data = buildTemplateData(
      {
        ...emptyPayload(),
        qui_conducteur_seul_reseau: true,
        qui_conducteur_seul_prestataire: false,
        qui_conducteur_seul_conduite: true,
        qui_conducteur_seul_nom: "MARTIN",
        qui_pilote_reseau: true,
        qui_pilote_nom: "DURAND",
        qui_pam_prestataire: true,
        qui_pam_nom: "BERNARD",
        qui_ops_sol_conduite: true,
        qui_ops_sol_nom: "PETIT",
        inst_autre_libelle: "ZAP",
        inst_autre_en_service: false,
      },
      {},
    );
    expect(data.check_qui_conducteur_seul_reseau).toBe("☒");
    expect(data.check_qui_conducteur_seul_prestataire).toBe("☐");
    expect(data.check_qui_conducteur_seul_conduite).toBe("☒");
    expect(data.txt_qui_conducteur_seul_nom).toBe("MARTIN");
    expect(data.check_qui_pilote_reseau).toBe("☒");
    expect(data.txt_qui_pilote_nom).toBe("DURAND");
    expect(data.check_qui_pam_prestataire).toBe("☒");
    expect(data.txt_qui_pam_nom).toBe("BERNARD");
    expect(data.check_qui_ops_sol_conduite).toBe("☒");
    expect(data.txt_qui_ops_sol_nom).toBe("PETIT");
    expect(data.txt_inst_autre_libelle).toBe("ZAP");
    expect(data.check_inst_autre_en_service_oui).toBe("☐");
    expect(data.check_inst_autre_en_service_non).toBe("☒");
  });

  it("ne laisse plus aucune case à cocher Word native dans le modèle", () => {
    // Une case native n'est pas pilotable par le rendu : elle sortirait
    // systématiquement décochée, quelle que soit la saisie.
    const raw = fs.readFileSync(
      path.join(process.cwd(), "public/rci/template.docx"),
    );
    const xml = new PizZip(raw).file("word/document.xml")!.asText();
    expect(xml.match(/<w14:checkbox|<w:checkBox/g)).toBeNull();
    expect(xml.includes("☐")).toBe(false);
  });

  it("transmet les rubriques réintégrées dans le wizard", () => {
    const data = buildTemplateData(
      {
        ...emptyPayload(),
        cab_rst: false,
        inst_crocodile_en_service: true,
        qui_sgc: true,
        qui_nb_personnes_cabine: "2",
        ef1_nom: "Fret SNCF",
        veh_nombre: "3",
        train_type_ttx: true,
      },
      {},
    );
    expect(data.check_cab_rst_non).toBe("☒");
    expect(data.check_inst_crocodile_en_service_oui).toBe("☒");
    expect(data.check_qui_sgc).toBe("☒");
    expect(data.txt_qui_nb_personnes_cabine).toBe("2");
    expect(data.txt_ef1_nom).toBe("Fret SNCF");
    expect(data.txt_veh_nombre).toBe("3");
    expect(data.check_train_type_ttx).toBe("☒");
  });
});
