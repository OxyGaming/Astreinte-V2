/**
 * Conversions horaires du module Tournée — toujours en Europe/Paris, quel que
 * soit le fuseau de l'exécution (le conteneur de prod est en UTC).
 * Pur : utilisable côté client et serveur, sans dépendance.
 */

export const TOURNEE_TZ = "Europe/Paris";

const HHMM = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidHHmm(v: unknown): v is string {
  return typeof v === "string" && HHMM.test(v.trim());
}

export function isValidYmd(v: unknown): v is string {
  return typeof v === "string" && YMD.test(v.trim());
}

/** "HH:mm" → minutes depuis minuit. */
export function hhmmToMinutes(v: string): number {
  const m = HHMM.exec(v.trim());
  if (!m) throw new Error(`Heure invalide : ${v}`);
  return Number(m[1]) * 60 + Number(m[2]);
}

const partsFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TOURNEE_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function parisParts(epoch: number) {
  const p: Record<string, number> = {};
  for (const part of partsFmt.formatToParts(new Date(epoch))) {
    if (part.type !== "literal") p[part.type] = Number(part.value);
  }
  return p as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

/** Décalage (ms) de Paris par rapport à UTC à l'instant donné. */
function parisOffset(epoch: number): number {
  const p = parisParts(epoch);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(epoch / 1000) * 1000;
}

/** Jour "YYYY-MM-DD" + minutes locales Paris → epoch ms. */
export function parisToEpoch(ymd: string, minutes: number): number {
  const m = YMD.exec(ymd.trim());
  if (!m) throw new Error(`Date invalide : ${ymd}`);
  const guess = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, minutes);
  // Deux passes : gère les jours de changement d'heure.
  let epoch = guess - parisOffset(guess);
  epoch = guess - parisOffset(epoch);
  return epoch;
}

/** epoch → "HH:mm" (Paris). */
export function formatHHmm(epoch: number): string {
  const p = parisParts(epoch);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

/** epoch → "8h45" / "9h00" (style du document de référence). */
export function formatHeure(epoch: number): string {
  const p = parisParts(epoch);
  return `${p.hour}h${String(p.minute).padStart(2, "0")}`;
}

/** epoch → "YYYY-MM-DD" (jour local Paris). */
export function parisYmd(epoch: number): string {
  const p = parisParts(epoch);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" → « jeudi 1er octobre 2026 ». */
export function formatDateLongue(ymd: string): string {
  const m = YMD.exec(ymd);
  if (!m) return ymd;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  const txt = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
  return txt.replace(/^(\D+ )1 /, "$11er ");
}

/** "YYYY-MM-DD" → "01/10/2026". */
export function formatDateCourte(ymd: string): string {
  const m = YMD.exec(ymd);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ymd;
}

/** Durée en minutes (signée) → "+7 min", "−3 min", "1 h 05". */
export function formatEcart(min: number): string {
  const r = Math.round(min);
  if (r === 0) return "0 min";
  const sign = r > 0 ? "+" : "−";
  return `${sign}${formatDuree(Math.abs(r))}`;
}

/** Minutes positives → "45 min" / "1 h 15". */
export function formatDuree(min: number): string {
  const r = Math.max(0, Math.round(min));
  if (r < 60) return `${r} min`;
  return `${Math.floor(r / 60)} h ${String(r % 60).padStart(2, "0")}`;
}

/** Millisecondes signées → "18:42" / "+04:12" (minutes:secondes ou h:mm:ss). */
export function formatChrono(ms: number): string {
  const neg = ms < 0;
  const total = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const core = h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return neg ? `+${core}` : core;
}
