import { useEffect, useMemo } from "react";
import * as THREE from "three";

/**
 * Text i 3D-vyn ritad på en canvas-textur.
 *
 * Ersätter drei/troika `<Text>`, som hämtar typsnitt från ett externt CDN
 * (cdn.jsdelivr.net). Misslyckas den hämtningen hänger hela 3D-scenen i
 * Suspense och blir tom — och sajten lovar att typsnitt bara hämtas från egen
 * domän. Här används sajtens egna, redan inladdade typsnitt.
 */
export interface CanvasTextProps {
  children: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** Teckenhöjd i meter. */
  fontSize?: number;
  color?: string;
  outlineColor?: string;
  /** Konturbredd i meter. */
  outlineWidth?: number;
  /** Maxbredd i meter — längre text skalas ned. */
  maxWidth?: number;
  fontWeight?: number;
  renderOrder?: number;
  /** false = ritas alltid överst (t.ex. nummerbrickor). */
  depthTest?: boolean;
}

const PX_PER_EM = 128;

export function CanvasText({
  children,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  fontSize = 0.3,
  color = "#ffffff",
  outlineColor,
  outlineWidth = 0,
  maxWidth,
  fontWeight = 800,
  renderOrder,
  depthTest = true,
}: CanvasTextProps) {
  const { texture, aspect } = useMemo(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const font = `${fontWeight} ${PX_PER_EM}px Archivo, "Helvetica Neue", Arial, sans-serif`;
    const outlinePx = outlineWidth > 0 ? Math.max(2, (outlineWidth / fontSize) * PX_PER_EM * 2) : 0;
    let width = PX_PER_EM;
    if (ctx) {
      ctx.font = font;
      width = Math.ceil(ctx.measureText(children).width) + outlinePx * 2 + 16;
    }
    const height = Math.ceil(PX_PER_EM * 1.3 + outlinePx * 2);
    canvas.width = Math.max(8, width);
    canvas.height = height;
    if (ctx) {
      ctx.font = font;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const cx = canvas.width / 2;
      const cy = canvas.height / 2 + PX_PER_EM * 0.04;
      if (outlinePx > 0 && outlineColor) {
        ctx.lineJoin = "round";
        ctx.lineWidth = outlinePx;
        ctx.strokeStyle = outlineColor;
        ctx.strokeText(children, cx, cy);
      }
      ctx.fillStyle = color;
      ctx.fillText(children, cx, cy);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return { texture: tex, aspect: canvas.width / canvas.height };
  }, [children, color, outlineColor, outlineWidth, fontSize, fontWeight]);

  useEffect(() => () => texture.dispose(), [texture]);

  let h = fontSize * 1.3;
  let w = h * aspect;
  if (maxWidth && w > maxWidth) {
    h *= maxWidth / w;
    w = maxWidth;
  }

  return (
    <mesh position={position} rotation={rotation} renderOrder={renderOrder}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} depthTest={depthTest} toneMapped={false} />
    </mesh>
  );
}
