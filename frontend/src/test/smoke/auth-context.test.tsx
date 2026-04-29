import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { ReactNode } from "react";

/**
 * Smoke-test för AuthProvider/useAuth. Verifierar att kontextet
 * exponerar förväntade fält (user, loading) utan att krascha vid mount.
 * Skyddar mot regressioner i AuthContext-refaktoreringar (steg 12).
 */

const subscriptionMock = { unsubscribe: vi.fn() };

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: subscriptionMock },
      })),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

describe("AuthContext smoke", () => {
  it("renders without throwing and exposes loading + user", async () => {
    const { AuthProvider, useAuth } = await import("@/contexts/AuthContext");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current).toHaveProperty("user");
    expect(result.current).toHaveProperty("loading");
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
  });
});
