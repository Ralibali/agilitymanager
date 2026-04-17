import { Link } from "react-router-dom";
import { Timer, ArrowRight } from "lucide-react";
import { PageHeader, DSCard, DSButton, DSEmptyState } from "@/components/ds";

/**
 * Tunn wrapper-sida som länkar till befintlig stopwatch-route.
 * Behåller den existerande full-screen-tidtagaren intakt.
 */
export default function StopwatchPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Träning"
        title="Tidtagarur"
        subtitle="Snabb start, varv och fel direkt i klubben."
      />

      <DSCard>
        <DSEmptyState
          icon={Timer}
          title="Öppna tidtagaruret"
          description="Den nuvarande full-screen-tidtagaren ligger på sin egna route. Den får sin nya design-revamp i en senare fas."
          action={
            <DSButton asChild>
              <Link to="/stopwatch">
                Öppna nuvarande tidtagarur <ArrowRight className="w-4 h-4" />
              </Link>
            </DSButton>
          }
        />
      </DSCard>
    </div>
  );
}
