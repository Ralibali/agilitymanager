import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { BlogFaqSection } from '@/lib/blogFaqs';

interface BlogFAQProps {
  section: BlogFaqSection;
}

/**
 * Visuell FAQ-sektion för blogginlägg. Texten i frågor och svar MÅSTE
 * matcha JSON-LD schema exakt (renderas i <head> via SEO-komponenten).
 */
export function BlogFAQ({ section }: BlogFAQProps) {
  return (
    <section className="px-4 mt-6 max-w-2xl mx-auto" aria-labelledby="blog-faq-heading">
      <div className="bg-card rounded-xl p-5 sm:p-8 shadow-card">
        <h2
          id="blog-faq-heading"
          className="font-display font-bold text-foreground text-lg mb-4"
        >
          {section.heading}
        </h2>
        <Accordion type="single" collapsible className="w-full">
          {section.items.map((item, idx) => (
            <AccordionItem key={idx} value={`faq-${idx}`}>
              <AccordionTrigger className="text-left font-display font-semibold text-foreground text-sm hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-foreground/90 leading-relaxed">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
