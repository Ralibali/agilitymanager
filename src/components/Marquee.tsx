import { Fragment } from "react";

function Paw({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <ellipse cx="12" cy="15.5" rx="4.6" ry="4" />
      <circle cx="5.4" cy="10" r="2.1" />
      <circle cx="9.6" cy="6.6" r="2.2" />
      <circle cx="14.4" cy="6.6" r="2.2" />
      <circle cx="18.6" cy="10" r="2.1" />
    </svg>
  );
}

export { Paw };

export function Marquee({
  items,
  className = "",
  reverse = false,
}: {
  items: string[];
  className?: string;
  reverse?: boolean;
}) {
  const row = (key: string) => (
    <div key={key} className="flex shrink-0 items-center">
      {items.map((item, i) => (
        <Fragment key={`${key}-${i}`}>
          <span className="mx-6 font-display text-2xl tracking-[0.06em] sm:text-3xl">{item}</span>
          <Paw className="h-5 w-5 shrink-0 opacity-80" />
        </Fragment>
      ))}
    </div>
  );
  return (
    <div className={`overflow-hidden py-4 ${className}`} aria-hidden>
      <div
        className="flex w-max animate-marquee"
        style={reverse ? { animationDirection: "reverse" } : undefined}
      >
        {row("a")}
        {row("b")}
      </div>
    </div>
  );
}
