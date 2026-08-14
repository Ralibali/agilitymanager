import { Link } from "react-router";
import { ArrowRight, Check, Gift, Heart, Infinity as InfinityIcon, PenLine } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { EmailCapture } from "@/components/EmailCapture";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

const ALL_FREE = [
  "Hela banplaneraren — agility + hoopers",
  "Alla hinder, mallar och planstorlekar",
  "Banbibliotek med färdiga banor",
  "PNG-export & lokal autosparning",
  "Delningslänkar till dina banor",
  "Tävlingskalender",
  "Mobil & dator, touch på riktigt",
  "Inga konto. Inga kort. Inga gränser.",
];

const FAQ = [
  {
    q: "Är allt verkligen gratis?",
    a: "Ja. Banplaneraren, banbiblioteket, exporten, delningen och tävlingskalendern — allt kostar 0 kr, för alltid. Det finns inget konto att uppgradera och inga funktioner bakom betalvägg.",
  },
  {
    q: "Varför frågar ni efter min e-post när jag delar en bana?",
    a: "Det är det enda vi någonsin ber om. Din e-post går till vårt nyhetsbrev med nya banor, tävlingspåminnelser och träningstips — det är så vi växer och kan hålla allt gratis. Du kan avsluta prenumerationen när du vill.",
  },
  {
    q: "Behöver jag e-post för att rita?",
    a: "Nej! Rita hur mycket du vill, helt anonymt. Banan autosparas i din egen webbläsare. E-post behövs först när du vill dela en bana via länk.",
  },
  {
    q: "Vart tar mina banor vägen?",
    a: "De sparas lokalt i din webbläsare — vi lagrar inga banor på någon server. Delningslänkar bär hela banan i själva länken, så mottagaren behöver inget heller.",
  },
  {
    q: "Hur tjänar ni pengar?",
    a: "Just nu handlar allt om att bygga sportens bästa gratisverktyg och community. Nyhetsbrevet är vår kanal — där kan vi i framtiden presentera relevanta samarbeten, alltid tydligt märkta.",
  },
];

export default function GratisPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteNav />
      <PageHero kicker="Priser" title="Allt är gratis. På riktigt.">
        Ingen provperiod. Inget konto. Inget kort. Banplaneraren och allt runt
        den kostar noll kronor — idag, imorgon och för alltid.
      </PageHero>

      {/* 0 kr-manifestet */}
      <section className="border-b-2 border-ink bg-forest text-paper">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-tang">Vår prislista, i sin helhet</p>
            <p className="mt-4 font-display text-[10rem] leading-none sm:text-[14rem]">
              0 <span className="text-6xl sm:text-8xl">kr</span>
            </p>
            <div className="mt-6 flex items-center gap-3 text-xl font-bold text-paper/80">
              <InfinityIcon className="h-7 w-7 text-tang" />
              Gäller alla funktioner, alla sporter, alla hundar
            </div>
            <Link
              to="/banplanerare"
              className="pressable pressable-light shadow-hard-paper mt-9 inline-flex h-14 items-center gap-2 rounded-full bg-tang px-8 text-lg font-bold text-ink"
            >
              Öppna banplaneraren <ArrowRight className="h-5 w-5" />
            </Link>
          </Reveal>
          <Reveal delay={150}>
            <ul className="grid gap-px overflow-hidden rounded-3xl border-2 border-paper/20 bg-paper/20 sm:grid-cols-2">
              {ALL_FREE.map((f) => (
                <li key={f} className="flex items-center gap-3 bg-forest px-5 py-4 font-semibold text-paper/90">
                  <Check className="h-5 w-5 shrink-0 text-tang" strokeWidth={3} /> {f}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* Varför gratis + e-post */}
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-forest">Varför är det gratis?</p>
          <h2 className="mt-3 font-display text-5xl leading-[0.95] sm:text-6xl">
            Planeraren är vårt skyltfönster.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-ink/65">
            Vi vill att varenda förare, tränare och klubb i Sverige ska rita banor
            som proffs — utan att någonsin dra kortet. Ju fler som använder
            verktyget, desto starkare blir communityt.
          </p>
          <div className="mt-8 space-y-4">
            <div className="flex items-start gap-4 rounded-2xl border-2 border-ink bg-[#FCFAF4] p-5 shadow-hard-sm">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-tang text-ink">
                <Gift className="h-5 w-5" />
              </span>
              <p className="leading-relaxed text-ink/75">
                <b className="text-ink">Rita fritt, anonymt.</b> Banan sparas i din egen
                webbläsare. Vi ber aldrig om något för att du ska få rita.
              </p>
            </div>
            <div className="flex items-start gap-4 rounded-2xl border-2 border-ink bg-[#FCFAF4] p-5 shadow-hard-sm">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-forest text-paper">
                <Heart className="h-5 w-5" />
              </span>
              <p className="leading-relaxed text-ink/75">
                <b className="text-ink">Vill du dela din bana?</b> Då ber vi om din e-post —
                det är vår enda "valuta". Du får en delningslänk, vi får skicka
                nyhetsbrevet. Snygg deal.
              </p>
            </div>
          </div>
        </Reveal>
        <Reveal delay={150}>
          <div className="rounded-3xl border-2 border-ink bg-ink p-8 text-paper shadow-hard lg:sticky lg:top-40">
            <span className="inline-flex items-center gap-2 rounded-full bg-tang px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider text-ink">
              <PenLine className="h-3.5 w-3.5" /> Nyhetsbrevet
            </span>
            <div className="mt-5">
              <EmailCapture variant="dark" />
            </div>
            <p className="mt-5 text-xs leading-relaxed text-paper/40">
              Vi delar aldrig din adress med tredje part och du kan avregistrera dig
              med ett klick i varje mejl.
            </p>
          </div>
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="border-t-2 border-ink bg-ink text-paper">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <Reveal className="text-center">
            <h2 className="font-display text-5xl sm:text-6xl">Vanliga frågor</h2>
          </Reveal>
          <Reveal delay={150}>
            <Accordion type="single" collapsible className="mt-10 space-y-3">
              {FAQ.map((f, i) => (
                <AccordionItem
                  key={f.q}
                  value={`faq-${i}`}
                  className="rounded-2xl border-2 border-paper/15 bg-[#1E211B] px-6 transition-colors data-[state=open]:border-tang"
                >
                  <AccordionTrigger className="py-5 text-left text-lg font-bold hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 leading-relaxed text-paper/65">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
