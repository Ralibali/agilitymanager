import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense } from "react";

/**
 * Smoke-test för kritiska routes. Vi monterar inte hela App.tsx (för
 * tungt och drar in massa contexts) — istället verifierar vi att
 * routing-grunden fungerar och att lazy-imports av publika sidor inte
 * kraschar vid import. Skyddar mot regressioner när App.tsx delas upp.
 */

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
  },
}));

describe("routing smoke", () => {
  it("redirects unknown app routes via Navigate", async () => {
    render(
      <MemoryRouter initialEntries={["/some-unknown-app-route"]}>
        <Routes>
          <Route path="/auth" element={<div>auth-page</div>} />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText("auth-page")).toBeInTheDocument();
    });
  });

  it("can lazy-load the public NotFound page module", async () => {
    // Ren import-test: säkerställer att NotFound-modulen inte kraschar
    // vid load (t.ex. trasig import-kedja).
    const mod = await import("@/pages/NotFound");
    expect(mod.default).toBeDefined();
  });

  it("can lazy-load critical public pages", async () => {
    const pages = await Promise.all([
      import("@/pages/LandingPage"),
      import("@/pages/AuthPage"),
      import("@/pages/BlogPage"),
      import("@/pages/PrivacyPolicyPage"),
      import("@/pages/CookiePolicyPage"),
      import("@/pages/HelpResultImportPage"),
    ]);
    for (const mod of pages) {
      expect(mod.default).toBeDefined();
    }
  });

  it("Suspense boundary works with lazy components", async () => {
    const Lazy = (await import("@/pages/NotFound")).default;
    render(
      <HelmetProvider>
        <MemoryRouter>
          <Suspense fallback={<div>loading…</div>}>
            <Lazy />
          </Suspense>
        </MemoryRouter>
      </HelmetProvider>
    );
    // Det räcker att rendreringen inte kastar.
    expect(document.body).toBeTruthy();
  });
});
