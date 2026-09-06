from pathlib import Path
p = Path('playwright.config.ts')
s = p.read_text()
old = 'npx vite --port 8080 --strictPort'
assert old in s
p.write_text(s.replace(old, 'npx vite --host 127.0.0.1 --port 8080 --strictPort'))

# An absent FCI reference time is not a zero-second reference time.
p = Path('src/pages/PlannerPage.tsx')
s = p.read_text()
old = '{draft.classTemplate && times && ` · ref ${(times.refTimeS ?? 0).toFixed(0)} s`}'
assert old in s
p.write_text(s.replace(old, '{draft.classTemplate && times.refTimeS != null && ` · beräknad tid ${times.refTimeS.toFixed(0)} s`}'))
