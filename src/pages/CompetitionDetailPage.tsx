import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Seo, SITE_URL } from "@/components/Seo";
import { CompetitionDetailView, type DetailFact } from "@/components/competitions/CompetitionDetailView";
import {
  AGILITY_SELECT,
  agilityToUnified,
  dateRange,
  longDate,
  stripHtml,
  type AgilityCompetition,
  type UnifiedCompetition,
} from "@/lib/competitionData";

export default function CompetitionDetailPage() {
  const { id } = useParams<{ id: string; slug?: string }>();
  const [row, setRow] = useState<AgilityCompetition | null>(null);
  const [related, setRelated] = useState<UnifiedCompetition[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setState("loading");
    });
    (async () => {
      const { data, error } = await supabase
        .from("competitions")
        .select(AGILITY_SELECT)
        .eq("id", decodeURIComponent(id))
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setState("missing");
        return;
      }
      const comp = data as unknown as AgilityCompetition;
      setRow(comp);
      setState("ready");

      const today = new Date().toISOString().slice(0, 10);
      const rel = await supabase
        .from("competitions")
        .select(AGILITY_SELECT)
        .gte("date_start", today)
        .neq("id", comp.id)
        .order("date_start", { ascending: true })
        .limit(60);
      if (cancelled) return;
      const all = ((rel.data ?? []) as unknown as AgilityCompetition[]).map(agilityToUnified);
      const mine = agilityToUnified(comp);
      const nearby = all.filter((c) => c.county && mine.county && c.county === mine.county);
      setRelated((nearby.length ? nearby : all).slice(0, 3));
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const unified = useMemo(() => (row ? agilityToUnified(row) : null), [row]);

  if (state === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-paper text-ink/60">Laddar tävling…</div>
    );
  }

  if (state === "missing" || !row || !unified) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <SiteNav />
        <div className="mx-auto max-w-3xl px-4 py-40 text-center">
          <h1 className="font-display text-6xl">Tävlingen hittades inte</h1>
          <p className="mt-4 text-ink/60">
            Den kan ha tagits bort från källan eller redan varit genomförd.
          </p>
          <Link
            to="/tavlingar"
            className="mt-8 inline-flex rounded-full border-2 border-ink bg-ink px-6 py-3 font-bold text-paper shadow-hard-sm"
          >
            Till tävlingskalendern
          </Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const facts: DetailFact[] = [
    { label: "Arrangör", value: unified.club || "Ej angiven" },
    { label: "Plats", value: [unified.location, unified.county].filter(Boolean).join(" · ") || "Ej angiven" },
    { label: "Datum", value: dateRange(unified.dateStart, unified.dateEnd) },
    { label: "Sista anmälningsdag", value: unified.registrationCloses ? longDate(unified.registrationCloses) : "Ej angiven" },
    { label: "Inomhus / utomhus", value: stripHtml(row.indoor_outdoor) || "Ej angivet" },
    { label: "Status", value: row.status || "Ej angiven" },
    { label: "Domare", value: unified.judges.length ? unified.judges.join(", ") : "Ej publicerad" },
    { label: "Sport", value: "Agility" },
  ];

  const title = `${unified.name} – ${unified.club || "agilitytävling"}, ${unified.location} ${
    unified.dateStart ? unified.dateStart.slice(0, 10) : ""
  }`.trim();
  const description = `Agilitytävling i ${unified.location || "Sverige"}${
    unified.club ? ` arrangerad av ${unified.club}` : ""
  }${unified.dateStart ? ` den ${longDate(unified.dateStart)}` : ""}. Klasser, domare, sista anmälningsdag och plats.`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: unified.name,
    startDate: unified.dateStart ?? undefined,
    endDate: unified.dateEnd ?? unified.dateStart ?? undefined,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    sport: "Dog agility",
    location: {
      "@type": "Place",
      name: unified.location || "Sverige",
      address: { "@type": "PostalAddress", addressLocality: unified.location || "", addressCountry: "SE" },
    },
    organizer: unified.club ? { "@type": "Organization", name: unified.club } : undefined,
    url: `${SITE_URL}${unified.path}`,
  };

  return (
    <>
      <Seo
        title={title.slice(0, 70)}
        description={description.slice(0, 158)}
        canonicalPath={unified.path}
        jsonLd={jsonLd}
      />
      <CompetitionDetailView
        comp={unified}
        facts={facts}
        updatedAt={row.fetched_at}
        related={related}
      />
    </>
  );
}
