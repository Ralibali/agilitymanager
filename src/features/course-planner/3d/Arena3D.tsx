import * as THREE from "three";
import { useMemo } from "react";
import { Text } from "@react-three/drei";

type Props = { widthMeters: number; heightMeters: number; wallHeight?: number; showGrid?: boolean };

type WallAd = {
  text: string;
  sub?: string;
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  accent?: "green" | "navy" | "orange";
};

const BRAND_GREEN = "#173d2c";
const NAVY = "#20245f";
const ORANGE = "#e76f51";
const WALL = "#f5f1e8";
const WALL_TRIM = "#747b70";

function makeTurfTexture(widthMeters: number, heightMeters: number) {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;

  const grad = ctx.createRadialGradient(256, 256, 60, 256, 256, 360);
  grad.addColorStop(0, "#78b85f");
  grad.addColorStop(0.55, "#61a44d");
  grad.addColorStop(1, "#477e39");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 700; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = `rgba(55,38,20,${0.025 + Math.random() * 0.045})`;
    ctx.fillRect(x, y, 1, 1);
  }

  for (let i = 0; i < 14000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 90 + Math.random() * 95;
    const g = 138 + Math.random() * 88;
    const b = 60 + Math.random() * 62;
    const alpha = 0.22 + Math.random() * 0.36;
    ctx.strokeStyle = `rgba(${r | 0},${g | 0},${b | 0},${alpha})`;
    ctx.lineWidth = Math.random() < 0.9 ? 1 : 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 1.4, y - 1 - Math.random() * 2.4);
    ctx.stroke();
  }

  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = `rgba(225,245,174,${0.05 + Math.random() * 0.14})`;
    ctx.fillRect(x, y, 1, 1);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(Math.max(2, widthMeters / 2), Math.max(2, heightMeters / 2));
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function WallBanner({ text, sub, position, rotation, width, accent = "green" }: WallAd) {
  const accentColor = accent === "navy" ? NAVY : accent === "orange" ? ORANGE : BRAND_GREEN;
  const height = 0.82;
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, 0]} renderOrder={2}>
        <boxGeometry args={[width, height, 0.035]} />
        <meshStandardMaterial color="#fffaf0" roughness={0.68} metalness={0.03} />
      </mesh>
      <mesh position={[0, height / 2 - 0.05, 0.022]} renderOrder={3}>
        <boxGeometry args={[width, 0.1, 0.01]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>
      <mesh position={[-width / 2 + 0.23, 0, 0.024]} renderOrder={3}>
        <circleGeometry args={[0.19, 24]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>
      <Text
        position={[0.08, 0.09, 0.04]}
        fontSize={Math.min(0.22, width / 14)}
        color="#123025"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.004}
        outlineColor="#fffaf0"
        maxWidth={width - 0.85}
        textAlign="center"
        renderOrder={4}
      >
        {text}
      </Text>
      {sub && (
        <Text
          position={[0.08, -0.18, 0.04]}
          fontSize={Math.min(0.11, width / 24)}
          color="#5d665e"
          anchorX="center"
          anchorY="middle"
          maxWidth={width - 0.85}
          textAlign="center"
          renderOrder={4}
        >
          {sub}
        </Text>
      )}
    </group>
  );
}

function DimensionLabel({ text, position, rotation }: { text: string; position: [number, number, number]; rotation: [number, number, number] }) {
  return (
    <Text position={position} rotation={rotation} fontSize={0.36} color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.025} outlineColor="#31542b">
      {text}
    </Text>
  );
}

