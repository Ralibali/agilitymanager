export function map2DTo3D(xPercent: number, yPercent: number, widthMeters: number, heightMeters: number) {
  return {
    x: (xPercent / 100 - 0.5) * widthMeters,
    z: (yPercent / 100 - 0.5) * heightMeters,
    y: 0,
  };
}
