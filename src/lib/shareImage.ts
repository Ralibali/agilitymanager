/**
 * Genererar en delningsbar bild (1080×1350, Instagram-story-vänligt format)
 * med AgilityManager-branding för antingen tävlingsresultat eller bana.
 *
 * - Använder Canvas API (ingen tung dependency).
 * - Fungerar offline.
 * - Försöker dela via Web Share API (mobil), fallback = ladda ner som PNG.
 */

const W = 1080;
const H = 1350;

const BG_DARK = "#0F1712";
const BG_GRAD_END = "#1A2620";
const ACCENT = "#C85D1E"; // coral / brand secondary
const FG = "#F6F2EA";
const FG_DIM = "rgba(246, 242, 234, 0.65)";
const FG_FAINT = "rgba(246, 242, 234, 0.35)";

function makeCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context saknas");
  return { canvas, ctx };
}

function drawBackground(ctx: CanvasRenderingContext2D) {
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, BG_DARK);
  grad.addColorStop(1, BG_GRAD_END);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // diskret rutmönster
  ctx.strokeStyle = "rgba(246, 242, 234, 0.04)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // accent-cirkel uppe till höger
  const r = 280;
  const radial = ctx.createRadialGradient(W - 100, 120, 20, W - 100, 120, r);
  radial.addColorStop(0, "rgba(200, 93, 30, 0.35)");
  radial.addColorStop(1, "rgba(200, 93, 30, 0)");
  ctx.fillStyle = radial;
  ctx.fillRect(W - 400, -100, 500, 500);
}

function drawHeader(ctx: CanvasRenderingContext2D) {
  // Logotyp-mark (enkel agility-båge)
  ctx.save();
  ctx.translate(80, 90);
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 36);
  ctx.quadraticCurveTo(28, 0, 56, 36);
  ctx.stroke();
  ctx.fillStyle = ACCENT;
  ctx.fillRect(-2, 32, 6, 14);
  ctx.fillRect(52, 32, 6, 14);
  ctx.restore();

  ctx.fillStyle = FG;
  ctx.font = "600 32px 'Urbanist', system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("AgilityManager", 160, 118);
}

function drawFooter(ctx: CanvasRenderingContext2D, label: string, showWatermark: boolean) {
  ctx.fillStyle = FG_FAINT;
  ctx.font = "500 24px 'Urbanist', system-ui, sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(label, 80, H - 80);

  if (!showWatermark) {
    ctx.textAlign = "left";
    return;
  }

  // Viralt vattenmärke: alltid inbränt i canvasen så det följer med filen
  // även när den sparas, delas vidare eller croppas för sociala medier.
  // ~55% opacitet + medium storlek räcker för att bilden ska tåla nerskalning
  // till FB/Instagram-thumbnail utan att bli oläslig.
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = FG;
  ctx.font = "600 22px 'Urbanist', system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("agilitymanager.se · Gratis banplanerare", W - 80, H - 80);
  ctx.restore();
  ctx.textAlign = "left";
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export type ResultShareData = {
  dogName: string;
  eventName: string;
  date: string; // visningsformat, t.ex. "8 juni 2026"
  discipline: string; // "Agility · Kl 2"
  placement?: number | null;
  timeSec?: number | null;
  faults?: number | null;
  passed?: boolean;
  disqualified?: boolean;
};

export function renderResultImage(data: ResultShareData): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas();
  drawBackground(ctx);
  drawHeader(ctx);

  // Eyebrow
  ctx.fillStyle = ACCENT;
  ctx.font = "600 22px 'Urbanist', system-ui, sans-serif";
  ctx.fillText("TÄVLINGSRESULTAT", 80, 260);

  // Event title
  ctx.fillStyle = FG;
  ctx.font = "700 60px 'Urbanist', system-ui, sans-serif";
  const titleLines = wrap(ctx, data.eventName, W - 160).slice(0, 2);
  let y = 320;
  for (const line of titleLines) {
    ctx.fillText(line, 80, y);
    y += 72;
  }

  // Meta
  ctx.fillStyle = FG_DIM;
  ctx.font = "500 28px 'Urbanist', system-ui, sans-serif";
  ctx.fillText(`${data.dogName} · ${data.discipline}`, 80, y + 10);
  ctx.fillText(data.date, 80, y + 50);

  // Stora KPI:er
  const boxTop = 700;
  const boxH = 360;
  ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  const r = 32;
  ctx.beginPath();
  ctx.roundRect(80, boxTop, W - 160, boxH, r);
  ctx.fill();
  ctx.stroke();

  const cellW = (W - 160) / 3;
  const kpi = [
    {
      label: "Placering",
      value: data.disqualified ? "DISK" : data.placement != null ? String(data.placement) : "—",
    },
    { label: "Tid", value: data.timeSec != null ? `${data.timeSec.toFixed(2)}s` : "—" },
    { label: "Fel", value: data.faults != null ? String(data.faults) : "—" },
  ];

  ctx.textAlign = "center";
  kpi.forEach((k, i) => {
    const cx = 80 + cellW * i + cellW / 2;
    ctx.fillStyle = FG_DIM;
    ctx.font = "500 22px 'Urbanist', system-ui, sans-serif";
    ctx.fillText(k.label.toUpperCase(), cx, boxTop + 90);

    ctx.fillStyle = i === 0 && !data.disqualified && data.placement && data.placement <= 3 ? ACCENT : FG;
    ctx.font = "700 110px 'Urbanist', system-ui, sans-serif";
    ctx.fillText(k.value, cx, boxTop + 230);
  });
  ctx.textAlign = "left";

  // Status badge
  const status = data.disqualified ? "Diskvalificerad" : data.passed ? "Godkänd" : "Underkänd";
  const statusColor = data.disqualified
    ? "rgba(220, 80, 60, 0.85)"
    : data.passed
      ? "rgba(80, 180, 120, 0.85)"
      : "rgba(180, 140, 60, 0.85)";
  ctx.fillStyle = statusColor;
  ctx.font = "600 24px 'Urbanist', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(status, W / 2, boxTop + boxH + 60);
  ctx.textAlign = "left";

  drawFooter(ctx, "Träna · Tävla · Följ utvecklingen");
  return canvas;
}

