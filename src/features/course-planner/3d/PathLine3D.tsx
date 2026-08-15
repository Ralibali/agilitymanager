import { useMemo } from "react";
import * as THREE from "three";
import { map2DTo3D } from "./coordinateMapping";

type Path = { id: string; points: { x: number; y: number }[]; color?: string };

function PathLine({ path, widthMeters, heightMeters }: { path: Path; widthMeters: number; heightMeters: number }) {
  const positions = useMemo(() => {
    const verts: number[] = [];
    for (const pt of path.points) {
      const m = map2DTo3D(pt.x, pt.y, widthMeters, heightMeters);
      verts.push(m.x, 0.05, m.z);
    }
    return new Float32Array(verts);
  }, [path.points, widthMeters, heightMeters]);

  if (path.points.length < 2) return null;

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={positions.length / 3}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color={new THREE.Color(path.color || "#e74b4b")} />
    </line>
  );
}

export function PathLine3D({ paths, widthMeters, heightMeters }: { paths: Path[]; widthMeters: number; heightMeters: number }) {
  return (
    <group>
      {paths.map((path) => (
        <PathLine key={path.id} path={path} widthMeters={widthMeters} heightMeters={heightMeters} />
      ))}
    </group>
  );
}
