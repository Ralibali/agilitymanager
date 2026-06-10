/**
 * Visuella skelett för PreviewGate. Innehåller INGEN faktisk användardata —
 * bara form/struktur så användaren ser vad funktionen erbjuder.
 */
export function StatsPreviewSkeleton() {
  return (
    <div className="max-w-[1100px] mx-auto px-5 lg:px-10 py-6 lg:py-10 space-y-6">
      <div className="space-y-2">
        <div className="v3-skeleton h-3 w-32 rounded" />
        <div className="v3-skeleton h-10 w-2/3 rounded-v3-base" />
        <div className="v3-skeleton h-4 w-1/2 rounded" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="v3-skeleton h-[92px] rounded-v3-xl" />
        <div className="v3-skeleton h-[92px] rounded-v3-xl" />
        <div className="v3-skeleton h-[92px] rounded-v3-xl" />
        <div className="v3-skeleton h-[92px] rounded-v3-xl" />
      </div>
      <div className="v3-skeleton h-64 rounded-v3-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="v3-skeleton h-48 rounded-v3-2xl" />
        <div className="v3-skeleton h-48 rounded-v3-2xl" />
      </div>
    </div>
  );
}

export function CoursePlannerPreviewSkeleton() {
  return (
    <div className="w-full min-h-[80vh] p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="v3-skeleton h-9 w-48 rounded-v3-base" />
        <div className="flex gap-2">
          <div className="v3-skeleton h-9 w-20 rounded-v3-base" />
          <div className="v3-skeleton h-9 w-24 rounded-v3-base" />
        </div>
      </div>
      <div className="grid grid-cols-[260px_1fr] gap-4">
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="v3-skeleton h-12 rounded-v3-base" />
          ))}
        </div>
        <div className="v3-skeleton h-[600px] rounded-v3-2xl" />
      </div>
    </div>
  );
}
