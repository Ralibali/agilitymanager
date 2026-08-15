import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import Home from "./pages/Home";
import PlannerPage from "./pages/PlannerPage";
import FeaturesPage from "./pages/FeaturesPage";
import GratisPage from "./pages/GratisPage";
import CompetitionsPage from "./pages/CompetitionsPage";
import CompetitionDetailPage from "./pages/CompetitionDetailPage";
import CountyCompetitionsPage from "./pages/CountyCompetitionsPage";
import ClubCompetitionsPage from "./pages/ClubCompetitionsPage";
import HoopersCompetitionDetailPage from "./pages/HoopersCompetitionDetailPage";
import CoursesPage from "./pages/CoursesPage";
import { NotFound } from "./pages/NotFound";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/banplanerare" element={<PlannerPage />} />
        <Route path="/funktioner" element={<FeaturesPage />} />
        <Route path="/priser" element={<GratisPage />} />
        <Route path="/gratis" element={<Navigate to="/priser" replace />} />
        <Route path="/tavlingar" element={<CompetitionsPage />} />
        <Route path="/tavlingar/hoopers/:id" element={<HoopersCompetitionDetailPage />} />
        <Route path="/tavlingar/hoopers/:id/:slug" element={<HoopersCompetitionDetailPage />} />
        <Route path="/tavlingar/:id" element={<CompetitionDetailPage />} />
        <Route path="/tavlingar/:id/:slug" element={<CompetitionDetailPage />} />
        <Route path="/banor" element={<CoursesPage />} />
        {/* Inloggat läge är borttaget — allt leder till planeraren */}
        <Route path="/auth" element={<Navigate to="/banplanerare" replace />} />
        <Route path="/logga-in" element={<Navigate to="/banplanerare" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
