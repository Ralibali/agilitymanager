import { StaggerContainer, StaggerItem } from "@/components/motion";

const ORGS = ["SKK", "SHoK", "SAgiK", "Agidadata", "Svenska Hoopersklubben"];

const PROOF_POINTS = [
  { value: "1", label: "plats för hela hundens resa" },
  { value: "10 sek", label: "för att logga ett pass" },
  { value: "0 kr", label: "att börja med" },
];

export function TrustBar() {
  return (
    <section className="bg-page font-sans-ds border-y border-border-subtle">
      <div className="max-w-[1180px] mx-auto px-5 md:px-12 py-8">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-7 items-center">
          <div className="text-center lg:text-left">
            <p className="text-[11px] uppercase tracking-[0.08em] text-text-secondary mb-2">
              Byggd för svensk agility & hoopers
            </p>
            <p className="text-[15px] leading-relaxed text-text-primary max-w-xl mx-auto lg:mx-0">
              En lugnare träningsvardag för dig som vill se mönster, minnas känslan och växa tillsammans med din hund.
            </p>
          </div>

          <div>
            <StaggerContainer
              staggerDelay={0.06}
              initialDelay={0.45}
              scroll={false}
              className="grid grid-cols-3 gap-2 mb-5"
            >
              {PROOF_POINTS.map((point) => (
                <StaggerItem
                  key={point.label}
                  distance={6}
                  duration="smooth"
                  className="rounded-2xl border border-border-subtle bg-white/70 px-3 py-3 text-center"
                >
                  <div className="font-display text-[22px] leading-none text-text-primary">{point.value}</div>
                  <div className="text-[11px] leading-tight text-text-tertiary mt-1">{point.label}</div>
                </StaggerItem>
              ))}
            </StaggerContainer>

            <StaggerContainer
              staggerDelay={0.06}
              initialDelay={0.65}
              scroll={false}
              className="flex flex-wrap items-center justify-center lg:justify-end gap-x-6 gap-y-2"
            >
              {ORGS.map((o) => (
                <StaggerItem
                  key={o}
                  distance={6}
                  duration="smooth"
                  className="text-[13px] font-medium text-text-tertiary tracking-tight"
                >
                  {o}
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
