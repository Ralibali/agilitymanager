/**
 * Rena gesture-helpers för banplanerarens pointer-hantering.
 *
 * Ingen DOM-referens, ingen React — bara vektormattematik som är enkel att
 * enhetstesta. Pinch/mid-point används av canvas-pointerhandlarna för att
 * ankra tvåfingerzoom.
 */

export interface ClientPoint {
  clientX: number;
  clientY: number;
}

export interface PinchSample {
  /** Skärmspunkt (client-coord) mellan de två fingrarna. */
  mid: { clientX: number; clientY: number };
  /** Avstånd mellan fingrarna i client-pixlar. */
  dist: number;
}

/** Beräkna midpoint och avstånd mellan två pointers i client-pixlar. */
export function pinchSample(a: ClientPoint, b: ClientPoint): PinchSample {
  return {
    mid: {
      clientX: (a.clientX + b.clientX) / 2,
      clientY: (a.clientY + b.clientY) / 2,
    },
    dist: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY),
  };
}

/**
 * Beräkna zoomfaktor mellan två pinch-sampels. Om start-avståndet är ~0
 * returneras 1 (undvik division-by-zero).
 */
export function pinchScale(start: PinchSample, current: PinchSample): number {
  if (start.dist < 1e-3) return 1;
  return current.dist / start.dist;
}

/**
 * Beräkna pan-delta i client-pixlar mellan två pinch-mittpunkter.
 * Positivt värde = fingrarna har flyttats åt höger/ner.
 */
export function pinchPanDelta(
  start: PinchSample,
  current: PinchSample,
): { dxPx: number; dyPx: number } {
  return {
    dxPx: current.mid.clientX - start.mid.clientX,
    dyPx: current.mid.clientY - start.mid.clientY,
  };
}
