import { Paw } from "./Marquee";

export function RotatingBadge({
  text = "GRATIS BANPLANERARE • UTAN KONTO • ",
  size = 132,
  className = "",
}: {
  text?: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative grid place-items-center ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full animate-spin-slow">
        <defs>
          <path id="badge-circle" d="M 50,50 m -38,0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" />
        </defs>
        <text fontSize="9.2" fontWeight="700" letterSpacing="2.2" fill="currentColor" fontFamily="Archivo, sans-serif">
          <textPath href="#badge-circle">{text}</textPath>
        </text>
      </svg>
      <span className="grid h-[46%] w-[46%] place-items-center rounded-full bg-tang text-ink shadow-hard-sm">
        <Paw className="h-[55%] w-[55%]" />
      </span>
    </div>
  );
}
