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
const WALL = "#f7f3ea";
const WALL_PANEL = "#eee8dc";
const WALL_TRIM = "#687168";
const ROOF = "#e7e2d8";
const TURF_DARK = "#457b38";

function makeTurfTexture(widthMeters: number, heightMeters: number) {
  const c = document.createElement("canvas");
  c.width = c.height = 768;
  const ctx = c.getContext("2d")!;

  const grad = ctx.createRadialGradient(384, 384, 80, 384, 384, 520);
  grad.addColorStop(0, "#76b85c");
  grad.addColorStop(0.48, "#5fa34b");
  grad.addColorStop(1, "#3f7334");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 768, 768);

  // Subtle lengthwise mowing bands, not a hard checkerboard.
  for (let x = 0; x < 768; x += 96) {
    ctx.fillStyle = x % 192 === 0 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.025)";
    ctx.fillRect(x, 0, 96, 768);
  }

  // Turf fibers.
  for (let i = 0; i < 22000; i++) {
    const x = Math.random() * 768;
    const y = Math.random() * 768;
    const r = 76 + Math.random() * 92;
    const g = 130 + Math.random() * 88;
    const b = 55 + Math.random() * 58;
    const alpha = 0.16 + Math.random() * 0.32;
    ctx.strokeStyle = `rgba(${r | 0},${g | 0},${b | 0},${alpha})`;
    ctx.lineWidth = Math.random() < 0.93 ? 1 : 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 1.2, y - 1 - Math.random() * 2.4);
    ctx.stroke();
  }

  // Tiny infill/dirt details.
  for (let i = 0; i < 1500; i++) {
    const x = Math.random() * 768;
    const y = Math.random() * 768;
    ctx.fillStyle = `rgba(45,34,24,${0.018 + Math.random() * 0.035})`;
    ctx.fillRect(x, y, 1, 1);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(Math.max(2, widthMeters / 3.2), Math.max(2, heightMeters / 3.2));
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function WallBanner({ text, sub, position, rotation, width, accent = "green" }: WallAd) {
  const accentColor = accent === "navy" ? NAVY : accent === "orange" ? ORANGE : BRAND_GREEN;
  const height = 1.08;
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, 0]} renderOrder={2} castShadow receiveShadow>
        <boxGeometry args={[width, height, 0.06]} />
        <meshStandardMaterial color="#fffaf0" roughness={0.58} metalness={0.02} />
      </mesh>
      <mesh position={[0, height / 2 - 0.075, 0.038]} renderOrder={3}>
        <boxGeometry args={[width, 0.15, 0.018]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>
      <mesh position={[-width / 2 + 0.34, 0.02, 0.042]} renderOrder={3}>
        <circleGeometry args={[0.25, 32]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>
      <Text
        position={[0.14, 0.16, 0.07]}
        fontSize={Math.min(0.32, width / 11)}
        color="#102d22"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.006}
        outlineColor="#fffaf0"
        maxWidth={width - 1.05}
        textAlign="center"
        renderOrder={4}
      >
        {text}
      </Text>
      {sub && (
        <Text
          position={[0.14, -0.22, 0.07]}
          fontSize={Math.min(0.145, width / 21)}
          color="#526059"
          anchorX="center"
          anchorY="middle"
          maxWidth={width - 1.1}
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
    <Text position={position} rotation={rotation} fontSize={0.34} color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.028} outlineColor="#31542b">
      {text}
    </Text>
  );
}

