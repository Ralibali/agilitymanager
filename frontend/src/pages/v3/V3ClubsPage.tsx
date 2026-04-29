import { useCallback, useEffect, useState } from "react";
import { Building2, MapPin, Users, Plus, Search, Crown, ArrowLeft, Copy } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { V3Page, V3PageHero, V3PrimaryButton } from "@/components/v3/V3Page";

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

interface MemberRow { club_id: string; role: string; }
type Tab = "mine" | "discover";

function getClubFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("club");
}

export default function V3ClubsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("mine");
  const [loading, setLoading] = useState(true);
  const [myClubs, setMyClubs] = useState<Club[]>([]);
  const [memberships, setMemberships] = useState<MemberRow[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(() => getClubFromUrl());
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Club[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCity, setNewCity] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: mems } = await supabase.from("club_members").select("club_id, role").eq("user_id", user.id).eq("status", "accepted");
    const memList = (mems ?? []) as MemberRow[];
    setMemberships(memList);
    if (memList.length > 0) {
      const ids = memList.map((m) => m.club_id);
      const { data: clubs } = await supabase.from("clubs").select("*").in("id", ids);
      setMyClubs((clubs ?? []) as Club[]);
    } else setMyClubs([]);
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (search.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from("clubs").select("*").or(`name.ilike.%${search}%,city.ilike.%${search}%`).limit(20);
      setSearchResults((data ?? []) as Club[]);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const openClub = (id: string) => {
    setSelectedClubId(id);
    window.history.replaceState(null, "", `/v3/clubs?club=${id}`);
  };

  const closeClub = () => {
    setSelectedClubId(null);
    window.history.replaceState(null, "", "/v3/clubs");
  };

  const handleCreate = async () => {
    if (!newName.trim() || !user) { toast.error("Ange ett klubbnamn"); return; }
    const { data: club, error } = await supabase.from("clubs").insert({ name: newName.trim(), description: newDesc.trim(), city: newCity.trim(), created_by: user.id }).select().single();
    if (error || !club) { toast.error("Kunde inte skapa klubben"); return; }
    await supabase.from("club_members").insert({ club_id: club.id, user_id: user.id, role: "admin", status: "accepted" });
    toast.success("Klubb skapad");
    setCreateOpen(false); setNewName(""); setNewDesc(""); setNewCity("");
    await load();
    openClub(club.id);
  };

  const handleJoin = async (club: Club) => {
    if (!user) return;
    const existing = memberships.find((m) => m.club_id === club.id);
    if (existing) { toast.info("Du är redan medlem"); return; }
    const { error } = await supabase.from("club_members").insert({ club_id: club.id, user_id: user.id, role: "member", status: "pending" });
    if (error) toast.error("Kunde inte skicka ansökan"); else toast.success("Medlemsansökan skickad");
  };

  const adminClubs = myClubs.filter((c) => memberships.find((m) => m.club_id === c.id && m.role === "admin"));
  const selectedClub = selectedClubId ? myClubs.find((c) => c.id === selectedClubId) ?? searchResults.find((c) => c.id === selectedClubId) ?? null : null;

  if (selectedClub) return <ClubDetail club={selectedClub} role={memberships.find((m) => m.club_id === selectedClub.id)?.role} onBack={closeClub} />;

  return (
    <V3Page>
      <V3PageHero eyebrow="Gemenskap" title="Klubbar" description="Anslut dig till lokala agility- och hoopersklubbar – eller starta en egen." icon={Building2}>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><V3PrimaryButton icon={Plus}>Ny klubb</V3PrimaryButton></DialogTrigger>
          <DialogContent className="bg-v3-canvas-elevated border-v3-canvas-sunken/40">
            <DialogHeader><DialogTitle className="font-v3-display text-v3-text-primary">Skapa klubb</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <input placeholder="Klubbnamn" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full h-11 px-4 rounded-v3-base border border-v3-canvas-sunken/60 bg-v3-canvas text-v3-sm text-v3-text-primary placeholder:text-v3-text-tertiary v3-focus-ring" />
              <input placeholder="Stad" value={newCity} onChange={(e) => setNewCity(e.target.value)} className="w-full h-11 px-4 rounded-v3-base border border-v3-canvas-sunken/60 bg-v3-canvas text-v3-sm text-v3-text-primary placeholder:text-v3-text-tertiary v3-focus-ring" />
              <Textarea placeholder="Beskrivning" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="min-h-[80px] rounded-v3-base border-v3-canvas-sunken/60 bg-v3-canvas text-v3-text-primary" />
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setCreateOpen(false)} className="px-4 h-10 rounded-v3-base text-v3-text-secondary hover:bg-v3-canvas">Avbryt</button><button type="button" onClick={handleCreate} className="px-4 h-10 rounded-v3-base bg-v3-text-primary text-v3-canvas font-medium">Skapa</button></div>
            </div>
          </DialogContent>
        </Dialog>
      </V3PageHero>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3"><V3Stat label="Mina klubbar" value={myClubs.length} hint="aktiva medlemskap" /><V3Stat label="Som admin" value={adminClubs.length} hint="du leder" /><V3Stat label="Sökträffar" value={searchResults.length} hint="i sökresultatet" /><V3Stat label="Status" value="Synk" hint="realtime" /></section>

      <div className="flex gap-1 p-1 rounded-v3-base bg-v3-canvas-elevated border border-v3-canvas-sunken/40 w-fit">{[{ value: "mine" as const, label: `Mina (${myClubs.length})` }, { value: "discover" as const, label: "Upptäck" }].map((opt) => <button key={opt.value} type="button" onClick={() => setTab(opt.value)} className={`px-4 h-9 rounded-v3-sm text-v3-sm font-medium transition-colors v3-focus-ring ${tab === opt.value ? "bg-v3-canvas text-v3-text-primary shadow-sm" : "text-v3-text-tertiary hover:text-v3-text-secondary"}`}>{opt.label}</button>)}</div>

      {loading ? <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="v3-skeleton h-[120px] rounded-v3-xl" />)}</div> : tab === "mine" ? myClubs.length === 0 ? <V3Empty icon={Building2} title="Inga klubbar än" description="Sök efter en klubb i din stad eller skapa din egen." action={<button type="button" onClick={() => setTab("discover")} className="inline-flex items-center gap-2 px-4 h-10 rounded-v3-base bg-v3-text-primary text-v3-canvas text-v3-sm font-medium"><Search className="w-4 h-4" /> Hitta klubb</button>} /> : <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3 v3-stagger">{myClubs.map((c) => <V3ClubCard key={c.id} club={c} role={memberships.find((m) => m.club_id === c.id)?.role} onOpen={() => openClub(c.id)} />)}</ul> : <div className="space-y-4"><div className="relative"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-v3-text-tertiary" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Sök på klubbnamn eller stad" className="w-full pl-10 pr-4 h-12 rounded-v3-base border border-v3-canvas-sunken/40 bg-v3-canvas-elevated text-v3-sm text-v3-text-primary placeholder:text-v3-text-tertiary v3-focus-ring" /></div>{search.length < 2 ? <V3Empty icon={Search} title="Hitta klubbar" description="Skriv minst två tecken för att söka bland alla klubbar." /> : searchResults.length === 0 ? <V3Empty icon={Building2} title="Inga klubbar matchade" description={`Vi hittade ingen klubb som matchar "${search}".`} /> : <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3 v3-stagger">{searchResults.map((c) => { const isMember = memberships.some((m) => m.club_id === c.id); return <V3ClubCard key={c.id} club={c} role={isMember ? memberships.find((m) => m.club_id === c.id)?.role : undefined} actionLabel={isMember ? "Medlem" : "Ansök"} actionDisabled={isMember} onAction={() => handleJoin(c)} onOpen={() => openClub(c.id)} />; })}</ul>}</div>}
    </V3Page>
  );
}

