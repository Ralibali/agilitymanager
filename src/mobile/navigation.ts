export type MobileSection = "planner" | "library" | "account";

export function mobileSection(path: string): MobileSection | null {
  if (/^\/banplanerare(\/|$)/.test(path)) return "planner";
  if (/^\/(banor|delade-banor|bana)(\/|$)/.test(path)) return "library";
  if (/^\/(mitt-agilitymanager|konto|auth|logga-in|integritet|radera-konto)(\/|$)/.test(path)) return "account";
  return null;
}
