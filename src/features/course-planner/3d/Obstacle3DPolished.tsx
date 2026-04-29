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
  onSelect?: () => void;
  highlight?: boolean;
  curveDeg?: number;
  curveSide?: "left" | "right";
};

const WHITE = "#ffffff";
const BLUE = "#2563eb";
const LIGHT_BLUE = "#60a5fa";
const YELLOW = "#facc15";
const ORANGE = "#f97316";
const RED = "#e74b4b";
const NAVY = "#20245f";
const DARK = "#1f2937";
const CONTACT = "#e76f51";
const WOOD = "#b58a5a";
const EPS = 0.002;

function NumberPlate({ number, height = 1.2, highlight = false }: { number?: number; height?: number; highlight?: boolean }) {
  if (!number) return null;
  const radius = highlight ? 0.34 : 0.28;
  return (
    <Billboard position={[0, height + 0.55, 0]} renderOrder={999}>
      <mesh position={[0, 0, -0.002]} renderOrder={998}>
        <circleGeometry args={[radius + 0.18, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.28} depthTest={false} />
      </mesh>
      {highlight && <mesh renderOrder={998}><ringGeometry args={[0.45, 0.55, 40]} /><meshBasicMaterial color="#fde68a" transparent opacity={0.62} depthTest={false} /></mesh>}
      <mesh renderOrder={999}><circleGeometry args={[radius, 32]} /><meshBasicMaterial color={highlight ? "#f59e0b" : "#1d6f3c"} depthTest={false} /></mesh>
      <mesh position={[0, 0, 0.003]} renderOrder={1000}><ringGeometry args={[radius, radius + 0.055, 32]} /><meshBasicMaterial color="#ffffff" depthTest={false} /></mesh>
      <Text position={[0, 0, 0.012]} fontSize={highlight ? 0.4 : 0.32} color="white" anchorX="center" anchorY="middle" outlineWidth={0.025} outlineColor="#0b3a1f" renderOrder={1001}>{String(number)}</Text>
    </Billboard>
  );
}

function Shadow({ w = 1.4, d = 0.9 }: { w?: number; d?: number }) {
  return <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1} scale={[w, d, 1]}><circleGeometry args={[0.5, 32]} /><meshBasicMaterial color="#102015" transparent opacity={0.14} depthWrite={false} /></mesh>;
}
function Foot({ x, z = 0, color = DARK }: { x: number; z?: number; color?: string }) {
  return <mesh position={[x, 0.035 + EPS, z]} castShadow receiveShadow><boxGeometry args={[0.42, 0.07, 0.44]} /><meshStandardMaterial color={color} roughness={0.72} /></mesh>;
}
function StripedBar({ main = BLUE, accent = YELLOW, length = 1.24 }: { main?: string; accent?: string; length?: number }) {
  return <group rotation={[0, 0, Math.PI / 2]}><mesh castShadow><cylinderGeometry args={[0.043, 0.043, length, 18]} /><meshStandardMaterial color={main} roughness={0.35} /></mesh>{[-0.42, 0, 0.42].map((y) => <mesh key={y} position={[0, y, 0]}><cylinderGeometry args={[0.047, 0.047, 0.18, 18]} /><meshStandardMaterial color={accent} roughness={0.34} /></mesh>)}</group>;
}
function AdjustablePost({ x, accent = ORANGE }: { x: number; accent?: string }) {
  return <group position={[x, 0, 0]}><mesh position={[0, 0.52 + EPS, 0]} castShadow receiveShadow><boxGeometry args={[0.075, 1.04, 0.075]} /><meshStandardMaterial color={WHITE} roughness={0.38} /></mesh>{[0.28, 0.45, 0.62, 0.79].map((y) => <mesh key={y} position={[0.043, y, 0]} rotation={[0, Math.PI / 2, 0]}><cylinderGeometry args={[0.012, 0.012, 0.012, 10]} /><meshBasicMaterial color="#9ca3af" /></mesh>)}<mesh position={[0, 0.18, 0]} castShadow><boxGeometry args={[0.14, 0.08, 0.14]} /><meshStandardMaterial color={accent} roughness={0.48} /></mesh><Foot x={0} color="#374151" /></group>;
}
function Jump({ color }: { color?: string }) {
  return <group><Shadow w={1.7} d={0.9} /><AdjustablePost x={-0.64} /><AdjustablePost x={0.64} /><group position={[0, 0.58 + EPS, 0]}><StripedBar main={color && color !== WHITE ? color : BLUE} accent={YELLOW} /></group><mesh position={[0, 0.18, -0.22]} receiveShadow><boxGeometry args={[1.34, 0.04, 0.06]} /><meshStandardMaterial color="#d1d5db" roughness={0.58} /></mesh></group>;
}
function Oxer({ color }: { color?: string }) { return <group><Shadow w={1.8} d={1.3} /><group position={[0, 0, -0.25]}><Jump color={color || BLUE} /></group><group position={[0, 0.08, 0.25]}><Jump color={ORANGE} /></group></group>; }
function LongJump() { return <group rotation={[0, Math.PI / 2, 0]}><Shadow w={1.65} d={1.4} />{[-0.58, -0.18, 0.22, 0.62].map((z, i) => <mesh key={i} position={[0, 0.08 + i * 0.035 + EPS, z]} castShadow receiveShadow><boxGeometry args={[1.48, 0.085, 0.18]} /><meshStandardMaterial color={i % 2 === 0 ? WHITE : YELLOW} roughness={0.42} /></mesh>)}{[[-0.84, -0.78], [0.84, -0.78], [-0.84, 0.86], [0.84, 0.86]].map(([x, z], i) => <mesh key={i} position={[x, 0.16, z]} castShadow><cylinderGeometry args={[0.035, 0.035, 0.32, 10]} /><meshStandardMaterial color={ORANGE} /></mesh>)}</group>; }
function Wall({ color = RED }: { color?: string }) { return <group><Shadow w={1.7} d={0.75} /><mesh position={[0, 0.42 + EPS, 0]} castShadow receiveShadow><boxGeometry args={[1.48, 0.82, 0.32]} /><meshStandardMaterial color={color || RED} roughness={0.55} /></mesh>{[-0.48, 0, 0.48].map((x) => <mesh key={x} position={[x, 0.42, 0.166]}><boxGeometry args={[0.025, 0.78, 0.012]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.45} /></mesh>)}{[0.26, 0.52, 0.78].map((y) => <mesh key={y} position={[0, y, 0.168]}><boxGeometry args={[1.42, 0.022, 0.012]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.42} /></mesh>)}</group>; }

