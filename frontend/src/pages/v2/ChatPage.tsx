import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Search } from "lucide-react";
import {
  PageHeader,
  DSCard,
  DSInput,
  DSEmptyState,
  PageSkeleton,
} from "@/components/ds";
import { UserAvatar } from "@/components/v2/UserAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import type { FriendProfile } from "@/types/friends";

interface Conversation {
  friendId: string;
  profile: FriendProfile;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

export default function ChatPage() {
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

    // Reduce to one conversation per friend (latest message wins)
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
      .channel("v2-chat-list")
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

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gemenskap"
        title="Meddelanden"
        subtitle="Din löpande konversation med vänner och tränings­partners."
      />

      <DSCard>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <DSInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sök i konversationer"
            className="pl-9"
          />
        </div>
      </DSCard>

      {filtered.length === 0 ? (
        <DSCard>
          <DSEmptyState
            icon={MessageCircle}
            title="Inga konversationer än"
            description="Starta ett samtal från en vän under Kompisar."
          />
        </DSCard>
      ) : (
        <ul className="space-y-1.5">
          {filtered.map((c) => (
            <li key={c.friendId}>
              <button
                type="button"
                onClick={() => navigate(`/chat/${c.friendId}`)}
                className="w-full flex items-center gap-3 p-3.5 rounded-ds-md border-[0.5px] border-border-subtle/30 bg-surface hover:border-border-default transition-colors text-left"
              >
                <UserAvatar name={c.profile.display_name} url={c.profile.avatar_url} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-body font-medium text-text-primary truncate flex-1">
                      {c.profile.display_name ?? "Utan namn"}
                    </p>
                    <span className="text-micro text-text-tertiary shrink-0">
                      {formatDistanceToNow(new Date(c.lastAt), { addSuffix: true, locale: sv })}
                    </span>
                  </div>
                  <p className="text-small text-text-secondary truncate">{c.lastMessage}</p>
                </div>
                {c.unread > 0 && (
                  <span className="shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-micro font-medium bg-brand-500 text-white">
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
