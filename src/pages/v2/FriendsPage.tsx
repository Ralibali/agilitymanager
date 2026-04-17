import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserPlus, MessageCircle, Check, X, Users, BarChart3, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  PageHeader,
  DSCard,
  DSButton,
  DSInput,
  DSEmptyState,
  PageSkeleton,
  MetricCard,
  SegmentedControl,
} from "@/components/ds";
import { UserAvatar } from "@/components/v2/UserAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Friendship, FriendProfile } from "@/types/friends";

type Tab = "friends" | "requests" | "find";
type FriendEntry = Friendship & { profile: FriendProfile };

export default function FriendsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("friends");
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [pending, setPending] = useState<FriendEntry[]>([]);
  const [myProfile, setMyProfile] = useState<FriendProfile | null>(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data: friendships } = await supabase
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (!friendships) {
      setLoading(false);
      return;
    }

    const otherIds = friendships.map((f) =>
      f.requester_id === user.id ? f.receiver_id : f.requester_id,
    );

    let profiles: FriendProfile[] = [];
    if (otherIds.length > 0) {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, referral_code")
        .in("user_id", otherIds);
      profiles = (data ?? []) as FriendProfile[];
    }
    const map = new Map(profiles.map((p) => [p.user_id, p]));

    const accepted: FriendEntry[] = [];
    const pendingList: FriendEntry[] = [];
    for (const f of friendships) {
      const otherId = f.requester_id === user.id ? f.receiver_id : f.requester_id;
      const profile =
        map.get(otherId) ?? {
          user_id: otherId,
          display_name: null,
          avatar_url: null,
          referral_code: null,
        };
      const entry = { ...f, profile } as FriendEntry;
      if (f.status === "accepted") accepted.push(entry);
      else if (f.status === "pending") pendingList.push(entry);
    }
    setFriends(accepted);
    setPending(pendingList);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, referral_code")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => data && setMyProfile(data as FriendProfile));
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Realtime
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("v2-friendships")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, load]);

  // Debounced search
  useEffect(() => {
    if (search.length < 2) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, referral_code")
        .ilike("display_name", `%${search}%`)
        .neq("user_id", user?.id ?? "")
        .limit(10);
      setSearchResults((data ?? []) as FriendProfile[]);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [search, user?.id]);

  const incomingRequests = useMemo(
    () => pending.filter((p) => p.receiver_id === user?.id),
    [pending, user?.id],
  );
  const sentRequests = useMemo(
    () => pending.filter((p) => p.requester_id === user?.id),
    [pending, user?.id],
  );

  const sendRequest = async (target: FriendProfile) => {
    if (!user) return;
    const { error } = await supabase.from("friendships").insert({
      requester_id: user.id,
      receiver_id: target.user_id,
      status: "pending",
    });
    if (error) toast.error("Kunde inte skicka förfrågan");
    else {
      toast.success("Förfrågan skickad");
      load();
    }
  };

  const respond = async (id: string, accept: boolean) => {
    if (accept) {
      await supabase.from("friendships").update({ status: "accepted" }).eq("id", id);
      toast.success("Vän tillagd");
    } else {
      await supabase.from("friendships").delete().eq("id", id);
      toast.success("Förfrågan avvisad");
    }
    load();
  };

  const copyReferral = () => {
    if (!myProfile?.referral_code) return;
    const url = `${window.location.origin}/invite/${myProfile.referral_code}`;
    navigator.clipboard.writeText(url);
    toast.success("Inbjudningslänk kopierad");
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Gemenskap"
        title="Kompisar"
        subtitle="Träffa andra hundförare, dela banskisser och följ varandras framsteg."
        actions={
          <DSButton variant="secondary" onClick={copyReferral} disabled={!myProfile?.referral_code}>
            <Copy className="w-4 h-4" /> Bjud in
          </DSButton>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Vänner" value={friends.length} hint="anslutna" />
        <MetricCard label="Inkommande" value={incomingRequests.length} hint="att besvara" />
        <MetricCard label="Skickade" value={sentRequests.length} hint="väntar svar" />
        <MetricCard label="Inbjudningskod" value={myProfile?.referral_code ?? "—"} hint="dela för premium" />
      </div>

      <SegmentedControl<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: "friends", label: `Vänner (${friends.length})` },
          { value: "requests", label: `Förfrågningar (${incomingRequests.length})` },
          { value: "find", label: "Hitta nya" },
        ]}
      />

      {tab === "friends" && (
        friends.length === 0 ? (
          <DSCard>
            <DSEmptyState
              icon={Users}
              title="Du har inga vänner än"
              description="Sök efter andra hundförare under fliken 'Hitta nya'."
              actions={
                <DSButton variant="secondary" onClick={() => setTab("find")}>
                  Hitta vänner
                </DSButton>
              }
            />
          </DSCard>
        ) : (
          <ul className="space-y-2">
            {friends.map((f) => (
              <li key={f.id}>
                <article className="flex items-center gap-3 p-3.5 rounded-ds-md border-[0.5px] border-border-subtle/30 bg-surface hover:border-border-default transition-colors">
                  <UserAvatar name={f.profile.display_name} url={f.profile.avatar_url} />
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-medium text-text-primary truncate">
                      {f.profile.display_name ?? "Utan namn"}
                    </p>
                    <p className="text-micro text-text-tertiary">
                      Vän sedan {new Date(f.created_at).toLocaleDateString("sv-SE")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <DSButton
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/friend-stats/${f.profile.user_id}`)}
                      aria-label="Visa statistik"
                    >
                      <BarChart3 className="w-4 h-4" />
                    </DSButton>
                    <DSButton
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(`/chat/${f.profile.user_id}`)}
                    >
                      <MessageCircle className="w-4 h-4" /> Chatta
                    </DSButton>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )
      )}

      {tab === "requests" && (
        incomingRequests.length === 0 ? (
          <DSCard>
            <DSEmptyState
              icon={UserPlus}
              title="Inga väntande förfrågningar"
              description="När någon vill bli din vän dyker den upp här."
            />
          </DSCard>
        ) : (
          <ul className="space-y-2">
            {incomingRequests.map((r) => (
              <li key={r.id}>
                <article className="flex items-center gap-3 p-3.5 rounded-ds-md border-[0.5px] border-border-subtle/30 bg-surface">
                  <UserAvatar name={r.profile.display_name} url={r.profile.avatar_url} />
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-medium text-text-primary truncate">
                      {r.profile.display_name ?? "Utan namn"}
                    </p>
                    <p className="text-micro text-text-tertiary">vill bli din vän</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <DSButton size="sm" variant="ghost" onClick={() => respond(r.id, false)} aria-label="Avvisa">
                      <X className="w-4 h-4" />
                    </DSButton>
                    <DSButton size="sm" onClick={() => respond(r.id, true)}>
                      <Check className="w-4 h-4" /> Acceptera
                    </DSButton>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )
      )}

      {tab === "find" && (
        <div className="space-y-4">
          <DSCard>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <DSInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Sök efter namn (minst 2 tecken)"
                className="pl-9"
              />
            </div>
          </DSCard>

          {search.length < 2 ? (
            <DSCard>
              <DSEmptyState
                icon={Search}
                title="Sök efter andra hundförare"
                description="Skriv minst två tecken för att börja söka."
              />
            </DSCard>
          ) : searching ? (
            <p className="text-small text-text-tertiary px-1">Söker…</p>
          ) : searchResults.length === 0 ? (
            <DSCard>
              <DSEmptyState
                icon={Users}
                title="Inga träffar"
                description={`Vi hittade ingen som matchar "${search}".`}
              />
            </DSCard>
          ) : (
            <ul className="space-y-2">
              {searchResults.map((p) => {
                const alreadyConnected = friends.some((f) => f.profile.user_id === p.user_id);
                const alreadyPending = pending.some(
                  (q) => q.profile.user_id === p.user_id,
                );
                return (
                  <li key={p.user_id}>
                    <article className="flex items-center gap-3 p-3.5 rounded-ds-md border-[0.5px] border-border-subtle/30 bg-surface">
                      <UserAvatar name={p.display_name} url={p.avatar_url} />
                      <div className="min-w-0 flex-1">
                        <p className="text-body font-medium text-text-primary truncate">
                          {p.display_name ?? "Utan namn"}
                        </p>
                      </div>
                      <DSButton
                        size="sm"
                        variant={alreadyConnected || alreadyPending ? "ghost" : "primary"}
                        disabled={alreadyConnected || alreadyPending}
                        onClick={() => sendRequest(p)}
                      >
                        {alreadyConnected
                          ? "Vän"
                          : alreadyPending
                            ? "Väntar"
                            : (
                              <>
                                <UserPlus className="w-4 h-4" /> Lägg till
                              </>
                            )}
                      </DSButton>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
