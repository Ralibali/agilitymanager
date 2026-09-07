import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { readProfile } from "@/lib/plannerProfile";
const rpcClient: SupabaseClient = supabase;
export const groupSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  archived: z.boolean(),
  revision: z.number().int(),
});
export const studentSchema = z.object({
  id: z.string().uuid(),
  group_id: z.string().uuid(),
  name: z.string(),
  dog: z.string(),
  active: z.boolean(),
  revision: z.number().int(),
  expires_at: z.string().nullable(),
  token: z.string().nullable().optional(),
});
export const courseSchema = z.object({
  name: z.string().max(120),
  href: z
    .string()
    .max(100000)
    .refine((href) =>
      /^\/banplanerare\?(template=[a-zA-Z0-9_-]{1,100}|bana=[a-zA-Z0-9_-]+)$/.test(
        href,
      ),
    ),
});
export const assignmentSchema = z.object({
  id: z.string().uuid(),
  group_id: z.string().uuid(),
  student_id: z.string().uuid().nullable(),
  title: z.string(),
  goal: z.string(),
  course: courseSchema.nullable(),
  due_date: z.string(),
  archived: z.boolean(),
  revision: z.number().int(),
});
export const submissionSchema = z.object({
  id: z.string().uuid(),
  assignment_id: z.string().uuid(),
  student_id: z.string().uuid(),
  reflection: z.string(),
  video_url: z.string(),
  completed: z.boolean(),
  created_at: z.string(),
});
export const feedbackSchema = z.object({
  id: z.string().uuid(),
  submission_id: z.string().uuid(),
  body: z.string(),
  next_step: z.string(),
  video_seconds: z.number().int().nullable(),
  created_at: z.string(),
});
export const progressSchema = z.object({
  student_id: z.string().uuid(),
  assignment_id: z.string().uuid(),
  latest_id: z.string().uuid(),
  completed: z.boolean(),
  reviewed: z.boolean(),
});
const history = {
  next_cursor: z.object({ at: z.string(), id: z.string().uuid() }).nullable(),
  assignments: z.array(assignmentSchema),
  submissions: z.array(submissionSchema),
  feedback: z.array(feedbackSchema),
};
export const boardSchema = z.object({
  group: groupSchema,
  students: z.array(studentSchema),
  progress: z.array(progressSchema),
  ...history,
});
export const learnerSchema = z.object({
  student: z.object({
    id: z.string().uuid(),
    name: z.string(),
    dog: z.string(),
  }),
  group: z.object({
    id: z.string().uuid(),
    name: z.string(),
    archived: z.boolean(),
  }),
  ...history,
});
export type Group = z.infer<typeof groupSchema>;
export type Student = z.infer<typeof studentSchema>;
export type Assignment = z.infer<typeof assignmentSchema>;
export type Submission = z.infer<typeof submissionSchema>;
export type Feedback = z.infer<typeof feedbackSchema>;
export type Board = z.infer<typeof boardSchema>;
export type Learner = z.infer<typeof learnerSchema>;
export async function instructor(
  action: string,
  id: string | null = null,
  data: Record<string, unknown> = {},
): Promise<unknown> {
  const profile = readProfile();
  if (!profile) throw Error("Skapa eller öppna din banplanerarprofil först");
  if (!isSupabaseConfigured) throw Error("Molnanslutningen saknas");
  const result = await rpcClient.rpc("coaching_instructor", {
    p_profile: profile.id,
    p_token: profile.token,
    p_action: action,
    p_id: id,
    p_data: data,
  });
  if (result.error) throw Error(result.error.message);
  return result.data;
}
export async function learner(
  token: string,
  action = "view",
  id: string | null = null,
  data: Record<string, unknown> = {},
): Promise<unknown> {
  if (!/^[a-f0-9]{64}$/.test(token)) throw Error("Elevlänken är inte giltig");
  if (!isSupabaseConfigured) throw Error("Molnanslutningen saknas");
  const result = await rpcClient.rpc("coaching_student", {
    p_token: token,
    p_action: action,
    p_id: id,
    p_data: data,
  });
  if (result.error) throw Error(result.error.message);
  return result.data;
}
export function safeVideo(value: string) {
  if (!value) return true;
  try {
    const u = new URL(value);
    return (
      value.length <= 2000 &&
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      /^https:\/\/[a-zA-Z0-9][a-zA-Z0-9.-]*(:[0-9]{1,5})?([/?#][^\s]*)?$/.test(
        value,
      )
    );
  } catch {
    return false;
  }
}
export function parseVideoTime(value: string): number | null {
  if (!value.trim()) return null;
  if (!/^\d{1,3}:[0-5]\d$/.test(value))
    throw Error("Ange tid som minuter:sekunder, exempelvis 1:24");
  const [m, s] = value.split(":").map(Number);
  const seconds = m * 60 + s;
  if (seconds > 21600) throw Error("Tidsmarkeringen får vara högst 360:00");
  return seconds;
}
export function videoTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
export function progressFor(
  studentId: string,
  assignmentId: string,
  progress: z.infer<typeof progressSchema>[],
) {
  const latest = progress.find(
    (p) => p.student_id === studentId && p.assignment_id === assignmentId,
  );
  if (!latest) return "Ingen rapport";
  if (latest.reviewed) return "Senaste rapporten har återkoppling";
  return latest.completed
    ? "Elev markerar genomförd · väntar på återkoppling"
    : "Rapport inlämnad · väntar på återkoppling";
}
export function appendHistory<T extends { id: string }>(
  previous: T[],
  next: T[],
): T[] {
  return [
    ...previous,
    ...next.filter((n) => !previous.some((p) => p.id === n.id)),
  ];
}