function makeTunnelPath(length: number, curveDeg = 0, curveSide: "left" | "right" = "left") {
  const deg = Math.max(0, Math.min(90, curveDeg));
  if (deg < 1) return new THREE.CatmullRomCurve3([new THREE.Vector3(-length / 2, 0, 0), new THREE.Vector3(length / 2, 0, 0)]);
  const theta = THREE.MathUtils.degToRad(deg);
  const arcRadius = length / theta;
  const side = curveSide === "left" ? 1 : -1;
  const points = Array.from({ length: 34 }, (_, i) => {
    const t = i / 33;
    const a = -theta / 2 + t * theta;
    return new THREE.Vector3(Math.sin(a) * arcRadius, 0, side * (Math.cos(a) - Math.cos(theta / 2)) * arcRadius);
  });
  return new THREE.CatmullRomCurve3(points);
}
function Tunnel({ color = BLUE, length = 3.05, radius = 0.42, curveDeg = 0, curveSide = "left" }: { color?: string; length?: number; radius?: number; curveDeg?: number; curveSide?: "left" | "right" }) {
  const path = useMemo(() => makeTunnelPath(length, curveDeg, curveSide), [length, curveDeg, curveSide]);
  const ribPoints = useMemo(() => Array.from({ length: 10 }, (_, i) => path.getPoint(i / 9)), [path]);
  return (
    <group position={[0, radius + EPS, 0]}>
      <Shadow w={curveDeg > 1 ? 2.2 : 1.1} d={curveDeg > 1 ? 2.2 : 3.25} />
      <mesh castShadow receiveShadow>
        <tubeGeometry args={[path, 96, radius, 28, false]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.64} metalness={0.02} />
      </mesh>
      {ribPoints.map((p, i) => <mesh key={i} position={[p.x, p.y, p.z]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[radius + 0.012, 0.012, 8, 32]} /><meshStandardMaterial color={i % 2 === 0 ? LIGHT_BLUE : "#1d4ed8"} roughness={0.55} /></mesh>)}
    </group>
  );
}
function HoopersTunnel(props: { curveDeg?: number; curveSide?: "left" | "right" }) { return <Tunnel color={ORANGE} length={2.4} radius={0.45} {...props} />; }

