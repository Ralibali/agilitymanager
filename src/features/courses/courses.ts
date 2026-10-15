import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { readProfile } from "@/lib/plannerProfile";

const rpcClient: SupabaseClient = supabase;
export const sessionSchema = z.object({
  starts_at: z.string(),
  ends_at: z.string(),
});
export const trainingCourseSchema = z.object({
  id: z.string().uuid(),
  profile_id: z.string().uuid(),
  instructor_name: z.string(),
  title: z.string(),
  description: z.string(),
  location: z.string(),
  sport: z.enum(["agility", "hoopers"]),
  level: z.string(),
  max_teams: z.number().int(),
  price_sek: z.number().int(),
  payment_mode: z.enum(["free", "manual"]),
  payment_instructions: z.string(),
  status: z.enum(["draft", "published", "cancelled"]),
  revision: z.number().int(),
  sessions: z.array(sessionSchema),
  confirmed_count: z.number().int(),
  waitlist_count: z.number().int(),
  available_places: z.number().int(),
  registration_open: z.boolean().optional(),
});
export const registrationSchema = z.object({
  id: z.string().uuid(),
  course_id: z.string().uuid(),
  profile_id: z.string().uuid().nullable(),
  participant_name: z.string(),
  participant_email: z.string(),
  phone: z.string().nullable().optional(),
  dog: z.object({
    id: z.string().optional(),
    name: z.string().default(""),
    sport: z.enum(["agility", "hoopers"]).optional(),
    size: z.string().optional(),
    agilityLevel: z.string().optional(),
    hoopersLevel: z.string().optional(),
  }),
  status: z.enum(["confirmed", "waitlisted", "cancelled"]),
  payment_status: z.enum(["not_required", "unpaid", "paid", "refunded"]),
  price_sek: z.number().int(),
  payment_instructions: z.string(),
  refund_due: z.boolean().optional(),
  waitlist_position: z.number().int().nullable().optional(),
  revision: z.number().int(),
  created_at: z.string(),
  course: trainingCourseSchema.optional(),
});
export const instructorCourseSchema = z.object({
  course: trainingCourseSchema,
  registrations: z.array(registrationSchema),
});
export type TrainingCourse = z.infer<typeof trainingCourseSchema>;
export type CourseRegistration = z.infer<typeof registrationSchema>;
export type CourseSession = z.infer<typeof sessionSchema>;
export type InstructorCourse = z.infer<typeof instructorCourseSchema>;

async function rpc(name: string, parameters: Record<string, unknown>) {
  if (!isSupabaseConfigured) {
    throw Error("Kursbokningen kan inte ansluta just nu. Försök igen senare.");
  }
  const result = await rpcClient.rpc(name, parameters);
  if (result.error) {
    if (["PGRST202", "42883"].includes(result.error.code)) {
      throw Error("Kursbokningen är inte tillgänglig just nu. Försök igen senare.");
    }
    throw Error(result.error.message);
  }
  return result.data;
}

async function privateRpc(
  name: "courses_instructor" | "courses_participant",
  action: string,
  id: string | null = null,
  data: Record<string, unknown> = {},
) {
  const profile = readProfile();
  if (!profile) throw Error("Öppna din banprofil först.");
  return rpc(name, {
    p_profile: profile.id,
    p_token: profile.token,
    p_action: action,
    p_id: id,
    p_data: data,
  });
}

export async function listTrainingCourses() {
  return z.array(trainingCourseSchema).parse(await rpc("courses_catalog", { p_id: null }));
}
export async function getTrainingCourse(id: string) {
  if (!z.uuid().safeParse(id).success) throw Error("Kurslänken är inte giltig.");
  return trainingCourseSchema.parse(await rpc("courses_catalog", { p_id: id }));
}
export const courseInstructor = (
  action: string,
  id: string | null = null,
  data: Record<string, unknown> = {},
) => privateRpc("courses_instructor", action, id, data);
export const courseParticipant = (
  action: string,
  id: string | null = null,
  data: Record<string, unknown> = {},
) => privateRpc("courses_participant", action, id, data);

export function coursePrice(price: number) {
  return price === 0 ? "Gratis" : new Intl.NumberFormat("sv-SE", {
    style: "currency", currency: "SEK", maximumFractionDigits: 0,
  }).format(price);
}
export function courseDate(value: string, includeTime = true) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    dateStyle: "medium", ...(includeTime ? { timeStyle: "short" as const } : {}),
  }).format(new Date(value));
}
export function sessionTime(session: CourseSession) {
  return `${courseDate(session.starts_at)}–${new Intl.DateTimeFormat("sv-SE", {
    timeStyle: "short", timeZone: "Europe/Stockholm",
  }).format(new Date(session.ends_at))}`;
}
export function registrationLabel(registration: CourseRegistration) {
  if (registration.status === "cancelled") return "Avanmäld";
  return registration.status === "confirmed" ? "Bekräftad plats" : "På väntelistan";
}

const stockholmTime = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});
export function toDateTimeInput(value: string) {
  const parts = Object.fromEntries(stockholmTime.formatToParts(new Date(value)).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
export function stockholmTimestamp(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw Error("Ange ett giltigt datum och klockslag.");
  const wallTime = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(wallTime) || new Date(wallTime).toISOString().slice(0, 16) !== value) throw Error("Ange ett giltigt datum och klockslag.");
  const offsets = new Set([-86400000, 0, 86400000].map((delta) => {
    const instant = wallTime + delta;
    return Date.parse(`${toDateTimeInput(new Date(instant).toISOString())}:00Z`) - instant;
  }));
  const candidates = [...offsets].map((offset) => new Date(wallTime - offset).toISOString())
    .filter((instant) => toDateTimeInput(instant) === value);
  if (candidates.length === 0) throw Error("Klockslaget finns inte vid bytet till sommartid. Välj en annan tid.");
  if (candidates.length > 1) throw Error("Klockslaget infaller två gånger vid bytet till vintertid. Välj en annan tid.");
  return candidates[0];
}
export function parseCourseSessions(rows: { starts_at: string; ends_at: string }[]) {
  if (rows.length < 1 || rows.length > 30) throw Error("Lägg till 1–30 kurstillfällen.");
  const sessions = rows.map((row) => {
    if (!row.starts_at || !row.ends_at) {
      throw Error("Ange start och slut för varje kurstillfälle.");
    }
    const start = new Date(stockholmTimestamp(row.starts_at));
    const end = new Date(stockholmTimestamp(row.ends_at));
    if (end <= start) throw Error("Sluttiden måste vara efter starttiden.");
    if (end.getTime() - start.getTime() > 7 * 86400000) throw Error("Ett kurstillfälle får vara högst sju dagar.");
    if (start < new Date("2020-01-01T00:00:00Z") || end > new Date("2100-01-01T00:00:00Z")) throw Error("Välj ett datum mellan 2020 och 2099.");
    return { starts_at: start.toISOString(), ends_at: end.toISOString() };
  }).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  for (let i = 1; i < sessions.length; i++) {
    if (sessions[i].starts_at < sessions[i - 1].ends_at) {
      throw Error("Kurstillfällena får inte överlappa varandra.");
    }
  }
  return sessions;
}
