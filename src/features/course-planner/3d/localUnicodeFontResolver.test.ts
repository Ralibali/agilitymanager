import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import localUnicodeFontResolverFactory from "./localUnicodeFontResolver";

const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockClear();
  vi.stubGlobal("self", { location: { href: "blob:http://localhost:3001/font-worker" } });
});
afterEach(() => vi.unstubAllGlobals());

describe("packaged 3D font fallback", () => {
  it("resolves Swedish and unsupported characters to the packaged font without network calls", async () => {
    const text = "MÅL · 123 åäö 🐕";
    const font = "http://localhost:3001/assets/Archivo-bundled.ttf";
    const result = await localUnicodeFontResolverFactory().getFontsForString(text, { dataUrl: font });
    expect(result.fontUrls).toEqual([font]);
    expect(Array.from(result.chars)).toEqual(Array(text.length).fill(0));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("supports an iOS WebView worker and its packaged custom-scheme URL", async () => {
    vi.stubGlobal("self", { location: { href: "blob:capacitor://localhost/font-worker" } });
    const font = "capacitor://localhost/assets/Archivo-bundled.ttf";
    expect((await localUnicodeFontResolverFactory().getFontsForString("Å", { dataUrl: font })).fontUrls).toEqual([font]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an external fallback URL before making a request", async () => {
    await expect(localUnicodeFontResolverFactory().getFontsForString("Å", {
      dataUrl: "https://cdn.example.com/Archivo.ttf",
    })).rejects.toThrow(/packaged/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects missing configuration instead of falling back to a CDN", async () => {
    await expect(localUnicodeFontResolverFactory().getFontsForString("Å")).rejects.toThrow(/required/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
