import { useMemo } from "react";
import { Billboard, Text } from "@react-three/drei";
import * as THREE from "three";

export type Obstacle3DProps = {
  type: string;
  x: number;
  z: number;
  rotationDeg: number;
  number?: number;
  color?: string;
};

const WHITE = "#ffffff";
const RED = "#e74b4b";
const BLUE = "#3b82f6";
const YELLOW = "#f4c34a";
const WOOD = "#b58a5a";
const RUBBER = "#222222";
const NAVY = "#20245f";
const EPS = 0.002; // small lift to avoid z-fighting with floor

function NumberPlate({ number, height = 1.2 }: { number?: number; height?: number }) {
  if (!number) return null;
  return (
    <Billboard position={[0, height + 0.55, 0]} renderOrder={999}>
      <mesh renderOrder={999}>
        <circleGeometry args={[0.28, 32]} />
        <meshBasicMaterial color="#1d6f3c" depthTest={false} transparent />
      </mesh>
      <mesh position={[0, 0, 0.001]} renderOrder={999}>
        <ringGeometry args={[0.28, 0.32, 32]} />
        <meshBasicMaterial color="#ffffff" depthTest={false} transparent />
      </mesh>
      <Text
        position={[0, 0, 0.01]}
        fontSize={0.32}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#0b3a1f"
        renderOrder={1000}
      >
        {String(number)}
      </Text>
    </Billboard>
  );
}

function Foot({ x, z = 0 }: { x: number; z?: number }) {
  return (
    <mesh position={[x, 0.025 + EPS, z]} castShadow receiveShadow>
      <boxGeometry args={[0.3, 0.05, 0.4]} />
      <meshStandardMaterial color="#444" />
    </mesh>
  );
}

