import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Loader2, MessageSquare, PenLine, RefreshCw, Star, UserRound } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHero } from "@/components/PageHero";
import { Seo } from "@/components/Seo";
import { Reveal } from "@/components/Reveal";
import { supabase } from "@/integrations/supabase/client";
import CoursePreviewSvg, { type PreviewCourseData } from "@/features/planner-social/CoursePreviewSvg";
import { filterPublicCourses } from "@/features/planner-social/courseVisibility";

interface SharedCourse {
  id: string;
  name: string;
  sport: string;
  author_name: string;
  created_at: string;
  course_data: PreviewCourseData;
  ratingCount: number;
  ratingAvg: number;
  commentCount: number;
}

type SportFilter = "alla" | "agility" | "hoopers";
type SortKey = "senaste" | "betyg" | "populara";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" });

export default function SharedCoursesPage() {
  const [courses, setCourses] = useState<SharedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sport, setSport] = useState<SportFilter>("alla");
  const [sort, setSort] = useState<SortKey>("senaste");

  // loading startar som true — laddningen sätter inget state synkront,
  // så effekten nedan inte orsakar kaskadrenderingar
  // (react-hooks/set-state-in-effect).
  const load = useCallback(async () => {
    try {
      setLoadError(false);
      const { data: rows } = await supabase
        .from("planner_courses")
        .select("id, name, sport, author_name, created_at, course_data, is_public")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(60);

      // Defense in depth: filtrera på klientsidan också, och hämta bara
      // betyg/kommentarer för de publika banor vi faktiskt visar.
      const publicRows = filterPublicCourses(
        (rows as unknown as (Omit<SharedCourse, "ratingCount" | "ratingAvg" | "commentCount"> & { is_public?: boolean })[]) ?? [],
      );
      const ids = publicRows.map((c) => c.id);
      // Bounded reads: utan limit kan väldigt aktiva banor hämta obegränsat
      // många rader till varje besökare (60 banor × okänt antal rader).
      const [{ data: ratings }, { data: comments }] = ids.length
        ? await Promise.all([
            supabase.from("planner_course_ratings").select("course_id, rating").in("course_id", ids).limit(5000),
            supabase.from("planner_course_comments").select("course_id").in("course_id", ids).limit(5000),
          ])
        : [{ data: [] }, { data: [] }];

      const ratingMap = new Map<string, number[]>();
      for (const r of (ratings as { course_id: string; rating: number }[]) ?? []) {
        const list = ratingMap.get(r.course_id) ?? [];
        list.push(r.rating);
        ratingMap.set(r.course_id, list);
      }
      const commentMap = new Map<string, number>();
      for (const c of (comments as { course_id: string }[]) ?? []) {
        commentMap.set(c.course_id, (commentMap.get(c.course_id) ?? 0) + 1);
      }

      setCourses(
        publicRows.map((c) => {
          const rs = ratingMap.get(c.id) ?? [];
          return {
            ...c,
            ratingCount: rs.length,
            ratingAvg: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 0,
            commentCount: commentMap.get(c.id) ?? 0,
          };
        })
      );
    } catch {
      // Nätverksfel/okonfigurerad backend — visa felstate, inte evig spinner.
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Skjut upp första laddningen till en mikrotask så att ingen setState
  // sker synkront i effekten (react-hooks/set-state-in-effect).
  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const visible = useMemo(() => {
    const list = courses.filter((c) => sport === "alla" || c.sport === sport);
    return [...list].sort((a, b) => {
      if (sort === "betyg") return b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount;
      if (sort === "populara") return b.commentCount + b.ratingCount - (a.commentCount + a.ratingCount);
      return +new Date(b.created_at) - +new Date(a.created_at);
    });
  }, [courses, sport, sort]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Seo
        title="Delade banor — banor från communityn | AgilityManager"
        description="Bläddra bland banor som andra förare delat: agility och hoopers, med betyg och kommentarer. Öppna direkt i banplaneraren och bygg vidare — gratis."
        canonicalPath="/delade-banor"
      />
      <SiteNav />
      <PageHero kicker="Delade banor" title="Banor från communityn — öppna, testa, bygg vidare.">
        Här samlas banor som andra förare valt att dela publikt. Betygsätt, kommentera
        och öppna dem direkt i planeraren. Dela din egen bana från banplaneraren.
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        <Reveal>
          <div className="flex flex-wrap items-center gap-2">
            {(["alla", "agility", "hoopers"] as SportFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setSport(f)}
                aria-pressed={sport === f}
                className={`min-h-11 rounded-full border-2 px-5 text-sm font-bold capitalize transition-all ${
                  sport === f ? "border-ink bg-ink text-paper shadow-hard-sm" : "border-ink/15 bg-paper text-ink/60 hover:border-ink"
                }`}
              >
                {f === "alla" ? "Alla sporter" : f}
              </button>
            ))}
            <span className="mx-2 hidden h-6 w-px bg-ink/15 sm:block" />
            {([["senaste", "Senaste"], ["betyg", "Högst betyg"], ["populara", "Mest aktivitet"]] as [SortKey, string][]).map(
              ([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSort(key)}
                  aria-pressed={sort === key}
                  className={`min-h-11 rounded-full border-2 px-4 text-xs font-bold transition-all ${
                    sort === key ? "border-ink bg-forest text-paper shadow-hard-sm" : "border-ink/15 bg-paper text-ink/60 hover:border-ink"
                  }`}
                >
                  {label}
                </button>
              )
            )}
            <button
              onClick={onRefresh}
              className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-ink/15 bg-paper px-4 text-xs font-bold text-ink/60 transition-all hover:border-ink hover:text-ink"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
              Uppdatera
            </button>
          </div>
        </Reveal>

        {loading ? (
          <div className="mt-16 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-ink/40" aria-label="Laddar banor" />
          </div>
        ) : loadError ? (
          <div className="mt-16 text-center">
            <p className="text-lg font-semibold text-ink/50">Kunde inte hämta delade banor.</p>
            <p className="mt-1 text-sm text-ink/40">Kontrollera din uppkoppling och försök igen.</p>
            <button
              onClick={onRefresh}
              className="pressable shadow-hard-sm mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-ink bg-paper px-6 text-sm font-bold"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Försök igen
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="text-lg font-semibold text-ink/50">Inga delade banor här ännu.</p>
            <Link
              to="/banplanerare"
              className="pressable shadow-hard mt-6 inline-flex h-14 items-center gap-2 rounded-full bg-tang px-8 text-lg font-bold text-ink"
            >
              Bli först att dela en bana <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid min-w-0 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((c, i) => (
              <Reveal key={c.id} delay={Math.min(i, 6) * 70} className="min-w-0">
                <article className="group flex h-full flex-col overflow-hidden rounded-3xl border-2 border-ink bg-[#FCFAF4] shadow-hard transition-transform duration-300 hover:-translate-y-1.5">
                  <Link to={`/bana/${c.id}`} className="relative block overflow-hidden border-b-2 border-ink">
                    <CoursePreviewSvg data={c.course_data} className="h-48 w-full" label={`Banskiss: ${c.name}`} />
                    <span className="absolute left-4 top-4 rounded-full border-2 border-ink bg-paper px-3 py-1 text-[0.7rem] font-extrabold uppercase tracking-wider shadow-hard-sm">
                      {c.sport}
                    </span>
                  </Link>
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <div>
                      <h2 className="text-xl font-extrabold leading-tight tracking-tight">
                        <Link to={`/bana/${c.id}`} className="hover:underline">{c.name}</Link>
                      </h2>
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink/55">
                        <UserRound className="h-4 w-4" aria-hidden="true" /> {c.author_name} · {fmtDate(c.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-sm font-bold text-ink/70">
                      <span className="inline-flex items-center gap-1">
                        <Star className={`h-4 w-4 ${c.ratingCount ? "fill-tang text-tang" : "text-ink/30"}`} aria-hidden="true" />
                        {c.ratingCount ? `${c.ratingAvg.toFixed(1).replace(".", ",")} (${c.ratingCount})` : "Inga betyg"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="h-4 w-4 text-ink/40" aria-hidden="true" /> {c.commentCount}
                      </span>
                    </div>
                    <div className="mt-auto flex gap-2 pt-1">
                      <Link
                        to={`/bana/${c.id}`}
                        className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border-2 border-ink bg-paper text-sm font-bold"
                      >
                        Visa bana
                      </Link>
                      <Link
                        to={`/banplanerare?delad=${c.id}`}
                        className="pressable shadow-hard-sm inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-forest text-sm font-bold text-paper"
                      >
                        <PenLine className="h-4 w-4" aria-hidden="true" /> Bygg vidare
                      </Link>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
