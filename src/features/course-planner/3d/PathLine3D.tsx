import * as THREE from "three";
import { useMemo } from "react";
import { map2DTo3D } from "./coordinateMapping";

type Path = { id: string; points: { x: number; y: number }[]; color?: string };

export function PathLine3D({ paths, widthMeters, heightMeters }: { paths: Path[]; widthMeters: number; heightMeters: number }) {
  const lines = useMemo(() => {
    return paths.filter((p) => p.points.length > 1).map((p) => {
      const verts: number[] = [];
      for (const pt of p.points) {
        const m = map2DTo3D(pt.x, pt.y, widthMeters, heightMeters);
        verts.push(m.x, 0.05, m.z);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
      const material = new THREE.LineBasicMaterial({ color: p.color || "#e74b4b" });
      return { id: p.id, object: new THREE.Line(geometry, material) };
    });
  }, [paths, widthMeters, heightMeters]);

  return (
    <group>
      {lines.map((l) => (
        <primitive key={l.id} object={l.object} />
      ))}
    </group>
  );
}
