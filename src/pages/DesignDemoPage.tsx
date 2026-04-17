import {
  DSCard,
  DSButton,
  DSInput,
  StatusBadge,
  DSEmptyState,
  PageSkeleton,
} from "@/components/ds";
import { Trophy, Plus, Search, Inbox, ArrowRight } from "lucide-react";

/**
 * Fas 1 – visuell godkänningsida för designsystemet.
 * Renderar samtliga primitives sida vid sida.
 * Route: /design-demo
 */
export default function DesignDemoPage() {
  return (
    <div className="min-h-screen bg-page font-sans-ds text-text-primary">
      <div className="max-w-[1200px] mx-auto px-9 py-10 space-y-12">
        {/* Header */}
        <header className="space-y-2">
          <p className="text-micro text-text-tertiary uppercase">Fas 1</p>
          <h1 className="text-display text-text-primary">Designsystem</h1>
          <p className="text-body text-text-secondary max-w-[560px]">
            Lugn, modern, nordisk. Inter-font, två vikter, sparsam färg, 0.5px-borders, inga shadows.
            Detta är referensytan för alla primitives som används i kommande faser.
          </p>
        </header>

        {/* Färger */}
        <section className="space-y-4">
          <h2 className="text-h1 text-text-primary">Färger</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Swatch name="bg-page" cls="bg-page border-[0.5px] border-border-default" />
            <Swatch name="bg-surface" cls="bg-surface border-[0.5px] border-border-default" />
            <Swatch name="bg-subtle" cls="bg-subtle" />
            <Swatch name="bg-inverse" cls="bg-inverse" dark />
            <Swatch name="brand-50" cls="bg-brand-50" />
            <Swatch name="brand-100" cls="bg-brand-100" />
            <Swatch name="brand-500" cls="bg-brand-500" dark />
            <Swatch name="brand-600" cls="bg-brand-600" dark />
            <Swatch name="amber-50" cls="bg-amber-50" />
            <Swatch name="amber-500" cls="bg-amber-500" dark />
            <Swatch name="success" cls="bg-semantic-success" dark />
            <Swatch name="danger" cls="bg-semantic-danger" dark />
          </div>
        </section>

        {/* Typografi */}
        <section className="space-y-4">
          <h2 className="text-h1">Typografi</h2>
          <DSCard className="space-y-3">
            <div className="flex items-baseline gap-4">
              <span className="text-micro text-text-tertiary uppercase w-20">display</span>
              <span className="text-display">Hej Christoffer</span>
            </div>
            <div className="flex items-baseline gap-4">
              <span className="text-micro text-text-tertiary uppercase w-20">h1</span>
              <span className="text-h1">Sidrubrik</span>
            </div>
            <div className="flex items-baseline gap-4">
              <span className="text-micro text-text-tertiary uppercase w-20">h2</span>
              <span className="text-h2">Sektionsrubrik</span>
            </div>
            <div className="flex items-baseline gap-4">
              <span className="text-micro text-text-tertiary uppercase w-20">body</span>
              <span className="text-body">Brödtext för paragrafer och beskrivningar.</span>
            </div>
            <div className="flex items-baseline gap-4">
              <span className="text-micro text-text-tertiary uppercase w-20">small</span>
              <span className="text-small text-text-secondary">Metadata och undertitel</span>
            </div>
            <div className="flex items-baseline gap-4">
              <span className="text-micro text-text-tertiary uppercase w-20">micro</span>
              <span className="text-micro text-text-tertiary uppercase">UPPERCASE-LABEL</span>
            </div>
          </DSCard>
        </section>

        {/* Knappar */}
        <section className="space-y-4">
          <h2 className="text-h1">Knappar</h2>
          <DSCard className="space-y-5">
            <Row label="Primary">
              <DSButton variant="primary" size="sm">Spara</DSButton>
              <DSButton variant="primary">Spara</DSButton>
              <DSButton variant="primary" size="lg">
                <Plus />
                Logga träning
              </DSButton>
            </Row>
            <Row label="Secondary">
              <DSButton variant="secondary" size="sm">Avbryt</DSButton>
              <DSButton variant="secondary">Avbryt</DSButton>
              <DSButton variant="secondary">
                <ArrowRight />
                Läs mer
              </DSButton>
            </Row>
            <Row label="Ghost">
              <DSButton variant="ghost">Skip</DSButton>
              <DSButton variant="ghost" size="icon"><Search /></DSButton>
            </Row>
            <Row label="Destructive">
              <DSButton variant="destructive">Ta bort</DSButton>
            </Row>
            <Row label="Disabled">
              <DSButton disabled>Spara</DSButton>
              <DSButton variant="secondary" disabled>Avbryt</DSButton>
            </Row>
          </DSCard>
        </section>

        {/* Inputs */}
        <section className="space-y-4">
          <h2 className="text-h1">Inputs</h2>
          <DSCard className="space-y-3 max-w-md">
            <div className="space-y-1.5">
              <label className="text-small text-text-secondary block">Hundens namn</label>
              <DSInput placeholder="t.ex. Luna" />
            </div>
            <div className="space-y-1.5">
              <label className="text-small text-text-secondary block">Email</label>
              <DSInput type="email" placeholder="namn@exempel.se" defaultValue="christoffer@example.se" />
            </div>
            <div className="space-y-1.5">
              <label className="text-small text-text-secondary block">Inaktiv</label>
              <DSInput disabled placeholder="Kan ej redigeras" />
            </div>
          </DSCard>
        </section>

        {/* Status badges */}
        <section className="space-y-4">
          <h2 className="text-h1">Status badges</h2>
          <DSCard>
            <div className="flex flex-wrap gap-2">
              <StatusBadge variant="success" label="Godkänd" />
              <StatusBadge variant="warning" label="Väntar" />
              <StatusBadge variant="info" label="Info" />
              <StatusBadge variant="danger" label="Fel" />
              <StatusBadge variant="neutral" label="Neutral" />
              <StatusBadge variant="pro" label="Pro" />
              <StatusBadge variant="intern" label="Intern" />
            </div>
          </DSCard>
        </section>

        {/* Card-varianter */}
        <section className="space-y-4">
          <h2 className="text-h1">Card-varianter</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <DSCard variant="default">
              <p className="text-micro text-text-tertiary uppercase mb-2">Default</p>
              <p className="text-h2 mb-1">Vit yta</p>
              <p className="text-body text-text-secondary">
                Standardkort med 0.5px subtle border. Används för det mesta.
              </p>
            </DSCard>
            <DSCard variant="highlight">
              <p className="text-micro text-text-tertiary uppercase mb-2">Highlight</p>
              <p className="text-h2 mb-1">Subtil yta</p>
              <p className="text-body text-text-secondary">
                Beige bakgrund utan border – KPI-kort och accentsektioner.
              </p>
            </DSCard>
            <DSCard variant="inverse">
              <p className="text-micro text-text-on-inverse/60 uppercase mb-2">Inverse</p>
              <p className="text-h2 mb-1">Mörk yta</p>
              <p className="text-body text-text-on-inverse/80">
                Mörkt kort för Pro-features och hero-CTA.
              </p>
            </DSCard>
          </div>
        </section>

        {/* Empty state */}
        <section className="space-y-4">
          <h2 className="text-h1">Empty state</h2>
          <DSCard>
            <DSEmptyState
              icon={Inbox}
              title="Inga tävlingar anmälda ännu"
              description="Anmäl dig till en tävling på Agida så dyker den upp här automatiskt."
              action={
                <DSButton variant="primary">
                  <Plus />
                  Lägg till tävling
                </DSButton>
              }
            />
          </DSCard>
        </section>

        {/* Page skeleton */}
        <section className="space-y-4">
          <h2 className="text-h1">Page skeleton</h2>
          <DSCard>
            <PageSkeleton cards={3} />
          </DSCard>
        </section>

        {/* Sammansatt exempel */}
        <section className="space-y-4">
          <h2 className="text-h1">Sammansatt exempel</h2>
          <DSCard>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-h2">Nästa tävling</h3>
                  <StatusBadge variant="success" label="Anmäld" />
                </div>
                <p className="text-small text-text-secondary">Gunnered Agility Cup · Göteborg</p>
              </div>
              <Trophy size={20} strokeWidth={1.5} className="text-text-tertiary" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-display">12</p>
                <p className="text-micro text-text-tertiary uppercase">dagar kvar</p>
              </div>
              <DSButton variant="secondary">
                Visa detaljer
                <ArrowRight />
              </DSButton>
            </div>
          </DSCard>
        </section>

        <div className="pt-8 pb-12 text-center">
          <p className="text-small text-text-tertiary">
            Fas 1 · Designsystem · Inväntar godkännande för Fas 2 (shell-arkitektur)
          </p>
        </div>
      </div>
    </div>
  );
}

function Swatch({ name, cls, dark }: { name: string; cls: string; dark?: boolean }) {
  return (
    <div className="space-y-1.5">
      <div className={`h-16 rounded-ds-md ${cls}`} />
      <p className={`text-small font-sans-ds ${dark ? "text-text-primary" : "text-text-secondary"}`}>
        {name}
      </p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-micro text-text-tertiary uppercase w-24 shrink-0">{label}</span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
