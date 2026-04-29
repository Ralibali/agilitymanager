import * as THREE from "three";
import { useMemo } from "react";
import { map2DTo3D } from "./coordinateMapping";

type Point = { x: number; y: number };
type Path = { id: string; points: Point[]; color?: string };

export function PathLine3D({
  paths,
  widthMeters,
  heightMeters,
}: {
  paths: Path[];
  widthMeters: number;
  heightMeters: number;
}) {
  const lines = useMemo(() => {
    return paths
      .filter((p) => p.points.length > 1)
      .map((p) => {
        const verts: number[] = [];
        for (const pt of p.points) {
          const m = map2DTo3D(pt.x, pt.y, widthMeters, heightMeters);
          verts.push(m.x, 0.04, m.z);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
        return { id: p.id, geometry, color: p.color || "#e74b4b" };
      });
  }, [paths, widthMeters, heightMeters]);

  return (
    <group>
      {lines.map((l) => (
        <line key={l.id}>
          {/* @ts-expect-error drei/three primitive child */}
          <bufferGeometry attach="geometry" {...l.geometry} />
          <lineBasicMaterial color={l.color} linewidth={3} />
        </line>
      ))}
    </group>
  );
}
