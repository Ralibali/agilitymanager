type EscapeEvent = Pick<KeyboardEvent, "key" | "preventDefault" | "stopPropagation">;

/** Shared by custom overlays that do not use Radix's Escape handling. */
export function closeOverlayOnEscape(event: EscapeEvent, close: () => void): void {
  if (event.key !== "Escape") return;
  event.preventDefault();
  event.stopPropagation();
  close();
}

/** Let an open overlay handle Back before changing the router's history. */
export function dismissNativeOverlay(): boolean {
  const overlay = [...document.querySelectorAll<HTMLElement>('[role="dialog"], [role="alertdialog"], [role="menu"]')]
    .find(element => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden" && element.getAttribute("aria-hidden") !== "true");
  if (!overlay) return false;
  overlay.dispatchEvent(new KeyboardEvent("keydown", {
    key: "Escape", code: "Escape", bubbles: true, cancelable: true,
  }));
  return true;
}
