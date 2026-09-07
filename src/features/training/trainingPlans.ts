export const TRAINING_KEY = "am_training_sessions_v1";
export interface TrainingSession {
  id: string;
  title: string;
  dog: string;
  date: string;
  goal: string;
  course: { name: string; href: string } | null;
  completed: boolean;
  reflection: string;
  nextStep: string;
  videoUrl: string;
}
const text = (x: unknown, max: number): x is string =>
  typeof x === "string" && x.length <= max;
export function validCourseLink(href: unknown): href is string {
  if (!text(href, 100_000)) return false;
  try {
    const url = new URL(href, "https://agilitymanager.se");
    return (
      href.startsWith("/banplanerare?") &&
      url.origin === "https://agilitymanager.se" &&
      url.pathname === "/banplanerare" &&
      [...url.searchParams.keys()].every(
        (k) => k === "template" || k === "bana"
      ) &&
      Boolean(url.searchParams.get("template") || url.searchParams.get("bana"))
    );
  } catch {
    return false;
  }
}
export function validVideoUrl(value: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}
export function parseSession(raw: unknown): TrainingSession | null {
  if (!raw || typeof raw !== "object") return null;
  const x = raw as Record<string, unknown>;
  if (
    !text(x.id, 80) ||
    !x.id ||
    !text(x.title, 120) ||
    !x.title.trim() ||
    !text(x.dog, 80) ||
    !text(x.date, 10) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(x.date) ||
    !Number.isFinite(Date.parse(x.date)) ||
    new Date(x.date).toISOString().slice(0, 10) !== x.date ||
    !text(x.goal, 2000) ||
    !x.goal.trim() ||
    typeof x.completed !== "boolean" ||
    !text(x.reflection, 3000) ||
    !text(x.nextStep, 2000) ||
    !text(x.videoUrl, 2000) ||
    !validVideoUrl(x.videoUrl)
  )
    return null;
  let course: TrainingSession["course"] = null;
  if (x.course !== null) {
    if (!x.course || typeof x.course !== "object") return null;
    const c = x.course as Record<string, unknown>;
    if (!text(c.name, 120) || !validCourseLink(c.href)) return null;
    course = { name: c.name, href: c.href };
  }
  return {
    id: x.id,
    title: x.title.trim(),
    dog: x.dog.trim(),
    date: x.date,
    goal: x.goal.trim(),
    course,
    completed: x.completed,
    reflection: x.reflection.trim(),
    nextStep: x.nextStep.trim(),
    videoUrl: x.videoUrl.trim(),
  };
}
export function parseTrainingFile(raw: string): TrainingSession[] {
  if (raw.length > 3_000_000) throw new Error("Filen är för stor. Högst 3 MB.");
  const data: unknown = JSON.parse(raw);
  if (
    !data ||
    typeof data !== "object" ||
    !("version" in data) ||
    data.version !== 1 ||
    !("sessions" in data) ||
    !Array.isArray(data.sessions) ||
    data.sessions.length > 100
  )
    throw new Error(
      "Filen innehåller inte en giltig träningsplan (version 1, högst 100 pass)."
    );
  const sessions = data.sessions.map(parseSession);
  if (
    sessions.some((x) => !x) ||
    new Set(sessions.map((x) => x!.id)).size !== sessions.length
  )
    throw new Error(
      "Något pass innehåller ogiltiga uppgifter. Inget har ändrats."
    );
  return sessions as TrainingSession[];
}
export const serializeTraining = (sessions: TrainingSession[]) =>
  JSON.stringify({ version: 1, sessions }, null, 2);
export function loadTraining(): TrainingSession[] {
  const raw = localStorage.getItem(TRAINING_KEY);
  return raw ? parseTrainingFile(raw) : [];
}
export function saveTraining(sessions: TrainingSession[]): void {
  const raw = serializeTraining(sessions);
  parseTrainingFile(raw);
  try {
    localStorage.setItem(TRAINING_KEY, raw);
  } catch {
    throw new Error(
      "Kunde inte spara i webbläsaren. Frigör utrymme eller exportera passen."
    );
  }
}
export function sessionText(s: TrainingSession): string {
  return [
    s.title,
    `${s.date}${s.dog ? ` · ${s.dog}` : ""}`,
    `Mål: ${s.goal}`,
    s.course &&
      `Bana: ${s.course.name}\nhttps://agilitymanager.se${s.course.href}`,
    `Status: ${s.completed ? "Genomfört" : "Planerat"}`,
    s.reflection && `Efter passet: ${s.reflection}`,
    s.nextStep && `Nästa steg: ${s.nextStep}`,
    s.videoUrl && `Film: ${s.videoUrl}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
