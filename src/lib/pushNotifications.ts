// ── Push-notiser för anmälningsöppning/-stängning ─────────────────────────
// Fungerar utan inloggning: prenumerationen kopplas till webbläsaren och
// synkas mot dina favoritmarkerade tävlingar.

import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY =
  "BLIE_2sCDfHKyKjCqhLvQGMJmTl4tLDn-yE1uhkioRmYJMiBi67DPdnc2bvJKzg33GVBY3D3uBYSFSZwuhJ8XLI";

const SW_URL = "/push-sw.js";

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** iOS kräver att sajten är tillagd på hemskärmen för att tillåta notiser. */
export function needsHomeScreenInstall(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true;
  return isIos && !standalone;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!pushSupported()) return "unsupported";
  return Notification.permission;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

function keyToBase64(key: ArrayBuffer | null): string {
  if (!key) return "";
  const bytes = new Uint8Array(key);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function registration(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register(SW_URL, { scope: "/" });
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_URL);
    if (!reg) return null;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

async function callFunction(body: Record<string, unknown>) {
  const { error } = await supabase.functions.invoke("push-subscribe", { body });
  if (error) throw new Error(error.message);
}

/** Slår på notiser och registrerar de tävlingar som ska bevakas. */
export async function enablePushReminders(competitionKeys: string[]): Promise<void> {
  if (!pushSupported()) throw new Error("Din webbläsare stödjer inte push-notiser.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Du behöver tillåta notiser i webbläsaren.");

  const reg = await registration();
  await navigator.serviceWorker.ready;

  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    }));

  await callFunction({
    action: "subscribe",
    endpoint: sub.endpoint,
    p256dh: keyToBase64(sub.getKey("p256dh")),
    auth: keyToBase64(sub.getKey("auth")),
    competitionKeys,
  });
}

/** Uppdaterar bevakningslistan om användaren ändrar sina favoriter. */
export async function syncPushCompetitions(competitionKeys: string[]): Promise<void> {
  const sub = await getExistingSubscription();
  if (!sub) return;
  await callFunction({ action: "sync", endpoint: sub.endpoint, competitionKeys });
}

/** Stänger av notiser helt för den här webbläsaren. */
export async function disablePushReminders(): Promise<void> {
  const sub = await getExistingSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe().catch(() => undefined);
  await callFunction({ action: "unsubscribe", endpoint });
}
