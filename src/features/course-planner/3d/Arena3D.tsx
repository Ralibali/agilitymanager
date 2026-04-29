import * as THREE from "three";
import { useMemo } from "react";

type Props = { widthMeters: number; heightMeters: number; wallHeight?: number; showGrid?: boolean };

export function Arena3D({ widthMeters, heightMeters, wallHeight = 3, showGrid = true }: Props) {
  const turfTexture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#5fa14a";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const shade = 60 + Math.random() * 60;
      ctx.fillStyle = `rgba(${shade - 30},${shade + 30},${shade - 20},0.55)`;
      ctx.fillRect(x, y, 1, Math.random() > 0.5 ? 2 : 1);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(Math.max(2, widthMeters / 2), Math.max(2, heightMeters / 2));
    return tex;
  }, [widthMeters, heightMeters]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[widthMeters, heightMeters]} />
        <meshStandardMaterial map={turfTexture} />
      </mesh>
      {showGrid && (
        <gridHelper
          args={[Math.max(widthMeters, heightMeters), Math.max(widthMeters, heightMeters), "#ffffff", "#a8c79a"]}
          position={[0, 0.01, 0]}
        />
      )}
      {[
        { pos: [0, wallHeight / 2, -heightMeters / 2 - 0.05] as [number, number, number], size: [widthMeters + 1, wallHeight, 0.1] as [number, number, number] },
        { pos: [0, wallHeight / 2, heightMeters / 2 + 0.05] as [number, number, number], size: [widthMeters + 1, wallHeight, 0.1] as [number, number, number] },
        { pos: [-widthMeters / 2 - 0.05, wallHeight / 2, 0] as [number, number, number], size: [0.1, wallHeight, heightMeters + 1] as [number, number, number] },
        { pos: [widthMeters / 2 + 0.05, wallHeight / 2, 0] as [number, number, number], size: [0.1, wallHeight, heightMeters + 1] as [number, number, number] },
      ].map((wall, i) => (
        <mesh key={i} position={wall.pos} receiveShadow>
          <boxGeometry args={wall.size} />
          <meshStandardMaterial color="#f0ece2" />
        </mesh>
      ))}
      <ambientLight intensity={0.6} />
      <hemisphereLight args={["#ffffff", "#3d6a2a", 0.6]} />
      <directionalLight position={[widthMeters / 2, wallHeight + 5, heightMeters / 2]} intensity={1.1} />
      <directionalLight position={[-widthMeters / 2, wallHeight + 5, -heightMeters / 2]} intensity={0.5} />
    </group>
  );
}
