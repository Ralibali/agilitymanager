const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'
const FROM_EMAIL = 'AgilityManager <noreply@agilitymanager.se>'
const SITE_NAME = 'AgilityManager'
const SITE_URL = 'https://agilitymanager.se'

// ---------- TEMPLATES ----------
interface TemplateResult { subject: string; html: string }

function header(title: string) {
  return `
    <div style="background:#0a0a1a;padding:32px 24px 24px;text-align:center;border-radius:12px 12px 0 0">
      <h1 style="color:#ffffff;font-family:'Segoe UI',Arial,sans-serif;font-size:22px;margin:0">${title}</h1>
    </div>`
}

function footer(unsubUrl?: string) {
  const unsub = unsubUrl
    ? `<p style="margin:8px 0 0"><a href="${unsubUrl}" style="color:#888;text-decoration:underline;font-size:11px">Avregistrera dig från dessa utskick</a></p>`
    : ''
  return `
    <div style="padding:20px 24px;text-align:center;border-top:1px solid #e5e5e5">
      <p style="color:#999;font-size:11px;margin:0;font-family:'Segoe UI',Arial,sans-serif">
        Skickat av <a href="${SITE_URL}" style="color:#4f46e5">${SITE_NAME}</a>
      </p>
      ${unsub}
    </div>`
}

function wrap(title: string, body: string, unsubUrl?: string) {
  return `<!DOCTYPE html><html lang="sv"><head><meta charset="utf-8"/></head>
  <body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Arial,sans-serif">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0">
      <tr><td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
          <tr><td>${header(title)}</td></tr>
          <tr><td style="padding:24px">${body}</td></tr>
          <tr><td>${footer(unsubUrl)}</td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`
}

