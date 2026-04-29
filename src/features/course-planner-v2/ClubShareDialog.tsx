/**
 * Sprint 5 — Klubbdelning + publik länk-dialog för Banplaneraren v2.
 */
import { useEffect, useState } from "react";
import { X, Users, Link2, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchMyClubs, fetchCourseClubShares, shareCourseToClub, unshareCourseFromClub,
  enablePublicLink, disablePublicLink,
} from "@/features/course-planner-v2/library";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courseId: string | null;
  courseName: string;
}

export default function ClubShareDialog({ open, onOpenChange, courseId, courseName }: Props) {
  const { user } = useAuth();
  const [clubs, setClubs] = useState<{ id: string; name: string }[]>([]);
  const [shared, setShared] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [publicSlug, setPublicSlug] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !user || !courseId) return;
    setLoading(true);
    Promise.all([fetchMyClubs(user.id), fetchCourseClubShares(courseId)])
      .then(([cls, sh]) => { setClubs(cls); setShared(new Set(sh.map((s) => s.id))); })
      .catch((e) => { console.error(e); toast.error("Kunde inte ladda klubbar"); })
      .finally(() => setLoading(false));
  }, [open, user, courseId]);

  async function toggleClub(clubId: string) {
    if (!courseId || !user) return;
    setWorking(true);
    try {
      if (shared.has(clubId)) {
        await unshareCourseFromClub(courseId, clubId);
        setShared((s) => { const n = new Set(s); n.delete(clubId); return n; });
        toast.success("Slutade dela med klubben");
      } else {
        await shareCourseToClub(courseId, clubId, user.id);
        setShared((s) => new Set(s).add(clubId));
        toast.success("Delad med klubben");
      }
    } catch (e: any) {
      console.error(e); toast.error(e?.message ?? "Kunde inte uppdatera delning");
    } finally { setWorking(false); }
  }

  async function togglePublic() {
    if (!courseId) return;
    setWorking(true);
    try {
      if (publicSlug) {
        await disablePublicLink(courseId);
        setPublicSlug(null);
        toast.success("Publik länk avstängd");
      } else {
        const slug = await enablePublicLink(courseId);
        setPublicSlug(slug);
        toast.success("Publik länk skapad");
      }
    } catch (e) { console.error(e); toast.error("Kunde inte uppdatera länken"); }
    finally { setWorking(false); }
  }

  function publicUrl() {
    if (!publicSlug) return "";
    return `${window.location.origin}/v3/course-planner-v2/judge/${publicSlug}`;
  }

  async function copy() {
    try { await navigator.clipboard.writeText(publicUrl()); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { toast.error("Kunde inte kopiera"); }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 grid place-items-center p-4" onClick={() => onOpenChange(false)}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white rounded-2xl shadow-xl">
        <header className="flex items-center justify-between px-5 py-4 border-b border-black/5">
          <h2 className="text-base font-semibold">Dela "{courseName}"</h2>
          <button onClick={() => onOpenChange(false)} className="h-8 w-8 grid place-items-center rounded-full hover:bg-neutral-100"><X size={16} /></button>
        </header>
        <div className="p-4 space-y-5">
          <section>
            <div className="flex items-center gap-2 mb-2"><Link2 size={14} className="text-[#1a6b3c]" /><h3 className="text-[12px] uppercase tracking-wide font-semibold text-neutral-600">Domarlänk</h3></div>
            <p className="text-[12px] text-neutral-500 mb-2">Skapa en publik länk som domare kan öppna utan inlogg.</p>
            <button onClick={togglePublic} disabled={working || !courseId}
              className={`w-full h-9 rounded-lg text-[12px] font-semibold transition ${
                publicSlug ? "bg-[#c85d1e] text-white" : "bg-[#1a6b3c] text-white"
              } disabled:opacity-50`}>
              {working ? "Arbetar..." : publicSlug ? "Stäng publik länk" : "Skapa publik länk"}
            </button>
            {publicSlug && (
              <div className="mt-2 flex items-center gap-1.5 p-2 bg-neutral-50 rounded-lg border border-black/5">
                <code className="flex-1 text-[11px] truncate text-neutral-700">{publicUrl()}</code>
                <button onClick={copy} className="h-7 w-7 grid place-items-center rounded-md hover:bg-white">{copied ? <Check size={14} className="text-[#1a6b3c]" /> : <Copy size={14} />}</button>
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center gap-2 mb-2"><Users size={14} className="text-[#1a6b3c]" /><h3 className="text-[12px] uppercase tracking-wide font-semibold text-neutral-600">Dela med klubb</h3></div>
            {loading ? <div className="grid place-items-center p-4 text-neutral-500"><Loader2 className="animate-spin" /></div>
            : clubs.length === 0 ? <p className="text-[12px] text-neutral-500">Du är inte medlem i någon klubb än.</p>
            : <div className="grid gap-1.5">
                {clubs.map((c) => {
                  const on = shared.has(c.id);
                  return (
                    <button key={c.id} onClick={() => toggleClub(c.id)} disabled={working}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-[13px] transition ${
                        on ? "bg-[#1a6b3c]/10 border-[#1a6b3c]/40 text-[#1a6b3c]" : "bg-white border-black/8 hover:border-neutral-400"
                      } disabled:opacity-50`}>
                      <span className="font-medium">{c.name}</span>
                      <span className="text-[10px] font-semibold uppercase">{on ? "Delad" : "Dela"}</span>
                    </button>
                  );
                })}
              </div>}
          </section>
        </div>
      </div>
    </div>
  );
}
