/**
 * Parseur KML pour les points d'accès ferroviaires.
 * Lit le contenu d'un fichier KML et extrait tous les Placemarks.
 * Robuste aux CDATA, aux espaces, aux coordonnées avec ou sans altitude.
 */

import { parseAccesNom, type ParsedNom } from "./parseAccesNom";

export interface KmlPoint extends ParsedNom {
  latitude: number;
  longitude: number;
}

/**
 * Parse le contenu KML brut (string) et retourne un tableau de points.
 */
export function parseKmlContent(kmlContent: string): KmlPoint[] {
  const results: KmlPoint[] = [];

  // Extraire tous les blocs <Placemark>...</Placemark>
  const placemarkRegex = /<Placemark>([\s\S]*?)<\/Placemark>/g;
  let placemarkMatch: RegExpExecArray | null;

  while ((placemarkMatch = placemarkRegex.exec(kmlContent)) !== null) {
    const block = placemarkMatch[1];

    // Extraire le <name> (avec ou sans CDATA)
    const nameMatch = block.match(
      /<name>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/name>/
    );
    if (!nameMatch) continue;
    const rawName = (nameMatch[1] ?? nameMatch[2] ?? "").trim();
    if (!rawName) continue;

    // Extraire les coordonnées
    const coordMatch = block.match(/<coordinates>\s*([\d.,\-\s]+)\s*<\/coordinates>/);
    if (!coordMatch) continue;

    const coordParts = coordMatch[1].trim().split(",");
    if (coordParts.length < 2) continue;

    const longitude = parseFloat(coordParts[0].trim());
    const latitude = parseFloat(coordParts[1].trim());

    if (isNaN(latitude) || isNaN(longitude)) continue;

    const parsed = parseAccesNom(rawName);
    results.push({ ...parsed, latitude, longitude });
  }

  return results;
}
