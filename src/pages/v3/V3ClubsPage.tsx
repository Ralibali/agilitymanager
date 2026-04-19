import { useCallback, useEffect, useState } from "react";
import { Building2, MapPin, Users, Plus, Search, Crown } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Club {
  id: string;
  name: string;
  description: string;
  city: string;
  logo_url: string | null;
  invite_code: string;
  created_by: string;
  created_at: string;
  quick_tags: string[];
}

interface MemberRow {
  club_id: string;
  role: string;
}

type Tab = "mine" | "discover";

export default function V3ClubsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("mine");
  const [loading, setLoading] = useState(true);
  const [myClubs, setMyClubs] = useState<Club[]>([]);
  const [memberships, setMemberships] = useState<MemberRow[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Club[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCity, setNewCity] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: mems } = await supabase
      .from("club_members")
      .select("club_id, role")
      .eq("user_id", user.id)
      .eq("status", "accepted");
    const memList = (mems ?? []) as MemberRow[];
    setMemberships(memList);
    if (memList.length > 0) {
      const ids = memList.map((m) => m.club_id);
      const { data: clubs } = await supabase.from("clubs").select("*").in("id", ids);
      setMyClubs((clubs ?? []) as Club[]);
    } else {
      setMyClubs([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  // Debounced search
  useEffect(() => {
    if (search.length < 2) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("clubs")
        .select("*")
        .or(`name.ilike.%${search}%,city.ilike.%${search}%`)
        .limit(20);
      setSearchResults((data ?? []) as Club[]);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleCreate = async () => {
    if (!newName.trim() || !user) {
      toast.error("Ange ett klubbnamn");
      return;
    }
    const { data: club, error } = await supabase
      .from("clubs")
      .insert({
        name: newName.trim(),
        description: newDesc.trim(),
        city: newCity.trim(),
        created_by: user.id,
      })
      .select()
      .single();
    if (error || !club) {
      toast.error("Kunde inte skapa klubben");
      return;
    }
    await supabase.from("club_members").insert({
      club_id: club.id,
      user_id: user.id,
      role: "admin",
      status: "accepted",
    });
    toast.success("Klubb skapad");
    setCreateOpen(false);
    setNewName("");
    setNewDesc("");
    setNewCity("");
    load();
  };

  const handleJoin = async (club: Club) => {
    if (!user) return;
    const existing = memberships.find((m) => m.club_id === club.id);
    if (existing) {
      toast.info("Du är redan medlem");
      return;
    }
    const { error } = await supabase.from("club_members").insert({
      club_id: club.id,
      user_id: user.id,
      role: "member",
      status: "pending",
    });
    if (error) toast.error("Kunde inte skicka ansökan");
    else toast.success("Medlemsansökan skickad");
  };

  const adminClubs = myClubs.filter((c) =>
    memberships.find((m) => m.club_id === c.id && m.role === "admin"),
  );

  return (
    <div className="max-w-[1100px] mx-auto px-5 lg:px-10 py-6 lg:py-10 space-y-8 animate-v3-fade-in">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-v3-eyebrow uppercase tracking-[0.18em] text-v3-text-tertiary mb-2">
            Gemenskap
          </p>
          <h1 className="text-v3-display text-v3-text-primary font-v3-display leading-tight">
            Klubbar
          </h1>
          <p className="text-v3-body text-v3-text-secondary mt-2 max-w-xl">
            Anslut dig till lokala agility- och hoopersklubbar – eller starta en egen.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="v3-tappable inline-flex items-center gap-2 px-4 h-11 rounded-v3-base bg-v3-text-primary text-v3-canvas text-v3-body font-medium"
            >
              <Plus className="w-4 h-4" /> Ny klubb
            </button>
          </DialogTrigger>
          <DialogContent className="bg-v3-surface border-v3-border">
            <DialogHeader>
              <DialogTitle className="font-v3-display text-v3-text-primary">
                Skapa klubb
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <input
                placeholder="Klubbnamn"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full h-11 px-4 rounded-v3-base border border-v3-border bg-v3-canvas text-v3-body text-v3-text-primary placeholder:text-v3-text-tertiary v3-focus-ring"
              />
              <input
                placeholder="Stad"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                className="w-full h-11 px-4 rounded-v3-base border border-v3-border bg-v3-canvas text-v3-body text-v3-text-primary placeholder:text-v3-text-tertiary v3-focus-ring"
              />
              <Textarea
                placeholder="Beskrivning"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="min-h-[80px] rounded-v3-base border-v3-border bg-v3-canvas text-v3-text-primary"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="v3-tappable px-4 h-10 rounded-v3-base text-v3-text-secondary hover:bg-v3-canvas"
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  className="v3-tappable px-4 h-10 rounded-v3-base bg-v3-text-primary text-v3-canvas font-medium"
                >
                  Skapa
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <V3Stat label="Mina klubbar" value={myClubs.length} hint="aktiva medlemskap" />
        <V3Stat label="Som admin" value={adminClubs.length} hint="du leder" />
        <V3Stat label="Sökträffar" value={searchResults.length} hint="i sökresultatet" />
        <V3Stat label="Status" value="Synk" hint="realtime" />
      </section>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-v3-base bg-v3-surface border border-v3-border w-fit">
        {[
          { value: "mine" as const, label: `Mina (${myClubs.length})` },
          { value: "discover" as const, label: "Upptäck" },
        ].map((opt) => (
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="v3-skeleton h-[120px] rounded-v3-xl" />
          ))}
        </div>
      ) : tab === "mine" ? (
        myClubs.length === 0 ? (
          <V3Empty
            icon={Building2}
            title="Inga klubbar än"
            description="Sök efter en klubb i din stad eller skapa din egen."
            action={
              <button
                type="button"
                onClick={() => setTab("discover")}
                className="v3-tappable inline-flex items-center gap-2 px-4 h-10 rounded-v3-base bg-v3-text-primary text-v3-canvas text-v3-body font-medium"
              >
                <Search className="w-4 h-4" /> Hitta klubb
              </button>
            }
          />
        ) : (
          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3 v3-stagger">
            {myClubs.map((c) => {
              const role = memberships.find((m) => m.club_id === c.id)?.role;
              return (
                <V3ClubCard
                  key={c.id}
                  club={c}
                  role={role}
                  onOpen={() =>
                    window.location.assign(`/app/clubs?club=${c.id}`)
                  }
                />
              );
            })}
          </ul>
        )
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-v3-text-tertiary" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sök på klubbnamn eller stad"
              className="w-full pl-10 pr-4 h-12 rounded-v3-base border border-v3-border bg-v3-surface text-v3-body text-v3-text-primary placeholder:text-v3-text-tertiary v3-focus-ring"
            />
          </div>

          {search.length < 2 ? (
            <V3Empty
              icon={Search}
              title="Hitta klubbar"
              description="Skriv minst två tecken för att söka bland alla klubbar."
            />
          ) : searchResults.length === 0 ? (
            <V3Empty
              icon={Building2}
              title="Inga klubbar matchade"
              description={`Vi hittade ingen klubb som matchar "${search}".`}
            />
          ) : (
            <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3 v3-stagger">
              {searchResults.map((c) => {
                const isMember = memberships.some((m) => m.club_id === c.id);
                return (
                  <V3ClubCard
                    key={c.id}
                    club={c}
                    role={
                      isMember
                        ? memberships.find((m) => m.club_id === c.id)?.role
                        : undefined
                    }
                    actionLabel={isMember ? "Medlem" : "Ansök"}
                    actionDisabled={isMember}
                    onAction={() => handleJoin(c)}
                  />
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

function V3ClubCard({
  club,
  role,
  actionLabel,
  actionDisabled,
  onAction,
  onOpen,
}: {
  club: Club;
  role?: string;
  actionLabel?: string;
  actionDisabled?: boolean;
  onAction?: () => void;
  onOpen?: () => void;
}) {
  return (
    <li>
      <article className="flex items-start gap-3 p-4 rounded-v3-xl border border-v3-border bg-v3-surface hover:border-v3-border-strong transition-colors">
        <div className="h-12 w-12 rounded-v3-base bg-v3-canvas text-v3-text-secondary flex items-center justify-center shrink-0 overflow-hidden">
          {club.logo_url ? (
            <img
              src={club.logo_url}
              alt={club.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <Building2 className="w-5 h-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-v3-body font-medium text-v3-text-primary truncate">
              {club.name}
            </h3>
            {role === "admin" && (
              <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded-v3-sm text-v3-micro font-medium bg-v3-canvas text-v3-text-primary">
                <Crown className="w-3 h-3" /> Admin
              </span>
            )}
          </div>
          {(club.city || club.description) && (
            <p className="text-v3-small text-v3-text-secondary line-clamp-2 mt-1">
              {club.city && (
                <span className="inline-flex items-center gap-0.5 text-v3-text-tertiary mr-1.5">
                  <MapPin className="w-3 h-3" /> {club.city}
                </span>
              )}
              {club.description}
            </p>
          )}
          <div className="flex items-center justify-end gap-2 mt-3">
            {onOpen && (
              <button
                type="button"
                onClick={onOpen}
                className="v3-tappable px-3 h-9 rounded-v3-base text-v3-text-secondary hover:bg-v3-canvas text-v3-small font-medium"
              >
                Öppna
              </button>
            )}
            {onAction && (
              <button
                type="button"
                disabled={actionDisabled}
                onClick={onAction}
                className="v3-tappable inline-flex items-center gap-1.5 px-3 h-9 rounded-v3-base border border-v3-border bg-v3-canvas text-v3-text-primary text-v3-small font-medium disabled:opacity-40"
              >
                <Users className="w-3.5 h-3.5" /> {actionLabel ?? "Anslut"}
              </button>
            )}
          </div>
        </div>
      </article>
    </li>
  );
}

function V3Empty({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Building2;
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
