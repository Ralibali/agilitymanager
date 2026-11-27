/**
 * Bangeneratorn i en egen tråd, så att planeraren aldrig fryser medan
 * generatorn provar banor (det tar oftast några hundra millisekunder, men
 * kan ta längre på en långsam mobil).
 */
import { generateCourse, type GenerateOptions } from "./generator";

interface WorkerRequest { id: number; opts: GenerateOptions }

const scope = self as unknown as {
  onmessage: ((e: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: (message: unknown) => void;
};

scope.onmessage = (e) => {
  const { id, opts } = e.data;
  try {
    scope.postMessage({ id, result: generateCourse(opts) });
  } catch (err) {
    scope.postMessage({ id, result: null, error: err instanceof Error ? err.message : String(err) });
  }
};
