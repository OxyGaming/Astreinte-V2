/** @jsxRuntime classic */
/** @jsx h */
/** @jsxFrag Frag */
/**
 * Document PDF d'une tournée — généré à partir des DONNÉES (plan figé ou
 * modèle), jamais d'un gabarit figé. Structure calquée sur le document de
 * référence : 1. Programme · 2. Détail des étapes · 3. Contacts utiles
 * (+ 4. Restitution du temps pour une réalisation démarrée).
 *
 * Serveur uniquement. Police standard Helvetica (encodage WinAnsi) : les
 * caractères hors jeu sont translittérés par `pdfText`.
 */
import { createRequire } from "node:module";
import path from "node:path";
import type ReactType from "react";
import { Document, Font, Image, Link, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { PlanTheorique, Bilan } from "../planning";
import type { TourneeBloc, TourneePlan, TourneePlanEtape } from "../types";
import { formatHeure, formatDateLongue } from "../time";
import { formatGps, navigationUrl, carteUrl } from "../navigation";
import { parseTexte, type Segment } from "../texte";

// ─── React utilisé pour construire le document ────────────────────────────────
// Next externalise @react-pdf/renderer (liste interne) : il s'exécute avec le
// React de node_modules, alors que le JSX des route handlers est compilé contre
// le React « react-server » de Next (incompatible avec son réconciliateur).
// Les éléments doivent donc être créés avec LE MÊME React que @react-pdf :
// pragma JSX classique ci-dessus + React chargé hors bundler (spécificateur
// calculé pour que le bundler ne le réécrive pas).
const nodeRequire = createRequire(path.join(process.cwd(), "package.json"));
const R = nodeRequire(["re", "act"].join("")) as typeof ReactType;
const h = R.createElement;
const Frag = R.Fragment;

// Pas de césure automatique (titres, codes de référentiels, coordonnées).
Font.registerHyphenationCallback((word) => [word]);

// ─── Texte compatible police standard ─────────────────────────────────────────

const WINANSI_EXTRA = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
const TRANSLIT: Record<string, string> = {
  "→": "->", "←": "<-", "↓": "", "↑": "", "−": "-", "≥": ">=", "≤": "<=",
  "✓": "v", "✔": "v", "⚠": "!", "⏱": "", "⏭": "", "️": "", " ": " ", " ": " ",
};

export function pdfText(s: string | null | undefined): string {
  if (!s) return "";
  let out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c === 10 || (c >= 32 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff) || WINANSI_EXTRA.has(ch)) out += ch;
    else if (ch in TRANSLIT) out += TRANSLIT[ch];
  }
  return out;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const NAVY = "#1f3864";
const BLUE = "#2e75b6";
const GREY = "#6b7280";