function Jump({ color = WHITE }: { color?: string }) {
  return (
    <group>
      {[-0.6, 0.6].map((x) => (
        <mesh key={x} position={[x, 0.45 + EPS, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.06, 0.9, 0.06]} />
          <meshStandardMaterial color={WHITE} />
        </mesh>
      ))}
      <mesh position={[0, 0.55 + EPS, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 1.2, 14]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Foot x={-0.6} />
      <Foot x={0.6} />
    </group>
  );
}
function Oxer({ color = WHITE }: { color?: string }) {
  return (
    <group>
      <group position={[0, 0, -0.22]}><Jump color={color} /></group>
      <group position={[0, 0, 0.22]}><Jump color={color} /></group>
    </group>
  );
}
function LongJump() {
  return (
    <group>
      {[-0.6, -0.2, 0.2, 0.6].map((z, i) => (
        <mesh key={i} position={[0, 0.12 + i * 0.04 + EPS, z]} castShadow receiveShadow>
          <boxGeometry args={[1.2, 0.08, 0.16]} />
          <meshStandardMaterial color={WHITE} />
        </mesh>
      ))}
    </group>
  );
}
function Wall({ color = RED }: { color?: string }) {
  return (
    <mesh position={[0, 0.4 + EPS, 0]} castShadow receiveShadow>
      <boxGeometry args={[1.2, 0.8, 0.25]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}
function Tunnel({ color = BLUE, length = 3, radius = 0.4 }: { color?: string; length?: number; radius?: number }) {
  // Lift by radius so tunnel rests on floor, not buried in it.
  return (
    <group position={[0, radius + EPS, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, length, 28, 1, true]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.7} />
      </mesh>
      {/* dark openings to read direction */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 0, (s * length) / 2 + 0.001 * s]} rotation={[0, s === 1 ? 0 : Math.PI, 0]}>
          <ringGeometry args={[radius * 0.85, radius, 28]} />
          <meshBasicMaterial color="#0b1d3a" side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}
function HoopersTunnel() {
  return <Tunnel color="#ffb84d" length={2.4} radius={0.45} />;
}
function AFrame() {
  // Two equal panels meeting at apex. Compute hypotenuse so panels touch ground exactly.
  const apexH = 1.6;
  const half = 1.4; // ground half-length
  const hyp = Math.sqrt(apexH * apexH + half * half);
  const angle = Math.atan2(apexH, half); // tilt from horizontal
  const w = 1.0;
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side}>
          {/* Panel */}
          <mesh
            position={[0, apexH / 2, (side * half) / 2]}
            rotation={[side * (Math.PI / 2 - angle), 0, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[w, 0.06, hyp]} />
            <meshStandardMaterial color={YELLOW} />
          </mesh>
          {/* Contact zone (bottom 0.9 m) painted darker */}
          <mesh
            position={[0, apexH / 4 - 0.05, (side * half) / 2 + side * (hyp / 2 - 0.45) * Math.cos(angle) - side * 0.0]}
            rotation={[side * (Math.PI / 2 - angle), 0, 0]}
          >
            <boxGeometry args={[w, 0.062, 0.9]} />
            <meshStandardMaterial color="#c64a2a" />
          </mesh>
        </group>
      ))}
      {/* apex ridge */}
      <mesh position={[0, apexH + 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, w, 12]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  );
}
function DogWalk() {
  const top = 1.1;
  const horiz = 1.4; // horizontal half-length of top
  const ramp = 1.6; // ramp length
  const w = 0.32;
  const angle = Math.atan2(top, ramp * Math.cos(Math.atan2(top, ramp)));
  // simpler: use Math.atan2(top, sqrt(ramp^2 - top^2))
  const rampHoriz = Math.sqrt(Math.max(ramp * ramp - top * top, 0.01));
  const a = Math.atan2(top, rampHoriz);
  return (
    <group>
      <mesh position={[0, top + EPS, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.06, horiz]} />
        <meshStandardMaterial color={WHITE} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[0, top / 2, side * (horiz / 2 + rampHoriz / 2)]}
          rotation={[side * a, 0, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[w, 0.06, ramp]} />
          <meshStandardMaterial color={YELLOW} />
        </mesh>
      ))}
    </group>
  );
}
function Seesaw() {
  return (
    <group>
      <mesh position={[0, 0.4 + EPS, 0]} rotation={[0.06, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.34, 0.06, 3.6]} />
        <meshStandardMaterial color={YELLOW} />
      </mesh>
      <mesh position={[0, 0.18 + EPS, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.36, 0.34]} />
        <meshStandardMaterial color="#666" />
      </mesh>
    </group>
  );
}
function Weave() {
  const count = 12;
  const spacing = 0.5;
  return (
    <group position={[0, 0, -((count - 1) * spacing) / 2]}>
      <mesh position={[0, 0.02 + EPS, ((count - 1) * spacing) / 2]} receiveShadow>
        <boxGeometry args={[0.18, 0.04, count * spacing]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i} position={[0, 0.55 + EPS, i * spacing]} castShadow>
          <cylinderGeometry args={[0.028, 0.028, 1, 12]} />
          <meshStandardMaterial color={i % 2 === 0 ? WHITE : RED} />
        </mesh>
      ))}
    </group>
  );
}
function Tire() {
  return (
    <group>
      {[-0.65, 0.65].map((x) => (
        <mesh key={x} position={[x, 0.7 + EPS, 0]} castShadow>
          <boxGeometry args={[0.07, 1.4, 0.07]} />
          <meshStandardMaterial color={WHITE} />
        </mesh>
      ))}
      <mesh position={[0, 0.85 + EPS, 0]} castShadow>
        <torusGeometry args={[0.45, 0.09, 14, 32]} />
        <meshStandardMaterial color={RUBBER} />
      </mesh>
    </group>
  );
}
function Hoop() {
  return (
    <group>
      <mesh position={[0, 0.7 + EPS, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.55, 0.05, 12, 32]} />
        <meshStandardMaterial color="#ff6b3d" />
      </mesh>
      <mesh position={[0, 0.06 + EPS, 0]} receiveShadow>
        <boxGeometry args={[1.1, 0.1, 0.32]} />
        <meshStandardMaterial color="#444" />
      </mesh>
    </group>
  );
}
function Barrel() {
  return (
    <mesh position={[0, 0.45 + EPS, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.32, 0.32, 0.9, 28]} />
      <meshStandardMaterial color={WOOD} />
    </mesh>
  );
}
function Gate({ color = WHITE }: { color?: string }) {
  return (
    <group>
      {[-0.6, 0.6].map((x) => (
        <mesh key={x} position={[x, 0.42 + EPS, 0]} castShadow>
          <boxGeometry args={[0.06, 0.85, 0.06]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
      <mesh position={[0, 0.7 + EPS, 0]} castShadow>
        <boxGeometry args={[1.2, 0.1, 0.05]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}
function HandlerZone() {
  return (
    <mesh position={[0, EPS, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[2, 2]} />
      <meshStandardMaterial color="#ffffff" transparent opacity={0.22} />
    </mesh>
  );
}
function StartGate() {
  return (
    <group>
      <Gate color="#22c55e" />
      <mesh position={[0, 1.0 + EPS, 0]} castShadow>
        <boxGeometry args={[0.8, 0.24, 0.05]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>
      <Text position={[0, 1.0, 0.03]} fontSize={0.18} color="white" anchorX="center" outlineWidth={0.01} outlineColor="#0b3a1f">START</Text>
    </group>
  );
}
function FinishGate() {
  return (
    <group>
      <Gate color={NAVY} />
      <mesh position={[0, 1.0 + EPS, 0]} castShadow>
        <boxGeometry args={[0.8, 0.24, 0.05]} />
        <meshStandardMaterial color={NAVY} />
      </mesh>
      <Text position={[0, 1.0, 0.03]} fontSize={0.18} color="white" anchorX="center" outlineWidth={0.01} outlineColor="#0b1939">MÅL</Text>
    </group>
  );
}

export function Obstacle3D({ type, x, z, rotationDeg, number, color }: Obstacle3DProps) {
  const rotY = useMemo(() => (rotationDeg * Math.PI) / 180, [rotationDeg]);
  const renderModel = () => {
    switch (type) {
      case "jump": return <Jump color={color} />;
      case "oxer": return <Oxer color={color} />;
      case "long_jump": return <LongJump />;
      case "wall": return <Wall color={color || RED} />;
      case "tunnel": return <Tunnel />;
      case "a_frame": return <AFrame />;
      case "dog_walk":
      case "balance": return <DogWalk />;
      case "seesaw": return <Seesaw />;
      case "weave": return <Weave />;
      case "tire": return <Tire />;
      case "hoop": return <Hoop />;
      case "hoopers_tunnel": return <HoopersTunnel />;
      case "barrel": return <Barrel />;
      case "gate": return <Gate color={color} />;
      case "handler_zone": return <HandlerZone />;
      case "start": return <StartGate />;
      case "finish": return <FinishGate />;
      default: return <Jump color={color} />;
    }
  };
  // Number plate hover height — slightly above the silhouette top of each obstacle.
  const heightMap: Record<string, number> = {
    jump: 1.0, oxer: 1.0, long_jump: 0.5, wall: 1.0, tunnel: 1.0, a_frame: 1.9,
    dog_walk: 1.5, balance: 1.5, seesaw: 0.9, weave: 1.2, tire: 1.7, hoop: 1.3,
    hoopers_tunnel: 1.2, barrel: 1.1, gate: 1.0, handler_zone: 0.4, start: 1.4, finish: 1.4,
  };
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      {renderModel()}
      <NumberPlate number={number} height={heightMap[type] ?? 1} />
    </group>
  );
}
