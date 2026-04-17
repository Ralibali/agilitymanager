import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { captureUtmParams } from "@/lib/utm";

// Capture UTM params on first load
captureUtmParams();

// Eager: landing + auth (first paint)
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";

// Lazy: public routes
const ResetPasswordPage = React.lazy(() => import("./pages/ResetPasswordPage"));
const InsurancePage = React.lazy(() => import("./pages/InsurancePage"));
const BlogPage = React.lazy(() => import("./pages/BlogPage"));
const BlogPostPage = React.lazy(() => import("./pages/BlogPostPage"));
const AboutAgilityPage = React.lazy(() => import("./pages/AboutAgilityPage"));
const HoopersLandingPage = React.lazy(() => import("./pages/HoopersLandingPage"));
const HoopersRulesPage = React.lazy(() => import("./pages/HoopersRulesPage"));
const PrivacyPolicyPage = React.lazy(() => import("./pages/PrivacyPolicyPage"));
const CookiePolicyPage = React.lazy(() => import("./pages/CookiePolicyPage"));
const UnsubscribePage = React.lazy(() => import("./pages/UnsubscribePage"));
const InvitePage = React.lazy(() => import("./pages/InvitePage"));
const ClubInvitePage = React.lazy(() => import("./pages/ClubInvitePage"));
const DesignDemoPage = React.lazy(() => import("./pages/DesignDemoPage"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const FriendStatsPage = React.lazy(() => import("./pages/FriendStatsPage"));

// Lazy: protected routes (v2 = ny design)
const HomePage = React.lazy(() => import("./pages/v2/HomePage"));
const StatsPage = React.lazy(() => import("./pages/v2/StatsPage"));
const TrainingPage = React.lazy(() => import("./pages/v2/TrainingPage"));
const GoalsPage = React.lazy(() => import("./pages/v2/GoalsPage"));
const StopwatchPage = React.lazy(() => import("./pages/v2/StopwatchPage"));
const CompetitionPage = React.lazy(() => import("./pages/v2/CompetitionPage"));
const FriendsPage = React.lazy(() => import("./pages/v2/FriendsPage"));
const ClubsPage = React.lazy(() => import("./pages/v2/ClubsPage"));
const ChatPage = React.lazy(() => import("./pages/v2/ChatPage"));
const DogsPage = React.lazy(() => import("./pages/v2/DogsPage"));
const HealthPage = React.lazy(() => import("./pages/v2/HealthPage"));
const SettingsPage = React.lazy(() => import("./pages/v2/SettingsPage"));
const AdminPage = React.lazy(() => import("./pages/v2/AdminPage"));
const CoursesPage = React.lazy(() => import("./pages/v2/CoursesPage"));
const CoursePlannerPage = React.lazy(() => import("./pages/CoursePlannerPage"));

const queryClient = new QueryClient();

function ShellGuard() {
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
              {/* Publika rutter */}
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
              {/* Redirect: gammal slug med 'ö' → ny slug utan 'ö'. Client-side Navigate (200, inte äkta 301) – uppgraderas till äkta 301 vid Vercel-flytt. */}
              <Route path="/blogg/agility-kurs-nyb%C3%B6rjare" element={<Navigate to="/blogg/agility-kurs-nyborjare" replace />} />
              <Route path="/blogg/agility-kurs-nybörjare" element={<Navigate to="/blogg/agility-kurs-nyborjare" replace />} />
              <Route path="/blogg/:slug" element={<BlogPostPage />} />
              <Route path="/integritetspolicy" element={<PrivacyPolicyPage />} />
              <Route path="/cookiepolicy" element={<CookiePolicyPage />} />
              <Route path="/avregistrera" element={<UnsubscribePage />} />
              <Route path="/invite/:code" element={<InvitePage />} />
              <Route path="/club-invite/:code" element={<ClubInvitePage />} />
              <Route path="/design-demo" element={<DesignDemoPage />} />

              {/* Skyddade rutter – ny design via persistent AppLayout-shell */}
              <Route element={<ShellGuard />}>
                <Route path="/dashboard" element={<HomePage />} />
                <Route path="/stats" element={<StatsPage />} />
                <Route path="/training" element={<TrainingPage />} />
                <Route path="/course-planner" element={<CoursePlannerPage />} />
                <Route path="/stopwatch" element={<StopwatchPage />} />
                <Route path="/goals" element={<GoalsPage />} />
                <Route path="/competition" element={<CompetitionPage />} />
                <Route path="/competition-calendar" element={<Navigate to="/competition" replace />} />
                <Route path="/dogs" element={<DogsPage />} />
                <Route path="/health" element={<HealthPage />} />
                <Route path="/friends" element={<FriendsPage />} />
                <Route path="/friend-stats/:userId" element={<FriendStatsPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/chat/:friendId" element={<ChatPage />} />
                <Route path="/clubs" element={<ClubsPage />} />
                <Route path="/courses" element={<CoursesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/index" element={<Navigate to="/dashboard" replace />} />
              </Route>

              {/* Bakåtkompatibilitet: gamla /v2/*-länkar redirectar till rot */}
              <Route path="/v2" element={<Navigate to="/dashboard" replace />} />
              <Route path="/v2/stats" element={<Navigate to="/stats" replace />} />
              <Route path="/v2/training" element={<Navigate to="/training" replace />} />
              <Route path="/v2/course-planner" element={<Navigate to="/course-planner" replace />} />
              <Route path="/v2/stopwatch" element={<Navigate to="/stopwatch" replace />} />
              <Route path="/v2/goals" element={<Navigate to="/goals" replace />} />
              <Route path="/v2/competition" element={<Navigate to="/competition" replace />} />
              <Route path="/v2/dogs" element={<Navigate to="/dogs" replace />} />
              <Route path="/v2/health" element={<Navigate to="/health" replace />} />
              <Route path="/v2/friends" element={<Navigate to="/friends" replace />} />
              <Route path="/v2/chat" element={<Navigate to="/chat" replace />} />
              <Route path="/v2/clubs" element={<Navigate to="/clubs" replace />} />
              <Route path="/v2/courses" element={<Navigate to="/courses" replace />} />
              <Route path="/v2/settings" element={<Navigate to="/settings" replace />} />
              <Route path="/v2/admin" element={<Navigate to="/admin" replace />} />

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
