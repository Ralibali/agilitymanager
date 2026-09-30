import type { ComponentProps } from "react";
import { Link } from "react-router";
import { track } from "@/lib/analytics";

/**
 * Intern länk som även mäter klicket som `cta_click` (efter statistikmedgivande),
 * så att vi kan se vilka knappar och placeringar som faktiskt konverterar.
 */
export function CtaLink({
  placement,
  onClick,
  to,
  ...rest
}: ComponentProps<typeof Link> & { placement: string }) {
  return (
    <Link
      to={to}
      onClick={(e) => {
        track("cta_click", { placement, target: typeof to === "string" ? to.split("?")[0] : undefined });
        onClick?.(e);
      }}
      {...rest}
    />
  );
}
