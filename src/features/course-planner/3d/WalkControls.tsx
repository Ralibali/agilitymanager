import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

type RefObj<T> = { current: T };

export function WalkControls({
  joystickRef,
  lookDeltaRef,
  sprintRef,
  isMobile,
  speed = 2.4,
  sprintMul = 1.7,
  bounds,
}: {
  joystickRef: RefObj<{ x: number; y: number }>;
  lookDeltaRef: RefObj<{ x: number; y: number }>;
  sprintRef?: RefObj<boolean>;
  isMobile: boolean;
  speed?: number;
  sprintMul?: number;
  bounds: { w: number; h: number };
}) {
  const { camera, gl } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const yaw = useRef(0);
  const pitch = useRef(0);
  const initialized = useRef(false);

  // Sync initial yaw/pitch from camera quaternion (so we don't snap)
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const e = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
    yaw.current = e.y;
    pitch.current = e.x;
  }, [camera]);

  // Desktop: keyboard
  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
    };
    const up = (e: KeyboardEvent) => (keys.current[e.key.toLowerCase()] = false);
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", dn);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Desktop: pointer lock + mouse look
  useEffect(() => {
    if (isMobile) return;
    const canvas = gl.domElement;
    const onClick = () => {
      if (document.pointerLockElement !== canvas) {
        try {
          canvas.requestPointerLock();
        } catch {
          /* ignore */
        }
      }
    };
    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      yaw.current -= e.movementX * 0.0025;
      pitch.current -= e.movementY * 0.0025;
      pitch.current = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch.current));
    };
    canvas.addEventListener("click", onClick);
    document.addEventListener("mousemove", onMove);
    return () => {
      canvas.removeEventListener("click", onClick);
      document.removeEventListener("mousemove", onMove);
      if (document.pointerLockElement === canvas) {
        try {
          document.exitPointerLock();
        } catch {
          /* ignore */
        }
      }
    };
  }, [gl, isMobile]);

  useFrame((_, dt) => {
    // Mobile: integrate look delta and consume it
    if (isMobile) {
      const ld = lookDeltaRef.current;
      if (ld.x !== 0 || ld.y !== 0) {
        yaw.current -= ld.x * 0.004;
        pitch.current -= ld.y * 0.004;
        pitch.current = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch.current));
        ld.x = 0;
        ld.y = 0;
      }
    }
    // Apply rotation
    const euler = new THREE.Euler(pitch.current, yaw.current, 0, "YXZ");
    camera.quaternion.setFromEuler(euler);

    // Movement
    const sprint = keys.current["shift"] || sprintRef?.current ? sprintMul : 1;
    const v = speed * sprint * dt;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() > 0) forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    let mx = 0;
    let mz = 0;
    if (keys.current["w"] || keys.current["arrowup"]) mz += 1;
    if (keys.current["s"] || keys.current["arrowdown"]) mz -= 1;
    if (keys.current["a"] || keys.current["arrowleft"]) mx -= 1;
    if (keys.current["d"] || keys.current["arrowright"]) mx += 1;
    const js = joystickRef.current;
    mx += js.x;
    mz += -js.y;

    if (mx !== 0 || mz !== 0) {
      const move = new THREE.Vector3()
        .addScaledVector(forward, mz)
        .addScaledVector(right, mx);
      if (move.lengthSq() > 0) move.normalize().multiplyScalar(v);
      camera.position.add(move);
    }
    const margin = 0.4;
    camera.position.x = Math.max(-bounds.w / 2 + margin, Math.min(bounds.w / 2 - margin, camera.position.x));
    camera.position.z = Math.max(-bounds.h / 2 + margin, Math.min(bounds.h / 2 - margin, camera.position.z));
    camera.position.y = 1.65;
  });

  return null;
}
