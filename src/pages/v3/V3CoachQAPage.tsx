import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Circle, RotateCcw, ClipboardCheck } from "lucide-react";

/**
 * Mobilanpassad QA-checklista för coachvideoflödet.
 * Bocka av steg under en testkörning. Status persisteras lokalt på enheten.
 */

type Section = {
  id: string;
  title: string;
  items: { id: string; label: string; hint?: string }[];
};

const SECTIONS: Section[] = [
  {
    id: "entry",
    title: "1 · Hitta coach-flödet",
    items: [
      { id: "entry-nav", label: "Öppna /v3/coach via menyn på mobilen" },
      { id: "entry-status", label: "Länken 'Se status för mina inskickade videor' är synlig" },
      { id: "entry-intro", label: "Intro-text och coachens namn syns utan att klippas" },
    ],
  },
  {
    id: "form",
    title: "2 · Fyll i formuläret",
    items: [
      { id: "form-pack", label: "Välj paket (1, 3 eller 5 videor)" },
      { id: "form-sport", label: "Byt sport (Agility / Hoopers)" },
      { id: "form-dog", label: "Välj hund i listan" },
      { id: "form-question", label: "Skriv en fråga (≥ 5 tecken)" },
      { id: "form-privacy", label: "Växla sekretessläge mellan 'Endast jag' och 'exportera ej'" },
    ],
  },
  {
    id: "video",
    title: "3 · Välj video",
    items: [
      { id: "video-pick", label: "Välj en videofil från enheten" },
      { id: "video-toolarge", label: "Test: välj fil > 20 MB → får felmeddelande" },
      { id: "video-wrongtype", label: "Test: välj t.ex. en bild → får felmeddelande" },
      { id: "video-preview", label: "Filens namn och storlek visas i kortet" },
    ],
  },
  {
    id: "ack",
    title: "4 · Bekräftelseruta för sekretess",
    items: [
      { id: "ack-visible", label: "Sekretessrutan syns ovanför betala-knappen" },
      { id: "ack-text", label: "Texten matchar valt sekretessläge" },
      { id: "ack-disabled", label: "Betala-knappen är inaktiv tills checkboxen är ibockad" },
      { id: "ack-enable", label: "När checkboxen bockas i blir knappen aktiv" },
    ],
  },
  {
    id: "stripe",
    title: "5 · Stripe-betalning",
    items: [
      { id: "stripe-redirect", label: "Klick på 'Betala & skicka' öppnar Stripe Checkout" },
      { id: "stripe-cancel", label: "Avbryt → tillbaka till /v3/coach med 'Betalningen avbröts'-toast" },
      { id: "stripe-success", label: "Genomför testbetalning → tillbaka med 'Betalning klar'-toast" },
      { id: "stripe-resume", label: "Frågan, sporten och sekretessen är förifyllda efter återkomst" },
    ],
  },
  {
    id: "upload",
    title: "6 · Slutför uppladdning",
    items: [
      { id: "upload-pickagain", label: "Välj samma video igen efter Stripe-redirect" },
      { id: "upload-success", label: "Toast: 'Video inskickad! Coachen kommer granska och svara.'" },
      { id: "upload-history", label: "Inlägget syns i historiklistan på coach-sidan" },
    ],
  },
  {
    id: "status",
    title: "7 · Statussida",
    items: [
      { id: "status-list", label: "Den nya inlämningen visas på /v3/coach/status" },
      { id: "status-steps", label: "Stegindikator: Mottagen → Analyseras → Klar" },
      { id: "status-privacy", label: "Sekretess-badge visas korrekt på inlämningen" },
    ],
  },
  {
    id: "thread",
    title: "8 · Coach-svar och följdfråga",
    items: [
      { id: "thread-notif", label: "Notis 'Din coach har svarat på din video!' kommer in" },
      { id: "thread-read", label: "Coachens svar går att läsa i tråden" },
      { id: "thread-followup", label: "Skicka en följdfråga (max 1 st)" },
      { id: "thread-coach-reply", label: "Coachens följdsvar visas i tråden" },
    ],
  },
  {
    id: "responsive",
    title: "9 · Mobilanpassning",
    items: [
      { id: "resp-iphone", label: "Allt får plats utan horisontell scroll på iPhone (375px)" },
      { id: "resp-android", label: "Knappar är ≥ 40px höga (lätta att träffa)" },
      { id: "resp-keyboard", label: "Tangentbord skymmer inte aktivt fält" },
      { id: "resp-bottomnav", label: "BottomNav är inte i vägen för betala-knappen" },
    ],
  },
];

