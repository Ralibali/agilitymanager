export type MobileSection = "planner" | "library" | "own";

export function mobileSection(path: string): MobileSection | null {
  if (/^\/banplanerare(\/|$)/.test(path)) return "planner";
  if (/^\/banor(\/|$)/.test(path)) return "library";
  if (/^\/(mina-banor|mitt-agilitymanager|integritet)(\/|$)/.test(path)) return "own";
  return null;
}
