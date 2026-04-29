/**
 * Consent-driven loader för analys- och marknadsföringsskript.
 * Plausible = analys. Meta Pixel = marknadsföring.
 * Skript laddas ENDAST vid samtycke och tas bort när samtycket dras tillbaka.
 *
 * Konfig via Vite env:
 *   VITE_PLAUSIBLE_DOMAIN, VITE_PLAUSIBLE_SRC, VITE_META_PIXEL_ID
 */
import { readConsent, CONSENT_EVENT, type ConsentState } from "@/lib/cookieConsent";

const PLAUSIBLE_SCRIPT_ID = "am-plausible";
const META_PIXEL_SCRIPT_ID = "am-meta-pixel";
const META_PIXEL_NOSCRIPT_ID = "am-meta-pixel-noscript";
const PLAUSIBLE_COOKIE_PREFIXES = ["plausible_"];
const META_COOKIES = ["_fbp", "_fbc"];

declare global {
  interface Window {
    plausible?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  const hostParts = location.hostname.split(".");
  const domains = [
    "",
    location.hostname,
    "." + location.hostname,
    ...(hostParts.length > 1 ? ["." + hostParts.slice(-2).join(".")] : []),
  ];
  for (const d of domains) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/${d ? `;domain=${d}` : ""}`;
  }
}

function clearCookiesByPrefix(prefixes: string[]) {
  if (typeof document === "undefined") return;
  document.cookie.split(";").forEach((raw) => {
    const name = raw.split("=")[0]?.trim();
    if (!name) return;
    if (prefixes.some((p) => name.startsWith(p))) deleteCookie(name);
  });
}

function loadPlausible() {
  if (typeof document === "undefined") return;
  if (document.getElementById(PLAUSIBLE_SCRIPT_ID)) return;
  const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined;
  if (!domain) return;
  const src = (import.meta.env.VITE_PLAUSIBLE_SRC as string | undefined) || "https://plausible.io/js/script.js";
  const s = document.createElement("script");
  s.id = PLAUSIBLE_SCRIPT_ID;
  s.defer = true;
  s.setAttribute("data-domain", domain);
  s.src = src;
  document.head.appendChild(s);
  if (!window.plausible) {
    window.plausible = function (...args: unknown[]) {
      ((window.plausible as any).q = (window.plausible as any).q || []).push(args);
    };
  }
}

function unloadPlausible() {
  document.getElementById(PLAUSIBLE_SCRIPT_ID)?.remove();
  try { delete (window as any).plausible; } catch { window.plausible = undefined; }
  clearCookiesByPrefix(PLAUSIBLE_COOKIE_PREFIXES);
}

function loadMetaPixel() {
  if (typeof document === "undefined") return;
  if (document.getElementById(META_PIXEL_SCRIPT_ID)) return;
  const pixelId = import.meta.env.VITE_META_PIXEL_ID as string | undefined;
  if (!pixelId) return;

  /* eslint-disable */
  ((f: any, b: any, e: string, v: string) => {
    if (f.fbq) return;
    const n: any = (f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    if (!f._fbq) f._fbq = n;
    n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
    const t: HTMLScriptElement = b.createElement(e) as HTMLScriptElement;
    t.id = META_PIXEL_SCRIPT_ID; t.async = true; t.src = v;
    const s = b.getElementsByTagName(e)[0];
    s.parentNode!.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */

  window.fbq?.("init", pixelId);
  window.fbq?.("track", "PageView");

  if (!document.getElementById(META_PIXEL_NOSCRIPT_ID)) {
    const ns = document.createElement("noscript");
    ns.id = META_PIXEL_NOSCRIPT_ID;
    ns.innerHTML = `<img height="1" width="1" style="display:none" alt="" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1" />`;
    document.body.appendChild(ns);
  }
}

function unloadMetaPixel() {
  document.getElementById(META_PIXEL_SCRIPT_ID)?.remove();
  document.getElementById(META_PIXEL_NOSCRIPT_ID)?.remove();
  try { delete (window as any).fbq; delete (window as any)._fbq; } catch { window.fbq = undefined; window._fbq = undefined; }
  for (const c of META_COOKIES) deleteCookie(c);
}

function applyConsent(state: ConsentState | null) {
  if (state?.analytics) loadPlausible(); else unloadPlausible();
  if (state?.marketing) loadMetaPixel(); else unloadMetaPixel();
}

let initialized = false;

/** Anropas en gång vid app-start. Lyssnar på consent-events resten av livet. */
export function initAnalyticsLoader() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  applyConsent(readConsent());
  window.addEventListener(CONSENT_EVENT, (e: Event) => {
    const detail = (e as CustomEvent).detail as ConsentState | null;
    applyConsent(detail);
  });
}

/** Säker event-spårning – tyst no-op utan samtycke. */
export function trackEvent(name: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const state = readConsent();
  if (!state?.analytics) return;
  try { window.plausible?.(name, props ? { props } : undefined); } catch { /* noop */ }
}