export type CourseShareData = {
  courseName: string;
  sport: string; // "agility" | "hoopers"
  sizeClass?: string | null;
  classTemplate?: string | null;
  obstacleCount: number;
  obstacles?: Array<{ x: number; y: number; number?: number | null }>;
  ringMeters?: { width: number; height: number };
};

export function renderCourseImage(data: CourseShareData): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas();
  drawBackground(ctx);
  drawHeader(ctx);

  ctx.fillStyle = ACCENT;
  ctx.font = "600 22px 'Urbanist', system-ui, sans-serif";
  ctx.fillText("BANA", 80, 260);

  ctx.fillStyle = FG;
  ctx.font = "700 56px 'Urbanist', system-ui, sans-serif";
  const titleLines = wrap(ctx, data.courseName || "Ny bana", W - 160).slice(0, 2);
  let y = 320;
  for (const line of titleLines) {
    ctx.fillText(line, 80, y);
    y += 68;
  }

  ctx.fillStyle = FG_DIM;
  ctx.font = "500 28px 'Urbanist', system-ui, sans-serif";
  const sportLabel = data.sport === "hoopers" ? "Hoopers" : "Agility";
  const meta = [sportLabel, data.classTemplate, data.sizeClass].filter(Boolean).join(" · ");
  ctx.fillText(meta || sportLabel, 80, y + 10);
  ctx.fillText(`${data.obstacleCount} hinder`, 80, y + 50);

  // Bana-preview
  const padX = 80;
  const previewTop = 720;
  const previewH = 460;
  const previewW = W - padX * 2;

  ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(padX, previewTop, previewW, previewH, 32);
  ctx.fill();
  ctx.stroke();

  if (data.obstacles && data.obstacles.length > 0 && data.ringMeters) {
    const innerPad = 50;
    const innerW = previewW - innerPad * 2;
    const innerH = previewH - innerPad * 2;
    const scale = Math.min(innerW / data.ringMeters.width, innerH / data.ringMeters.height);
    const drawW = data.ringMeters.width * scale;
    const drawH = data.ringMeters.height * scale;
    const offsetX = padX + (previewW - drawW) / 2;
    const offsetY = previewTop + (previewH - drawH) / 2;

    // Ring outline
    ctx.strokeStyle = "rgba(246, 242, 234, 0.15)";
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, drawW, drawH);

    const numbered = data.obstacles
      .filter((o) => typeof o.number === "number" && o.number! > 0)
      .sort((a, b) => (a.number ?? 0) - (b.number ?? 0));

    if (numbered.length >= 2) {
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 3;
      ctx.beginPath();
      numbered.forEach((o, i) => {
        const px = offsetX + o.x * scale;
        const py = offsetY + o.y * scale;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }

    for (const o of data.obstacles) {
      const px = offsetX + o.x * scale;
      const py = offsetY + o.y * scale;
      ctx.fillStyle = FG;
      ctx.beginPath();
      ctx.arc(px, py, 12, 0, Math.PI * 2);
      ctx.fill();
      if (typeof o.number === "number" && o.number > 0) {
        ctx.fillStyle = BG_DARK;
        ctx.font = "700 16px 'Urbanist', system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(o.number), px, py + 1);
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
      }
    }
  } else {
    ctx.fillStyle = FG_FAINT;
    ctx.font = "500 24px 'Urbanist', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Ingen banpreview tillgänglig", W / 2, previewTop + previewH / 2);
    ctx.textAlign = "left";
  }

  drawFooter(ctx, "Skapad i AgilityManager");
  return canvas;
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Kunde inte skapa bild"));
    }, "image/png");
  });
}

export async function shareCanvas(canvas: HTMLCanvasElement, filename: string, title: string): Promise<"shared" | "downloaded"> {
  const blob = await canvasToBlob(canvas);
  const file = new File([blob], filename, { type: "image/png" });

  type NavigatorWithCanShare = Navigator & { canShare?: (data: ShareData) => boolean };
  const nav = navigator as NavigatorWithCanShare;

  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title });
      return "shared";
    } catch (err) {
      // Användaren avbröt — fall igenom till download
      if ((err as DOMException)?.name === "AbortError") return "shared";
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
