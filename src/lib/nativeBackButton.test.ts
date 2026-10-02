import { afterEach, describe, expect, it, vi } from "vitest";
import { closeOverlayOnEscape, dismissNativeOverlay } from "./nativeBackButton";

class TestKeyboardEvent extends Event {
  readonly key: string;
  readonly code: string;
  constructor(type: string, init: KeyboardEventInit) {
    super(type, init);
    this.key = init.key ?? "";
    this.code = init.code ?? "";
  }
}

class Overlay extends EventTarget {
  readonly rectangles: number;
  readonly visibility: string;
  readonly ariaHidden: boolean;
  constructor(rectangles = 1, visibility = "visible", ariaHidden = false) {
    super();
    this.rectangles = rectangles;
    this.visibility = visibility;
    this.ariaHidden = ariaHidden;
  }
  getClientRects() { return { length: this.rectangles }; }
  getAttribute(name: string) { return name === "aria-hidden" && this.ariaHidden ? "true" : null; }
}

function installOverlays(overlays: Overlay[]) {
  vi.stubGlobal("document", { querySelectorAll: () => overlays });
  vi.stubGlobal("getComputedStyle", (overlay: Overlay) => ({ visibility: overlay.visibility }));
  vi.stubGlobal("KeyboardEvent", TestKeyboardEvent);
}

afterEach(() => vi.unstubAllGlobals());

describe("native Back with overlays", () => {
  it("leaves navigation available when there is no visible overlay", () => {
    installOverlays([]);
    expect(dismissNativeOverlay()).toBe(false);
    installOverlays([new Overlay(0), new Overlay(1, "hidden"), new Overlay(1, "visible", true)]);
    expect(dismissNativeOverlay()).toBe(false);
  });

  it("closes a custom error/loading overlay through a cancellable Escape event", () => {
    const hidden = new Overlay(0);
    const visible = new Overlay();
    const close = vi.fn();
    visible.addEventListener("keydown", (event) => {
      const keyboard = event as TestKeyboardEvent;
      expect(keyboard.key).toBe("Escape");
      expect(keyboard.code).toBe("Escape");
      expect(keyboard.bubbles).toBe(true);
      expect(keyboard.cancelable).toBe(true);
      closeOverlayOnEscape(keyboard, close);
      expect(keyboard.defaultPrevented).toBe(true);
    });
    installOverlays([hidden, visible]);
    expect(dismissNativeOverlay()).toBe(true);
    expect(close).toHaveBeenCalledOnce();
  });

  it("keeps other keys available to the overlay", () => {
    const close = vi.fn();
    const event = { key: "Enter", preventDefault: vi.fn(), stopPropagation: vi.fn() };
    closeOverlayOnEscape(event, close);
    expect(close).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.stopPropagation).not.toHaveBeenCalled();
  });
});
