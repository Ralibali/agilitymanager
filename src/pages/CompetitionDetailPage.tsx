import { useEffect, useState, useMemo } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowLeft, MapPin, Calendar, Award, ExternalLink, Trophy, Cloud, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SEO, buildBreadcrumbSchema } from "@/components/SEO";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooterV2 } from "@/components/landing/LandingFooterV2";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchWeatherForDate, describeWeather, type WeatherDay } from "@/lib/weatherForecast";
import { buildAgilityCompetitionPath, buildCompetitionSlug } from "@/lib/competitionSlug";
import { CITY_TO_COUNTY } from "@/lib/swedishCityCounty";
import type { Competition } from "@/types/competitions";

const SITE_URL = "https://agilitymanager.se";

function formatDateRange(start: string | null, end: string | null): string {
  if (!start) return "—";
  const s = new Date(start).toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  if (!end || end === start) return s;
  const e = new Date(end).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" });
  return `${s} – ${e}`;
}

function stripHtml(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

export default function CompetitionDetailPage() {
  const { id } = useParams<{ id: string; slug?: string }>();
  const [comp, setComp] = useState<Competition | null>(null);
  const [related, setRelated] = useState<Competition[]>([]);
  const [weather, setWeather] = useState<WeatherDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("competitions")
        .select("*")
        .eq("id", decodeURIComponent(id))
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setComp(data as Competition);

      // Liknande tävlingar — samma region eller datum nära
      const today = new Date().toISOString().slice(0, 10);
      const relRes = await supabase
        .from("competitions")
        .select("*")
        .gte("date_start", today)
        .neq("id", data.id)
        .order("date_start", { ascending: true })
        .limit(50);
      if (cancelled) return;
      const all = (relRes.data ?? []) as Competition[];
      const sameRegion = all.filter((c) => {
        const cRegion = c.location ? CITY_TO_COUNTY[c.location.toLowerCase()] : null;
        const ourRegion = data.location ? CITY_TO_COUNTY[data.location.toLowerCase()] : null;
        return cRegion && ourRegion && cRegion === ourRegion;
      });
      setRelated((sameRegion.length ? sameRegion : all).slice(0, 6));

      // Väder
      fetchWeatherForDate(data.location, data.date_start).then((w) => {
        if (!cancelled) setWeather(w);
      });

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const seoData = useMemo(() => {
    if (!comp) return null;
    const name = stripHtml(comp.competition_name) || "Agilitytävling";
    const club = stripHtml(comp.club_name);
    const location = stripHtml(comp.location);
    const date = comp.date_start
      ? new Date(comp.date_start).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" })
      : "";
    const slug = buildCompetitionSlug({ club, name, location, date: comp.date_start });
    const path = `/tavlingar/${encodeURIComponent(comp.id)}/${slug}`;
    const title = `${name} – ${club}, ${location} ${date}`.trim();
    const description = `Agilitytävling arrangerad av ${club || "en svensk klubb"} i ${location || "Sverige"}${date ? ` den ${date}` : ""}. ${
      (comp.classes_agility?.length || 0) + (comp.classes_hopp?.length || 0)
    } klasser. Anmälningsinfo, domare och plats.`;
    return { title, description, canonical: path, slug };
  }, [comp]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Laddar tävling…</div>
      </div>
    );
  }

  if (notFound || !comp || !seoData) {
    return <Navigate to="/tavlingar" replace />;
  }

  const ourRegion = comp.location ? CITY_TO_COUNTY[comp.location.toLowerCase()] : null;
  const club = stripHtml(comp.club_name);
  const name = stripHtml(comp.competition_name) || "Agilitytävling";
  const location = stripHtml(comp.location);
  const allClasses = [...(comp.classes_agility || []), ...(comp.classes_hopp || []), ...(comp.classes_other || [])];
  const isPast = comp.date_start ? new Date(comp.date_start) < new Date() : false;

  // JSON-LD: SportsEvent + BreadcrumbList
  const eventSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name,
    description: seoData.description,
    startDate: comp.date_start,
    endDate: comp.date_end ?? comp.date_start,
    eventStatus: isPast
      ? "https://schema.org/EventScheduled"
      : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: location || club,
      address: {
        "@type": "PostalAddress",
        addressLocality: location,
        addressRegion: ourRegion,
        addressCountry: "SE",
      },
    },
    organizer: club
      ? {
          "@type": "Organization",
          name: club,
        }
      : undefined,
    sport: "Agility",
    url: `${SITE_URL}${seoData.canonical}`,
  };

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Hem", url: "/" },
    { name: "Tävlingar", url: "/tavlingar" },
    { name, url: seoData.canonical },
  ]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title={seoData.title}
        description={seoData.description}
        canonical={seoData.canonical}
        ogType="article"
        jsonLd={[eventSchema, breadcrumbSchema]}
      />

      <LandingNav />

      <main className="flex-1 pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <nav className="text-sm text-muted-foreground mb-4 flex items-center gap-2 flex-wrap">
            <Link to="/" className="hover:text-foreground">
              Hem
            </Link>
            <span>/</span>
            <Link to="/tavlingar" className="hover:text-foreground">
              Tävlingar
            </Link>
            <span>/</span>
            <span className="text-foreground truncate">{name}</span>
          </nav>

          <Link
            to="/tavlingar"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Alla tävlingar
          </Link>

          {/* Hero */}
          <header className="mb-8">
            <div className="flex items-start gap-3 flex-wrap mb-3">
              <Badge variant="secondary" className="gap-1">
                <Trophy className="w-3 h-3" /> Agility
              </Badge>
              {comp.indoor_outdoor && (
                <Badge variant="outline">{comp.indoor_outdoor}</Badge>
              )}
              {comp.status && <Badge variant="outline">{comp.status}</Badge>}
              {isPast && <Badge variant="outline">Avslutad</Badge>}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">{name}</h1>
            {club && <p className="text-lg text-muted-foreground">Arrangör: {club}</p>}
          </header>

          {/* Quick info */}
          <section className="grid sm:grid-cols-2 gap-4 mb-8">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="w-4 h-4" />
                Datum
              </div>
              <div className="text-foreground font-medium">
                {formatDateRange(comp.date_start, comp.date_end)}
              </div>
              {comp.last_registration_date && (
                <div className="text-xs text-muted-foreground mt-2">
                  Sista anmälningsdag:{" "}
                  {new Date(comp.last_registration_date).toLocaleDateString("sv-SE")}
                </div>
              )}
            </div>

            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <MapPin className="w-4 h-4" />
                Plats
              </div>
              <div className="text-foreground font-medium">{location || "Ej angivet"}</div>
              {ourRegion && (
                <div className="text-xs text-muted-foreground mt-2">{ourRegion} län</div>
              )}
              {location && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location + ", Sverige")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                >
                  Visa på karta <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </section>

          {/* Classes */}
          {allClasses.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                <Award className="w-5 h-5" /> Klasser ({allClasses.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {comp.classes_agility?.length > 0 && (
                  <div className="rounded-lg border bg-card p-4">
                    <h3 className="font-medium text-foreground mb-2">Agility</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {comp.classes_agility.map((c) => (
                        <Badge key={c} variant="outline">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {comp.classes_hopp?.length > 0 && (
                  <div className="rounded-lg border bg-card p-4">
                    <h3 className="font-medium text-foreground mb-2">Hopp</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {comp.classes_hopp.map((c) => (
                        <Badge key={c} variant="outline">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {comp.classes_other?.length > 0 && (
                  <div className="rounded-lg border bg-card p-4 sm:col-span-2">
                    <h3 className="font-medium text-foreground mb-2">Övrigt</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {comp.classes_other.map((c) => (
                        <Badge key={c} variant="outline">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Judges */}
          {comp.judges && comp.judges.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                <Users className="w-5 h-5" /> Domare
              </h2>
              <ul className="rounded-lg border bg-card divide-y">
                {comp.judges.map((j) => (
                  <li key={j} className="px-4 py-3 text-foreground">
                    {j}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Weather */}
          {weather && (
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                <Cloud className="w-5 h-5" /> Väderprognos
              </h2>
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-2xl font-semibold text-foreground">
                    {Math.round(weather.tempMin)}° / {Math.round(weather.tempMax)}°
                  </span>
                  <span className="text-muted-foreground">{describeWeather(weather.weatherCode)}</span>
                  {weather.precip > 0 && (
                    <span className="text-sm text-muted-foreground">
                      Nederbörd: {weather.precip.toFixed(1)} mm
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Prognos från Open-Meteo · uppdateras dagligen
                </p>
              </div>
            </section>
          )}

          {/* CTA */}
          {!isPast && comp.source_url && (
            <section className="mb-8 rounded-lg border-2 border-primary/20 bg-primary/5 p-6">
              <h2 className="text-xl font-semibold text-foreground mb-2">Anmälan</h2>
              <p className="text-muted-foreground mb-4">
                Anmälan sker via Agilitydata.se — den officiella SBK-portalen för svensk agility.
              </p>
              <Button asChild size="lg" className="gap-2">
                <a href={comp.source_url} target="_blank" rel="noopener noreferrer">
                  Gå till anmälan <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </section>
          )}

          {/* Logga i appen */}
          <section className="mb-8 rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-2">Tävlar du här?</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Logga din anmälan, dina starter och resultat i AgilityManager — gratis.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button asChild variant="default">
                <Link to="/auth?mode=signup">Skapa konto</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/app/competition">Mina tävlingar</Link>
              </Button>
            </div>
          </section>

          {/* Related */}
          {related.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                Liknande tävlingar{ourRegion ? ` i ${ourRegion} län` : ""}
              </h2>
              <ul className="space-y-2">
                {related.map((r) => {
                  const rName = stripHtml(r.competition_name) || "Tävling";
                  const rClub = stripHtml(r.club_name);
                  const rLoc = stripHtml(r.location);
                  const path = buildAgilityCompetitionPath(r.id, {
                    club: rClub,
                    name: rName,
                    location: rLoc,
                    date: r.date_start,
                  });
                  return (
                    <li key={r.id}>
                      <Link
                        to={path}
                        className="block rounded-lg border bg-card p-4 hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-baseline justify-between gap-3 flex-wrap">
                          <div className="font-medium text-foreground">{rName}</div>
                          <div className="text-sm text-muted-foreground">
                            {r.date_start &&
                              new Date(r.date_start).toLocaleDateString("sv-SE")}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {[rClub, rLoc].filter(Boolean).join(" · ")}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <p className="text-xs text-muted-foreground mt-12">
            Källa: Agilitydata.se · Senast uppdaterad{" "}
            {comp.fetched_at && new Date(comp.fetched_at).toLocaleDateString("sv-SE")}
          </p>
        </div>
      </main>

      <LandingFooterV2 />
    </div>
  );
}
