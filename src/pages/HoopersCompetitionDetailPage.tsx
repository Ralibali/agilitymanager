import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Seo, SITE_URL } from "@/components/Seo";
import { CompetitionDetailView, type DetailFact } from "@/components/competitions/CompetitionDetailView";
import {
  HOOPERS_SELECT,
  hoopersToUnified,
  longDate,
  stripHtml,
  type HoopersCompetition,
  type UnifiedCompetition,
} from "@/lib/competitionData";

export default function HoopersCompetitionDetailPage() {
  const { id } = useParams<{ id: string; slug?: string }>();
  const [row, setRow] = useState<HoopersCompetition | null>(null);
  const [related, setRelated] = useState<UnifiedCompetition[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setState("loading");
    (async () => {
      const { data, error } = await supabase
        .from("hoopers_competitions")
        .select(HOOPERS_SELECT)
        .eq("competition_id", decodeURIComponent(id))
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setState("missing");
        return;
      }
      const comp = data as unknown as HoopersCompetition;
      setRow(comp);
      setState("ready");

      const today = new Date().toISOString().slice(0, 10);
      const rel = await supabase
        .from("hoopers_competitions")
        .select(HOOPERS_SELECT)
        .gte("date", today)
        .neq("competition_id", comp.competition_id)
        .order("date", { ascending: true })
        .limit(30);
      if (cancelled) return;
      setRelated(((rel.data ?? []) as unknown as HoopersCompetition[]).map(hoopersToUnified).slice(0, 3));
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const unified = useMemo(() => (row ? hoopersToUnified(row) : null), [row]);

  if (state === "loading") {
    return <div className="grid min-h-screen place-items-center bg-paper text-ink/60">Laddar tävling…</div>;
  }

  if (state === "missing" || !row || !unified) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <SiteNav />
        <div className="mx-auto max-w-3xl px-4 py-40 text-center">
          <h1 className="font-display text-6xl">Tävlingen hittades inte</h1>
          <p className="mt-4 text-ink/60">Den kan ha tagits bort från källan eller redan varit genomförd.</p>
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
    { label: "Datum", value: unified.dateStart ? longDate(unified.dateStart) : "Ej satt" },
    { label: "Anmälan öppnar", value: row.registration_opens ? longDate(row.registration_opens) : "Ej angiven" },
    { label: "Sista anmälningsdag", value: unified.registrationCloses ? longDate(unified.registrationCloses) : "Ej angiven" },
    { label: "Pris per lopp", value: stripHtml(row.price_per_lopp) || "Ej angivet" },
    { label: "Typ", value: stripHtml(row.type) || "Ej angiven" },
    { label: "Domare", value: unified.judges.length ? unified.judges.join(", ") : "Ej publicerad" },
    { label: "Kontakt", value: [stripHtml(row.contact_person), row.contact_email].filter(Boolean).join(" · ") || "Ej angiven" },
    { label: "Sport", value: "Hoopers" },
  ];

  const title = `${unified.name} – hoopers i ${unified.location} ${unified.dateStart?.slice(0, 10) ?? ""}`.trim();
  const description = `Hooperstävling i ${unified.location || "Sverige"}${
    unified.club ? ` arrangerad av ${unified.club}` : ""
  }${unified.dateStart ? ` den ${longDate(unified.dateStart)}` : ""}. Klasser, anmälningstider, pris och kontakt.`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: unified.name,
    startDate: unified.dateStart ?? undefined,
    endDate: unified.dateStart ?? undefined,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    sport: "Dog hoopers",
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
        notes={stripHtml(row.extra_info) || undefined}
      />
    </>
  );
}