const TEMPLATES: Record<string, (data: any) => TemplateResult> = {
  welcome: (data) => ({
    subject: `Välkommen till ${SITE_NAME}! 🐕`,
    html: wrap('Välkommen!', `
      <p style="color:#333;font-size:15px;line-height:1.6">
        Hej${data.name ? ` ${data.name}` : ''}! 🎉
      </p>
      <p style="color:#555;font-size:14px;line-height:1.6">
        Kul att du gick med i ${SITE_NAME} – din digitala agilitypartner.
        Börja med att lägga till din hund, logga träningspass och följ din resa mot nya klasser!
      </p>
      <div style="text-align:center;margin:24px 0">
        <a href="${SITE_URL}/hundar" style="background:#4f46e5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block">
          Kom igång →
        </a>
      </div>
      <p style="color:#888;font-size:12px">Du får det här mailet för att du registrerade dig på ${SITE_NAME}.</p>
    `, data.unsubUrl),
  }),

  training_reminder: (data) => ({
    subject: `Dags att träna? 🏃‍♂️`,
    html: wrap('Träningspåminnelse', `
      <p style="color:#333;font-size:15px;line-height:1.6">
        Hej${data.name ? ` ${data.name}` : ''}!
      </p>
      <p style="color:#555;font-size:14px;line-height:1.6">
        Det har gått ett tag sedan ditt senaste träningspass.
        ${data.dog_name ? `${data.dog_name} väntar säkert på att få köra!` : 'Dina hundar väntar säkert!'}
      </p>
      <div style="text-align:center;margin:24px 0">
        <a href="${SITE_URL}/traning" style="background:#4f46e5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block">
          Logga träning
        </a>
      </div>
    `, data.unsubUrl),
  }),

  competition_reminder: (data) => ({
    subject: `Tävlingspåminnelse: ${data.event_name || 'Kommande tävling'}`,
    html: wrap('Tävlingspåminnelse', `
      <p style="color:#333;font-size:15px;line-height:1.6">
        Hej${data.name ? ` ${data.name}` : ''}! 📋
      </p>
      <p style="color:#555;font-size:14px;line-height:1.6">
        <strong>${data.event_name}</strong> närmar sig!<br/>
        ${data.location ? `📍 ${data.location}<br/>` : ''}
        ${data.date ? `📅 ${data.date}` : ''}
      </p>
      <p style="color:#555;font-size:14px;line-height:1.6">
        Glöm inte att kolla checklistan innan du åker!
      </p>
      <div style="text-align:center;margin:24px 0">
        <a href="${SITE_URL}/tavlingsresultat" style="background:#4f46e5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block">
          Se tävlingsdetaljer
        </a>
      </div>
    `, data.unsubUrl),
  }),

  pin_achieved: (data) => ({
    subject: `🏆 Grattis till ny pinne!`,
    html: wrap('Ny pinne! 🎉', `
      <p style="color:#333;font-size:15px;line-height:1.6">
        Fantastiskt jobbat${data.name ? `, ${data.name}` : ''}!
      </p>
      <p style="color:#555;font-size:14px;line-height:1.6">
        ${data.dog_name || 'Din hund'} klarade ${data.discipline || 'loppet'} i ${data.class || 'klassen'} med godkänt resultat! 🏆
      </p>
      <div style="text-align:center;margin:24px 0">
        <a href="${SITE_URL}/stats" style="background:#4f46e5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block">
          Se din statistik
        </a>
      </div>
    `, data.unsubUrl),
  }),

  weekly_summary: (data) => ({
    subject: `Din veckosammanfattning 📊`,
    html: wrap('Veckosammanfattning', `
      <p style="color:#333;font-size:15px;line-height:1.6">
        Hej${data.name ? ` ${data.name}` : ''}! Här är din vecka:
      </p>
      <table width="100%" cellpadding="8" cellspacing="0" style="margin:16px 0;border-collapse:collapse">
        <tr style="background:#f0f0ff">
          <td style="border-radius:6px 0 0 0;color:#555;font-size:13px">Träningspass</td>
          <td style="border-radius:0 6px 0 0;color:#333;font-size:16px;font-weight:700;text-align:right">${data.training_count ?? 0}</td>
        </tr>
        <tr>
          <td style="color:#555;font-size:13px">Total tid</td>
          <td style="color:#333;font-size:16px;font-weight:700;text-align:right">${data.training_minutes ?? 0} min</td>
        </tr>
        <tr style="background:#f0f0ff">
          <td style="border-radius:0 0 0 6px;color:#555;font-size:13px">Tävlingsresultat</td>
          <td style="border-radius:0 0 6px 0;color:#333;font-size:16px;font-weight:700;text-align:right">${data.competition_count ?? 0}</td>
        </tr>
      </table>
      <div style="text-align:center;margin:24px 0">
        <a href="${SITE_URL}/stats" style="background:#4f46e5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block">
          Se fullständig statistik
        </a>
      </div>
    `, data.unsubUrl),
  }),

  club_activity: (data) => ({
    subject: `${data.club_name}: ${data.title}`,
    html: wrap(data.club_name || 'Klubbnyhet', `
      <p style="color:#333;font-size:15px;line-height:1.6">
        Hej${data.name ? ` ${data.name}` : ''}! 👋
      </p>
      <p style="color:#555;font-size:14px;line-height:1.6">
        ${data.message || 'Det finns en ny uppdatering i din klubb.'}
      </p>
      ${data.content ? `<div style="background:#f8f8f8;border-radius:8px;padding:16px;margin:16px 0"><p style="color:#333;font-size:14px;line-height:1.6;margin:0">${data.content}</p></div>` : ''}
      <div style="text-align:center;margin:24px 0">
        <a href="${SITE_URL}/clubs" style="background:#4f46e5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block">
          Öppna klubben →
        </a>
      </div>
    `, data.unsubUrl),
  }),
}
// ---------- HANDLER ----------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured')
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured')

    const { templateName, recipientEmail, data: templateData } = await req.json()

    if (!templateName || !recipientEmail) {
      return new Response(JSON.stringify({ error: 'templateName and recipientEmail required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const templateFn = TEMPLATES[templateName]
    if (!templateFn) {
      return new Response(JSON.stringify({ error: `Unknown template: ${templateName}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build unsubscribe URL
    const unsubUrl = `${SITE_URL}/avregistrera?email=${encodeURIComponent(recipientEmail)}`
    const { subject, html } = templateFn({ ...templateData, unsubUrl })

    const response = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [recipientEmail],
        subject,
        html,
        headers: {
          'List-Unsubscribe': `<${unsubUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
    })

    const result = await response.json()
    console.log(`[SEND-EMAIL] ${templateName} to ${recipientEmail}:`, response.status)

    if (!response.ok) {
      throw new Error(`Resend API failed [${response.status}]: ${JSON.stringify(result)}`)
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[SEND-EMAIL] ERROR:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