function ClubDetail({ club, role, onBack }: { club: Club; role?: string; onBack: () => void }) {
  const copyInvite = async () => {
    const url = `${window.location.origin}/club-invite/${club.invite_code}`;
    await navigator.clipboard?.writeText(url);
    toast.success("Inbjudningslänk kopierad");
  };
  return (
    <V3Page>
      <button type="button" onClick={onBack} className="inline-flex items-center gap-2 h-10 px-3 rounded-v3-base bg-v3-canvas-elevated border border-v3-canvas-sunken/40 text-v3-sm text-v3-text-secondary hover:text-v3-text-primary"><ArrowLeft size={16} /> Tillbaka till klubbar</button>
      <section className="rounded-[28px] bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-6 lg:p-8 shadow-v3-xs">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-v3-2xl bg-v3-canvas grid place-items-center overflow-hidden shrink-0">{club.logo_url ? <img src={club.logo_url} alt={club.name} className="h-full w-full object-cover" /> : <Building2 className="w-7 h-7 text-v3-text-tertiary" />}</div>
          <div className="min-w-0 flex-1"><div className="text-[10px] tracking-[0.04em] font-medium text-v3-text-tertiary">Klubb</div><h1 className="font-v3-display text-[34px] lg:text-[48px] leading-tight text-v3-text-primary mt-1">{club.name}</h1>{club.city && <p className="inline-flex items-center gap-1 text-v3-sm text-v3-text-secondary mt-2"><MapPin size={14} /> {club.city}</p>}</div>
          {role === "admin" && <span className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full bg-v3-brand-500/10 text-v3-brand-700 text-v3-xs font-medium"><Crown className="w-3.5 h-3.5" /> Admin</span>}
        </div>
        {club.description && <p className="text-v3-base text-v3-text-secondary mt-5 max-w-3xl">{club.description}</p>}
      </section>
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3"><V3Stat label="Din roll" value={role ?? "Gäst"} hint="medlemskap" /><V3Stat label="Stad" value={club.city || "—"} hint="klubbens ort" /><V3Stat label="Inbjudan" value={club.invite_code ? "Aktiv" : "—"} hint="delbar länk" /></section>
      <section className="rounded-v3-2xl bg-v3-canvas-elevated border border-v3-canvas-sunken/40 p-5 shadow-v3-xs"><h2 className="font-v3-display text-v3-2xl text-v3-text-primary">Klubböversikt</h2><p className="text-v3-sm text-v3-text-secondary mt-1">Här visas klubbens information. Medlemslista, inlägg och aktiviteter kan byggas vidare här utan att skicka användaren till en trasig gammal route.</p>{club.invite_code && <button type="button" onClick={copyInvite} className="mt-4 inline-flex items-center gap-2 h-10 px-4 rounded-v3-base bg-v3-brand-500 text-white text-v3-sm font-medium hover:bg-v3-brand-600"><Copy size={15} /> Kopiera inbjudningslänk</button>}</section>
    </V3Page>
  );
}

function V3Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) { return <div className="p-4 rounded-v3-xl border border-v3-canvas-sunken/40 bg-v3-canvas-elevated"><p className="text-[10px] tracking-[0.04em] text-v3-text-tertiary font-medium">{label}</p><p className="text-2xl font-v3-display text-v3-text-primary mt-1 truncate">{value}</p>{hint && <p className="text-v3-xs text-v3-text-tertiary mt-0.5">{hint}</p>}</div>; }

