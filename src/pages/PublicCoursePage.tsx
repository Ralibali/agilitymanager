import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Loader2, MessageSquare, Star, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Seo } from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";
import { isPubliclyVisible } from "@/features/planner-social/courseVisibility";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import CoursePreviewSvg, { type PreviewCourseData } from "@/features/planner-social/CoursePreviewSvg";
import PlannerProfileDialog from "@/features/planner-social/PlannerProfileDialog";
import { plannerApi, usePlannerProfile } from "@/lib/plannerProfile";

interface CourseRow {
  id: string;
  name: string;
  sport: string;
  author_name: string;
  created_at: string;
  course_data: PreviewCourseData;
  is_public?: boolean;
}

interface CommentRow {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
}

export default function PublicCoursePage() {
  const { id = "" } = useParams();
  const { profile } = usePlannerProfile();
  const [course, setCourse] = useState<CourseRow | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [ratings, setRatings] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | "comment" | number>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [{ data: c }, { data: cm }, { data: rt }] = await Promise.all([
        // Bara explicit publika banor — RLS spärrar redan, men dubbelkolla här
        // så att privata banor aldrig exponeras även om en policy ändras.
        supabase.from("planner_courses").select("id, name, sport, author_name, created_at, course_data, is_public").eq("id", id).eq("is_public", true).maybeSingle(),
        // Bounded reads: utan limit kan en bana med extremt många rader
        // hämta obegränsat mycket data till varje besökare.
        supabase.from("planner_course_comments").select("id, author_name, body, created_at").eq("course_id", id).order("created_at", { ascending: false }).limit(100),
        supabase.from("planner_course_ratings").select("rating").eq("course_id", id).limit(1000),
      ]);
      const row = (c as unknown as CourseRow) ?? null;
      setCourse(isPubliclyVisible(row) ? row : null);
      setComments((cm as CommentRow[]) ?? []);
      setRatings(((rt as { rating: number }[]) ?? []).map((r) => r.rating));
    } catch {
      // Nätverksfel/okonfigurerad backend — visa felstate i stället för
      // en evig spinner.
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  const requireProfile = (action: "comment" | number) => {
    if (profile) return true;
    setPendingAction(action);
    setProfileOpen(true);
    return false;
  };

  const postComment = async () => {
    if (!body.trim()) return;
    if (!requireProfile("comment")) return;
    setPosting(true);
    try {
      await plannerApi("comment", { courseId: id, body: body.trim() });
      setBody("");
      toast.success("Kommentar publicerad");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunde inte kommentera");
    } finally {
      setPosting(false);
    }
  };

  const rate = async (value: number) => {
    if (!requireProfile(value)) return;
    try {
      await plannerApi("rate", { courseId: id, rating: value });
      toast.success("Tack för ditt betyg!");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunde inte betygsätta");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Seo
          title="Laddar bana | AgilityManager"
          description="En delad bana laddas i AgilityManager."
          noIndex
        />
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
        <Seo
          title="Kunde inte ladda banan | AgilityManager"
          description="Ett nätverksfel uppstod vid hämtning av banan."
          noIndex
        />
        <h1 className="text-xl font-semibold">Kunde inte ladda banan</h1>
        <p className="text-sm text-muted-foreground">Kontrollera din uppkoppling och försök igen.</p>
        <div className="flex gap-2">
          <Button onClick={() => void load()}>Försök igen</Button>
          <Button asChild variant="outline"><Link to="/banplanerare">Till banplaneraren</Link></Button>
        </div>
      </div>
    );
  }

  if (!course) {
    // Privat/borttagen bana: mjuk 404 — ska inte indexeras av sökmotorer.
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
        <Seo
          title="Banan hittades inte | AgilityManager"
          description="Banan kan ha tagits bort eller vara privat."
          noIndex
        />
        <h1 className="text-xl font-semibold">Banan hittades inte</h1>
        <p className="text-sm text-muted-foreground">Den kan ha tagits bort eller vara privat.</p>
        <Button asChild><Link to="/banplanerare">Till banplaneraren</Link></Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Dynamiskt användarinnehåll — undvik massindexering av tunna banskisser */}
      <Seo
        title={`${course.name} — delad bana | AgilityManager`}
        description={`${course.sport === "hoopers" ? "Hoopers" : "Agility"}bana delad av ${course.author_name}. Öppna och bygg vidare i banplaneraren.`}
        noIndex
      />
      <header className="border-b border-border px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <Link to="/banplanerare" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Banplaneraren
          </Link>
          <Button asChild size="sm"><Link to="/banplanerare">Rita en egen bana</Link></Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 p-4">
        <section>
          <h1 className="text-2xl font-bold">{course.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <UserRound className="h-4 w-4" /> {course.author_name}
            <span>•</span>
            <span>{course.sport === "hoopers" ? "Hoopers" : "Agility"}</span>
            <span>•</span>
            <span>{new Date(course.created_at).toLocaleDateString("sv-SE")}</span>
          </p>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-card p-3">
          <CoursePreviewSvg data={course.course_data ?? {}} label={`Banskiss: ${course.name}`} className="h-[55vh] w-full text-foreground" />
        </section>

        {/* Löftet i delningslänken: öppna exakt den här banan och bygg vidare */}
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to={`/banplanerare?delad=${encodeURIComponent(course.id)}`}>
              Öppna i planeraren
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/banplanerare">Rita en egen bana från grunden</Link>
          </Button>
        </div>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Betyg</h2>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex" role="group" aria-label="Sätt betyg">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => void rate(v)}
                  aria-label={`Ge ${v} av 5`}
                  className="p-1 text-amber-500 transition hover:scale-110"
                >
                  <Star className={`h-6 w-6 ${v <= Math.round(avg) ? "fill-current" : ""}`} />
                </button>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {ratings.length ? `${avg.toFixed(1)} av 5 (${ratings.length} röster)` : "Inga betyg än"}
            </span>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <MessageSquare className="h-4 w-4" /> Kommentarer ({comments.length})
          </h2>

          <div className="mt-3 space-y-2">
            <Textarea
              value={body}
              maxLength={1000}
              rows={3}
              placeholder="Vad tycker du om banan? Tips, flöden, svårigheter…"
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {profile ? `Skriver som ${profile.name}` : "Namn och e-post behövs för att kommentera"}
              </span>
              <Button size="sm" onClick={() => void postComment()} disabled={posting || !body.trim()}>
                {posting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Kommentera
              </Button>
            </div>
          </div>

          <ul className="mt-4 space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="rounded-xl border border-border/60 bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{c.author_name}</span>
                  <span>{new Date(c.created_at).toLocaleDateString("sv-SE")}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
              </li>
            ))}
            {comments.length === 0 && (
              <li className="text-sm text-muted-foreground">Bli först med att kommentera.</li>
            )}
          </ul>
        </section>
      </main>

      <PlannerProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        reason="Ange namn och e-post för att kommentera och betygsätta."
        onReady={() => {
          const action = pendingAction;
          setPendingAction(null);
          if (action === "comment") void postComment();
          else if (typeof action === "number") void rate(action);
        }}
      />
    </div>
  );
}
