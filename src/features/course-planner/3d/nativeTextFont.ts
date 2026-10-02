import archivoFontUrl from "./fonts/Archivo.ttf?url";
import { configureTextBuilder } from "troika-three-text/src/TextBuilder.js";

const IS_NATIVE_APP = import.meta.env.VITE_NATIVE_APP === "true";

/** Undefined preserves the website's existing font selection. */
export const nativeTextFont = IS_NATIVE_APP ? archivoFontUrl : undefined;

if (IS_NATIVE_APP) {
  // The worker needs an absolute URL for the packaged font. The native build
  // aliases Troika's unicode resolver to our local-only fallback factory.
  const fontUrl = new URL(archivoFontUrl, window.location.href).href;
  configureTextBuilder({ defaultFontURL: fontUrl, unicodeFontsURL: fontUrl });
}