function V3ClubCard({ club, role, actionLabel, actionDisabled, onAction, onOpen }: { club: Club; role?: string; actionLabel?: string; actionDisabled?: boolean; onAction?: () => void; onOpen?: () => void }) {
  return <li><article className="flex items-start gap-3 p-4 rounded-v3-xl border border-v3-canvas-sunken/40 bg-v3-canvas-elevated hover:border-v3-brand-500/30 transition-colors"><div className="h-12 w-12 rounded-v3-base bg-v3-canvas text-v3-text-secondary flex items-center justify-center shrink-0 overflow-hidden">{club.logo_url ? <img src={club.logo_url} alt={club.name} className="h-full w-full object-cover" /> : <Building2 className="w-5 h-5" />}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2 flex-wrap"><h3 className="text-v3-sm font-medium text-v3-text-primary truncate">{club.name}</h3>{role === "admin" && <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded-v3-sm text-[10px] font-medium bg-v3-canvas text-v3-text-primary"><Crown className="w-3 h-3" /> Admin</span>}</div>{(club.city || club.description) && <p className="text-v3-xs text-v3-text-secondary line-clamp-2 mt-1">{club.city && <span className="inline-flex items-center gap-0.5 text-v3-text-tertiary mr-1.5"><MapPin className="w-3 h-3" /> {club.city}</span>}{club.description}</p>}<div className="flex items-center justify-end gap-2 mt-3">{onOpen && <button type="button" onClick={onOpen} className="px-3 h-9 rounded-v3-base text-v3-text-secondary hover:bg-v3-canvas text-v3-xs font-medium">Öppna</button>}{onAction && <button type="button" disabled={actionDisabled} onClick={onAction} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-v3-base border border-v3-canvas-sunken/40 bg-v3-canvas text-v3-text-primary text-v3-xs font-medium disabled:opacity-40"><Users className="w-3.5 h-3.5" /> {actionLabel ?? "Anslut"}</button>}</div></div></article></li>;
}

function V3Empty({ icon: Icon, title, description, action }: { icon: typeof Building2; title: string; description?: string; action?: React.ReactNode }) { return <div className="p-10 rounded-v3-2xl border border-v3-canvas-sunken/40 bg-v3-canvas-elevated text-center"><div className="inline-flex items-center justify-center w-12 h-12 rounded-v3-base bg-v3-canvas text-v3-text-tertiary mx-auto mb-3"><Icon className="w-5 h-5" /></div><h3 className="text-v3-xl font-v3-display text-v3-text-primary">{title}</h3>{description && <p className="text-v3-sm text-v3-text-secondary mt-2 max-w-md mx-auto">{description}</p>}{action && <div className="mt-5 flex justify-center">{action}</div>}</div>; }
