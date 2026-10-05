import { Link } from "react-router";
import {
  ArrowRight, BookOpen, FileDown, LayoutGrid, Medal,
  MousePointer2, NotebookPen, Ruler, ShieldCheck, Smartphone, Spline, Users,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHero } from "@/components/PageHero";
import { Marquee } from "@/components/Marquee";
import { Reveal } from "@/components/Reveal";
import { Seo } from "@/components/Seo";
import { PAGE_SEO, seoProps } from "@/lib/pageSeo";

const GROUPS = [
  {
    kicker: "Banplaneraren",
    title: "Rita som en domare.",
    text: "Hela editorn är gratis — inget konto behövs för att börja. Meterskala, snap, banlinje och export som ser ut som en riktig domarritning.",
    items: [
      { icon: MousePointer2, t: "Full hindereditor", d: "Placera, flytta, rotera, duplicera, låsa och numrera — även flera hinder samtidigt. Tunnlar i valfri längd och böj." },
      { icon: Ruler, t: "Meterskala & verkliga mått", d: "Valfria banmått med meterrutnät, 0,25 m-snäpp och hinder i verklig storlek — balansbom, A-hinder och slalom tar den plats de tar på planen." },
      { icon: Spline, t: "Hundens väg live", d: "Hundens linje ritas genom hindren i nummerordning med avstånd och banlängd — samma linje i 2D, 3D och PDF." },
      { icon: ShieldCheck, t: "Regelkontroll", d: "Kontrollera banan mot SAgiK:s agilityregler, Nollklass, SHoK och FCI hoopers: avstånd, hinderantal, start och mål, bankant och klassens tillåtna hinder." },
    ],
  },
  {
    kicker: "Dela & exportera",
    title: "Från din skärm till träningsplanen.",
    text: "Banan ska inte leva kvar i verktyget — den ska ut till gruppen, klubben och planen.",
    items: [
      { icon: FileDown, t: "PDF och PNG", d: "Domar-PDF, bygg-PDF med koordinater, tränings-PDF och startlista — eller en skarp PNG till träningsgruppen." },
      { icon: Users, t: "Delningslänkar", d: "Dela banan med en länk — mottagaren öppnar den direkt i sin egen planerare, utan konto. Vill du publicera i communityn räcker namn och e-post." },
      { icon: NotebookPen, t: "Autosparat lokalt", d: "Banan sparas i din webbläsare medan du ritar. Tappar du fliken finns den kvar när du kommer tillbaka." },
      { icon: LayoutGrid, t: "Mallar & bibliotek", d: "Börja aldrig från noll om du inte vill — ladda en färdig bana och bygg vidare." },
    ],
  },
  {
    kicker: "Kunskap & kvalitet",
    title: "Vi bygger sportens verktygslåda.",
    text: "Banplaneraren är hjärtat — och runt den växer en kunskapsbank som hjälper dig bli en bättre banbyggare, oavsett nivå.",
    items: [
      { icon: BookOpen, t: "Blogg & guider", d: "Fördjupningar om bandesign, säkerhet, regler och träningsupplägg — på svenska." },
      { icon: Medal, t: "Nivåmärkta banor", d: "Träna på banlayouter inspirerade av riktiga klasser och nivåer, från nollklass uppåt." },
      { icon: NotebookPen, t: "Regelöversikter", d: "Vi håller reda på var de officiella regelverken finns — och märker tydligt vad som är vår egen analys." },
      { icon: Smartphone, t: "Mobil, surfplatta och dator", d: "Byggd för touch: nyp för att zooma, dra för att flytta — och alla inställningar finns även i mobilen." },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <Seo
        {...seoProps(PAGE_SEO.features)}
      />
      <SiteNav />
      <PageHero kicker="Funktioner" title="Allt banplaneraren kan.">
        Från första hindret till färdig delningslänk — här är hela verktygslådan.
        Gratis att använda, för både agility och hoopers.
      </PageHero>

      {GROUPS.map((g, gi) => (
        <section
          key={g.kicker}
          className={`border-b-2 border-ink ${gi === 1 ? "bg-forest text-paper" : gi === 2 ? "bg-ink text-paper" : ""}`}
        >
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:py-24">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <Reveal>
                <p className={`text-xs font-bold uppercase tracking-[0.24em] ${gi === 0 ? "text-forest" : "text-tang"}`}>
                  {g.kicker}
                </p>
                <h2 className="mt-3 font-display text-5xl leading-[1.02] sm:text-6xl">{g.title}</h2>
                <p className={`mt-5 text-lg leading-relaxed ${gi === 0 ? "text-ink/65" : "text-paper/65"}`}>
                  {g.text}
                </p>
                <ShieldCheck className={`mt-8 h-9 w-9 ${gi === 0 ? "text-forest" : "text-tang"}`} strokeWidth={2} />
              </Reveal>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {g.items.map((it, i) => (
                <Reveal key={it.t} delay={i * 100}>
                  <article
                    className={`h-full rounded-3xl border-2 p-6 transition-transform duration-300 hover:-translate-y-1.5 ${
                      gi === 0
                        ? "border-ink bg-[#FCFAF4] shadow-hard"
                        : gi === 1
                          ? "border-paper/20 bg-pine hover:border-paper/40"
                          : "border-paper/15 bg-[#1E211B] hover:border-paper/35"
                    }`}
                  >
                    <it.icon className={`h-7 w-7 ${gi === 0 ? "text-forest" : "text-tang"}`} strokeWidth={2.2} />
                    <h3 className="mt-5 text-lg font-extrabold tracking-tight">{it.t}</h3>
                    <p className={`mt-2 text-[0.95rem] leading-relaxed ${gi === 0 ? "text-ink/60" : "text-paper/60"}`}>
                      {it.d}
                    </p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ))}

      <Marquee
        items={["Banplanerare", "Agility", "Hoopers", "Delningslänkar", "PNG-export", "Blogg & guider"]}
        className="border-b-2 border-ink bg-paper text-ink"
        reverse
      />

      <section className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
        <Reveal>
          <h2 className="mx-auto max-w-3xl font-display text-5xl leading-[1.02] sm:text-7xl">
            Testa själv — direkt i webbläsaren.
          </h2>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/banplanerare" className="pressable shadow-hard inline-flex h-14 items-center gap-2 rounded-full bg-tang px-8 text-lg font-bold text-ink">
              Öppna banplaneraren <ArrowRight className="h-5 w-5" />
            </Link>
            <Link to="/blogg" className="pressable shadow-hard inline-flex h-14 items-center gap-2 rounded-full border-2 border-ink bg-paper px-8 text-lg font-bold">
              Läs guiderna först
            </Link>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  );
}
