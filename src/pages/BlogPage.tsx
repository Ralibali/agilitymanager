import { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Clock,
  ArrowLeft,
  Search,
  X,
  ChevronDown,
  Activity,
  Trophy,
  Heart,
  Sparkles,
  GraduationCap,
  Wrench,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { fetchBlogPosts, type BlogPost } from '@/lib/blogData';

/* ─────────────────────────────────────────────────────────────────────
   Kategorimetadata — färgkodade pills, gradient-placeholders och ikoner.
   Gradients använder semantiska tokens via opacity-blandning så de
   funkar i både ljust och mörkt tema.
   ───────────────────────────────────────────────────────────────────── */
type CategoryMeta = {
  pillBg: string;
  pillText: string;
  // Bakgrundsgradient för bild-placeholder. Använder hsl() med opacitet
  // direkt på semantiska tokens så vi stannar inom designsystemet.
  gradient: string;
  Icon: typeof Activity;
};

const CATEGORY_META: Record<string, CategoryMeta> = {
  Hoopers: {
    pillBg: 'bg-accent/15',
    pillText: 'text-accent',
    gradient: 'from-accent/30 via-accent/15 to-primary/20',
    Icon: Sparkles,
  },
  Agility: {
    pillBg: 'bg-warning/15',
    pillText: 'text-warning-foreground',
    gradient: 'from-warning/35 via-warning/15 to-secondary/30',
    Icon: Activity,
  },
  Träning: {
    pillBg: 'bg-warning/15',
    pillText: 'text-warning-foreground',
    gradient: 'from-warning/30 via-secondary/20 to-warning/10',
    Icon: Activity,
  },
  Teknik: {
    pillBg: 'bg-primary/12',
    pillText: 'text-primary',
    gradient: 'from-primary/25 via-accent/10 to-primary/15',
    Icon: Wrench,
  },
  Tävling: {
    pillBg: 'bg-success/15',
    pillText: 'text-success',
    gradient: 'from-destructive/25 via-warning/15 to-destructive/10',
    Icon: Trophy,
  },
  Hälsa: {
    pillBg: 'bg-destructive/12',
    pillText: 'text-destructive',
    gradient: 'from-success/25 via-warning/10 to-success/15',
    Icon: Heart,
  },
  Nybörjare: {
    pillBg: 'bg-primary/12',
    pillText: 'text-primary',
    gradient: 'from-primary/25 via-secondary/15 to-primary/10',
    Icon: GraduationCap,
  },
  Utrustning: {
    pillBg: 'bg-secondary/80',
    pillText: 'text-secondary-foreground',
    gradient: 'from-secondary/40 via-muted/30 to-secondary/20',
    Icon: Wrench,
  },
};

const FALLBACK_META: CategoryMeta = {
  pillBg: 'bg-muted',
  pillText: 'text-muted-foreground',
  gradient: 'from-muted via-muted/60 to-muted/40',
  Icon: BookOpen,
};

const metaFor = (cat: string): CategoryMeta => CATEGORY_META[cat] ?? FALLBACK_META;

/* ─────────────────────────────────────────────────────────────────────
   Sortering
   ───────────────────────────────────────────────────────────────────── */
type SortKey = 'newest' | 'alphabetical' | 'reading-time';
const SORT_LABELS: Record<SortKey, string> = {
  newest: 'Senast publicerade',
  alphabetical: 'Alfabetiskt',
  'reading-time': 'Längsta lästid',
};

/* ─────────────────────────────────────────────────────────────────────
   Hjälpkomponenter
   ───────────────────────────────────────────────────────────────────── */
function CategoryPlaceholder({
  category,
  className = '',
  iconSize = 56,
}: {
  category: string;
  className?: string;
  iconSize?: number;
}) {
  const { gradient, Icon } = metaFor(category);
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${gradient} ${className}`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <Icon size={iconSize} className="text-foreground/25" strokeWidth={1.25} />
      </div>
      {/* Subtil ljus-overlay för djup */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-background/0 to-background/20 pointer-events-none" />
    </div>
  );
}

function CategoryPill({ category }: { category: string }) {
  const m = metaFor(category);
  return (
    <span
      className={`inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-full ${m.pillBg} ${m.pillText}`}
    >
      {category}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Sida
   ───────────────────────────────────────────────────────────────────── */
export default function BlogPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');

  const activeCategory = searchParams.get('kategori') ?? 'Alla';

  useEffect(() => {
    fetchBlogPosts().then((p) => {
      setPosts(p);
      setLoading(false);
    });
  }, []);

  /* Kategorier — härleds från faktiska artiklar så vi aldrig visar
     en pill utan innehåll. Behåller en pinnad ordning för relevanta. */
  const categories = useMemo(() => {
    const present = new Set(posts.map((p) => p.category));
    const preferred = ['Hoopers', 'Agility', 'Teknik', 'Tävling', 'Hälsa', 'Nybörjare'];
    const ordered = preferred.filter((c) => present.has(c));
    const extras = [...present].filter((c) => !preferred.includes(c)).sort();
    return ['Alla', ...ordered, ...extras];
  }, [posts]);

  /* Filtrering + sortering + sök */
  const filtered = useMemo(() => {
    let list = posts;
    if (activeCategory !== 'Alla') {
      list = list.filter((p) => p.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q),
      );
    }
    const sorted = [...list];
    if (sort === 'newest') {
      sorted.sort((a, b) => (a.date < b.date ? 1 : -1));
    } else if (sort === 'alphabetical') {
      sorted.sort((a, b) => a.title.localeCompare(b.title, 'sv'));
    } else if (sort === 'reading-time') {
      sorted.sort((a, b) => b.readTime - a.readTime);
    }
    return sorted;
  }, [posts, activeCategory, search, sort]);

  /* Featured = senast publicerade i nuvarande filter (första efter sort).
     Vi tar alltid senaste oavsett sort, så hero känns konsekvent. */
  const featured = useMemo(() => {
    if (filtered.length === 0) return null;
    return [...filtered].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  }, [filtered]);

  const rest = useMemo(
    () => filtered.filter((p) => p.slug !== featured?.slug),
    [filtered, featured],
  );

  const setCategory = (cat: string) => {
    const next = new URLSearchParams(searchParams);
    if (cat === 'Alla') next.delete('kategori');
    else next.set('kategori', cat);
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    setSearch('');
    setSearchParams({}, { replace: true });
  };

  /* SEO */
  const filteredCount = posts.filter(
    (p) => activeCategory === 'Alla' || p.category === activeCategory,
  ).length;

  const seoTitle =
    activeCategory === 'Alla'
      ? 'Kunskapsbank – guider om agility och hoopers | AgilityManager'
      : `${activeCategory} – ${filteredCount} guider | AgilityManager`;

  const seoDescription =
    activeCategory === 'Alla'
      ? 'Guider, tips och djupdyk för dig som tränar agility eller hoopers. Skrivet för svenska hundförare.'
      : `Alla våra artiklar om ${activeCategory.toLowerCase()} – ${filteredCount} guider för svenska hundförare.`;

  const canonical =
    activeCategory === 'Alla'
      ? 'https://agilitymanager.se/blogg'
      : `https://agilitymanager.se/blogg?kategori=${encodeURIComponent(activeCategory)}`;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <link rel="canonical" href={canonical} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'AgilityManager Kunskapsbank',
            description: seoDescription,
            url: canonical,
            isPartOf: {
              '@type': 'WebSite',
              name: 'AgilityManager',
              url: 'https://agilitymanager.se',
            },
            hasPart: posts.map((p) => ({
              '@type': 'BlogPosting',
              headline: p.title,
              description: p.excerpt,
              datePublished: p.date,
              author: { '@type': 'Organization', name: p.author },
              url: `https://agilitymanager.se/blogg/${p.slug}`,
            })),
          })}
        </script>
      </Helmet>

      {/* ========== HEADER ========== */}
      <header className="border-b border-border/60 bg-card/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-8">
          {/* Breadcrumb */}
          <nav aria-label="Brödsmulor" className="text-xs text-muted-foreground mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="h-auto p-0 -ml-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft size={12} className="mr-1" />
              Startsidan
            </Button>
            <span className="mx-2 text-muted-foreground/50">/</span>
            <span className="text-foreground/80">Kunskapsbank</span>
          </nav>

          <h1 className="font-display text-3xl sm:text-4xl font-medium text-foreground tracking-tight">
            Kunskapsbank
          </h1>
          <p className="mt-2 text-base text-muted-foreground max-w-2xl">
            Guider, tips och djupdyk för dig som tränar agility eller hoopers.
          </p>

          {/* Sökfält + stats */}
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                placeholder="Sök bland artiklar…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 bg-card border-border/80"
                aria-label="Sök bland artiklar"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  aria-label="Rensa sök"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground sm:ml-2">
              {posts.length} artiklar · uppdateras varje vecka
            </p>
          </div>
        </div>
      </header>

      {/* ========== FILTERBAR (sticky) ========== */}
      <div className="sticky top-0 z-20 bg-background/85 backdrop-blur-md border-b border-border/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <div className="flex-1 flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1">
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              const m = cat === 'Alla' ? null : metaFor(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={[
                    'flex-shrink-0 text-sm px-3.5 py-1.5 rounded-full transition-all',
                    'border',
                    isActive
                      ? 'bg-foreground text-background border-foreground'
                      : m
                        ? `${m.pillBg} ${m.pillText} border-transparent hover:border-border`
                        : 'bg-card text-foreground border-border hover:border-foreground/40',
                  ].join(' ')}
                  aria-pressed={isActive}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex-shrink-0 h-9 gap-1.5 text-sm font-normal bg-card"
              >
                <span className="hidden sm:inline">{SORT_LABELS[sort]}</span>
                <span className="sm:hidden">Sortera</span>
                <ChevronDown size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <DropdownMenuItem
                  key={k}
                  onClick={() => setSort(k)}
                  className={sort === k ? 'font-medium' : ''}
                >
                  {SORT_LABELS[k]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ========== INNEHÅLL ========== */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-20">
        {loading ? (
          <BlogSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyResults onClear={clearFilters} />
        ) : (
          <>
            {featured && (
              <FeaturedCard
                key={`featured-${featured.slug}`}
                post={featured}
              />
            )}

            {rest.length > 0 && (
              <section className="mt-10" aria-label="Fler artiklar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  <AnimatePresence mode="popLayout">
                    {rest.map((post, i) => (
                      <ArticleCard key={post.slug} post={post} index={i} />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}
          </>
        )}

        {/* CTA */}
        <section className="mt-16 rounded-2xl border border-border/70 bg-card p-8 text-center">
          <h2 className="font-display text-xl text-foreground mb-2">
            Spåra din träning digitalt
          </h2>
          <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
            Skapa ett gratis konto och börja logga träning, resultat och hälsa.
          </p>
          <Button
            onClick={() => navigate('/auth')}
            className="gap-2"
          >
            Kom igång gratis <ArrowRight size={16} />
          </Button>
        </section>
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Featured-kort (full-width hero)
   ───────────────────────────────────────────────────────────────────── */
function FeaturedCard({ post }: { post: BlogPost }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <Link
        to={`/blogg/${post.slug}`}
        className="group block overflow-hidden rounded-2xl border border-border/70 bg-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          <CategoryPlaceholder
            category={post.category}
            className="aspect-[16/9] md:aspect-auto md:min-h-[320px]"
            iconSize={88}
          />
          <div className="p-7 md:p-10 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-4">
              <CategoryPill category={post.category} />
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Clock size={12} /> {post.readTime} min
              </span>
              <span className="text-[11px] uppercase tracking-wider text-primary font-medium">
                Senaste
              </span>
            </div>
            <h2 className="font-display text-2xl md:text-3xl text-foreground tracking-tight mb-3 group-hover:text-primary transition-colors">
              {post.title}
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-6 line-clamp-3">
              {post.excerpt}
            </p>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              Läs artikeln
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-1"
              />
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Vanligt artikelkort i griden
   ───────────────────────────────────────────────────────────────────── */
function ArticleCard({ post, index }: { post: BlogPost; index: number }) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.3) }}
    >
      <Link
        to={`/blogg/${post.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-[14px] border border-border/70 bg-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
      >
        <CategoryPlaceholder
          category={post.category}
          className="aspect-[16/9] w-full"
          iconSize={48}
        />
        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-center gap-2 mb-2.5">
            <CategoryPill category={post.category} />
            <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
              <Clock size={11} /> {post.readTime} min
            </span>
          </div>
          <h3 className="font-display text-lg text-foreground tracking-tight mb-2 group-hover:text-primary transition-colors line-clamp-2">
            {post.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-4">
            {post.excerpt}
          </p>
          <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-primary">
            Läs mer
            <ArrowRight
              size={13}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </span>
        </div>
      </Link>
    </motion.article>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Tomt state + skeletons
   ───────────────────────────────────────────────────────────────────── */
function EmptyResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="text-center py-20">
      <div className="inline-flex w-14 h-14 rounded-full bg-muted items-center justify-center mb-4">
        <Search size={22} className="text-muted-foreground" />
      </div>
      <h2 className="font-display text-lg text-foreground mb-1">
        Inga artiklar matchar
      </h2>
      <p className="text-sm text-muted-foreground mb-5">
        Prova en annan kategori eller rensa filtret.
      </p>
      <Button variant="outline" onClick={onClear}>
        Rensa filter
      </Button>
    </div>
  );
}

function BlogSkeleton() {
  return (
    <>
      {/* Hero-skelett */}
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <Skeleton className="aspect-[16/9] md:aspect-auto md:min-h-[320px] rounded-none" />
          <div className="p-8 space-y-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-8 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-20 mt-4" />
          </div>
        </div>
      </div>

      {/* Grid-skelett */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="overflow-hidden rounded-[14px] border border-border/70 bg-card">
            <Skeleton className="aspect-[16/9] w-full rounded-none" />
            <div className="p-5 space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
