/**
 * Sticky linjaler för banplaneraren.
 * Renderas som SVG-overlays positionerade absolut längs viewportens kanter.
 * Tickmarks beräknas dynamiskt från viewport-state (synligt intervall + zoom).
 */
import { memo } from "react";

const RULER_PX = 24;
const FOREST = "#173d2c";

interface CanvasRulersProps {
  /** Viewport-storlek i px (innermått efter linjaler). */
  viewportWidthPx: number;
  viewportHeightPx: number;
  /** Synligt kurs-intervall (meter). */
  viewMinXM: number;
  viewMinYM: number;
  visibleWidthM: number;
  visibleHeightM: number;
  /** Banstorlek (m) — för att begränsa tickmarks till banytan. */
  arenaWidthM: number;
  arenaHeightM: number;
  /** Tickmark-täthet (m mellan stora tickmarks). */
  tickStepM: number;
  /** Visa fina (1 m) tickmarks? */
  showFineTicks: boolean;
  /** Zoom (visas i hörnet). */
  zoom: number;
  /** Klick på hörnet → reset zoom. */
  onCornerClick?: () => void;
}

function CanvasRulersImpl(props: CanvasRulersProps) {
  const {
    viewportWidthPx, viewportHeightPx,
    viewMinXM, viewMinYM, visibleWidthM, visibleHeightM,
    arenaWidthM, arenaHeightM, tickStepM, showFineTicks,
    zoom, onCornerClick,
  } = props;

  const pxPerMx = viewportWidthPx / visibleWidthM;
  const pxPerMy = viewportHeightPx / visibleHeightM;

  // Bygg tickmark-listor — alla nuvarande synliga m-värden inom arenan.
  const startX = Math.max(0, Math.floor(viewMinXM));
  const endX = Math.min(arenaWidthM, Math.ceil(viewMinXM + visibleWidthM));
  const startY = Math.max(0, Math.floor(viewMinYM));
  const endY = Math.min(arenaHeightM, Math.ceil(viewMinYM + visibleHeightM));

  const xTicks: { m: number; px: number; major: boolean }[] = [];
  for (let m = startX; m <= endX; m++) {
    const major = m % tickStepM === 0;
    if (!major && !showFineTicks) continue;
    const px = (m - viewMinXM) * pxPerMx;
    xTicks.push({ m, px, major });
  }
  const yTicks: { m: number; px: number; major: boolean }[] = [];
  for (let m = startY; m <= endY; m++) {
    const major = m % tickStepM === 0;
    if (!major && !showFineTicks) continue;
    const px = (m - viewMinYM) * pxPerMy;
    yTicks.push({ m, px, major });
  }

  return (
    <>
      {/* Hörn */}
      <button
        type="button"
        onClick={onCornerClick}
        title="Återställ zoom till 100%"
        className="absolute top-0 left-0 z-20 grid place-items-center bg-[#f5f3ee] border-r border-b border-[#173d2c]/15 text-[9px] font-bold text-[#173d2c]/70 hover:bg-white"
        style={{ width: RULER_PX, height: RULER_PX }}
      >
        {Math.round(zoom * 100)}%
      </button>

      {/* Toppen-linjal */}
      <div
        className="absolute top-0 z-10 bg-[#f5f3ee] border-b border-[#173d2c]/15 pointer-events-none"
        style={{ left: RULER_PX, height: RULER_PX, width: viewportWidthPx }}
      >
        <svg width={viewportWidthPx} height={RULER_PX} className="block">
          {/* Bandtext "X m" centrerat över banan */}
          {(() => {
            const arenaStartPx = Math.max(0, (0 - viewMinXM) * pxPerMx);
            const arenaEndPx = Math.min(viewportWidthPx, (arenaWidthM - viewMinXM) * pxPerMx);
            const cx = (arenaStartPx + arenaEndPx) / 2;
            if (arenaEndPx <= arenaStartPx) return null;
            return (
              <text x={cx} y={9} textAnchor="middle" fontSize={9} fontWeight={700} fill={FOREST} opacity={0.55}>
                {arenaWidthM} m
              </text>
            );
          })()}
          {xTicks.map((t) => (
            <g key={`xt-${t.m}`}>
              <line
                x1={t.px} x2={t.px}
                y1={t.major ? RULER_PX - 8 : RULER_PX - 4}
                y2={RULER_PX}
                stroke={FOREST}
                strokeWidth={t.major ? 0.8 : 0.4}
                opacity={t.major ? 0.6 : 0.3}
              />
              {t.major && t.m > 0 && t.m < arenaWidthM && (
                <text x={t.px} y={RULER_PX - 11} textAnchor="middle" fontSize={9} fill={FOREST} opacity={0.8}>
                  {t.m}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>

      {/* Vänster-linjal */}
      <div
        className="absolute left-0 z-10 bg-[#f5f3ee] border-r border-[#173d2c]/15 pointer-events-none"
        style={{ top: RULER_PX, width: RULER_PX, height: viewportHeightPx }}
      >
        <svg width={RULER_PX} height={viewportHeightPx} className="block">
          {(() => {
            const arenaStartPx = Math.max(0, (0 - viewMinYM) * pxPerMy);
            const arenaEndPx = Math.min(viewportHeightPx, (arenaHeightM - viewMinYM) * pxPerMy);
            const cy = (arenaStartPx + arenaEndPx) / 2;
            if (arenaEndPx <= arenaStartPx) return null;
            return (
              <text
                x={9} y={cy} textAnchor="middle" fontSize={9} fontWeight={700} fill={FOREST} opacity={0.55}
                transform={`rotate(-90 9 ${cy})`}
              >
                {arenaHeightM} m
              </text>
            );
          })()}
          {yTicks.map((t) => (
            <g key={`yt-${t.m}`}>
              <line
                y1={t.px} y2={t.px}
                x1={t.major ? RULER_PX - 8 : RULER_PX - 4}
                x2={RULER_PX}
                stroke={FOREST}
                strokeWidth={t.major ? 0.8 : 0.4}
                opacity={t.major ? 0.6 : 0.3}
              />
              {t.major && t.m > 0 && t.m < arenaHeightM && (
                <text x={RULER_PX - 11} y={t.px + 3} textAnchor="end" fontSize={9} fill={FOREST} opacity={0.8}>
                  {t.m}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    </>
  );
}

export const CanvasRulers = memo(CanvasRulersImpl);
