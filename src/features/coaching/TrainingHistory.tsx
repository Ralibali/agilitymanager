import { useState } from "react";
import { useAction } from "./useAction";
import {
  feedbackSchema,
  instructor,
  parseVideoTime,
  safeVideo,
  videoTime,
  type Feedback,
  type Submission,
} from "./coaching";
const input = "mt-1 w-full rounded-xl border border-ink/20 bg-white p-3";
export function TrainingHistory({
  reports,
  feedback,
  groupId,
  onFeedback,
}: {
  reports: Submission[];
  feedback: Feedback[];
  groupId?: string;
  onFeedback?: (f: Feedback) => void;
}) {
  return (
    <div className="space-y-5">
      {reports.map((report) => (
        <article
          key={report.id}
          className="rounded-2xl border border-ink/15 bg-white p-4 space-y-3"
        >
          <p className="text-xs text-ink/60">
            Rapport {new Date(report.created_at).toLocaleString("sv-SE")} ·{" "}
            {report.completed
              ? "Eleven har markerat uppgiften genomförd"
              : "Pågående träning"}
          </p>
          <p className="whitespace-pre-wrap">{report.reflection}</p>
          {report.video_url && safeVideo(report.video_url) && (
            <a
              className="font-bold underline"
              href={report.video_url}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
            >
              Öppna elevens video ↗
            </a>
          )}
          {feedback
            .filter((f) => f.submission_id === report.id)
            .map((f) => (
              <div
                key={f.id}
                className="rounded-xl border-l-4 border-forest bg-sage/20 p-4"
              >
                <p className="text-xs font-bold">
                  Instruktörens återkoppling ·{" "}
                  {new Date(f.created_at).toLocaleString("sv-SE")}
                  {f.video_seconds !== null
                    ? ` · Vid ${videoTime(f.video_seconds)} i videon`
                    : ""}
                </p>
                <p className="mt-2 whitespace-pre-wrap">{f.body}</p>
                {f.next_step && (
                  <p className="mt-2 whitespace-pre-wrap">
                    <strong>Nästa steg:</strong> {f.next_step}
                  </p>
                )}
              </div>
            ))}
          {groupId && onFeedback && (
            <FeedbackForm
              groupId={groupId}
              report={report}
              onSaved={onFeedback}
            />
          )}
        </article>
      ))}
    </div>
  );
}
function FeedbackForm({
  groupId,
  report,
  onSaved,
}: {
  groupId: string;
  report: Submission;
  onSaved: (f: Feedback) => void;
}) {
  const [id, setId] = useState(() => crypto.randomUUID()),
    [body, setBody] = useState(""),
    [next, setNext] = useState(""),
    [time, setTime] = useState("");
  const action = useAction();
  return (
    <details>
      <summary className="cursor-pointer text-sm font-bold">
        Ge återkoppling
      </summary>
      <form
        className="mt-3 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void action.run(async () => {
            const f = feedbackSchema.parse(
              await instructor("feedback", id, {
                group_id: groupId,
                submission_id: report.id,
                body,
                next_step: next,
                video_seconds: parseVideoTime(time),
              }),
            );
            onSaved(f);
            setId(crypto.randomUUID());
            setBody("");
            setNext("");
            setTime("");
          });
        }}
      >
        <fieldset disabled={action.busy} className="space-y-3">
          <label className="block text-sm">
            Återkoppling
            <textarea
              required
              maxLength={4000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className={input}
            />
          </label>
          {report.video_url && (
            <label className="block text-sm">
              Tid i videon, valfritt (minuter:sekunder)
              <input
                placeholder="1:24"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={input}
              />
            </label>
          )}
          <label className="block text-sm">
            Nästa steg, valfritt
            <textarea
              maxLength={2000}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className={input}
            />
          </label>
          <button
            className="rounded-full bg-forest px-5 py-2 font-bold text-white disabled:opacity-50"
            disabled={!body.trim()}
          >
            {action.busy ? "Sparar…" : "Spara återkoppling"}
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
