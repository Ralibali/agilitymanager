/** Svenskt datumformat för artiklar och listvyer: "4 november 2025". */
export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" });
