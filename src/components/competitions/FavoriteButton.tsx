import { Heart } from "lucide-react";
import { useFavoriteCompetitions } from "@/lib/favoriteCompetitions";

/**
 * Hjärtknapp för att spara en tävling som favorit.
 * `variant="icon"` används ovanpå tävlingskorten, `"pill"` på detaljsidan.
 */
export function FavoriteButton({
  compKey,
  variant = "icon",
  className = "",
}: {
  compKey: string;
  variant?: "icon" | "pill";
  className?: string;
}) {
  const { isFavorite, toggle } = useFavoriteCompetitions();
  const active = isFavorite(compKey);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(compKey);
  };

  const label = active ? "Ta bort från favoriter" : "Spara som favorit";

  if (variant === "pill") {
    return (
      <button
        onClick={onClick}
        aria-pressed={active}
        aria-label={label}
        className={`inline-flex items-center gap-2 rounded-full border-2 px-6 py-3 text-sm font-bold shadow-hard-sm transition-transform hover:-translate-y-0.5 ${
          active ? "border-ink bg-ember text-paper" : "border-ink/15 bg-paper text-ink/70 hover:border-ink hover:text-ink"
        } ${className}`}
      >
        <Heart className={`h-4 w-4 ${active ? "fill-current" : ""}`} />
        {active ? "Sparad som favorit" : "Spara som favorit"}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={`grid h-10 w-10 place-items-center rounded-full border-2 transition-colors ${
        active ? "border-ink bg-ember text-paper" : "border-ink/15 bg-paper text-ink/45 hover:border-ink hover:text-ink"
      } ${className}`}
    >
      <Heart className={`h-4 w-4 ${active ? "fill-current" : ""}`} />
    </button>
  );
}
