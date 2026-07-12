/**
 * Rena gesture-helpers (client-space) för pinch/pan.
 *
 * Ingen DOM- eller React-koppling. Kompletterar `gestureMath.ts` med en
 * `computePinchGesture(previous, current)` som returnerar både skala och
 * pan-delta i ett enda anrop — bekvämt för pointermove-hanteraren.
 */

export interface ClientPt {
  clientX: number;
  clientY: number;
}

/** Euklidiskt avstånd i client-pixlar. */
export function distance(a: ClientPt, b: ClientPt): number {
  return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
}

/** Midpoint i client-pixlar. */
export function midpoint(a: ClientPt, b: ClientPt): ClientPt {
  return {
    clientX: (a.clientX + b.clientX) / 2,
    clientY: (a.clientY + b.clientY) / 2,
  };
}

export interface PinchGesture {
  /** Skalfaktor (curr.dist / prev.dist). 1 = ingen zoom. */
  scale: number;
  /** Pan-delta i client-pixlar mellan midpoints. */
  panPx: { dxPx: number; dyPx: number };
  /** Aktuell midpoint — används som anchor för zoomen. */
  midClient: ClientPt;
}

/**
 * Räkna ut pinch-scale + pan-delta mellan två pointer-par.
 * `previous`/`current` = [pointerA, pointerB] i client-koord.
 *
 * Om previous-fingrarna är i samma punkt (dist~0) blir scale=1 för att
 * undvika NaN/oändlighet.
 */
export function computePinchGesture(
  previous: [ClientPt, ClientPt],
  current: [ClientPt, ClientPt],
): PinchGesture {
  const dPrev = distance(previous[0], previous[1]);
  const dCurr = distance(current[0], current[1]);
  const scale = dPrev < 1e-3 ? 1 : dCurr / dPrev;
  const mPrev = midpoint(previous[0], previous[1]);
  const mCurr = midpoint(current[0], current[1]);
  return {
    scale,
    panPx: {
      dxPx: mCurr.clientX - mPrev.clientX,
      dyPx: mCurr.clientY - mPrev.clientY,
    },
    midClient: mCurr,
  };
}