export function Arena3D({ widthMeters, heightMeters, wallHeight = 3.4, showGrid = true }: Props) {
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

  const ads = useMemo<WallAd[]>(() => {
    const longAdW = Math.min(7.2, Math.max(4.6, widthMeters / 4.4));
    const shortAdW = Math.min(5.2, Math.max(3.6, heightMeters / 5.2));
    const y = 1.78;
    const frontZ = -heightMeters / 2 - 0.105;
    const backZ = heightMeters / 2 + 0.105;
    const leftX = -widthMeters / 2 - 0.105;
    const rightX = widthMeters / 2 + 0.105;
    return [
      { text: "Agilitymanager", sub: "Bygg bana · Träna smartare", position: [-widthMeters * 0.25, y, frontZ], rotation: [0, 0, 0], width: longAdW, accent: "green" },
      { text: "Gå banan i 3D", sub: "Se linjerna innan passet", position: [widthMeters * 0.25, y, frontZ], rotation: [0, 0, 0], width: longAdW, accent: "navy" },
      { text: "Följ utvecklingen", sub: "Träning · mål · statistik", position: [-widthMeters * 0.25, y, backZ], rotation: [0, Math.PI, 0], width: longAdW, accent: "orange" },
      { text: "Agilitymanager", sub: "Din digitala hundhall", position: [widthMeters * 0.25, y, backZ], rotation: [0, Math.PI, 0], width: longAdW, accent: "green" },
      { text: "Träna smartare", sub: "Planera varje bana", position: [leftX, y, -heightMeters * 0.2], rotation: [0, Math.PI / 2, 0], width: shortAdW, accent: "navy" },
      { text: "Bygg din bana", sub: "Exportera PDF och dela", position: [rightX, y, heightMeters * 0.2], rotation: [0, -Math.PI / 2, 0], width: shortAdW, accent: "green" },
    ];
  }, [widthMeters, heightMeters]);

  const roofBeams = useMemo(() => {
    const count = Math.max(4, Math.min(9, Math.round(heightMeters / 5)));
    return Array.from({ length: count }, (_, i) => -heightMeters / 2 + ((i + 0.5) * heightMeters) / count);
  }, [heightMeters]);

  const lightRows = useMemo(() => [-widthMeters * 0.25, widthMeters * 0.25], [widthMeters]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[widthMeters, heightMeters]} />
        <meshStandardMaterial map={turfTexture} roughness={0.86} metalness={0} color="#ffffff" />
      </mesh>

      {showGrid && (
        <gridHelper
          args={[Math.max(widthMeters, heightMeters) * 1.03, Math.max(widthMeters, heightMeters), "#ffffff", "#d9edcf"]}
          position={[0, 0.03, 0]}
        >
          <meshBasicMaterial transparent opacity={0.22} depthWrite={false} />
        </gridHelper>
      )}

      <lineSegments position={[0, 0, 0]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[perimeterPoints, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.84} />
      </lineSegments>

      <DimensionLabel text={`${widthMeters} m`} position={[0, 0.065, -heightMeters / 2 + 0.75]} rotation={[-Math.PI / 2, 0, 0]} />
      <DimensionLabel text={`${heightMeters} m`} position={[-widthMeters / 2 + 0.75, 0.065, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} />

      {[
        { pos: [0, wallHeight / 2, -heightMeters / 2 - 0.05] as [number, number, number], size: [widthMeters + 1, wallHeight, 0.12] as [number, number, number] },
        { pos: [0, wallHeight / 2, heightMeters / 2 + 0.05] as [number, number, number], size: [widthMeters + 1, wallHeight, 0.12] as [number, number, number] },
        { pos: [-widthMeters / 2 - 0.05, wallHeight / 2, 0] as [number, number, number], size: [0.12, wallHeight, heightMeters + 1] as [number, number, number] },
        { pos: [widthMeters / 2 + 0.05, wallHeight / 2, 0] as [number, number, number], size: [0.12, wallHeight, heightMeters + 1] as [number, number, number] },
      ].map((wall, i) => (
        <group key={i}>
          <mesh position={wall.pos} receiveShadow>
            <boxGeometry args={wall.size} />
            <meshStandardMaterial color={WALL} roughness={0.72} metalness={0} />
          </mesh>
          <mesh position={[wall.pos[0], 0.18, wall.pos[2]]} receiveShadow>
            <boxGeometry args={[wall.size[0] + 0.02, 0.36, wall.size[2] + 0.02]} />
            <meshStandardMaterial color={WALL_TRIM} roughness={0.9} />
          </mesh>
          <mesh position={[wall.pos[0], wallHeight - 0.04, wall.pos[2]]}>
            <boxGeometry args={[wall.size[0] + 0.02, 0.08, wall.size[2] + 0.02]} />
            <meshStandardMaterial color="#d5d0c7" roughness={0.7} />
          </mesh>
        </group>
      ))}

      {ads.map((ad) => <WallBanner key={`${ad.text}-${ad.position.join("-")}`} {...ad} />)}

      {roofBeams.map((z) => (
        <mesh key={z} position={[0, wallHeight + 0.48, z]} receiveShadow>
          <boxGeometry args={[widthMeters + 1.2, 0.1, 0.16]} />
          <meshStandardMaterial color="#d8d3c9" roughness={0.66} />
        </mesh>
      ))}
      {lightRows.map((x) => (
        <mesh key={x} position={[x, wallHeight + 0.38, 0]}>
          <boxGeometry args={[0.18, 0.06, heightMeters * 0.88]} />
          <meshBasicMaterial color="#fff7dc" transparent opacity={0.82} />
        </mesh>
      ))}

      <ambientLight intensity={1.25} />
      <hemisphereLight args={["#fff7e5", "#648f4e", 1.24]} />
      <directionalLight position={[widthMeters / 2, wallHeight + 7, heightMeters / 2]} intensity={1.35} color="#fff2d6" />
      <directionalLight position={[-widthMeters / 2, wallHeight + 5, -heightMeters / 2]} intensity={0.92} color="#eef5ff" />
      <pointLight position={[0, wallHeight + 2.3, 0]} intensity={1.05} distance={Math.max(widthMeters, heightMeters) * 1.7} color="#ffffff" />
    </group>
  );
}
