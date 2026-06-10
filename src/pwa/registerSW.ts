/**
 * Guarded service-worker registration för offline-läget.
 *
 * Service workern registreras ENDAST i produktion på riktig domän — aldrig
 * i Lovable-preview, iframe, dev, eller om ?sw=off finns i URL:en.
 *
 * Detta är den ENDA platsen där SW registreras. vite-plugin-pwa är konfigurerad
 * med injectRegister: null så att den inte injectar något själv.
 */

const SW_PATH = "/sw.js";

function shouldSkipRegistration(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  if (window.self !== window.top) return true; // iframe (Lovable preview)
  const url = new URL(window.location.href);
  if (url.searchParams.get("sw") === "off") return true;
  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return true;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;
  return false;
}

async function unregisterMatching() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      const url = reg.active?.scriptURL ?? reg.waiting?.scriptURL ?? reg.installing?.scriptURL ?? "";
      if (url.endsWith(SW_PATH)) {
        await reg.unregister();
      }
    }
  } catch {
    /* noop */
  }
}

export function registerSW() {
  if (shouldSkipRegistration()) {
    void unregisterMatching();
    return;
  }
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register(SW_PATH, { scope: "/" }).catch((err) => {
      console.warn("[pwa] SW-registrering misslyckades", err);
    });
  });
}
