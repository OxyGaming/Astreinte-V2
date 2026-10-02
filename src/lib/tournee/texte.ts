/**
 * Mini-format de texte des consignes (pur — partagé UI web et PDF).
 *
 *   - ligne      → puce
 *   • ligne      → puce
 *   -- ligne     → sous-puce
 *   **gras**     → gras
 *   ligne vide   → séparation de paragraphe
 */

export interface Segment {
  text: string;
  bold: boolean;
}

export type LigneTexte =
  | { kind: "p"; segments: Segment[] }
  | { kind: "li"; level: 1 | 2; segments: Segment[] };

export function parseSegments(line: string): Segment[] {
  const out: Segment[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push({ text: line.slice(last, m.index), bold: false });
    out.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push({ text: line.slice(last), bold: false });
  return out.length ? out : [{ text: "", bold: false }];
}

export function parseTexte(texte: string): LigneTexte[] {
  const lignes: LigneTexte[] = [];
  for (const raw of (texte ?? "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const sub = /^(--|–|—)\s+(.*)$/.exec(line);
    if (sub) {
      lignes.push({ kind: "li", level: 2, segments: parseSegments(sub[2]) });
      continue;
    }
    const li = /^[-•*]\s+(.*)$/.exec(line);
    if (li) {
      lignes.push({ kind: "li", level: 1, segments: parseSegments(li[1]) });
      continue;
    }
    lignes.push({ kind: "p", segments: parseSegments(line) });
  }
  return lignes;
}
