import { useState } from "react";
import { Link } from "react-router";
import { ArrowRight, ArrowUpRight, Check, ShieldCheck } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Seo } from "@/components/Seo";
import { insuranceAffiliate } from "@/lib/affiliate";
import insurance from "@/content/dog-insurance.json";

const PATH = "/jamfor-hundforsakring";
const sourceDate = new Date(`${insurance.checkedAt}T12:00:00`).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" });

export default function DogInsurancePage() {
  const [selected, setSelected] = useState(insurance.providers.map((provider) => provider.id));
  const visible = insurance.providers.filter((provider) => selected.includes(provider.id));
  const hasInsuranceAds = insurance.providers.some((provider) => insuranceAffiliate(provider.id));

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Seo title="Jämför hundförsäkring – villkor för aktiva hundar | AgilityManager" description={insurance.description} canonicalPath={PATH} />
      <SiteNav />
      <main className="pt-36 sm:pt-40">
        <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-12 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:gap-16 lg:pb-20">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-forest">Hundliv · Försäkring</p>
            <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[1.05] sm:text-6xl lg:text-7xl">{insurance.title}</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/70">Från vardagspromenaden till nästa start. Få en överblick över skyddet och jämför det som spelar roll när din hund behöver vård.</p>
            <a href="#jamforelse" className="pressable shadow-hard-sm mt-7 inline-flex items-center gap-2 rounded-full bg-tang px-6 py-3.5 font-bold">Jämför försäkringarna <ArrowRight aria-hidden="true" className="h-4 w-4" /></a>
            <p className="mt-5 text-sm text-ink/60">Uppgifter kontrollerade <time dateTime={insurance.checkedAt}>{sourceDate}</time>.</p>
          </div>
          <div className="self-center rounded-3xl border-2 border-ink bg-cream p-6 shadow-hard sm:p-8">
            <ShieldCheck aria-hidden="true" className="h-10 w-10 text-forest" />
            <h2 className="mt-4 font-display text-3xl">Börja med skyddet.</h2>
            <p className="mt-3 leading-relaxed text-ink/70">Priset beror bland annat på hunden, var du bor och vald självrisk. Du får ett personligt pris direkt hos respektive bolag.</p>
            <ul className="mt-5 space-y-3 text-sm font-semibold">
              {["Veterinärvårdsbelopp och delgränser", "Fast och rörlig självrisk", "Rehabilitering och tidigare besvär"].map((item) => <li key={item} className="flex items-start gap-2"><Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-forest" />{item}</li>)}
            </ul>
          </div>
        </section>

        <section id="jamforelse" className="scroll-mt-32 border-y border-ink/10 bg-white/60 py-10 sm:py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-forest">Sida vid sida</p><h2 className="mt-2 font-display text-4xl">Jämför innehållet.</h2></div>
              <p className="max-w-lg text-sm leading-relaxed text-ink/60">Ett urval av tre aktörer, i alfabetisk ordning. Översikten är ingen rangordning och täcker inte hela marknaden.</p>
            </div>
            {hasInsuranceAds ? <p className="mt-6 rounded-xl border border-forest/20 bg-forest/5 p-4 text-sm"><strong>Annonsinformation:</strong> Länkar märkta ”Annonslänk” kan ge AgilityManager ersättning om du tecknar försäkring. Ersättningen ändrar inte den alfabetiska ordningen.</p> : null}
            <fieldset className="mt-7">
              <legend className="mb-3 text-sm font-semibold">Välj vilka du vill visa</legend>
              <div className="flex flex-wrap gap-3">
                {insurance.providers.map((provider) => <label key={provider.id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-ink/20 bg-paper px-4 text-sm font-semibold"><input type="checkbox" className="h-4 w-4 accent-forest" checked={selected.includes(provider.id)} onChange={() => setSelected((previous) => previous.includes(provider.id) ? previous.filter((id) => id !== provider.id) : [...previous, provider.id])} />{provider.name}</label>)}
              </div>
            </fieldset>
            <p className="sr-only" role="status">{visible.length} försäkringsaktörer visas</p>
            {visible.length === 0 ? <div className="mt-6 rounded-2xl border border-ink/20 bg-paper p-8"><p>Välj minst en aktör för att visa jämförelsen.</p><button type="button" onClick={() => setSelected(insurance.providers.map((provider) => provider.id))} className="mt-4 rounded-full bg-forest px-5 py-3 font-bold text-white">Visa alla</button></div> : null}
            <div className="mt-6 grid items-stretch gap-5 lg:grid-cols-3">
              {visible.map((provider) => {
                const partner = insuranceAffiliate(provider.id);
                return <article key={provider.id} aria-label={provider.name} className="flex flex-col overflow-hidden rounded-2xl border-2 border-ink/15 bg-paper">
                  <div className="border-b border-ink/10 p-6"><h3 className="font-display text-3xl">{provider.name}</h3><p className="mt-1 min-h-10 text-sm text-ink/60">{provider.product}</p><p className="mt-5 text-xs font-bold uppercase tracking-wider text-forest">Veterinärvård</p><p className="mt-1 text-xl font-extrabold">{provider.veterinary}</p><p className="mt-2 text-sm leading-relaxed text-ink/65">{provider.levels}</p></div>
                  <dl className="flex-1 space-y-5 p-6 text-sm leading-relaxed">
                    <div><dt className="font-bold">Självrisk</dt><dd className="mt-1 text-ink/70">{provider.deductible}</dd></div>
                    <div><dt className="font-bold">Självriskperiod</dt><dd className="mt-1 text-ink/70">{provider.period}</dd></div>
                    <div><dt className="font-bold">Rehabilitering</dt><dd className="mt-1 text-ink/70">{provider.rehab}</dd></div>
                    <div><dt className="font-bold">Kontrollera särskilt</dt><dd className="mt-1 text-ink/70">{provider.check}</dd></div>
                  </dl>
                  <div className="border-t border-ink/10 p-6">
                    {partner ? <p className="mb-2 text-xs font-bold uppercase tracking-wide text-forest">Annonslänk · {provider.name}</p> : null}
                    <a href={partner?.insuranceUrl ?? provider.url} target="_blank" rel={partner ? "sponsored noopener noreferrer" : "noopener noreferrer"} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-forest px-4 py-3 text-sm font-bold text-white hover:bg-ink">Se pris hos {provider.name}<ArrowUpRight aria-hidden="true" className="h-4 w-4" /><span className="sr-only"> (öppnas i ny flik)</span></a>
                    <a href={provider.termsUrl} target="_blank" rel="noopener noreferrer" className="mt-4 block text-center text-sm underline underline-offset-4">Läs {provider.name}s information och villkor<span className="sr-only"> (öppnas i ny flik)</span></a>
                  </div>
                </article>;
              })}
            </div>
            <p className="mt-6 max-w-4xl text-sm leading-relaxed text-ink/60">Beloppen är ersättningsgränser, inte garanterade utbetalningar. Självrisk, delbelopp och undantag påverkar ersättningen. Översikten ersätter inte bolagets aktuella förköpsinformation, villkor och ditt försäkringsbrev.</p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="font-display text-4xl">För dig som tränar och tävlar.</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-ink/65">Ta med de här frågorna när du jämför. Vi har inte bedömt vilket skydd som passar just din hund.</p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {insurance.checklist.map((item, index) => <div key={item.title} className="rounded-2xl border border-ink/15 p-6"><p className="text-xs font-extrabold tracking-widest text-forest">0{index + 1}</p><h3 className="mt-2 text-lg font-bold">{item.title}</h3><p className="mt-2 leading-relaxed text-ink/70">{item.text}</p></div>)}
          </div>
          <div className="mt-10 rounded-2xl bg-cream p-6 sm:p-8">
            <h2 className="text-xl font-bold">Så har vi jämfört</h2>
            <p className="mt-3 max-w-3xl leading-relaxed text-ink/70">Vi har sammanställt offentlig produktinformation från aktörerna nedan och kontrollerat den {sourceDate}. Urvalet består av Lassie, Petson och Svedea. Vi jämför inte individuella premier och har inte testat skadehanteringen eller satt egna betyg. Läs alltid aktuella villkor innan du väljer.</p>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm">
              {insurance.providers.map((provider) => <li key={provider.id}><a href={provider.url} className="font-semibold underline underline-offset-4">Källa: {provider.name}</a></li>)}
              <li><a href={insurance.guideSource} className="font-semibold underline underline-offset-4">Konsumenternas: premie och självrisk</a></li>
            </ul>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-ink p-6 text-paper sm:p-8"><div><h2 className="font-display text-3xl">Redo för nästa träningspass?</h2><p className="mt-2 text-paper/70">Hitta en övning och anpassa den till din hund.</p></div><Link to="/banor" className="inline-flex items-center gap-2 rounded-full bg-tang px-6 py-3 font-bold text-ink">Till banbiblioteket <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link></div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
