/**
 * Liens de navigation (pur). Même convention que la page Accès :
 * Google Maps « dir » ouvre l'application de navigation du terminal.
 */

export function navigationUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function carteUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function formatGps(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/**
 * Itinéraire complet multi-étapes. L'URL Google Maps accepte au plus
 * 9 points intermédiaires : au-delà, on découpe en tronçons successifs.
 */
export function itineraireUrls(points: { lat: number; lng: number }[]): string[] {
  if (points.length < 2) return [];
  const urls: string[] = [];
  const MAX = 11; // origine + 9 waypoints + destination
  for (let start = 0; start < points.length - 1; start += MAX - 1) {
    const chunk = points.slice(start, start + MAX);
    if (chunk.length < 2) break;
    const o = chunk[0];
    const d = chunk[chunk.length - 1];
    const wp = chunk.slice(1, -1).map((p) => `${p.lat},${p.lng}`).join("|");
    urls.push(
      `https://www.google.com/maps/dir/?api=1&origin=${o.lat},${o.lng}&destination=${d.lat},${d.lng}` +
        (wp ? `&waypoints=${encodeURIComponent(wp)}` : "") +
        "&travelmode=driving",
    );
  }
  return urls;
}
