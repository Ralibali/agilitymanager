import { supabase } from '@/integrations/supabase/client';

type ExportQuery = { select(columns: '*'): ExportQuery; eq(column: 'user_id', value: string): ExportQuery; order(column: string): ExportQuery; range(from: number, to: number): PromiseLike<{ data: unknown[] | null; error: unknown }> };
const exportClient = supabase as unknown as { from(table: string): ExportQuery };

const OWN_TABLES = [
  {
    "table": "achievements",
    "order": "id"
  },
  {
    "table": "cached_dog_results",
    "order": "id"
  },
  {
    "table": "club_event_signups",
    "order": "id"
  },
  {
    "table": "club_events",
    "order": "id"
  },
  {
    "table": "club_group_members",
    "order": "id"
  },
  {
    "table": "club_interest_leads",
    "order": "id"
  },
  {
    "table": "club_members",
    "order": "id"
  },
  {
    "table": "club_posts",
    "order": "id"
  },
  {
    "table": "coach_feedback",
    "order": "id"
  },
  {
    "table": "competition_interests",
    "order": "id"
  },
  {
    "table": "competition_log",
    "order": "id"
  },
  {
    "table": "competition_reminders",
    "order": "id"
  },
  {
    "table": "competition_results",
    "order": "id"
  },
  {
    "table": "course_comments",
    "order": "id"
  },
  {
    "table": "course_purchases",
    "order": "id"
  },
  {
    "table": "dog_match_profiles",
    "order": "user_id"
  },
  {
    "table": "dogs",
    "order": "id"
  },
  {
    "table": "health_logs",
    "order": "id"
  },
  {
    "table": "notifications",
    "order": "id"
  },
  {
    "table": "planned_competitions",
    "order": "id"
  },
  {
    "table": "planned_training",
    "order": "id"
  },
  {
    "table": "profiles",
    "order": "id"
  },
  {
    "table": "saved_courses",
    "order": "id"
  },
  {
    "table": "signup_sources",
    "order": "id"
  },
  {
    "table": "stopwatch_results",
    "order": "id"
  },
  {
    "table": "support_tickets",
    "order": "id"
  },
  {
    "table": "training_goals",
    "order": "id"
  },
  {
    "table": "training_milestones",
    "order": "id"
  },
  {
    "table": "training_sessions",
    "order": "id"
  },
  {
    "table": "user_roles",
    "order": "id"
  },
  {
    "table": "profiles_club_public",
    "order": "user_id"
  }
] as const;

/** Download only the signed-in person's rows through the ordinary RLS-protected client. */
export async function downloadAccountData() {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Logga in för att hämta dina uppgifter.');
  const sections: Record<string, unknown[]> = {};
  const unavailable: string[] = [];
  for (const { table, order } of OWN_TABLES) {
    const rows: unknown[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await exportClient.from(table).select('*').eq('user_id', user.id).order(order).range(offset, offset + 499);
      if (error) { unavailable.push(table); break; }
      rows.push(...(data ?? []));
      if (!data || data.length < 500) break;
    }
    sections[table] = rows;
  }
  const output = { exported_at: new Date().toISOString(), account: { id: user.id, email: user.email, created_at: user.created_at, user_metadata: user.user_metadata }, sections, unavailable,
    note: 'Exporten innehåller uppgifter som ditt konto kan läsa. Kontakta verksamheten för registerutdrag som även omfattar leverantörsdata, interna loggar och uppgifter i andra system.' };
  const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = 'mina-personuppgifter.json'; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { unavailable };
}
