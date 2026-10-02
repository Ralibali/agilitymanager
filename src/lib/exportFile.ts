import { Capacitor } from "@capacitor/core";

export function isExportCancelled(error: unknown): boolean {
  return typeof error === "object" && error !== null && "message" in error && error.message === "Share canceled";
}

/** Keep a user supplied name inside the export directory on every platform. */
export function safeExportFileName(filename: string): string {
  const basename = filename.replace(/\\/g, "/").split("/").pop() ?? "";
  const cleaned = basename
    .normalize("NFC")
    // eslint-disable-next-line no-control-regex -- Strip invalid filename control characters.
    .replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "_")
    .replace(/^\.+/, "")
    .replace(/[.\s]+$/, "")
    .trim();
  if (!cleaned) return "agilitymanager-export";
  const extension = cleaned.match(/\.[a-z0-9]{1,10}$/i)?.[0] ?? "";
  const stem = extension ? cleaned.slice(0, -extension.length) : cleaned;
  return stem.slice(0, 180 - extension.length) + extension;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  // Chunking avoids the argument limit for PDF and PNG exports.
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768));
  }
  return btoa(binary);
}

/** Download in a browser, or offer the device's Save/Share sheet in a mobile app. */
export async function exportFile(blob: Blob, filename: string): Promise<void> {
  const name = safeExportFileName(filename);
  if (!Capacitor.isNativePlatform()) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    try {
      document.body.appendChild(anchor);
      anchor.click();
    } finally {
      anchor.remove();
      // Give the browser time to start reading the URL before releasing it.
      window.setTimeout(() => URL.revokeObjectURL(url), 4_000);
    }
    return;
  }

  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
  ]);
  const exportId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const { uri } = await Filesystem.writeFile({
    path: `export-temp/${exportId}/${name}`,
    data: await blobToBase64(blob),
    directory: Directory.Cache,
    recursive: true,
  });
  // Keep the cached file available: a recipient may read it after Share resolves.
  await Share.share({ files: [uri], title: name, dialogTitle: "Spara eller dela fil" });
}