const s = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 54, paddingHorizontal: 46, fontSize: 9.5, fontFamily: "Helvetica", color: "#111827" },
  // Pas de lineHeight sur la Page (il masque le texte dynamique de
  // pagination dans react-pdf 4) ni sur un conteneur (interligne doublé dans
  // les cellules) : l'espacement passe par les marges des blocs.
  corps: {},
  header: { position: "absolute", top: 20, left: 46, right: 46, fontSize: 7.5, color: GREY, textAlign: "right" },
  pagination: { position: "absolute", bottom: 24, left: 46, right: 46, textAlign: "center", fontSize: 7.5, color: GREY },
  mention: { position: "absolute", bottom: 12, left: 46, right: 46, fontSize: 7.5, color: "#15803d" },
  titre: { fontSize: 22, fontFamily: "Helvetica-Bold", color: NAVY, lineHeight: 1.15 },
  sousTitre: { fontSize: 13, color: BLUE, marginTop: 2 },
  ligneInfo: { fontSize: 9.5, color: GREY, marginTop: 3, paddingBottom: 8, borderBottomWidth: 1.5, borderBottomColor: BLUE, marginBottom: 14 },
  h1: { fontSize: 14, fontFamily: "Helvetica-Bold", color: NAVY, marginTop: 10, marginBottom: 8 },
  h2: { fontSize: 11.5, fontFamily: "Helvetica-Bold", color: BLUE, marginTop: 12, paddingBottom: 3, borderBottomWidth: 0.6, borderBottomColor: "#cbd5e1", marginBottom: 5 },
  h3: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: NAVY, marginTop: 6, marginBottom: 2 },
  bold: { fontFamily: "Helvetica-Bold" },
  link: { color: "#1d4ed8", textDecoration: "underline" },
  small: { fontSize: 8, color: GREY },
  table: { borderWidth: 0.6, borderColor: "#cbd5e1" },
  thRow: { flexDirection: "row", backgroundColor: NAVY },
  th: { color: "#fff", fontFamily: "Helvetica-Bold", padding: 4, fontSize: 9 },
  tr: { flexDirection: "row", borderTopWidth: 0.6, borderTopColor: "#cbd5e1" },
  trAlt: { backgroundColor: "#f3f4f6" },
  td: { padding: 4, fontSize: 9 },
  trajet: { flexDirection: "row", borderTopWidth: 0.6, borderTopColor: "#e5e7eb" },
  trajetTxt: { paddingVertical: 1.5, paddingLeft: 4, fontSize: 7, color: GREY, fontFamily: "Helvetica-Oblique" },
  li: { flexDirection: "row", marginBottom: 2.5 },
  puce: { width: 10, color: GREY },
  encadre: { borderLeftWidth: 3, padding: 6, marginVertical: 4 },
  photo: { marginTop: 6, marginBottom: 2, maxHeight: 230, objectFit: "contain" },
  caption: { fontSize: 7.5, color: GREY, textAlign: "center", marginBottom: 4 },
});

// ─── Données d'entrée ─────────────────────────────────────────────────────────

export interface PdfPhoto {
  data: Buffer;
  format: "jpg" | "png";
}

export interface PdfBilanParticipant {
  nom: string;
  bilan: Bilan;
}

export interface TourneePdfInput {
  plan: TourneePlan;
  theorique: PlanTheorique;
  /** "YYYY-MM-DD" pour une réalisation ; null pour un modèle (« Jour J »). */
  date: string | null;
  photos: Map<string, PdfPhoto>;
  bilans?: PdfBilanParticipant[];
}

// ─── Petits composants ────────────────────────────────────────────────────────

function Rich({ segments }: { segments: Segment[] }) {
  return (
    <>
      {segments.map((g, i) => (
        <Text key={i} style={g.bold ? s.bold : undefined}>{pdfText(g.text)}</Text>
      ))}
    </>
  );
}

function Texte({ texte }: { texte: string }) {
  return (
    <View>
      {parseTexte(texte).map((l, i) =>
        l.kind === "p" ? (
          <Text key={i} style={{ marginBottom: 2 }}><Rich segments={l.segments} /></Text>
        ) : (
          <View key={i} style={[s.li, { paddingLeft: l.level === 2 ? 22 : 8 }]}>
            <Text style={s.puce}>{l.level === 2 ? "–" : "•"}</Text>
            <Text style={{ flex: 1 }}><Rich segments={l.segments} /></Text>
          </View>
        ),
      )}
    </View>
  );
}

function Maps({ lat, lng }: { lat: number; lng: number }) {
  return (
    <Text>
      <Link src={carteUrl(lat, lng)} style={s.link}>Ouvrir dans Google Maps</Link>
      <Text style={s.small}>  ({formatGps(lat, lng)})</Text>
    </Text>
  );
}

const BLOC_COULEURS: Record<TourneeBloc["type"], { bord: string; fond: string; titre: string } | null> = {
  SECTION: null,
  ATTENTION: { bord: "#dc2626", fond: "#fdecea", titre: "#b91c1c" },
  EXERCICE: { bord: "#d97706", fond: "#fef3e2", titre: "#92400e" },
  INFO: { bord: "#0284c7", fond: "#e0f2fe", titre: "#075985" },
};

