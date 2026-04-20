import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooterV2 } from "@/components/landing/LandingFooterV2";
import { motion as motionTokens } from "@/lib/motion";
import { CountUp } from "@/components/CountUp";
import { ScrollProgress } from "@/components/motion";
import { Disclaimer } from "@/components/Disclaimer";

type BreedFull = {
  id: string;
  slug: string;
  name: string;
  name_en: string | null;
  description: string;
  size_class: "XS" | "S" | "M" | "L" | "XL";
  agility_suitability: number | null;
  hoopers_suitability: number | null;
  typical_height_cm: string | null;
  typical_weight_kg: string | null;
  life_expectancy: string | null;
  origin_country: string | null;
  breed_group: string | null;
  agility_strengths: string;
  agility_challenges: string;
  training_tips: string;
  temperament: string[];
  image_url: string | null;
  image_attribution: string | null;
};

type RelatedBreed = {
  id: string;
  slug: string;
  name: string;
  size_class: string;
  image_url: string | null;
};

function normalizeScore(s: number | null): number {
  if (s == null) return 0;
  // DB-skala är 0-10. Klampa för säkerhets skull.
  return Math.max(0, Math.min(10, Math.round(s)));
}

export default function BreedDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [breed, setBreed] = useState<BreedFull | null>(null);
  const [related, setRelated] = useState<RelatedBreed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("breeds")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (cancelled) return;
      if (!data) {
        navigate("/raser", { replace: true });
        return;
      }
      setBreed(data as BreedFull);

      const { data: rel } = await supabase
        .from("breeds")
        .select("id, slug, name, size_class, image_url")
        .eq("published", true)
        .eq("size_class", data.size_class)
        .neq("id", data.id)
        .limit(3);
      if (cancelled) return;
      setRelated((rel ?? []) as RelatedBreed[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, navigate]);

  // Parallax på hero-bilden (0.6x scroll)
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, 240]);

  if (loading || !breed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="font-body text-muted-foreground">Laddar…</div>
      </div>
    );
  }

  const agility = normalizeScore(breed.agility_suitability);
  const hoopers = normalizeScore(breed.hoopers_suitability);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>{`${breed.name} – ras för agility & hoopers | AgilityManager`}</title>
        <meta
          name="description"
          content={`Allt om ${breed.name}: storlek, temperament, träningstips och lämplighet för agility och hoopers.`}
        />
        <link rel="canonical" href={`https://agilitymanager.se/raser/${breed.slug}`} />
      </Helmet>

      <ScrollProgress />
      <LandingNav />

      <main className="flex-1">
        {/* Hero med parallax */}
        <section className="relative h-[44vh] sm:h-[58vh] min-h-[320px] overflow-hidden bg-secondary">
          {breed.image_url ? (
            <motion.img
              src={breed.image_url}
              alt={breed.name}
              style={{ y: heroY }}
              className="absolute inset-0 w-full h-[120%] object-cover"
            />
          ) : (
            <motion.div
              style={{ y: heroY }}
              aria-hidden
              className="absolute inset-0 w-full h-[120%]"
            >
              <div
                className="w-full h-full"
                style={{
                  background:
                    "linear-gradient(135deg, #1a6b3c 0%, #0f4d2a 60%, #c85d1e 130%)",
                }}
              />
            </motion.div>
          )}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.55) 100%)",
            }}
          />
          <div className="relative z-[1] h-full max-w-5xl mx-auto px-4 flex flex-col justify-end pb-8 sm:pb-12">
            <motion.nav
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: motionTokens.duration.base,
                ease: motionTokens.ease.out,
              }}
              className="flex items-center gap-1.5 text-xs font-body text-white/80 mb-3"
              aria-label="Brödsmulor"
            >
              <Link to="/" className="hover:text-white transition-colors">Hem</Link>
              <ChevronRight size={12} />
              <Link to="/raser" className="hover:text-white transition-colors">Raser</Link>
              <ChevronRight size={12} />
              <span className="text-white/95">{breed.name}</span>
            </motion.nav>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: motionTokens.duration.smooth,
                delay: 0.1,
                ease: motionTokens.ease.out,
              }}
              className="font-display text-white text-3xl sm:text-5xl leading-tight"
            >
              {breed.name}
            </motion.h1>
            {breed.name_en && breed.name_en !== breed.name && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: motionTokens.duration.smooth,
                  delay: 0.22,
                  ease: motionTokens.ease.out,
                }}
                className="font-body text-white/80 text-sm sm:text-base mt-1"
              >
                {breed.name_en}
              </motion.p>
            )}
          </div>
        </section>

        {/* Snabbfakta */}
        <section className="px-4 -mt-10 relative z-[2]">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{
              once: true,
              amount: 0.2,
              margin: motionTokens.viewport.margin,
            }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: motionTokens.stagger.base } },
            }}
            className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3"
          >
            <FactCard label="Agility-lämplighet" value={agility} suffix=" / 10" />
            <FactCard label="Hoopers-lämplighet" value={hoopers} suffix=" / 10" />
            <FactCardText label="Storleksklass" value={breed.size_class} />
            <FactCardText
              label="Livslängd"
              value={breed.life_expectancy ?? "—"}
            />
          </motion.div>
        </section>

        {/* Beskrivning */}
        {breed.description && (
          <section className="px-4 py-12">
            <div className="max-w-3xl mx-auto">
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  duration: motionTokens.duration.smooth,
                  ease: motionTokens.ease.out,
                }}
                className="font-body text-foreground text-base sm:text-lg leading-relaxed"
              >
                {breed.description}
              </motion.p>
            </div>
          </section>
        )}

        {/* Styrkor & Utmaningar */}
        <section className="px-4 pb-12">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            <BulletCard
              title="Styrkor i agility"
              text={breed.agility_strengths}
              accent="#1a6b3c"
            />
            <BulletCard
              title="Utmaningar att tänka på"
              text={breed.agility_challenges}
              accent="#c85d1e"
            />
          </div>
        </section>

        {/* Träningstips */}
        {breed.training_tips && (
          <section className="px-4 pb-16">
            <div className="max-w-3xl mx-auto bg-card border border-border rounded-2xl p-6 sm:p-8">
              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: motionTokens.duration.base,
                  ease: motionTokens.ease.out,
                }}
                className="font-display text-foreground text-xl sm:text-2xl mb-4"
              >
                Träningstips
              </motion.h2>
              <BulletList text={breed.training_tips} />
            </div>
          </section>
        )}

        {/* Temperament */}
        {breed.temperament && breed.temperament.length > 0 && (
          <section className="px-4 pb-16">
            <div className="max-w-3xl mx-auto">
              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: motionTokens.duration.base,
                  ease: motionTokens.ease.out,
                }}
                className="font-display text-foreground text-xl sm:text-2xl mb-4"
              >
                Temperament
              </motion.h2>
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: motionTokens.stagger.tight } },
                }}
                className="flex flex-wrap gap-2"
              >
                {breed.temperament.map((t) => (
                  <motion.span
                    key={t}
                    variants={{
                      hidden: { opacity: 0, y: 4 },
                      visible: { opacity: 1, y: 0 },
                    }}
                    transition={{
                      duration: motionTokens.duration.fast,
                      ease: motionTokens.ease.out,
                    }}
                    className="px-3 py-1 rounded-full text-xs font-body bg-card border border-border text-foreground"
                  >
                    {t}
                  </motion.span>
                ))}
              </motion.div>
            </div>
          </section>
        )}

        {/* Relaterade raser */}
        {related.length > 0 && (
          <section className="px-4 pb-20">
            <div className="max-w-5xl mx-auto">
              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: motionTokens.duration.base,
                  ease: motionTokens.ease.out,
                }}
                className="font-display text-foreground text-xl sm:text-2xl mb-6"
              >
                Liknande storleksklass
              </motion.h2>
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: motionTokens.stagger.base } },
                }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4"
              >
                {related.map((r) => (
                  <motion.div
                    key={r.id}
                    variants={{
                      hidden: { opacity: 0, y: 12 },
                      visible: { opacity: 1, y: 0 },
                    }}
                    transition={{
                      duration: motionTokens.duration.smooth,
                      ease: motionTokens.ease.out,
                    }}
                    whileHover={{ y: -2 }}
                  >
                    <Link
                      to={`/raser/${r.slug}`}
                      className="block bg-card border border-border rounded-2xl overflow-hidden"
                    >
                      <div className="aspect-[16/10] bg-secondary overflow-hidden">
                        {r.image_url ? (
                          <img
                            src={r.image_url}
                            alt={r.name}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-full h-full"
                            style={{
                              background:
                                "linear-gradient(135deg, #f0ebe3 0%, #c9b99a 100%)",
                            }}
                          />
                        )}
                      </div>
                      <div className="p-4">
                        <p className="font-display text-foreground text-base">{r.name}</p>
                        <p className="text-xs text-muted-foreground font-body mt-0.5">
                          Storleksklass {r.size_class}
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>

              <div className="mt-8">
                <Link
                  to="/raser"
                  className="inline-flex items-center gap-1.5 text-sm font-body text-foreground hover:text-[#1a6b3c] transition-colors"
                >
                  <ArrowLeft size={14} /> Tillbaka till alla raser
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Ansvarsfriskrivning för rasprofiler */}
        <section className="max-w-3xl mx-auto px-5 md:px-12 pb-12">
          <Disclaimer variant="breed" />
        </section>
      </main>

      <LandingFooterV2 />
    </div>
  );
}

