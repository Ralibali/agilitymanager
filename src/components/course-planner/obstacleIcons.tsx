/**
 * obstacleIcons.tsx – Top-down CAD-stil silhuetter för alla 14 hinder.
 *
 * Designprinciper:
 *  - Alla ikoner ritas i en 24×24 viewBox, centrerade kring (12,12).
 *  - Strokes är `currentColor` så att färg styrs via parent (theme).
 *  - Stil: tunna 1.25px-streck, runda kapsar, tydlig planritning.
 *    Inga gradienter, inga skuggor – det här är blueprints, inte 3D.
 *  - Tunnel/A-hinder/balansbom har "djup-streck" som antyder rörelse­riktning.
 *
 * Samma ikon används både i palette (24px) och som preview vid drag (48px).
 */
import * as React from 'react';

export type ObstacleIconKey =
  | 'jump'           // hopp (vinghinder)
  | 'oxer'           // oxer (dubbelhopp)
  | 'wall'           // mur
  | 'longJump'       // långhopp
  | 'tire'           // däck
  | 'softTunnel'     // mjuk tunnel (sluttunnel)
  | 'rigidTunnel'    // fast tunnel (rörtunnel)
  | 'aFrame'         // A-hinder
  | 'dogwalk'        // balansbom
  | 'seesaw'         // gungbräda
  | 'weave6'         // slalom 6 pinnar
  | 'weave12'        // slalom 12 pinnar
  | 'hoop'           // hoop (hoopers)
  | 'barrel';        // tunna (hoopers)
// Obs: "fast tunnel" och "staket" från specen mappar till `rigidTunnel`
// respektive `wall` – delade silhuetter mellan sporterna är medvetet
// (samma fysiska hinder, olika regelverk).

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

function Base({ size = 24, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

/* ─── Hopp – två vingar + bom ─── */
const JumpIcon = (p: IconProps) => (
  <Base {...p}>
    <line x1="4" y1="12" x2="20" y2="12" />
    <rect x="3" y="9" width="2" height="6" rx="0.5" />
    <rect x="19" y="9" width="2" height="6" rx="0.5" />
  </Base>
);

/* ─── Oxer – två parallella bommar ─── */
const OxerIcon = (p: IconProps) => (
  <Base {...p}>
    <line x1="4" y1="10" x2="20" y2="10" />
    <line x1="4" y1="14" x2="20" y2="14" />
    <rect x="3" y="8" width="2" height="8" rx="0.5" />
    <rect x="19" y="8" width="2" height="8" rx="0.5" />
  </Base>
);

/* ─── Mur – heldragen rektangel med "tegel"-streck ─── */
const WallIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="4" y="9" width="16" height="6" rx="0.5" />
    <line x1="9" y1="9" x2="9" y2="15" />
    <line x1="15" y1="9" x2="15" y2="15" />
    <line x1="4" y1="12" x2="20" y2="12" />
  </Base>
);

/* ─── Långhopp – flera parallella plankor ─── */
const LongJumpIcon = (p: IconProps) => (
  <Base {...p}>
    <line x1="6" y1="9" x2="6" y2="15" />
    <line x1="10" y1="9" x2="10" y2="15" />
    <line x1="14" y1="9" x2="14" y2="15" />
    <line x1="18" y1="9" x2="18" y2="15" />
    <line x1="5" y1="9" x2="19" y2="9" strokeDasharray="1 2" />
    <line x1="5" y1="15" x2="19" y2="15" strokeDasharray="1 2" />
  </Base>
);

/* ─── Däck – ring ─── */
const TireIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="3.5" />
  </Base>
);

/* ─── Mjuk tunnel – pil-böj med vågig kontur ─── */
const SoftTunnelIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 9 Q 12 9 12 15 L 20 15" />
    <path d="M4 11 Q 10 11 10 15 L 20 13" strokeDasharray="0.5 1.5" />
  </Base>
);

/* ─── Fast tunnel – samma form, heldragen ─── */
const RigidTunnelIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 9 Q 14 9 14 15 L 20 15" />
    <path d="M4 11 Q 12 11 12 15 L 20 13" />
  </Base>
);

/* ─── A-hinder – triangel med mittlinje ─── */
const AFrameIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 16 L 12 6 L 19 16 Z" />
    <line x1="12" y1="6" x2="12" y2="16" />
  </Base>
);

/* ─── Balansbom – avlång rektangel + "ben" ─── */
const DogwalkIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="11" width="18" height="2" rx="0.5" />
    <line x1="6" y1="9" x2="6" y2="11" />
    <line x1="6" y1="13" x2="6" y2="15" />
    <line x1="18" y1="9" x2="18" y2="11" />
    <line x1="18" y1="13" x2="18" y2="15" />
    <line x1="8" y1="11" x2="8" y2="13" strokeDasharray="0.5 1" />
    <line x1="16" y1="11" x2="16" y2="13" strokeDasharray="0.5 1" />
  </Base>
);

/* ─── Gungbräda – rektangel + pivot-triangel under ─── */
const SeesawIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="4" y="11" width="16" height="2" rx="0.5" />
    <path d="M11 13 L 12 16 L 13 13 Z" />
  </Base>
);

/* ─── Slalom 6 ─── */
const Weave6Icon = (p: IconProps) => (
  <Base {...p}>
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <circle key={i} cx={4 + i * 3.2} cy="12" r="0.9" />
    ))}
  </Base>
);

