import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  UserPlus,
  MessageCircle,
  Check,
  X,
  Users,
  BarChart3,
  Copy,
  Sparkles,
  QrCode,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Friendship, FriendProfile } from "@/types/friends";
import { UserAvatar } from "@/components/v2/UserAvatar";
import SharedCoursesInbox from "@/components/friends/SharedCoursesInbox";

// Lazy: html5-qrcode är tungt och behövs bara när skannern öppnas
const QrScannerDialog = lazy(() => import("@/components/friends/QrScannerDialog"));

type Tab = "friends" | "requests" | "find";
type FriendEntry = Friendship & { profile: FriendProfile };

export default function V3FriendsPage() {
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
      .channel("v3-friendships")
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

  return (
    <div className="max-w-[1100px] mx-auto px-5 lg:px-10 py-6 lg:py-10 space-y-8 animate-v3-fade-in">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-v3-eyebrow uppercase tracking-[0.18em] text-v3-text-tertiary mb-2">
            Gemenskap
          </p>
          <h1 className="text-v3-display text-v3-text-primary font-v3-display leading-tight">
            Kompisar
          </h1>
          <p className="text-v3-body text-v3-text-secondary mt-2 max-w-xl">
            Anslut med andra hundförare, dela banskisser och följ varandras framsteg.
          </p>
        </div>
        <button
          type="button"
          onClick={copyReferral}
          disabled={!myProfile?.referral_code}
          className="v3-tappable inline-flex items-center gap-2 px-4 h-11 rounded-v3-base border border-v3-border bg-v3-surface text-v3-text-primary text-v3-body font-medium disabled:opacity-50"
        >
          <Copy className="w-4 h-4" /> Bjud in vän
        </button>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <V3Stat label="Vänner" value={friends.length} hint="anslutna" />
        <V3Stat label="Inkommande" value={incomingRequests.length} hint="att besvara" />
        <V3Stat label="Skickade" value={sentRequests.length} hint="väntar svar" />
        <V3Stat
          label="Inbjudningskod"
          value={myProfile?.referral_code ?? "—"}
          hint="dela för Pro"
        />
      </section>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-v3-base bg-v3-surface border border-v3-border w-fit">
        {(
          [
            { value: "friends" as const, label: `Vänner (${friends.length})` },
            { value: "requests" as const, label: `Förfrågningar (${incomingRequests.length})` },
            { value: "find" as const, label: "Hitta nya" },
          ]
        ).map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTab(opt.value)}
            className={`px-4 h-9 rounded-v3-sm text-v3-body font-medium transition-colors v3-focus-ring ${
              tab === opt.value
                ? "bg-v3-canvas text-v3-text-primary shadow-sm"
                : "text-v3-text-tertiary hover:text-v3-text-secondary"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="v3-skeleton h-[72px] rounded-v3-xl" />
          ))}
        </div>
      ) : tab === "friends" ? (
        friends.length === 0 ? (
          <V3Empty
            icon={Users}
            title="Du har inga vänner än"
            description="Sök efter andra hundförare under fliken 'Hitta nya'."
            action={
              <button
                type="button"
                onClick={() => setTab("find")}
                className="v3-tappable inline-flex items-center gap-2 px-4 h-10 rounded-v3-base bg-v3-text-primary text-v3-canvas text-v3-body font-medium"
              >
                <Sparkles className="w-4 h-4" /> Hitta vänner
              </button>
            }
          />
        ) : (
          <ul className="space-y-2 v3-stagger">
            {friends.map((f) => (
              <li key={f.id}>
                <article className="flex items-center gap-3 p-4 rounded-v3-xl border border-v3-border bg-v3-surface hover:border-v3-border-strong transition-colors">
                  <UserAvatar name={f.profile.display_name} url={f.profile.avatar_url} />
                  <div className="min-w-0 flex-1">
                    <p className="text-v3-body font-medium text-v3-text-primary truncate">
                      {f.profile.display_name ?? "Utan namn"}
                    </p>
                    <p className="text-v3-micro text-v3-text-tertiary mt-0.5">
                      Vän sedan {new Date(f.created_at).toLocaleDateString("sv-SE")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => navigate(`/friend-stats/${f.profile.user_id}`)}
                      aria-label="Visa statistik"
                      className="v3-tappable p-2 rounded-v3-sm text-v3-text-tertiary hover:bg-v3-canvas hover:text-v3-text-primary"
                    >
                      <BarChart3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/v3/chat/${f.profile.user_id}`)}
                      className="v3-tappable inline-flex items-center gap-1.5 px-3 h-9 rounded-v3-base border border-v3-border bg-v3-canvas text-v3-text-primary text-v3-small font-medium"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Chatta
                    </button>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )
      ) : tab === "requests" ? (
        incomingRequests.length === 0 ? (
          <V3Empty
            icon={UserPlus}
            title="Inga väntande förfrågningar"
            description="När någon vill bli din vän dyker den upp här."
          />
        ) : (
          <ul className="space-y-2 v3-stagger">
            {incomingRequests.map((r) => (
              <li key={r.id}>
                <article className="flex items-center gap-3 p-4 rounded-v3-xl border border-v3-border bg-v3-surface">
                  <UserAvatar name={r.profile.display_name} url={r.profile.avatar_url} />
                  <div className="min-w-0 flex-1">
                    <p className="text-v3-body font-medium text-v3-text-primary truncate">
                      {r.profile.display_name ?? "Utan namn"}
                    </p>
                    <p className="text-v3-micro text-v3-text-tertiary mt-0.5">vill bli din vän</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => respond(r.id, false)}
                      aria-label="Avvisa"
                      className="v3-tappable p-2 rounded-v3-sm text-v3-text-tertiary hover:bg-v3-canvas hover:text-v3-text-primary"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => respond(r.id, true)}
                      className="v3-tappable inline-flex items-center gap-1.5 px-3 h-9 rounded-v3-base bg-v3-text-primary text-v3-canvas text-v3-small font-medium"
                    >
                      <Check className="w-3.5 h-3.5" /> Acceptera
                    </button>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-v3-text-tertiary" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sök efter namn (minst 2 tecken)"
              className="w-full pl-10 pr-4 h-12 rounded-v3-base border border-v3-border bg-v3-surface text-v3-body text-v3-text-primary placeholder:text-v3-text-tertiary v3-focus-ring"
            />
          </div>

          {search.length < 2 ? (
            <V3Empty
              icon={Search}
              title="Sök efter andra hundförare"
              description="Skriv minst två tecken för att börja söka."
            />
          ) : searching ? (
            <p className="text-v3-small text-v3-text-tertiary px-1">Söker…</p>
          ) : searchResults.length === 0 ? (
            <V3Empty
              icon={Users}
              title="Inga träffar"
              description={`Vi hittade ingen som matchar "${search}".`}
            />
          ) : (
            <ul className="space-y-2 v3-stagger">
              {searchResults.map((p) => {
                const alreadyConnected = friends.some(
                  (f) => f.profile.user_id === p.user_id,
                );
                const alreadyPending = pending.some(
                  (q) => q.profile.user_id === p.user_id,
                );
                return (
                  <li key={p.user_id}>
                    <article className="flex items-center gap-3 p-4 rounded-v3-xl border border-v3-border bg-v3-surface">
                      <UserAvatar name={p.display_name} url={p.avatar_url} />
                      <div className="min-w-0 flex-1">
                        <p className="text-v3-body font-medium text-v3-text-primary truncate">
                          {p.display_name ?? "Utan namn"}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={alreadyConnected || alreadyPending}
                        onClick={() => sendRequest(p)}
                        className="v3-tappable inline-flex items-center gap-1.5 px-3 h-9 rounded-v3-base bg-v3-text-primary text-v3-canvas text-v3-small font-medium disabled:opacity-40 disabled:bg-v3-surface disabled:text-v3-text-tertiary disabled:border disabled:border-v3-border"
                      >
                        {alreadyConnected ? (
                          "Vän"
                        ) : alreadyPending ? (
                          "Väntar"
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" /> Lägg till
                          </>
                        )}
                      </button>
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

function V3Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="p-4 rounded-v3-xl border border-v3-border bg-v3-surface">
      <p className="text-v3-micro uppercase tracking-wider text-v3-text-tertiary">
        {label}
      </p>
      <p className="text-2xl font-v3-display text-v3-text-primary mt-1 truncate">
        {value}
      </p>
      {hint && <p className="text-v3-micro text-v3-text-tertiary mt-0.5">{hint}</p>}
    </div>
  );
}

function V3Empty({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Users;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="p-10 rounded-v3-2xl border border-v3-border bg-v3-surface text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-v3-base bg-v3-canvas text-v3-text-tertiary mx-auto mb-3">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-v3-h3 font-v3-display text-v3-text-primary">{title}</h3>
      {description && (
        <p className="text-v3-body text-v3-text-secondary mt-2 max-w-md mx-auto">
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
