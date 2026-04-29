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
  // Base gradient — slightly warmer in one corner for natural variation
  const grad = ctx.createRadialGradient(256, 256, 60, 256, 256, 360);
  grad.addColorStop(0, "#5a9a48");
  grad.addColorStop(1, "#3f7a36");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Soil flecks
  for (let i = 0; i < 600; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = `rgba(60,40,20,${0.06 + Math.random() * 0.08})`;
    ctx.fillRect(x, y, 1, 1);
  }
  // Grass fibers — short directional strokes
  for (let i = 0; i < 14000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 90 + Math.random() * 90;
    const g = 130 + Math.random() * 90;
    const b = 60 + Math.random() * 50;
    const alpha = 0.35 + Math.random() * 0.4;
    ctx.strokeStyle = `rgba(${r | 0},${g | 0},${b | 0},${alpha})`;
    ctx.lineWidth = Math.random() < 0.85 ? 1 : 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const dx = (Math.random() - 0.5) * 1.4;
    const dy = -1 - Math.random() * 2.5;
    ctx.lineTo(x + dx, y + dy);
    ctx.stroke();
  }
  // Light highlights — tufts catching the light
  for (let i = 0; i < 1800; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = `rgba(200,230,160,${0.08 + Math.random() * 0.18})`;
    ctx.fillRect(x, y, 1, 1);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  // ~1 tile per 2 m for a natural look
  tex.repeat.set(Math.max(2, widthMeters / 2), Math.max(2, heightMeters / 2));
  tex.anisotropy = 8;
  return tex;
}

export function Arena3D({ widthMeters, heightMeters, wallHeight = 3.2, showGrid = true }: Props) {
  const turfTexture = useMemo(() => makeTurfTexture(widthMeters, heightMeters), [widthMeters, heightMeters]);

  // Subtle field perimeter line (sport-arena vibe)
  const perimeterPoints = useMemo(() => {
    const w = widthMeters / 2;
    const h = heightMeters / 2;
    return new Float32Array([
      -w, 0.011, -h, w, 0.011, -h,
      w, 0.011, -h, w, 0.011, h,
      w, 0.011, h, -w, 0.011, h,
      -w, 0.011, h, -w, 0.011, -h,
    ]);
  }, [widthMeters, heightMeters]);

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[widthMeters, heightMeters]} />
        <meshStandardMaterial map={turfTexture} roughness={0.95} metalness={0} />
      </mesh>

      {/* Faint metric grid */}
      {showGrid && (
        <gridHelper
          args={[Math.max(widthMeters, heightMeters) * 1.05, Math.max(widthMeters, heightMeters), "#ffffff", "#a8c79a"]}
          position={[0, 0.012, 0]}
        >
          <meshBasicMaterial transparent opacity={0.18} />
        </gridHelper>
      )}

      {/* White perimeter line */}
      <lineSegments position={[0, 0, 0]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[perimeterPoints, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.55} />
      </lineSegments>

      {/* Walls — slightly textured cream with darker base trim */}
      {[
        { pos: [0, wallHeight / 2, -heightMeters / 2 - 0.05] as [number, number, number], size: [widthMeters + 1, wallHeight, 0.1] as [number, number, number] },
        { pos: [0, wallHeight / 2, heightMeters / 2 + 0.05] as [number, number, number], size: [widthMeters + 1, wallHeight, 0.1] as [number, number, number] },
        { pos: [-widthMeters / 2 - 0.05, wallHeight / 2, 0] as [number, number, number], size: [0.1, wallHeight, heightMeters + 1] as [number, number, number] },
        { pos: [widthMeters / 2 + 0.05, wallHeight / 2, 0] as [number, number, number], size: [0.1, wallHeight, heightMeters + 1] as [number, number, number] },
      ].map((wall, i) => (
        <group key={i}>
          <mesh position={wall.pos} receiveShadow>
            <boxGeometry args={wall.size} />
            <meshStandardMaterial color="#f1ede3" roughness={0.85} />
          </mesh>
          {/* Dark trim along the floor */}
          <mesh position={[wall.pos[0], 0.18, wall.pos[2]]} receiveShadow>
            <boxGeometry args={[wall.size[0] + 0.02, 0.36, wall.size[2] + 0.02]} />
            <meshStandardMaterial color="#3a3a3a" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Hall ceiling — subtle, gives "indoor" feel without blocking sky lighting */}
      <mesh position={[0, wallHeight + 0.4, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[widthMeters + 2, heightMeters + 2]} />
        <meshStandardMaterial color="#1c1f23" roughness={1} side={THREE.DoubleSide} />
      </mesh>

      {/* Lighting */}
      <ambientLight intensity={0.45} />
      <hemisphereLight args={["#fff7e0", "#2d4f24", 0.7]} />
      {/* Two warm "ceiling" spots simulating hall lighting */}
      <directionalLight
        position={[widthMeters / 2, wallHeight + 4, heightMeters / 2]}
        intensity={0.9}
        color="#fff2d6"
      />
      <directionalLight
        position={[-widthMeters / 2, wallHeight + 4, -heightMeters / 2]}
        intensity={0.55}
        color="#dbe7ff"
      />
      {/* Soft fill light at handler eye level, helps walk mode */}
      <pointLight position={[0, 1.7, 0]} intensity={0.25} distance={Math.max(widthMeters, heightMeters)} color="#ffffff" />
    </group>
  );
}
