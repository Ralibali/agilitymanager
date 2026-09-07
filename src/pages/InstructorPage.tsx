import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Link } from "react-router";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Seo } from "@/components/Seo";
import { PlannerProfileDialog } from "@/features/planner-social/PlannerProfileDialog";
import { usePlannerProfile } from "@/lib/plannerProfile";
import { listLocalCourses } from "@/features/course-planner-v2/localCourses";
import { COURSE_BANK } from "@/features/course-planner-v2/courseBank";
import {
  loadTraining,
  type TrainingSession,
} from "@/features/training/trainingPlans";
import {
  appendHistory,
  instructor,
  boardSchema,
  groupSchema,
  studentSchema,
  assignmentSchema,
  courseSchema,
  progressFor,
  type Group,
  type Board,
  type Student,
} from "@/features/coaching/coaching";
import { TrainingHistory } from "@/features/coaching/TrainingHistory";
import { useAction } from "@/features/coaching/useAction";
const input = "mt-1 w-full rounded-xl border border-ink/25 bg-white p-3";
const button =
  "rounded-full border-2 border-ink px-5 py-2 text-sm font-bold disabled:opacity-40";
export default function InstructorPage() {
  const { profile } = usePlannerProfile();
  const [profileOpen, setProfileOpen] = useState(false);
  return (
    <>
      <SiteNav />
      <main
        className="min-h-screen bg-paper px-4 pb-16 pt-40 text-ink"
        data-private="true"
      >
        <Seo
          title="Instruktör – AgilityManager"
          description="Grupper, träningsuppgifter och privat återkoppling till dina elever."
          canonicalPath="/instruktor"
          noIndex
        />
        <div className="mx-auto max-w-6xl space-y-8">
          <header>
            <p className="text-sm font-bold uppercase tracking-widest text-forest">
              Träning tillsammans
            </p>
            <h1 className="mt-3 font-display text-5xl">
              Instruktörens arbetsrum
            </h1>
            <p className="mt-3 max-w-2xl">
              Samla grupper, ge uppgifter från dina träningsplaner och följ
              elevernas rapporter. Återkopplingen följer med hela vägen.
            </p>
            <Link
              to="/traning"
              className="mt-3 inline-block text-sm font-bold underline"
            >
              Till mina egna träningsplaner
            </Link>
          </header>
          {profile ? (
            <>
              <p className="text-sm text-ink/60">
                Profil: {profile.name}. Åtkomsten följer din banplanerarprofil i
                den här webbläsaren. Grupperna sparas i molnet.
              </p>
              <InstructorWorkspace key={profile.id} />
            </>
          ) : (
            <section className="rounded-3xl border-2 border-ink bg-white p-6">
              <h2 className="font-display text-3xl">Börja med din profil</h2>
              <p className="mt-2 mb-4">
                Använd samma profil som när du sparar banor. Din profilnyckel
                finns i webbläsaren där du skapade den.
              </p>
              <button className={button} onClick={() => setProfileOpen(true)}>
                Öppna banplanerarprofil
              </button>
            </section>
          )}
        </div>
      </main>
      <SiteFooter />
      <PlannerProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        reason="Profilen ger dig tillgång till dina privata träningsgrupper."
      />
    </>
  );
}
function InstructorWorkspace() {
  const [groups, setGroups] = useState<Group[]>([]),
    [selected, setSelected] = useState(""),
    [name, setName] = useState(""),
    [id, setId] = useState(() => crypto.randomUUID()),
    [listError, setListError] = useState(""),
    [loading, setLoading] = useState(true);
  const action = useAction();
  const load = useCallback(async () => {
    try {
      const rows = z.array(groupSchema).parse(await instructor("list"));
      setGroups(rows);
      setListError("");
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Kunde inte hämta grupper");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <div className="grid gap-8 lg:grid-cols-[250px_1fr]">
      <aside className="space-y-5">
        <h2 className="font-display text-2xl">Mina grupper</h2>
        {loading && <p role="status">Hämtar grupper…</p>}
        {listError && (
          <p role="alert" className="text-red-700">
            {listError}
          </p>
        )}
        <button
          className="text-sm font-bold underline"
          onClick={() => void load()}
        >
          Uppdatera grupplistan
        </button>
        <nav aria-label="Träningsgrupper" className="space-y-2">
          {groups.map((g) => (
            <button
              key={g.id}
              aria-current={selected === g.id ? "page" : undefined}
              onClick={() => setSelected(g.id)}
              className={`w-full rounded-2xl border-2 p-3 text-left font-bold ${selected === g.id ? "border-ink bg-tang" : "border-ink/15 bg-white"}`}
            >
              {g.name}
              {g.archived && (
                <span className="mt-1 block text-xs font-normal">
                  Arkiverad
                </span>
              )}
            </button>
          ))}
        </nav>
        <form
          className="rounded-2xl border border-ink/20 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void action.run(async () => {
              const g = groupSchema.parse(
                await instructor("create_group", id, { name }),
              );
              setGroups((old) => [g, ...old.filter((x) => x.id !== g.id)]);
              setSelected(g.id);
              setName("");
              setId(crypto.randomUUID());
            });
          }}
        >
          <label className="block text-sm font-bold">
            Ny träningsgrupp
            <input
              className={input}
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Till exempel onsdagsgruppen"
            />
          </label>
          <button
            disabled={action.busy || !name.trim()}
            className={`${button} mt-3`}
          >
            {action.busy ? "Sparar…" : "Skapa grupp"}
          </button>
          {action.error && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {action.error}
            </p>
          )}
        </form>
      </aside>
      {selected ? (
        <GroupWorkspace
          key={selected}
          groupId={selected}
          onGroup={(updated) =>
            setGroups((old) =>
              old.map((g) => (g.id === updated.id ? updated : g)),
            )
          }
        />
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-ink/20 p-8">
          <h2 className="font-display text-3xl">Din nästa träningsgrupp</h2>
          <p className="mt-3">
            Skapa en grupp, lägg till elever och dela deras personliga
            träningslänkar. Sedan kan du lägga upp första uppgiften.
          </p>
        </div>
      )}
    </div>
  );
}
function GroupWorkspace({
  groupId,
  onGroup,
}: {
  groupId: string;
  onGroup: (g: Group) => void;
}) {
  const [board, setBoard] = useState<Board | null>(null),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0),
    [studentFilter, setStudentFilter] = useState("all");
  const action = useAction();
  useEffect(() => {
    let live = true;
    void instructor("view", groupId)
      .then((data) => {
        const parsed = boardSchema.parse(data);
        if (live) {
          setBoard(parsed);
          setError("");
        }
      })
      .catch((e) => {
        if (live)
          setError(e instanceof Error ? e.message : "Kunde inte hämta gruppen");
      });
    return () => {
      live = false;
    };
  }, [groupId, refresh]);
  const addStudent = (s: Student) =>
    setBoard((old) =>
      old
        ? {
            ...old,
            students: [...old.students.filter((x) => x.id !== s.id), s],
          }
        : old,
    );
  if (!board)
    return (
      <div>
        {error ? (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        ) : (
          <p role="status">Hämtar gruppen…</p>
        )}
        <button className={button} onClick={() => setRefresh((v) => v + 1)}>
          Försök igen
        </button>
      </div>
    );
  return (
    <div className="min-w-0 space-y-7">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-4xl">{board.group.name}</h2>
          <p className="text-sm text-ink/60">
            {board.students.filter((s) => s.active).length} aktiva elever ·{" "}
            {board.assignments.filter((a) => !a.archived).length} öppna
            uppgifter
          </p>
        </div>
        <button className={button} onClick={() => setRefresh((v) => v + 1)}>
          Uppdatera rapporter
        </button>
      </header>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {board.group.archived && (
        <p className="rounded-xl bg-amber-50 p-4" role="status">
          Gruppen är arkiverad. Historiken finns kvar och nya rapporter är
          pausade.
        </p>
      )}
      <section className="rounded-3xl border-2 border-ink bg-white p-5 space-y-4">
        <h3 className="font-display text-3xl">Elever och åtkomst</h3>
        <p className="text-sm text-ink/60">
          Varje elev får en personlig länk som gäller i 180 dagar. Dela den
          direkt med rätt elev. En ny länk stänger den gamla.
        </p>
        <div className="space-y-3">
          {board.students.map((s) => (
            <StudentAccess
              key={s.id}
              student={s}
              disabled={board.group.archived}
              onChanged={addStudent}
            />
          ))}
        </div>
        {!board.group.archived && (
          <NewStudent groupId={groupId} onSaved={addStudent} />
        )}
      </section>
      {!board.group.archived && (
        <AssignmentForm
          board={board}
          onSaved={(a) =>
            setBoard((old) =>
              old
                ? {
                    ...old,
                    assignments: [
                      a,
                      ...old.assignments.filter((x) => x.id !== a.id),
                    ],
                  }
                : old,
            )
          }
        />
      )}
      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-3xl">
            Uppgifter och träningshistorik
          </h3>
          <label className="text-sm">
            Visa elev
            <select
              className={input}
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
            >
              <option value="all">Alla elever</option>
              {board.students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.dog && `& ${s.dog}`}
                </option>
              ))}
            </select>
          </label>
        </div>
        {!board.assignments.length && (
          <p className="text-sm text-ink/60">
            Inga uppgifter ännu. Börja med ett tydligt träningsmål.
          </p>
        )}
        {board.assignments
          .filter(
            (a) =>
              studentFilter === "all" ||
              !a.student_id ||
              a.student_id === studentFilter,
          )
          .map((a) => (
            <article
              key={a.id}
              className="rounded-3xl border-2 border-ink/20 p-5 space-y-4"
            >
              <p className="text-xs font-bold uppercase tracking-wide text-forest">
                {a.archived ? "Stängd uppgift" : `Träna till ${a.due_date}`}
              </p>
              <h4 className="font-display text-3xl">{a.title}</h4>
              <p className="whitespace-pre-wrap">{a.goal}</p>
              {a.course && (
                <a
                  className="inline-block font-bold underline"
                  href={a.course.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Öppna {a.course.name} ↗
                </a>
              )}
              {board.students
                .filter(
                  (s) =>
                    (!a.student_id || a.student_id === s.id) &&
                    (studentFilter === "all" || studentFilter === s.id),
                )
                .map((s) => (
                  <details
                    key={s.id}
                    className="rounded-2xl border border-ink/15 p-4"
                  >
                    <summary className="cursor-pointer">
                      <strong>
                        {s.name}
                        {s.dog ? ` & ${s.dog}` : ""}
                      </strong>
                      <span className="mt-1 block text-xs text-ink/60">
                        {progressFor(s.id, a.id, board.progress)}
                      </span>
                    </summary>
                    <div className="mt-4">
                      <TrainingHistory
                        reports={board.submissions.filter(
                          (r) =>
                            r.student_id === s.id && r.assignment_id === a.id,
                        )}
                        feedback={board.feedback}
                        groupId={!board.group.archived ? groupId : undefined}
                        onFeedback={(f) =>
                          setBoard((old) =>
                            old
                              ? {
                                  ...old,
                                  progress: old.progress.map((p) =>
                                    p.latest_id === f.submission_id
                                      ? { ...p, reviewed: true }
                                      : p,
                                  ),
                                  feedback: [
                                    ...old.feedback.filter(
                                      (x) => x.id !== f.id,
                                    ),
                                    f,
                                  ],
                                }
                              : old,
                          )
                        }
                      />
                    </div>
                  </details>
                ))}
              {!board.group.archived && (
                <button
                  className="text-sm font-bold underline disabled:opacity-40"
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(async () => {
                      const changed = assignmentSchema.parse(
                        await instructor("archive_assignment", a.id, {
                          group_id: groupId,
                          revision: a.revision,
                          archived: !a.archived,
                        }),
                      );
                      setBoard((old) =>
                        old
                          ? {
                              ...old,
                              assignments: old.assignments.map((x) =>
                                x.id === changed.id ? changed : x,
                              ),
                            }
                          : old,
                      );
                    })
                  }
                >
                  {a.archived
                    ? "Öppna uppgiften igen"
                    : "Stäng för nya rapporter"}
                </button>
              )}
            </article>
          ))}
      </section>
      {board.next_cursor && (
        <button
          className={button}
          disabled={action.busy}
          onClick={() =>
            void action.run(async () => {
              const more = boardSchema.parse(
                await instructor("view", groupId, {
                  before: board.next_cursor,
                }),
              );
              setBoard((old) =>
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
      {board.next_cursor && (
        <p className="text-sm text-ink/60">
          De senaste rapporterna visas. Elevstatusen bygger på samtliga
          rapporter.
        </p>
      )}
      <details className="border-t border-ink/20 pt-5">
        <summary className="cursor-pointer text-sm font-bold">
          Gruppinställningar
        </summary>
        <p className="my-3 text-sm">
          Arkivering pausar nya uppgifter och rapporter. Eleverna behåller sin
          läsbara historik.
        </p>
        <button
          className={button}
          disabled={action.busy}
          onClick={() =>
            void action.run(async () => {
              const g = groupSchema.parse(
                await instructor("archive_group", groupId, {
                  revision: board.group.revision,
                  archived: !board.group.archived,
                }),
              );
              setBoard((old) => (old ? { ...old, group: g } : old));
              onGroup(g);
            })
          }
        >
          {board.group.archived ? "Öppna gruppen igen" : "Arkivera gruppen"}
        </button>
      </details>
      {action.error && (
        <p role="alert" className="text-red-700">
          {action.error}
        </p>
      )}
    </div>
  );
}
function LinkCopy({ token }: { token: string }) {
  const [copied, setCopied] = useState(false),
    [error, setError] = useState("");
  const url = `${window.location.origin}/elev#token=${token}`;
  return (
    <div className="rounded-xl bg-sage/20 p-3">
      <label className="block text-xs font-bold">
        Personlig elevlänk
        <input readOnly value={url} className={input} />
      </label>
      <button
        className="mt-2 text-sm font-bold underline"
        onClick={() => {
          void navigator.clipboard
            .writeText(url)
            .then(() => {
              setCopied(true);
              setError("");
            })
            .catch(() => setError("Markera länken och kopiera den manuellt."));
        }}
      >
        {copied ? "Länken kopierad" : "Kopiera elevlänken"}
      </button>
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
function StudentAccess({
  student,
  disabled,
  onChanged,
}: {
  student: Student;
  disabled: boolean;
  onChanged: (s: Student) => void;
}) {
  const action = useAction();
  const [checkedAt] = useState(() => Date.now());
  const expired = student.expires_at
    ? Date.parse(student.expires_at) < checkedAt
    : true;
  return (
    <div className="rounded-xl border border-ink/15 p-3 space-y-3">
      <p className="font-bold">
        {student.name}
        {student.dog ? ` & ${student.dog}` : ""}
      </p>
      <p className="text-xs text-ink/60">
        {!student.active
          ? "Åtkomst stängd"
          : expired
            ? "Länken har löpt ut"
            : `Länk giltig till ${student.expires_at?.slice(0, 10)}`}
      </p>
      {(!disabled || student.active) && (
        <div className="flex flex-wrap gap-3">
          {(
            [
              ...(!disabled ? ["rotate_student"] : []),
              ...(student.active ? ["disable_student"] : []),
            ] as const
          ).map((act) => (
            <button
              key={act}
              disabled={action.busy}
              className="text-xs font-bold underline"
              onClick={() =>
                void action.run(async () => {
                  const result = studentSchema.parse(
                    await instructor(act, student.id, {
                      group_id: student.group_id,
                      revision: student.revision,
                    }),
                  );
                  onChanged(result);
                })
              }
            >
              {act === "rotate_student"
                ? "Skapa ny personlig länk"
                : "Stäng elevens åtkomst"}
            </button>
          ))}
        </div>
      )}
      {student.token && student.active && (
        <LinkCopy key={student.token} token={student.token} />
      )}{" "}
      {action.error && (
        <p role="alert" className="text-sm text-red-700">
          {action.error}
        </p>
      )}
    </div>
  );
}
function NewStudent({
  groupId,
  onSaved,
}: {
  groupId: string;
  onSaved: (s: Student) => void;
}) {
  const [id, setId] = useState(() => crypto.randomUUID()),
    [name, setName] = useState(""),
    [dog, setDog] = useState("");
  const action = useAction();
  return (
    <details>
      <summary className="cursor-pointer text-sm font-bold">
        Lägg till elev
      </summary>
      <form
        className="mt-3 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void action.run(async () => {
            const s = studentSchema.parse(
              await instructor("create_student", id, {
                group_id: groupId,
                name,
                dog,
              }),
            );
            onSaved(s);
            setId(crypto.randomUUID());
            setName("");
            setDog("");
          });
        }}
      >
        <fieldset disabled={action.busy} className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Elevens namn
            <input
              className={input}
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Hundens namn, valfritt
            <input
              className={input}
              maxLength={100}
              value={dog}
              onChange={(e) => setDog(e.target.value)}
            />
          </label>
          <button className={button} disabled={!name.trim()}>
            Lägg till elev och skapa länk
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
function AssignmentForm({
  board,
  onSaved,
}: {
  board: Board;
  onSaved: (a: Board["assignments"][number]) => void;
}) {
  const [id, setId] = useState(() => crypto.randomUUID()),
    [title, setTitle] = useState(""),
    [goal, setGoal] = useState(""),
    [due, setDue] = useState(""),
    [student, setStudent] = useState(""),
    [course, setCourse] = useState<{ name: string; href: string } | null>(null),
    [sourceError, setSourceError] = useState("");
  const action = useAction();
  const choices = useMemo(
    () => [
      ...COURSE_BANK.filter((c) => c.bankKind === "original").map((c) => ({
        name: c.label,
        href: `/banplanerare?template=${encodeURIComponent(c.key)}`,
      })),
      ...listLocalCourses().flatMap((c) => {
        try {
          const href = `/banplanerare?bana=${btoa(
            unescape(encodeURIComponent(JSON.stringify(c.data))),
          )
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "")}`;
          const value = courseSchema.safeParse({ name: c.name, href });
          return value.success ? [value.data] : [];
        } catch {
          return [];
        }
      }),
    ],
    [],
  );
  const [sessions] = useState<TrainingSession[]>(() => {
    try {
      return loadTraining();
    } catch {
      return [];
    }
  });
  return (
    <section className="rounded-3xl border-2 border-ink bg-tang/10 p-5">
      <h3 className="font-display text-3xl">Ge en träningsuppgift</h3>
      <p className="mt-2 text-sm text-ink/60">
        Uppgiften sparas med sitt innehåll. Stäng den och skapa en ny om målet
        behöver ändras.
      </p>
      {!!sessions.length && (
        <label className="mt-4 block text-sm">
          Utgå från en egen träningsplan
          <select
            className={input}
            defaultValue=""
            onChange={(e) => {
              const s = sessions.find((x) => x.id === e.target.value);
              if (s) {
                setTitle(s.title);
                setGoal(s.goal);
                const parsed = s.course
                  ? courseSchema.safeParse(s.course)
                  : null;
                setCourse(parsed?.success ? parsed.data : null);
                setSourceError(
                  s.course && !parsed?.success
                    ? "Banlänken kunde inte återanvändas. Välj en bana nedan."
                    : "",
                );
              }
            }}
          >
            <option value="">Välj sparat träningspass</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
      )}
      <form
        className="mt-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void action.run(async () => {
            const a = assignmentSchema.parse(
              await instructor("create_assignment", id, {
                group_id: board.group.id,
                student_id: student || null,
                title,
                goal,
                due_date: due,
                course,
              }),
            );
            onSaved(a);
            setId(crypto.randomUUID());
            setTitle("");
            setGoal("");
            setCourse(null);
            setSourceError("");
          });
        }}
      >
        <fieldset disabled={action.busy} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Till vem?
              <select
                className={input}
                value={student}
                onChange={(e) => setStudent(e.target.value)}
              >
                <option value="">Hela gruppen</option>
                {board.students
                  .filter((s) => s.active)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.dog ? ` & ${s.dog}` : ""}
                    </option>
                  ))}
              </select>
            </label>
            <label className="text-sm">
              Träna till
              <input
                type="date"
                className={input}
                required
                value={due}
                min="2020-01-01"
                max="2100-01-01"
                onChange={(e) => setDue(e.target.value)}
              />
            </label>
          </div>
          <label className="block text-sm">
            Rubrik
            <input
              className={input}
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Mål och instruktioner
            <textarea
              className={input}
              required
              rows={4}
              maxLength={4000}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Vad ska eleven öva på och vad ska hen lägga märke till?"
            />
          </label>
          <label className="block text-sm">
            Bana, valfritt
            <select
              className={input}
              value={course?.href || ""}
              onChange={(e) =>
                setCourse(
                  choices.find((c) => c.href === e.target.value) || null,
                )
              }
            >
              <option value="">Övning utan bana</option>
              {course && !choices.some((c) => c.href === course.href) && (
                <option value={course.href}>{course.name}</option>
              )}
              {choices.map((c) => (
                <option key={c.href} value={c.href}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {sourceError && (
            <p className="text-sm text-amber-800">{sourceError}</p>
          )}
          <button
            className={`${button} bg-tang`}
            disabled={!title.trim() || !goal.trim() || !due}
          >
            {action.busy ? "Sparar…" : "Lägg upp uppgiften"}
          </button>
        </fieldset>
        {action.error && (
          <p role="alert" className="text-red-700">
            {action.error}
          </p>
        )}
      </form>
    </section>
  );
}
