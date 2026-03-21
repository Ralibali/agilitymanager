import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { BottomNav } from "@/components/BottomNav";
import LandingPage from "./pages/LandingPage";
import Index from "./pages/Index";
import DogsPage from "./pages/DogsPage";
import TrainingPage from "./pages/TrainingPage";
import CompetitionPage from "./pages/CompetitionPage";
import StopwatchPage from "./pages/StopwatchPage";
import HealthPage from "./pages/HealthPage";
import CoursePlannerPage from "./pages/CoursePlannerPage";
import StatsPage from "./pages/StatsPage";
import SettingsPage from "./pages/SettingsPage";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import InsurancePage from "./pages/InsurancePage";
import BlogPage from "./pages/BlogPage";
import BlogPostPage from "./pages/BlogPostPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";

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
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route element={<AuthGuard />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
            </Route>
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/hundforsakring" element={<InsurancePage />} />
            <Route path="/blogg" element={<BlogPage />} />
            <Route path="/blogg/:slug" element={<BlogPostPage />} />

            {/* Protected routes */}
            <Route element={<ProtectedLayout />}>
              <Route path="/dashboard" element={<Index />} />
              <Route path="/dogs" element={<DogsPage />} />
              <Route path="/training" element={<TrainingPage />} />
              <Route path="/competition" element={<CompetitionPage />} />
              <Route path="/stopwatch" element={<StopwatchPage />} />
              <Route path="/health" element={<HealthPage />} />
              <Route path="/course-planner" element={<CoursePlannerPage />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/index" element={<Navigate to="/dashboard" replace />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
