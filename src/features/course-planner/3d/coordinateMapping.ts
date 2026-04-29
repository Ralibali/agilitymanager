// Maps 2D planner coords (0-100 percent) to 3D meters in the arena.
export function map2DTo3D(xPercent: number, yPercent: number, widthMeters: number, heightMeters: number) {
  return {
    x: (xPercent / 100 - 0.5) * widthMeters,
    z: (yPercent / 100 - 0.5) * heightMeters,
    y: 0,
  };
}

export function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}