function AFrame() { const apexH = 1.65, half = 1.42, hyp = Math.sqrt(apexH * apexH + half * half), angle = Math.PI / 2 - Math.atan2(apexH, half), w = 1.05; return <group rotation={[0, Math.PI / 2, 0]}><Shadow w={1.35} d={3.2} />{[-1, 1].map((side) => <group key={side}><mesh position={[0, apexH / 2, (side * half) / 2]} rotation={[side * angle, 0, 0]} castShadow receiveShadow><boxGeometry args={[w, 0.08, hyp]} /><meshStandardMaterial color={YELLOW} roughness={0.46} /></mesh><mesh position={[0, 0.42, (side * half) / 2 + side * 0.78]} rotation={[side * angle, 0, 0]}><boxGeometry args={[w + 0.01, 0.065, 0.62]} /><meshStandardMaterial color={CONTACT} roughness={0.46} /></mesh>{[-0.5, 0, 0.5].map((offset) => <mesh key={offset} position={[0, apexH / 2 + 0.04, (side * half) / 2 + side * offset]} rotation={[side * angle, 0, 0]} castShadow><boxGeometry args={[w + 0.04, 0.035, 0.045]} /><meshStandardMaterial color="#8b5e34" roughness={0.7} /></mesh>)}</group>)}<mesh position={[0, apexH + 0.025, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.045, 0.045, w + 0.08, 14]} /><meshStandardMaterial color={DARK} /></mesh></group>; }
function DogWalk() { const top = 1.08, horiz = 1.65, ramp = 1.7, w = 0.36, rampHoriz = Math.sqrt(Math.max(ramp * ramp - top * top, 0.01)), a = Math.atan2(top, rampHoriz); return <group rotation={[0, Math.PI / 2, 0]}><Shadow w={0.9} d={5.2} /><mesh position={[0, top + EPS, 0]} castShadow receiveShadow><boxGeometry args={[w, 0.07, horiz]} /><meshStandardMaterial color={WHITE} roughness={0.48} /></mesh>{[-1, 1].map((side) => <group key={side}><mesh position={[0, top / 2, side * (horiz / 2 + rampHoriz / 2)]} rotation={[side * a, 0, 0]} castShadow receiveShadow><boxGeometry args={[w, 0.07, ramp]} /><meshStandardMaterial color={YELLOW} roughness={0.48} /></mesh><mesh position={[0, 0.22, side * (horiz / 2 + rampHoriz - 0.34)]} rotation={[side * a, 0, 0]}><boxGeometry args={[w + 0.02, 0.075, 0.62]} /><meshStandardMaterial color={CONTACT} /></mesh></group>)}{[-0.6, 0.6].map((z) => <mesh key={z} position={[0, top / 2, z]} castShadow><boxGeometry args={[0.08, top, 0.08]} /><meshStandardMaterial color="#4b5563" /></mesh>)}</group>; }
function Seesaw() { return <group rotation={[0, Math.PI / 2, 0]}><Shadow w={0.9} d={3.9} /><mesh position={[0, 0.43 + EPS, 0]} rotation={[0.055, 0, 0]} castShadow receiveShadow><boxGeometry args={[0.38, 0.075, 3.65]} /><meshStandardMaterial color={YELLOW} roughness={0.48} /></mesh>{[-1.25, 1.25].map((z) => <mesh key={z} position={[0, 0.32, z]} rotation={[0.055, 0, 0]}><boxGeometry args={[0.4, 0.08, 0.5]} /><meshStandardMaterial color={CONTACT} /></mesh>)}<mesh position={[0, 0.19 + EPS, 0]} castShadow receiveShadow><boxGeometry args={[0.55, 0.38, 0.34]} /><meshStandardMaterial color="#4b5563" roughness={0.6} /></mesh></group>; }
function Weave() { const count = 12, spacing = 0.5; return <group rotation={[0, Math.PI / 2, 0]}><Shadow w={0.55} d={6.2} /><group position={[0, 0, -((count - 1) * spacing) / 2]}>{Array.from({ length: count }).map((_, i) => <group key={i} position={[0, 0, i * spacing]}><mesh position={[0, 0.54 + EPS, 0]} castShadow><cylinderGeometry args={[0.03, 0.03, 1.02, 14]} /><meshStandardMaterial color={i % 2 === 0 ? WHITE : RED} roughness={0.36} /></mesh><mesh position={[0, 0.035, 0]} receiveShadow><cylinderGeometry args={[0.11, 0.11, 0.055, 18]} /><meshStandardMaterial color={ORANGE} roughness={0.55} /></mesh></group>)}</group></group>; }
function Tire() { return <group><Shadow w={1.7} d={0.95} />{[-0.68, 0.68].map((x) => <group key={x}><mesh position={[x, 0.72 + EPS, 0]} castShadow><boxGeometry args={[0.075, 1.44, 0.075]} /><meshStandardMaterial color={WHITE} roughness={0.42} /></mesh><Foot x={x} color={YELLOW} /></group>)}<mesh position={[0, 0.86 + EPS, 0]} castShadow><torusGeometry args={[0.45, 0.085, 16, 36]} /><meshStandardMaterial color={ORANGE} roughness={0.42} /></mesh><mesh position={[0, 0.86 + EPS, 0]} castShadow><torusGeometry args={[0.31, 0.018, 12, 30]} /><meshStandardMaterial color={WHITE} roughness={0.35} /></mesh></group>; }
function Hoop() { return <group rotation={[0, Math.PI / 2, 0]}><Shadow w={1.45} d={0.95} /><mesh position={[0, 0.74 + EPS, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow><torusGeometry args={[0.54, 0.045, 12, 36]} /><meshStandardMaterial color={ORANGE} roughness={0.42} /></mesh><mesh position={[0, 0.08 + EPS, 0]} receiveShadow><boxGeometry args={[1.18, 0.12, 0.34]} /><meshStandardMaterial color={YELLOW} roughness={0.5} /></mesh>{[-0.5, 0.5].map((x) => <mesh key={x} position={[x, 0.36, 0]} castShadow><boxGeometry args={[0.06, 0.62, 0.06]} /><meshStandardMaterial color={WHITE} /></mesh>)}</group>; }
function Barrel() { return <group><Shadow w={0.9} d={0.9} /><mesh position={[0, 0.46 + EPS, 0]} castShadow receiveShadow><cylinderGeometry args={[0.34, 0.34, 0.92, 32]} /><meshStandardMaterial color={BLUE} roughness={0.5} /></mesh>{[0.18, 0.72].map((y) => <mesh key={y} position={[0, y, 0]}><torusGeometry args={[0.345, 0.018, 8, 32]} /><meshStandardMaterial color={ORANGE} /></mesh>)}</group>; }
function Gate({ color = WHITE }: { color?: string }) { const c = color || WHITE; return <group><Shadow w={1.55} d={0.75} />{[-0.62, 0.62].map((x) => <mesh key={x} position={[x, 0.44 + EPS, 0]} castShadow><boxGeometry args={[0.07, 0.88, 0.07]} /><meshStandardMaterial color={c} roughness={0.42} /></mesh>)}{[0.42, 0.7].map((y) => <mesh key={y} position={[0, y + EPS, 0]} castShadow><boxGeometry args={[1.22, 0.08, 0.055]} /><meshStandardMaterial color={y > 0.5 ? ORANGE : c} roughness={0.42} /></mesh>)}<Foot x={-0.62} color={YELLOW} /><Foot x={0.62} color={YELLOW} /></group>; }
function HandlerZone() { return <group><mesh position={[0, EPS, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[2, 2]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.18} /></mesh><mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.95, 1, 4]} /><meshBasicMaterial color={ORANGE} transparent opacity={0.82} /></mesh></group>; }
function StartGate() { return <group><Gate color="#22c55e" /><mesh position={[0, 1.04 + EPS, 0.03]} castShadow><boxGeometry args={[0.88, 0.26, 0.055]} /><meshStandardMaterial color="#22c55e" /></mesh><Text position={[0, 1.04, 0.065]} fontSize={0.18} color="white" anchorX="center" outlineWidth={0.01} outlineColor="#0b3a1f">START</Text></group>; }
function FinishGate() { return <group><Gate color={NAVY} /><mesh position={[0, 1.04 + EPS, 0.03]} castShadow><boxGeometry args={[0.88, 0.26, 0.055]} /><meshStandardMaterial color={NAVY} /></mesh><Text position={[0, 1.04, 0.065]} fontSize={0.18} color="white" anchorX="center" outlineWidth={0.01} outlineColor="#0b1939">MÅL</Text></group>; }

export function Obstacle3D({ type, x, z, rotationDeg, number, color, onSelect, highlight = false, curveDeg = 0, curveSide = "left" }: Obstacle3DProps) {
  const rotY = useMemo(() => (rotationDeg * Math.PI) / 180, [rotationDeg]);
  const renderModel = () => {
    switch (type) {
      case "jump": return <Jump color={color} />;
      case "oxer": return <Oxer color={color} />;
      case "long_jump": return <LongJump />;
      case "wall": return <Wall color={color || RED} />;
      case "tunnel": return <Tunnel curveDeg={curveDeg} curveSide={curveSide} />;
      case "a_frame": return <AFrame />;
      case "dog_walk":
      case "balance": return <DogWalk />;
      case "seesaw": return <Seesaw />;
      case "weave": return <Weave />;
      case "tire": return <Tire />;
      case "hoop": return <Hoop />;
      case "hoopers_tunnel": return <HoopersTunnel curveDeg={curveDeg} curveSide={curveSide} />;
      case "barrel": return <Barrel />;
      case "gate": return <Gate color={color} />;
      case "handler_zone": return <HandlerZone />;
      case "start": return <StartGate />;
      case "finish": return <FinishGate />;
      default: return <Jump color={color} />;
    }
  };
  const heightMap: Record<string, number> = { jump: 1, oxer: 1.08, long_jump: 0.55, wall: 1, tunnel: 1.05, a_frame: 1.9, dog_walk: 1.52, balance: 1.52, seesaw: 0.92, weave: 1.2, tire: 1.75, hoop: 1.34, hoopers_tunnel: 1.16, barrel: 1.12, gate: 1.04, handler_zone: 0.42, start: 1.45, finish: 1.45 };
  const hit = heightMap[type] ?? 1;
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      {highlight && <><mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}><ringGeometry args={[0.95, 1.25, 48]} /><meshBasicMaterial color="#fbbf24" transparent opacity={0.85} depthWrite={false} /></mesh><mesh position={[0, 0.013, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={0}><ringGeometry args={[1.25, 1.7, 48]} /><meshBasicMaterial color="#fde68a" transparent opacity={0.35} depthWrite={false} /></mesh></>}
      {renderModel()}
      <NumberPlate number={number} height={hit} highlight={highlight} />
      {onSelect && <mesh position={[0, hit / 2 + 0.1, 0]} onClick={(e) => { e.stopPropagation(); onSelect(); }} onPointerDown={(e) => e.stopPropagation()} onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }} onPointerOut={() => { document.body.style.cursor = "auto"; }}><boxGeometry args={[2.35, hit + 0.45, 2.35]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>}
    </group>
  );
}
