import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import {
  Users, Loader2, Shield, Dog, Dumbbell, Trophy, Heart, Timer,
  Search, Eye, CalendarDays, MessageCircle, BarChart3, Gift, FileText,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserDetailModal from "@/components/admin/UserDetailModal";
import SupportTicketsTab from "@/components/admin/SupportTicketsTab";
import AnalyticsTab from "@/components/admin/AnalyticsTab";
import ReferralStatsTab from "@/components/admin/ReferralStatsTab";
import BlogPostsTab from "@/components/admin/BlogPostsTab";
import CoachFeedbackTab from "@/components/admin/CoachFeedbackTab";
import { cn } from "@/lib/utils";

type StatCardProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
};

function V3StatCard({ icon: Icon, label, value }: StatCardProps) {
  return (
    <div className="rounded-v3-xl bg-v3-canvas-elevated border border-v3-canvas-sunken p-4 animate-v3-fade-up">
      <div className="flex items-center gap-2 text-v3-text-tertiary">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-v3-2xs uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className="font-v3-display text-v3-2xl text-v3-text-primary mt-2 tabular-nums">
        {value.toLocaleString("sv-SE")}
      </p>
    </div>
  );
}

export default function V3AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const { data: isAdmin, isLoading: checkLoading } = useQuery({
    queryKey: ["admin-check-v3"],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      return !!data;
    },
    enabled: !!user?.id,
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-stats-v3"],
    queryFn: async () => {
      const [profiles, dogs, training, competitions, health, stopwatch] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("dogs").select("id", { count: "exact", head: true }),
        supabase.from("training_sessions").select("id", { count: "exact", head: true }),
        supabase.from("competition_results").select("id", { count: "exact", head: true }),
        supabase.from("health_logs").select("id", { count: "exact", head: true }),
        supabase.from("stopwatch_results").select("id", { count: "exact", head: true }),
      ]);
      return {
        users: profiles.count ?? 0,
        dogs: dogs.count ?? 0,
        training: training.count ?? 0,
        competitions: competitions.count ?? 0,
        health: health.count ?? 0,
        stopwatch: stopwatch.count ?? 0,
      };
    },
    enabled: !!isAdmin,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users-v3"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!isAdmin,
  });

  if (checkLoading) {
    return (
      <div className="max-w-[1100px] mx-auto px-5 lg:px-10 py-20 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-v3-text-tertiary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-[1100px] mx-auto px-5 lg:px-10 py-6 lg:py-10">
        <div className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken p-10 text-center space-y-3">
          <Shield className="h-10 w-10 mx-auto text-v3-text-tertiary" />
          <h2 className="font-v3-display text-v3-2xl text-v3-text-primary">Åtkomst nekad</h2>
          <p className="text-v3-sm text-v3-text-secondary">
            Du har inte behörighet att se denna sida.
          </p>
        </div>
      </div>
    );
  }

  const filteredUsers = userSearch
    ? users.filter((u: any) =>
        (u.display_name || "").toLowerCase().includes(userSearch.toLowerCase())
      )
    : users;

  return (
    <div className="max-w-[1100px] mx-auto px-5 lg:px-10 py-6 lg:py-10 space-y-8 animate-v3-fade-in">
      <Helmet><title>Admin – v3 – AgilityManager</title></Helmet>

      {/* Header */}
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <p className="text-v3-xs uppercase tracking-[0.18em] text-v3-text-tertiary font-v3-sans">
            System
          </p>
          <h1 className="font-v3-display text-v3-4xl lg:text-v3-5xl text-v3-text-primary">
            Admin
          </h1>
          <p className="text-v3-base text-v3-text-secondary max-w-xl">
            Hantera användare, support och analys.
          </p>
        </div>
        <button
          onClick={() => navigate("/v3/settings")}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-v3-base bg-v3-canvas-secondary border border-v3-canvas-sunken text-v3-sm text-v3-text-primary v3-tappable v3-focus-ring"
        >
          Inställningar
        </button>
      </header>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 v3-stagger">
          <V3StatCard icon={Users} label="Användare" value={stats.users} />
          <V3StatCard icon={Dog} label="Hundar" value={stats.dogs} />
          <V3StatCard icon={Dumbbell} label="Träningar" value={stats.training} />
          <V3StatCard icon={Trophy} label="Tävlingar" value={stats.competitions} />
          <V3StatCard icon={Heart} label="Hälsa" value={stats.health} />
          <V3StatCard icon={Timer} label="Tider" value={stats.stopwatch} />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="users">
        <TabsList className="flex w-full overflow-x-auto rounded-v3-base bg-v3-canvas-secondary border border-v3-canvas-sunken p-1 mb-4">
          <TabsTrigger value="users" className="flex-1 gap-1.5 data-[state=active]:bg-v3-canvas-elevated data-[state=active]:shadow-v3-xs rounded-[calc(theme(borderRadius.v3-base)-2px)]">
            <Users className="h-3.5 w-3.5" /> Användare
          </TabsTrigger>
          <TabsTrigger value="support" className="flex-1 gap-1.5 data-[state=active]:bg-v3-canvas-elevated data-[state=active]:shadow-v3-xs rounded-[calc(theme(borderRadius.v3-base)-2px)]">
            <MessageCircle className="h-3.5 w-3.5" /> Support
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex-1 gap-1.5 data-[state=active]:bg-v3-canvas-elevated data-[state=active]:shadow-v3-xs rounded-[calc(theme(borderRadius.v3-base)-2px)]">
            <BarChart3 className="h-3.5 w-3.5" /> Analys
          </TabsTrigger>
          <TabsTrigger value="referrals" className="flex-1 gap-1.5 data-[state=active]:bg-v3-canvas-elevated data-[state=active]:shadow-v3-xs rounded-[calc(theme(borderRadius.v3-base)-2px)]">
            <Gift className="h-3.5 w-3.5" /> Referrals
          </TabsTrigger>
          <TabsTrigger value="blog" className="flex-1 gap-1.5 data-[state=active]:bg-v3-canvas-elevated data-[state=active]:shadow-v3-xs rounded-[calc(theme(borderRadius.v3-base)-2px)]">
            <FileText className="h-3.5 w-3.5" /> Blogg
          </TabsTrigger>
          <TabsTrigger value="coach" className="flex-1 gap-1.5 data-[state=active]:bg-v3-canvas-elevated data-[state=active]:shadow-v3-xs rounded-[calc(theme(borderRadius.v3-base)-2px)]">
            <MessageCircle className="h-3.5 w-3.5" /> Coach
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-v3-text-tertiary" />
            <input
              placeholder="Sök användare..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-v3-base border border-v3-canvas-sunken bg-v3-canvas-elevated text-v3-sm text-v3-text-primary placeholder:text-v3-text-tertiary v3-focus-ring"
            />
          </div>

          {usersLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-v3-text-tertiary" />
            </div>
          ) : !filteredUsers.length ? (
            <p className="text-v3-sm text-v3-text-tertiary text-center py-8">
              Inga användare hittades.
            </p>
          ) : (
            <div className="space-y-2 v3-stagger">
              {filteredUsers.map((u: any) => {
                const isPremium = u.premium_until && new Date(u.premium_until) > new Date();
                const isLifetime = isPremium && new Date(u.premium_until).getFullYear() >= 2090;
                return (
                  <div
                    key={u.id}
                    className="rounded-v3-xl bg-v3-canvas-elevated border border-v3-canvas-sunken p-3 sm:p-4 animate-v3-fade-up"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-v3-brand-100 flex items-center justify-center shrink-0 text-v3-sm font-semibold text-v3-brand-700">
                        {(u.display_name || "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-v3-sm text-v3-text-primary truncate font-medium">
                          {u.display_name || "Namnlös"}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-v3-2xs text-v3-text-tertiary flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {new Date(u.created_at).toLocaleDateString("sv-SE")}
                          </span>
                          {isPremium && (
                            <span className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-v3-2xs font-medium",
                              isLifetime
                                ? "bg-v3-accent-prestation/10 text-v3-accent-prestation"
                                : "bg-v3-warning/10 text-v3-warning",
                            )}>
                              {isLifetime ? "⭐ Livstid" : "⭐ Premium"}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-v3-base text-v3-text-secondary hover:bg-v3-canvas-secondary text-v3-xs v3-focus-ring"
                      >
                        <Eye className="h-3.5 w-3.5" /> Visa
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="support"><SupportTicketsTab /></TabsContent>
        <TabsContent value="analytics"><AnalyticsTab /></TabsContent>
        <TabsContent value="referrals"><ReferralStatsTab /></TabsContent>
        <TabsContent value="blog"><BlogPostsTab /></TabsContent>
        <TabsContent value="coach"><CoachFeedbackTab /></TabsContent>
      </Tabs>

      <UserDetailModal
        userId={selectedUser?.user_id || null}
        userName={selectedUser?.display_name || "Namnlös"}
        open={!!selectedUser}
        onOpenChange={(open) => { if (!open) setSelectedUser(null); }}
      />
    </div>
  );
}
