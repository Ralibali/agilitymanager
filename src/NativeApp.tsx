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
const AccountPage = lazy(() => import("./pages/AccountPage"));
const MobilePrivacyPage = lazy(() => import("./mobile/MobilePrivacyPage"));
const MobileDeleteAccountPage = lazy(() => import("./mobile/MobileDeleteAccountPage"));

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
              <Route path="/mitt-agilitymanager" element={<AccountPage />} />
              <Route path="/konto" element={<Navigate to="/mitt-agilitymanager" replace />} />
              <Route path="/auth" element={<Navigate to="/mitt-agilitymanager" replace />} />
              <Route path="/logga-in" element={<Navigate to="/mitt-agilitymanager" replace />} />
              <Route path="/integritet" element={<MobilePrivacyPage />} />
              <Route path="/radera-konto" element={<MobileDeleteAccountPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </RouteErrorBoundary>
      </MobileShell>
    </>
  );
}
