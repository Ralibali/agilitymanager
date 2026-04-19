import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, Trophy, Dumbbell, Calendar, PencilRuler } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { FriendProfile } from "@/types/friends";
import { UserAvatar } from "@/components/v2/UserAvatar";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  shared_type: string | null;
  shared_id: string | null;
  shared_data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}

const ICON_MAP: Record<string, typeof Trophy> = {
  competition: Calendar,
  result: Trophy,
  training: Dumbbell,
  course: PencilRuler,
};
const LABEL_MAP: Record<string, string> = {
  competition: "Tävlingstips",
  result: "Tävlingsresultat",
  training: "Träningspass",
  course: "Banskiss",
};

function SharedItemPreview({
  type,
  data,
}: {
  type: string;
  data: Record<string, unknown> | null;
}) {
  if (!data) return null;
  const Icon = ICON_MAP[type] ?? Trophy;
  return (
    <div className="mt-1.5 rounded-v3-base border border-v3-border bg-v3-canvas p-2.5">
      <div className="flex items-center gap-1.5 text-v3-micro text-v3-text-tertiary mb-1">
        <Icon size={12} />
        <span className="font-medium">{LABEL_MAP[type] ?? type}</span>
      </div>
      <p className="text-v3-small font-medium text-v3-text-primary truncate">
        {(data.name ||
          data.event_name ||
          data.competition_name ||
          "Delad resurs") as string}
      </p>
      {data.date != null && (
        <p className="text-v3-micro text-v3-text-tertiary mt-0.5">
          {data.date as string}
        </p>
      )}
    </div>
  );
}

export default function V3ChatPage() {
  const { friendId } = useParams<{ friendId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [friendProfile, setFriendProfile] = useState<FriendProfile | null>(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Friend profile
  useEffect(() => {
    if (!friendId) return;
    supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, referral_code")
      .eq("user_id", friendId)
      .single()
      .then(({ data }) => data && setFriendProfile(data as FriendProfile));
  }, [friendId]);

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!user?.id || !friendId) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`,
      )
      .order("created_at", { ascending: true });
    if (data) {
      setMessages(data as Message[]);
      // Mark as read
      const unreadIds = data
        .filter((m) => m.receiver_id === user.id && !m.read)
        .map((m) => m.id);
      if (unreadIds.length > 0) {
        await supabase.from("messages").update({ read: true }).in("id", unreadIds);
      }
    }
  }, [user?.id, friendId]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Realtime
  useEffect(() => {
    if (!user?.id || !friendId) return;
    const channel = supabase
      .channel(`v3-chat-${friendId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as Message;
          if (
            (m.sender_id === friendId && m.receiver_id === user.id) ||
            (m.sender_id === user.id && m.receiver_id === friendId)
          ) {
            setMessages((prev) => [...prev, m]);
            if (m.receiver_id === user.id) {
              supabase.from("messages").update({ read: true }).eq("id", m.id).then();
            }
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, friendId]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !friendId || sending) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: friendId,
      content: newMessage.trim(),
    });
    if (!error) setNewMessage("");
    setSending(false);
  };

  return (
    <div className="max-w-[820px] mx-auto px-0 lg:px-10 lg:py-6 animate-v3-fade-in">
      <div className="lg:rounded-v3-2xl lg:border lg:border-v3-border lg:bg-v3-surface lg:overflow-hidden flex flex-col h-[calc(100vh-7rem)] lg:h-[calc(100vh-8rem)]">
        {/* Header */}
        <header className="flex items-center gap-3 p-4 border-b border-v3-border bg-v3-surface">
          <button
            type="button"
            onClick={() => navigate("/v3/chat")}
            aria-label="Tillbaka"
            className="v3-tappable p-2 rounded-v3-sm text-v3-text-tertiary hover:bg-v3-canvas hover:text-v3-text-primary"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <UserAvatar
            name={friendProfile?.display_name ?? null}
            url={friendProfile?.avatar_url ?? null}
          />
          <div className="min-w-0 flex-1">
            <p className="text-v3-body font-medium text-v3-text-primary truncate">
              {friendProfile?.display_name ?? "Utan namn"}
            </p>
            <p className="text-v3-micro text-v3-text-tertiary">Online via realtime</p>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-v3-canvas">
          {messages.length === 0 ? (
            <p className="text-v3-small text-v3-text-tertiary text-center py-12">
              Inga meddelanden än. Skriv något!
            </p>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[78%] rounded-v3-xl px-3.5 py-2 ${
                      mine
                        ? "bg-v3-text-primary text-v3-canvas"
                        : "bg-v3-surface border border-v3-border text-v3-text-primary"
                    }`}
                  >
                    {m.content && (
                      <p className="text-v3-body whitespace-pre-wrap break-words">
                        {m.content}
                      </p>
                    )}
                    {m.shared_type && (
                      <SharedItemPreview type={m.shared_type} data={m.shared_data} />
                    )}
                    <p
                      className={`text-v3-micro mt-1 ${
                        mine ? "text-v3-canvas/60" : "text-v3-text-tertiary"
                      }`}
                    >
                      {new Date(m.created_at).toLocaleTimeString("sv-SE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-v3-border bg-v3-surface flex gap-2">
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Skriv ett meddelande…"
            className="flex-1 h-11 px-4 rounded-v3-base border border-v3-border bg-v3-canvas text-v3-body text-v3-text-primary placeholder:text-v3-text-tertiary v3-focus-ring"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            aria-label="Skicka"
            className="v3-tappable inline-flex items-center justify-center w-11 h-11 rounded-v3-base bg-v3-text-primary text-v3-canvas disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
