from pathlib import Path
p = Path('src/features/course-planner-v2/importJson.ts')
s = p.read_text()
old = 'if (r.ruleSetId != null && requestedRule?.sport !== sport) warnings.push("Okänt regelverk eller fel sport — använder sportens standardregelverk.");'
new = '''if (r.ruleSetId != null && requestedRule?.sport !== sport) {
    warnings.push(requestedRule
      ? "Valt regelverk gäller inte för denna sport — använder sportens standardregelverk."
      : "Okänt regelverk — använder sportens standardregelverk.");
  }'''
assert old in s
p.write_text(s.replace(old, new))

# Keep one accessible live region and make actual save feedback visible on
# narrow screens without squeezing the course name and action buttons.
p = Path('src/pages/PlannerPage.tsx')
s = p.read_text()
start = s.index('            <span role="status" className="hidden max-w-48')
end = s.index('</span>', start) + len('</span>')
region = s[start:end].replace('className="hidden max-w-48 text-xs font-semibold lg:inline"', 'className="block border-t border-ink/10 px-3 py-1 text-xs font-semibold text-ink/70"')
s = s[:start] + s[end:]
s = s.replace('      </header>', region + '\n      </header>', 1)
p.write_text(s)
