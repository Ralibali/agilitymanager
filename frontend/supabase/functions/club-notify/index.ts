import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the calling user
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { club_id, title, message, content } = await req.json();
    if (!club_id || !title) {
      return new Response(JSON.stringify({ error: 'club_id and title required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get club info
    const { data: club } = await supabase.from('clubs').select('name').eq('id', club_id).single();
    if (!club) {
      return new Response(JSON.stringify({ error: 'Club not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get accepted members (exclude sender)
    const { data: members } = await supabase
      .from('club_members')
      .select('user_id')
      .eq('club_id', club_id)
      .eq('status', 'accepted')
      .neq('user_id', user.id);

    if (!members || members.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get emails for these users
    const userIds = members.map(m => m.user_id);
    const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = new Map<string, string>();
    (authUsers?.users || []).forEach(u => {
      if (u.email && userIds.includes(u.id)) emailMap.set(u.id, u.email);
    });

    // Get display names
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .in('user_id', userIds);
    const nameMap = new Map<string, string>();
    (profiles || []).forEach(p => nameMap.set(p.user_id, p.display_name || ''));

    // Send emails via send-email function
    let sent = 0;
    const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    for (const [userId, email] of emailMap) {
      try {
        await fetch(sendEmailUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            templateName: 'club_activity',
            recipientEmail: email,
            data: {
              name: nameMap.get(userId) || '',
              club_name: club.name,
              title,
              message,
              content,
            },
          }),
        });
        sent++;
      } catch (err) {
        console.error(`Failed to send to ${email}:`, err);
      }
    }

    console.log(`[CLUB-NOTIFY] Sent ${sent} emails for club ${club.name}`);

    return new Response(JSON.stringify({ success: true, sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[CLUB-NOTIFY] ERROR:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
