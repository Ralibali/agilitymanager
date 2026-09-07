import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { Seo } from "@/components/Seo";
import {
  appendHistory,
  learner,
  learnerSchema,
  submissionSchema,
  safeVideo,
  type Learner,
  type Assignment,
  type Submission,
} from "@/features/coaching/coaching";
import { TrainingHistory } from "@/features/coaching/TrainingHistory";
import { useAction } from "@/features/coaching/useAction";
export default function StudentTrainingPage() {
  const location = useLocation();
  const token = new URLSearchParams(location.hash.slice(1)).get("token") || "";
  return <StudentWorkspace key={token} token={token} />;
}
function StudentWorkspace({ token }: { token: string }) {
  const historyAction = useAction();
  const [data, setData] = useState<Learner | null>(null),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let alive = true;
    void learner(token)
      .then((r) => {
        if (alive) {
          setData(learnerSchema.parse(r));
          setError("");
        }
      })
      .catch((e) => {
        if (alive)
          setError(
            e instanceof Error ? e.message : "Kunde inte hämta träningen",
          );
      });
    return () => {
      alive = false;
    };
  }, [token, refresh]);
  return (
    <main
      className="min-h-screen bg-paper px-4 py-10 text-ink"
      data-private="true"
    >
      <Seo
        title="Min träning – AgilityManager"
        description="Dina uppgifter, träningsrapporter och instruktörens återkoppling."
        canonicalPath="/elev"
        noIndex
      />
      <div className="mx-auto max-w-3xl space-y-7">
        <header>
          <p className="text-sm font-bold uppercase tracking-widest text-forest">
            AgilityManager · Min träning
          </p>
          <h1 className="mt-3 font-display text-4xl">
            {data?.group.name || "Din träningssida"}
          </h1>
          {data && (
            <p className="mt-2">
              {data.student.name}
              {data.student.dog ? ` & ${data.student.dog}` : ""}
            </p>
          )}
          <p className="mt-3 text-sm text-ink/60">
            Länken är personlig. Rapporter och videolänkar delas med din
            instruktör.
          </p>
        </header>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
            {error}
          </p>
        )}
        {!data && !error && <p role="status">Hämtar din träning…</p>}
        <button
          className="rounded-full border-2 border-ink px-5 py-2 font-bold"
          onClick={() => setRefresh((v) => v + 1)}
        >
          Uppdatera
        </button>
        {data?.group.archived && (
          <p role="status" className="rounded-xl bg-amber-50 p-4">
            Gruppen är arkiverad. Din träningshistorik finns kvar.
          </p>
        )}
        {data && !data.assignments.length && (
          <p>Instruktören har inte lagt upp några uppgifter ännu.</p>
        )}
        {data?.next_cursor && (
          <button
            disabled={historyAction.busy}
            className="text-sm font-bold underline"
            onClick={() =>
              void historyAction.run(async () => {
                const more = learnerSchema.parse(
                  await learner(token, "view", null, {
                    before: data.next_cursor,
                  }),
                );
                setData((old) =>
                  old
                    ? {
                        ...more,
                        submissions: appendHistory(
                          old.submissions,
                          more.submissions,
                        ),
                        feedback: appendHistory(old.feedback, more.feedback),
                      }
                    : more,
                );
              })
            }
          >
            Visa äldre rapporter och återkoppling
          </button>
        )}
        {historyAction.error && (
          <p role="alert" className="text-red-700">
            {historyAction.error}
          </p>
        )}
        {data?.assignments.map((a) => (
          <section
            key={a.id}
            className="rounded-3xl border-2 border-ink bg-white/50 p-5 space-y-4"
          >
            <header>
              <p className="text-xs font-bold uppercase tracking-wide text-forest">
                {a.archived ? "Stängd uppgift" : `Träna till ${a.due_date}`}
              </p>
              <h2 className="mt-2 font-display text-3xl">{a.title}</h2>
            </header>
            <p className="whitespace-pre-wrap">{a.goal}</p>
            {a.course && (
              <a
                className="inline-block rounded-full border-2 border-ink px-5 py-2 font-bold"
                href={a.course.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                Öppna {a.course.name} ↗
              </a>
            )}
            {!a.archived && !data.group.archived && (
              <ReportForm
                assignment={a}
                token={token}
                onSaved={(report) =>
                  setData((current) =>
                    current
                      ? {
                          ...current,
                          submissions: [
                            report,
                            ...current.submissions.filter(
                              (s) => s.id !== report.id,
                            ),
                          ],
                        }
                      : current,
                  )
                }
              />
            )}
            <h3 className="font-bold">Rapporter och återkoppling</h3>
            <TrainingHistory
              reports={data.submissions.filter((s) => s.assignment_id === a.id)}
              feedback={data.feedback}
            />
            {!data.submissions.some((s) => s.assignment_id === a.id) && (
              <p className="text-sm text-ink/60">
                Ingen träningsrapport inlämnad ännu.
              </p>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
function ReportForm({
  assignment,
  token,
  onSaved,
}: {
  assignment: Assignment;
  token: string;
  onSaved: (s: Submission) => void;
}) {
  const [id, setId] = useState(() => crypto.randomUUID()),
    [reflection, setReflection] = useState(""),
    [video, setVideo] = useState(""),
    [completed, setCompleted] = useState(false),
    [reviewed, setReviewed] = useState(false);
  const action = useAction();
  return (
    <details>
      <summary className="cursor-pointer font-bold">
        Lämna en träningsrapport
      </summary>
      <form
        className="mt-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void action.run(async () => {
            if (!reviewed || !safeVideo(video.trim()))
              throw Error("Granska rapporten och kontrollera videolänken");
            const result = submissionSchema.parse(
              await learner(token, "submit", id, {
                assignment_id: assignment.id,
                reflection,
                video_url: video.trim(),
                completed,
                reviewed,
              }),
            );
            onSaved(result);
            setId(crypto.randomUUID());
            setReflection("");
            setVideo("");
            setCompleted(false);
            setReviewed(false);
          });
        }}
      >
        <fieldset disabled={action.busy} className="space-y-3">
          <label className="block text-sm">
            Hur gick träningen?
            <textarea
              className="mt-1 w-full rounded-xl border border-ink/20 p-3"
              required
              rows={4}
              maxLength={4000}
              value={reflection}
              onChange={(e) => {
                setReflection(e.target.value);
                setReviewed(false);
              }}
            />
          </label>
          <label className="block text-sm">
            Videolänk, valfritt
            <input
              type="url"
              placeholder="https://…"
              className="mt-1 w-full rounded-xl border border-ink/20 p-3"
              maxLength={2000}
              value={video}
              onChange={(e) => {
                setVideo(e.target.value);
                setReviewed(false);
              }}
            />
          </label>
          <p className="text-xs text-ink/60">
            Använd en video du får dela och se till att instruktören har
            åtkomst. Videon öppnas på den tjänst du väljer.
          </p>
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={completed}
              onChange={(e) => {
                setCompleted(e.target.checked);
                setReviewed(false);
              }}
            />
            Jag har genomfört uppgiften
          </label>
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />
            Jag har granskat rapporten och vill dela den med instruktören
          </label>
          <button
            disabled={!reviewed || !reflection.trim()}
            className="rounded-full bg-forest px-5 py-2 font-bold text-white disabled:opacity-40"
          >
            {action.busy ? "Sparar…" : "Lämna rapport"}
          </button>
        </fieldset>
        {action.error && (
          <p role="alert" className="text-red-700">
            {action.error}
          </p>
        )}
      </form>
    </details>
  );
}
