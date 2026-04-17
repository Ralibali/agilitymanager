const ORGS = ["SKK", "SHoK", "SAgiK", "Agidadata", "Svenska Hoopersklubben"];

export function TrustBar() {
  return (
    <section className="bg-page font-sans-ds border-y border-border-subtle">
      <div className="max-w-[1180px] mx-auto px-5 md:px-12 py-7 text-center">
        <p className="text-[11px] uppercase tracking-[0.08em] text-text-secondary mb-4">
          Anpassad för
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {ORGS.map((o) => (
            <li
              key={o}
              className="text-[14px] font-medium text-text-tertiary tracking-tight"
            >
              {o}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