const STORAGE_KEY = "coach_qa_checklist_v1";

export default function V3CoachQAPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [openSection, setOpenSection] = useState<string | null>(SECTIONS[0].id);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setChecked(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
    } catch { /* ignore */ }
  }, [checked]);

  const toggle = (id: string) =>
    setChecked((c) => ({ ...c, [id]: !c[id] }));

  const reset = () => {
    if (confirm("Återställa hela checklistan?")) setChecked({});
  };

  const { total, done } = useMemo(() => {
    const all = SECTIONS.flatMap((s) => s.items);
    return {
      total: all.length,
      done: all.filter((i) => checked[i.id]).length,
    };
  }, [checked]);

  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="min-h-screen bg-v3-bg pb-32">
      {/* Sticky header med progress */}
      <header className="sticky top-0 z-20 bg-v3-bg/95 backdrop-blur border-b border-v3-border">
        <div className="max-w-[720px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <Link
              to="/v3/coach"
              className="inline-flex items-center gap-1.5 text-v3-sm text-v3-text-secondary hover:text-v3-text-primary"
            >
              <ArrowLeft size={16} strokeWidth={1.8} /> Coach
            </Link>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 text-[12px] text-v3-text-tertiary hover:text-v3-text-secondary"
            >
              <RotateCcw size={13} strokeWidth={1.8} /> Återställ
            </button>
          </div>

          <div className="mt-3">
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <h1 className="font-v3-display text-[20px] tracking-[-0.01em] text-v3-text-primary inline-flex items-center gap-2">
                <ClipboardCheck size={20} strokeWidth={1.7} className="text-v3-brand-500" />
                QA · Coachvideoflöde
              </h1>
              <span className="text-[12px] font-medium text-v3-text-secondary tabular-nums">
                {done}/{total}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-v3-border overflow-hidden">
              <div
                className="h-full bg-v3-brand-500 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[720px] mx-auto px-4 py-4 space-y-3">
        <p className="text-[13px] text-v3-text-secondary leading-relaxed">
          Bocka av varje steg medan du testar. Status sparas lokalt på den här enheten.
        </p>

        {SECTIONS.map((section) => {
          const sectionDone = section.items.filter((i) => checked[i.id]).length;
          const isOpen = openSection === section.id;
          return (
            <section
              key={section.id}
              className="rounded-v3-xl border border-v3-border bg-v3-surface-1 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenSection(isOpen ? null : section.id)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left active:bg-v3-bg/50"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${
                      sectionDone === section.items.length
                        ? "bg-v3-brand-500 text-white"
                        : "bg-v3-border text-v3-text-secondary"
                    }`}
                  >
                    {sectionDone}/{section.items.length}
                  </div>
                  <h2 className="font-v3-display text-[15px] text-v3-text-primary truncate">
                    {section.title}
                  </h2>
                </div>
                <span className="text-[18px] text-v3-text-tertiary leading-none">
                  {isOpen ? "−" : "+"}
                </span>
              </button>

              {isOpen && (
                <ul className="border-t border-v3-border divide-y divide-v3-border">
                  {section.items.map((item) => {
                    const isDone = !!checked[item.id];
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => toggle(item.id)}
                          className="w-full flex items-start gap-3 px-4 py-3 text-left min-h-[52px] active:bg-v3-bg/50"
                        >
                          {isDone ? (
                            <CheckCircle2
                              size={20}
                              strokeWidth={2}
                              className="text-v3-brand-500 mt-0.5 shrink-0"
                            />
                          ) : (
                            <Circle
                              size={20}
                              strokeWidth={1.8}
                              className="text-v3-text-tertiary mt-0.5 shrink-0"
                            />
                          )}
                          <span
                            className={`text-[14px] leading-snug ${
                              isDone
                                ? "text-v3-text-tertiary line-through"
                                : "text-v3-text-primary"
                            }`}
                          >
                            {item.label}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}

        {pct === 100 && (
          <div className="rounded-v3-xl bg-v3-brand-500/10 border border-v3-brand-500/30 p-4 text-center">
            <div className="font-v3-display text-[16px] text-v3-brand-600 mb-0.5">
              Alla steg avbockade 🎉
            </div>
            <p className="text-[13px] text-v3-text-secondary">
              Coachflödet är genomtestat på den här enheten.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
