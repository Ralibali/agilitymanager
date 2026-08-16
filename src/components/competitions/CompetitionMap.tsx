import { useEffect, useMemo } from "react";
import { Link } from "react-router";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { formatDistance, type CompetitionWithDistance, type GeoPoint } from "@/lib/competitionGeo";

const markerIcon = (color: string) =>
  L.divIcon({
    className: "",
    html: `<span style="display:block;width:18px;height:18px;border-radius:9999px;background:${color};border:3px solid #1b1a17;box-shadow:0 2px 0 rgba(27,26,23,.6)"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });

const AGILITY_ICON = markerIcon("#1a6b3c");
const HOOPERS_ICON = markerIcon("#c85d1e");
const USER_ICON = markerIcon("#2563eb");

function FitBounds({ points }: { points: GeoPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds.pad(0.25), { maxZoom: 10 });
  }, [map, points]);
  return null;
}

interface Props {
  center: GeoPoint;
  competitions: CompetitionWithDistance[];
  className?: string;
}

/** Karta med markörer för tävlingar nära användarens position. */
export function CompetitionMap({ center, competitions, className }: Props) {
  const points = useMemo(
    () => [center, ...competitions.map((c) => c.coords)],
    [center, competitions],
  );

  return (
    <div
      className={`overflow-hidden rounded-3xl border-2 border-ink shadow-hard ${className ?? ""}`}
    >
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={8}
        scrollWheelZoom={false}
        style={{ height: "clamp(260px, 45vh, 460px)", width: "100%" }}
        aria-label="Karta över tävlingar nära dig"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />

        <Marker position={[center.lat, center.lng]} icon={USER_ICON}>
          <Popup>Din position</Popup>
        </Marker>

        {competitions.map((c) => (
          <Marker
            key={c.key}
            position={[c.coords.lat, c.coords.lng]}
            icon={c.sport === "agility" ? AGILITY_ICON : HOOPERS_ICON}
          >
            <Popup>
              <span className="block text-sm font-bold text-ink">{c.name}</span>
              <span className="block text-xs font-semibold text-ink/60">
                {c.location || c.county || "Plats saknas"} · {formatDistance(c.distanceKm)}
                {c.approximate ? " (ungefärligt läge)" : ""}
              </span>
              <Link to={c.path} className="mt-1 inline-block text-xs font-bold text-forest underline">
                Visa tävlingen
              </Link>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
