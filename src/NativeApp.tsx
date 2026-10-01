import { Component, lazy, Suspense } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { Toaster } from "./components/ui/sonner";
import { NativeRuntime } from "./lib/nativeRuntime";
import MobileHome from "./mobile/MobileHome";
import MobileShell from "./mobile/MobileShell";

const PlannerPage = lazy(() => import("./pages/PlannerPage"));
const CoursesPage = lazy(() => import("./pages/CoursesPage"));
const SharedCoursesPage = lazy(() => import("./pages/SharedCoursesPage"));
const PublicCoursePage = lazy(() => import("./pages/PublicCoursePage"));
const CompetitionsPage = lazy(() => import("./pages/CompetitionsPage"));
const FavoriteCompetitionsPage = lazy(() => import("./pages/FavoriteCompetitionsPage"));
const ResultsPage = lazy(() => import("./pages/ResultsPage"));
const ClubsPage = lazy(() => import("./pages/ClubsPage"));
const CompetitionDetailPage = lazy(() => import("./pages/CompetitionDetailPage"));
const CountyCompetitionsPage = lazy(() => import("./pages/CountyCompetitionsPage"));
const ClubCompetitionsPage = lazy(() => import("./pages/ClubCompetitionsPage"));
const HoopersCompetitionDetailPage = lazy(() => import("./pages/HoopersCompetitionDetailPage"));
const TrainingPage = lazy(() => import("./pages/TrainingPage"));
const InstructorPage = lazy(() => import("./pages/InstructorPage"));
const StudentTrainingPage = lazy(() => import("./pages/StudentTrainingPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const BlogIndexPage = lazy(() => import("./pages/BlogIndexPage"));
const BlogArticlePage = lazy(() => import("./pages/BlogArticlePage"));
const FeaturesPage = lazy(() => import("./pages/FeaturesPage"));
const GratisPage = lazy(() => import("./pages/GratisPage"));
const DogInsurancePage = lazy(() => import("./pages/DogInsurancePage"));
const MobilePrivacyPage = lazy(() => import("./mobile/MobilePrivacyPage"));
const MobileDeleteAccountPage = lazy(() => import("./mobile/MobileDeleteAccountPage"));
const NotFound = lazy(() => import("./pages/NotFound").then((module) => ({ default: module.NotFound })));

function LoadingPage() {
  return <div className="mobile-route-status" role="status" aria-live="polite">Laddar sidan…</div>;
}

class RouteErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("AgilityManager kunde inte öppna sidan", error, info.componentStack);
  }
  render() {
    if (this.state.failed) return (
      <div className="mobile-route-status" role="alert">
        <h1>Sidan kunde inte öppnas</h1>
        <p>Försök igen. Om felet kvarstår kan du öppna ett annat område i menyn.</p>
        <button type="button" className="mobile-primary-action" onClick={() => this.setState({ failed: false })}>Försök igen</button>
      </div>
    );
    return this.props.children;
  }
}

export default function NativeApp() {
  const location = useLocation();
  return (
    <>
      <NativeRuntime />
      <Toaster position="top-center" richColors />
      <MobileShell>
        <RouteErrorBoundary key={location.pathname}>
          <Suspense fallback={<LoadingPage />}>
            <Routes>
              <Route path="/" element={<MobileHome />} />
              <Route path="/banplanerare" element={<PlannerPage />} />
              <Route path="/banor" element={<CoursesPage />} />
              <Route path="/delade-banor" element={<SharedCoursesPage />} />
              <Route path="/bana/:id" element={<PublicCoursePage />} />
              <Route path="/tavlingar" element={<CompetitionsPage />} />
              <Route path="/tavlingar/favoriter" element={<FavoriteCompetitionsPage />} />
              <Route path="/resultat" element={<ResultsPage />} />
              <Route path="/klubbar" element={<ClubsPage />} />
              <Route path="/tavlingar/lan/:countySlug" element={<CountyCompetitionsPage />} />
              <Route path="/tavlingar/klubb/:clubSlug" element={<ClubCompetitionsPage />} />
              <Route path="/tavlingar/hoopers/:id" element={<HoopersCompetitionDetailPage />} />
              <Route path="/tavlingar/hoopers/:id/:slug" element={<HoopersCompetitionDetailPage />} />
              <Route path="/tavlingar/:id" element={<CompetitionDetailPage />} />
              <Route path="/tavlingar/:id/:slug" element={<CompetitionDetailPage />} />
              <Route path="/traning" element={<TrainingPage />} />
              <Route path="/instruktor" element={<InstructorPage />} />
              <Route path="/elev" element={<StudentTrainingPage />} />
              <Route path="/mitt-agilitymanager" element={<AccountPage />} />
              <Route path="/konto" element={<Navigate to="/mitt-agilitymanager" replace />} />
              <Route path="/auth" element={<Navigate to="/mitt-agilitymanager" replace />} />
              <Route path="/logga-in" element={<Navigate to="/mitt-agilitymanager" replace />} />
              <Route path="/integritet" element={<MobilePrivacyPage />} />
              <Route path="/radera-konto" element={<MobileDeleteAccountPage />} />
              <Route path="/blogg" element={<BlogIndexPage />} />
              <Route path="/blogg/agility-regler-sverige" element={<Navigate to="/blogg/regelverk-agility-hoopers-sverige" replace />} />
              <Route path="/blogg/:slug" element={<BlogArticlePage />} />
              <Route path="/funktioner" element={<FeaturesPage />} />
              <Route path="/priser" element={<GratisPage />} />
              <Route path="/gratis" element={<Navigate to="/priser" replace />} />
              <Route path="/jamfor-hundforsakring" element={<DogInsurancePage />} />
              <Route path="/jämför-försäkrings" element={<Navigate to="/jamfor-hundforsakring" replace />} />
              <Route path="/jamfor-forsakrings" element={<Navigate to="/jamfor-hundforsakring" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </RouteErrorBoundary>
      </MobileShell>
    </>
  );
}
