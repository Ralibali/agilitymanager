import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { BottomNav } from "@/components/BottomNav";
import { captureUtmParams } from "@/lib/utm";

// Capture UTM params on first load
captureUtmParams();

// Eager: landing + auth (first paint)
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";

// Lazy: everything else
const Index = React.lazy(() => import("./pages/Index"));
const DogsPage = React.lazy(() => import("./pages/DogsPage"));
const TrainingPage = React.lazy(() => import("./pages/TrainingPage"));
const CompetitionPage = React.lazy(() => import("./pages/CompetitionPage"));
const CompetitionCalendarPage = React.lazy(() => import("./pages/CompetitionCalendarPage"));
const StopwatchPage = React.lazy(() => import("./pages/StopwatchPage"));
const HealthPage = React.lazy(() => import("./pages/HealthPage"));
const CoursePlannerPage = React.lazy(() => import("./pages/CoursePlannerPage"));
const StatsPage = React.lazy(() => import("./pages/StatsPage"));
const SettingsPage = React.lazy(() => import("./pages/SettingsPage"));
const ResetPasswordPage = React.lazy(() => import("./pages/ResetPasswordPage"));
const InsurancePage = React.lazy(() => import("./pages/InsurancePage"));
const BlogPage = React.lazy(() => import("./pages/BlogPage"));
const BlogPostPage = React.lazy(() => import("./pages/BlogPostPage"));
const AdminPage = React.lazy(() => import("./pages/AdminPage"));
const AboutAgilityPage = React.lazy(() => import("./pages/AboutAgilityPage"));
const PrivacyPolicyPage = React.lazy(() => import("./pages/PrivacyPolicyPage"));
const CookiePolicyPage = React.lazy(() => import("./pages/CookiePolicyPage"));
const UnsubscribePage = React.lazy(() => import("./pages/UnsubscribePage"));
const FriendsPage = React.lazy(() => import("./pages/FriendsPage"));
const InvitePage = React.lazy(() => import("./pages/InvitePage"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function ProtectedLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground font-display">Laddar...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <>
      <Outlet />
      <BottomNav />
    </>
  );
}

function AuthGuard() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground font-display">Laddar...</div>
      </div>
    );
  }
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

const LazyFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-muted-foreground font-display">Laddar...</div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<LazyFallback />}>
            <Routes>
              {/* Public routes */}
              <Route element={<AuthGuard />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/auth" element={<AuthPage />} />
              </Route>
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/hundforsakring" element={<InsurancePage />} />
              <Route path="/om-agility" element={<AboutAgilityPage />} />
              <Route path="/blogg" element={<BlogPage />} />
              <Route path="/blogg/:slug" element={<BlogPostPage />} />
              <Route path="/integritetspolicy" element={<PrivacyPolicyPage />} />
              <Route path="/cookiepolicy" element={<CookiePolicyPage />} />
              <Route path="/avregistrera" element={<UnsubscribePage />} />
              <Route path="/invite/:code" element={<InvitePage />} />

              {/* Protected routes */}
              <Route element={<ProtectedLayout />}>
                <Route path="/dashboard" element={<Index />} />
                <Route path="/dogs" element={<DogsPage />} />
                <Route path="/training" element={<TrainingPage />} />
                <Route path="/competition" element={<CompetitionPage />} />
                <Route path="/competition-calendar" element={<CompetitionCalendarPage />} />
                <Route path="/stopwatch" element={<StopwatchPage />} />
                <Route path="/health" element={<HealthPage />} />
                <Route path="/course-planner" element={<CoursePlannerPage />} />
                <Route path="/stats" element={<StatsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/friends" element={<FriendsPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/index" element={<Navigate to="/dashboard" replace />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
