import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PremiumGate } from "@/components/PremiumGate";
import type { GateFeatureKey } from "@/components/v3/gateCopy";

interface PreviewGateProps {
  featureKey: GateFeatureKey;
  /** Skelett/exempel-layout som visas blurrad bakom gate-kortet. Får INTE innehålla faktisk Pro-data. */
  preview: ReactNode;
  /** Den riktiga vyn som visas för Pro-användare (inkl. trial). */
  children: ReactNode;
}

/**
 * För de mest värdefulla Pro-ytorna: istället för en ren "Pro krävs"-skärm
 * rendera funktionens layout (skelett/exempel) blurrad och lägg gate-kortet
 * ovanpå. Användaren ser direkt vad de går miste om.
 *
 * Säkerhet: `preview` ska vara ett skelett — inga faktiska Pro-värden i DOM:en.
 * Blur-laget är `pointer-events-none`, `select-none`, `aria-hidden` och
 * `inert` så ingen interaktion eller AT-läsning sker.
 */
export function PreviewGate({ featureKey, preview, children }: PreviewGateProps) {
  const { subscription } = useAuth();

  if (subscription.loading) return <>{children}</>;
  if (subscription.subscribed) return <>{children}</>;

  return (
    <div className="relative">
      <div
        className="blur-sm pointer-events-none select-none"
        aria-hidden="true"
        // @ts-expect-error inert är giltigt HTML-attribut, saknas i React-typen
        inert=""
      >
        {preview}
      </div>
      <div className="absolute inset-0 flex items-start justify-center pt-16 px-4">
        <div className="w-full max-w-md rounded-v3-2xl bg-v3-canvas-elevated/95 backdrop-blur-md shadow-v3-lg border border-v3-canvas-sunken/40">
          <PremiumGate fullPage featureKey={featureKey}>
            <></>
          </PremiumGate>
        </div>
      </div>
    </div>
  );
}
