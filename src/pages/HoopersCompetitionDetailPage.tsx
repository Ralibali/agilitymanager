import { useEffect, useState, useMemo } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowLeft, MapPin, Calendar, Award, ExternalLink, Cloud, User, Mail, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SEO, buildBreadcrumbSchema } from "@/components/SEO";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooterV2 } from "@/components/landing/LandingFooterV2";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchWeatherForDate, describeWeather, type WeatherDay } from "@/lib/weatherForecast";
import { buildHoopersCompetitionPath, buildCompetitionSlug } from "@/lib/competitionSlug";

const SITE_URL = "https://agilitymanager.se";

interface HoopersCompetition {
  id: string;
  competition_id: string;
  competition_name: string | null;
  club_name: string | null;
  organizer: string | null;
  location: string | null;
  county: string | null;
  date: string | null;
  classes: string[] | null;
  judge: string | null;
  type: string | null;
  source_url: string | null;
  contact_person: string | null;
  contact_email: string | null;
  extra_info: string | null;
  registration_opens: string | null;
  registration_closes: string | null;
  registration_status: string | null;
  lopp_per_class: Record<string, number> | null;
  price_per_lopp: string | null;
  fetched_at: string | null;
}

function stripHtml(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function HoopersCompetitionDetailPage() {
  const { id } = useParams<{ id: string; slug?: string }>();
  const [comp, setComp] = useState<HoopersCompetition | null>(null);
  const [related, setRelated] = useState<HoopersCompetition[]>([]);
  const [weather, setWeather] = useState<WeatherDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("hoopers_competitions_public")
        .select("*")
        .eq("competition_id", decodeURIComponent(id))
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const c = data as unknown as HoopersCompetition;
      setComp(c);

      const today = new Date().toISOString().slice(0, 10);
      const relRes = await supabase
        .from("hoopers_competitions_public")
        .select("*")
        .gte("date", today)
        .neq("competition_id", c.competition_id)
        .order("date", { ascending: true })
        .limit(20);
      if (cancelled) return;
      const all = (relRes.data ?? []) as unknown as HoopersCompetition[];
      const sameCounty = c.county ? all.filter((r) => r.county === c.county) : [];
      setRelated((sameCounty.length ? sameCounty : all).slice(0, 6));

      fetchWeatherForDate(c.location, c.date).then((w) => {
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
    const name = stripHtml(comp.competition_name) || "Hooperstävling";
    const club = stripHtml(comp.club_name);
    const location = stripHtml(comp.location);
    const date = comp.date
      ? new Date(comp.date).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" })
      : "";
    const slug = buildCompetitionSlug({ club, name, location, date: comp.date });
    const path = `/tavlingar/hoopers/${encodeURIComponent(comp.competition_id)}/${slug}`;
    const title = `${name} – Hooperstävling, ${club}, ${location} ${date}`.trim();
    const description = `Hooperstävling arrangerad av ${club || "en svensk klubb"} i ${location || "Sverige"}${date ? ` den ${date}` : ""}. ${(comp.classes?.length || 0)} klasser. Anmälan via SHoK.`;
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

  const club = stripHtml(comp.club_name);
  const name = stripHtml(comp.competition_name) || "Hooperstävling";
  const location = stripHtml(comp.location);
  const isPast = comp.date ? new Date(comp.date) < new Date() : false;
  const totalLopp = comp.lopp_per_class
    ? Object.values(comp.lopp_per_class).reduce((sum, n) => sum + (Number(n) || 0), 0)
    : 0;

  const eventSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name,
    description: seoData.description,
    startDate: comp.date,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: location || club,
      address: {
        "@type": "PostalAddress",
        addressLocality: location,
        addressRegion: comp.county,
        addressCountry: "SE",
      },
    },
    organizer: club ? { "@type": "Organization", name: club } : undefined,
    sport: "Hoopers",
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
          <nav className="text-sm text-muted-foreground mb-4 flex items-center gap-2 flex-wrap">
            <Link to="/" className="hover:text-foreground">Hem</Link>
            <span>/</span>
            <Link to="/tavlingar" className="hover:text-foreground">Tävlingar</Link>
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

          <header className="mb-8">
            <div className="flex items-start gap-3 flex-wrap mb-3">
              <Badge variant="secondary">🐕 Hoopers</Badge>
              {comp.type && <Badge variant="outline">{comp.type}</Badge>}
              {comp.registration_status && (
                <Badge variant="outline">{comp.registration_status}</Badge>
              )}
              {isPast && <Badge variant="outline">Avslutad</Badge>}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">{name}</h1>
            {club && <p className="text-lg text-muted-foreground">Arrangör: {club}</p>}
          </header>

          <section className="grid sm:grid-cols-2 gap-4 mb-8">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="w-4 h-4" />
                Datum
              </div>
              <div className="text-foreground font-medium">{formatDate(comp.date)}</div>
              {comp.registration_opens && (
                <div className="text-xs text-muted-foreground mt-2">
                  Anmälan öppnar: {new Date(comp.registration_opens).toLocaleDateString("sv-SE")}
                </div>
              )}
              {comp.registration_closes && (
                <div className="text-xs text-muted-foreground">
                  Anmälan stänger: {new Date(comp.registration_closes).toLocaleDateString("sv-SE")}
                </div>
              )}
            </div>

            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <MapPin className="w-4 h-4" />
                Plats
              </div>
              <div className="text-foreground font-medium">{location || "Ej angivet"}</div>
              {comp.county && (
                <div className="text-xs text-muted-foreground mt-2">{comp.county} län</div>
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

          {comp.classes && comp.classes.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                <Award className="w-5 h-5" /> Klasser ({comp.classes.length})
              </h2>
              <div className="rounded-lg border bg-card p-4">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {comp.classes.map((c) => (
                    <Badge key={c} variant="outline">{c}</Badge>
                  ))}
                </div>
                {totalLopp > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Totalt {totalLopp} löp · {comp.price_per_lopp || "Pris ej angivet"}
                  </p>
                )}
              </div>
            </section>
          )}

          {comp.judge && (
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                <User className="w-5 h-5" /> Domare
              </h2>
              <div className="rounded-lg border bg-card p-4 text-foreground">{comp.judge}</div>
            </section>
          )}

          {(comp.contact_person || comp.contact_email) && (
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                <Mail className="w-5 h-5" /> Kontakt
              </h2>
              <div className="rounded-lg border bg-card p-4">
                {comp.contact_person && (
                  <div className="text-foreground">{comp.contact_person}</div>
                )}
                {comp.contact_email && (
                  <a
                    href={`mailto:${comp.contact_email}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {comp.contact_email}
                  </a>
                )}
              </div>
            </section>
          )}

          {comp.extra_info && (
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                <Info className="w-5 h-5" /> Information
              </h2>
              <div className="rounded-lg border bg-card p-4 text-foreground whitespace-pre-line">
                {stripHtml(comp.extra_info)}
              </div>
            </section>
          )}

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

          {!isPast && comp.source_url && (
            <section className="mb-8 rounded-lg border-2 border-primary/20 bg-primary/5 p-6">
              <h2 className="text-xl font-semibold text-foreground mb-2">Anmälan</h2>
              <p className="text-muted-foreground mb-4">
                Anmälan sker via Svenska Hoopersklubben (SHoK).
              </p>
              <Button asChild size="lg" className="gap-2">
                <a href={comp.source_url} target="_blank" rel="noopener noreferrer">
                  Gå till anmälan <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </section>
          )}

          <section className="mb-8 rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-2">Tävlar du här?</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Logga din anmälan, dina starter och resultat i AgilityManager — gratis.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button asChild>
                <Link to="/auth?mode=signup">Skapa konto</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/app/competition">Mina tävlingar</Link>
              </Button>
            </div>
          </section>

          {related.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                Liknande hooperstävlingar{comp.county ? ` i ${comp.county} län` : ""}
              </h2>
              <ul className="space-y-2">
                {related.map((r) => {
                  const rName = stripHtml(r.competition_name) || "Hooperstävling";
                  const rClub = stripHtml(r.club_name);
                  const rLoc = stripHtml(r.location);
                  const path = buildHoopersCompetitionPath(r.competition_id, {
                    club: rClub,
                    name: rName,
                    location: rLoc,
                    date: r.date,
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
                            {r.date && new Date(r.date).toLocaleDateString("sv-SE")}
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
            Källa: Svenska Hoopersklubben · Senast uppdaterad{" "}
            {comp.fetched_at && new Date(comp.fetched_at).toLocaleDateString("sv-SE")}
          </p>
        </div>
      </main>

      <LandingFooterV2 />
    </div>
  );
}
