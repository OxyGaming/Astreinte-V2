// Distance haversine entre deux coordonnées GPS.
// Source unique pour le client (km) et le serveur (m).

const R_EARTH_M = 6_371_000;

export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R_EARTH_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return distanceMeters(lat1, lon1, lat2, lon2) / 1000;
}
