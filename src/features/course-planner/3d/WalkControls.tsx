import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import * as THREE from "three";

type Joystick = { x: number; y: number };

export function WalkControls({
  joystick,
  lookDelta,
  isMobile,
  speed = 2.2,
  sprintMul = 1.7,
  bounds,
}: {
  joystick: Joystick;
  lookDelta: { x: number; y: number };
  isMobile: boolean;
  speed?: number;
  sprintMul?: number;
  bounds: { w: number; h: number };
}) {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const yaw = useRef(0);
  const pitch = useRef(0);
  const lockRef = useRef<any>(null);

  useEffect(() => {
    const dn = (e: KeyboardEvent) => (keys.current[e.key.toLowerCase()] = true);
    const up = (e: KeyboardEvent) => (keys.current[e.key.toLowerCase()] = false);
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", dn);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFrame((_, dt) => {
    // Mobile: apply look delta to yaw/pitch directly
    if (isMobile) {
      yaw.current -= lookDelta.x * 0.003;
      pitch.current -= lookDelta.y * 0.003;
      pitch.current = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch.current));
      const euler = new THREE.Euler(pitch.current, yaw.current, 0, "YXZ");
      camera.quaternion.setFromEuler(euler);
    }

    const sprint = keys.current["shift"] ? sprintMul : 1;
    const v = speed * sprint * dt;

    // Direction relative to camera
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    let mx = 0;
    let mz = 0;
    if (keys.current["w"] || keys.current["arrowup"]) mz += 1;
    if (keys.current["s"] || keys.current["arrowdown"]) mz -= 1;
    if (keys.current["a"] || keys.current["arrowleft"]) mx -= 1;
    if (keys.current["d"] || keys.current["arrowright"]) mx += 1;
    // joystick
    mx += joystick.x;
    mz += -joystick.y;

    if (mx !== 0 || mz !== 0) {
      const move = new THREE.Vector3()
        .addScaledVector(forward, mz)
        .addScaledVector(right, mx);
      if (move.lengthSq() > 0) move.normalize().multiplyScalar(v);
      camera.position.add(move);
      // Clamp to arena
      const margin = 0.5;
      camera.position.x = Math.max(-bounds.w / 2 + margin, Math.min(bounds.w / 2 - margin, camera.position.x));
      camera.position.z = Math.max(-bounds.h / 2 + margin, Math.min(bounds.h / 2 - margin, camera.position.z));
      camera.position.y = 1.65;
    }
  });

  if (isMobile) return null;
  return <PointerLockControls ref={lockRef} />;
}