function WallPanelLines({ widthMeters, heightMeters, wallHeight }: { widthMeters: number; heightMeters: number; wallHeight: number }) {
  const longCount = Math.max(5, Math.round(widthMeters / 5));
  const shortCount = Math.max(4, Math.round(heightMeters / 5));
  const lineColor = "#d8d1c5";
  return (
    <group>
      {Array.from({ length: longCount + 1 }).map((_, i) => {
        const x = -widthMeters / 2 + (i * widthMeters) / longCount;
        return (
          <group key={`long-${i}`}>
            <mesh position={[x, wallHeight / 2, -heightMeters / 2 - 0.123]}>
              <boxGeometry args={[0.025, wallHeight - 0.55, 0.018]} />
              <meshBasicMaterial color={lineColor} transparent opacity={0.65} />
            </mesh>
            <mesh position={[x, wallHeight / 2, heightMeters / 2 + 0.123]}>
              <boxGeometry args={[0.025, wallHeight - 0.55, 0.018]} />
              <meshBasicMaterial color={lineColor} transparent opacity={0.65} />
            </mesh>
          </group>
        );
      })}
      {Array.from({ length: shortCount + 1 }).map((_, i) => {
        const z = -heightMeters / 2 + (i * heightMeters) / shortCount;
        return (
          <group key={`short-${i}`}>
            <mesh position={[-widthMeters / 2 - 0.123, wallHeight / 2, z]}>
              <boxGeometry args={[0.018, wallHeight - 0.55, 0.025]} />
              <meshBasicMaterial color={lineColor} transparent opacity={0.65} />
            </mesh>
            <mesh position={[widthMeters / 2 + 0.123, wallHeight / 2, z]}>
              <boxGeometry args={[0.018, wallHeight - 0.55, 0.025]} />
              <meshBasicMaterial color={lineColor} transparent opacity={0.65} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function Arena3D({ widthMeters, heightMeters, wallHeight = 4.15, showGrid = true }: Props) {
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
    const longAdW = Math.min(9.2, Math.max(5.8, widthMeters / 3.55));
    const shortAdW = Math.min(6.4, Math.max(4.3, heightMeters / 4.7));
    const y = 2.08;
    const frontZ = -heightMeters / 2 - 0.142;
    const backZ = heightMeters / 2 + 0.142;
    const leftX = -widthMeters / 2 - 0.142;
    const rightX = widthMeters / 2 + 0.142;
    return [
      { text: "Agilitymanager", sub: "Bygg bana · Träna smartare", position: [-widthMeters * 0.26, y, frontZ], rotation: [0, 0, 0], width: longAdW, accent: "green" },
      { text: "Gå banan i 3D", sub: "Se linjerna innan passet", position: [widthMeters * 0.26, y, frontZ], rotation: [0, 0, 0], width: longAdW, accent: "navy" },
      { text: "Följ utvecklingen", sub: "Träning · mål · statistik", position: [-widthMeters * 0.26, y, backZ], rotation: [0, Math.PI, 0], width: longAdW, accent: "orange" },
      { text: "Agilitymanager", sub: "Din digitala hundhall", position: [widthMeters * 0.26, y, backZ], rotation: [0, Math.PI, 0], width: longAdW, accent: "green" },
      { text: "Träna smartare", sub: "Planera varje bana", position: [leftX, y, -heightMeters * 0.22], rotation: [0, Math.PI / 2, 0], width: shortAdW, accent: "navy" },
      { text: "Bygg din bana", sub: "Exportera PDF och dela", position: [rightX, y, heightMeters * 0.22], rotation: [0, -Math.PI / 2, 0], width: shortAdW, accent: "green" },
    ];
  }, [widthMeters, heightMeters]);

  const roofBeams = useMemo(() => {
    const count = Math.max(5, Math.min(10, Math.round(heightMeters / 4.3)));
    return Array.from({ length: count }, (_, i) => -heightMeters / 2 + ((i + 0.5) * heightMeters) / count);
  }, [heightMeters]);
  const roofLongBeams = useMemo(() => [-widthMeters * 0.33, 0, widthMeters * 0.33], [widthMeters]);
  const lightRows = useMemo(() => [-widthMeters * 0.26, widthMeters * 0.26], [widthMeters]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[widthMeters, heightMeters]} />
        <meshStandardMaterial map={turfTexture} roughness={0.88} metalness={0} color="#ffffff" />
      </mesh>

      {showGrid && (
        <gridHelper
          args={[Math.max(widthMeters, heightMeters) * 1.03, Math.max(widthMeters, heightMeters), "#ffffff", "#d9edcf"]}
          position={[0, 0.031, 0]}
        >
          <meshBasicMaterial transparent opacity={0.12} depthWrite={false} />
        </gridHelper>
      )}

      <lineSegments position={[0, 0, 0]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[perimeterPoints, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.88} />
      </lineSegments>

      <DimensionLabel text={`${widthMeters} m`} position={[0, 0.07, -heightMeters / 2 + 0.75]} rotation={[-Math.PI / 2, 0, 0]} />
      <DimensionLabel text={`${heightMeters} m`} position={[-widthMeters / 2 + 0.75, 0.07, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} />

      {[
        { pos: [0, wallHeight / 2, -heightMeters / 2 - 0.06] as [number, number, number], size: [widthMeters + 1.2, wallHeight, 0.16] as [number, number, number] },
        { pos: [0, wallHeight / 2, heightMeters / 2 + 0.06] as [number, number, number], size: [widthMeters + 1.2, wallHeight, 0.16] as [number, number, number] },
        { pos: [-widthMeters / 2 - 0.06, wallHeight / 2, 0] as [number, number, number], size: [0.16, wallHeight, heightMeters + 1.2] as [number, number, number] },
        { pos: [widthMeters / 2 + 0.06, wallHeight / 2, 0] as [number, number, number], size: [0.16, wallHeight, heightMeters + 1.2] as [number, number, number] },
      ].map((wall, i) => (
        <group key={i}>
          <mesh position={wall.pos} receiveShadow>
            <boxGeometry args={wall.size} />
            <meshStandardMaterial color={i < 2 ? WALL : WALL_PANEL} roughness={0.76} metalness={0} />
          </mesh>
          <mesh position={[wall.pos[0], 0.24, wall.pos[2]]} receiveShadow>
            <boxGeometry args={[wall.size[0] + 0.03, 0.48, wall.size[2] + 0.03]} />
            <meshStandardMaterial color={WALL_TRIM} roughness={0.9} />
          </mesh>
          <mesh position={[wall.pos[0], wallHeight - 0.06, wall.pos[2]]} castShadow>
            <boxGeometry args={[wall.size[0] + 0.05, 0.12, wall.size[2] + 0.05]} />
            <meshStandardMaterial color="#d2cbbf" roughness={0.7} />
          </mesh>
        </group>
      ))}

      <WallPanelLines widthMeters={widthMeters} heightMeters={heightMeters} wallHeight={wallHeight} />
      {ads.map((ad) => <WallBanner key={`${ad.text}-${ad.position.join("-")}`} {...ad} />)}

      {/* Open roof structure: enough to read as an indoor hall, without making the scene dark. */}
      {roofBeams.map((z) => (
        <mesh key={z} position={[0, wallHeight + 0.62, z]} castShadow receiveShadow>
          <boxGeometry args={[widthMeters + 1.6, 0.12, 0.18]} />
          <meshStandardMaterial color={ROOF} roughness={0.66} />
        </mesh>
      ))}
      {roofLongBeams.map((x) => (
        <mesh key={x} position={[x, wallHeight + 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.16, 0.12, heightMeters + 1.3]} />
          <meshStandardMaterial color="#d8d2c6" roughness={0.7} />
        </mesh>
      ))}
      {lightRows.map((x) => (
        <group key={x} position={[x, wallHeight + 0.44, 0]}>
          <mesh>
            <boxGeometry args={[0.32, 0.055, heightMeters * 0.84]} />
            <meshBasicMaterial color="#fff8dc" transparent opacity={0.92} />
          </mesh>
          <pointLight intensity={0.68} distance={Math.max(widthMeters, heightMeters) * 0.78} color="#fff6dc" />
        </group>
      ))}

      <ambientLight intensity={1.12} />
      <hemisphereLight args={["#fff6e7", TURF_DARK, 1.18]} />
      <directionalLight position={[widthMeters / 2, wallHeight + 7, heightMeters / 2]} intensity={1.08} color="#fff2d6" castShadow />
      <directionalLight position={[-widthMeters / 2, wallHeight + 5, -heightMeters / 2]} intensity={0.68} color="#eef5ff" />
      <pointLight position={[0, wallHeight + 2.4, 0]} intensity={0.72} distance={Math.max(widthMeters, heightMeters) * 1.6} color="#ffffff" />
    </group>
  );
}
