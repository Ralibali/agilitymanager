import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Search, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooterV2 } from "@/components/landing/LandingFooterV2";
import { motion as motionTokens } from "@/lib/motion";

type Breed = {
  id: string;
  slug: string;
  name: string;
  size_class: "XS" | "S" | "M" | "L" | "XL";
  agility_suitability: number | null;
  hoopers_suitability: number | null;
  agility_popularity_rank: number | null;
  popular_in_sweden: boolean;
  description: string;
  image_url: string | null;
  breed_group: string | null;
};

const SIZES = ["Alla", "XS", "S", "M", "L", "XL"] as const;
type SizeFilter = (typeof SIZES)[number];

export default function BreedsIndexPage() {
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [loading, setLoading] = useState(true);
  const [size, setSize] = useState<SizeFilter>("Alla");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("breeds")
        .select(
          "id, slug, name, size_class, agility_suitability, hoopers_suitability, agility_popularity_rank, popular_in_sweden, description, image_url, breed_group",
        )
        .eq("published", true)
        .order("agility_popularity_rank", { ascending: true, nullsFirst: false })
        .limit(200);
      if (cancelled) return;
      setBreeds((data ?? []) as Breed[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return breeds.filter((b) => {
      if (size !== "Alla" && b.size_class !== size) return false;
      if (q && !b.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [breeds, size, search]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Hundraser för agility & hoopers – guide till alla raser | AgilityManager</title>
        <meta
          name="description"
          content="Utforska hundraser och hitta vilka som passar agility eller hoopers. Storleksklass, temperament, träningstips och mer för varje ras."
        />
        <link rel="canonical" href="https://agilitymanager.se/raser" />
      </Helmet>

      <LandingNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="px-4 pt-24 pb-10 sm:pt-28">
          <div className="max-w-5xl mx-auto text-center">
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: motionTokens.duration.smooth,
                delay: 0.08,
                ease: motionTokens.ease.out,
              }}
              className="font-display text-foreground text-3xl sm:text-5xl mb-4 leading-tight"
            >
              Hundraser för agility & hoopers
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: motionTokens.duration.smooth,
                delay: 0.2,
                ease: motionTokens.ease.out,
              }}
              className="font-body text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto mb-8"
            >
              Utforska temperament, storleksklass och träningstips. Hitta hundrasen som passar
              dig — eller läs djupare om din nuvarande tävlingskompis.
            </motion.p>

            {/* Search */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: motionTokens.duration.smooth,
                delay: 0.32,
                ease: motionTokens.ease.out,
              }}
              className="max-w-md mx-auto mb-6"
            >
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Sök ras…"
                  className="w-full pl-9 pr-3 py-2.5 bg-card border border-border rounded-full text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#1a6b3c] transition-colors"
                  style={{
                    transitionDuration: `${motionTokens.duration.fast}s`,
                  }}
                />
              </div>
            </motion.div>

            {/* Size filter */}
            <SizeFilterBar value={size} onChange={setSize} />
          </div>
        </section>

        {/* Grid */}
        <section className="px-4 pb-20">
          <div className="max-w-6xl mx-auto">
            {loading ? (
              <SkeletonGrid />
            ) : filtered.length === 0 ? (
              <EmptyMessage hasBreeds={breeds.length > 0} />
            ) : (
              <LayoutGroup>
                <motion.div
                  layout
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                >
                  <AnimatePresence mode="popLayout">
                    {filtered.map((b, i) => (
                      <BreedCard key={b.id} breed={b} index={i} />
                    ))}
                  </AnimatePresence>
                </motion.div>
              </LayoutGroup>
            )}
          </div>
        </section>
      </main>

      <LandingFooterV2 />
    </div>
  );
}

/* ─────────── Size filter (Linear-style underline-svep) ─────────── */
function SizeFilterBar({
  value,
  onChange,
}: {
  value: SizeFilter;
  onChange: (v: SizeFilter) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: motionTokens.duration.smooth,
        delay: 0.44,
        ease: motionTokens.ease.out,
      }}
      className="inline-flex items-center gap-1 p-1 bg-card border border-border rounded-full font-body"
      role="tablist"
      aria-label="Filtrera på storleksklass"
    >
      {SIZES.map((s) => {
        const active = value === s;
        return (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(s)}
            className="relative px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-colors"
            style={{
              color: active ? "#fff" : "hsl(var(--muted-foreground))",
              transitionDuration: `${motionTokens.duration.fast}s`,
            }}
          >
            {active && (
              <motion.span
                layoutId="size-pill-active"
                className="absolute inset-0 rounded-full"
                style={{ background: "#1a6b3c", zIndex: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 380,
                  damping: 32,
                }}
              />
            )}
            <span className="relative z-[1]">{s}</span>
          </button>
        );
      })}
    </motion.div>
  );
}

