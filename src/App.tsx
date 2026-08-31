import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import Home from "./pages/Home";

// Route-nivå code splitting: startsidan (Home) laddas direkt, övriga sidor —
// särskilt banplaneraren med 3D/PDF — hämtas först när routen besöks.
const PlannerPage = lazy(() => import("./pages/PlannerPage"));
const PublicCoursePage = lazy(() => import("./pages/PublicCoursePage"));
const FeaturesPage = lazy(() => import("./pages/FeaturesPage"));
const CoursesPage = lazy(() => import("./pages/CoursesPage"));
const SharedCoursesPage = lazy(() => import("./pages/SharedCoursesPage"));
const BlogIndexPage = lazy(() => import("./pages/BlogIndexPage"));
const BlogArticlePage = lazy(() => import("./pages/BlogArticlePage"));
const NotFound = lazy(() => import("./pages/NotFound").then((m) => ({ default: m.NotFound })));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

/** Fallback medan en lazy-route laddas. role="status" ger skärmläsare besked. */
function RouteFallback() {
  return (
    <div role="status" aria-live="polite" className="min-h-[40vh] grid place-items-center p-8">
      <span className="sr-only">Laddar sidan…</span>
      <div aria-hidden="true" className="h-8 w-8 rounded-full border-2 border-black/15 border-t-black/60 animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Publik produktyta: blogg/kunskap + banplanerare (se src/lib/routes.ts) */}
        <Route path="/" element={<Home />} />
        <Route path="/blogg" element={<BlogIndexPage />} />
        <Route path="/blogg/:slug" element={<BlogArticlePage />} />
        <Route path="/banplanerare" element={<PlannerPage />} />
        <Route path="/funktioner" element={<FeaturesPage />} />
        <Route path="/banor" element={<CoursesPage />} />
        <Route path="/delade-banor" element={<SharedCoursesPage />} />
        <Route path="/bana/:id" element={<PublicCoursePage />} />

        {/* Out of scope: pricing/billing — gamla länkar landar i planeraren */}
        <Route path="/priser" element={<Navigate to="/banplanerare" replace />} />
        <Route path="/gratis" element={<Navigate to="/banplanerare" replace />} />

        {/* Out of scope: tävlingsytor — redirecta samtliga gamla tävlingslänkar */}
        <Route path="/tavlingar/*" element={<Navigate to="/" replace />} />

        {/* Out of scope: auth-ytor — allt leder till planeraren */}
        <Route path="/auth" element={<Navigate to="/banplanerare" replace />} />
        <Route path="/logga-in" element={<Navigate to="/banplanerare" replace />} />
        <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}
