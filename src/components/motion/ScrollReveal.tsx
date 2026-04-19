import { FadeIn } from "./FadeIn";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof FadeIn>, "whileInView">;

/**
 * Convenience-wrapper kring <FadeIn whileInView> – för läsbarhet i landningssidor.
 */
export function ScrollReveal(props: Props) {
  return <FadeIn whileInView {...props} />;
}
