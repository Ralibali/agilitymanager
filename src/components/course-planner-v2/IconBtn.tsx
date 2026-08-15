/**
 * IconBtn — konsekvent ikon-knapp för Course Planner V2.
 * Används både i topbar och i canvas-verktygsraden så alla knappar
 * delar höjd, radie, border och hover-tillstånd.
 *
 * Varianter:
 *  - "ghost" (default): vit yta, tunn border, hover = mörkare border
 *  - "primary": grön fyllning (Spara-knapp och liknande primärval)
 *  - "active": svart fyllning (markerat verktyg / på-läge)
 */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "ghost" | "primary" | "active";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  /** Synlig text bredvid ikonen — döljs under sm-brytpunkten om hideLabelOnMobile=true. */
  label?: string;
  /** Tooltip + aria-label. Krävs när label saknas. */
  title: string;
  variant?: Variant;
  hideLabelOnMobile?: boolean;
  active?: boolean;
}

const baseClass =
  "h-9 rounded-full inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold border transition disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a6b3c]/30";

const variantClass: Record<Variant, string> = {
  ghost: "bg-card text-neutral-700 border-border hover:border-neutral-400",
  primary: "bg-[#1a6b3c] text-white border-[#1a6b3c] hover:bg-[#155730]",
  active: "bg-neutral-900 text-white border-neutral-900",
};

export const IconBtn = forwardRef<HTMLButtonElement, Props>(function IconBtn(
  { icon, label, title, variant = "ghost", hideLabelOnMobile = true, active, className, ...rest },
  ref,
) {
  const resolved: Variant = active ? "active" : variant;
  const hasLabel = !!label;
  return (
    <button
      ref={ref}
      type="button"
      title={title}
      aria-label={title}
      className={cn(
        baseClass,
        variantClass[resolved],
        hasLabel ? (hideLabelOnMobile ? "w-9 sm:w-auto sm:px-3" : "px-3") : "w-9",
        className,
      )}
      {...rest}
    >
      {icon}
      {hasLabel && (
        <span className={hideLabelOnMobile ? "hidden sm:inline" : "inline"}>{label}</span>
      )}
    </button>
  );
});
