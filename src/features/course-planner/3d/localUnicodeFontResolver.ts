/** Native-only replacement for Troika's CDN-backed unicode font resolver.
 * The factory is serialized into its worker, so it has no module dependencies.
 * Missing glyphs use the packaged font's missing-glyph marker without fetching
 * a font catalog or sending the text to another service.
 */
export default function localUnicodeFontResolverFactory() {
  return {
    getFontsForString(text: string, options: { dataUrl?: string } = {}) {
      try {
        if (!options.dataUrl) throw new Error("A packaged fallback font is required.");
        const current = new URL(self.location.href);
        const owner = current.protocol === "blob:" ? new URL(current.pathname) : current;
        const font = new URL(options.dataUrl, owner);
        if (font.protocol !== owner.protocol || font.host !== owner.host) {
          throw new Error("The fallback font must be packaged with the app.");
        }
        return Promise.resolve({ fontUrls: [font.href], chars: new Uint8Array(text.length) });
      } catch (error) {
        return Promise.reject(error);
      }
    },
  };
}
