import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Users, Loader2, Shield, Dog, Dumbbell, Trophy, Heart, Timer,
  Search, Eye, CalendarDays, MessageCircle, BarChart3, Gift, FileText,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  PageHeader, DSCard, DSInput, DSButton, MetricCard, StatusBadge, DSEmptyState,
} from "@/components/ds";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserDetailModal from "@/components/admin/UserDetailModal";
import SupportTicketsTab from "@/components/admin/SupportTicketsTab";
import AnalyticsTab from "@/components/admin/AnalyticsTab";
import ReferralStatsTab from "@/components/admin/ReferralStatsTab";
import BlogPostsTab from "@/components/admin/BlogPostsTab";
import CoachFeedbackTab from "@/components/admin/CoachFeedbackTab";

export default function V2AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const { data: isAdmin, isLoading: checkLoading } = useQuery({
    queryKey: ["admin-check-v2"],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      return !!data;
    },
    enabled: !!user?.id,
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-stats-v2"],
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
    queryKey: ["admin-users-v2"],
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
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <DSEmptyState
        icon={Shield}
        title="Åtkomst nekad"
        description="Du har inte behörighet att se denna sida."
      />
    );
  }

  const filteredUsers = userSearch
    ? users.filter((u: any) =>
        (u.display_name || "").toLowerCase().includes(userSearch.toLowerCase())
      )
    : users;

  return (
    <>
      <PageHeader
        eyebrow="System"
        title="Admin"
        subtitle="Hantera användare, support och analys."
        actions={
          <DSButton variant="ghost" onClick={() => navigate("/v2/settings")}>
            Inställningar
          </DSButton>
        }
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <MetricCard icon={Users} label="Användare" value={stats.users} />
          <MetricCard icon={Dog} label="Hundar" value={stats.dogs} />
          <MetricCard icon={Dumbbell} label="Träningar" value={stats.training} />
          <MetricCard icon={Trophy} label="Tävlingar" value={stats.competitions} />
          <MetricCard icon={Heart} label="Hälsa" value={stats.health} />
          <MetricCard icon={Timer} label="Tider" value={stats.stopwatch} />
        </div>
      )}

      <Tabs defaultValue="users">
        <TabsList className="flex w-full overflow-x-auto rounded-xl mb-4">
          <TabsTrigger value="users" className="flex-1 gap-1.5"><Users className="h-3.5 w-3.5" /> Användare</TabsTrigger>
          <TabsTrigger value="support" className="flex-1 gap-1.5"><MessageCircle className="h-3.5 w-3.5" /> Support</TabsTrigger>
          <TabsTrigger value="analytics" className="flex-1 gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Analys</TabsTrigger>
          <TabsTrigger value="referrals" className="flex-1 gap-1.5"><Gift className="h-3.5 w-3.5" /> Referrals</TabsTrigger>
          <TabsTrigger value="blog" className="flex-1 gap-1.5"><FileText className="h-3.5 w-3.5" /> Blogg</TabsTrigger>
          <TabsTrigger value="coach" className="flex-1 gap-1.5"><MessageCircle className="h-3.5 w-3.5" /> Coach</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <DSInput
              placeholder="Sök användare..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {usersLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
            </div>
          ) : !filteredUsers.length ? (
            <p className="text-body text-text-tertiary text-center py-8">Inga användare hittades.</p>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((u: any) => {
                const isPremium = u.premium_until && new Date(u.premium_until) > new Date();
                const isLifetime = isPremium && new Date(u.premium_until).getFullYear() >= 2090;
                return (
                  <DSCard key={u.id} className="p-3 sm:p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-small font-semibold text-primary">
                        {(u.display_name || "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-body text-text-primary truncate">{u.display_name || "Namnlös"}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-micro text-text-tertiary flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {new Date(u.created_at).toLocaleDateString("sv-SE")}
                          </span>
                          {isPremium && (
                            <StatusBadge
                              variant="warning"
                              label={isLifetime ? "⭐ Livstid" : "⭐ Premium"}
                            />
                          )}
                        </div>
                      </div>
                      <DSButton
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedUser(u)}
                      >
                        <Eye className="h-3.5 w-3.5" /> Visa
                      </DSButton>
                    </div>
                  </DSCard>
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
    </>
  );
}
