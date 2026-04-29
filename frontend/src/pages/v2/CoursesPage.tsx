import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePremium } from "@/components/PremiumGate";
import {
  PageHeader,
  MetricCard,
  SegmentedControl,
  DSCard,
  DSButton,
  DSEmptyState,
  StatusBadge,
  PageSkeleton,
} from "@/components/ds";
import {
  Play,
  GraduationCap,
  CheckCircle2,
  Clock,
  Star,
  ExternalLink,
  PenTool,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  long_description: string;
  price_sek: number;
  discounted_price_sek: number | null;
  instructor_name: string;
  instructor_bio: string;
  partner_name: string;
  partner_url: string;
  image_url: string | null;
  trailer_url: string | null;
  category: string;
}

interface SavedCourse {
  id: string;
  name: string;
  description: string;
  updated_at: string;
}

const categoryLabels: Record<string, string> = {
  hoopers: "Hoopers",
  agility: "Agility",
  grundträning: "Grundträning",
  alla: "Alla",
};

const getYoutubeEmbedUrl = (url: string) => {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?]+)/,
  );
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
};

export default function V2CoursesPage() {
  const { user } = useAuth();
  const isPremium = usePremium();
  const [tab, setTab] = useState<"katalog" | "minabanor">("katalog");
  const [category, setCategory] = useState<string>("alla");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const { data: courses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ["v2-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Course[];
    },
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["v2-course-purchases", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("course_purchases")
        .select("course_id, status")
        .eq("user_id", user.id)
        .eq("status", "completed");
      if (error) throw error;
      return data as { course_id: string; status: string }[];
    },
    enabled: !!user,
  });

  const { data: savedCourses = [], isLoading: loadingSaved } = useQuery({
    queryKey: ["v2-saved-courses", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("saved_courses")
        .select("id, name, description, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as SavedCourse[];
    },
    enabled: !!user,
  });

  const { data: userDogs = [] } = useQuery({
    queryKey: ["v2-courses-user-dogs", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("dogs")
        .select("sport, competition_level, hoopers_level, is_active_competition_dog")
        .eq("user_id", user.id);
      if (error) throw error;
      return data as {
        sport: "Agility" | "Hoopers" | "Båda";
        competition_level: "Nollklass" | "K1" | "K2" | "K3";
        hoopers_level: "Startklass" | "Klass 1" | "Klass 2" | "Klass 3";
        is_active_competition_dog: boolean;
      }[];
    },
    enabled: !!user,
  });

  const hasPurchased = (id: string) =>
    purchases.some((p) => p.course_id === id);

  const getPrice = (c: Course) =>
    isPremium && c.discounted_price_sek ? c.discounted_price_sek : c.price_sek;

  const categories = useMemo(() => {
    const set = new Set(courses.map((c) => c.category));
    return ["alla", ...Array.from(set)];
  }, [courses]);

  const filteredCourses = useMemo(() => {
    if (category === "alla") return courses;
    return courses.filter((c) => c.category === category);
  }, [courses, category]);

  /** Rekommenderade kurser baserat på hundarnas sport och nivå. */
  const recommendations = useMemo(() => {
    if (!user || userDogs.length === 0 || courses.length === 0) {
      return { items: [] as Course[], reason: "" };
    }
    const sportWeight: Record<string, number> = { Agility: 0, Hoopers: 0 };
    let beginnerCount = 0;
    let advancedCount = 0;

    userDogs.forEach((d) => {
      const w = d.is_active_competition_dog ? 2 : 1;
      if (d.sport === "Agility" || d.sport === "Båda") sportWeight.Agility += w;
      if (d.sport === "Hoopers" || d.sport === "Båda") sportWeight.Hoopers += w;
      if (d.sport === "Hoopers") {
        if (d.hoopers_level === "Startklass" || d.hoopers_level === "Klass 1") beginnerCount++;
        else advancedCount++;
      } else {
        if (d.competition_level === "Nollklass" || d.competition_level === "K1") beginnerCount++;
        else advancedCount++;
      }
    });

    const preferred =
      sportWeight.Hoopers > sportWeight.Agility
        ? "hoopers"
        : sportWeight.Agility > sportWeight.Hoopers
          ? "agility"
          : null;
    const isBeginnerHeavy = beginnerCount >= advancedCount;

    const scored = courses
      .filter((c) => !hasPurchased(c.id))
      .map((c) => {
        let score = 0;
        const cat = c.category.toLowerCase();
        if (preferred && cat === preferred) score += 3;
        if (cat === "grundträning") score += isBeginnerHeavy ? 2 : 0.5;
        const text = `${c.title} ${c.description}`.toLowerCase();
        if (isBeginnerHeavy && /(nyböj|grund|start|introduk|nollklass)/.test(text)) score += 1;
        if (!isBeginnerHeavy && /(avancer|k2|k3|klass\s*2|klass\s*3|tävling)/.test(text)) score += 1;
        return { course: c, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((x) => x.course);

    const reasonParts: string[] = [];
    if (preferred) reasonParts.push(preferred === "hoopers" ? "Hoopers" : "Agility");
    reasonParts.push(isBeginnerHeavy ? "nybörjarvänligt" : "tävlingsnivå");
    return { items: scored, reason: reasonParts.join(" · ") };
  }, [courses, userDogs, purchases, user]);

  const handlePurchase = (course: Course) => {
    if (!user) {
      toast.error("Du måste vara inloggad");
      return;
    }
    if (course.partner_url) {
      window.open(course.partner_url, "_blank");
      toast.info("Du omdirigeras till kursanordnaren");
    }
  };

  if (loadingCourses) return <PageSkeleton />;

  return (
    <>
      <Helmet>
        <title>Kurser & Utbildning – AgilityManager</title>
        <meta
          name="description"
          content="Onlinekurser, videolektioner och ditt egna banarkiv för agility och hoopers."
        />
      </Helmet>

      <PageHeader
        eyebrow="Utbildning"
        title="Kurser & Utbildning"
        subtitle="Lär av erfarna instruktörer och utveckla din ekipage med video, kursmaterial och dina egna sparade banor."
        actions={
          <Link to="/course-planner">
            <DSButton variant="secondary" size="sm">
              <PenTool size={14} className="mr-1.5" />
              Banplanerare
            </DSButton>
          </Link>
        }
      />

      {/* KPI-rad */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricCard
          label="Kurser totalt"
          value={courses.length}
          icon={GraduationCap}
        />
        <MetricCard
          label="Mina kurser"
          value={purchases.length}
          icon={CheckCircle2}
          hint={purchases.length === 0 ? "Inga köp än" : "Aktiva"}
        />
        <MetricCard
          label="Sparade banor"
          value={savedCourses.length}
          icon={PenTool}
        />
        <MetricCard
          label="Din nivå"
          value={isPremium ? "Pro" : "Free"}
          variant={isPremium ? "highlight" : "default"}
          hint={
            isPremium ? "Rabatt på alla kurser" : "Uppgradera för rabatt"
          }
          icon={Sparkles}
        />
      </div>

      {/* Tabs */}
      <div className="mb-5">
        <SegmentedControl<"katalog" | "minabanor">
          value={tab}
          onChange={(v) => setTab(v)}
          options={[
            { value: "katalog", label: "Kurskatalog" },
            { value: "minabanor", label: `Mina banor (${savedCourses.length})` },
          ]}
        />
      </div>

      {tab === "katalog" && (
        <>
          {/* Rekommenderat för dig – baserat på hundarnas sport och nivå */}
          {recommendations.items.length > 0 && (
            <section className="mb-6">
              <div className="flex items-end justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Sparkles size={14} className="text-brand-700" />
                    <h2 className="text-h3 text-text-primary">Rekommenderat för dig</h2>
                  </div>
                  <p className="text-small text-text-secondary">
                    Matchat mot dina hundar · {recommendations.reason}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {recommendations.items.map((course) => {
                  const price = getPrice(course);
                  const hasDiscount =
                    isPremium &&
                    course.discounted_price_sek &&
                    course.discounted_price_sek < course.price_sek;
                  return (
                    <DSCard
                      key={course.id}
                      onClick={() => setSelectedCourse(course)}
                      className="cursor-pointer hover:border-border-strong transition-colors relative"
                    >
                      <div className="absolute -top-2 -right-2">
                        <StatusBadge variant="pro" label="Tips" />
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-ds-sm bg-brand-50 flex items-center justify-center shrink-0">
                          <GraduationCap size={18} className="text-brand-700" strokeWidth={1.5} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-body font-medium text-text-primary truncate">
                            {course.title}
                          </h3>
                          <p className="text-small text-text-secondary line-clamp-2 mt-0.5">
                            {course.description}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <StatusBadge
                              variant="neutral"
                              label={categoryLabels[course.category] ?? course.category}
                            />
                            <div className="flex items-center gap-1.5">
                              {hasDiscount && (
                                <span className="text-micro line-through text-text-tertiary">
                                  {course.price_sek} kr
                                </span>
                              )}
                              <span className="text-small font-medium text-text-primary tabular-nums">
                                {price} kr
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </DSCard>
                  );
                })}
              </div>
            </section>
          )}

          {/* Pro-banner */}
          {!isPremium && (
            <DSCard className="mb-4 bg-brand-50/60 border-brand-100">
              <div className="flex items-center gap-3 p-4">
                <div className="w-9 h-9 rounded-ds-md bg-brand-100 flex items-center justify-center">
                  <Star size={16} className="text-brand-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm text-text-primary font-medium">
                    Pro-medlemmar får rabatt på alla kurser
                  </p>
                  <p className="text-small text-text-secondary">
                    Aktivera Pro för 19 kr/mån och börja spara direkt.
                  </p>
                </div>
                <Link to="/settings">
                  <DSButton variant="primary" size="sm">
                    Bli Pro
                  </DSButton>
                </Link>
              </div>
            </DSCard>
          )}

          {/* Kategori-filter */}
          {categories.length > 2 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-ds-sm text-small transition-colors ${
                    category === c
                      ? "bg-inverse text-text-on-inverse"
                      : "bg-subtle text-text-secondary hover:bg-subtle-hover"
                  }`}
                >
                  {categoryLabels[c] ?? c}
                </button>
              ))}
            </div>
          )}

          {filteredCourses.length === 0 ? (
            <DSEmptyState
              icon={GraduationCap}
              title="Inga kurser här ännu"
              description="Vi lägger till nya kurser löpande. Kika tillbaka snart."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCourses.map((course) => {
                const purchased = hasPurchased(course.id);
                const price = getPrice(course);
                const hasDiscount =
                  isPremium &&
                  course.discounted_price_sek &&
                  course.discounted_price_sek < course.price_sek;
                const embed = course.trailer_url
                  ? getYoutubeEmbedUrl(course.trailer_url)
                  : null;

                return (
                  <DSCard
                    key={course.id}
                    onClick={() => setSelectedCourse(course)}
                    className="overflow-hidden !p-0 cursor-pointer hover:border-border-strong transition-colors"
                  >
                    {/* Video/bild-yta */}
                    <div className="relative aspect-video bg-inverse overflow-hidden">
                      {embed ? (
                        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/80 to-inverse flex items-center justify-center group">
                          <div className="w-14 h-14 rounded-full bg-surface/95 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Play
                              size={22}
                              className="text-brand-700 ml-1"
                              fill="currentColor"
                            />
                          </div>
                        </div>
                      ) : course.image_url ? (
                        <img
                          src={course.image_url}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-brand-700 to-brand-900 flex items-center justify-center">
                          <GraduationCap
                            size={42}
                            className="text-text-on-inverse/40"
                            strokeWidth={1.2}
                          />
                        </div>
                      )}
                      <div className="absolute top-3 left-3 flex gap-1.5">
                        <StatusBadge
                          variant="neutral"
                          label={categoryLabels[course.category] ?? course.category}
                          className="bg-surface/95"
                        />
                        {purchased && (
                          <StatusBadge variant="success" label="Köpt" />
                        )}
                      </div>
                      {course.partner_name && (
                        <div className="absolute bottom-3 right-3">
                          <StatusBadge
                            variant="neutral"
                            label={course.partner_name}
                            className="bg-surface/95"
                          />
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <h3 className="text-h3 text-text-primary mb-1">
                        {course.title}
                      </h3>
                      <p className="text-small text-text-secondary line-clamp-2 mb-3">
                        {course.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-text-tertiary">
                          <GraduationCap size={13} strokeWidth={1.5} />
                          <span className="text-small truncate">
                            {course.instructor_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasDiscount && (
                            <span className="text-small line-through text-text-tertiary">
                              {course.price_sek} kr
                            </span>
                          )}
                          <span className="text-body font-medium text-text-primary tabular-nums">
                            {price} kr
                          </span>
                          {hasDiscount && (
                            <StatusBadge variant="pro" label="Pro" />
                          )}
                        </div>
                      </div>
                    </div>
                  </DSCard>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "minabanor" && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-small text-text-secondary">
              Banor du sparat i banplaneraren. Klicka för att öppna eller redigera.
            </p>
            <Link to="/course-planner">
              <DSButton variant="primary" size="sm">
                <PenTool size={14} className="mr-1.5" />
                Skapa ny bana
              </DSButton>
            </Link>
          </div>

          {loadingSaved ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-24 rounded-ds-md bg-subtle animate-pulse"
                />
              ))}
            </div>
          ) : savedCourses.length === 0 ? (
            <DSEmptyState
              icon={PenTool}
              title="Inga sparade banor"
              description="Skissa din första bana i banplaneraren och spara den för att hitta den här."
              action={
                <Link to="/course-planner">
                  <DSButton variant="primary" size="sm">
                    Öppna banplaneraren
                  </DSButton>
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {savedCourses.map((sc) => (
                <Link key={sc.id} to={`/course-planner?id=${sc.id}`}>
                  <DSCard className="cursor-pointer hover:border-border-strong transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-body font-medium text-text-primary truncate">
                          {sc.name}
                        </h3>
                        {sc.description && (
                          <p className="text-small text-text-secondary line-clamp-1 mt-0.5">
                            {sc.description}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 text-text-tertiary mt-2">
                          <Clock size={12} strokeWidth={1.5} />
                          <span className="text-micro">
                            Uppdaterad{" "}
                            {new Date(sc.updated_at).toLocaleDateString("sv-SE")}
                          </span>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-ds-sm bg-subtle flex items-center justify-center shrink-0">
                        <PenTool
                          size={16}
                          strokeWidth={1.5}
                          className="text-text-secondary"
                        />
                      </div>
                    </div>
                  </DSCard>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* Detalj-dialog */}
      <Dialog
        open={!!selectedCourse}
        onOpenChange={(o) => !o && setSelectedCourse(null)}
      >
        {selectedCourse && (
          <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-h2">
                {selectedCourse.title}
              </DialogTitle>
            </DialogHeader>

            {selectedCourse.trailer_url && (
              <div className="aspect-video rounded-ds-md overflow-hidden bg-inverse">
                {getYoutubeEmbedUrl(selectedCourse.trailer_url) ? (
                  <iframe
                    src={getYoutubeEmbedUrl(selectedCourse.trailer_url)!}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={selectedCourse.title}
                  />
                ) : (
                  <a
                    href={selectedCourse.trailer_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-full flex items-center justify-center text-text-on-inverse"
                  >
                    <Play size={48} />
                  </a>
                )}
              </div>
            )}

            <div className="space-y-4">
              <p className="text-body text-text-secondary leading-relaxed whitespace-pre-line">
                {selectedCourse.long_description || selectedCourse.description}
              </p>

              <Separator />

              <div>
                <h4 className="text-body-sm font-medium text-text-primary mb-1 flex items-center gap-2">
                  <GraduationCap size={14} strokeWidth={1.5} /> Instruktör
                </h4>
                <p className="text-body-sm text-text-primary">
                  {selectedCourse.instructor_name}
                </p>
                {selectedCourse.instructor_bio && (
                  <p className="text-small text-text-secondary mt-1">
                    {selectedCourse.instructor_bio}
                  </p>
                )}
              </div>

              {selectedCourse.partner_name && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-micro text-text-tertiary uppercase">
                        Kursanordnare
                      </p>
                      <p className="text-body-sm text-text-primary">
                        {selectedCourse.partner_name}
                      </p>
                    </div>
                    {selectedCourse.partner_url && (
                      <a
                        href={selectedCourse.partner_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-small text-text-primary hover:underline flex items-center gap-1"
                      >
                        Hemsida <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </>
              )}

              <Separator />

              <div className="flex items-center justify-between p-4 bg-subtle rounded-ds-md">
                <div>
                  <p className="text-micro text-text-tertiary uppercase mb-1">
                    Pris
                  </p>
                  <div className="flex items-center gap-2">
                    {isPremium &&
                      selectedCourse.discounted_price_sek &&
                      selectedCourse.discounted_price_sek <
                        selectedCourse.price_sek && (
                        <span className="text-body line-through text-text-tertiary">
                          {selectedCourse.price_sek} kr
                        </span>
                      )}
                    <span className="text-h2 text-text-primary tabular-nums">
                      {getPrice(selectedCourse)} kr
                    </span>
                  </div>
                  {isPremium && selectedCourse.discounted_price_sek && (
                    <p className="text-small text-brand-700 mt-1 flex items-center gap-1">
                      <Star size={11} /> Pro-rabatt aktiverad
                    </p>
                  )}
                </div>

                {hasPurchased(selectedCourse.id) ? (
                  <StatusBadge variant="success" label="Köpt" />
                ) : (
                  <DSButton onClick={() => handlePurchase(selectedCourse)}>
                    <ShoppingCart size={14} className="mr-1.5" />
                    Anmäl dig
                  </DSButton>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
