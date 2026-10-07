import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { LibraryCourse, LibraryCourseData } from './library';

export interface CloudCourse extends LibraryCourse { revision: number }
export interface CloudCourseRef { id: string; userId: string; revision: number }
export interface CourseVersion {
  course_id: string;
  revision: number;
  name: string;
  course_data: LibraryCourseData;
  created_at: string;
}
export const CLOUD_CONFLICT = 'Banan har ändrats på en annan enhet. Öppna den senaste versionen eller välj Spara som för att behålla båda.';
const columns = 'id,user_id,name,description,course_data,created_at,updated_at,is_public,public_slug,revision';

export async function saveCloudCourse(userId: string, course: { name: string; data: unknown }, previous: CloudCourseRef | null): Promise<CloudCourse> {
  if (previous && previous.userId !== userId) throw new Error('Banan hör till ett annat konto. Välj Spara som för att skapa en egen kopia.');
  const payload = { name: course.name, course_data: course.data as Json };
  const result = previous
    ? await supabase.from('saved_courses').update(payload).eq('id', previous.id).eq('user_id', userId).eq('revision', previous.revision).select(columns).maybeSingle()
    : await supabase.from('saved_courses').insert({ ...payload, user_id: userId, is_public: false }).select(columns).single();
  if (result.error) throw new Error('Molnsparningen misslyckades. Ditt utkast finns kvar här. Försök igen eller exportera JSON.');
  if (!result.data) throw new Error(CLOUD_CONFLICT);
  return result.data as unknown as CloudCourse;
}

export async function fetchCloudCourses(userId: string, query: string, sort: 'updated' | 'name', page: number, pageSize = 10) {
  // LIKE metacharacters are escaped; a literal search cannot broaden the result.
  const needle = query.trim().replace(/[\\%_]/g, '\\$&');
  let request = supabase.from('saved_courses').select(columns, { count: 'exact' }).eq('user_id', userId);
  if (needle) request = request.ilike('name', `%${needle}%`);
  const { data, count, error } = await request.order(sort === 'name' ? 'name' : 'updated_at', { ascending: sort === 'name' }).order('id').range(page * pageSize, (page + 1) * pageSize - 1);
  if (error) throw new Error('Kunde inte hämta dina molnsparade banor.');
  return { courses: (data ?? []) as unknown as CloudCourse[], count: count ?? 0 };
}

export async function fetchCourseVersions(courseId: string, page = 0, pageSize = 10) {
  const { data, count, error } = await supabase.from('saved_course_versions')
    .select('course_id,revision,name,course_data,created_at', { count: 'exact' })
    .eq('course_id', courseId).order('revision', { ascending: false }).range(page * pageSize, (page + 1) * pageSize - 1);
  if (error) throw new Error('Kunde inte hämta banans versioner.');
  return { versions: (data ?? []) as unknown as CourseVersion[], count: count ?? 0 };
}
