const NATIVE_ROUTE = /^\/(?:$|banplanerare|banor|delade-banor|bana\/[^/]+|mitt-agilitymanager|konto|auth|logga-in|integritet|radera-konto)$/;

/** Only owned routes may be opened through the custom URL scheme. */
export function nativeRouteFromUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    let route: string;
    if (url.protocol === 'agilitymanager:') {
      route = `/${url.hostname}${url.pathname}`.replace(/\/$/, '') || '/';
    } else if (url.protocol === 'https:' && ['agilitymanager.se', 'www.agilitymanager.se'].includes(url.hostname)) {
      route = url.pathname;
    } else return null;
    if (!NATIVE_ROUTE.test(route)) return null;
    return route + url.search + url.hash;
  } catch {
    return null;
  }
}

/** Resolve same-WebView anchors through the route allowlist, including plain
 * paths emitted by course/learner pages. Compare scheme and authority because
 * custom WebView schemes can have an opaque ("null") URL origin.
 */
export function nativeRouteFromInternalAnchor(raw: string, currentUrl: string): string | null {
  try {
    const current = new URL(currentUrl);
    const anchor = new URL(raw, current);
    if (anchor.protocol !== current.protocol || anchor.host !== current.host) return null;
    // A section fragment is not a router destination; leave it to the page.
    if (anchor.hash && !anchor.hash.startsWith('#/') && anchor.pathname === current.pathname && anchor.search === current.search) return null;
    const route = anchor.hash.startsWith('#/')
      ? anchor.hash.slice(1)
      : anchor.pathname + anchor.search + anchor.hash;
    return nativeRouteFromUrl(`https://agilitymanager.se${route}`);
  } catch {
    return null;
  }
}
