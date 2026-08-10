export function OfficialCourseMapNotes({ courseLengthM, ringWidthM, ringHeightM }: { courseLengthM: number; ringWidthM: number; ringHeightM: number }) {
  return (
    <div className="pointer-events-none absolute bottom-3 right-3 hidden min-w-40 border border-slate-500 bg-white/95 px-2.5 py-2 text-[9px] leading-3.5 text-slate-800 shadow-sm md:block">
      <div className="font-bold uppercase tracking-wide">BANINFORMATION</div>
      <div className="mt-1 grid grid-cols-[auto_1fr] gap-x-2"><span>Banlängd</span><b>{courseLengthM.toFixed(1)} m</b><span>Banområde</span><b>{ringWidthM} × {ringHeightM} m</b><span>Ritning</span><b>AgilityManager</b></div>
    </div>
  );
}

export function AxisLabels({ widthM, heightM }: { widthM: number; heightM: number }) {
  const xTicks = Array.from({ length: Math.floor(widthM / 5) + 1 }, (_, i) => i * 5).filter(v => v <= widthM);
  const yTicks = Array.from({ length: Math.floor(heightM / 5) + 1 }, (_, i) => i * 5).filter(v => v <= heightM);
  return <div className="pointer-events-none absolute inset-0 text-[8px] font-medium text-slate-500">
    {xTicks.map(v => <span key={`x-${v}`} className="absolute -top-3 -translate-x-1/2" style={{left:`${(v/widthM)*100}%`}}>{v}</span>)}
    {yTicks.map(v => <span key={`y-${v}`} className="absolute -left-5 -translate-y-1/2" style={{top:`${(v/heightM)*100}%`}}>{v}</span>)}
  </div>;
}
