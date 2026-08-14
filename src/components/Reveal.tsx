import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Scroll-reveal: translateY(40px) + fade när elementet korsar viewporten.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "article" | "li" | "span";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={`reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

/** Ord-för-ord uppstigande rubriktext (hero). */
export function RisingWords({
  text,
  className = "",
  stagger = 90,
  startDelay = 0,
}: {
  text: string;
  className?: string;
  stagger?: number;
  startDelay?: number;
}) {
  return (
    <span className={className} aria-label={text}>
      {text.split(" ").map((word, i) => (
        <span key={i} className="word-mask" aria-hidden>
          <span style={{ animationDelay: `${startDelay + i * stagger}ms` }}>
            {word}
            {i < text.split(" ").length - 1 ? " " : ""}
          </span>
        </span>
      ))}
    </span>
  );
}
