import { FadeIn } from "./FadeIn";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof FadeIn>, "scroll">;

/**
 * Convenience-wrapper kring <FadeIn scroll> – läsbarhet i landningssidor.
 */
export function ScrollReveal(props: Props) {
  return <FadeIn scroll {...props} />;
}
