import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Sitemap-generering körs nu som postbuild-steg i package.json:s
// build-script (efter generate-static-pages.mjs), så att sitemap.xml
// alltid speglar de faktiskt prerenderade routes under dist/.

function coursePlannerBugfixPlugin() {
  return {
    name: "agilitymanager-course-planner-bugfixes",
    enforce: "pre" as const,
    transform(code: string, id: string) {
      if (!id.replace(/\\/g, "/").endsWith("/src/pages/v3/V3CoursePlannerPageFixed.tsx")) return null;

      let next = code;

      // Keep tunnel bending as real obstacle data, not only 3D/localStorage state.
      next = next.replace(
        "type Obstacle = ObstacleSpec & { id: string; x: number; y: number; rotation: number; number?: number; color?: string };",
        "type Obstacle = ObstacleSpec & { id: string; x: number; y: number; rotation: number; number?: number; color?: string; curveDeg?: number; curveSide?: \"left\" | \"right\" };",
      );

      // Add common indoor/outdoor sizes used in Swedish halls and full FCI/SKK style layouts.
      next = next.replace(
        'const SIZES = [{ label: "20 × 30 m", width: 20, height: 30 }, { label: "20 × 40 m", width: 20, height: 40 }, { label: "30 × 30 m", width: 30, height: 30 }, { label: "30 × 40 m", width: 30, height: 40 }, { label: "40 × 20 m", width: 40, height: 20 }];',
        'const SIZES = [{ label: "20 × 30 m", width: 20, height: 30 }, { label: "30 × 20 m", width: 30, height: 20 }, { label: "20 × 40 m", width: 20, height: 40 }, { label: "30 × 30 m", width: 30, height: 30 }, { label: "30 × 40 m", width: 30, height: 40 }, { label: "40 × 20 m", width: 40, height: 20 }, { label: "40 × 40 m", width: 40, height: 40 }];',
      );

      // Helpers for meter-aware snap/erase distances. Coordinates are still stored in percent.
      next = next.replace(
        "const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);",
        "const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);\nconst distanceMeters = (course: CourseState, a: Point, b: Point) => Math.hypot(((a.x - b.x) / 100) * course.width, ((a.y - b.y) / 100) * course.height);\nconst snapPointToMeters = (course: CourseState, p: Point, snapMeters = 0.5): Point => ({ x: clamp((Math.round(((p.x / 100) * course.width) / snapMeters) * snapMeters / course.width) * 100, 0, 100), y: clamp((Math.round(((p.y / 100) * course.height) / snapMeters) * snapMeters / course.height) * 100, 0, 100) });",
      );

      // Snap to fixed real-world metres instead of arbitrary percent steps.
      next = next.replace(
        "    if (snap) { x = Math.round(x / 2) * 2; y = Math.round(y / 2) * 2; }\n    return { x: clamp(x, 0, 100), y: clamp(y, 0, 100) };",
        "    const p = { x: clamp(x, 0, 100), y: clamp(y, 0, 100) };\n    return snap ? snapPointToMeters(course, p, 0.5) : p;",
      );

      // New tunnels get curve fields from the beginning so JSON/library/export can carry them.
      next = next.replace(
        'const obstacle: Obstacle = { ...spec, id: uid(spec.type), x: 16 + ((course.obstacles.length * 12) % 68), y: 18 + ((course.obstacles.length * 9) % 64), rotation: spec.type.includes("tunnel") ? 18 : 0, number: numbered ? nextNumber : undefined, color: "#ffffff" };',
        'const obstacle: Obstacle = { ...spec, id: uid(spec.type), x: 16 + ((course.obstacles.length * 12) % 68), y: 18 + ((course.obstacles.length * 9) % 64), rotation: spec.type.includes("tunnel") ? 18 : 0, number: numbered ? nextNumber : undefined, color: "#ffffff", ...(spec.type.includes("tunnel") ? { curveDeg: 0, curveSide: "left" as const } : {}) };',
      );

      // Keep the obstacle menu open after adding an obstacle, especially on mobile/tablet.
      // The old behavior closed the menu after every add, which made repeated course building painful.
      next = next.replace(
        "    if (isMobile) setLeftOpen(false);",
        "    if (isMobile) setLeftOpen(true);",
      );

      // Eraser radius should be metric, not anisotropic percent distance.
      next = next.replace(
        "const hit = course.obstacles.find(o => distance(p, o) < 4.5);",
        "const hit = course.obstacles.find(o => distanceMeters(course, p, o) < 1.5);",
      );
      next = next.replace(
        "setPaths(prev => prev.filter(path => !path.points.some(pt => distance(p, pt) < 3.5)));",
        "setPaths(prev => prev.filter(path => !path.points.some(pt => distanceMeters(course, p, pt) < 1.2)));",
      );
      next = next.replace(
        "const removed = course.numbers.filter(n => distance(p, n) <= 4);",
        "const removed = course.numbers.filter(n => distanceMeters(course, p, n) <= 1.2);",
      );
      next = next.replace(
        "const numbers = prev.numbers.filter(n => distance(p, n) > 4);",
        "const numbers = prev.numbers.filter(n => distanceMeters(course, p, n) > 1.2);",
      );

      // Erase while dragging, and avoid adding excessive draw points on every pointermove.
      next = next.replace(
        "  const fieldMove = (event: PointerEvent<HTMLDivElement>) => {\n    const p = toPoint(event);\n    if (draggingId)",
        "  const fieldMove = (event: PointerEvent<HTMLDivElement>) => {\n    const p = toPoint(event);\n    if (toolMode === \"erase\" && event.buttons > 0) { eraseNear(p.x, p.y); return; }\n    if (draggingId)",
      );
      next = next.replace(
        "    if (drawing && currentPath) setCurrentPath({ ...currentPath, points: [...currentPath.points, p] });",
        "    if (drawing && currentPath) { const last = currentPath.points[currentPath.points.length - 1]; if (!last || distanceMeters(course, last, p) >= 0.18) setCurrentPath({ ...currentPath, points: [...currentPath.points, p] }); }",
      );

      // Desktop shortcuts: Delete/Backspace removes selected, R rotates, Esc deselects.
      // Skip shortcuts when typing in inputs or when overlays like saved-library/3D are active.
      next = next.replace(
        "  useEffect(() => {\n    if (!fullscreen) return;\n    const prev = document.body.style.overflow;\n    document.body.style.overflow = \"hidden\";\n    const onKey = (e: KeyboardEvent) => e.key === \"Escape\" && setFullscreen(false);\n    window.addEventListener(\"keydown\", onKey);\n    return () => { document.body.style.overflow = prev; window.removeEventListener(\"keydown\", onKey); };\n  }, [fullscreen]);",
        "  useEffect(() => {\n    if (!fullscreen) return;\n    const prev = document.body.style.overflow;\n    document.body.style.overflow = \"hidden\";\n    const onKey = (e: KeyboardEvent) => e.key === \"Escape\" && setFullscreen(false);\n    window.addEventListener(\"keydown\", onKey);\n    return () => { document.body.style.overflow = prev; window.removeEventListener(\"keydown\", onKey); };\n  }, [fullscreen]);\n\n  useEffect(() => {\n    const onKey = (e: KeyboardEvent) => {\n      const target = e.target as HTMLElement | null;\n      const tag = target?.tagName?.toLowerCase();\n      if (tag === \"input\" || tag === \"textarea\" || tag === \"select\" || target?.isContentEditable) return;\n      if (view3DMode || savedOpen || guide) return;\n      if ((e.key === \"Delete\" || e.key === \"Backspace\") && selectedId) { e.preventDefault(); deleteSelected(); return; }\n      if (e.key.toLowerCase() === \"r\" && selectedId) { e.preventDefault(); rotateSelected(e.shiftKey ? -15 : 15); return; }\n      if (e.key === \"Escape\" && selectedId) { e.preventDefault(); setSelectedId(null); setDraggingId(null); }\n    };\n    window.addEventListener(\"keydown\", onKey);\n    return () => window.removeEventListener(\"keydown\", onKey);\n  });",
      );

      // PDF: preserve correct aspect ratio within the available box, including portrait fields.
      next = next.replace(
        "const marginX = 18, top = 33, fieldW = 262, fieldH = Math.min(150, fieldW * (course.height / course.width));",
        "const maxW = 262, maxH = 150, ratio = course.width / course.height;\n    const fieldW = ratio >= maxW / maxH ? maxW : maxH * ratio;\n    const fieldH = ratio >= maxW / maxH ? maxW / ratio : maxH;\n    const marginX = 18 + (maxW - fieldW) / 2, top = 33;",
      );

      // PDF: draw each freehand path with its own selected color.
      next = next.replace(
        "pdf.setDrawColor(...hexToRgb(DRAW_RED)); pdf.setLineWidth(0.7); if (typeof pdf.setLineDashPattern === \"function\") pdf.setLineDashPattern([2, 1.6], 0);\n    for (const path of course.paths) { if (path.points.length < 2) continue; const first = toPdf(path.points[0]); pdf.moveTo(first.x, first.y); for (const pt of path.points.slice(1)) { const p = toPdf(pt); pdf.lineTo(p.x, p.y); } pdf.stroke(); }",
        "pdf.setLineWidth(0.7); if (typeof pdf.setLineDashPattern === \"function\") pdf.setLineDashPattern([2, 1.6], 0);\n    for (const path of course.paths) { if (path.points.length < 2) continue; pdf.setDrawColor(...hexToRgb(path.color || DRAW_RED)); const first = toPdf(path.points[0]); pdf.moveTo(first.x, first.y); for (const pt of path.points.slice(1)) { const p = toPdf(pt); pdf.lineTo(p.x, p.y); } pdf.stroke(); }",
      );

      // Pass persisted tunnel curve data into the 3D viewer.
      next = next.replace(
        "({ id: o.id, type: o.type, x: o.x, y: o.y, rotation: o.rotation, number: o.number, color: o.color, label: o.label }))}",
        "({ id: o.id, type: o.type, x: o.x, y: o.y, rotation: o.rotation, number: o.number, color: o.color, label: o.label, curveDeg: o.curveDeg, curveSide: o.curveSide }))}",
      );

      return next === code ? null : { code: next, map: null };
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [
      coursePlannerBugfixPlugin(),
      react(),
      mode === "development" && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || 'https://rcubbmnosawdtaupixnm.supabase.co'),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjdWJibW5vc2F3ZHRhdXBpeG5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NTE2MDIsImV4cCI6MjA4ODUyNzYwMn0.8YWtXNIWkDLU90G7EgOMTsXUh1jY8SOv1eHSpeWpqcA'),
      'import.meta.env.VITE_SUPABASE_PROJECT_ID': JSON.stringify(env.VITE_SUPABASE_PROJECT_ID || 'rcubbmnosawdtaupixnm'),
    },
  };
});
