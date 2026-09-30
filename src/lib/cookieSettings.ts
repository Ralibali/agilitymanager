/**
 * Öppnar cookie-/statistikinställningarna igen. Knappen ligger i sidfoten i
 * stället för som en flytande knapp, så att den aldrig täcker knappar i
 * innehållet (t.ex. heroknappar eller planerarens verktygsrad i mobilen).
 */
export const OPEN_COOKIE_SETTINGS_EVENT = "agilitymanager:open-cookie-settings";

export function openCookieSettings(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
}
