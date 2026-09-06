from pathlib import Path
p = Path('src/features/course-planner-v2/judgePdf.ts')
s = p.read_text()
start = s.index('  /* SCT per storleksklass */')
end = s.index('  /* Hinderfördelning', start)
s = s[:start] + '''  /* Samma tidsmodell som editorn; inga påhittade storleksfaktorer. */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Tidsuppgifter för vald klass", margin, sy);
  sy += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const timeLines = [
    times.refTimeS != null ? `Beräknad tid: ${times.refTimeS} s (planeringsuppskattning).`
      : "Ingen referenstid beräknas för detta regelverk och denna klass.",
    times.maxTimeS != null
      ? `${times.fixedMaxCourseTimeS != null ? "Fast maxtid enligt valt regelverk" : "Beräknad maxtid"}: ${times.maxTimeS} s.`
      : "Ingen maxtid beräknas för denna bana.",
    "Planeringsunderlag - inte ett domargodkännande.",
  ];
  timeLines.forEach(line => { doc.text(line, margin, sy); sy += 5; });
  sy += 4;

''' + s[end:]
start = s.index('  /* Hindermått enligt regelverket')
end = s.index('  /* Banbyggar-koordinater */', start)
s = s[:start] + '''  /* Ingen generell agility-höjdtabell på Hoopers eller klasspecifika banor. */
  doc.setTextColor(...PDF_BRAND.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Kontroll av hinder", margin, py);
  py += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Kontrollera hinderutförande, mått och placering mot valt regelverk på plats.", margin, py);
  py += 8;

''' + s[end:]
s = s.replace(' · ref ${times.refTimeS ?? "—"} s · max ', ' · beräknad tid ${times.refTimeS ?? "—"} s · max ')
p.write_text(s)
p = Path('src/features/course-planner-v2/startlistPdf.ts')
s = p.read_text()
s = s.replace('`Hinder: ${a.obstacles.length}`', '`Hinder: ${a.obstacles.filter(o => !["start", "finish", "number", "handler_zone"].includes(o.type)).length}`')
s = s.replace('`Banlängd: ${times.lengthM.toFixed(1)} m`', '`Beräknad hundväg: ${times.lengthAlongPathM.toFixed(1)} m`')
s = s.replace('`Referenstid: ${times.refTimeS} s`', '`Beräknad tid: ${times.refTimeS} s`')
s = s.replace('`Maxtid: ${times.maxTimeS} s`', '`${times.fixedMaxCourseTimeS != null ? "Fast maxtid" : "Beräknad maxtid"}: ${times.maxTimeS} s`')
s = s.replace('  doc.text(meta, M, 34);', '  const metaLines = doc.splitTextToSize(meta, W - M * 2);\n  doc.text(metaLines, M, 34);')
s = s.replace('  let y = 44;', '  let y = Math.max(44, 38 + metaLines.length * 5);')
s = s.replace('.filter((o) => o.number != null)', '.filter((o) => o.number != null && !["start", "finish", "number", "handler_zone"].includes(o.type))')
p.write_text(s)
