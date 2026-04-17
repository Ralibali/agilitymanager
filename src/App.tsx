import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { BottomNav } from "@/components/BottomNav";
import { AppLayout } from "@/components/layout/AppLayout";
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
const HoopersLandingPage = React.lazy(() => import("./pages/HoopersLandingPage"));
const HoopersRulesPage = React.lazy(() => import("./pages/HoopersRulesPage"));
const PrivacyPolicyPage = React.lazy(() => import("./pages/PrivacyPolicyPage"));
const CookiePolicyPage = React.lazy(() => import("./pages/CookiePolicyPage"));
const UnsubscribePage = React.lazy(() => import("./pages/UnsubscribePage"));
const FriendsPage = React.lazy(() => import("./pages/FriendsPage"));
const FriendStatsPage = React.lazy(() => import("./pages/FriendStatsPage"));
const InvitePage = React.lazy(() => import("./pages/InvitePage"));
const ChatPage = React.lazy(() => import("./pages/ChatPage"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const ClubPage = React.lazy(() => import("./pages/ClubPage"));
const ClubInvitePage = React.lazy(() => import("./pages/ClubInvitePage"));
const CoursesPage = React.lazy(() => import("./pages/CoursesPage"));
const GoalsPage = React.lazy(() => import("./pages/GoalsPage"));
const DesignDemoPage = React.lazy(() => import("./pages/DesignDemoPage"));
const PlaceholderPage = React.lazy(() => import("./pages/v2/PlaceholderPage"));
const V2HomePage = React.lazy(() => import("./pages/v2/HomePage"));
const V2StatsPage = React.lazy(() => import("./pages/v2/StatsPage"));
const V2TrainingPage = React.lazy(() => import("./pages/v2/TrainingPage"));
const V2GoalsPage = React.lazy(() => import("./pages/v2/GoalsPage"));
const V2StopwatchPage = React.lazy(() => import("./pages/v2/StopwatchPage"));
const V2CompetitionPage = React.lazy(() => import("./pages/v2/CompetitionPage"));

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

function V2ShellGuard() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="text-text-secondary font-sans-ds">Laddar…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <AppLayout />;
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
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#1a6b3c' }} />
      <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#1a6b3c', animationDelay: '0.15s' }} />
      <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#1a6b3c', animationDelay: '0.3s' }} />
    </div>
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
              <Route path="/hoopers" element={<HoopersLandingPage />} />
              <Route path="/hoopers-regler" element={<HoopersRulesPage />} />
              <Route path="/blogg" element={<BlogPage />} />
              <Route path="/blogg/:slug" element={<BlogPostPage />} />
              <Route path="/integritetspolicy" element={<PrivacyPolicyPage />} />
              <Route path="/cookiepolicy" element={<CookiePolicyPage />} />
              <Route path="/avregistrera" element={<UnsubscribePage />} />
              <Route path="/invite/:code" element={<InvitePage />} />
              <Route path="/club-invite/:code" element={<ClubInvitePage />} />
              <Route path="/design-demo" element={<DesignDemoPage />} />

              {/* Protected routes */}
              <Route element={<ProtectedLayout />}>
                <Route path="/dashboard" element={<Index />} />
                <Route path="/dogs" element={<DogsPage />} />
                <Route path="/training" element={<TrainingPage />} />
                <Route path="/competition" element={<CompetitionPage />} />
                <Route path="/competition-calendar" element={<Navigate to="/competition" replace />} />
                <Route path="/stopwatch" element={<StopwatchPage />} />
                <Route path="/health" element={<HealthPage />} />
                <Route path="/course-planner" element={<CoursePlannerPage />} />
                <Route path="/stats" element={<StatsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/friends" element={<FriendsPage />} />
                <Route path="/friend-stats/:userId" element={<FriendStatsPage />} />
                <Route path="/chat/:friendId" element={<ChatPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/clubs" element={<ClubPage />} />
                <Route path="/courses" element={<CoursesPage />} />
                <Route path="/goals" element={<GoalsPage />} />
                <Route path="/index" element={<Navigate to="/dashboard" replace />} />
              </Route>

              {/* === Fas 2 v2-shell – persistent AppLayout, tomma placeholders === */}
              <Route path="/v2" element={<V2ShellGuard />}>
                <Route index element={<V2HomePage />} />
                <Route path="stats" element={<V2StatsPage />} />
                <Route path="training" element={<V2TrainingPage />} />
                <Route path="course-planner" element={<PlaceholderPage />} />
                <Route path="stopwatch" element={<V2StopwatchPage />} />
                <Route path="goals" element={<V2GoalsPage />} />
                <Route path="competition" element={<V2CompetitionPage />} />
                <Route path="dogs" element={<PlaceholderPage />} />
                <Route path="health" element={<PlaceholderPage />} />
                <Route path="friends" element={<PlaceholderPage />} />
                <Route path="clubs" element={<PlaceholderPage />} />
                <Route path="courses" element={<PlaceholderPage />} />
                <Route path="settings" element={<PlaceholderPage />} />
                <Route path="admin" element={<PlaceholderPage />} />
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
