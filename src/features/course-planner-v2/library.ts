/**
 * Sprint 5 — Banbibliotek (egna sparade banor + klubb-delade).
 */
import { supabase } from "@/integrations/supabase/client";

export interface LibraryCourse {
  id: string;
  user_id: string;
  name: string;
  description: string;
  course_data: any;
  created_at: string;
  updated_at: string;
  is_public?: boolean;
  public_slug?: string | null;
}

export async function fetchMyCourses(userId: string): Promise<LibraryCourse[]> {
  const { data, error } = await supabase
    .from("saved_courses")
    .select("id,user_id,name,description,course_data,created_at,updated_at,is_public,public_slug")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LibraryCourse[];
}

export async function deleteCourse(id: string) {
  const { error } = await supabase.from("saved_courses").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchClubCourses(clubId: string): Promise<LibraryCourse[]> {
  const { data, error } = await supabase
    .from("course_club_shares")
    .select("course_id, saved_courses!inner(id,user_id,name,description,course_data,created_at,updated_at,is_public,public_slug)")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => r.saved_courses as LibraryCourse);
}

export async function fetchMyClubs(userId: string): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from("club_members")
    .select("club_id, clubs!inner(id, name)")
    .eq("user_id", userId)
    .eq("status", "accepted");
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => r.clubs);
}

export async function shareCourseToClub(courseId: string, clubId: string, userId: string) {
  const { error } = await supabase.from("course_club_shares").insert({
    course_id: courseId,
    club_id: clubId,
    shared_by: userId,
  });
  if (error) throw error;
}

export async function unshareCourseFromClub(courseId: string, clubId: string) {
  const { error } = await supabase.from("course_club_shares")
    .delete().eq("course_id", courseId).eq("club_id", clubId);
  if (error) throw error;
}

export async function fetchCourseClubShares(courseId: string) {
  const { data, error } = await supabase
    .from("course_club_shares")
    .select("club_id, clubs!inner(id, name)")
    .eq("course_id", courseId);
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => r.clubs);
}

/* ───────── Publik delningslänk ───────── */

function randomSlug() {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);
}

export async function enablePublicLink(courseId: string): Promise<string> {
  // Hämta ev. befintlig slug
  const { data: existing } = await supabase
    .from("saved_courses").select("public_slug,is_public").eq("id", courseId).maybeSingle();
  if (existing?.public_slug && existing.is_public) return existing.public_slug;
  const slug = existing?.public_slug ?? randomSlug();
  const { error } = await supabase.from("saved_courses")
    .update({ is_public: true, public_slug: slug }).eq("id", courseId);
  if (error) throw error;
  return slug;
}

export async function disablePublicLink(courseId: string) {
  const { error } = await supabase.from("saved_courses")
    .update({ is_public: false }).eq("id", courseId);
  if (error) throw error;
}

export async function fetchPublicCourse(slug: string): Promise<LibraryCourse | null> {
  const { data, error } = await supabase
    .from("saved_courses")
    .select("id,user_id,name,description,course_data,created_at,updated_at,is_public,public_slug")
    .eq("public_slug", slug).eq("is_public", true).maybeSingle();
  if (error) throw error;
  return (data as LibraryCourse) ?? null;
}

/* ───────── Kommentarer ───────── */

export interface CourseComment {
  id: string;
  course_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name?: string;
}

export async function fetchComments(courseId: string): Promise<CourseComment[]> {
  const { data, error } = await supabase
    .from("course_comments")
    .select("id, course_id, user_id, content, created_at")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const comments = (data ?? []) as CourseComment[];
  // Hämta visningsnamn
  const userIds = Array.from(new Set(comments.map((c) => c.user_id)));
  if (userIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles").select("user_id, display_name").in("user_id", userIds);
    const map = new Map((profs ?? []).map((p) => [p.user_id, p.display_name as string]));
    comments.forEach((c) => { c.author_name = map.get(c.user_id) ?? "Okänd"; });
  }
  return comments;
}

export async function addComment(courseId: string, userId: string, content: string) {
  const trimmed = content.trim();
  if (!trimmed) throw new Error("Tom kommentar");
  const { error } = await supabase.from("course_comments").insert({
    course_id: courseId, user_id: userId, content: trimmed.slice(0, 2000),
  });
  if (error) throw error;
}

export async function deleteComment(id: string) {
  const { error } = await supabase.from("course_comments").delete().eq("id", id);
  if (error) throw error;
}
