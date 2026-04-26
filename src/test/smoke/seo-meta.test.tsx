import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { SEO } from "@/components/SEO";

/**
 * Smoke-test för SEO-komponenten. Säkerställer att kritiska
 * meta-fält (title, description, canonical) renderas i <head> så
 * att senare SEO-arbete (steg 7) inte regredierar oupptäckt.
 */
describe("SEO component", () => {
  it("renders title, description and canonical tags", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const helmetContext: any = {};
    render(
      <HelmetProvider context={helmetContext}>
        <MemoryRouter>
          <SEO
            title="Testtitel"
            description="Testbeskrivning som är tillräckligt lång för att vara meningsfull."
            canonical="https://agilitymanager.se/test"
          />
        </MemoryRouter>
      </HelmetProvider>
    );

    const helmet = helmetContext.helmet;
    expect(helmet).toBeDefined();
    const titleStr = helmet.title.toString();
    const metaStr = helmet.meta.toString();
    const linkStr = helmet.link.toString();
    expect(titleStr).toContain("Testtitel");
    expect(metaStr).toContain("Testbeskrivning");
    expect(linkStr).toContain('rel="canonical"');
    expect(linkStr).toContain("https://agilitymanager.se/test");
  });
});
