/** Apex origin used in first-byte and client canonicals. Never lovable.app. */
export const SITE_ORIGIN = "https://agilitymanager.se";

export type FirstByteRoute = {
  path: "/" | "/banplanerare";
  title: string;
  description: string;
};

export const FIRST_BYTE_ROUTES: Record<FirstByteRoute["path"], FirstByteRoute> = {
  "/": {
    path: "/",
    title: "AgilityManager — Tävlingskalender + gratis banplanerare för agility och hoopers",
    description:
      "Hitta svenska agilitytävlingar, spara favoriter och bygg träningsbanor i meterskala för agility och hoopers. Regelkontroll, banbibliotek, export och delning — gratis att börja använda.",
  },
  "/banplanerare": {
    path: "/banplanerare",
    title: "Banplanerare — rita agility- och hoopersbanor gratis | AgilityManager",
    description:
      "Rita banor i meterskala direkt i webbläsaren. Hindereditor, live banlinje, PNG-export och delningslänkar för agility och hoopers — gratis, utan konto.",
  },
};

export function canonicalUrl(path: FirstByteRoute["path"]): string {
  return path === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`;
}

export function routeFromRequestPath(requestPath: string): FirstByteRoute {
  const pathname = requestPath.split("?")[0] ?? "/";
  if (
    pathname === "/banplanerare" ||
    pathname === "/banplanerare/" ||
    pathname.endsWith("/banplanerare/index.html")
  ) {
    return FIRST_BYTE_ROUTES["/banplanerare"];
  }
  return FIRST_BYTE_ROUTES["/"];
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function upsertHeadTag(html: string, pattern: RegExp, tag: string): string {
  if (pattern.test(html)) {
    return html.replace(pattern, tag);
  }
  if (html.includes("</head>")) {
    return html.replace("</head>", `    ${tag}\n  </head>`);
  }
  return `${tag}\n${html}`;
}

/**
 * Inject or replace first-byte title, description, robots and canonical.
 * Search engines that only read the Vite shell see these without JS.
 */
export function applyFirstByteSeo(html: string, route: FirstByteRoute): string {
  const canonical = canonicalUrl(route.path);
  if (/lovable\.app/i.test(canonical)) {
    throw new Error("canonical must not use lovable.app");
  }

  let out = html;
  out = upsertHeadTag(out, /<title>[\s\S]*?<\/title>/i, `<title>${route.title}</title>`);
  out = upsertHeadTag(
    out,
    /<meta\s+name=["']description["'][^>]*>/i,
    `<meta name="description" content="${escapeAttr(route.description)}" />`,
  );
  out = upsertHeadTag(
    out,
    /<meta\s+name=["']robots["'][^>]*>/i,
    `<meta name="robots" content="index,follow" />`,
  );
  out = upsertHeadTag(
    out,
    /<link\s+[^>]*rel=["']canonical["'][^>]*>/i,
    `<link rel="canonical" href="${canonical}" />`,
  );
  return out;
}

export function assertFirstByteMoneyRoute(html: string, route: FirstByteRoute): void {
  const canonical = canonicalUrl(route.path);
  if (!/<meta\s+name=["']robots["']\s+content=["']index,follow["']/i.test(html)) {
    throw new Error(`missing robots index,follow for ${route.path}`);
  }
  if (!html.includes(`href="${canonical}"`) || !/rel=["']canonical["']/i.test(html)) {
    throw new Error(`missing canonical ${canonical} for ${route.path}`);
  }
  if (!html.includes(`<title>${route.title}</title>`)) {
    throw new Error(`missing title for ${route.path}`);
  }
  const canonicalTag = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*>/i)?.[0] ?? "";
  if (/lovable\.app/i.test(canonicalTag)) {
    throw new Error("canonical must not use lovable.app");
  }
}
