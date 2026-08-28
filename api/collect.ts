/**
 * First-party collect. Ackar tysta events. Ingen tredjepart, ingen persistens här.
 * Kroppen är text/plain så sendBeacon inte triggar preflight.
 */

const ALLOWED = new Set(["arrive", "planner_used", "share", "auth"]);

function readBody(req: { on: (ev: string, cb: (c: unknown) => void) => void }): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(String(c))));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export default async function handler(
  req: { method?: string; on: (ev: string, cb: (c: unknown) => void) => void },
  res: { statusCode: number; setHeader: (k: string, v: string) => void; end: (b?: string) => void },
) {
  res.setHeader("cache-control", "no-store");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end();
    return;
  }

  try {
    const raw = await readBody(req);
    const parsed = JSON.parse(raw) as { event?: unknown };
    if (typeof parsed?.event !== "string" || !ALLOWED.has(parsed.event)) {
      res.statusCode = 204;
      res.end();
      return;
    }
  } catch {
    /* ogiltig kropp — ändå 204 så klienten aldrig retrysar synligt */
  }

  res.statusCode = 204;
  res.end();
}
