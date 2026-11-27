/**
 * Kör bangeneratorn i en Web Worker när det går, annars i huvudtråden
 * (efter en paus så att laddningsindikatorn hinner ritas).
 */
import { generateCourse, type GenerateOptions, type GeneratedCourse } from "./generator";

let worker: Worker | null = null;
let workerBroken = false;
let nextId = 1;
const pending = new Map<number, (result: GeneratedCourse | null) => void>();

function getWorker(): Worker | null {
  if (workerBroken || typeof Worker === "undefined") return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL("./generator.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<{ id: number; result: GeneratedCourse | null }>) => {
      const resolve = pending.get(e.data.id);
      pending.delete(e.data.id);
      resolve?.(e.data.result);
    };
    worker.onerror = () => {
      // Workern gick inte att starta (t.ex. strikt CSP) — kör i huvudtråden.
      workerBroken = true;
      worker?.terminate();
      worker = null;
      const waiting = [...pending.entries()];
      pending.clear();
      for (const [, resolve] of waiting) resolve(null);
    };
    return worker;
  } catch {
    workerBroken = true;
    return null;
  }
}

async function runInline(opts: GenerateOptions): Promise<GeneratedCourse | null> {
  await new Promise((r) => setTimeout(r, 30));
  return generateCourse(opts);
}

export async function runGenerator(opts: GenerateOptions): Promise<GeneratedCourse | null> {
  const w = getWorker();
  if (!w) return runInline(opts);
  const id = nextId++;
  const result = await new Promise<GeneratedCourse | null | "fallback">((resolve) => {
    pending.set(id, resolve);
    try {
      w.postMessage({ id, opts });
    } catch {
      pending.delete(id);
      resolve("fallback");
    }
  });
  // Om workern dog under körningen provar vi en gång till i huvudtråden.
  if (result === "fallback" || (result === null && workerBroken)) return runInline(opts);
  return result;
}
