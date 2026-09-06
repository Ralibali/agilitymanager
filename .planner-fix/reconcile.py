"""Reconcile the two implementations of this same authorized change.
Preserve the delayed main commit's added tests, helpers, dependency locks and
browser setup. Use the reviewed reliability implementation for overlapping
fixes, with one shared geometry implementation and backwards-compatible APIs.
No unrelated main changes are discarded; the source ref is pinned.
"""
from pathlib import Path
import subprocess

BASE = 'd0ebc6432c53b2d787630291e9fccdc904e9dacd'
MAIN = '36627ed4a47de85e34fd26736929afa75f6234ea'
def git(*args):
    return subprocess.check_output(['git', *args])
def main_file(path):
    return git('show', MAIN + ':' + path)
def write(path, data):
    p = Path(path); p.parent.mkdir(parents=True, exist_ok=True); p.write_bytes(data)

ours = set(git('diff', '--name-only').decode().splitlines())
changed_main = git('diff', '--name-only', BASE, MAIN).decode().splitlines()
for path in changed_main:
    if path not in ours or path == 'src/features/course-planner-v2/importJson.test.ts':
        write(path, main_file(path))

ci = Path('.github/workflows/planner-ci.yml')
our_browser_job = ci.read_text().split('\n  verify-browser:', 1)[1]
ci.write_text(main_file(str(ci)).decode().rstrip() + '\n\n  verify-browser:' + our_browser_job)
ignore = Path('.gitignore')
ignore.write_text(main_file(str(ignore)).decode().rstrip() + '\nqa-artifacts/\n__pycache__/\n')

# The delayed implementation exposes a local geometry API. Reuse it rather
# than maintaining two independent definitions of the same tunnel arc.
p = Path('src/features/course-planner-v2/tunnelGeometry.ts')
p.write_bytes(main_file(str(p)))
with p.open('a') as out:
    out.write('''
/** World-space sampled geometry shared by rendering, bounds and playback.
 * The old local API retains analytic length; this API reports sampled length
 * so playback distance is exactly the length of the displayed polyline. */
export function tunnelGeometry(width: number, degrees = 0, side: "left" | "right" = "right", rotation = 0, x = 0, y = 0) {
  const w = Number.isFinite(width) ? Math.max(0.001, width) : 3;
  const deg = normalizeCurveDeg(degrees);
  const g = tunnelGeometryLocal(w, deg, side, Math.max(TUNNEL_SAMPLES, Math.ceil(deg / 2)));
  const points = g.centerline.map(p => toWorld(p, x, y, rotation));
  points[0] = toWorld({ x: -w / 2, y: 0 }, x, y, rotation);
  points[points.length - 1] = toWorld({ x: w / 2, y: 0 }, x, y, rotation);
  let length = 0;
  for (let i = 1; i < points.length; i++) length += Math.hypot(points[i].x - points[i-1].x, points[i].y - points[i-1].y);
  const angle = deg * Math.PI / 180;
  const radius = deg >= 0.5 ? w / (2 * Math.sin(angle / 2)) : 0;
  return { points, length, entry: points[0], exit: points[points.length-1],
    entryDir: rotateDir(g.entryDir, rotation), exitDir: rotateDir(g.exitDir, rotation),
    samplingErrorM: radius ? radius * (1 - Math.cos(angle / (2 * (points.length-1)))) : 0 };
}
export function tunnelBounds(width: number, depth: number, degrees: number, side: "left" | "right", rotation: number, x: number, y: number) {
  const g = tunnelGeometry(width, degrees, side, rotation, x, y);
  const padding = depth / 2 + g.samplingErrorM;
  return { minX: Math.min(...g.points.map(p => p.x)) - padding,
    maxX: Math.max(...g.points.map(p => p.x)) + padding,
    minY: Math.min(...g.points.map(p => p.y)) - padding,
    maxY: Math.max(...g.points.map(p => p.y)) + padding };
}
''')

def replace(path, old, new):
    p = Path(path); text = p.read_text()
    assert old in text, f'Missing expected code in {path}: {old[:70]}'
    p.write_text(text.replace(old, new))

# Keep the delayed geometry test's public anchor property as an alias.
dog = 'src/features/course-planner-v2/dogPath.ts'
replace(dog, '  internalPoints?: Vec2[];', '  internalPoints?: Vec2[];\n  innerPoints: Vec2[];')
replace(dog, 'obstacle: ob, center, entry: center, exit: center,', 'obstacle: ob, center, entry: center, exit: center, innerPoints: [center, center],')
replace(dog, 'internalLengthM: g.length, internalPoints: g.points,', 'internalLengthM: g.length, internalPoints: g.points, innerPoints: g.points,')
replace(dog, 'internalLengthM: def.sizeM.d, entryDir:', 'internalLengthM: def.sizeM.d, innerPoints: [entry, exit], entryDir:')
replace(dog, 'internalPoints: a.internalPoints?.slice().reverse(),', 'internalPoints: a.internalPoints?.slice().reverse(),\n    innerPoints: a.innerPoints.slice().reverse(),')

# Browser regression found deferred React updater callbacks reading an already
# changed ref. Capture the old draft BEFORE changing the ref (undo and redo).
planner = 'src/pages/PlannerPage.tsx'
replace(planner, 'setFuture(f => [draftRef.current, ...f]);', 'const current = draftRef.current;\n    setFuture(f => [current, ...f]);')
replace(planner, 'setPast(p => [...p.slice(-49), draftRef.current]);', 'const current = draftRef.current;\n    setPast(p => [...p.slice(-49), current]);')

# Existing browser test reads the initial debounced draft; await its actual
# persistence rather than assuming React's effect has already completed.
e2e = 'e2e/planner.e2e.ts'
replace(e2e, 'await page.getByRole("button", { name: "Ångra", exact: false }).first().waitFor();', 'await page.getByRole("button", { name: "Ångra", exact: false }).first().waitFor();\n  await expect.poll(async () => (await draft(page))?.ruleSetId).toBeTruthy();')
print('Reconciled source against main', MAIN, 'without removing either test suite.')
