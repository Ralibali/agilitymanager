import * as THREE from "three";
import { useMemo } from "react";

type Props = { widthMeters: number; heightMeters: number; wallHeight?: number; showGrid?: boolean };

/**
 * Generates a richer artificial-turf texture with multiple grass shades,
 * subtle directional fibers, and dirt flecks. Repeats per square meter.
 */
function makeTurfTexture(widthMeters: number, heightMeters: number) {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createRadialGradient(256, 256, 60, 256, 256, 360);
  grad.addColorStop(0, "#6fab58");
  grad.addColorStop(1, "#4b843d");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 600; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = `rgba(60,40,20,${0.035 + Math.random() * 0.05})`;
    ctx.fillRect(x, y, 1, 1);
  }
  for (let i = 0; i < 12000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 95 + Math.random() * 90;
    const g = 145 + Math.random() * 80;
    const b = 70 + Math.random() * 55;
    const alpha = 0.24 + Math.random() * 0.35;
    ctx.strokeStyle = `rgba(${r | 0},${g | 0},${b | 0},${alpha})`;
    ctx.lineWidth = Math.random() < 0.9 ? 1 : 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 1.3, y - 1 - Math.random() * 2.2);
    ctx.stroke();
  }
  for (let i = 0; i < 1800; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = `rgba(220,240,170,${0.06 + Math.random() * 0.15})`;
    ctx.fillRect(x, y, 1, 1);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(Math.max(2, widthMeters / 2), Math.max(2, heightMeters / 2));
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function Arena3D({ widthMeters, heightMeters, wallHeight = 3.2, showGrid = true }: Props) {
  const turfTexture = useMemo(() => makeTurfTexture(widthMeters, heightMeters), [widthMeters, heightMeters]);
  const perimeterPoints = useMemo(() => {
    const w = widthMeters / 2;
    const h = heightMeters / 2;
    return new Float32Array([
      -w, 0.025, -h, w, 0.025, -h,
      w, 0.025, -h, w, 0.025, h,
      w, 0.025, h, -w, 0.025, h,
      -w, 0.025, h, -w, 0.025, -h,
    ]);
  }, [widthMeters, heightMeters]);

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[widthMeters, heightMeters]} />
        <meshStandardMaterial map={turfTexture} roughness={0.86} metalness={0} color="#ffffff" />
      </mesh>

      {/* Faint metric grid */}
      {showGrid && (
        <gridHelper
          args={[Math.max(widthMeters, heightMeters) * 1.03, Math.max(widthMeters, heightMeters), "#ffffff", "#d9edcf"]}
          position={[0, 0.03, 0]}
        >
          <meshBasicMaterial transparent opacity={0.25} depthWrite={false} />
        </gridHelper>
      )}

      {/* White perimeter line */}
      <lineSegments position={[0, 0, 0]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[perimeterPoints, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.78} />
      </lineSegments>

      {/* Walls — light indoor hall, not a dark box */}
      {[
        { pos: [0, wallHeight / 2, -heightMeters / 2 - 0.05] as [number, number, number], size: [widthMeters + 1, wallHeight, 0.1] as [number, number, number] },
        { pos: [0, wallHeight / 2, heightMeters / 2 + 0.05] as [number, number, number], size: [widthMeters + 1, wallHeight, 0.1] as [number, number, number] },
        { pos: [-widthMeters / 2 - 0.05, wallHeight / 2, 0] as [number, number, number], size: [0.1, wallHeight, heightMeters + 1] as [number, number, number] },
        { pos: [widthMeters / 2 + 0.05, wallHeight / 2, 0] as [number, number, number], size: [0.1, wallHeight, heightMeters + 1] as [number, number, number] },
      ].map((wall, i) => (
        <group key={i}>
          <mesh position={wall.pos} receiveShadow>
            <boxGeometry args={wall.size} />
            <meshStandardMaterial color="#f5f1e8" roughness={0.72} metalness={0} />
          </mesh>
          <mesh position={[wall.pos[0], 0.16, wall.pos[2]]} receiveShadow>
            <boxGeometry args={[wall.size[0] + 0.02, 0.32, wall.size[2] + 0.02]} />
            <meshStandardMaterial color="#6d756b" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Bright open ceiling beams instead of a black ceiling plane */}
      {[-0.35, 0, 0.35].map((offset) => (
        <mesh key={offset} position={[0, wallHeight + 0.45, offset * heightMeters]} receiveShadow>
          <boxGeometry args={[widthMeters + 1, 0.08, 0.12]} />
          <meshStandardMaterial color="#e6e1d8" roughness={0.7} />
        </mesh>
      ))}

      {/* Lighting: much brighter, premium indoor hall */}
      <ambientLight intensity={1.05} />
      <hemisphereLight args={["#fff7e5", "#5a7e45", 1.15]} />
      <directionalLight position={[widthMeters / 2, wallHeight + 7, heightMeters / 2]} intensity={1.25} color="#fff2d6" />
      <directionalLight position={[-widthMeters / 2, wallHeight + 5, -heightMeters / 2]} intensity={0.8} color="#eef5ff" />
      <pointLight position={[0, wallHeight + 2, 0]} intensity={0.9} distance={Math.max(widthMeters, heightMeters) * 1.5} color="#ffffff" />
    </group>
  );
}