function Bloc({ bloc }: { bloc: TourneeBloc }) {
  const c = BLOC_COULEURS[bloc.type];
  const contenu = (
    <>
      {bloc.lieu && (
        <Text style={{ marginBottom: 2 }}>
          <Text style={s.bold}>Localisation {pdfText(bloc.lieu.libelle ? `du ${bloc.lieu.libelle}` : "")} : </Text>
          <Maps lat={bloc.lieu.latitude} lng={bloc.lieu.longitude} />
        </Text>
      )}
      <Texte texte={bloc.texte} />
    </>
  );
  if (!c) {
    return (
      <View wrap={false}>
        {bloc.titre ? <Text style={s.h3}>{pdfText(bloc.titre)}</Text> : null}
        {contenu}
      </View>
    );
  }
  return (
    <View style={[s.encadre, { borderLeftColor: c.bord, backgroundColor: c.fond }]} wrap={false}>
      {bloc.titre ? <Text style={[s.bold, { color: c.titre, marginBottom: 2 }]}>{pdfText(bloc.titre)}</Text> : null}
      {contenu}
    </View>
  );
}

// ─── Document ─────────────────────────────────────────────────────────────────

function horaire(e: TourneePlanEtape, t: PlanTheorique): string {
  const x = t.byKey.get(e.key)!;
  if (e.optionnelle || x.debut === null) return "Optionnel";
  return e.dureeMin > 0 ? `${formatHeure(x.debut)} – ${formatHeure(x.fin!)}` : formatHeure(x.debut);
}

