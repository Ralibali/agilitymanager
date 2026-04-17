import { useCallback, useEffect, useState } from "react";
import { Building2, MapPin, Users, Plus, Search, Crown } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

export default function ClubsPage() {
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

  if (loading) return <PageSkeleton />;

  const adminClubs = myClubs.filter((c) =>
    memberships.find((m) => m.club_id === c.id && m.role === "admin"),
  );

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Gemenskap"
        title="Klubbar"
        subtitle="Anslut dig till lokala agility- och hoopersklubbar – eller starta en egen."
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <DSButton variant="primary">
                <Plus className="w-4 h-4" /> Ny klubb
              </DSButton>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Skapa klubb</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <DSInput
                  placeholder="Klubbnamn"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <DSInput
                  placeholder="Stad"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                />
                <Textarea
                  placeholder="Beskrivning"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="min-h-[80px]"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <DSButton variant="ghost" onClick={() => setCreateOpen(false)}>
                    Avbryt
                  </DSButton>
                  <DSButton onClick={handleCreate}>Skapa</DSButton>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Mina klubbar" value={myClubs.length} hint="aktiva medlemskap" />
        <MetricCard label="Som admin" value={adminClubs.length} hint="du leder" />
        <MetricCard label="Sök träffar" value={searchResults.length} hint="i sökresultatet" />
        <MetricCard label="Status" value="Synk" hint="realtime" />
      </div>

      <SegmentedControl<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: "mine", label: `Mina (${myClubs.length})` },
          { value: "discover", label: "Upptäck" },
        ]}
      />

      {tab === "mine" && (
        myClubs.length === 0 ? (
          <DSCard>
            <DSEmptyState
              icon={Building2}
              title="Inga klubbar än"
              description="Sök efter en klubb i din stad eller skapa din egen."
              actions={
                <DSButton variant="secondary" onClick={() => setTab("discover")}>
                  Hitta klubb
                </DSButton>
              }
            />
          </DSCard>
        ) : (
          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {myClubs.map((c) => {
              const role = memberships.find((m) => m.club_id === c.id)?.role;
              return <ClubCard key={c.id} club={c} role={role} onOpen={() => window.location.assign(`/clubs?club=${c.id}`)} />;
            })}
          </ul>
        )
      )}

      {tab === "discover" && (
        <div className="space-y-4">
          <DSCard>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <DSInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Sök på klubbnamn eller stad"
                className="pl-9"
              />
            </div>
          </DSCard>

          {search.length < 2 ? (
            <DSCard>
              <DSEmptyState
                icon={Search}
                title="Hitta klubbar"
                description="Skriv minst två tecken för att söka bland alla klubbar."
              />
            </DSCard>
          ) : searchResults.length === 0 ? (
            <DSCard>
              <DSEmptyState
                icon={Building2}
                title="Inga klubbar matchade"
                description={`Vi hittade ingen klubb som matchar "${search}".`}
              />
            </DSCard>
          ) : (
            <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {searchResults.map((c) => {
                const isMember = memberships.some((m) => m.club_id === c.id);
                return (
                  <ClubCard
                    key={c.id}
                    club={c}
                    role={isMember ? memberships.find((m) => m.club_id === c.id)?.role : undefined}
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

function ClubCard({
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
      <article className="flex items-start gap-3 p-4 rounded-ds-md border-[0.5px] border-border-subtle/30 bg-surface hover:border-border-default transition-colors">
        <div className="h-12 w-12 rounded-ds-md bg-brand-100 text-brand-900 flex items-center justify-center shrink-0 overflow-hidden">
          {club.logo_url ? (
            <img src={club.logo_url} alt={club.name} className="h-full w-full object-cover" />
          ) : (
            <Building2 className="w-5 h-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-body font-medium text-text-primary truncate">{club.name}</h3>
            {role === "admin" && (
              <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded-ds-sm text-micro font-medium bg-amber-50 text-amber-900">
                <Crown className="w-3 h-3" /> Admin
              </span>
            )}
          </div>
          {(club.city || club.description) && (
            <p className="text-small text-text-secondary line-clamp-2 mt-0.5">
              {club.city && (
                <span className="inline-flex items-center gap-0.5 text-text-tertiary mr-1.5">
                  <MapPin className="w-3 h-3" /> {club.city}
                </span>
              )}
              {club.description}
            </p>
          )}
          <div className="flex items-center justify-end gap-2 mt-3">
            {onOpen && (
              <DSButton size="sm" variant="ghost" onClick={onOpen}>
                Öppna
              </DSButton>
            )}
            {onAction && (
              <DSButton size="sm" variant="secondary" disabled={actionDisabled} onClick={onAction}>
                <Users className="w-3.5 h-3.5" /> {actionLabel ?? "Anslut"}
              </DSButton>
            )}
          </div>
        </div>
      </article>
    </li>
  );
}
