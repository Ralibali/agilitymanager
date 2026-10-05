/** Svenskt datumformat för artiklar och listvyer: "4 november 2025". */
export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" });

/**
 * Dagens datum som "YYYY-MM-DD" i användarens lokala tid. `toISOString()` ger
 * UTC-datum — mellan midnatt och 01/02 svensk tid är det fortfarande gårdagen.
 */
export function localIsoDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
