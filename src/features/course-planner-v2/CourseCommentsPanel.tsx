/**
 * Sprint 5 — Kommentarer på en bana.
 * Funkar både inloggad (där man kan posta) och anonymt (read-only via publik länk).
 */
import { useEffect, useState } from "react";
import { MessageSquare, Send, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { fetchComments, addComment, deleteComment, type CourseComment } from "@/features/course-planner-v2/library";

interface Props {
  courseId: string | null;
  /** När false visas inget alls. Skicka in cloudId för att aktivera. */
  enabled: boolean;
}

export default function CourseCommentsPanel({ courseId, enabled }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<CourseComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  async function refresh() {
    if (!courseId) return;
    setLoading(true);
    try { setItems(await fetchComments(courseId)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (enabled) refresh(); /* eslint-disable-next-line */ }, [courseId, enabled]);

  async function submit() {
    if (!user || !courseId) { toast.error("Logga in för att kommentera"); return; }
    if (!text.trim()) return;
    setPosting(true);
    try {
      await addComment(courseId, user.id, text);
      setText("");
      await refresh();
    } catch (e: any) {
      console.error(e); toast.error(e?.message ?? "Kunde inte spara kommentar");
    } finally { setPosting(false); }
  }

  async function remove(id: string) {
    if (!confirm("Ta bort kommentaren?")) return;
    try { await deleteComment(id); setItems((xs) => xs.filter((x) => x.id !== id)); } catch { toast.error("Kunde inte ta bort"); }
  }

  if (!enabled || !courseId) return null;
  return (
    <section className="rounded-2xl bg-white border border-black/6 p-3">
      <h3 className="text-[10px] uppercase tracking-[0.1em] font-semibold text-neutral-500 mb-2 inline-flex items-center gap-1.5">
        <MessageSquare size={12} /> Kommentarer {items.length > 0 && <span className="text-neutral-400">· {items.length}</span>}
      </h3>
      {user && (
        <div className="flex items-start gap-1.5 mb-3">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={2000}
            placeholder="Skriv en kommentar..."
            className="flex-1 text-[12px] rounded-lg border border-black/10 px-2 py-1.5 outline-none focus:ring-2 focus:ring-[#1a6b3c]/25 resize-none" />
          <button onClick={submit} disabled={posting || !text.trim()}
            className="h-8 w-8 grid place-items-center rounded-lg bg-[#1a6b3c] text-white disabled:opacity-40">
            {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      )}
      {loading ? <div className="grid place-items-center p-3 text-neutral-400"><Loader2 size={14} className="animate-spin" /></div>
      : items.length === 0 ? <p className="text-[11px] text-neutral-400 text-center py-2">Inga kommentarer ännu.</p>
      : <ul className="space-y-2 max-h-64 overflow-y-auto">
          {items.map((c) => (
            <li key={c.id} className="text-[12px] bg-neutral-50 rounded-lg px-2.5 py-2">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="font-semibold text-neutral-800 truncate">{c.author_name ?? "Okänd"}</span>
                <span className="text-[10px] text-neutral-400">{new Date(c.created_at).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" })}</span>
                {user?.id === c.user_id && (
                  <button onClick={() => remove(c.id)} className="text-neutral-400 hover:text-red-600"><Trash2 size={11} /></button>
                )}
              </div>
              <p className="text-neutral-700 whitespace-pre-wrap break-words">{c.content}</p>
            </li>
          ))}
        </ul>}
    </section>
  );
}
