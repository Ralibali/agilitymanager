import { useMemo } from "react";
import { Text } from "@react-three/drei";
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

function NumberPlate({ number, height = 1.2 }: { number?: number; height?: number }) {
  if (!number) return null;
  return (
    <group position={[0, height + 0.5, 0]}>
      <mesh>
        <cylinderGeometry args={[0.2, 0.2, 0.04, 24]} />
        <meshStandardMaterial color="#1d6f3c" />
      </mesh>
      <Text position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.24} color="white" anchorX="center" anchorY="middle">
        {String(number)}
      </Text>
    </group>
  );
}

function Jump({ color = WHITE }: { color?: string }) {
  return (
    <group>
      {[-0.6, 0.6].map((x) => (
        <mesh key={x} position={[x, 0.45, 0]}>
          <boxGeometry args={[0.05, 0.9, 0.05]} />
          <meshStandardMaterial color={WHITE} />
        </mesh>
      ))}
      <mesh position={[0, 0.55, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.035, 1.2, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {[-0.6, 0.6].map((x) => (
        <mesh key={`f${x}`} position={[x, 0.025, 0]}>
          <boxGeometry args={[0.3, 0.05, 0.4]} />
          <meshStandardMaterial color="#444" />
        </mesh>
      ))}
    </group>
  );
}
function Oxer({ color = WHITE }: { color?: string }) {
  return (
    <group>
      <group position={[0, 0, -0.2]}><Jump color={color} /></group>
      <group position={[0, 0, 0.2]}><Jump color={color} /></group>
    </group>
  );
}
function LongJump() {
  return (
    <group>
      {[-0.8, -0.3, 0.2, 0.7].map((z, i) => (
        <mesh key={i} position={[0, 0.15 + i * 0.04, z]}>
          <boxGeometry args={[1.2, 0.06, 0.18]} />
          <meshStandardMaterial color={WHITE} />
        </mesh>
      ))}
    </group>
  );
}
function Wall({ color = RED }: { color?: string }) {
  return (
    <mesh position={[0, 0.4, 0]}>
      <boxGeometry args={[1.2, 0.8, 0.25]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}
function Tunnel() {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.4, 0.4, 4, 24, 1, true]} />
      <meshStandardMaterial color={BLUE} side={THREE.DoubleSide} />
    </mesh>
  );
}
function HoopersTunnel() {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.45, 0.45, 3, 24, 1, true]} />
      <meshStandardMaterial color="#ffb84d" side={THREE.DoubleSide} />
    </mesh>
  );
}
function AFrame() {
  const w = 0.9, len = 2.7, apexH = 1.7, angle = Math.atan2(apexH, len / 2);
  return (
    <group>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, apexH / 2, side * (len / 4)]} rotation={[side * angle, 0, 0]}>
          <boxGeometry args={[w, 0.05, len / 2 + 0.2]} />
          <meshStandardMaterial color={YELLOW} />
        </mesh>
      ))}
    </group>
  );
}
function DogWalk() {
  const len = 3.6, w = 0.3, h = 1.1;
  return (
    <group>
      <mesh position={[0, h, 0]}>
        <boxGeometry args={[w, 0.05, len * 0.4]} />
        <meshStandardMaterial color={WHITE} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, h / 2, side * (len * 0.35)]} rotation={[side * Math.atan2(h, len * 0.4), 0, 0]}>
          <boxGeometry args={[w, 0.05, len * 0.45]} />
          <meshStandardMaterial color={YELLOW} />
        </mesh>
      ))}
    </group>
  );
}
function Seesaw() {
  return (
    <group>
      <mesh position={[0, 0.35, 0]} rotation={[0.08, 0, 0]}>
        <boxGeometry args={[0.32, 0.05, 3.6]} />
        <meshStandardMaterial color={YELLOW} />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[0.4, 0.3, 0.3]} />
        <meshStandardMaterial color="#666" />
      </mesh>
    </group>
  );
}
function Weave() {
  const poles = Array.from({ length: 12 }, (_, i) => i);
  const spacing = 0.55;
  return (
    <group position={[0, 0, -((poles.length - 1) * spacing) / 2]}>
      {poles.map((i) => (
        <mesh key={i} position={[0, 0.5, i * spacing]}>
          <cylinderGeometry args={[0.025, 0.025, 1, 10]} />
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
        <mesh key={x} position={[x, 0.7, 0]}>
          <boxGeometry args={[0.06, 1.4, 0.06]} />
          <meshStandardMaterial color={WHITE} />
        </mesh>
      ))}
      <mesh position={[0, 0.85, 0]}>
        <torusGeometry args={[0.45, 0.08, 12, 32]} />
        <meshStandardMaterial color={RUBBER} />
      </mesh>
    </group>
  );
}
function Hoop() {
  return (
    <group>
      <mesh position={[0, 0.65, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.5, 0.04, 10, 28]} />
        <meshStandardMaterial color="#ff6b3d" />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[1, 0.08, 0.3]} />
        <meshStandardMaterial color="#444" />
      </mesh>
    </group>
  );
}
function Barrel() {
  return (
    <mesh position={[0, 0.45, 0]}>
      <cylinderGeometry args={[0.32, 0.32, 0.9, 24]} />
      <meshStandardMaterial color={WOOD} />
    </mesh>
  );
}
function Gate({ color = WHITE }: { color?: string }) {
  return (
    <group>
      {[-0.6, 0.6].map((x) => (
        <mesh key={x} position={[x, 0.42, 0]}>
          <boxGeometry args={[0.05, 0.85, 0.05]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[1.2, 0.1, 0.04]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}
function HandlerZone() {
  return (
    <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[2, 2]} />
      <meshStandardMaterial color="#ffffff" transparent opacity={0.25} />
    </mesh>
  );
}
function StartGate() {
  return (
    <group>
      <Gate color="#22c55e" />
      <mesh position={[0, 1.0, 0]}>
        <boxGeometry args={[0.7, 0.22, 0.04]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>
      <Text position={[0, 1.0, 0.025]} fontSize={0.16} color="white" anchorX="center">START</Text>
    </group>
  );
}
function FinishGate() {
  return (
    <group>
      <Gate color={NAVY} />
      <mesh position={[0, 1.0, 0]}>
        <boxGeometry args={[0.7, 0.22, 0.04]} />
        <meshStandardMaterial color={NAVY} />
      </mesh>
      <Text position={[0, 1.0, 0.025]} fontSize={0.16} color="white" anchorX="center">MÅL</Text>
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
  const heightMap: Record<string, number> = {
    jump: 0.9, oxer: 0.9, long_jump: 0.4, wall: 0.9, tunnel: 0.9, a_frame: 1.7,
    dog_walk: 1.3, balance: 1.3, seesaw: 0.8, weave: 1.1, tire: 1.5, hoop: 1.2,
    hoopers_tunnel: 1.0, barrel: 1.0, gate: 0.95, handler_zone: 0.2, start: 1.2, finish: 1.2,
  };
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      {renderModel()}
      <NumberPlate number={number} height={heightMap[type] ?? 1} />
    </group>
  );
}