/* ─────────── Fact-cards med count-up ─────────── */
function FactCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{
        duration: motionTokens.duration.smooth,
        ease: motionTokens.ease.out,
      }}
      className="bg-card border border-border rounded-2xl p-4 sm:p-5"
      style={{
        boxShadow: "0 4px 14px rgba(0,0,0,0.05)",
      }}
    >
      <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-muted-foreground font-body mb-1.5">
        {label}
      </p>
      <p className="font-display text-foreground text-2xl">
        <CountUp end={value} duration={0.6} />
        {suffix && (
          <span className="text-base text-muted-foreground font-body">{suffix}</span>
        )}
      </p>
    </motion.div>
  );
}

function FactCardText({ label, value }: { label: string; value: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{
        duration: motionTokens.duration.smooth,
        ease: motionTokens.ease.out,
      }}
      className="bg-card border border-border rounded-2xl p-4 sm:p-5"
      style={{
        boxShadow: "0 4px 14px rgba(0,0,0,0.05)",
      }}
    >
      <p className="text-[11px] uppercase tracking-[0.08em] font-medium text-muted-foreground font-body mb-1.5">
        {label}
      </p>
      <p className="font-display text-foreground text-2xl">{value}</p>
    </motion.div>
  );
}

/* ─────────── Bulletkort med stagger ─────────── */
function BulletCard({
  title,
  text,
  accent,
}: {
  title: string;
  text: string;
  accent: string;
}) {
  if (!text?.trim()) return null;
  const items = text
    .split(/\n|•|·/g)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: motionTokens.duration.smooth,
        ease: motionTokens.ease.out,
      }}
      className="bg-card border border-border rounded-2xl p-6"
    >
      <h2
        className="font-display text-foreground text-lg mb-4 inline-flex items-center gap-2"
      >
        <span
          aria-hidden
          className="inline-block w-1.5 h-5 rounded-full"
          style={{ background: accent }}
        />
        {title}
      </h2>
      <BulletList items={items} />
    </motion.div>
  );
}

function BulletList({
  text,
  items,
}: {
  text?: string;
  items?: string[];
}) {
  const list =
    items ??
    (text
      ? text
          .split(/\n|•|·/g)
          .map((s) => s.trim())
          .filter(Boolean)
      : []);
  if (list.length === 0) return null;
  return (
    <motion.ul
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: motionTokens.stagger.tight } },
      }}
      className="space-y-2"
    >
      {list.map((item, i) => (
        <motion.li
          key={`${i}-${item.slice(0, 12)}`}
          variants={{
            hidden: { opacity: 0, y: 4 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{
            duration: motionTokens.duration.fast,
            ease: motionTokens.ease.out,
          }}
          className="flex items-start gap-2 text-sm font-body text-foreground leading-relaxed"
        >
          <span
            aria-hidden
            className="mt-1.5 w-1 h-1 rounded-full shrink-0"
            style={{ background: "hsl(var(--muted-foreground))" }}
          />
          <span>{item}</span>
        </motion.li>
      ))}
    </motion.ul>
  );
}