function TourneeDocument({ plan, theorique, date, photos, bilans }: TourneePdfInput) {
  const premier = plan.etapes.find((e) => !e.optionnelle);
  const dernier = [...plan.etapes].reverse().find((e) => !e.optionnelle);
  const dateTxt = date ? formatDateLongue(date) : "Jour J";
  const dateCap = dateTxt.charAt(0).toUpperCase() + dateTxt.slice(1);
  const enTete = `${plan.titre} – ${date ? formatDateLongue(date).replace(/^\S+ /, "") : "modèle"}`;
  const infos = [
    dateCap,
    premier ? `Départ ${formatHeure(theorique.depart)}${premier.type === "DEPART" ? ` – ${premier.titre}` : ""}` : null,
    dernier ? `${dernier.type === "RESTITUTION" ? "Restitution" : "Fin"} ${formatHeure(theorique.fin)}` : null,
  ].filter(Boolean).join("  ·  ");
  const W = { h: "17%", e: "43%", r: "22%", g: "18%" };

  return (
    <Document title={pdfText(enTete)} author="Astreinte" creator="Astreinte — Tournées terrain">
      <Page size="A4" style={s.page}>
        <Text style={s.header} fixed>{pdfText(enTete)}</Text>
        {plan.mentionDiffusion ? <Text style={s.mention} fixed>{pdfText(plan.mentionDiffusion)}</Text> : null}
        <Text style={s.pagination} fixed render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />

        <View style={s.corps}>

        {/* En-tête */}
        <Text style={s.titre}>{pdfText(plan.titre.toUpperCase())}</Text>
        {plan.sousTitre ? <Text style={s.sousTitre}>{pdfText(plan.sousTitre)}</Text> : null}
        <Text style={s.ligneInfo}>{pdfText(infos)}</Text>
        {plan.objectif ? <Text style={{ marginBottom: 8 }}><Text style={s.bold}>Objectif : </Text>{pdfText(plan.objectif)}</Text> : null}

        {/* 1. Programme */}
        <Text style={s.h1}>1. Programme de la journée</Text>
        <View style={s.table}>
          <View style={s.thRow} fixed>
            <Text style={[s.th, { width: W.h }]}>Horaire</Text>
            <Text style={[s.th, { width: W.e }]}>Étape</Text>
            <Text style={[s.th, { width: W.r }]}>Référence</Text>
            <Text style={[s.th, { width: W.g }]}>GPS</Text>
          </View>
          {plan.etapes.map((e, i) => {
            const gps = e.latitude != null && e.longitude != null;
            const suivante = plan.etapes.slice(i + 1).some((x) => !x.optionnelle);
            return (
              <View key={e.key} wrap={false}>
                <View style={[s.tr, i % 2 === 1 ? s.trAlt : {}]}>
                  <Text style={[s.td, s.bold, { width: W.h }]}>{pdfText(horaire(e, theorique))}</Text>
                  <Text style={[s.td, { width: W.e }]}>{pdfText(e.titre)}{e.description ? ` (${pdfText(e.description)})` : ""}</Text>
                  <View style={[s.td, { width: W.r }]}>
                    {e.liens.length ? (
                      <Text>
                        {e.liens.map((l, k) => (
                          <Text key={k}>
                            {k > 0 ? " / " : ""}
                            <Link src={l.url} style={[s.link, { fontSize: 8 }]}>{pdfText(l.libelle)}</Link>
                          </Text>
                        ))}
                      </Text>
                    ) : <Text> </Text>}
                  </View>
                  <View style={[s.td, { width: W.g }]}>
                    {gps ? (
                      <Link src={navigationUrl(e.latitude!, e.longitude!)} style={s.link}>Itinéraire / carte</Link>
                    ) : (
                      <Text style={[s.small, { fontFamily: "Helvetica-Oblique" }]}>{e.localisationMasquee ? "Non communiqué" : "—"}</Text>
                    )}
                  </View>
                </View>
                {!e.optionnelle && suivante && e.trajetSuivanteMin > 0 && (
                  <View style={s.trajet}>
                    <Text style={[s.trajetTxt, { width: "100%" }]}>{`trajet ${e.trajetSuivanteMin} min`}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* À propos */}
        {plan.aPropos.length > 0 && (
          <View>
            <Text style={s.h1}>À propos de cette tournée</Text>
            {plan.aPropos.map((a) => (
              <View key={a.id} wrap={false} style={{ marginBottom: 4 }}>
                <Text style={s.h3}>{pdfText(a.titre)}</Text>
                <Texte texte={a.texte} />
              </View>
            ))}
          </View>
        )}

        {/* 2. Détail */}
        <Text style={s.h1} break={plan.etapes.length > 12}>2. Détail des étapes et consignes</Text>
        {plan.etapes.map((e) => {
          const gps = e.latitude != null && e.longitude != null;
          return (
            <View key={e.key}>
              <View wrap={false}>
                <Text style={s.h2}>{pdfText(`${horaire(e, theorique)} · ${e.titre}`)}</Text>
                {e.localisationMasquee && !gps ? (
                  <Text><Text style={s.bold}>Localisation : </Text><Text style={{ fontFamily: "Helvetica-Oblique" }}>non communiquée (à trouver par ses propres moyens)</Text></Text>
                ) : gps ? (
                  <Text><Text style={s.bold}>Localisation : </Text><Maps lat={e.latitude!} lng={e.longitude!} /></Text>
                ) : null}
                {e.adresse ? <Text><Text style={s.bold}>Adresse : </Text>{pdfText(e.adresse)}</Text> : null}
                {e.liens.length > 0 && (
                  <Text style={{ marginTop: 2 }}>
                    <Text style={s.bold}>Référentiel : </Text>
                    {e.liens.map((l, k) => (
                      <Text key={k}>{k > 0 ? " ; " : ""}<Link src={l.url} style={s.link}>{pdfText(l.libelle)}</Link></Text>
                    ))}
                  </Text>
                )}
                {e.optionnelle && (
                  <Text style={s.small}>{`Étape optionnelle — ${e.dureeMin} min sur place, détour ${e.surcoutTrajetMin ?? 0} min.`}</Text>
                )}
              </View>
              {e.photos.map((p) => {
                const img = photos.get(p.id);
                if (!img) return null;
                return (
                  <View key={p.id} wrap={false}>
                    <Image src={{ data: img.data, format: img.format }} style={s.photo} />
                    {p.caption ? <Text style={s.caption}>{pdfText(p.caption)}</Text> : null}
                  </View>
                );
              })}
              {e.contenu.map((b) => <Bloc key={b.id} bloc={b} />)}
            </View>
          );
        })}

        {/* 3. Contacts */}
        {plan.contacts.length > 0 && (
          <View wrap={false}>
            <Text style={s.h1}>3. Contacts utiles</Text>
            <View style={s.table}>
              <View style={s.thRow}>
                <Text style={[s.th, { width: "40%" }]}>Fonction</Text>
                <Text style={[s.th, { width: "32%" }]}>Nom</Text>
                <Text style={[s.th, { width: "28%" }]}>Téléphone</Text>
              </View>
              {plan.contacts.map((c, i) => (
                <View key={i} style={[s.tr, i % 2 === 1 ? s.trAlt : {}]}>
                  <Text style={[s.td, { width: "40%" }]}>{pdfText(c.fonction)}</Text>
                  <Text style={[s.td, { width: "32%" }]}>{pdfText(c.nom)}</Text>
                  <View style={[s.td, { width: "28%" }]}>
                    {c.telephone ? <Link src={`tel:${c.telephone.replace(/\s/g, "")}`} style={{ color: "#111827", textDecoration: "none" }}>{pdfText(c.telephone)}</Link> : <Text>—</Text>}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 4. Restitution du temps */}
        {bilans && bilans.length > 0 && (
          <View break>
            <Text style={s.h1}>4. Restitution du temps</Text>
            {bilans.map((b, bi) => (
              <View key={bi} style={{ marginBottom: 10 }}>
                <Text style={s.h3}>
                  {pdfText(b.nom)} — prévu {formatHeure(b.bilan.debutPrevu)}-{formatHeure(b.bilan.finPrevue)}, réalisé{" "}
                  {b.bilan.debutReel ? formatHeure(b.bilan.debutReel) : "?"}-{b.bilan.finReelle ? formatHeure(b.bilan.finReelle) : "en cours"}
                  {b.bilan.ecartFinalMin !== null ? `, écart final ${b.bilan.ecartFinalMin > 0 ? "+" : ""}${Math.round(b.bilan.ecartFinalMin)} min` : ""}
                </Text>
                <View style={s.table}>
                  <View style={s.thRow}>
                    <Text style={[s.th, { width: "46%" }]}>Étape</Text>
                    <Text style={[s.th, { width: "18%" }]}>Prévu</Text>
                    <Text style={[s.th, { width: "18%" }]}>Réel</Text>
                    <Text style={[s.th, { width: "18%" }]}>Écart</Text>
                  </View>
                  {b.bilan.lignes
                    .filter((l) => l.dureePrevueMin > 0 || l.dureeReelleMin !== null)
                    .map((l, i) => {
                      const e = plan.etapes.find((x) => x.key === l.key)!;
                      const ec = l.ecartDureeMin;
                      return (
                        <View key={l.key} style={[s.tr, i % 2 === 1 ? s.trAlt : {}]} wrap={false}>
                          <Text style={[s.td, { width: "46%" }]}>{pdfText(e.titre)}{l.statut === "ignoree" ? " (ignorée)" : l.statut === "non_realisee" ? " (non réalisée)" : ""}</Text>
                          <Text style={[s.td, { width: "18%" }]}>{`${l.dureePrevueMin} min`}</Text>
                          <Text style={[s.td, { width: "18%" }]}>{l.dureeReelleMin !== null ? `${Math.round(l.dureeReelleMin)} min` : "—"}</Text>
                          <Text style={[s.td, { width: "18%", color: ec && ec > 0 ? "#b91c1c" : ec && ec < 0 ? "#15803d" : "#111827" }]}>
                            {ec === null ? "—" : `${ec > 0 ? "+" : ""}${Math.round(ec)}`}
                          </Text>
                        </View>
                      );
                    })}
                </View>
              </View>
            ))}
          </View>
        )}
        </View>
      </Page>
    </Document>
  );
}

export async function renderTourneePdf(input: TourneePdfInput): Promise<Buffer> {
  return renderToBuffer(<TourneeDocument {...input} />);
}
