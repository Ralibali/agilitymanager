/**
 * Renderar en QR-kod till en PNG dataURL genom att montera qrcode.react's
 * QRCodeCanvas i ett offscreen-element. Lättviktigt — återanvänder ett
 * beroende som redan finns i projektet (qrcode.react), inget nytt paket.
 */
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { QRCodeCanvas } from "qrcode.react";

export async function makeQrDataUrl(value: string, size = 256): Promise<string> {
  if (typeof document === "undefined") return "";
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.setAttribute("aria-hidden", "true");
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(
    createElement(QRCodeCanvas, {
      value,
      size,
      level: "M",
      includeMargin: true,
      // hög kontrast så det scannar även i tryck
      fgColor: "#000000",
      bgColor: "#ffffff",
    }),
  );

  // Vänta två animation frames så React har hunnit rita canvasen.
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  const canvas = container.querySelector("canvas") as HTMLCanvasElement | null;
  let dataUrl = "";
  try {
    dataUrl = canvas?.toDataURL("image/png") ?? "";
  } finally {
    try { root.unmount(); } catch { /* ignore */ }
    container.remove();
  }
  return dataUrl;
}