/* ─── Slalom 12 – två rader för täthet ─── */
const Weave12Icon = (p: IconProps) => (
  <Base {...p}>
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <circle key={`a${i}`} cx={4 + i * 3.2} cy="10" r="0.7" />
    ))}
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <circle key={`b${i}`} cx={4 + i * 3.2} cy="14" r="0.7" />
    ))}
  </Base>
);

/* ─── Hoop – ring sett ovanifrån (rak) ─── */
const HoopIcon = (p: IconProps) => (
  <Base {...p}>
    <ellipse cx="12" cy="12" rx="7" ry="2.5" />
    <line x1="5" y1="12" x2="5" y2="14" />
    <line x1="19" y1="12" x2="19" y2="14" />
  </Base>
);

/* ─── Tunna – cirkel + diameter ─── */
const BarrelIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="6" />
    <line x1="6" y1="12" x2="18" y2="12" strokeDasharray="1.5 1" />
  </Base>
);

export const OBSTACLE_ICONS: Record<ObstacleIconKey, React.FC<IconProps>> = {
  jump: JumpIcon,
  oxer: OxerIcon,
  wall: WallIcon,
  longJump: LongJumpIcon,
  tire: TireIcon,
  softTunnel: SoftTunnelIcon,
  rigidTunnel: RigidTunnelIcon,
  aFrame: AFrameIcon,
  dogwalk: DogwalkIcon,
  seesaw: SeesawIcon,
  weave6: Weave6Icon,
  weave12: Weave12Icon,
  hoop: HoopIcon,
  barrel: BarrelIcon,
};

/* ─────────────────────────────────────────────────────────────────────
   Katalog – metadata för paletten
   ───────────────────────────────────────────────────────────────────── */

export type ObstacleSport = 'agility' | 'hoopers';

export interface ObstacleDef {
  key: ObstacleIconKey;
  label: string;
  shortcut: string;        // tangentbordsgenväg (visas i tooltip)
  sport: ObstacleSport[];  // vilken/vilka sporter hindret tillhör
  category: string;        // grupp i paletten ("Hopp", "Kontakt", "Slalom", "Hoopers")
  /** Default-storlek i meter (bredd × djup, top-down). */
  sizeM: { w: number; h: number };
}

export const OBSTACLES: ObstacleDef[] = [
  // Hopp
  { key: 'jump',     label: 'Hopp',      shortcut: '1', sport: ['agility'], category: 'Hopp',    sizeM: { w: 1.5, h: 0.4 } },
  { key: 'oxer',     label: 'Oxer',      shortcut: '2', sport: ['agility'], category: 'Hopp',    sizeM: { w: 1.5, h: 0.6 } },
  { key: 'wall',     label: 'Mur',       shortcut: '3', sport: ['agility', 'hoopers'], category: 'Hopp', sizeM: { w: 1.5, h: 0.4 } },
  { key: 'longJump', label: 'Långhopp',  shortcut: '4', sport: ['agility'], category: 'Hopp',    sizeM: { w: 1.5, h: 1.5 } },
  { key: 'tire',     label: 'Däck',      shortcut: '5', sport: ['agility'], category: 'Hopp',    sizeM: { w: 1.0, h: 1.0 } },

  // Tunnlar
  { key: 'softTunnel',  label: 'Mjuk tunnel', shortcut: '6', sport: ['agility'],            category: 'Tunnel',  sizeM: { w: 3.0, h: 1.0 } },
  { key: 'rigidTunnel', label: 'Fast tunnel', shortcut: '7', sport: ['agility', 'hoopers'], category: 'Tunnel',  sizeM: { w: 3.0, h: 0.6 } },

  // Kontakt
  { key: 'aFrame',  label: 'A-hinder',   shortcut: '8', sport: ['agility'], category: 'Kontakt', sizeM: { w: 0.9, h: 2.6 } },
  { key: 'dogwalk', label: 'Balansbom',  shortcut: '9', sport: ['agility'], category: 'Kontakt', sizeM: { w: 0.3, h: 3.6 } },
  { key: 'seesaw',  label: 'Gungbräda',  shortcut: '0', sport: ['agility'], category: 'Kontakt', sizeM: { w: 0.3, h: 3.6 } },

  // Slalom
  { key: 'weave6',  label: 'Slalom 6',   shortcut: 'Q', sport: ['agility'], category: 'Slalom',  sizeM: { w: 0.4, h: 3.0 } },
  { key: 'weave12', label: 'Slalom 12',  shortcut: 'W', sport: ['agility'], category: 'Slalom',  sizeM: { w: 0.4, h: 6.6 } },

  // Hoopers-specifika
  { key: 'hoop',    label: 'Hoop',       shortcut: 'H', sport: ['hoopers'], category: 'Hoopers', sizeM: { w: 0.9, h: 0.4 } },
  { key: 'barrel',  label: 'Tunna',      shortcut: 'T', sport: ['hoopers'], category: 'Hoopers', sizeM: { w: 0.6, h: 0.6 } },
];

/** Hämta ikon-komponent från key (typsäker uppslagning). */
export function getObstacleIcon(key: ObstacleIconKey) {
  return OBSTACLE_ICONS[key];
}

/** Hämta definition från key. */
export function getObstacleDef(key: ObstacleIconKey): ObstacleDef | undefined {
  return OBSTACLES.find((o) => o.key === key);
}
