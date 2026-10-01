export type MobileSection = "courses" | "competitions" | "training" | "account" | "knowledge";

export function mobileSection(path: string): MobileSection | null {
  if (/^\/(banor|banplanerare|delade-banor|bana)(\/|$)/.test(path)) return "courses";
  if (/^\/(tavlingar|resultat|klubbar)(\/|$)/.test(path)) return "competitions";
  if (/^\/(traning|instruktor|elev)(\/|$)/.test(path)) return "training";
  if (/^\/(mitt-agilitymanager|konto|auth|logga-in|integritet|radera-konto)(\/|$)/.test(path)) return "account";
  if (/^\/(blogg|funktioner|priser|gratis|jamfor-hundforsakring)(\/|$)/.test(path)) return "knowledge";
  return null;
}
