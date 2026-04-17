import { Activity, Trophy, CheckCircle2, Award, Calendar } from "lucide-react";

/**
 * Ren CSS/SVG-mockup av appens dashboard. Bytbar mot riktig screenshot
 * när vi tar en högupplöst sådan. Använder samma designtokens som appen.
 */
export function HeroDashboardMockup() {
  return (
    <div
      className="relative w-full font-sans-ds"
      role="img"
      aria-label="Skärmdump av AgilityManagers dashboard med statistik, hundar och aktivitet"
    >
      {/* Browser chrome */}
      <div className="rounded-ds-lg overflow-hidden border border-border-default bg-surface">
        <div className="h-8 border-b border-border-subtle flex items-center gap-1.5 px-3 bg-subtle/60">
          <span className="w-2.5 h-2.5 rounded-full bg-text-tertiary/30" />
          <span className="w-2.5 h-2.5 rounded-full bg-text-tertiary/30" />
          <span className="w-2.5 h-2.5 rounded-full bg-text-tertiary/30" />
          <span className="ml-3 text-[11px] text-text-tertiary tabular-nums">
            agilitymanager.se/dashboard
          </span>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 bg-page">
          {/* Header */}
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.08em] text-text-tertiary mb-1">
                Översikt
              </p>
              <h3 className="text-[18px] text-text-primary tracking-tight">
                Hej, Anna
              </h3>
            </div>
            <span className="text-[11px] text-text-tertiary">torsdag 17 apr</span>
          </div>

          {/* KPI grid */}
          <div className="grid grid-cols-4 gap-2 mb-5">
            {[
              { icon: Activity, label: "Pass / vecka", value: "4" },
              { icon: Trophy, label: "Starter", value: "12" },
              { icon: CheckCircle2, label: "Godkända", value: "9" },
              { icon: Award, label: "Pall", value: "3" },
            ].map((k) => (
              <div
                key={k.label}
                className="bg-surface border border-border-subtle rounded-ds-md p-3"
              >
                <k.icon className="w-3 h-3 text-text-tertiary mb-1.5" />
                <div className="text-[18px] text-text-primary tabular-nums leading-none">
                  {k.value}
                </div>
                <div className="text-[10px] text-text-tertiary mt-1">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Dogs row */}
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-text-tertiary mb-2">
              Mina hundar
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { name: "Luna", meta: "Border collie · K3", color: "hsl(158 69% 37%)" },
                { name: "Bella", meta: "Sheltie · K2", color: "hsl(33 79% 41%)" },
                { name: "Storm", meta: "Aussie · K1", color: "hsl(212 71% 54%)" },
              ].map((d) => (
                <div
                  key={d.name}
                  className="bg-surface border border-border-subtle rounded-ds-md p-2.5 flex items-center gap-2"
                >
                  <span
                    className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white text-[11px]"
                    style={{ background: d.color }}
                    aria-hidden
                  >
                    {d.name[0]}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[12px] text-text-primary leading-tight truncate">
                      {d.name}
                    </div>
                    <div className="text-[10px] text-text-tertiary leading-tight truncate">
                      {d.meta}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.08em] text-text-tertiary mb-2">
              Senaste aktivitet
            </p>
            <ul className="space-y-1">
              {[
                { t: "Träningspass loggat · Bana", time: "i går" },
                { t: "Tävlingsresultat importerat · Agility 1", time: "tis" },
                { t: "Mål uppnått · 5 godkända i rad", time: "mån" },
              ].map((a) => (
                <li
                  key={a.t}
                  className="flex items-center justify-between bg-surface border border-border-subtle rounded-ds-sm px-3 py-2"
                >
                  <span className="text-[12px] text-text-primary truncate">
                    {a.t}
                  </span>
                  <span className="text-[10px] text-text-tertiary shrink-0 ml-3">
                    {a.time}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Floating peek: Pass loggat */}
      <div
        className="hidden sm:flex absolute -left-6 top-24 bg-surface border border-border-default rounded-ds-md px-3 py-2 items-center gap-2 max-w-[200px]"
        aria-hidden
      >
        <span className="w-2 h-2 rounded-full bg-brand-500" />
        <div>
          <div className="text-[11px] text-text-primary leading-tight">
            Pass loggat
          </div>
          <div className="text-[10px] text-text-tertiary leading-tight">
            Luna · 32 min · Bana
          </div>
        </div>
      </div>

      {/* Floating peek: Nästa tävling */}
      <div
        className="hidden sm:flex absolute -right-6 bottom-16 bg-inverse text-text-on-inverse rounded-ds-md px-3 py-2 items-center gap-2"
        aria-hidden
      >
        <Calendar className="w-3.5 h-3.5 text-brand-500" />
        <div>
          <div className="text-[10px] uppercase tracking-[0.08em] opacity-60 leading-tight">
            Nästa tävling
          </div>
          <div className="text-[11px] leading-tight mt-0.5">
            SAgiK Stockholm · 18 maj
          </div>
        </div>
      </div>
    </div>
  );
}
