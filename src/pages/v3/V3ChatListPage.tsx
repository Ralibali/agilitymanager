import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import type { FriendProfile } from "@/types/friends";
import { UserAvatar } from "@/components/v2/UserAvatar";

interface Conversation {
  friendId: string;
  profile: FriendProfile;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

export default function V3ChatListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data: messages } = await supabase
      .from("messages")
      .select("id, sender_id, receiver_id, content, read, created_at")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(500);

    if (!messages) {
      setLoading(false);
      return;
    }

    const map = new Map<
      string,
      { lastMessage: string; lastAt: string; unread: number }
    >();
    for (const m of messages) {
      const friendId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
      const entry = map.get(friendId);
      const unreadInc = m.receiver_id === user.id && !m.read ? 1 : 0;
      if (!entry) {
        map.set(friendId, {
          lastMessage: m.content,
          lastAt: m.created_at,
          unread: unreadInc,
        });
      } else {
        entry.unread += unreadInc;
      }
    }

    const ids = Array.from(map.keys());
    let profiles: FriendProfile[] = [];
    if (ids.length > 0) {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, referral_code")
        .in("user_id", ids);
      profiles = (data ?? []) as FriendProfile[];
    }
    const profileMap = new Map(profiles.map((p) => [p.user_id, p]));

    const list: Conversation[] = ids.map((fid) => ({
      friendId: fid,
      profile:
        profileMap.get(fid) ?? {
          user_id: fid,
          display_name: null,
          avatar_url: null,
          referral_code: null,
        },
      lastMessage: map.get(fid)!.lastMessage,
      lastAt: map.get(fid)!.lastAt,
      unread: map.get(fid)!.unread,
    }));

    list.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
    setConversations(list);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Realtime
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("v3-chat-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, load]);

  const filtered = conversations.filter((c) =>
    (c.profile.display_name ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="max-w-[900px] mx-auto px-5 lg:px-10 py-6 lg:py-10 space-y-6 animate-v3-fade-in">
      <header>
        <p className="text-v3-eyebrow uppercase tracking-[0.18em] text-v3-text-tertiary mb-2">
          Gemenskap
        </p>
        <h1 className="text-v3-display text-v3-text-primary font-v3-display leading-tight">
          Meddelanden
        </h1>
        <p className="text-v3-body text-v3-text-secondary mt-2 max-w-xl">
          Din löpande konversation med vänner och tränings­partners.
        </p>
      </header>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-v3-text-tertiary" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Sök i konversationer"
          className="w-full pl-10 pr-4 h-12 rounded-v3-base border border-v3-border bg-v3-surface text-v3-body text-v3-text-primary placeholder:text-v3-text-tertiary v3-focus-ring"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="v3-skeleton h-[72px] rounded-v3-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-10 rounded-v3-2xl border border-v3-border bg-v3-surface text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-v3-base bg-v3-canvas text-v3-text-tertiary mx-auto mb-3">
            <MessageCircle className="w-5 h-5" />
          </div>
          <h3 className="text-v3-h3 font-v3-display text-v3-text-primary">
            Inga konversationer än
          </h3>
          <p className="text-v3-body text-v3-text-secondary mt-2">
            Starta ett samtal från en vän under Kompisar.
          </p>
        </div>
      ) : (
        <ul className="space-y-2 v3-stagger">
          {filtered.map((c) => (
            <li key={c.friendId}>
              <button
                type="button"
                onClick={() => navigate(`/v3/chat/${c.friendId}`)}
                className="v3-tappable w-full flex items-center gap-3 p-4 rounded-v3-xl border border-v3-border bg-v3-surface hover:border-v3-border-strong text-left"
              >
                <UserAvatar name={c.profile.display_name} url={c.profile.avatar_url} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-v3-body font-medium text-v3-text-primary truncate flex-1">
                      {c.profile.display_name ?? "Utan namn"}
                    </p>
                    <span className="text-v3-micro text-v3-text-tertiary shrink-0">
                      {formatDistanceToNow(new Date(c.lastAt), {
                        addSuffix: true,
                        locale: sv,
                      })}
                    </span>
                  </div>
                  <p className="text-v3-small text-v3-text-secondary truncate mt-0.5">
                    {c.lastMessage}
                  </p>
                </div>
                {c.unread > 0 && (
                  <span className="shrink-0 inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-v3-micro font-semibold bg-v3-text-primary text-v3-canvas">
                    {c.unread}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
