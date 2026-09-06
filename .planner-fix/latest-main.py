"""Retain the completed parallel run's final regression tests.
Its behavior changes (FCI class import, empty draft restoration, adoption after
editing external copies, curved bounds) are already implemented in the reviewed
version and covered by browser tests. Keep its geometry API as an alias to the
same world-space sampler, not a second shape definition.
"""
from pathlib import Path
import subprocess
MAIN = 'cacf059d77072f71f33dddcdb53f0c4aeb835a8f'
for name in ['ruleSetRoundtrip.test.ts', 'tunnelBounds.test.ts']:
    path = 'src/features/course-planner-v2/' + name
    Path(path).write_bytes(subprocess.check_output(['git', 'show', MAIN + ':' + path]))
p = Path('src/features/course-planner-v2/tunnelGeometry.ts')
with p.open('a') as f:
    f.write('''
/** Compatibility entry point; uses the exact geometry rendered by the editor. */
export function tunnelWorldAabb(center: { x: number; y: number }, width: number, depth: number,
  rotation: number, degrees = 0, side: "left" | "right" = "right") {
  return tunnelBounds(width, depth, degrees, side, rotation, center.x, center.y);
}
''')
print('Final parallel main regression tests retained:', MAIN)