/* ─────────── Card ─────────── */
function BreedCard({ breed, index }: { breed: Breed; index: number }) {
  const score = breed.agility_suitability ?? breed.hoopers_suitability ?? null;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{
        duration: motionTokens.duration.smooth,
        delay: Math.min(index, 12) * (motionTokens.stagger.tight / 1000),
        ease: motionTokens.ease.out,
      }}
      whileHover={{ y: -2 }}
    >
      <Link
        to={`/raser/${breed.slug}`}
        className="group block bg-card border border-border rounded-2xl overflow-hidden h-full"
        style={{
          transition: `box-shadow ${motionTokens.duration.base}s ${"cubic-bezier(0.4,0,0.2,1)"}`,
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.boxShadow =
            "0 10px 28px rgba(0,0,0,0.08), 0 3px 10px rgba(0,0,0,0.05)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.boxShadow =
            "0 1px 2px rgba(0,0,0,0.04)";
        }}
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-secondary">
          {breed.image_url ? (
            <img
              src={breed.image_url}
              alt={breed.name}
              loading="lazy"
              className="w-full h-full object-cover transition-transform"
              style={{
                transitionDuration: "400ms",
                transitionTimingFunction: "cubic-bezier(0.4,0,0.2,1)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLImageElement).style.transform = "scale(1.04)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLImageElement).style.transform = "scale(1)";
              }}
            />
          ) : (
            <PlaceholderGradient />
          )}
          <span
            className="absolute top-3 left-3 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium font-body"
            style={{
              background: "rgba(255,255,255,0.94)",
              color: "#0f1411",
              backdropFilter: "blur(4px)",
            }}
          >
            {breed.size_class}
          </span>
          {breed.popular_in_sweden && (
            <span
              className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium font-body"
              style={{ background: "#1a6b3c", color: "#fff" }}
            >
              Populär i Sverige
            </span>
          )}
        </div>

        <div className="p-5">
          <h3 className="font-display text-foreground text-lg mb-1">{breed.name}</h3>
          <p className="text-xs text-muted-foreground font-body line-clamp-2 mb-3 leading-relaxed">
            {breed.description || breed.breed_group || "Hundras lämplig för agility eller hoopers."}
          </p>

          {score !== null && <StarsRow score={score} />}
        </div>
      </Link>
    </motion.div>
  );
}

function PlaceholderGradient() {
  return (
    <motion.div
      aria-hidden
      className="w-full h-full"
      style={{
        background:
          "linear-gradient(135deg, #f0ebe3 0%, #e8d5be 50%, #c9b99a 100%)",
        backgroundSize: "200% 200%",
      }}
      animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
      transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
    />
  );
}

function StarsRow({ score }: { score: number }) {
  // DB-skala är 0-10. Visa som "X / 10 ★" för exakthet.
  const value = Math.max(0, Math.min(10, Math.round(score)));
  return (
    <div
      className="inline-flex items-center gap-1 font-body"
      aria-label={`Lämplighet ${value} av 10`}
    >
      <Star
        size={13}
        strokeWidth={1.5}
        style={{ color: "#c85d1e", fill: "#c85d1e" }}
      />
      <span className="text-xs font-medium text-foreground">
        {value}
        <span className="text-muted-foreground"> / 10</span>
      </span>
    </div>
  );
}

/* ─────────── Skeleton & Empty ─────────── */
function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-card border border-border rounded-2xl overflow-hidden"
        >
          <div className="aspect-[16/10] bg-secondary animate-pulse" />
          <div className="p-5 space-y-2">
            <div className="h-4 w-2/3 bg-secondary rounded animate-pulse" />
            <div className="h-3 w-full bg-secondary rounded animate-pulse" />
            <div className="h-3 w-5/6 bg-secondary rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyMessage({ hasBreeds }: { hasBreeds: boolean }) {
  return (
    <div className="text-center py-16">
      <p className="font-body text-muted-foreground">
        {hasBreeds
          ? "Inga raser matchar filtret. Justera storleksklass eller sök igen."
          : "Inga raser publicerade ännu. Kom tillbaka snart."}
      </p>
    </div>
  );
}
