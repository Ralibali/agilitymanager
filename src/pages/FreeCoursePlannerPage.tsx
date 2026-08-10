import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import V3CoursePlannerV2Page from "@/pages/v3/V3CoursePlannerV2Page";
import { getBankCourse } from "@/features/free-planner/courseBank";
import type { AgilityObstacleType } from "@/features/free-planner/agilityCourseRules";
import type { ObstacleTypeV2 } from "@/features/course-planner-v2/config";

const V2_STORAGE_KEY = "am_course_planner_v2";

const TO_V2_TYPE: Record<AgilityObstacleType, ObstacleTypeV2> = {
  jump: "jump",
  spread: "combo",
  wall: "wall",
  tyre: "tire",
  longjump: "longjump",
  tunnel: "tunnel",
  weave: "weave_12",
  dogwalk: "dogwalk",
  seesaw: "seesaw",
  aframe: "aframe",
};

/**
 * Flyttar en bana från den publika SEO/Banbank-modellen till exakt samma
 * localStorage-format som den riktiga V2-planeraren använder. Det gör att
 * "Använd banan" på en publik bansida öppnar layouten i den fulla editorn,
 * inte i en separat förenklad ritmotor.
 */
function seedV2PlannerFromPublicCourse(courseId: string | null) {
  if (!courseId || typeof window === "undefined") return;
  const bankCourse = getBankCourse(courseId);
  if (!bankCourse) return;

  const classTemplate = `${bankCourse.kind === "jumping" ? "agility_hopp" : "agility"}_${bankCourse.competitionClass}`;
  const course = {
    name: bankCourse.title,
    sport: "agility" as const,
    sizeClass: "L" as const,
    arenaWidthM: bankCourse.ring.widthM,
    arenaHeightM: bankCourse.ring.heightM,
    classTemplate,
    obstacles: bankCourse.obstacles.map((obstacle) => ({
      id: `public-${bankCourse.id}-${obstacle.id}`,
      type: TO_V2_TYPE[obstacle.type],
      x: (obstacle.x / 100) * bankCourse.ring.widthM,
      y: (obstacle.y / 100) * bankCourse.ring.heightM,
      rotation: obstacle.rotation,
      number: obstacle.number,
    })),
  };

  try {
    window.localStorage.setItem(V2_STORAGE_KEY, JSON.stringify(course));
    window.localStorage.removeItem(`${V2_STORAGE_KEY}_cloud_id`);
  } catch {
    // Privat läge kan blockera localStorage. Editorn öppnas ändå med sin defaultbana.
  }
}

/**
 * Publik ingång till AgilityManagers riktiga banplanerare.
 *
 * Viktigt: den här sidan har avsiktligt INGEN egen/förenklad ritmotor.
 * /banplanerare och den inloggade V3-vyn använder samma V2-planerare,
 * samma hinder, samma regelmotor, samma export och samma lokala autosparning.
 * Konto behövs bara där en funktion faktiskt kräver en användare, t.ex.
 * molnsparning, klubbdelning och koppling till träningsloggen.
 */
export default function FreeCoursePlannerPage() {
  const [searchParams] = useSearchParams();

  // useState-initializern körs före barnkomponenten monteras. Därför hinner
  // V2-planeraren läsa vald publik bana i sin egen loadCourse()-initializer.
  useState(() => {
    seedV2PlannerFromPublicCourse(searchParams.get("course"));
    return true;
  });

  return (
    <>
      <Helmet>
        <title>Gratis banplanerare för agility & hoopers | AgilityManager</title>
        <meta
          name="description"
          content="Rita agility- och hoopersbanor gratis i AgilityManagers fulla banplanerare. Riktig meterskala, svenska regelverk, banlinje, PDF-export, 3D och lokal autosparning – utan konto."
        />
        <link rel="canonical" href="https://agilitymanager.se/banplanerare" />
        <meta property="og:title" content="Gratis banplanerare för agility & hoopers | AgilityManager" />
        <meta
          property="og:description"
          content="Använd samma fulla banplanerare som i AgilityManager – gratis och utan inloggning för att rita, planera och exportera banor."
        />
        <meta property="og:url" content="https://agilitymanager.se/banplanerare" />
        <meta property="og:type" content="website" />
      </Helmet>
      <V3CoursePlannerV2Page />
    </>
  );
}
