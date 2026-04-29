import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import CookieBanner from "@/components/CookieBanner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { V3Layout } from "@/components/v3/V3Layout";
import { ScrollToTop } from "@/components/motion/ScrollToTop";
import { captureUtmParams } from "@/lib/utm";
import { initAnalyticsLoader } from "@/lib/analyticsLoader";

// Capture UTM params on first load
captureUtmParams();
// Starta consent-styrd loader (laddar/avlastar Plausible & Meta Pixel utifrån cookie-val)
initAnalyticsLoader();

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
const DisclaimerPage = React.lazy(() => import("./pages/DisclaimerPage"));
const UnsubscribePage = React.lazy(() => import("./pages/UnsubscribePage"));
const InvitePage = React.lazy(() => import("./pages/InvitePage"));
const ClubInvitePage = React.lazy(() => import("./pages/ClubInvitePage"));
const DesignDemoPage = React.lazy(() => import("./pages/DesignDemoPage"));
const FreeCoursePlannerPage = React.lazy(() => import("./pages/FreeCoursePlannerPage"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const PublicCompetitionsPage = React.lazy(() => import("./pages/PublicCompetitionsPage"));
const CompetitionDetailPage = React.lazy(() => import("./pages/CompetitionDetailPage"));
const HoopersCompetitionDetailPage = React.lazy(() => import("./pages/HoopersCompetitionDetailPage"));
const BreedsIndexPage = React.lazy(() => import("./pages/BreedsIndexPage"));
const BreedDetailPage = React.lazy(() => import("./pages/BreedDetailPage"));
const HelpResultImportPage = React.lazy(() => import("./pages/HelpResultImportPage"));
const PublicCoachPage = React.lazy(() => import("./pages/PublicCoachPage"));

// v2-shellen är pensionerad – alla skyddade rutter går nu via v3.

// Lazy: v3 (parallell shell – Fas 2+)
const V3HomePage = React.lazy(() => import("./pages/v3/V3HomePage"));
const V3TrainingPage = React.lazy(() => import("./pages/v3/V3TrainingPage"));
const V3DogsPage = React.lazy(() => import("./pages/v3/V3DogsPage"));
const V3CompetitionsPage = React.lazy(() => import("./pages/v3/V3CompetitionsPage"));
const V3CompetitionsCalendarPage = React.lazy(() => import("./pages/v3/V3CompetitionsCalendarPage"));
const V3GoalsPage = React.lazy(() => import("./pages/v3/V3GoalsPage"));
const V3StatsPage = React.lazy(() => import("./pages/v3/V3StatsPage"));
const V3HealthPage = React.lazy(() => import("./pages/v3/V3HealthPage"));
const V3CoursesPage = React.lazy(() => import("./pages/v3/V3CoursesPage"));
const V3CoachPage = React.lazy(() => import("./pages/v3/V3CoachPage"));
const V3CoursePlannerPage = React.lazy(() => import("./pages/v3/V3CoursePlannerPage"));
const V3FriendsPage = React.lazy(() => import("./pages/v3/V3FriendsPage"));
const V3ChatListPage = React.lazy(() => import("./pages/v3/V3ChatListPage"));
const V3ChatPage = React.lazy(() => import("./pages/v3/V3ChatPage"));
const V3ClubsPage = React.lazy(() => import("./pages/v3/V3ClubsPage"));
const V3StopwatchPage = React.lazy(() => import("./pages/v3/V3StopwatchPage"));
const V3SettingsPage = React.lazy(() => import("./pages/v3/V3SettingsPage"));
const V3AdminPage = React.lazy(() => import("./pages/v3/V3AdminPage"));

const queryClient = new QueryClient();


function V3Guard() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-v3-canvas">
        <div className="text-v3-text-tertiary font-v3-sans">Laddar…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth?redirect=/v3" replace />;
  return <V3Layout />;
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
  if (user) return <Navigate to="/v3" replace />;
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
        <CookieBanner />
        <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
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
              <Route path="/banplanerare" element={<FreeCoursePlannerPage />} />
              <Route path="/gratis-banplanerare-agility" element={<Navigate to="/banplanerare" replace />} />
              <Route path="/agility-bana-ritverktyg" element={<Navigate to="/banplanerare" replace />} />
              <Route path="/raser" element={<BreedsIndexPage />} />
              <Route path="/raser/:slug" element={<BreedDetailPage />} />
              <Route path="/tavlingar" element={<PublicCompetitionsPage />} />
              {/* Hoopers detalj måste matcha före agility-detalj (mer specifik). */}
              <Route path="/tavlingar/hoopers/:id" element={<HoopersCompetitionDetailPage />} />
              <Route path="/tavlingar/hoopers/:id/:slug" element={<HoopersCompetitionDetailPage />} />
              <Route path="/tavlingar/:id" element={<CompetitionDetailPage />} />
              <Route path="/tavlingar/:id/:slug" element={<CompetitionDetailPage />} />
              {/* Redirects: gamla URL:er med 'ö' (URL-encoded eller raw) → ASCII-slug. Client-side Navigate (HTTP 200, inte äkta 301) – uppgraderas till äkta 301 vid Vercel-flytt. */}
              <Route path="/blogg/agility-kurs-nyb%C3%B6rjare" element={<Navigate to="/blogg/agility-kurs-nyborjare" replace />} />
              <Route path="/blogg/agility-kurs-nybörjare" element={<Navigate to="/blogg/agility-kurs-nyborjare" replace />} />
              <Route path="/agility-kurs-nyb%C3%B6rjare" element={<Navigate to="/blogg/agility-kurs-nyborjare" replace />} />
              <Route path="/agility-kurs-nybörjare" element={<Navigate to="/blogg/agility-kurs-nyborjare" replace />} />
              <Route path="/blogg/:slug" element={<BlogPostPage />} />
              <Route path="/integritetspolicy" element={<PrivacyPolicyPage />} />
              <Route path="/cookiepolicy" element={<CookiePolicyPage />} />
              <Route path="/ansvarsfriskrivning" element={<DisclaimerPage />} />
              <Route path="/avregistrera" element={<UnsubscribePage />} />
              <Route path="/invite/:code" element={<InvitePage />} />
              <Route path="/club-invite/:code" element={<ClubInvitePage />} />
              <Route path="/design-demo" element={<DesignDemoPage />} />
              <Route path="/hjalp/resultathamtning" element={<HelpResultImportPage />} />
              <Route path="/coach" element={<PublicCoachPage />} />

              {/* v3 – Addiction Update (Fas 3: skyddad bakom V3Guard som renderar V3Layout) */}
              <Route path="/v3" element={<V3Guard />}>
                <Route index element={<V3HomePage />} />
                <Route path="training" element={<V3TrainingPage />} />
                <Route path="competition" element={<V3CompetitionsPage />} />
                <Route path="competition/kalender" element={<V3CompetitionsCalendarPage />} />
                <Route path="tavlingar/kalender" element={<V3CompetitionsCalendarPage />} />
                <Route path="goals" element={<V3GoalsPage />} />
                <Route path="stats" element={<V3StatsPage />} />
                <Route path="dogs" element={<V3DogsPage />} />
                <Route path="health" element={<V3HealthPage />} />
                <Route path="courses" element={<V3CoursesPage />} />
                <Route path="coach" element={<V3CoachPage />} />
                <Route path="course-planner" element={<V3CoursePlannerPage />} />
                <Route path="stopwatch" element={<V3StopwatchPage />} />
                <Route path="friends" element={<V3FriendsPage />} />
                <Route path="chat" element={<V3ChatListPage />} />
                <Route path="chat/:friendId" element={<V3ChatPage />} />
                <Route path="clubs" element={<V3ClubsPage />} />
                <Route path="settings" element={<V3SettingsPage />} />
                <Route path="admin" element={<V3AdminPage />} />
              </Route>

              {/* Bakåtkompatibilitet: gamla skyddade rutter pekar nu in i v3-shellen.
                  v2-shellen är pensionerad men koden behålls bara om vi behöver rulla tillbaka. */}
              <Route path="/dashboard" element={<Navigate to="/v3" replace />} />
              <Route path="/stats" element={<Navigate to="/v3/stats" replace />} />
              <Route path="/training" element={<Navigate to="/v3/training" replace />} />
              <Route path="/course-planner" element={<Navigate to="/v3/course-planner" replace />} />
              <Route path="/course-planner-beta" element={<Navigate to="/v3/course-planner" replace />} />
              <Route path="/stopwatch" element={<Navigate to="/v3/stopwatch" replace />} />
              <Route path="/goals" element={<Navigate to="/v3/goals" replace />} />
              <Route path="/app/competition" element={<Navigate to="/v3/competition" replace />} />
              <Route path="/competition" element={<Navigate to="/v3/competition" replace />} />
              <Route path="/competition-calendar" element={<Navigate to="/v3/competition" replace />} />
              <Route path="/dogs" element={<Navigate to="/v3/dogs" replace />} />
              <Route path="/health" element={<Navigate to="/v3/health" replace />} />
              <Route path="/friends" element={<Navigate to="/v3/friends" replace />} />
              <Route path="/friend-stats/:userId" element={<Navigate to="/v3/friends" replace />} />
              <Route path="/chat" element={<Navigate to="/v3/chat" replace />} />
              <Route path="/chat/:friendId" element={<Navigate to="/v3/chat" replace />} />
              <Route path="/app/clubs" element={<Navigate to="/v3/clubs" replace />} />
              <Route path="/clubs" element={<Navigate to="/v3/clubs" replace />} />
              <Route path="/courses" element={<Navigate to="/v3/courses" replace />} />
              <Route path="/settings" element={<Navigate to="/v3/settings" replace />} />
              <Route path="/admin" element={<Navigate to="/v3/admin" replace />} />
              <Route path="/index" element={<Navigate to="/v3" replace />} />

              {/* Bakåtkompatibilitet: gamla /v2/*-länkar redirectar in i v3 */}
              <Route path="/v2" element={<Navigate to="/v3" replace />} />
              <Route path="/v2/stats" element={<Navigate to="/v3/stats" replace />} />
              <Route path="/v2/training" element={<Navigate to="/v3/training" replace />} />
              <Route path="/v2/course-planner" element={<Navigate to="/v3/course-planner" replace />} />
              <Route path="/v2/stopwatch" element={<Navigate to="/v3/stopwatch" replace />} />
              <Route path="/v2/goals" element={<Navigate to="/v3/goals" replace />} />
              <Route path="/v2/competition" element={<Navigate to="/v3/competition" replace />} />
              <Route path="/v2/dogs" element={<Navigate to="/v3/dogs" replace />} />
              <Route path="/v2/health" element={<Navigate to="/v3/health" replace />} />
              <Route path="/v2/friends" element={<Navigate to="/v3/friends" replace />} />
              <Route path="/v2/chat" element={<Navigate to="/v3/chat" replace />} />
              <Route path="/v2/clubs" element={<Navigate to="/v3/clubs" replace />} />
              <Route path="/v2/courses" element={<Navigate to="/v3/courses" replace />} />
              <Route path="/v2/settings" element={<Navigate to="/v3/settings" replace />} />
              <Route path="/v2/admin" element={<Navigate to="/v3/admin" replace />} />

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
