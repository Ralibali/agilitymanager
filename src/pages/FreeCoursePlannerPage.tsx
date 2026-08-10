import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import V3CoursePlannerV2Page from "@/pages/v3/V3CoursePlannerV2Page";
import { COURSE_BANK } from "@/features/course-planner-v2/courseBank";
import { resolvePublicCourseId } from "@/features/course-planner-v2/publicCourseCatalog.mjs";

const V2_STORAGE_KEY = "am_course_planner_v2";

/**
 * Öppnar en publik bana som EXAKT samma V2-objekt som Banbiblioteket använder.
 * Ingen separat gratismodell och ingen koordinat-/hindertyp-konvertering finns
 * längre mellan Google-sidan och den riktiga editorn.
 */
function seedV2PlannerFromPublicCourse(courseId: string | null) {
  if (!courseId || typeof window === "undefined") return;
  const resolvedId = resolvePublicCourseId(courseId);
  const bankCourse = COURSE_BANK.find((course) => course.key === resolvedId);
  if (!bankCourse) return;

  const course = {
    name: bankCourse.label,
    sport: bankCourse.sport,
    sizeClass: bankCourse.defaultSize,
    arenaWidthM: bankCourse.arenaWidthM,
    arenaHeightM: bankCourse.arenaHeightM,
    classTemplate: bankCourse.classTemplate,
    obstacles: bankCourse.obstacles.map((obstacle, index) => ({
      ...obstacle,
      id: `public-${bankCourse.key}-${index + 1}`,
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
 * /banplanerare och den inloggade V3-vyn använder samma V2-planerare,
 * samma hinder, samma regelmotor, samma export, samma Banbank och samma lokala
 * autosparning. Konto behövs bara där en funktion faktiskt kräver användare,
 * exempelvis molnsparning, klubbdelning och koppling till träningsloggen.
 */
export default function FreeCoursePlannerPage() {
  const [searchParams] = useSearchParams();

  // Initializern körs före barnkomponenten monteras, så V2-planeraren hinner
  // läsa vald publik bana i sin egen loadCourse()-initializer.
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
          content="Rita agility- och hoopersbanor gratis i AgilityManagers fulla banplanerare. Riktig meterskala, svenska regelverk, banlinje, PDF-export, 3D, 25 färdiga kartor och lokal autosparning – utan konto."
        />
        <link rel="canonical" href="https://agilitymanager.se/banplanerare" />
        <meta property="og:title" content="Gratis banplanerare för agility & hoopers | AgilityManager" />
        <meta
          property="og:description"
          content="Använd samma fulla banplanerare som i AgilityManager – gratis med 25 färdiga kartor och utan inloggning för att rita, planera och exportera banor."
        />
        <meta property="og:url" content="https://agilitymanager.se/banplanerare" />
        <meta property="og:type" content="website" />
      </Helmet>
      <V3CoursePlannerV2Page />
    </>
  );
}
